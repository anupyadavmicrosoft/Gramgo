import React, { useState, useEffect } from "react";
import { 
  Gift, 
  Copy, 
  Check, 
  Share2, 
  Users, 
  TrendingUp, 
  Coins, 
  Clock, 
  CheckCircle2, 
  AlertCircle, 
  Sparkles, 
  Send, 
  Lock, 
  Loader2, 
  Edit3, 
  ArrowRight,
  ExternalLink,
  MessageSquare,
  Mail,
  Link,
  BarChart3,
  Percent,
  Info
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Legend 
} from "recharts";

interface ReferralStats {
  totalReferrals: number;
  timesUsed: number;
  referralLimit: number;
  remainingLimit: number;
  pendingRewardsCount: number;
  claimedRewardsCount: number;
  totalRewardsEarned: number;
  pendingRewardsAmount: number;
  claimedRewardsAmount: number;
}

interface ReferralConfig {
  id: string;
  userId: string;
  code: string;
  status: "active" | "inactive";
  referralLimit: number;
  timesUsed: number;
  expiryDate?: string;
  createdAt: string;
}

interface ReferralTransaction {
  id: string;
  referrerId: string;
  refereeId: string;
  refereeName: string;
  referralCode: string;
  status: "registered" | "completed_first_ride" | "rewarded";
  createdAt: string;
}

interface ReferralReward {
  id: string;
  userId: string;
  type: "referrer" | "referee";
  amount: number;
  status: "pending" | "claimed" | "expired";
  description: string;
  createdAt: string;
}

interface ReferralDashboardProps {
  token: string | null;
  onRewardClaimed?: () => void;
}

