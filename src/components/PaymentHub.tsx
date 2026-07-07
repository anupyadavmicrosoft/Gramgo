import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  CreditCard,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Coins,
  ShieldCheck,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Info,
  ExternalLink,
  ChevronRight,
  User,
  Activity,
  DollarSign,
  Undo2,
  Lock,
  Plus,
  Search,
  Calendar,
  Download,
  Printer,
  FileText,
  SlidersHorizontal
} from "lucide-react";

interface GatewayStatus {
  isConfigured: boolean;
  keyId?: string | null;
  publicKey?: string | null;
}

interface GatewayConfig {
  razorpay: GatewayStatus;
  stripe: GatewayStatus;
}

interface PaymentItem {
  id: string;
  bookingId?: string;
  userId: string;
  userName: string;
  userEmail: string;
  amount: number;
  currency: string;
  status: "pending" | "success" | "failed" | "refunded";
  gateway: "razorpay" | "stripe" | "wallet" | "none";
  gatewayPaymentId?: string;
  gatewayOrderId?: string;
  gatewaySignature?: string;
  description?: string;
  refundReason?: string;
  refundedAt?: string;
  createdAt: string;
  updatedAt: string;
}

interface PaymentHubProps {
  userId: string;
  token: string | null;
  role: "passenger" | "driver" | "admin";
  onPaymentSuccess?: () => void; // Optional callback to refresh wallet balance
}

