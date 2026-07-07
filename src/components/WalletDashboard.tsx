import React, { useState, useEffect } from "react";
import {
  Wallet,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Lock,
  Plus,
  History,
  ShieldCheck,
  AlertCircle,
  CreditCard,
  CheckCircle2,
  X,
  Info,
  ChevronLeft,
  ChevronRight,
  Filter,
  CheckCircle,
  AlertTriangle,
  RefreshCw,
  TrendingUp,
  Tag,
  Zap
} from "lucide-react";

interface WalletData {
  id: string;
  userId: string;
  balance: number;
  currency: string;
  status: "active" | "frozen" | "closed";
  createdAt: string;
  updatedAt: string;
}

interface TransactionItem {
  id: string;
  walletId: string;
  userId: string;
  amount: number;
  type: "credit" | "debit" | "refund" | "adjustment";
  status: "completed" | "pending" | "failed";
  description: string;
  createdAt: string;
}

interface WalletDashboardProps {
  userId: string;
  token: string | null;
  role: "passenger" | "driver" | "admin";
}

export default function WalletDashboard({ userId, token, role }: WalletDashboardProps) {
  // Wallet state
  const [wallet, setWallet] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Pagination & Filter States
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [txLoading, setTxLoading] = useState(false);
  const [totalTxCount, setTotalTxCount] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [limit, setLimit] = useState(5);
  const [totalPages, setTotalPages] = useState(1);
  
  const [filterType, setFilterType] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");

  // Transaction Form States
  const [amountInput, setAmountInput] = useState("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit" | "refund" | "adjustment">("credit");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [executingTx, setExecutingTx] = useState(false);

  // Recharge State
  const [dashboardTab, setDashboardTab] = useState<"recharge" | "manual">("recharge");
  const [rechargeAmount, setRechargeAmount] = useState<string>("");
  const [rechargePreset, setRechargePreset] = useState<number | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"stripe" | "razorpay">("stripe");
  const [liveGateway, setLiveGateway] = useState<boolean>(false);
  const [recharging, setRecharging] = useState<boolean>(false);
  const [showCredsAlert, setShowCredsAlert] = useState<{ gateway: string; message: string } | null>(null);

  // Handle Recharge Form submission
  const handleRecharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);
    setShowCredsAlert(null);

    const amountNum = parseFloat(rechargeAmount);
    if (!rechargeAmount || isNaN(amountNum) || amountNum <= 0) {
      setError("Please input a valid numeric amount greater than ₹0.");
      return;
    }

    // Recharge validation rules
    if (amountNum < 50) {
      setError("Minimum recharge amount is ₹50.");
      return;
    }
    if (amountNum > 50000) {
      setError("Maximum single recharge limit is ₹50,000.");
      return;
    }

    if (wallet && wallet.status !== "active") {
      setError("Recharge blocked. Your subsidy wallet is currently frozen or inactive.");
      return;
    }

    try {
      setRecharging(true);

      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/wallet/recharge", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amountNum,
          method: paymentMethod,
          useLiveGateway: liveGateway
        })
      });

      const data = await res.json();

      if (!res.ok) {
        if (data.error === "CREDENTIALS_REQUIRED") {
          setShowCredsAlert({
            gateway: data.gateway,
            message: data.message
          });
          setError(`Credentials required for Live ${data.gateway} Gateway.`);
        } else {
          setError(data.error || "Failed to process wallet recharge.");
        }
        return;
      }

      setWallet(data.wallet);
      setSuccessMsg(
        `Successfully recharged ₹${amountNum.toLocaleString()} to your wallet via ${
          liveGateway ? `Live ${paymentMethod.toUpperCase()}` : "Simulated Sandbox"
        }!`
      );
      setRechargeAmount("");
      setRechargePreset(null);
      
      // Refresh transactions ledger
      fetchTransactionLogs(1);
    } catch (err: any) {
      console.error("Recharge failed:", err);
      setError(err.message || "An error occurred during wallet recharge.");
    } finally {
      setRecharging(false);
    }
  };

  // Fetch Wallet Summary
  const fetchWalletDetails = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const endpoint = role === "admin" ? `/api/wallet/admin/${userId}` : "/api/wallet";
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(endpoint, { headers });
      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Failed to load subsidy wallet.");
      }

      const data: WalletData = await res.json();
      setWallet(data);
    } catch (err: any) {
      console.error("Wallet loading error:", err);
      setError(err.message || "An unexpected error occurred while loading wallet.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Transactions List (Paginated & Filtered)
  const fetchTransactionLogs = async (pageToFetch = currentPage) => {
    try {
      setTxLoading(true);
      
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      // Admin or User endpoint
      const baseEndpoint = "/api/wallet/transactions";
      const params = new URLSearchParams({
        page: pageToFetch.toString(),
        limit: limit.toString(),
        type: filterType,
        status: filterStatus
      });

      const res = await fetch(`${baseEndpoint}?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to load historical ledger records.");
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotalTxCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
    } catch (err: any) {
      console.error("Transactions loading error:", err);
    } finally {
      setTxLoading(false);
    }
  };

  // Reload everything
  const reloadAll = async () => {
    await fetchWalletDetails();
    await fetchTransactionLogs(1);
  };

  useEffect(() => {
    if (userId) {
      reloadAll();
    }
  }, [userId, role, filterType, filterStatus, limit]);

  // Execute Transaction Handler
  const handleExecuteTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amountInput || isNaN(Number(amountInput)) || Number(amountInput) <= 0) {
      setError("Please input a valid numeric amount greater than ₹0.");
      return;
    }

    const value = parseFloat(amountInput);
    if (transactionType === "debit" && wallet && wallet.balance < value) {
      setError(`Insufficient funds. Your wallet balance is ₹${wallet.balance.toLocaleString()}.`);
      return;
    }

    try {
      setExecutingTx(true);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const purpose = transactionPurpose.trim() || `Manual ${transactionType.toUpperCase()} Transfer`;

      const res = await fetch("/api/wallet/transaction", {
        method: "PUT",
        headers,
        body: JSON.stringify({
          amount: value,
          type: transactionType,
          description: purpose
        })
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || "Transaction declined by system.");
      }

      const data = await res.json();
      setWallet(data.wallet);
      setSuccessMsg(`Secure wallet ${transactionType} of ₹${value.toLocaleString()} completed successfully.`);
      
      // Reset Form fields
      setAmountInput("");
      setTransactionPurpose("");
      
      // Refresh transaction logs on first page
      fetchTransactionLogs(1);
    } catch (err: any) {
      setError(err.message || "Failed to execute transaction.");
    } finally {
      setExecutingTx(false);
    }
  };

  // Toggle Wallet active/frozen status (Admin mode only)
  const toggleWalletStatusAdmin = async () => {
    if (role !== "admin" || !wallet) return;
    try {
      setExecutingTx(true);
      const nextStatus = wallet.status === "active" ? "frozen" : "active";
      
      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/wallet/admin/${userId}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ status: nextStatus })
      });

      if (res.ok) {
        const data = await res.json();
        setWallet(data.wallet);
        setSuccessMsg(`Wallet status updated to ${nextStatus}.`);
      } else {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to toggle status.");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setExecutingTx(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-white p-8 rounded-2xl border border-slate-100 shadow-sm flex flex-col items-center justify-center space-y-4 min-h-[350px]" id="wallet-loading">
        <Coins className="w-12 h-12 text-orange-500 animate-spin" />
        <p className="text-slate-500 font-bold text-sm tracking-wide">Syncing Secure Grant Ledger...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6" id="wallet-dashboard-core">
      
      {/* Alert Banners */}
      {error && (
        <div className="p-4 bg-rose-50 border border-rose-100 rounded-xl flex items-start space-x-3 text-rose-850" id="wallet-err">
          <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h5 className="font-bold text-sm">System Warning</h5>
            <p className="text-xs font-semibold text-rose-600 mt-0.5">{error}</p>
          </div>
          <button onClick={() => setError(null)} className="text-rose-400 hover:text-rose-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {successMsg && (
        <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-xl flex items-start space-x-3 text-emerald-850 animate-fade-in" id="wallet-success">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="flex-grow">
            <h5 className="font-bold text-sm">Transaction Complete</h5>
            <p className="text-xs font-semibold text-emerald-600 mt-0.5">{successMsg}</p>
          </div>
          <button onClick={() => setSuccessMsg(null)} className="text-emerald-400 hover:text-emerald-600 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Grid Layout - Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="wallet-cards-grid">
        
        {/* Glamorous Balance card */}
        <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white p-6 rounded-2xl shadow-xl border border-slate-750 flex flex-col justify-between relative overflow-hidden" id="wallet-card">
          <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full blur-2xl pointer-events-none" />
          <div className="absolute -bottom-8 -left-8 w-24 h-24 bg-slate-500/10 rounded-full blur-xl pointer-events-none" />

          <div>
            <div className="flex justify-between items-start">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase tracking-wider text-orange-400 font-mono">GramGo Rural Subsidy Fund</span>
                <h3 className="text-xl font-bold tracking-tight">Active Micro-Wallet</h3>
              </div>
              <button 
                onClick={reloadAll}
                className="p-2.5 bg-white/10 rounded-xl border border-white/10 backdrop-blur-sm hover:bg-white/20 transition-all cursor-pointer"
                title="Refresh Ledger"
              >
                <RefreshCw className="w-4 h-4 text-orange-400" />
              </button>
            </div>

            <div className="mt-8 space-y-1">
              <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Available Balance</p>
              <div className="flex items-baseline space-x-2">
                <span className="text-4xl font-extrabold tracking-tight">
                  ₹{wallet ? wallet.balance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : "0.00"}
                </span>
                <span className="text-sm font-black text-orange-400 font-mono">{wallet?.currency || "INR"}</span>
              </div>
            </div>
          </div>

          <div className="mt-10 pt-4 border-t border-slate-800/80 flex justify-between items-center text-xs">
            <div className="space-y-0.5">
              <span className="text-slate-400 font-black block text-[9px] uppercase tracking-wider font-mono">Wallet Serial ID</span>
              <span className="font-mono text-slate-300 font-bold">{wallet?.id || "N/A"}</span>
            </div>
            
            <div className="text-right space-y-1">
              <span className="text-slate-400 font-black block text-[9px] uppercase tracking-wider font-mono">Security Status</span>
              {wallet?.status === "active" ? (
                <span className="px-2.5 py-0.5 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full font-black uppercase tracking-widest text-[9px]">
                  ● SECURE
                </span>
              ) : (
                <span className="px-2.5 py-0.5 bg-rose-500/10 text-rose-400 border border-rose-500/20 rounded-full font-black uppercase tracking-widest text-[9px]">
                  ❄ FROZEN
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Security Trust Info Card */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="wallet-info">
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-emerald-600" />
              <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Panchayat Trust Protocol</h4>
            </div>
            
            <p className="text-xs text-slate-500 font-medium leading-relaxed">
              Your wallet is protected by GramGo's multi-tier offline security and digital ledger logs. All credits, debits, refunds, and adjustments are fully verified and compliant with village healthcare policy guidelines.
            </p>

            <div className="grid grid-cols-2 gap-4 pt-2">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Wallet Status</span>
                <span className="text-sm font-bold text-slate-800 capitalize mt-1 block">
                  {wallet?.status || "Active"}
                </span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100/50">
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Est. Credit Speed</span>
                <span className="text-sm font-bold text-emerald-600 mt-1 block">Instant (P2P)</span>
              </div>
            </div>
          </div>

          {/* Admin Command Override Panel */}
          {role === "admin" && (
            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between" id="admin-controls">
              <div className="flex items-center space-x-1.5 text-orange-600">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span className="text-[10px] font-bold uppercase tracking-wider">Admin Command Center</span>
              </div>
              <button
                onClick={toggleWalletStatusAdmin}
                disabled={executingTx}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                  wallet?.status === "active"
                    ? "bg-rose-50 text-rose-700 hover:bg-rose-100"
                    : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                }`}
              >
                {wallet?.status === "active" ? "Freeze Wallet" : "Activate Wallet"}
              </button>
            </div>
          )}
        </div>

      </div>

      {/* Advanced transaction Terminal & Paginated Ledger logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="wallet-ledger-section">
        
        {/* Transaction & Recharge Terminal Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-4" id="transaction-recharge-container">
          
          {/* Elegant Tab Headers */}
          <div className="bg-slate-100/80 p-1.5 rounded-2xl grid grid-cols-2 gap-2 border border-slate-200/50">
            <button
              onClick={() => { setDashboardTab("recharge"); setError(null); setSuccessMsg(null); }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                dashboardTab === "recharge"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
              <span>Wallet Recharge</span>
            </button>
            <button
              onClick={() => { setDashboardTab("manual"); setError(null); setSuccessMsg(null); }}
              className={`py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1.5 ${
                dashboardTab === "manual"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Manual Sandbox</span>
            </button>
          </div>

          {/* Tab 1: Wallet Instant Recharge */}
          {dashboardTab === "recharge" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5" id="recharge-form-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Instant Recharge</h4>
                </div>
                <span className="text-[10px] bg-orange-500/10 text-orange-700 font-black px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  {liveGateway ? "LIVE" : "SANDBOX"}
                </span>
              </div>

              {/* Dynamic Credentials Required Warning */}
              {showCredsAlert && (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl space-y-2.5 text-amber-900 animate-fade-in" id="creds-alert">
                  <div className="flex items-start space-x-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-bold text-xs uppercase tracking-wider">Live Credentials Required</h5>
                      <p className="text-[11px] font-semibold text-amber-700 mt-1">
                        {showCredsAlert.message}
                      </p>
                    </div>
                  </div>
                  <div className="pt-2 border-t border-amber-200/50 flex justify-between items-center gap-2">
                    <span className="text-[10px] font-bold text-amber-600 uppercase font-mono">Need a quick test?</span>
                    <button
                      type="button"
                      onClick={() => {
                        setLiveGateway(false);
                        setShowCredsAlert(null);
                        setError(null);
                      }}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-black uppercase rounded-lg transition-all cursor-pointer shadow-sm"
                    >
                      Switch to Sandbox Mode
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleRecharge} className="space-y-4">
                
                {/* Custom Amount input field */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Recharge Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      placeholder="Enter custom amount"
                      step="1"
                      value={rechargeAmount}
                      onChange={(e) => {
                        setRechargeAmount(e.target.value);
                        setRechargePreset(null);
                        setShowCredsAlert(null);
                      }}
                      disabled={recharging || wallet?.status !== "active"}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-extrabold text-slate-800"
                    />
                  </div>
                  {/* Immediate Validation Messages */}
                  {rechargeAmount && (
                    <div className="text-[10px] font-bold">
                      {parseFloat(rechargeAmount) < 50 ? (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Min recharge is ₹50
                        </span>
                      ) : parseFloat(rechargeAmount) > 50000 ? (
                        <span className="text-rose-500 flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Max limit is ₹50,000
                        </span>
                      ) : (
                        <span className="text-emerald-600 flex items-center gap-1">
                          <CheckCircle className="w-3 h-3" /> Valid amount for transfer
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Quick Recharge presets */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Quick Recharge Presets</span>
                  <div className="grid grid-cols-4 gap-2">
                    {[100, 500, 1000, 2000].map((preset) => {
                      const isSelected = rechargePreset === preset || parseFloat(rechargeAmount) === preset;
                      return (
                        <button
                          key={preset}
                          type="button"
                          onClick={() => {
                            setRechargeAmount(preset.toString());
                            setRechargePreset(preset);
                            setShowCredsAlert(null);
                          }}
                          disabled={recharging || wallet?.status !== "active"}
                          className={`py-2 rounded-xl text-xs font-extrabold tracking-tight transition-all cursor-pointer border ${
                            isSelected
                              ? "bg-orange-600 text-white border-orange-600 shadow-md shadow-orange-100"
                              : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300"
                          }`}
                        >
                          ₹{preset}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Live vs Sandbox Toggle */}
                <div className="space-y-1.5">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Processing Engine</span>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => { setLiveGateway(false); setShowCredsAlert(null); }}
                      className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between h-16 cursor-pointer ${
                        !liveGateway
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block">Sandbox Simulation</span>
                      <span className={`text-[9px] font-bold ${!liveGateway ? "text-orange-400" : "text-slate-400"}`}>Instant Demo Mode</span>
                    </button>
                    
                    <button
                      type="button"
                      onClick={() => { setLiveGateway(true); setShowCredsAlert(null); }}
                      className={`p-2.5 rounded-xl border transition-all text-left flex flex-col justify-between h-16 cursor-pointer ${
                        liveGateway
                          ? "bg-slate-900 text-white border-slate-900 shadow-sm"
                          : "bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block">Production Gateway</span>
                      <span className={`text-[9px] font-bold ${liveGateway ? "text-orange-400" : "text-slate-400"}`}>Stripe / Razorpay API</span>
                    </button>
                  </div>
                </div>

                {/* Gateway Provider Selection (Visible if Live Gateway selected) */}
                {liveGateway && (
                  <div className="space-y-1.5 animate-fade-in">
                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Select Gateway Provider</span>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod("stripe"); setShowCredsAlert(null); }}
                        className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer border ${
                          paymentMethod === "stripe"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-300 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Stripe Live Pay
                      </button>
                      <button
                        type="button"
                        onClick={() => { setPaymentMethod("razorpay"); setShowCredsAlert(null); }}
                        className={`py-2 rounded-xl text-xs font-black tracking-wider transition-all cursor-pointer border ${
                          paymentMethod === "razorpay"
                            ? "bg-blue-50 text-blue-700 border-blue-300 shadow-sm"
                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                        }`}
                      >
                        Razorpay Live Pay
                      </button>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={recharging || wallet?.status !== "active" || !rechargeAmount || parseFloat(rechargeAmount) < 50 || parseFloat(rechargeAmount) > 50000}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    wallet?.status !== "active" || !rechargeAmount || parseFloat(rechargeAmount) < 50 || parseFloat(rechargeAmount) > 50000
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : "bg-orange-600 hover:bg-orange-700 text-white shadow-lg shadow-orange-100 hover:scale-[1.01]"
                  }`}
                >
                  <span>{recharging ? "Contacting Payment Gateway..." : "Proceed to Secure Pay"}</span>
                </button>
              </form>
            </div>
          )}

          {/* Tab 2: Perform Manual Transaction (Original simulation sandbox form) */}
          {dashboardTab === "manual" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="manual-form-panel">
              <div className="flex items-center space-x-2">
                <CreditCard className="w-5 h-5 text-slate-500" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Perform Transaction</h4>
              </div>

              <form onSubmit={handleExecuteTransaction} className="space-y-4">
                
                {/* Multi-Type Tab Selector */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transaction Type</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-xl" id="type-selector">
                    <button
                      type="button"
                      onClick={() => setTransactionType("credit")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        transactionType === "credit"
                          ? "bg-white text-emerald-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Credit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType("debit")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        transactionType === "debit"
                          ? "bg-white text-rose-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Debit
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType("refund")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        transactionType === "refund"
                          ? "bg-white text-blue-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Refund
                    </button>
                    <button
                      type="button"
                      onClick={() => setTransactionType("adjustment")}
                      className={`py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        transactionType === "adjustment"
                          ? "bg-white text-amber-700 shadow-sm"
                          : "text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      Adjustment
                    </button>
                  </div>
                </div>

                {/* Input Amount */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-extrabold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      placeholder="0.00"
                      step="0.01"
                      value={amountInput}
                      onChange={(e) => setAmountInput(e.target.value)}
                      disabled={executingTx || wallet?.status !== "active"}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-bold"
                    />
                  </div>
                </div>

                {/* Input Purpose Description */}
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Transaction Purpose / Memo</label>
                  <input
                    type="text"
                    placeholder={
                      transactionType === "credit" ? "e.g., Bank self deposit, Subsidy Claim" :
                      transactionType === "debit" ? "e.g., Fuel top-up, Road charge" :
                      transactionType === "refund" ? "e.g., Refund for aborted ride #231" :
                      "e.g., Manual administrative adjustment"
                    }
                    value={transactionPurpose}
                    onChange={(e) => setTransactionPurpose(e.target.value)}
                    disabled={executingTx || wallet?.status !== "active"}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-semibold text-slate-800"
                  />
                </div>

                <button
                  type="submit"
                  disabled={executingTx || wallet?.status !== "active" || !amountInput}
                  className={`w-full py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    wallet?.status !== "active" || !amountInput
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed"
                      : transactionType === "credit"
                        ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-md shadow-emerald-100"
                        : transactionType === "debit"
                          ? "bg-rose-600 text-white hover:bg-rose-700 shadow-md shadow-rose-100"
                          : transactionType === "refund"
                            ? "bg-blue-600 text-white hover:bg-blue-700 shadow-md shadow-blue-100"
                            : "bg-amber-600 text-white hover:bg-amber-700 shadow-md shadow-amber-100"
                  }`}
                >
                  <span>{executingTx ? "Executing Secure Transfer..." : `Process ${transactionType}`}</span>
                </button>
              </form>
            </div>
          )}

        </div>

        {/* Paginated Historical Ledger & Filters */}
        <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="historical-ledger">
          <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-4">
              <div className="flex items-center space-x-2">
                <History className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Historical Ledger</h4>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                  {totalTxCount} Logs Found
                </span>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl mb-4 border border-slate-100" id="filter-panel">
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Filter Type</span>
                <select
                  value={filterType}
                  onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:outline-none"
                >
                  <option value="all">All Types</option>
                  <option value="credit">Credit</option>
                  <option value="debit">Debit</option>
                  <option value="refund">Refund</option>
                  <option value="adjustment">Adjustment</option>
                </select>
              </div>
              
              <div className="space-y-1">
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Filter Status</span>
                <select
                  value={filterStatus}
                  onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                  className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:outline-none"
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">Completed</option>
                  <option value="pending">Pending</option>
                  <option value="failed">Failed</option>
                </select>
              </div>
            </div>

            {/* Ledger List */}
            <div className="space-y-3 max-h-[340px] overflow-y-auto pr-1">
              {txLoading ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <RefreshCw className="w-8 h-8 mb-2 stroke-1 animate-spin text-orange-500" />
                  <p className="text-xs font-semibold">Updating ledger entries...</p>
                </div>
              ) : transactions.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                  <Coins className="w-10 h-10 mb-2 stroke-1" />
                  <p className="text-xs font-bold text-slate-400">No matching transactions found.</p>
                  <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Adjust filters or run a simulation to verify entries.</p>
                </div>
              ) : (
                transactions.map((tx) => {
                  const isCreditType = tx.type === "credit" || tx.type === "refund";
                  const isAdjustment = tx.type === "adjustment";
                  
                  return (
                    <div
                      key={tx.id}
                      className="flex items-center justify-between p-3.5 bg-slate-50 hover:bg-slate-100/50 rounded-xl border border-slate-100/30 transition-all"
                    >
                      <div className="flex items-center space-x-3 min-w-0">
                        <div className={`p-2 rounded-xl shrink-0 ${
                          isAdjustment ? "bg-amber-50 text-amber-600" :
                          isCreditType ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
                        }`}>
                          {tx.type === "credit" && <ArrowDownLeft className="w-4 h-4" />}
                          {tx.type === "debit" && <ArrowUpRight className="w-4 h-4" />}
                          {tx.type === "refund" && <CheckCircle className="w-4 h-4" />}
                          {tx.type === "adjustment" && <TrendingUp className="w-4 h-4" />}
                        </div>
                        <div className="space-y-0.5 min-w-0">
                          <span className="text-xs font-black text-slate-800 block truncate leading-tight">
                            {tx.description}
                          </span>
                          <div className="flex items-center gap-2 text-[10px] text-slate-400 font-bold font-mono">
                            <span className="truncate max-w-[100px]" title={tx.id}>{tx.id}</span>
                            <span>•</span>
                            <span>{new Date(tx.createdAt).toLocaleDateString()} {new Date(tx.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right space-y-1 shrink-0 ml-3">
                        <span className={`text-sm font-extrabold block font-mono ${
                          isAdjustment ? "text-amber-600" :
                          isCreditType ? "text-emerald-600" : "text-rose-600"
                        }`}>
                          {isCreditType ? "+" : "-"}₹{tx.amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                        
                        <div className="flex justify-end">
                          {tx.status === "completed" && (
                            <span className="px-1.5 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded text-[8px] font-black uppercase tracking-wider">
                              COMPLETED
                            </span>
                          )}
                          {tx.status === "pending" && (
                            <span className="px-1.5 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded text-[8px] font-black uppercase tracking-wider">
                              PENDING
                            </span>
                          )}
                          {tx.status === "failed" && (
                            <span className="px-1.5 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded text-[8px] font-black uppercase tracking-wider">
                              FAILED
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Pagination Controls */}
          {totalPages > 1 && (
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between" id="pagination-controls">
              <span className="text-[10px] text-slate-500 font-bold">
                Page {currentPage} of {totalPages}
              </span>
              
              <div className="flex items-center space-x-1.5">
                <button
                  disabled={currentPage <= 1 || txLoading}
                  onClick={() => fetchTransactionLogs(currentPage - 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((pg) => (
                  <button
                    key={pg}
                    disabled={txLoading}
                    onClick={() => fetchTransactionLogs(pg)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      currentPage === pg
                        ? "bg-orange-600 text-white shadow-sm"
                        : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
                    }`}
                  >
                    {pg}
                  </button>
                ))}

                <button
                  disabled={currentPage >= totalPages || txLoading}
                  onClick={() => fetchTransactionLogs(currentPage + 1)}
                  className="p-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