export default function ReferralDashboard({ token, onRewardClaimed }: ReferralDashboardProps) {
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [referral, setReferral] = useState<ReferralConfig | null>(null);
  const [stats, setStats] = useState<ReferralStats | null>(null);
  const [transactions, setTransactions] = useState<ReferralTransaction[]>([]);
  const [rewards, setRewards] = useState<ReferralReward[]>([]);

  // Action states
  const [copied, setCopied] = useState<boolean>(false);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);
  const [customCode, setCustomCode] = useState<string>("");
  const [isEditingCode, setIsEditingCode] = useState<boolean>(false);
  const [updatingCode, setUpdatingCode] = useState<boolean>(false);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [codeSuccess, setCodeSuccess] = useState<string | null>(null);
  const [claimingId, setClaimingId] = useState<string | null>(null);
  const [claimSuccessMsg, setClaimSuccessMsg] = useState<string | null>(null);

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    if (!token) return;
    try {
      setLoading(true);
      setError(null);
      const res = await fetch("/api/referrals/dashboard", {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to retrieve referral records.");
      }
      setReferral(data.referral);
      setStats(data.stats);
      setTransactions(data.transactions);
      setRewards(data.rewards);
      setCustomCode(data.referral?.code || "");
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Something went wrong while accessing your referrals.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [token]);

  // Copy referral code text
  const handleCopyCode = () => {
    if (!referral) return;
    navigator.clipboard.writeText(referral.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  // Copy referral link URL
  const handleCopyLink = () => {
    if (!referral) return;
    const shareLink = `${window.location.origin}/register?ref=${referral.code}`;
    navigator.clipboard.writeText(shareLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const getShareText = () => {
    if (!referral) return "";
    return `Use my GramGo referral code "${referral.code}" to get an onboarding bonus of ₹50 towards safe emergency medical rides and panchayat transport! Sign up here: ${window.location.origin}/register?ref=${referral.code}`;
  };

  // Share via WhatsApp
  const handleWhatsAppShare = () => {
    const text = getShareText();
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, "_blank");
  };

  // Share via SMS
  const handleSMSShare = () => {
    const text = getShareText();
    window.open(`sms:?body=${encodeURIComponent(text)}`, "_blank");
  };

  // Share via Email
  const handleEmailShare = () => {
    const text = getShareText();
    const subject = "Join GramGo Rural Mobility & Receive ₹50 Credit Bonus!";
    window.open(`mailto:?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(text)}`, "_blank");
  };

  // Share via native device menu
  const handleNativeShare = async () => {
    if (!referral) return;
    const text = getShareText();
    const shareLink = `${window.location.origin}/register?ref=${referral.code}`;
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join GramGo Rural Mobility",
          text: text,
          url: shareLink
        });
      } catch (err) {
        console.log("Native share cancelled or failed.", err);
      }
    } else {
      handleWhatsAppShare();
    }
  };

  // Submit custom referral code
  const handleCustomizeCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token || !customCode.trim()) return;
    try {
      setUpdatingCode(true);
      setCodeError(null);
      setCodeSuccess(null);

      const res = await fetch("/api/referrals/custom-code", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({ code: customCode.toUpperCase().trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to customize referral code.");
      }

      setReferral(data.referral);
      setCodeSuccess("Your referral code has been updated successfully!");
      setIsEditingCode(false);
      // Refresh stats
      fetchDashboardData();
    } catch (err: any) {
      setCodeError(err.message || "An error occurred while editing code.");
    } finally {
      setUpdatingCode(false);
    }
  };

  // Claim pending referral reward
  const handleClaimReward = async (rewardId: string) => {
    if (!token) return;
    try {
      setClaimingId(rewardId);
      setClaimSuccessMsg(null);

      const res = await fetch(`/api/referrals/claim/${rewardId}`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`
        }
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to claim reward.");
      }

      setClaimSuccessMsg(data.message);
      
      // Refresh local dashboard data
      await fetchDashboardData();

      // Trigger optional external callback to update user wallet navbar balance instantly
      if (onRewardClaimed) {
        onRewardClaimed();
      }
    } catch (err: any) {
      alert(err.message || "Claiming failed.");
    } finally {
      setClaimingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-16 space-y-3">
        <Loader2 className="w-8 h-8 text-orange-600 animate-spin" />
        <p className="text-sm font-semibold text-slate-500">Retrieving your referral ecosystem...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-800 p-6 rounded-2xl flex flex-col items-center text-center space-y-4">
        <AlertCircle className="w-10 h-10 text-red-600" />
        <div>
          <h4 className="font-bold text-base">Unable to Load Referrals</h4>
          <p className="text-xs text-red-600 mt-1">{error}</p>
        </div>
        <button 
          onClick={fetchDashboardData}
          className="px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-bold hover:bg-red-700 cursor-pointer transition-colors"
        >
          Try Again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Banner / Header */}
      <div className="relative overflow-hidden bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white p-6 md:p-8 rounded-3xl border border-slate-800 shadow-xl">
        <div className="absolute right-0 top-0 translate-x-12 -translate-y-12 w-64 h-64 bg-orange-600/10 rounded-full blur-3xl pointer-events-none"></div>
        
        <div className="relative z-10 space-y-4 max-w-2xl">
          <div className="inline-flex items-center space-x-2 px-3 py-1 bg-orange-500/15 border border-orange-500/30 rounded-full">
            <Sparkles className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] font-extrabold uppercase tracking-widest text-orange-300">Invite & Prosper</span>
          </div>
          <h1 className="text-2xl md:text-3xl font-black tracking-tight leading-none">
            Help Your Neighbors Move Safely,<br/>
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-300">Earn Onboarding Credits!</span>
          </h1>
          <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
            Share your unique referral code. When village friends register on GramGo, they instantly receive <span className="text-orange-300 font-bold">₹50</span>. Once they register, you receive <span className="text-orange-300 font-bold">₹50</span>, and an additional <span className="text-orange-300 font-bold">₹100</span> when they complete their first life-saving emergency ride!
          </p>
        </div>
      </div>

      {/* Stats Cards Grid */}
      {stats && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Invited</span>
              <span className="text-xl font-black text-slate-800">{stats.totalReferrals}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pending Rewards</span>
              <span className="text-xl font-black text-slate-800">₹{stats.pendingRewardsAmount}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Claimed Rewards</span>
              <span className="text-xl font-black text-slate-800">₹{stats.claimedRewardsAmount}</span>
            </div>
          </div>

          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center space-x-4">
            <div className="p-3 bg-orange-50 text-orange-600 rounded-xl">
              <Gift className="w-5 h-5" />
            </div>
            <div>
              <span className="block text-[10px] text-slate-400 uppercase font-bold tracking-wider">Total Earned</span>
              <span className="text-xl font-black text-slate-800">₹{stats.totalRewardsEarned}</span>
            </div>
          </div>
        </div>
      )}

      {/* Visual Analytics & Share Statistics */}
      {stats && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-6">
          <div className="flex items-center justify-between border-b border-slate-50 pb-4">
            <div>
              <h2 className="text-sm font-black text-slate-800 flex items-center space-x-2">
                <BarChart3 className="w-4 h-4 text-orange-600" />
                <span>Invite Statistics & Conversion Insights</span>
              </h2>
              <p className="text-xs text-slate-400 font-semibold">Real-time breakdown of registration funnels and limit thresholds.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-stretch">
            {/* Left Box: Quota Gauge */}
            <div className="bg-slate-50 border border-slate-100/80 p-5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center space-x-1">
                  <Percent className="w-3.5 h-3.5 text-orange-600" />
                  <span>Invitation Quota Status</span>
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  You have consumed <span className="text-orange-600 font-bold">{stats.timesUsed}</span> out of your maximum limit of <span className="text-slate-700 font-bold">{stats.referralLimit}</span> active referral invitations.
                </p>
              </div>

              <div className="h-44 flex items-center justify-center relative my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={[
                        { name: "Invited", value: stats.timesUsed },
                        { name: "Remaining Slots", value: Math.max(0, stats.referralLimit - stats.timesUsed) }
                      ]}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={70}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      <Cell fill="#EA580C" />
                      <Cell fill="#E2E8F0" />
                    </Pie>
                    <Tooltip 
                      contentStyle={{ background: "#ffffff", borderRadius: "8px", fontSize: "11px", border: "1px solid #f1f5f9" }}
                    />
                  </PieChart>
                </ResponsiveContainer>
                {/* Center Labels */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-black text-slate-800">
                    {Math.round(((stats.timesUsed) / (stats.referralLimit || 10)) * 100)}%
                  </span>
                  <span className="text-[9px] uppercase font-bold text-slate-400 tracking-wider">Quota Used</span>
                </div>
              </div>

              <div className="border-t border-slate-100/50 pt-3.5 flex justify-between items-center text-[11px]">
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-orange-600"></span>
                  <span className="text-slate-500 font-medium">Invited ({stats.timesUsed})</span>
                </div>
                <div className="flex items-center space-x-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-200"></span>
                  <span className="text-slate-500 font-medium">Remaining ({Math.max(0, stats.referralLimit - stats.timesUsed)})</span>
                </div>
              </div>
            </div>

            {/* Right Box: Funnel Distribution */}
            <div className="bg-slate-50 border border-slate-100/80 p-5 rounded-2xl flex flex-col justify-between">
              <div className="space-y-1">
                <h4 className="text-xs font-black text-slate-700 uppercase tracking-wide flex items-center space-x-1">
                  <TrendingUp className="w-3.5 h-3.5 text-orange-600" />
                  <span>Referral Conversion Funnel</span>
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">
                  Tracks friends as they advance through registration, first rides, and full claim cycles.
                </p>
              </div>

              {transactions.length === 0 ? (
                <div className="h-44 flex flex-col items-center justify-center text-center text-slate-400 py-6 space-y-2">
                  <Users className="w-6 h-6 text-slate-300 stroke-[1.5]" />
                  <p className="text-[11px] font-bold">Pipeline Empty</p>
                  <p className="text-[9px] text-slate-400 max-w-xs px-4">
                    Your conversion funnel data will populate automatically once your first referred friend registers.
                  </p>
                </div>
              ) : (
                <div className="h-44 my-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          stage: "Registered",
                          count: transactions.filter(t => t.status === "registered").length,
                          color: "#3B82F6"
                        },
                        {
                          stage: "1st Ride Done",
                          count: transactions.filter(t => t.status === "completed_first_ride").length,
                          color: "#F59E0B"
                        },
                        {
                          stage: "Rewarded",
                          count: transactions.filter(t => t.status === "rewarded").length,
                          color: "#10B981"
                        }
                      ]}
                      margin={{ top: 15, right: 10, left: -25, bottom: 5 }}
                    >
                      <XAxis dataKey="stage" tick={{ fontSize: 9, fontWeight: "bold", fill: "#64748B" }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fontSize: 9, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                      <Tooltip contentStyle={{ fontSize: "11px", borderRadius: "8px", border: "1px solid #f1f5f9" }} />
                      <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                        <Cell fill="#3B82F6" />
                        <Cell fill="#F59E0B" />
                        <Cell fill="#10B981" />
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}

              <div className="border-t border-slate-100/50 pt-3.5 flex justify-between items-center text-[10px] font-bold uppercase tracking-wider text-slate-400">
                <span>Conversion Rate: </span>
                <span className="text-slate-700">
                  {transactions.length > 0
                    ? `${Math.round(
                        (transactions.filter(t => ["completed_first_ride", "rewarded"].includes(t.status)).length /
                          transactions.length) *
                          100
                      )}%`
                    : "0%"}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main Referral Action Area */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Code Card and Customizer */}
        <div className="lg:col-span-5 space-y-6">
          {referral && (
            <div className="bg-white rounded-3xl border border-slate-100 shadow-sm p-6 relative overflow-hidden space-y-6">
              {/* Card visual elements */}
              <div className="absolute right-0 bottom-0 translate-x-4 translate-y-4 text-orange-50/50 pointer-events-none">
                <Gift className="w-48 h-48 stroke-[0.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-sm font-black text-slate-800">Your Unique Referral Code</h3>
                <p className="text-xs text-slate-400 font-semibold">Share this code with neighbors to earn subsidies.</p>
              </div>

              {/* Monospace Code Display */}
              <div className="space-y-3">
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div>
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Referral Suffix</span>
                    <div className="font-mono text-base font-black tracking-widest text-slate-800 select-all">
                      {referral.code}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyCode}
                    title="Copy code suffix"
                    className="p-2 py-1.5 bg-white border border-slate-100 hover:border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer flex items-center space-x-1.5"
                  >
                    {copiedCode ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold text-slate-500">Copy Code</span>
                      </>
                    )}
                  </button>
                </div>

                {/* Shared Referral Link Card */}
                <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex items-center justify-between">
                  <div className="truncate mr-4">
                    <span className="block text-[10px] uppercase font-bold text-slate-400 tracking-wider">Full Invite Link</span>
                    <div className="text-xs font-semibold text-slate-600 truncate font-mono">
                      {window.location.origin}/register?ref={referral.code}
                    </div>
                  </div>
                  <button
                    onClick={handleCopyLink}
                    title="Copy full invite link"
                    className="p-2 py-1.5 bg-white border border-slate-100 hover:border-slate-300 rounded-xl hover:bg-slate-50 text-slate-600 transition-colors cursor-pointer shrink-0 flex items-center space-x-1.5"
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-[11px] font-bold text-emerald-600">Copied!</span>
                      </>
                    ) : (
                      <>
                        <Link className="w-3.5 h-3.5" />
                        <span className="text-[11px] font-bold text-slate-500">Copy Link</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Individual Platform Share Triggers */}
              <div className="space-y-2 pt-2">
                <span className="block text-[10px] uppercase font-black text-slate-400 tracking-wider">Quick Share Channels</span>
                <div className="grid grid-cols-2 gap-2">
                  {/* WhatsApp */}
                  <button
                    onClick={handleWhatsAppShare}
                    className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <MessageSquare className="w-4 h-4 text-emerald-600" />
                    <span>WhatsApp</span>
                  </button>

                  {/* SMS */}
                  <button
                    onClick={handleSMSShare}
                    className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Send className="w-4 h-4 text-sky-600" />
                    <span>SMS / Message</span>
                  </button>

                  {/* Email */}
                  <button
                    onClick={handleEmailShare}
                    className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Mail className="w-4 h-4 text-rose-600" />
                    <span>Email Invite</span>
                  </button>

                  {/* Native System Share */}
                  <button
                    onClick={handleNativeShare}
                    className="flex items-center justify-center space-x-2 px-3 py-2.5 bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-100 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <Share2 className="w-4 h-4 text-orange-600" />
                    <span>Other Share</span>
                  </button>
                </div>
              </div>

              {/* Stats Bar */}
              <div className="border-t border-slate-50 pt-4 flex justify-between items-center text-xs">
                <div>
                  <span className="text-slate-400 font-semibold">Usage Limit: </span>
                  <span className="text-slate-700 font-bold">{referral.timesUsed}/{referral.referralLimit} invitations</span>
                </div>
                <div>
                  <span className="text-slate-400 font-semibold">Status: </span>
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[9px] ${
                    referral.status === "active" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700"
                  }`}>
                    {referral.status}
                  </span>
                </div>
              </div>

              {/* Edit Form Toggle */}
              <div className="pt-2">
                {!isEditingCode ? (
                  <button
                    onClick={() => {
                      setIsEditingCode(true);
                      setCodeSuccess(null);
                      setCodeError(null);
                    }}
                    className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center space-x-1.5 cursor-pointer"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                    <span>Customize Your Referral Code suffix</span>
                  </button>
                ) : (
                  <form onSubmit={handleCustomizeCode} className="space-y-3.5 border-t border-slate-100 pt-4">
                    <div className="space-y-1">
                      <label className="block text-[10px] text-slate-500 uppercase font-black">Choose Customized Suffix</label>
                      <div className="flex space-x-2">
                        <input
                          type="text"
                          value={customCode}
                          onChange={(e) => setCustomCode(e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ""))}
                          placeholder="e.g. KUMAR123"
                          maxLength={15}
                          className="flex-grow text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 font-mono font-bold text-slate-800 uppercase focus:outline-none focus:border-orange-500"
                        />
                        <button
                          type="submit"
                          disabled={updatingCode || !customCode.trim()}
                          className="px-4 py-2 bg-slate-800 hover:bg-slate-900 disabled:bg-slate-300 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer flex items-center space-x-1.5"
                        >
                          {updatingCode ? <Loader2 className="w-3 h-3 animate-spin" /> : <span>Update</span>}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-400 font-semibold leading-normal">
                        Alphanumeric only, 4 to 15 characters. Branded or custom codes are easier for friends to remember!
                      </p>
                    </div>

                    {codeError && (
                      <p className="text-[10px] text-red-600 font-bold flex items-center space-x-1">
                        <AlertCircle className="w-3 h-3 shrink-0" />
                        <span>{codeError}</span>
                      </p>
                    )}

                    <div className="flex justify-end pt-1">
                      <button
                        type="button"
                        onClick={() => setIsEditingCode(false)}
                        className="text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                )}

                {codeSuccess && (
                  <p className="text-[10px] text-emerald-600 font-bold mt-2 flex items-center space-x-1">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                    <span>{codeSuccess}</span>
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Share instructions card */}
          <div className="bg-gradient-to-br from-orange-50/50 to-amber-50/30 border border-orange-100 rounded-3xl p-5 space-y-4">
            <h4 className="text-xs font-black text-orange-800 uppercase tracking-wide flex items-center space-x-1.5">
              <TrendingUp className="w-4 h-4" />
              <span>How To Invite Effectively</span>
            </h4>
            <ul className="text-xs font-semibold text-slate-600 space-y-2.5 list-none pl-0">
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">1</span>
                <span>Send your link on WhatsApp to family chat groups.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">2</span>
                <span>Advise them to enter your code during the registration form.</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="w-5 h-5 bg-orange-100 text-orange-700 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">3</span>
                <span>Enjoy mutual bonuses deposited into your Subsidy Wallets instantly!</span>
              </li>
            </ul>
          </div>
        </div>

        {/* Rewards and History List */}
        <div className="lg:col-span-7 space-y-6">
          {/* Rewards claim table */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">Your Referral Rewards Ledger</h3>
                <p className="text-xs text-slate-400 font-semibold">Claim your earned credits and add them to your active balance.</p>
              </div>
              <Gift className="w-5 h-5 text-orange-500" />
            </div>

            {claimSuccessMsg && (
              <motion.div 
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-4 rounded-xl text-xs font-bold flex items-center space-x-2.5"
              >
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>{claimSuccessMsg}</span>
              </motion.div>
            )}

            {rewards.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Gift className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                <p className="text-xs font-bold">No rewards recorded yet.</p>
                <p className="text-[10px] text-slate-400 font-medium">Rewards will appear here once friends register with your code.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-80 overflow-y-auto pr-1">
                {rewards.map((rew) => (
                  <div key={rew.id} className="bg-slate-50 border border-slate-100 p-4 rounded-2xl flex items-center justify-between transition-all hover:bg-slate-100/50">
                    <div className="space-y-1 pr-4">
                      <p className="text-xs font-bold text-slate-700">{rew.description}</p>
                      <div className="flex items-center space-x-2 text-[10px] text-slate-400 font-semibold">
                        <span>{new Date(rew.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" })}</span>
                        <span>•</span>
                        <span className="capitalize">{rew.type} Bonus</span>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4 shrink-0">
                      <div className="text-right">
                        <span className="block text-sm font-black text-slate-800">+₹{rew.amount}</span>
                        <span className={`inline-block text-[9px] font-extrabold uppercase mt-0.5 ${
                          rew.status === "claimed" ? "text-emerald-600" : rew.status === "pending" ? "text-amber-600" : "text-slate-400"
                        }`}>
                          {rew.status}
                        </span>
                      </div>
                      
                      {rew.status === "pending" && (
                        <button
                          onClick={() => handleClaimReward(rew.id)}
                          disabled={claimingId !== null}
                          className="px-3.5 py-1.5 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-bold text-xs rounded-lg transition-colors shadow-sm cursor-pointer"
                        >
                          {claimingId === rew.id ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : (
                            <span>Claim</span>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Invited Friends Transactions list */}
          <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between border-b border-slate-50 pb-3">
              <div>
                <h3 className="text-sm font-black text-slate-800">Referral History</h3>
                <p className="text-xs text-slate-400 font-semibold">Track invitation status and active registration conversions.</p>
              </div>
              <Users className="w-5 h-5 text-slate-400" />
            </div>

            {transactions.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Users className="w-8 h-8 text-slate-300 mx-auto stroke-[1.5]" />
                <p className="text-xs font-bold">No friends registered yet.</p>
                <p className="text-[10px] text-slate-400 font-medium">Use the copy/share links above to initiate invite codes.</p>
              </div>
            ) : (
              <div className="space-y-3.5 max-h-64 overflow-y-auto pr-1">
                {transactions.map((tx) => (
                  <div key={tx.id} className="border border-slate-100 p-3.5 rounded-xl flex items-center justify-between hover:bg-slate-50 transition-colors">
                    <div className="space-y-1">
                      <span className="block text-xs font-extrabold text-slate-800">{tx.refereeName}</span>
                      <span className="block text-[10px] text-slate-400 font-semibold">
                        Registered: {new Date(tx.createdAt).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
                      </span>
                    </div>

                    <div className="text-right">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full font-bold uppercase text-[9px] border ${
                        tx.status === "rewarded" 
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200" 
                          : tx.status === "completed_first_ride" 
                          ? "bg-blue-50 text-blue-700 border-blue-200" 
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}>
                        {tx.status === "rewarded" 
                          ? "Fully Rewarded" 
                          : tx.status === "completed_first_ride" 
                          ? "First Ride Completed" 
                          : "Registered"}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