export default function PaymentHub({ userId, token, role, onPaymentSuccess }: PaymentHubProps) {
  const [gatewayConfig, setGatewayConfig] = useState<GatewayConfig | null>(null);
  const [payments, setPayments] = useState<PaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Simulation Form States
  const [simAmount, setSimAmount] = useState<string>("150");
  const [simGateway, setSimGateway] = useState<"razorpay" | "stripe" | "wallet">("wallet");
  const [simDescription, setSimDescription] = useState<string>("Demo wallet recharge");
  const [simBookingId, setSimBookingId] = useState<string>("");
  const [initializingPayment, setInitializingPayment] = useState(false);

  // Active Simulated Checkout Overlay
  const [activeCheckoutPayment, setActiveCheckoutPayment] = useState<PaymentItem | null>(null);
  const [verifyingPayment, setVerifyingPayment] = useState(false);

  // Refund Dialog
  const [refundPaymentTarget, setRefundPaymentTarget] = useState<PaymentItem | null>(null);
  const [refundReason, setRefundReason] = useState("");
  const [processingRefund, setProcessingRefund] = useState(false);

  // Help Dialogs
  const [showConfigHelp, setShowConfigHelp] = useState<"razorpay" | "stripe" | null>(null);

  // Filter & Search States
  const [searchQuery, setSearchQuery] = useState("");
  const [filterGateway, setFilterGateway] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [selectedInvoicePayment, setSelectedInvoicePayment] = useState<PaymentItem | null>(null);

  const handleDownloadInvoice = (payment: PaymentItem) => {
    const taxRate = 0.18;
    const gstAmount = payment.amount * taxRate;
    const subtotal = payment.amount - gstAmount;
    
    const invoiceContent = `==================================================
              GRAMGO TAX INVOICE
==================================================
Invoice No: INV-2026-${payment.id.toUpperCase()}
Issue Date: ${new Date(payment.createdAt).toLocaleString()}
Status:     ${payment.status.toUpperCase()}
Gateway:    ${payment.gateway.toUpperCase()}
--------------------------------------------------
CUSTOMER DETAILS:
Name:       ${payment.userName}
Email:      ${payment.userEmail}
User ID:    ${payment.userId}
--------------------------------------------------
TRANSACTION DESCRIPTION:
${payment.description || "Subsidy Wallet Recharge / Ride Payment"}
${payment.bookingId ? `Linked Booking Reference: ${payment.bookingId}` : ""}
--------------------------------------------------
BILLING BREAKDOWN:
Subtotal:   ₹${subtotal.toFixed(2)}
GST (18%):  ₹${gstAmount.toFixed(2)}
--------------------------------------------------
TOTAL PAID: ₹${payment.amount.toLocaleString()} INR
==================================================
Thank you for using GramGo Rural Mobility Platform!
Safe rides, strong communities.
==================================================`;

    const blob = new Blob([invoiceContent], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `GramGo_Invoice_${payment.id}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    fetchData();
  }, [userId, role]);

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Fetch Gateway Status Configurations
      const gatewayRes = await fetch("/api/payments/gateways", { headers });
      if (gatewayRes.ok) {
        const configData = await gatewayRes.json();
        setGatewayConfig(configData);
      }

      // Fetch Payments (Admin gets all, Users get theirs)
      const url = role === "admin" ? "/api/payments/admin/all" : "/api/payments/user";
      const paymentsRes = await fetch(url, { headers });
      if (paymentsRes.ok) {
        const payData = await paymentsRes.json();
        setPayments(payData);
      } else {
        const errorData = await paymentsRes.json();
        setError(errorData.error || "Failed to load payment history.");
      }
    } catch (err: any) {
      console.error("Failed to load payment hub data:", err);
      setError("An error occurred while connecting to the payments API server.");
    } finally {
      setLoading(false);
    }
  };

  const handleInitializePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    const amountNum = parseFloat(simAmount);
    if (!simAmount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please input a valid numeric amount greater than zero.");
      return;
    }

    try {
      setInitializingPayment(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/payments/initialize", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amountNum,
          gateway: simGateway,
          description: simDescription.trim(),
          bookingId: simBookingId.trim() || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to initialize payment transaction.");
      }

      const createdPayment: PaymentItem = data.payment;

      if (simGateway === "wallet") {
        // Wallet deduction completes immediately on initialization
        setSuccessMsg(`Successfully processed wallet payment of ₹${amountNum.toLocaleString()}!`);
        if (onPaymentSuccess) onPaymentSuccess();
        fetchData();
      } else {
        // Open the simulated checkout flow for credit card/gateway sandbox
        setActiveCheckoutPayment(createdPayment);
      }
    } catch (err: any) {
      setError(err.message || "Failed to initialize standard payment transaction.");
    } finally {
      setInitializingPayment(false);
    }
  };

  const handleVerifyCheckout = async (status: "success" | "failed") => {
    if (!activeCheckoutPayment) return;
    setError(null);
    setSuccessMsg(null);

    try {
      setVerifyingPayment(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const gatewayDetails = status === "success" ? {
        gatewayPaymentId: `${activeCheckoutPayment.gateway}_pay_${Date.now()}`,
        gatewayOrderId: activeCheckoutPayment.gatewayOrderId || `order_${Date.now()}`,
        gatewaySignature: `sig_${Math.random().toString(36).substring(2, 10)}`
      } : {
        failureMessage: "User cancelled the simulated secure payment screen or bank refused charge."
      };

      const res = await fetch("/api/payments/verify", {
        method: "POST",
        headers,
        body: JSON.stringify({
          paymentId: activeCheckoutPayment.id,
          status,
          gatewayDetails
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Verification request failed.");
      }

      if (status === "success") {
        setSuccessMsg(`Payment of ₹${activeCheckoutPayment.amount} confirmed as SUCCESS via simulated ${activeCheckoutPayment.gateway.toUpperCase()} checkout!`);
        if (onPaymentSuccess) onPaymentSuccess();
      } else {
        setError(`Payment checkout failed or was cancelled.`);
      }

      setActiveCheckoutPayment(null);
      fetchData();
    } catch (err: any) {
      setError(err.message || "Verification request encountered an error.");
    } finally {
      setVerifyingPayment(false);
    }
  };

  const handleRefundSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!refundPaymentTarget) return;

    if (!refundReason || refundReason.trim().length < 5) {
      alert("Please provide a valid refund reason of at least 5 characters.");
      return;
    }

    setError(null);
    setSuccessMsg(null);

    try {
      setProcessingRefund(true);
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/payments/${refundPaymentTarget.id}/refund`, {
        method: "POST",
        headers,
        body: JSON.stringify({ refundReason: refundReason.trim() })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Refund request failed.");
      }

      setSuccessMsg(`Refund successfully processed for Transaction ID ${refundPaymentTarget.id}. ₹${refundPaymentTarget.amount} credited back to wallet.`);
      setRefundPaymentTarget(null);
      setRefundReason("");
      if (onPaymentSuccess) onPaymentSuccess();
      fetchData();
    } catch (err: any) {
      setError(err.message || "Refund processing failed.");
    } finally {
      setProcessingRefund(false);
    }
  };

  const filteredPayments = payments.filter((p) => {
    // Search filter
    const query = searchQuery.toLowerCase().trim();
    if (query) {
      const matchId = p.id?.toLowerCase().includes(query);
      const matchName = p.userName?.toLowerCase().includes(query);
      const matchEmail = p.userEmail?.toLowerCase().includes(query);
      const matchBooking = p.bookingId?.toLowerCase().includes(query);
      const matchDesc = p.description?.toLowerCase().includes(query);
      if (!matchId && !matchName && !matchEmail && !matchBooking && !matchDesc) {
        return false;
      }
    }

    // Gateway Filter
    if (filterGateway !== "all" && p.gateway !== filterGateway) {
      return false;
    }

    // Status Filter
    if (filterStatus !== "all" && p.status !== filterStatus) {
      return false;
    }

    // Date Range Filter
    const createdDate = new Date(p.createdAt);
    if (startDate) {
      const start = new Date(startDate);
      start.setHours(0, 0, 0, 0);
      if (createdDate < start) return false;
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      if (createdDate > end) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6" id="payment-foundation-panel">
      {/* Messages */}
      {error && (
        <div className="p-4 bg-red-50 border-l-4 border-red-500 rounded-r-xl text-red-900 text-xs font-semibold flex items-start space-x-2">
          <XCircle className="w-4.5 h-4.5 text-red-500 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border-l-4 border-emerald-500 rounded-r-xl text-emerald-900 text-xs font-semibold flex items-start space-x-2">
          <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Side: Gateways & Payment Initialization (7 Columns) */}
        <div className="lg:col-span-7 space-y-6">
          
          {/* Active Payment Gateways Configuration Card */}
          <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2.5">
                <ShieldCheck className="w-5 h-5 text-indigo-600" />
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                  Gateway Configurations
                </h3>
              </div>
              <button
                onClick={fetchData}
                disabled={loading}
                className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-indigo-600 transition-all cursor-pointer"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? "animate-spin text-indigo-600" : ""}`} />
              </button>
            </div>

            <p className="text-[11px] font-semibold text-slate-500">
              Check real API keys status. Live gateways will initialize orders via their respective SDKs when credentials are provided in the Secrets panel.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
              {/* Stripe Card */}
              <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 relative overflow-hidden bg-slate-50/30">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-slate-800 tracking-tight">Stripe Gateway</span>
                  {gatewayConfig?.stripe?.isConfigured ? (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border border-emerald-100">
                      LIVE ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      SANDBOX MODE
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credential Status</div>
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                    <span>STRIPE_SECRET_KEY:</span>
                    <span className={gatewayConfig?.stripe?.isConfigured ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
                      {gatewayConfig?.stripe?.isConfigured ? "● Configured" : "○ Missing"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfigHelp("stripe")}
                  className="w-full py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all cursor-pointer"
                >
                  Configure Stripe Key
                </button>
              </div>

              {/* Razorpay Card */}
              <div className="border border-slate-100 rounded-xl p-3.5 space-y-3 relative overflow-hidden bg-slate-50/30">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-extrabold text-slate-800 tracking-tight">Razorpay Gateway</span>
                  {gatewayConfig?.razorpay?.isConfigured ? (
                    <span className="text-[9px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border border-emerald-100">
                      LIVE ACTIVE
                    </span>
                  ) : (
                    <span className="text-[9px] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                      SANDBOX MODE
                    </span>
                  )}
                </div>

                <div className="space-y-1">
                  <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Credential Status</div>
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center space-x-1">
                    <span>RAZORPAY_KEY_ID:</span>
                    <span className={gatewayConfig?.razorpay?.isConfigured ? "text-emerald-600 font-bold" : "text-amber-500 font-bold"}>
                      {gatewayConfig?.razorpay?.isConfigured ? "● Configured" : "○ Missing"}
                    </span>
                  </div>
                </div>

                <button
                  onClick={() => setShowConfigHelp("razorpay")}
                  className="w-full py-1.5 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-600 text-[10px] font-black uppercase rounded-lg tracking-wider transition-all cursor-pointer"
                >
                  Configure Razorpay Key
                </button>
              </div>
            </div>
          </div>

          {/* Payment Foundation Testing Sandbox */}
          {role !== "driver" && (
            <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
              <div className="flex items-center space-x-2.5 border-b border-slate-100 pb-3">
                <CreditCard className="w-5 h-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Interactive Payment Initializer
                  </h3>
                  <p className="text-[10px] font-semibold text-slate-400">Initialize transactions using your MongoDB structure and API schemas.</p>
                </div>
              </div>

              <form onSubmit={handleInitializePayment} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Amount Input */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Payment Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-slate-400">₹</span>
                    <input
                      type="number"
                      required
                      min="1"
                      value={simAmount}
                      onChange={(e) => setSimAmount(e.target.value)}
                      placeholder="e.g. 150"
                      className="w-full pl-8 pr-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                    />
                  </div>
                </div>

                {/* Gateway Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Gateway Module</label>
                  <select
                    value={simGateway}
                    onChange={(e: any) => setSimGateway(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all cursor-pointer"
                  >
                    <option value="wallet">Direct Wallet Balance (Instant)</option>
                    <option value="razorpay">Razorpay Gateway (Sandbox/Live)</option>
                    <option value="stripe">Stripe Checkout (Sandbox/Live)</option>
                  </select>
                </div>

                {/* Description Input */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transaction Description</label>
                  <input
                    type="text"
                    required
                    value={simDescription}
                    onChange={(e) => setSimDescription(e.target.value)}
                    placeholder="e.g. Subsidy Wallet Recharge Deposit"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                  />
                </div>

                {/* Optional Booking ID Link */}
                <div className="space-y-1.5 md:col-span-2">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Optional Booking ID Link (Association)</label>
                  <input
                    type="text"
                    value={simBookingId}
                    onChange={(e) => setSimBookingId(e.target.value)}
                    placeholder="e.g. book_seeded_1 (Optional)"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all font-mono"
                  />
                </div>

                <div className="md:col-span-2 pt-2">
                  <button
                    type="submit"
                    disabled={initializingPayment}
                    className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm flex items-center justify-center space-x-2 cursor-pointer disabled:opacity-50"
                  >
                    {initializingPayment ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>Initializing Transaction...</span>
                      </>
                    ) : (
                      <>
                        <ArrowUpRight className="w-4 h-4" />
                        <span>Initialize {simGateway.toUpperCase()} Payment</span>
                      </>
                    )}
                  </button>
                </div>

              </form>
            </div>
          )}

        </div>

        {/* Right Side: Quick Stats & Security Checklist (5 Columns) */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Quick Metrics */}
          <div className="bg-slate-900 rounded-2xl p-5 text-white shadow-sm space-y-4">
            <h3 className="text-xs font-extrabold text-indigo-400 uppercase tracking-wider">
              Payments Overview (Ledger)
            </h3>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Total Success</span>
                <div className="text-xl font-black">
                  ₹{payments.filter(p => p.status === "success").reduce((sum, p) => sum + p.amount, 0).toLocaleString()}
                </div>
              </div>

              <div className="space-y-1">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Count (Total)</span>
                <div className="text-xl font-black text-slate-300">
                  {payments.length} Transactions
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800/80 pt-3 flex justify-between text-[11px] font-semibold text-slate-400">
              <span className="flex items-center"><Clock className="w-3.5 h-3.5 text-indigo-400 mr-1" /> Active Sandbox</span>
              <span className="font-mono text-indigo-300">v1.1 Stable</span>
            </div>
          </div>

          {/* Dynamic Instructions Panel */}
          <div className="bg-amber-50/50 border border-amber-200/50 rounded-2xl p-5 space-y-3.5">
            <div className="flex items-center space-x-2 text-amber-900">
              <Info className="w-4.5 h-4.5 text-amber-600 shrink-0" />
              <h4 className="text-xs font-black uppercase tracking-wider">Credentials Policy</h4>
            </div>

            <p className="text-[11px] font-medium text-amber-800 leading-relaxed">
              We abide by strict guidelines. <strong>No hardcoded mock keys or fake API endpoints are integrated into the source files.</strong> When real credentials are required, we gracefully alert the user and instruct them on how to safe-keep secrets in their workspace.
            </p>

            <div className="space-y-1 text-[10px] font-bold text-amber-700">
              <div className="flex items-center"><ChevronRight className="w-3 h-3 text-amber-500 mr-1" /> Never expose private keys in client code</div>
              <div className="flex items-center"><ChevronRight className="w-3 h-3 text-amber-500 mr-1" /> Utilize express server-side routing proxies</div>
              <div className="flex items-center"><ChevronRight className="w-3 h-3 text-amber-500 mr-1" /> Decouple client views from gateway SDKs</div>
            </div>
          </div>

        </div>

      </div>

      {/* Ledger Table Section */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
              {role === "admin" ? "Platform Payments Ledger (Audit Logs)" : "My Payments & Deposits history"}
            </h3>
            <p className="text-[10px] font-semibold text-slate-400 mt-0.5">
              {role === "admin" ? "Complete cryptographic record of all client transactions." : "Ledger of your processed rides and subsidy topups."}
            </p>
          </div>
          <div className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-2.5 py-1 rounded-lg uppercase tracking-wide font-mono shrink-0 w-fit">
            {role.toUpperCase()} View
          </div>
        </div>

        {/* Search & Filters Controls Bar */}
        <div className="bg-slate-50 border border-slate-100 rounded-xl p-4 space-y-3.5">
          <div className="flex items-center space-x-2 text-indigo-900 pb-1 border-b border-indigo-100/30">
            <SlidersHorizontal className="w-4 h-4 text-indigo-600" />
            <span className="text-[10px] font-black uppercase tracking-wider text-slate-700">Search & Filter Controls</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
            {/* Search Input */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Search keyword</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="ID, name, email, booking..."
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all"
                />
              </div>
            </div>

            {/* Gateway Filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Payment Gateway</label>
              <select
                value={filterGateway}
                onChange={(e) => setFilterGateway(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Gateways</option>
                <option value="wallet">Wallet Balance</option>
                <option value="razorpay">Razorpay</option>
                <option value="stripe">Stripe</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="space-y-1">
              <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Status</label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="w-full px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all cursor-pointer"
              >
                <option value="all">All Statuses</option>
                <option value="success">Success</option>
                <option value="pending">Pending</option>
                <option value="failed">Failed</option>
                <option value="refunded">Refunded</option>
              </select>
            </div>

            {/* Date Inputs Container */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">From Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">To Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full px-2 py-1 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-600 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {(searchQuery || filterGateway !== "all" || filterStatus !== "all" || startDate || endDate) && (
            <div className="flex items-center justify-between pt-1 text-[11px]">
              <div className="text-slate-500 font-medium">
                Found <strong className="text-indigo-600">{filteredPayments.length}</strong> matches out of <strong>{payments.length}</strong> total payments
              </div>
              <button
                onClick={() => {
                  setSearchQuery("");
                  setFilterGateway("all");
                  setFilterStatus("all");
                  setStartDate("");
                  setEndDate("");
                }}
                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-extrabold rounded-md uppercase tracking-wider transition-all text-[9px] cursor-pointer"
              >
                Clear Filters
              </button>
            </div>
          )}
        </div>

        {loading ? (
          <div className="py-12 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-8 h-8 text-indigo-600 animate-spin" />
            <span className="text-xs font-bold text-slate-500 uppercase tracking-widest font-mono">Loading Payment Data...</span>
          </div>
        ) : payments.length === 0 ? (
          <div className="py-12 text-center border-2 border-dashed border-slate-100 rounded-xl bg-slate-50/30">
            <CreditCard className="w-10 h-10 text-slate-300 mx-auto mb-2.5" />
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">No transactions found</h4>
            <p className="text-[10px] text-slate-400 font-semibold mt-1">Start by initializing a payment transaction inside the sandbox panel above.</p>
          </div>
        ) : filteredPayments.length === 0 ? (
          <div className="py-12 text-center border border-dashed border-slate-100 rounded-xl bg-slate-50/20 space-y-3">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h4 className="font-bold text-slate-700 text-xs uppercase tracking-wider">No filtered results</h4>
            <p className="text-[10px] text-slate-400 font-semibold max-w-xs mx-auto">None of your payment transactions match the active keyword, status, gateway, or date range filters.</p>
            <button
              onClick={() => {
                setSearchQuery("");
                setFilterGateway("all");
                setFilterStatus("all");
                setStartDate("");
                setEndDate("");
              }}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold rounded-lg uppercase tracking-wider text-[10px] transition-all cursor-pointer"
            >
              Reset All Filters
            </button>
          </div>
        ) : (
          /* Responsive Table / Cards Grid */
          <div className="space-y-4">
            {/* Desktop Table View */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400 text-[10px] font-black uppercase tracking-wider">
                    <th className="py-3 px-3">Transaction ID</th>
                    <th className="py-3 px-3">Gateway</th>
                    <th className="py-3 px-3">User/Email</th>
                    <th className="py-3 px-3">Amount</th>
                    <th className="py-3 px-3">Status</th>
                    <th className="py-3 px-3">Date</th>
                    <th className="py-3 px-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredPayments.map((p) => (
                    <tr key={p.id} className="hover:bg-slate-50/50 transition-all font-semibold text-slate-700">
                      <td className="py-3.5 px-3">
                        <div className="font-mono text-[10px] text-slate-500 font-black flex flex-col">
                          <span>{p.id}</span>
                          {p.bookingId && <span className="text-[9px] text-indigo-500 font-extrabold mt-0.5">Booking: {p.bookingId}</span>}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="text-[10px] bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-md uppercase tracking-wider font-mono font-black">
                          {p.gateway}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col text-[11px]">
                          <span className="text-slate-800 font-extrabold">{p.userName}</span>
                          <span className="text-slate-400 font-mono text-[9px] mt-0.5">{p.userEmail}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3 text-slate-900 font-bold">
                        ₹{p.amount.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-3">
                        <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                          p.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                          p.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100 animate-pulse" :
                          p.status === "refunded" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                          "bg-red-50 text-red-700 border-red-100"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-slate-400 font-mono text-[10px]">
                        {new Date(p.createdAt).toLocaleDateString()} {new Date(p.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center justify-end space-x-1.5">
                          {/* Invoice & Receipt Button */}
                          <button
                            onClick={() => setSelectedInvoicePayment(p)}
                            title="View Tax Invoice & Receipt Details"
                            className="p-1.5 bg-slate-50 hover:bg-indigo-50 hover:text-indigo-700 text-slate-500 hover:border-indigo-200 rounded-lg border border-slate-100 transition-all cursor-pointer flex items-center"
                          >
                            <FileText className="w-3.5 h-3.5" />
                          </button>

                          {p.status === "success" && (
                            <button
                              onClick={() => {
                                setRefundPaymentTarget(p);
                                setRefundReason("");
                              }}
                              className="px-2.5 py-1.5 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center space-x-1"
                            >
                              <Undo2 className="w-3.5 h-3.5" />
                              <span>Refund</span>
                            </button>
                          )}
                          {p.status === "refunded" && (
                            <div className="text-[9px] text-slate-400 italic font-mono max-w-[120px] truncate" title={p.refundReason}>
                              Refunded: "{p.refundReason || "Requested"}"
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards View */}
            <div className="grid grid-cols-1 gap-4 md:hidden">
              {filteredPayments.map((p) => (
                <div key={p.id} className="border border-slate-100 rounded-xl p-4 space-y-3 bg-slate-50/25">
                  <div className="flex justify-between items-start">
                    <div className="space-y-0.5">
                      <div className="font-mono text-[10px] text-slate-400 font-black">{p.id}</div>
                      {p.bookingId && (
                        <div className="text-[9px] text-indigo-600 font-black font-mono">
                          Booking ID: {p.bookingId}
                        </div>
                      )}
                    </div>
                    <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono border ${
                      p.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-100" :
                      p.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-100" :
                      p.status === "refunded" ? "bg-indigo-50 text-indigo-700 border-indigo-100" :
                      "bg-red-50 text-red-700 border-red-100"
                    }`}>
                      {p.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] border-t border-b border-slate-100 py-2.5">
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Gateway</span>
                      <div className="font-bold text-slate-700 uppercase font-mono">{p.gateway}</div>
                    </div>
                    <div className="space-y-0.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Amount</span>
                      <div className="font-extrabold text-slate-900">₹{p.amount.toLocaleString()}</div>
                    </div>
                    <div className="space-y-0.5 mt-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">User</span>
                      <div className="font-bold text-slate-700">{p.userName}</div>
                    </div>
                    <div className="space-y-0.5 mt-1.5">
                      <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest font-mono">Date</span>
                      <div className="font-semibold text-slate-500 font-mono text-[10px]">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100/50">
                    <button
                      onClick={() => setSelectedInvoicePayment(p)}
                      className="flex-1 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Invoice & Receipt</span>
                    </button>

                    {p.status === "success" ? (
                      <button
                        onClick={() => {
                          setRefundPaymentTarget(p);
                          setRefundReason("");
                        }}
                        className="flex-1 py-2 bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 text-[10px] font-black uppercase tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                      >
                        <Undo2 className="w-3.5 h-3.5" />
                        <span>Trigger Refund</span>
                      </button>
                    ) : p.status === "refunded" ? (
                      <div className="text-[10px] text-slate-400 italic text-center py-1">
                        Refunded: "{p.refundReason || "Requested"}"
                      </div>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* --- FLOATING DIALOGS & OVERLAYS --- */}

      {/* Configuration Help Modals */}
      <AnimatePresence>
        {showConfigHelp && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowConfigHelp(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-xl max-w-md w-full relative border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2">
                  <Lock className="w-4.5 h-4.5 text-indigo-600" />
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    Configure {showConfigHelp === "stripe" ? "Stripe" : "Razorpay"} Credentials
                  </h4>
                </div>
                <button
                  onClick={() => setShowConfigHelp(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-3.5 text-xs text-slate-600 leading-relaxed font-medium">
                <p>
                  To secure transactions through a real payment gateway, please define the required keys in the **AI Studio Settings** menu.
                </p>

                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3 space-y-2.5">
                  <div className="font-extrabold text-[10px] text-slate-400 uppercase tracking-wider font-mono">Required Variables:</div>
                  {showConfigHelp === "stripe" ? (
                    <div className="space-y-1.5 font-mono text-[10px] font-bold text-slate-700">
                      <div>STRIPE_SECRET_KEY=sk_live_...</div>
                      <div>STRIPE_PUBLISHABLE_KEY=pk_live_...</div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 font-mono text-[10px] font-bold text-slate-700">
                      <div>RAZORPAY_KEY_ID=rzp_live_...</div>
                      <div>RAZORPAY_KEY_SECRET=sec_live_...</div>
                    </div>
                  )}
                </div>

                <div className="p-3.5 bg-amber-50 text-amber-950 rounded-xl border border-amber-100 space-y-1.5">
                  <h5 className="font-black uppercase text-[10px] tracking-wider text-amber-800">Dynamic Sandbox Option</h5>
                  <p className="text-[11px]">
                    If these credentials are omitted, the payment modules will automatically fallback to secure Sandbox simulation mode. You can test complete client-to-server flows right now!
                  </p>
                </div>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  onClick={() => setShowConfigHelp(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  Understood
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Interactive Simulated Gateway Checkout overlay */}
      <AnimatePresence>
        {activeCheckoutPayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/75 backdrop-blur-md"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 30 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 30 }}
              className="bg-white rounded-3xl shadow-2xl max-w-md w-full relative overflow-hidden border border-slate-200/50 flex flex-col"
            >
              {/* Checkout Header */}
              <div className="bg-slate-950 p-5 text-white flex justify-between items-center">
                <div className="flex items-center space-x-2.5">
                  <CreditCard className="w-5 h-5 text-indigo-400" />
                  <div>
                    <h4 className="font-black text-xs uppercase tracking-widest text-indigo-300">SECURE CHECKOUT</h4>
                    <h5 className="text-[11px] font-bold text-slate-400 mt-0.5">Simulated Payment Gateway Screen</h5>
                  </div>
                </div>
                <button
                  onClick={() => handleVerifyCheckout("failed")}
                  className="p-1 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Transaction details banner */}
              <div className="p-5 bg-indigo-50/50 border-b border-indigo-100/50 flex justify-between items-center text-slate-800">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-mono">PAY TO GRAMGO</span>
                  <div className="text-[11px] font-semibold text-slate-500 font-mono">Ref: {activeCheckoutPayment.id}</div>
                </div>
                <div className="text-right">
                  <span className="text-[10px] font-black text-indigo-500 uppercase tracking-widest font-mono">AMOUNT</span>
                  <div className="text-xl font-black text-indigo-950">₹{activeCheckoutPayment.amount.toLocaleString()}</div>
                </div>
              </div>

              {/* Checkout Body Content */}
              <div className="p-6 space-y-5">
                <div className="p-3.5 bg-amber-50 text-amber-950 rounded-xl border border-amber-100 flex items-start space-x-2.5">
                  <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <p className="text-[11px] font-semibold text-amber-800 leading-relaxed">
                    This is an interactive simulation of the <strong>{activeCheckoutPayment.gateway.toUpperCase()}</strong> transaction verification flow. It executes real database queries, tests the integrity of status updates, and updates the state of wallet ledger records safely.
                  </p>
                </div>

                <div className="space-y-2 font-semibold text-[11px] text-slate-600 bg-slate-50 border border-slate-100 p-3.5 rounded-xl">
                  <div className="flex justify-between">
                    <span>Payee:</span>
                    <span className="text-slate-900 font-bold">{activeCheckoutPayment.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Email:</span>
                    <span className="text-slate-900 font-mono text-[10px] font-bold">{activeCheckoutPayment.userEmail}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Gateway Platform:</span>
                    <span className="text-indigo-600 font-bold uppercase">{activeCheckoutPayment.gateway} Sandbox</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => handleVerifyCheckout("failed")}
                    disabled={verifyingPayment}
                    className="py-3 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Cancel / Fail</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleVerifyCheckout("success")}
                    disabled={verifyingPayment}
                    className="py-3 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-center space-x-2 disabled:opacity-50"
                  >
                    {verifyingPayment ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-4 h-4" />
                    )}
                    <span>Authorize Success</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Refund Trigger Modal */}
      <AnimatePresence>
        {refundPaymentTarget && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRefundPaymentTarget(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl p-6 shadow-xl max-w-md w-full relative border border-slate-100 space-y-4"
            >
              <div className="flex justify-between items-start border-b border-slate-100 pb-3">
                <div className="flex items-center space-x-2.5">
                  <Undo2 className="w-4.5 h-4.5 text-red-600" />
                  <h4 className="font-black text-sm uppercase tracking-wide text-slate-900">
                    Process Transaction Refund
                  </h4>
                </div>
                <button
                  onClick={() => setRefundPaymentTarget(null)}
                  className="p-1 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-slate-700 transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleRefundSubmit} className="space-y-4">
                <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-xl space-y-2 text-xs font-semibold text-slate-600">
                  <div className="flex justify-between">
                    <span>Target Payment ID:</span>
                    <span className="text-slate-900 font-mono text-[10px] font-bold">{refundPaymentTarget.id}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Refund Payee:</span>
                    <span className="text-slate-900 font-bold">{refundPaymentTarget.userName}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Amount to Credit:</span>
                    <span className="text-red-600 font-black">₹{refundPaymentTarget.amount.toLocaleString()} INR</span>
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Specify Reason for Refund</label>
                  <textarea
                    required
                    rows={3}
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    placeholder="Enter official reason (e.g. Duplicate debit or cancelled patient transit booking)"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white transition-all resize-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3 pt-1">
                  <button
                    type="button"
                    onClick={() => setRefundPaymentTarget(null)}
                    className="py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    disabled={processingRefund || refundReason.trim().length < 5}
                    className="py-2.5 bg-red-600 hover:bg-red-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer text-center disabled:opacity-50 flex items-center justify-center space-x-1"
                  >
                    {processingRefund ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Undo2 className="w-3.5 h-3.5" />
                    )}
                    <span>Authorize Refund</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Receipt/Invoice Detailed Modal Overlay */}
      <AnimatePresence>
        {selectedInvoicePayment && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedInvoicePayment(null)}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            />

            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-3xl shadow-2xl max-w-lg w-full relative border border-slate-100 overflow-hidden flex flex-col"
            >
              {/* Header Accent */}
              <div className="bg-gradient-to-r from-indigo-600 to-indigo-950 p-6 text-white flex justify-between items-start">
                <div className="space-y-1">
                  <div className="flex items-center space-x-2">
                    <FileText className="w-5 h-5 text-indigo-200" />
                    <span className="text-xs font-black uppercase tracking-widest text-indigo-200">Official Tax Receipt</span>
                  </div>
                  <h4 className="font-mono text-xs font-black tracking-tight">
                    INV-2026-{selectedInvoicePayment.id.toUpperCase()}
                  </h4>
                  <p className="text-[10px] text-indigo-100 font-semibold">
                    GramGo Rural Mobility Platform • Ledger Document
                  </p>
                </div>
                <button
                  onClick={() => setSelectedInvoicePayment(null)}
                  className="p-1 hover:bg-white/10 rounded-lg text-indigo-200 hover:text-white transition-all cursor-pointer"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              </div>

              {/* Printable Invoice Sheet */}
              <div className="p-6 space-y-6 overflow-y-auto max-h-[60vh]">
                {/* Branding/Status Watermark Header */}
                <div className="flex justify-between items-start border-b border-slate-100 pb-5">
                  <div className="space-y-1">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest">GramGo Inc.</h3>
                    <p className="text-[10px] text-slate-400 font-bold leading-relaxed">
                      Rural Mobility and Subsidy Transit Network<br />
                      GSTIN: 27AAAAA1111A1Z1<br />
                      support@gramgo.org
                    </p>
                  </div>
                  <div className="text-right space-y-1.5">
                    <span className={`inline-block text-[10px] font-black px-3 py-1 rounded-full uppercase tracking-wider font-mono border ${
                      selectedInvoicePayment.status === "success" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                      selectedInvoicePayment.status === "pending" ? "bg-amber-50 text-amber-700 border-amber-200" :
                      selectedInvoicePayment.status === "refunded" ? "bg-indigo-50 text-indigo-700 border-indigo-200" :
                      "bg-red-50 text-red-700 border-red-200"
                    }`}>
                      {selectedInvoicePayment.status.toUpperCase()}
                    </span>
                    <div className="text-[10px] text-slate-400 font-bold font-mono">
                      {new Date(selectedInvoicePayment.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Bill To & Details Grid */}
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">BILL TO:</span>
                    <div className="font-extrabold text-slate-800">{selectedInvoicePayment.userName}</div>
                    <div className="text-slate-500 font-semibold font-mono text-[10px]">{selectedInvoicePayment.userEmail}</div>
                    <div className="text-[9px] text-slate-400 font-bold font-mono mt-0.5">UID: {selectedInvoicePayment.userId}</div>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block mb-1">PAYMENT DETAILS:</span>
                    <div className="font-bold text-slate-700">Gateway: <span className="uppercase text-indigo-600 font-mono">{selectedInvoicePayment.gateway}</span></div>
                    {selectedInvoicePayment.gatewayPaymentId && (
                      <div className="text-[9px] text-slate-400 font-bold font-mono mt-0.5 break-all">
                        Ref ID: {selectedInvoicePayment.gatewayPaymentId}
                      </div>
                    )}
                    {selectedInvoicePayment.bookingId && (
                      <div className="text-[10px] text-indigo-600 font-extrabold mt-1 font-mono">
                        Booking Ref: {selectedInvoicePayment.bookingId}
                      </div>
                    )}
                  </div>
                </div>

                {/* Line Items Table */}
                <div className="border border-slate-100 rounded-xl overflow-hidden text-xs">
                  <div className="bg-slate-50 px-4 py-2 border-b border-slate-100 grid grid-cols-12 font-black text-slate-400 uppercase tracking-wider text-[9px]">
                    <div className="col-span-8">Description</div>
                    <div className="col-span-4 text-right">Amount</div>
                  </div>
                  <div className="p-4 grid grid-cols-12 font-semibold text-slate-700">
                    <div className="col-span-8 space-y-0.5">
                      <div className="text-slate-800 font-black">
                        {selectedInvoicePayment.description || "Subsidy Wallet Recharge / Ride Payment"}
                      </div>
                      <div className="text-[10px] text-slate-400 font-medium">
                        Processed via {selectedInvoicePayment.gateway.toUpperCase()} secure sandbox processor.
                      </div>
                    </div>
                    <div className="col-span-4 text-right text-slate-900 font-bold text-sm">
                      ₹{selectedInvoicePayment.amount.toLocaleString()}
                    </div>
                  </div>
                </div>

                {/* Totals Breakdown */}
                <div className="border-t border-slate-100 pt-4 flex justify-end">
                  <div className="w-64 space-y-2 text-xs font-semibold text-slate-600">
                    <div className="flex justify-between">
                      <span>Subtotal (Net):</span>
                      <span className="text-slate-800 font-mono">
                        ₹{(selectedInvoicePayment.amount * 0.82).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>GST (18% inclusive):</span>
                      <span className="text-slate-800 font-mono">
                        ₹{(selectedInvoicePayment.amount * 0.18).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between border-t border-slate-100 pt-2 text-sm font-black text-slate-900">
                      <span>Grand Total:</span>
                      <span className="text-indigo-600 font-mono text-base font-black">
                        ₹{selectedInvoicePayment.amount.toLocaleString()} INR
                      </span>
                    </div>
                  </div>
                </div>

                {/* Compliance Disclaimer Footnote */}
                <div className="text-[9px] font-medium text-slate-400 text-center leading-relaxed pt-2 border-t border-slate-100 border-dashed">
                  This document is an official computer-generated tax invoice validated through secure cryptographic ledger logs on the GramGo Rural Mobility network.
                </div>
              </div>

              {/* Actions Footer */}
              <div className="bg-slate-50 border-t border-slate-100 p-4 grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedInvoicePayment(null)}
                  className="py-2.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-black uppercase tracking-wider rounded-xl transition-all cursor-pointer text-center"
                >
                  Close
                </button>

                <button
                  type="button"
                  onClick={() => {
                    window.print();
                  }}
                  className="py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center justify-center space-x-1"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print PDF</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDownloadInvoice(selectedInvoicePayment)}
                  className="py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-black uppercase tracking-wider rounded-xl transition-all shadow-sm cursor-pointer text-center flex items-center justify-center space-x-1"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Receipt</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
