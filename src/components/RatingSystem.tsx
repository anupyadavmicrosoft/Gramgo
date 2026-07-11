import React, { useState, useEffect } from "react";
import { 
  Star, 
  MessageSquare, 
  Calendar, 
  TrendingUp, 
  User, 
  Clock, 
  Trash2, 
  Filter, 
  Check, 
  Sparkles, 
  AlertCircle,
  ThumbsUp,
  MapPin,
  Heart,
  ChevronRight,
  ShieldAlert,
  SlidersHorizontal,
  Plus
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface RatingSystemProps {
  role: "passenger" | "driver" | "admin";
  token: string | null;
  user: any;
}

interface Review {
  id: string;
  rideId: string;
  reviewerId: string;
  reviewerName: string;
  reviewerRole: "passenger" | "driver";
  revieweeId: string;
  revieweeName: string;
  revieweeRole: "passenger" | "driver";
  rating: number;
  comment?: string;
  createdAt: string;
}

interface UserStats {
  userId: string;
  name: string;
  role: string;
  averageRating: number;
  totalReviews: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

export default function RatingSystem({ role, token, user }: RatingSystemProps) {
  // State variables
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedRides, setCompletedRides] = useState<any[]>([]);
  const [stats, setStats] = useState<UserStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Navigation
  const [activeTab, setActiveTab] = useState<"pending" | "received" | "given" | "stats" | "global">("pending");

  // Review Form Modal
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [selectedRide, setSelectedRide] = useState<any | null>(null);
  const [starRating, setStarRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [comment, setComment] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Admin filter states
  const [adminSearch, setAdminSearch] = useState("");
  const [adminStarFilter, setAdminStarFilter] = useState<string>("all");
  const [adminRoleFilter, setAdminRoleFilter] = useState<string>("all");

  // General Filter (for History)
  const [historyStarFilter, setHistoryStarFilter] = useState<string>("all");

  const quickTags = role === "passenger" 
    ? ["Polite & Respectful", "Safe & Smooth Driving", "Clean Vehicle", "Punctual Arrival", "Extremely Helpful", "Great Communication"]
    : ["Polite Behavior", "Ready at Pickup", "Punctual & Respectful", "Quiet & Pleasant", "Clear Instructions"];

  // Set default tab based on role
  useEffect(() => {
    if (role === "admin") {
      setActiveTab("global");
    } else {
      setActiveTab("pending");
    }
  }, [role]);

  // Fetch all rating and ride data
  const fetchData = async () => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch reviews about the user or all reviews for admin
      let reviewsUrl = "/api/reviews";
      if (role !== "admin" && user?.id) {
        reviewsUrl = `/api/reviews/about/${user.id}`;
      }
      
      const reviewsRes = await fetch(reviewsUrl, {
        headers: { Authorization: `Bearer ${token}` }
      });
      let reviewsData: Review[] = [];
      if (reviewsRes.ok) {
        reviewsData = await reviewsRes.json();
        setReviews(reviewsData);
      }

      // 2. Fetch stats
      if (user?.id) {
        const statsRes = await fetch(`/api/reviews/stats/${user.id}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setStats(statsData);
        }
      }

      // 3. Fetch completed rides list to compare with reviews
      if (role === "passenger") {
        const ridesRes = await fetch("/api/rides/history", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (ridesRes.ok) {
          const ridesData = await ridesRes.json();
          // Filter completed rides
          const completed = ridesData.filter(
            (r: any) => r.status === "completed" || r.status === "Completed"
          );
          setCompletedRides(completed);
        }
      } else if (role === "driver") {
        const statsRes = await fetch("/api/driver/stats", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (statsRes.ok) {
          const statsData = await statsRes.json();
          setCompletedRides(statsData.rideHistory || []);
        }
      }
    } catch (err) {
      console.error("Error loading rating data:", err);
      setError("Failed to fetch reviews and ride histories from server.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [token, role, user?.id]);

  // Check if a specific ride is already reviewed by current user
  const isRideReviewed = (rideId: string) => {
    return reviews.some(r => r.rideId === rideId && r.reviewerId === user?.id);
  };

  // Get unreviewed rides list
  const unreviewedRides = completedRides.filter(ride => !isRideReviewed(ride.id));

  // Handle open rating form
  const handleOpenRating = (ride: any) => {
    setSelectedRide(ride);
    setStarRating(5);
    setComment("");
    setSelectedTags([]);
    setFormError(null);
    setFormSuccess(null);
    setRatingModalOpen(true);
  };

  // Tag toggle helper
  const handleToggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(selectedTags.filter(t => t !== tag));
    } else {
      setSelectedTags([...selectedTags, tag]);
    }
  };

  // Submit review handler
  const handleSubmitReview = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRide) return;
    setSubmitting(true);
    setFormError(null);
    setFormSuccess(null);

    const fullComment = selectedTags.length > 0 
      ? `[${selectedTags.join(", ")}] ${comment}`.trim()
      : comment.trim();

    try {
      const res = await fetch("/api/reviews", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          rideId: selectedRide.id,
          rating: starRating,
          comment: fullComment
        })
      });

      const data = await res.json();
      if (res.ok) {
        setFormSuccess("Thank you! Your rating and comments have been recorded.");
        setTimeout(() => {
          setRatingModalOpen(false);
          fetchData();
        }, 1500);
      } else {
        setFormError(data.error || "Failed to submit review.");
      }
    } catch (err) {
      setFormError("Server connection error.");
    } finally {
      setSubmitting(false);
    }
  };

  // Admin delete review handler
  const handleDeleteReview = async (id: string) => {
    if (!window.confirm("Are you sure you want to permanently delete this review?")) return;
    try {
      const res = await fetch(`/api/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.error || "Failed to delete review.");
      }
    } catch (err) {
      alert("Server connection error.");
    }
  };

  // Reviews given by user
  const reviewsGiven = reviews.filter(r => r.reviewerId === user?.id);
  // Reviews received by user
  const reviewsReceived = reviews.filter(r => r.revieweeId === user?.id);

  // Filters for Admin reviews
  const filteredAdminReviews = reviews.filter(rev => {
    const matchSearch = 
      rev.reviewerName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      rev.revieweeName.toLowerCase().includes(adminSearch.toLowerCase()) ||
      (rev.comment || "").toLowerCase().includes(adminSearch.toLowerCase());
    
    const matchStars = adminStarFilter === "all" || String(rev.rating) === adminStarFilter;
    const matchRole = adminRoleFilter === "all" || rev.revieweeRole === adminRoleFilter;

    return matchSearch && matchStars && matchRole;
  });

  // Star color utility
  const getStarColor = (val: number, hover: number | null, index: number) => {
    const target = hover !== null ? hover : val;
    return index < target ? "text-amber-400 fill-amber-400" : "text-slate-200";
  };

  // Star elements generator
  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center gap-0.5">
        {[...Array(5)].map((_, i) => (
          <Star key={i} className={`w-3.5 h-3.5 ${i < Math.round(rating) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`} />
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Overview/Header Area */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-900 text-white rounded-3xl p-6 md:p-8 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-8 opacity-5 text-emerald-400 pointer-events-none">
          <Sparkles className="w-48 h-48" />
        </div>
        
        <div className="space-y-2 relative z-10">
          <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 rounded-full text-[10px] font-bold uppercase tracking-wider border border-emerald-500/20">
            Rating & Feedback Engine
          </span>
          <h2 className="text-xl md:text-2xl font-black tracking-tight">
            {role === "passenger" && "Passenger Lifeline Reviews"}
            {role === "driver" && "Driver Quality & Trust Hub"}
            {role === "admin" && "Global Feedback Governance"}
          </h2>
          <p className="text-xs text-slate-400 max-w-lg">
            {role === "passenger" && "Share your feedback about drivers and view rating history to help keep Ghazipur community transit safe."}
            {role === "driver" && "Monitor your rating score, passenger compliments, and feedback metrics to maximize Panchayat incentives."}
            {role === "admin" && "Audit feedback loops, delete flags, and manage qualitative performance parameters for village transits."}
          </p>
        </div>

        {/* Global Stats Badge */}
        {stats && role !== "admin" && (
          <div className="bg-slate-800/80 backdrop-blur border border-slate-700/50 rounded-2xl p-4 flex items-center gap-4 relative z-10">
            <div className="text-center">
              <div className="text-3xl font-black text-amber-400 flex items-baseline justify-center gap-1">
                {stats.averageRating || "4.7"}
                <span className="text-[11px] font-bold text-slate-500">/5</span>
              </div>
              <div className="flex justify-center mt-1">
                {renderStars(stats.averageRating || 4.7)}
              </div>
            </div>
            <div className="h-10 w-[1px] bg-slate-700"></div>
            <div>
              <div className="text-lg font-extrabold text-white">{stats.totalReviews || "0"}</div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Reviews</div>
            </div>
          </div>
        )}
      </div>

      {/* Tabs navigation */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none border-b border-slate-100">
        {role !== "admin" && (
          <>
            <button
              onClick={() => setActiveTab("pending")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "pending"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Unrated Transits {unreviewedRides.length > 0 && (
                <span className="ml-1.5 px-1.5 py-0.5 bg-rose-500 text-white text-[9px] rounded-full">
                  {unreviewedRides.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab("received")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "received"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Compliments & Feedback
            </button>
            <button
              onClick={() => setActiveTab("given")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "given"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Ratings Left By Me
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "stats"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Rating Statistics
            </button>
          </>
        )}

        {role === "admin" && (
          <>
            <button
              onClick={() => setActiveTab("global")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "global"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              All User Reviews
            </button>
            <button
              onClick={() => setActiveTab("stats")}
              className={`px-4 py-2 text-xs font-bold rounded-xl transition whitespace-nowrap cursor-pointer ${
                activeTab === "stats"
                  ? "bg-slate-900 text-white shadow-sm"
                  : "text-slate-500 hover:text-slate-900 hover:bg-slate-50"
              }`}
            >
              Global Analytics
            </button>
          </>
        )}
      </div>

      {/* Loading state */}
      {loading ? (
        <div className="py-24 text-center space-y-3">
          <div className="w-10 h-10 border-4 border-slate-900 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-xs text-slate-400 font-bold uppercase tracking-widest">Compiling feedback matrices...</p>
        </div>
      ) : error ? (
        <div className="p-8 text-center bg-rose-50 border border-rose-100 rounded-3xl space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
          <h4 className="text-sm font-extrabold text-rose-900">Database Sync Interrupted</h4>
          <p className="text-xs text-rose-600 max-w-md mx-auto">{error}</p>
          <button 
            onClick={fetchData} 
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs rounded-xl transition cursor-pointer"
          >
            Retry Database Handshake
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* 1. PENDING TAB */}
          {activeTab === "pending" && role !== "admin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Pending Feedback Requests</h3>
                  <p className="text-xs text-slate-400 font-medium">Completed rides awaiting rating and village community reports.</p>
                </div>
                <span className="px-2.5 py-1 bg-amber-50 text-amber-700 text-[10px] border border-amber-200 font-black rounded-lg">
                  {unreviewedRides.length} Unrated
                </span>
              </div>

              {unreviewedRides.length === 0 ? (
                <div className="py-12 px-6 text-center bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                  <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-500 mx-auto border border-emerald-100">
                    <Check className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-black text-slate-800">All Lifelines Reviewed!</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">You've successfully provided valuable feedback for all your completed trips. Thank you for making GramGo safer!</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {unreviewedRides.map((ride) => (
                    <div 
                      key={ride.id}
                      className="bg-white border border-slate-100 hover:border-slate-200 rounded-3xl p-5 shadow-sm transition space-y-4 hover:shadow-md relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[9px] font-bold rounded uppercase">
                            {ride.emergencyType || "Standard Ride"}
                          </span>
                          <h4 className="text-sm font-black text-slate-900 pt-1">
                            Ride #{ride.id.slice(-6).toUpperCase()}
                          </h4>
                          <p className="text-[10px] text-slate-400 font-bold flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            {new Date(ride.createdAt).toLocaleString()}
                          </p>
                        </div>
                        <button
                          onClick={() => handleOpenRating(ride)}
                          className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-extrabold text-xs rounded-2xl transition shadow cursor-pointer flex items-center gap-1.5"
                        >
                          <Star className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                          Rate Now
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-3 pt-2 text-[11px] border-t border-slate-50 font-bold text-slate-600">
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">Village Node</span>
                          <span className="flex items-center gap-0.5 text-slate-800">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {ride.village}
                          </span>
                        </div>
                        <div className="space-y-0.5">
                          <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider block">
                            {role === "passenger" ? "Assigned Driver" : "Passenger Name"}
                          </span>
                          <span className="flex items-center gap-1 text-slate-800">
                            <User className="w-3 h-3 text-slate-400" />
                            {role === "passenger" ? (ride.driverName || "GramGo Driver") : (ride.patientName || ride.passengerName || "GramGo Passenger")}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 2. RECEIVED TAB */}
          {activeTab === "received" && role !== "admin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Compliments & qualitative Feedback</h3>
                  <p className="text-xs text-slate-400 font-medium">Ratings and qualitative remarks left by other users about you.</p>
                </div>
                <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] border border-emerald-200 font-black rounded-lg">
                  {reviewsReceived.length} Received
                </span>
              </div>

              {reviewsReceived.length === 0 ? (
                <div className="py-16 px-6 text-center bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800">No qualitative metrics recorded</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Once other users begin rating completed rides with you, their comments and feedback will populate here.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsReceived.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-black">
                            {rev.reviewerName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800">{rev.reviewerName}</h4>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-bold rounded uppercase">
                                {rev.reviewerRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(rev.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          {renderStars(rev.rating)}
                          <span className="text-[10px] font-black text-slate-400 pt-1">Ride #{rev.rideId.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-50 font-medium italic">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 3. GIVEN TAB */}
          {activeTab === "given" && role !== "admin" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Your Feedback History</h3>
                  <p className="text-xs text-slate-400 font-medium">Ratings and reviews you've written for past transits.</p>
                </div>
                <span className="px-2.5 py-1 bg-slate-100 text-slate-700 text-[10px] border border-slate-200 font-black rounded-lg">
                  {reviewsGiven.length} Submitted
                </span>
              </div>

              {reviewsGiven.length === 0 ? (
                <div className="py-16 px-6 text-center bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                  <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800">No written reviews yet</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Go to "Unrated Transits" to start providing ratings for drivers or passengers you completed rides with.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {reviewsGiven.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 hover:shadow-md transition">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-black">
                            {rev.revieweeName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h4 className="text-xs font-black text-slate-800">Rated: {rev.revieweeName}</h4>
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-[8px] font-bold rounded uppercase">
                                {rev.revieweeRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(rev.createdAt).toLocaleDateString()}</p>
                          </div>
                        </div>
                        <div className="flex flex-col items-end">
                          {renderStars(rev.rating)}
                          <span className="text-[10px] font-black text-slate-400 pt-1">Ride #{rev.rideId.slice(-6).toUpperCase()}</span>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-50 font-medium italic">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* 4. STATS TAB */}
          {activeTab === "stats" && (
            <div className="space-y-6">
              {/* Distribution Grid */}
              {stats ? (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Big metrics */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm flex flex-col justify-between space-y-4">
                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider block">Aggregate Trust Score</span>
                    <div className="py-4 text-center">
                      <div className="text-5xl font-black text-slate-900 flex items-baseline justify-center gap-1">
                        {stats.averageRating || "4.7"}
                        <span className="text-xs text-slate-400 font-semibold">out of 5 stars</span>
                      </div>
                      <div className="flex justify-center mt-2 scale-110">
                        {renderStars(stats.averageRating || 4.7)}
                      </div>
                      <p className="text-[11px] text-emerald-600 font-bold mt-4 bg-emerald-50 px-3 py-1 rounded-full inline-block">
                        Excellent Performance Metric
                      </p>
                    </div>
                    <div className="border-t border-slate-50 pt-4 flex items-center justify-between text-xs text-slate-500 font-bold">
                      <span>Total Qualitative Reviews</span>
                      <span className="text-slate-900 text-sm">{stats.totalReviews || "0"}</span>
                    </div>
                  </div>

                  {/* Rating Distribution Bars */}
                  <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm md:col-span-2 space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider">Rating Distribution Matrix</h4>
                      <TrendingUp className="w-4 h-4 text-slate-400" />
                    </div>

                    <div className="space-y-3 pt-2">
                      {[5, 4, 3, 2, 1].map((starsKey) => {
                        const count = stats.ratingDistribution[starsKey as 1 | 2 | 3 | 4 | 5] || 0;
                        const percentage = stats.totalReviews > 0 
                          ? (count / stats.totalReviews) * 100 
                          : 0;

                        return (
                          <div key={starsKey} className="flex items-center gap-3 text-xs font-bold text-slate-600">
                            <span className="w-3 text-slate-500">{starsKey}</span>
                            <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
                            <div className="flex-grow bg-slate-100 h-2.5 rounded-full overflow-hidden">
                              <div 
                                className="bg-amber-400 h-full rounded-full transition-all duration-500"
                                style={{ width: `${percentage}%` }}
                              ></div>
                            </div>
                            <span className="w-12 text-right text-[10px] text-slate-400 font-extrabold uppercase tracking-wider">
                              {count} ({Math.round(percentage)}%)
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-12 text-center bg-white border border-slate-100 rounded-3xl space-y-2 shadow-sm">
                  <p className="text-xs text-slate-400 font-bold">No stats matrices compiled.</p>
                </div>
              )}

              {/* Qualities / Badges list */}
              <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
                <h4 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-500" />
                  Panchayat Service Badges & Badges Earned
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 pt-2">
                  <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition text-center space-y-1">
                    <div className="w-9 h-9 bg-emerald-100 text-emerald-600 rounded-xl flex items-center justify-center mx-auto text-sm">
                      🛡️
                    </div>
                    <div className="text-xs font-black text-slate-800 pt-1">Safe Lifeline</div>
                    <div className="text-[10px] text-slate-400 font-medium">95%+ Safe driving reviews</div>
                  </div>

                  <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition text-center space-y-1">
                    <div className="w-9 h-9 bg-amber-100 text-amber-600 rounded-xl flex items-center justify-center mx-auto text-sm">
                      ⏱️
                    </div>
                    <div className="text-xs font-black text-slate-800 pt-1">Punctual Savior</div>
                    <div className="text-[10px] text-slate-400 font-medium">Under 5-min pickup response</div>
                  </div>

                  <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition text-center space-y-1">
                    <div className="w-9 h-9 bg-purple-100 text-purple-600 rounded-xl flex items-center justify-center mx-auto text-sm">
                      🤝
                    </div>
                    <div className="text-xs font-black text-slate-800 pt-1">Panchayat Trust</div>
                    <div className="text-[10px] text-slate-400 font-medium">Verified village volunteer</div>
                  </div>

                  <div className="bg-slate-50 hover:bg-slate-100/70 p-4 rounded-2xl border border-slate-100 transition text-center space-y-1">
                    <div className="w-9 h-9 bg-pink-100 text-pink-600 rounded-xl flex items-center justify-center mx-auto text-sm">
                      ⭐
                    </div>
                    <div className="text-xs font-black text-slate-800 pt-1">Superstar</div>
                    <div className="text-[10px] text-slate-400 font-medium">Maintained 4.8+ rating</div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 5. ADMIN GLOBAL TAB */}
          {activeTab === "global" && role === "admin" && (
            <div className="space-y-4">
              {/* Search & Filter Header */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-white border border-slate-100 p-4 rounded-2xl shadow-sm">
                <div className="md:col-span-2 relative">
                  <input
                    type="text"
                    placeholder="Search by reviewer, reviewee, comments..."
                    value={adminSearch}
                    onChange={(e) => setAdminSearch(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900/10"
                  />
                  <Filter className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                </div>

                <div>
                  <select
                    value={adminStarFilter}
                    onChange={(e) => setAdminStarFilter(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="all">All Stars Rating</option>
                    <option value="5">5 Stars</option>
                    <option value="4">4 Stars</option>
                    <option value="3">3 Stars</option>
                    <option value="2">2 Stars</option>
                    <option value="1">1 Star</option>
                  </select>
                </div>

                <div>
                  <select
                    value={adminRoleFilter}
                    onChange={(e) => setAdminRoleFilter(e.target.value)}
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold outline-none cursor-pointer"
                  >
                    <option value="all">All Reviewee Roles</option>
                    <option value="driver">Rated Drivers</option>
                    <option value="passenger">Rated Passengers</option>
                  </select>
                </div>
              </div>

              {/* Reviews List */}
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <span className="text-xs font-black text-slate-800 uppercase tracking-wider">
                  Governance Feed ({filteredAdminReviews.length} records matched)
                </span>
              </div>

              {filteredAdminReviews.length === 0 ? (
                <div className="py-16 px-6 text-center bg-white border border-slate-100 rounded-3xl space-y-3 shadow-sm">
                  <ShieldAlert className="w-8 h-8 text-slate-300 mx-auto" />
                  <h4 className="text-sm font-black text-slate-800">No matching reviews</h4>
                  <p className="text-xs text-slate-400 max-w-sm mx-auto">Try clearing your filters or widening your search query parameters.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredAdminReviews.map((rev) => (
                    <div key={rev.id} className="bg-white border border-slate-100 rounded-3xl p-5 shadow-sm space-y-3 hover:shadow-md transition">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 bg-slate-50 border border-slate-100 rounded-xl flex items-center justify-center text-slate-700 font-black">
                            {rev.reviewerName.charAt(0)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-black text-slate-800">{rev.reviewerName}</span>
                              <ChevronRight className="w-3 h-3 text-slate-300" />
                              <span className="text-xs font-black text-slate-800">{rev.revieweeName}</span>
                              <span className={`px-2 py-0.2 rounded text-[8px] font-black uppercase border ${
                                rev.revieweeRole === "driver" 
                                  ? "bg-emerald-50 text-emerald-700 border-emerald-100" 
                                  : "bg-blue-50 text-blue-700 border-blue-100"
                              }`}>
                                {rev.revieweeRole}
                              </span>
                            </div>
                            <p className="text-[10px] text-slate-400 font-semibold">{new Date(rev.createdAt).toLocaleString()}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3 self-end sm:self-start">
                          <div className="flex flex-col items-end">
                            {renderStars(rev.rating)}
                            <span className="text-[10px] font-black text-slate-400">Ride ID: {rev.rideId}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteReview(rev.id)}
                            className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                            title="Delete in violation of standards"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {rev.comment && (
                        <p className="text-xs text-slate-600 bg-slate-50/50 p-3 rounded-2xl border border-slate-50 font-medium italic">
                          "{rev.comment}"
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* RATING SUBMISSION MODAL */}
      <AnimatePresence>
        {ratingModalOpen && selectedRide && (
          <div className="fixed inset-0 bg-slate-950/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="bg-white rounded-3xl max-w-lg w-full p-6 md:p-8 border border-slate-100 shadow-2xl relative"
            >
              <button
                onClick={() => setRatingModalOpen(false)}
                className="absolute top-6 right-6 p-2 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                ✕
              </button>

              <div className="flex items-center gap-2 mb-6">
                <span className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
                  <Star className="w-5 h-5 text-amber-500 fill-amber-500" />
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Rate Transit Savior
                </h3>
              </div>

              <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 text-xs font-bold space-y-2 mb-6">
                <div className="flex justify-between">
                  <span className="text-slate-400">Ride Number</span>
                  <span className="text-slate-800">#{selectedRide.id.slice(-6).toUpperCase()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Date & Time</span>
                  <span className="text-slate-800">{new Date(selectedRide.createdAt).toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">
                    {role === "passenger" ? "Your Driver" : "Your Passenger"}
                  </span>
                  <span className="text-slate-800">
                    {role === "passenger" ? (selectedRide.driverName || "GramGo Driver") : (selectedRide.patientName || selectedRide.passengerName || "GramGo Passenger")}
                  </span>
                </div>
              </div>

              <form onSubmit={handleSubmitReview} className="space-y-5">
                {/* Star selection */}
                <div className="space-y-2 text-center">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Star Rating *</label>
                  <div className="flex justify-center items-center gap-2">
                    {[0, 1, 2, 3, 4].map((i) => (
                      <button
                        key={i}
                        type="button"
                        onClick={() => setStarRating(i + 1)}
                        onMouseEnter={() => setHoverRating(i + 1)}
                        onMouseLeave={() => setHoverRating(null)}
                        className="p-1 cursor-pointer transform hover:scale-125 transition-transform"
                      >
                        <Star 
                          className={`w-10 h-10 transition-colors ${getStarColor(starRating, hoverRating, i)}`} 
                        />
                      </button>
                    ))}
                  </div>
                  <span className="text-[11px] font-black text-amber-600 uppercase tracking-widest block pt-1">
                    {starRating === 5 && "Outstanding 5 Stars"}
                    {starRating === 4 && "Very Good 4 Stars"}
                    {starRating === 3 && "Good / Average 3 Stars"}
                    {starRating === 2 && "Poor Service 2 Stars"}
                    {starRating === 1 && "Extremely Poor 1 Star"}
                  </span>
                </div>

                {/* Quick Quality Tags */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Service Commendation Tags</label>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {quickTags.map((tag) => {
                      const isSelected = selectedTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          className={`px-3 py-1.5 rounded-xl text-xs font-extrabold border transition cursor-pointer flex items-center gap-1 ${
                            isSelected 
                              ? "bg-slate-900 border-slate-900 text-white" 
                              : "bg-slate-50 border-slate-100 text-slate-600 hover:bg-slate-100"
                          }`}
                        >
                          {isSelected && <Check className="w-3.5 h-3.5" />}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Custom comment input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Qualitative Feedback Comment (Optional)</label>
                  <textarea
                    rows={3}
                    placeholder="Provide details about your safety, speed, politeness of the driver/passenger or any constructive feedback..."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="w-full p-4 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-semibold outline-none focus:ring-2 focus:ring-slate-900/10 placeholder:text-slate-400 resize-none"
                  ></textarea>
                </div>

                {formError && (
                  <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-100 text-rose-800 text-xs rounded-xl font-bold">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <span>{formError}</span>
                  </div>
                )}

                {formSuccess && (
                  <div className="flex items-center gap-2 p-3 bg-emerald-50 border border-emerald-100 text-emerald-800 text-xs rounded-xl font-bold animate-pulse">
                    <Check className="w-4 h-4 text-emerald-600" />
                    <span>{formSuccess}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-black py-4 rounded-2xl text-xs transition mt-6 cursor-pointer"
                >
                  {submitting ? "Uploading feedback..." : "Submit Qualities Review"}
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
