import { ReviewDb, IReview } from "../models/Review";
import { UserDb } from "../models/User";
import { BookingDb } from "../models/Booking";
import { EmergencyRideDb } from "../models/EmergencyRide";

export const ReviewController = {
  // Submit a review (Rating a Ride, Driver, or Passenger)
  async createReview(req: any, res: any) {
    const { rideId, rating, comment } = req.body;
    const reviewerId = req.user.id;
    const reviewerName = req.user.name || "GramGo User";
    const reviewerRole = req.user.role; // "passenger" or "driver" (or "admin")

    if (!rideId) {
      return res.status(400).json({ error: "Ride ID is required." });
    }
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "A rating between 1 and 5 is required." });
    }

    try {
      // 1. Look up the ride to identify the correct counterpart to rate
      let ride: any = null;
      let rideType: "Booking" | "EmergencyRide" = "Booking";

      // Try BookingDb first
      ride = await BookingDb.findById(rideId);
      if (!ride) {
        // Try EmergencyRideDb
        const emergencyRides = await EmergencyRideDb.findAll();
        ride = emergencyRides.find((r) => r.id === rideId);
        if (ride) {
          rideType = "EmergencyRide";
        }
      }

      if (!ride) {
        return res.status(404).json({ error: "Ride or Booking not found." });
      }

      // Check if this reviewer has already rated this ride
      const existing = await ReviewDb.findOne({ rideId, reviewerId });
      if (existing) {
        return res.status(400).json({ error: "You have already reviewed this ride." });
      }

      // Determine counterpart (reviewee) based on reviewer's role
      let revieweeId = "";
      let revieweeName = "";
      let revieweeRole: "passenger" | "driver" = "driver";

      if (reviewerRole === "passenger") {
        revieweeId = ride.driverId;
        revieweeName = ride.driverName || "Driver";
        revieweeRole = "driver";
      } else if (reviewerRole === "driver") {
        revieweeId = ride.passengerId;
        revieweeName = ride.passengerName || ride.patientName || "Passenger";
        revieweeRole = "passenger";
      } else {
        // Admin reviewer - needs explicit target or can rate anyone
        revieweeId = req.body.revieweeId;
        revieweeName = req.body.revieweeName || "User";
        revieweeRole = req.body.revieweeRole || "driver";
      }

      if (!revieweeId) {
        return res.status(400).json({
          error: "No driver or passenger is assigned to this ride yet. Cannot leave a review.",
        });
      }

      // 2. Create the review
      const newReview = await ReviewDb.create({
        rideId,
        reviewerId,
        reviewerName,
        reviewerRole: reviewerRole === "admin" ? "passenger" : (reviewerRole as any),
        revieweeId,
        revieweeName,
        revieweeRole,
        rating: Number(rating),
        comment: comment || "",
      });

      // 3. Recalculate average rating for reviewee
      const revieweeReviews = await ReviewDb.findByReviewee(revieweeId);
      if (revieweeReviews.length > 0) {
        const totalStars = revieweeReviews.reduce((sum, rev) => sum + rev.rating, 0);
        const avgRating = Number((totalStars / revieweeReviews.length).toFixed(1));

        // Update the user profile with new average rating
        await UserDb.updateProfile(revieweeId, {
          rating: avgRating,
        });
      }

      res.status(201).json({
        success: true,
        message: "Review submitted successfully.",
        review: newReview,
      });
    } catch (error: any) {
      console.error("Failed to create review:", error);
      res.status(500).json({ error: "Failed to submit review." });
    }
  },

  // Get all reviews
  async getReviews(req: any, res: any) {
    try {
      const reviews = await ReviewDb.findAll();
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch reviews." });
    }
  },

  // Get reviews about a user (as a reviewee - e.g. feedback on a driver or passenger)
  async getReviewsAboutUser(req: any, res: any) {
    const { userId } = req.params;
    try {
      const reviews = await ReviewDb.findByReviewee(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch user reviews." });
    }
  },

  // Get reviews written by a user (as a reviewer)
  async getReviewsByUser(req: any, res: any) {
    const { userId } = req.params;
    try {
      const reviews = await ReviewDb.findByReviewer(userId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch written reviews." });
    }
  },

  // Get reviews for a ride
  async getReviewsForRide(req: any, res: any) {
    const { rideId } = req.params;
    try {
      const reviews = await ReviewDb.findByRide(rideId);
      res.json(reviews);
    } catch (error) {
      res.status(500).json({ error: "Failed to fetch ride reviews." });
    }
  },

  // Delete a review
  async deleteReview(req: any, res: any) {
    const { id } = req.params;
    try {
      // Find the review first to know whose rating we should update
      const reviews = await ReviewDb.findAll();
      const review = reviews.find((r) => r.id === id);

      if (!review) {
        return res.status(404).json({ error: "Review not found." });
      }

      // Check permissions: only the author or an admin can delete
      if (req.user.role !== "admin" && review.reviewerId !== req.user.id) {
        return res.status(403).json({ error: "Unauthorized to delete this review." });
      }

      const deleted = await ReviewDb.delete(id);
      if (deleted) {
        // Recalculate average rating for reviewee
        const revieweeReviews = await ReviewDb.findByReviewee(review.revieweeId);
        let avgRating = 4.7; // default fallback if no reviews left
        if (revieweeReviews.length > 0) {
          const totalStars = revieweeReviews.reduce((sum, rev) => sum + rev.rating, 0);
          avgRating = Number((totalStars / revieweeReviews.length).toFixed(1));
        }
        await UserDb.updateProfile(review.revieweeId, { rating: avgRating });

        return res.json({ success: true, message: "Review deleted successfully." });
      }
      res.status(400).json({ error: "Failed to delete review." });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete review." });
    }
  },

  // Get detailed statistics for a user's ratings
  async getUserStats(req: any, res: any) {
    const { userId } = req.params;
    try {
      const reviews = await ReviewDb.findByReviewee(userId);
      const user = await UserDb.findById(userId);

      const totalReviews = reviews.length;
      const averageRating = totalReviews > 0
        ? Number((reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1))
        : (user?.rating || 4.7);

      const ratingDistribution = {
        5: 0,
        4: 0,
        3: 0,
        2: 0,
        1: 0,
      };

      reviews.forEach((r) => {
        const ratingKey = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
        if (ratingKey >= 1 && ratingKey <= 5) {
          ratingDistribution[ratingKey]++;
        }
      });

      res.json({
        userId,
        name: user?.name || "User",
        role: user?.role || "passenger",
        averageRating,
        totalReviews,
        ratingDistribution,
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to calculate user rating statistics." });
    }
  },
};
