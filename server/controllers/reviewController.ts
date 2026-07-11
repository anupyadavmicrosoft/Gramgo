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

  // Edit a review
  async editReview(req: any, res: any) {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.user.id;

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "A rating between 1 and 5 is required." });
    }

    try {
      const review = await ReviewDb.findOne({ id });
      if (!review) {
        return res.status(404).json({ error: "Review not found." });
      }

      if (review.reviewerId !== userId && req.user.role !== "admin") {
        return res.status(403).json({ error: "Unauthorized to edit this review." });
      }

      const updated = await ReviewDb.update(id, {
        rating: Number(rating),
        comment: comment || "",
        edited: true,
      });

      if (updated) {
        // Recalculate average rating for reviewee
        const revieweeReviews = await ReviewDb.findByReviewee(review.revieweeId);
        if (revieweeReviews.length > 0) {
          const totalStars = revieweeReviews.reduce((sum, rev) => sum + rev.rating, 0);
          const avgRating = Number((totalStars / revieweeReviews.length).toFixed(1));
          await UserDb.updateProfile(review.revieweeId, { rating: avgRating });
        }
        return res.json({ success: true, message: "Review updated successfully.", review: updated });
      }

      res.status(400).json({ error: "Failed to update review." });
    } catch (error) {
      console.error("Failed to edit review:", error);
      res.status(500).json({ error: "Failed to edit review." });
    }
  },

  // Report a review
  async reportReview(req: any, res: any) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const review = await ReviewDb.findOne({ id });
      if (!review) {
        return res.status(404).json({ error: "Review not found." });
      }

      const reportedBy = review.reportedBy || [];
      if (reportedBy.includes(userId)) {
        return res.status(400).json({ error: "You have already reported this review." });
      }

      const updatedReportedBy = [...reportedBy, userId];
      const reportsCount = (review.reportsCount || 0) + 1;

      const updated = await ReviewDb.update(id, {
        reported: true,
        reportsCount,
        reportedBy: updatedReportedBy,
      });

      if (updated) {
        return res.json({ success: true, message: "Review reported successfully.", review: updated });
      }
      res.status(400).json({ error: "Failed to report review." });
    } catch (error) {
      console.error("Failed to report review:", error);
      res.status(500).json({ error: "Failed to report review." });
    }
  },

  // Like or unlike a review
  async likeReview(req: any, res: any) {
    const { id } = req.params;
    const userId = req.user.id;

    try {
      const review = await ReviewDb.findOne({ id });
      if (!review) {
        return res.status(404).json({ error: "Review not found." });
      }

      const likes = review.likes || [];
      let updatedLikes: string[] = [];
      let isLiked = false;

      if (likes.includes(userId)) {
        updatedLikes = likes.filter((l) => l !== userId);
        isLiked = false;
      } else {
        updatedLikes = [...likes, userId];
        isLiked = true;
      }

      const updated = await ReviewDb.update(id, {
        likes: updatedLikes,
      });

      if (updated) {
        return res.json({
          success: true,
          message: isLiked ? "Review liked." : "Review unliked.",
          liked: isLiked,
          review: updated,
        });
      }
      res.status(400).json({ error: "Failed to like review." });
    } catch (error) {
      console.error("Failed to like review:", error);
      res.status(500).json({ error: "Failed to like review." });
    }
  },

  // Reply to a review
  async replyToReview(req: any, res: any) {
    const { id } = req.params;
    const { text } = req.body;
    const userId = req.user.id;
    const userName = req.user.name || "User";

    if (!text || text.trim() === "") {
      return res.status(400).json({ error: "Reply text is required." });
    }

    try {
      const review = await ReviewDb.findOne({ id });
      if (!review) {
        return res.status(404).json({ error: "Review not found." });
      }

      // Check if user is reviewee, reviewer, or admin
      if (review.revieweeId !== userId && req.user.role !== "admin" && review.reviewerId !== userId) {
        return res.status(403).json({ error: "Unauthorized to reply to this review." });
      }

      const reply = {
        text: text.trim(),
        userId,
        userName,
        createdAt: new Date(),
      };

      const updated = await ReviewDb.update(id, { reply });
      if (updated) {
        return res.json({ success: true, message: "Reply added successfully.", review: updated });
      }
      res.status(400).json({ error: "Failed to add reply." });
    } catch (error) {
      console.error("Failed to add reply:", error);
      res.status(500).json({ error: "Failed to add reply." });
    }
  },

  // Get global rating analytics
  async getRatingAnalytics(req: any, res: any) {
    try {
      const allReviews = await ReviewDb.findAll();
      const allUsers = await UserDb.find({});

      const totalReviews = allReviews.length;
      
      // Calculate overall average
      const overallAvg = totalReviews > 0
        ? Number((allReviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(2))
        : 4.7;

      // Group reviews by reviewee role
      const driverReviews = allReviews.filter(r => r.revieweeRole === "driver");
      const passengerReviews = allReviews.filter(r => r.revieweeRole === "passenger");

      const driverAvg = driverReviews.length > 0
        ? Number((driverReviews.reduce((sum, r) => sum + r.rating, 0) / driverReviews.length).toFixed(2))
        : 4.7;

      const passengerAvg = passengerReviews.length > 0
        ? Number((passengerReviews.reduce((sum, r) => sum + r.rating, 0) / passengerReviews.length).toFixed(2))
        : 4.8;

      // Rating Distribution (1-5 stars)
      const ratingDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
      allReviews.forEach(r => {
        const ratingKey = Math.round(r.rating) as 1 | 2 | 3 | 4 | 5;
        if (ratingKey >= 1 && ratingKey <= 5) {
          ratingDistribution[ratingKey]++;
        }
      });

      // Map users for fast lookup
      const userMap = new Map<string, any>();
      allUsers.forEach(u => userMap.set(u.id, u));

      // 1. Calculate active averages and counts for drivers
      const driversData = allUsers
        .filter(u => u.role === "driver")
        .map(u => {
          const reviewsReceived = driverReviews.filter(r => r.revieweeId === u.id);
          const calculatedRating = reviewsReceived.length > 0
            ? Number((reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length).toFixed(2))
            : (u.rating || 4.7);
          return {
            id: u.id,
            name: u.name,
            phone: u.phone,
            village: u.village,
            vehicleType: u.vehicleType || "Unknown",
            vehicleNumber: u.vehicleNumber || "",
            rating: calculatedRating,
            reviewsCount: reviewsReceived.length,
            completedTrips: u.completedTrips || reviewsReceived.length,
            status: u.status || "active"
          };
        });

      // 2. Calculate active averages and counts for passengers
      const passengersData = allUsers
        .filter(u => u.role === "passenger")
        .map(u => {
          const reviewsReceived = passengerReviews.filter(r => r.revieweeId === u.id);
          const calculatedRating = reviewsReceived.length > 0
            ? Number((reviewsReceived.reduce((sum, r) => sum + r.rating, 0) / reviewsReceived.length).toFixed(2))
            : (u.rating || 4.7);
          return {
            id: u.id,
            name: u.name,
            phone: u.phone,
            village: u.village,
            rating: calculatedRating,
            reviewsCount: reviewsReceived.length,
            status: u.status || "active"
          };
        });

      // Top Drivers (highest rated, sorted by rating desc, then reviews count desc)
      const topDrivers = [...driversData]
        .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
        .slice(0, 5);

      // Low Rated Drivers (lowest rated, sorted by rating asc, then reviews count asc)
      const lowRatedDrivers = [...driversData]
        .sort((a, b) => a.rating - b.rating || a.reviewsCount - b.reviewsCount)
        .slice(0, 5);

      // Top Passengers
      const topPassengers = [...passengersData]
        .sort((a, b) => b.rating - a.rating || b.reviewsCount - a.reviewsCount)
        .slice(0, 5);

      // --- Chart Data: Vehicle Type Performance ---
      const vehicleStatsMap: { [key: string]: { sum: number; count: number } } = {};
      driverReviews.forEach(r => {
        const user = userMap.get(r.revieweeId);
        const vType = user?.vehicleType || "Other";
        if (!vehicleStatsMap[vType]) {
          vehicleStatsMap[vType] = { sum: 0, count: 0 };
        }
        vehicleStatsMap[vType].sum += r.rating;
        vehicleStatsMap[vType].count++;
      });
      const vehiclePerformance = Object.keys(vehicleStatsMap).map(vType => ({
        vehicleType: vType,
        averageRating: Number((vehicleStatsMap[vType].sum / vehicleStatsMap[vType].count).toFixed(2)),
        reviewsCount: vehicleStatsMap[vType].count
      }));

      // --- Chart Data: Village Performance ---
      const villageStatsMap: { [key: string]: { sum: number; count: number } } = {};
      allReviews.forEach(r => {
        const user = userMap.get(r.revieweeId);
        const village = user?.village || "Other";
        if (!villageStatsMap[village]) {
          villageStatsMap[village] = { sum: 0, count: 0 };
        }
        villageStatsMap[village].sum += r.rating;
        villageStatsMap[village].count++;
      });
      const villagePerformance = Object.keys(villageStatsMap).map(village => ({
        village,
        averageRating: Number((villageStatsMap[village].sum / villageStatsMap[village].count).toFixed(2)),
        reviewsCount: villageStatsMap[village].count
      })).sort((a, b) => b.reviewsCount - a.reviewsCount).slice(0, 8); // Top 8 villages by reviews

      // --- Chart Data: Trends over Time (Grouped by date of creation) ---
      // Get the last 7 days trends
      const trendStatsMap: { [key: string]: { sum: number; count: number } } = {};
      
      // Seed last 7 days to make sure trend is continuous
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trendStatsMap[dateStr] = { sum: 0, count: 0 };
      }

      allReviews.forEach(r => {
        const dateStr = new Date(r.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        if (trendStatsMap[dateStr] !== undefined) {
          trendStatsMap[dateStr].sum += r.rating;
          trendStatsMap[dateStr].count++;
        }
      });

      const ratingTrends = Object.keys(trendStatsMap).map(dateStr => {
        const stats = trendStatsMap[dateStr];
        return {
          date: dateStr,
          averageRating: stats.count > 0 ? Number((stats.sum / stats.count).toFixed(2)) : 4.8, // fallback to full satisfaction
          reviewsCount: stats.count
        };
      });

      res.json({
        totalReviews,
        overallAverage: overallAvg,
        driverAverage: driverAvg,
        passengerAverage: passengerAvg,
        ratingDistribution,
        topDrivers,
        lowRatedDrivers,
        topPassengers,
        vehiclePerformance,
        villagePerformance,
        ratingTrends
      });
    } catch (error) {
      console.error("Failed to generate global rating analytics:", error);
      res.status(500).json({ error: "Failed to generate global rating analytics." });
    }
  },
};
