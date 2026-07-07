import React, { useState, useEffect } from "react";
import PaymentHub from "./PaymentHub";
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
  Zap,
  Search,
  Download,
  Calendar
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
  const [filterSearch, setFilterSearch] = useState<string>("");
  const [filterStartDate, setFilterStartDate] = useState<string>("");
  const [filterEndDate, setFilterEndDate] = useState<string>("");
  const [openingBalance, setOpeningBalance] = useState<number>(0);
  const [closingBalance, setClosingBalance] = useState<number>(0);

  // Transaction Form States
  const [amountInput, setAmountInput] = useState("");
  const [transactionType, setTransactionType] = useState<"credit" | "debit" | "refund" | "adjustment">("credit");
  const [transactionPurpose, setTransactionPurpose] = useState("");
  const [executingTx, setExecutingTx] = useState(false);

  // Recharge State
  const [dashboardTab, setDashboardTab] = useState<"recharge" | "manual" | "refund_request" | "refund_history" | "admin_refunds" | "withdraw" | "withdraw_history" | "admin_withdrawals" | "payment_hub">(
    role === "admin" 
      ? "admin_refunds" 
      : role === "driver" 
        ? "withdraw" 
        : "recharge"
  );
  const [rechargeAmount, setRechargeAmount] = useState<string>("");

  // Driver Earnings & Withdrawal States
  interface EarningsStats {
    availableBalance: number;
    pendingSettlement: number;
    completedSettlement: number;
    totalEarnings: number;
    currency: string;
  }

  interface WithdrawalItem {
    id: string;
    userId: string;
    userName: string;
    walletId: string;
    transactionId?: string;
    amount: number;
    status: "pending" | "completed" | "rejected";
    paymentMethod: "UPI" | "Bank Transfer";
    paymentDetails: {
      upiId?: string;
      bankName?: string;
      accountNumber?: string;
      ifscCode?: string;
      beneficiaryName?: string;
    };
    adminNotes?: string;
    createdAt: string;
    resolvedAt?: string;
  }

  const [earningsStats, setEarningsStats] = useState<EarningsStats | null>(null);
  const [withdrawals, setWithdrawals] = useState<WithdrawalItem[]>([]);
  const [withdrawalsLoading, setWithdrawalsLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawPaymentMethod, setWithdrawPaymentMethod] = useState<"UPI" | "Bank Transfer">("UPI");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [beneficiaryName, setBeneficiaryName] = useState("");
  const [submittingWithdrawal, setSubmittingWithdrawal] = useState(false);

  // Admin Withdrawals Decision States
  const [adminWithdrawals, setAdminWithdrawals] = useState<WithdrawalItem[]>([]);
  const [adminWithdrawalsLoading, setAdminWithdrawalsLoading] = useState(false);
  const [processingWithdrawalId, setProcessingWithdrawalId] = useState<string | null>(null);
  const [adminWithdrawalNotes, setAdminWithdrawalNotes] = useState<{ [key: string]: string }>({});

  // Refund System States
  interface RefundRequestItem {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    walletId: string;
    transactionId?: string;
    amount: number;
    reason: string;
    status: "pending" | "approved" | "rejected";
    adminNotes?: string;
    createdAt: string;
    resolvedAt?: string;
  }

  const [refunds, setRefunds] = useState<RefundRequestItem[]>([]);
  const [refundsLoading, setRefundsLoading] = useState(false);
  
  // Refund request form states
  const [refundAmount, setRefundAmount] = useState("");
  const [refundReason, setRefundReason] = useState("");
  const [selectedTxId, setSelectedTxId] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  // Admin decision state
  const [adminNotesText, setAdminNotesText] = useState<{ [key: string]: string }>({});
  const [processingRefundId, setProcessingRefundId] = useState<string | null>(null);
  const [adminRefundFilter, setAdminRefundFilter] = useState<"all" | "pending" | "approved" | "rejected">("all");
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

      if (filterSearch) params.append("search", filterSearch);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await fetch(`${baseEndpoint}?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to load historical ledger records.");
      }

      const data = await res.json();
      setTransactions(data.transactions || []);
      setTotalTxCount(data.total || 0);
      setTotalPages(data.totalPages || 1);
      setCurrentPage(data.page || 1);
      setOpeningBalance(data.openingBalance ?? 0);
      setClosingBalance(data.closingBalance ?? 0);
    } catch (err: any) {
      console.error("Transactions loading error:", err);
    } finally {
      setTxLoading(false);
    }
  };

  // Fetch user or admin refund list
  const fetchRefundRequests = async () => {
    try {
      setRefundsLoading(true);
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      
      const endpoint = role === "admin" ? "/api/wallet/admin/refunds" : "/api/wallet/refunds";
      const res = await fetch(endpoint, { headers });
      if (res.ok) {
        const data = await res.json();
        setRefunds(data);
      }
    } catch (err) {
      console.error("Failed to load refunds:", err);
    } finally {
      setRefundsLoading(false);
    }
  };

  // Submit refund request
  const handleRequestRefund = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(refundAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please input a valid refund amount.");
      return;
    }
    if (!refundReason || refundReason.trim().length < 10) {
      setError("Please specify a reason of at least 10 characters.");
      return;
    }

    try {
      setSubmittingRefund(true);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/wallet/refunds", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amountNum,
          reason: refundReason.trim(),
          transactionId: selectedTxId || undefined
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit refund request.");
      }

      setSuccessMsg("Refund request submitted successfully for administrative review.");
      setRefundAmount("");
      setRefundReason("");
      setSelectedTxId("");
      
      // Refresh refunds & transactions list
      fetchRefundRequests();
      fetchTransactionLogs(1);
    } catch (err: any) {
      setError(err.message || "An error occurred.");
    } finally {
      setSubmittingRefund(false);
    }
  };

  // Admin decision function
  const handleAdminDecision = async (id: string, decision: "approved" | "rejected") => {
    const notes = adminNotesText[id] || "";
    if (!notes || notes.trim().length < 5) {
      setError("Administrative review notes must be at least 5 characters.");
      return;
    }

    try {
      setProcessingRefundId(id);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/wallet/admin/refunds/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          decision,
          adminNotes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process decision.");
      }

      setSuccessMsg(`Refund request has been successfully ${decision}!`);
      setAdminNotesText(prev => {
        const copy = { ...prev };
        delete copy[id];
        return copy;
      });

      // Refresh data
      await fetchRefundRequests();
      await reloadAll(); // reload balance & txs
    } catch (err: any) {
      setError(err.message || "Failed to update refund.");
    } finally {
      setProcessingRefundId(null);
    }
  };

  // Download CSV statement of transactions
  const handleDownloadStatement = async () => {
    try {
      setTxLoading(true);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = {
        "Content-Type": "application/json"
      };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const params = new URLSearchParams({
        page: "1",
        limit: "1000", // Export up to 1000 matching items
        type: filterType,
        status: filterStatus
      });

      if (filterSearch) params.append("search", filterSearch);
      if (filterStartDate) params.append("startDate", filterStartDate);
      if (filterEndDate) params.append("endDate", filterEndDate);

      const res = await fetch(`/api/wallet/transactions?${params.toString()}`, { headers });
      if (!res.ok) {
        throw new Error("Failed to fetch historical ledger records for download.");
      }

      const data = await res.json();
      const txsToExport = data.transactions || [];

      if (txsToExport.length === 0) {
        setError("No transactions found matching current filters to download.");
        return;
      }

      // Reconstruct running balance or use precalculated ones
      const csvHeaders = [
        "Transaction ID",
        "Date",
        "Time",
        "Description",
        "Type",
        "Status",
        "Amount (INR)",
        "Running Balance (INR)"
      ];

      const csvRows = txsToExport.map((tx: any) => {
        const dateObj = new Date(tx.createdAt);
        const dateStr = dateObj.toLocaleDateString();
        const timeStr = dateObj.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
        return [
          tx.id,
          dateStr,
          timeStr,
          `"${(tx.description || "").replace(/"/g, '""')}"`,
          (tx.type || "").toUpperCase(),
          (tx.status || "").toUpperCase(),
          tx.amount,
          tx.runningBalance ?? "N/A"
        ].join(",");
      });

      const csvContent = [
        `GramGo Rural Subsidy Fund Statement`,
        `Account ID,${wallet?.id || userId}`,
        `Generated At,${new Date().toLocaleString()}`,
        `Period Opening Balance,INR ${data.openingBalance ?? 0}`,
        `Period Closing Balance,INR ${data.closingBalance ?? 0}`,
        ``,
        csvHeaders.join(","),
        ...csvRows
      ].join("\n");

      // Download trigger
      const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `GramGo_Statement_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = "hidden";
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setSuccessMsg("GramGo Subsidy Ledger Statement downloaded successfully!");
    } catch (err: any) {
      console.error("Statement download failed:", err);
      setError(err.message || "Failed to download statement.");
    } finally {
      setTxLoading(false);
    }
  };

  // Fetch driver stats (available, pending, completed settlements, total earnings)
  const fetchDriverStats = async () => {
    try {
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/wallet/withdraw/stats", { headers });
      if (res.ok) {
        const data = await res.json();
        setEarningsStats(data);
      }
    } catch (err) {
      console.error("Failed to load driver stats:", err);
    }
  };

  // Fetch driver's individual withdrawals list
  const fetchDriverWithdrawals = async () => {
    try {
      setWithdrawalsLoading(true);
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/wallet/withdraw", { headers });
      if (res.ok) {
        const data = await res.json();
        setWithdrawals(data);
      }
    } catch (err) {
      console.error("Failed to load driver withdrawals:", err);
    } finally {
      setWithdrawalsLoading(false);
    }
  };

  // Fetch all drivers' withdrawals (Admin only)
  const fetchAdminWithdrawals = async () => {
    try {
      setAdminWithdrawalsLoading(true);
      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }
      const res = await fetch("/api/wallet/admin/withdrawals", { headers });
      if (res.ok) {
        const data = await res.json();
        setAdminWithdrawals(data);
      }
    } catch (err) {
      console.error("Failed to load admin withdrawals:", err);
    } finally {
      setAdminWithdrawalsLoading(false);
    }
  };

  // Request withdrawal from driver wallet
  const handleRequestWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(withdrawAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      setError("Please input a valid withdrawal amount.");
      return;
    }
    if (amountNum < 100) {
      setError("Minimum withdrawal amount is ₹100.");
      return;
    }
    if (amountNum > 50000) {
      setError("Maximum single withdrawal limit is ₹50,000.");
      return;
    }
    if (wallet && wallet.balance < amountNum) {
      setError(`Insufficient balance. Your available balance is ₹${wallet.balance.toLocaleString()}.`);
      return;
    }

    if (withdrawPaymentMethod === "UPI" && !upiId.trim()) {
      setError("Please input a valid UPI ID (e.g., ramesh@ybl).");
      return;
    }

    if (withdrawPaymentMethod === "Bank Transfer" && (!bankName.trim() || !accountNumber.trim() || !ifscCode.trim())) {
      setError("Please fill in all bank account details (Bank Name, Account Number, IFSC).");
      return;
    }

    try {
      setSubmittingWithdrawal(true);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch("/api/wallet/withdraw", {
        method: "POST",
        headers,
        body: JSON.stringify({
          amount: amountNum,
          paymentMethod: withdrawPaymentMethod,
          paymentDetails: {
            upiId: withdrawPaymentMethod === "UPI" ? upiId : undefined,
            bankName: withdrawPaymentMethod === "Bank Transfer" ? bankName : undefined,
            accountNumber: withdrawPaymentMethod === "Bank Transfer" ? accountNumber : undefined,
            ifscCode: withdrawPaymentMethod === "Bank Transfer" ? ifscCode : undefined,
            beneficiaryName: beneficiaryName || undefined
          }
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || data.message || "Failed to submit withdrawal request.");
      }

      setSuccessMsg(`Withdrawal request of ₹${amountNum.toLocaleString()} submitted successfully!`);
      setWithdrawAmount("");
      setUpiId("");
      setBankName("");
      setAccountNumber("");
      setIfscCode("");
      setBeneficiaryName("");
      
      await reloadAll();
    } catch (err: any) {
      console.error("Withdrawal submission failed:", err);
      setError(err.message || "Failed to submit withdrawal request.");
    } finally {
      setSubmittingWithdrawal(false);
    }
  };

  // Process a withdrawal request (Admin only)
  const handleProcessWithdrawalAdmin = async (id: string, status: "completed" | "rejected") => {
    try {
      setProcessingWithdrawalId(id);
      setError(null);
      setSuccessMsg(null);

      const headers: HeadersInit = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const res = await fetch(`/api/wallet/admin/withdrawals/${id}`, {
        method: "PUT",
        headers,
        body: JSON.stringify({
          status,
          adminNotes: adminWithdrawalNotes[id] || ""
        })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to process withdrawal request.");
      }

      setSuccessMsg(`Withdrawal request successfully ${status === "completed" ? "completed" : "rejected"}!`);
      setAdminWithdrawalNotes(prev => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      await reloadAll();
    } catch (err: any) {
      console.error("Processing withdrawal failed:", err);
      setError(err.message || "Failed to process withdrawal request.");
    } finally {
      setProcessingWithdrawalId(null);
    }
  };

  // Reload everything
  const reloadAll = async () => {
    await fetchWalletDetails();
    await fetchTransactionLogs(1);
    await fetchRefundRequests();
    if (role === "driver" || role === "admin") {
      await fetchDriverStats();
      await fetchDriverWithdrawals();
    }
    if (role === "admin") {
      await fetchAdminWithdrawals();
    }
  };

  useEffect(() => {
    if (userId) {
      reloadAll();
    }
  }, [userId, role, filterType, filterStatus, limit, filterSearch, filterStartDate, filterEndDate]);

  useEffect(() => {
    setDashboardTab(
      role === "admin"
        ? "admin_refunds"
        : role === "driver"
          ? "withdraw"
          : "recharge"
    );
  }, [role]);

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
      {role === "driver" && earningsStats ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4" id="wallet-cards-grid">
          {/* Card 1: Available Balance */}
          <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-orange-950 text-white p-5 rounded-2xl shadow-xl border border-slate-750 flex flex-col justify-between relative overflow-hidden" id="wallet-card">
            <div className="absolute top-0 right-0 w-24 h-24 bg-orange-500/10 rounded-full blur-xl pointer-events-none" />
            <div>
              <div className="flex justify-between items-start">
                <span className="text-[9px] font-black uppercase tracking-wider text-orange-400 font-mono">Available Balance</span>
                <button 
                  onClick={reloadAll}
                  className="p-1.5 bg-white/10 rounded-lg hover:bg-white/20 transition-all cursor-pointer"
                  title="Refresh Balance"
                >
                  <RefreshCw className="w-3 h-3 text-orange-400" />
                </button>
              </div>
              <div className="mt-4">
                <span className="text-3xl font-extrabold tracking-tight">
                  ₹{earningsStats.availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
                <span className="text-xs font-black text-orange-400 font-mono ml-1">{earningsStats.currency}</span>
              </div>
            </div>
            <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
              <span className="font-mono">Wallet: {wallet?.id ? `${wallet.id.slice(0, 8)}...` : "Active"}</span>
              <span className="px-1.5 py-0.5 bg-emerald-500/10 text-emerald-400 rounded border border-emerald-500/20 font-black text-[8px]">● SECURE</span>
            </div>
          </div>

          {/* Card 2: Driver Earnings */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="total-earnings-card">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Driver Earnings</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  ₹{earningsStats.totalEarnings.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-600 rounded-xl">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-slate-500 font-bold">
              Lifetime rural subsidy transit payouts.
            </p>
          </div>

          {/* Card 3: Pending Settlement */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="pending-settlement-card">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Pending Settlement</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  ₹{earningsStats.pendingSettlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <div className="p-2 bg-amber-50 text-amber-600 rounded-xl">
                  <History className="w-4 h-4 animate-pulse" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-amber-600 font-bold">
              Funds in process to UPI/Bank account.
            </p>
          </div>

          {/* Card 4: Completed Settlement */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between" id="completed-settlement-card">
            <div>
              <span className="text-[9px] font-black uppercase tracking-wider text-slate-400 block font-mono">Completed Settlement</span>
              <div className="mt-4 flex items-center justify-between">
                <span className="text-3xl font-extrabold text-slate-900 tracking-tight">
                  ₹{earningsStats.completedSettlement.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                </span>
                <div className="p-2 bg-slate-50 text-slate-600 rounded-xl">
                  <ShieldCheck className="w-4 h-4" />
                </div>
              </div>
            </div>
            <p className="mt-4 text-[10px] text-emerald-600 font-bold">
              Successfully disbursed bank settlements.
            </p>
          </div>
        </div>
      ) : (
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
      )}

      {/* Advanced transaction Terminal & Paginated Ledger logs */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6" id="wallet-ledger-section">
        
        {/* Transaction & Recharge Terminal Panel */}
        <div className="lg:col-span-5 flex flex-col space-y-4" id="transaction-recharge-container">
          
          {/* Elegant Tab Headers */}
          <div className="bg-slate-100/80 p-1.5 rounded-2xl flex flex-wrap gap-1.5 border border-slate-200/50">
            {role === "passenger" && (
              <>
                <button
                  onClick={() => { setDashboardTab("recharge"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "recharge"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>Recharge</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("refund_request"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "refund_request"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                  <span>Request Refund</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("refund_history"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "refund_history"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Refund Status</span>
                </button>
              </>
            )}

            {role === "driver" && (
              <>
                <button
                  onClick={() => { setDashboardTab("withdraw"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[110px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "withdraw"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <Zap className="w-3.5 h-3.5 text-orange-500 fill-orange-500" />
                  <span>Withdraw</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("withdraw_history"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[110px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "withdraw_history"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Withdraw Logs</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("refund_request"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[110px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "refund_request"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <AlertCircle className="w-3.5 h-3.5 text-orange-500" />
                  <span>Claim Subsidy</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("refund_history"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[110px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "refund_history"
                      ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <History className="w-3.5 h-3.5 text-slate-500" />
                  <span>Claim Logs</span>
                </button>
              </>
            )}

            {role === "admin" && (
              <>
                <button
                  onClick={() => { setDashboardTab("admin_refunds"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[120px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "admin_refunds"
                      ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
                  <span>Refund approvals</span>
                </button>

                <button
                  onClick={() => { setDashboardTab("admin_withdrawals"); setError(null); setSuccessMsg(null); }}
                  className={`flex-1 min-w-[120px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                    dashboardTab === "admin_withdrawals"
                      ? "bg-slate-900 text-white shadow-sm border border-slate-900"
                      : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
                  }`}
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-orange-500" />
                  <span>Withdrawals</span>
                </button>
              </>
            )}

            <button
              onClick={() => { setDashboardTab("manual"); setError(null); setSuccessMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                dashboardTab === "manual"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
              }`}
            >
              <CreditCard className="w-3.5 h-3.5 text-slate-500" />
              <span>Sandbox</span>
            </button>

            <button
              onClick={() => { setDashboardTab("payment_hub"); setError(null); setSuccessMsg(null); }}
              className={`flex-1 min-w-[100px] py-2 rounded-xl text-[10px] sm:text-xs font-black uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center space-x-1 ${
                dashboardTab === "payment_hub"
                  ? "bg-white text-slate-900 shadow-sm border border-slate-200/20"
                  : "text-slate-500 hover:text-slate-800 hover:bg-white/30"
              }`}
            >
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-500 font-extrabold" />
              <span>Payments</span>
            </button>
          </div>

          {/* Tab: Driver Withdrawal */}
          {dashboardTab === "withdraw" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5" id="withdraw-form-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Coins className="w-5 h-5 text-orange-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide font-sans">Withdraw Balance</h4>
                </div>
                <span className="text-[10px] bg-orange-500/10 text-orange-700 font-black px-2 py-0.5 rounded-full uppercase tracking-widest font-mono">
                  P2P SETTLEMENT
                </span>
              </div>

              <form onSubmit={handleRequestWithdrawal} className="space-y-4">
                {/* Available Balance Preview */}
                <div className="p-4 bg-slate-50 border border-slate-100/80 rounded-xl flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block font-mono">Available for Cashout</span>
                    <span className="text-xl font-extrabold text-slate-900 font-sans">
                      ₹{earningsStats ? earningsStats.availableBalance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : (wallet ? wallet.balance.toLocaleString("en-IN", { minimumFractionDigits: 2 }) : "0.00")}
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-emerald-100 text-emerald-800 text-[9px] font-bold uppercase rounded-lg">Verified Balance</span>
                </div>

                {/* Amount to Withdraw */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">Withdrawal Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount to withdraw (Min ₹100)"
                      step="1"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      disabled={submittingWithdrawal || wallet?.status !== "active"}
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-extrabold text-slate-800 font-mono"
                    />
                  </div>
                  <span className="text-[9px] text-slate-400 font-semibold block mt-1">Limits: Min ₹100, Max ₹50,000 per transaction.</span>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">Select Transfer Destination</label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setWithdrawPaymentMethod("UPI")}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-18 transition-all cursor-pointer ${
                        withdrawPaymentMethod === "UPI"
                          ? "bg-slate-950 text-white border-slate-950 shadow-md"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block font-mono">UPI Mobile ID</span>
                      <span className="text-[11px] font-bold">BHIM / GPay / PhonePe</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setWithdrawPaymentMethod("Bank Transfer")}
                      className={`p-3 rounded-xl border text-left flex flex-col justify-between h-18 transition-all cursor-pointer ${
                        withdrawPaymentMethod === "Bank Transfer"
                          ? "bg-slate-950 text-white border-slate-950 shadow-md"
                          : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      <span className="text-[10px] font-black uppercase tracking-wider block font-mono">Direct Bank A/C</span>
                      <span className="text-[11px] font-bold">IMPS / NEFT Settlement</span>
                    </button>
                  </div>
                </div>

                {/* Dynamic Payment Details Inputs */}
                {withdrawPaymentMethod === "UPI" ? (
                  <div className="space-y-1.5 animate-fade-in">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">UPI Virtual Private Address</label>
                    <input
                      type="text"
                      placeholder="e.g. drivername@upi"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      disabled={submittingWithdrawal}
                      className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-bold text-slate-800 font-mono"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 animate-fade-in">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">Bank Name</label>
                      <input
                        type="text"
                        placeholder="e.g. State Bank of India"
                        value={bankName}
                        onChange={(e) => setBankName(e.target.value)}
                        disabled={submittingWithdrawal}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-slate-800"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">Account Number</label>
                        <input
                          type="text"
                          placeholder="Bank Account No."
                          value={accountNumber}
                          onChange={(e) => setAccountNumber(e.target.value)}
                          disabled={submittingWithdrawal}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-slate-800 font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">IFSC Code</label>
                        <input
                          type="text"
                          placeholder="e.g. SBIN0001234"
                          value={ifscCode}
                          onChange={(e) => setIfscCode(e.target.value)}
                          disabled={submittingWithdrawal}
                          className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-slate-800 font-mono uppercase"
                        />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block font-mono">Beneficiary / Account Holder Name</label>
                      <input
                        type="text"
                        placeholder="Name exactly as in Passbook"
                        value={beneficiaryName}
                        onChange={(e) => setBeneficiaryName(e.target.value)}
                        disabled={submittingWithdrawal}
                        className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-slate-800"
                      />
                    </div>
                  </div>
                )}

                {/* Submit Cashout Button */}
                <button
                  type="submit"
                  disabled={submittingWithdrawal || wallet?.status !== "active" || !withdrawAmount}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 text-white font-black uppercase text-xs tracking-wider rounded-xl transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center space-x-2 shadow-md"
                >
                  {submittingWithdrawal ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Processing Settlement...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-orange-400 fill-orange-400" />
                      <span>Initiate Direct Withdrawal</span>
                    </>
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Tab: Driver Withdrawal History */}
          {dashboardTab === "withdraw_history" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="withdrawals-log-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-slate-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide font-sans">Withdrawal History</h4>
                </div>
                <span className="text-[9px] bg-slate-100 text-slate-500 font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  {withdrawals.length} REQUESTS
                </span>
              </div>

              {/* Withdrawals List */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 font-sans">
                {withdrawalsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <RefreshCw className="w-7 h-7 mb-2 animate-spin text-orange-500" />
                    <p className="text-xs font-semibold">Updating settlement history...</p>
                  </div>
                ) : withdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    <Coins className="w-10 h-10 mb-2 stroke-1" />
                    <p className="text-xs font-bold text-slate-400">No withdrawals requested yet.</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Withdraw some of your active driver earnings to get started.</p>
                  </div>
                ) : (
                  withdrawals.map((req) => (
                    <div
                      key={req.id}
                      className="p-3.5 bg-slate-50 hover:bg-slate-100/30 rounded-xl border border-slate-100/50 space-y-2.5 transition-all text-left"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-[11px] font-black text-slate-800 font-mono">REQ ID: {req.id}</span>
                          <span className="text-[9px] text-slate-400 block font-semibold font-mono">
                            {new Date(req.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <span className="text-sm font-black font-mono text-slate-800">
                          -₹{req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-slate-200/40 flex justify-between items-center text-[10px]">
                        <div className="text-slate-500 font-bold">
                          Destination: <span className="font-semibold text-slate-700">{req.paymentMethod} {req.paymentMethod === "UPI" ? `(${req.paymentDetails.upiId})` : `(...${req.paymentDetails.accountNumber?.slice(-4)})`}</span>
                        </div>
                        <div>
                          {req.status === "pending" && (
                            <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded font-black text-[8px] uppercase">
                              PENDING SETTLEMENT
                            </span>
                          )}
                          {req.status === "completed" && (
                            <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded font-black text-[8px] uppercase">
                              SETTLED / DISBURSED
                            </span>
                          )}
                          {req.status === "rejected" && (
                            <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded font-black text-[8px] uppercase">
                              REJECTED / FAILING
                            </span>
                          )}
                        </div>
                      </div>

                      {req.adminNotes && (
                        <div className="p-2 bg-slate-100 rounded-lg text-[9px] font-semibold text-slate-600 border border-slate-200/50">
                          <span className="font-bold text-slate-500">Remarks:</span> {req.adminNotes}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Tab: Admin Withdrawal Approvals */}
          {dashboardTab === "admin_withdrawals" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="admin-withdrawals-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-orange-600" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide font-sans">Withdrawal Approvals</h4>
                </div>
                <span className="text-[9px] bg-slate-900 text-white font-black px-2 py-0.5 rounded-full uppercase tracking-wider font-mono">
                  {adminWithdrawals.length} SYSTEM TOTAL
                </span>
              </div>

              {/* Admin list of withdrawals */}
              <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 text-sans">
                {adminWithdrawalsLoading ? (
                  <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                    <RefreshCw className="w-7 h-7 mb-2 animate-spin text-orange-500" />
                    <p className="text-xs font-semibold">Updating drivers' withdrawal logs...</p>
                  </div>
                ) : adminWithdrawals.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-slate-400 border border-dashed border-slate-200 rounded-2xl">
                    <Coins className="w-10 h-10 mb-2 stroke-1" />
                    <p className="text-xs font-bold text-slate-400">No system withdrawals found.</p>
                    <p className="text-[10px] text-slate-400 font-semibold mt-0.5">Any driver cashout request will populate in this queue.</p>
                  </div>
                ) : (
                  adminWithdrawals.map((req) => (
                    <div
                      key={req.id}
                      className="p-4 bg-slate-50 border border-slate-200/50 rounded-xl space-y-3 text-left transition-all"
                    >
                      <div className="flex justify-between items-start">
                        <div className="space-y-0.5">
                          <span className="text-xs font-black text-slate-900 block font-sans">{req.userName}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">DRIVER ID: {req.userId} • REQ: {req.id}</span>
                          <span className="text-[9px] text-slate-400 block font-mono">Created: {new Date(req.createdAt).toLocaleString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black font-mono text-slate-900">
                            ₹{req.amount.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                          </span>
                          <div className="mt-1">
                            {req.status === "pending" && (
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-600 border border-amber-100 rounded font-black text-[8px] uppercase font-mono">
                                PENDING ACTION
                              </span>
                            )}
                            {req.status === "completed" && (
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 border border-emerald-100 rounded font-black text-[8px] uppercase font-mono">
                                COMPLETED
                              </span>
                            )}
                            {req.status === "rejected" && (
                              <span className="px-2 py-0.5 bg-rose-50 text-rose-600 border border-rose-100 rounded font-black text-[8px] uppercase font-mono">
                                REJECTED
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Payment Destination Detail Info */}
                      <div className="p-3 bg-slate-100/50 rounded-lg border border-slate-200/30 text-xs space-y-1.5">
                        <span className="text-[9px] font-black uppercase text-slate-400 tracking-wider block font-mono">Payment Destination ({req.paymentMethod})</span>
                        {req.paymentMethod === "UPI" ? (
                          <div className="font-mono text-slate-700 font-bold text-xs truncate">
                            UPI ID: <span className="text-orange-600 select-all">{req.paymentDetails.upiId}</span>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2 text-[11px] font-semibold text-slate-700 leading-tight">
                            <div>Bank: <span className="font-mono text-slate-950 font-bold block truncate">{req.paymentDetails.bankName}</span></div>
                            <div>IFSC: <span className="font-mono text-slate-950 font-bold block select-all">{req.paymentDetails.ifscCode}</span></div>
                            <div className="col-span-2">A/C No: <span className="font-mono text-slate-950 font-bold block select-all">{req.paymentDetails.accountNumber}</span></div>
                            <div className="col-span-2">Beneficiary: <span className="font-bold text-slate-950 block">{req.paymentDetails.beneficiaryName}</span></div>
                          </div>
                        )}
                      </div>

                      {req.status === "pending" ? (
                        <div className="space-y-2 pt-1 border-t border-slate-200/30">
                          <input
                            type="text"
                            placeholder="Add administrative remarks (e.g. Tx Ref Number, UPI transaction index)..."
                            value={adminWithdrawalNotes[req.id] || ""}
                            onChange={(e) => {
                              const text = e.target.value;
                              setAdminWithdrawalNotes(prev => ({ ...prev, [req.id]: text }));
                            }}
                            className="w-full px-3 py-2 bg-white border border-slate-200 focus:outline-none focus:border-orange-500 rounded-lg text-xs font-semibold text-slate-800 placeholder-slate-400"
                          />
                          <div className="flex gap-2">
                            <button
                              type="button"
                              disabled={processingWithdrawalId === req.id}
                              onClick={() => handleProcessWithdrawalAdmin(req.id, "completed")}
                              className="flex-grow py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-black uppercase text-[10px] tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Approve & Disburse</span>
                            </button>
                            <button
                              type="button"
                              disabled={processingWithdrawalId === req.id}
                              onClick={() => handleProcessWithdrawalAdmin(req.id, "rejected")}
                              className="flex-grow py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-black uppercase text-[10px] tracking-wider rounded-lg transition-all cursor-pointer flex items-center justify-center space-x-1"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span>Deny Cashout</span>
                            </button>
                          </div>
                        </div>
                      ) : (
                        req.adminNotes && (
                          <div className="p-2 bg-slate-100 rounded-lg text-[9px] font-semibold text-slate-600 border border-slate-200/50">
                            <span className="font-bold text-slate-500">Remarks:</span> {req.adminNotes}
                          </div>
                        )
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

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

          {/* Tab: Request a Refund */}
          {dashboardTab === "refund_request" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-5" id="refund-request-panel">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-5 h-5 text-orange-500" />
                <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">File Refund Request</h4>
              </div>

              <p className="text-xs text-slate-500 font-medium leading-relaxed">
                Need a refund for a transaction discrepancy or cancelled transport ride? File a formal request for review by the GramGo Panchayat administrative panel.
              </p>

              <form onSubmit={handleRequestRefund} className="space-y-4">
                {/* Select Transaction (Optional) */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Associate with Transaction (Optional)</label>
                  <select
                    value={selectedTxId}
                    onChange={(e) => {
                      setSelectedTxId(e.target.value);
                      const tx = transactions.find(t => t.id === e.target.value);
                      if (tx) {
                        setRefundAmount(tx.amount.toString());
                      }
                    }}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:border-orange-500 transition cursor-pointer"
                  >
                    <option value="">-- No specific transaction --</option>
                    {transactions.map(tx => (
                      <option key={tx.id} value={tx.id}>
                        {tx.description.substring(0, 35)}... (₹{tx.amount} - {tx.type})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Refund Amount */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Refund Amount (INR)</label>
                  <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-base font-extrabold text-slate-400 font-mono">₹</span>
                    <input
                      type="number"
                      placeholder="Enter amount to refund"
                      step="1"
                      value={refundAmount}
                      onChange={(e) => setRefundAmount(e.target.value)}
                      required
                      className="w-full pl-8 pr-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-sm font-extrabold text-slate-800"
                    />
                  </div>
                </div>

                {/* Refund Reason */}
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">Detailed Reason</label>
                  <textarea
                    placeholder="Describe why you are requesting this refund (minimum 10 characters)..."
                    value={refundReason}
                    onChange={(e) => setRefundReason(e.target.value)}
                    required
                    rows={3}
                    className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:outline-none focus:border-orange-500 text-xs font-bold text-slate-800"
                  />
                  {refundReason && refundReason.trim().length < 10 && (
                    <span className="text-[10px] text-rose-500 font-bold block">
                      Needs at least {10 - refundReason.trim().length} more characters.
                    </span>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={submittingRefund || refundReason.trim().length < 10 || !refundAmount || parseFloat(refundAmount) <= 0}
                  className={`w-full py-3.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center space-x-2 cursor-pointer ${
                    submittingRefund || refundReason.trim().length < 10 || !refundAmount || parseFloat(refundAmount) <= 0
                      ? "bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200"
                      : "bg-slate-900 text-white hover:bg-slate-850 active:scale-98 shadow-md"
                  }`}
                >
                  {submittingRefund ? "Filing Request..." : "File Refund Request"}
                </button>
              </form>
            </div>
          )}

          {/* Tab: Refund Status History */}
          {dashboardTab === "refund_history" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="refund-history-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-slate-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Refund Request Logs</h4>
                </div>
                <span className="text-[10px] font-black text-slate-400">{refunds.length} total</span>
              </div>

              {refundsLoading ? (
                <div className="text-center py-8 text-slate-450 text-xs font-bold flex flex-col items-center justify-center space-y-2">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>Retrieving refund history...</span>
                </div>
              ) : refunds.length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <Info className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-black text-slate-700">No Refund Requests Filed</p>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto">
                    You haven't filed any refund claims. Any requests you make will appear here with live status updates.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5 max-h-[350px] overflow-y-auto pr-1">
                  {refunds.map((ref) => {
                    return (
                      <div key={ref.id} className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-2 text-left">
                        <div className="flex justify-between items-start">
                          <div className="space-y-0.5">
                            <span className="text-xs font-black text-slate-800 block">₹{ref.amount.toLocaleString()}</span>
                            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-wider">ID: {ref.id}</span>
                          </div>
                          
                          <div>
                            {ref.status === "pending" && (
                              <span className="px-2 py-0.5 bg-amber-50 border border-amber-100 text-amber-600 rounded-full text-[9px] font-black uppercase flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                                <span>PENDING</span>
                              </span>
                            )}
                            {ref.status === "approved" && (
                              <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-100 text-emerald-600 rounded-full text-[9px] font-black uppercase flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                <span>APPROVED</span>
                              </span>
                            )}
                            {ref.status === "rejected" && (
                              <span className="px-2 py-0.5 bg-rose-50 border border-rose-100 text-rose-600 rounded-full text-[9px] font-black uppercase flex items-center space-x-1">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
                                <span>REJECTED</span>
                              </span>
                            )}
                          </div>
                        </div>

                        <div className="space-y-1 pt-1 border-t border-slate-100">
                          <p className="text-[11px] text-slate-600 font-medium leading-relaxed">
                            <strong className="text-slate-700">Reason:</strong> {ref.reason}
                          </p>
                          {ref.transactionId && (
                            <p className="text-[9px] font-mono text-slate-400 font-semibold">
                              Associated Tx: {ref.transactionId}
                            </p>
                          )}
                          {ref.adminNotes && (
                            <div className="mt-2 p-2 bg-slate-100 border-l-2 border-slate-300 rounded text-[10px] text-slate-600 leading-relaxed font-semibold">
                              <span className="font-bold text-slate-700 block text-[9px] uppercase tracking-wider mb-0.5">Admin Review:</span>
                              {ref.adminNotes}
                            </div>
                          )}
                        </div>

                        <div className="text-[9px] text-slate-400 font-bold font-mono text-right pt-1">
                          Filed: {new Date(ref.createdAt).toLocaleDateString()}
                          {ref.resolvedAt && ` • Resolved: ${new Date(ref.resolvedAt).toLocaleDateString()}`}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Tab: Admin Approvals Control Panel */}
          {dashboardTab === "admin_refunds" && role === "admin" && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4" id="admin-approvals-panel">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <ShieldCheck className="w-5 h-5 text-amber-600" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Panchayat Refund Approvals</h4>
                </div>
                <div className="flex space-x-1">
                  {(["all", "pending", "approved", "rejected"] as const).map((f) => (
                    <button
                      key={f}
                      type="button"
                      onClick={() => setAdminRefundFilter(f)}
                      className={`px-2 py-0.5 rounded text-[9px] font-black uppercase cursor-pointer tracking-wider transition ${
                        adminRefundFilter === f
                          ? "bg-slate-900 text-white"
                          : "bg-slate-100 text-slate-500 hover:bg-slate-200"
                      }`}
                    >
                      {f}
                    </button>
                  ))}
                </div>
              </div>

              {refundsLoading ? (
                <div className="text-center py-8 text-slate-450 text-xs font-bold flex flex-col items-center justify-center space-y-2">
                  <div className="w-5 h-5 border-2 border-orange-500 border-t-transparent rounded-full animate-spin" />
                  <span>Retrieving system claims...</span>
                </div>
              ) : refunds.filter(r => adminRefundFilter === "all" || r.status === adminRefundFilter).length === 0 ? (
                <div className="text-center py-10 space-y-2">
                  <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center mx-auto text-slate-400">
                    <CheckCircle className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-black text-slate-700">No Claims to Display</p>
                  <p className="text-[10px] text-slate-400 max-w-[220px] mx-auto">
                    There are no refund claims matching the "{adminRefundFilter}" status filter.
                  </p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1">
                  {refunds
                    .filter(r => adminRefundFilter === "all" || r.status === adminRefundFilter)
                    .map((ref) => {
                      const isPending = ref.status === "pending";
                      return (
                        <div key={ref.id} className={`p-4 rounded-xl border space-y-3 text-left transition-all ${
                          isPending 
                            ? "bg-amber-50/40 border-amber-200" 
                            : ref.status === "approved"
                            ? "bg-emerald-50/20 border-emerald-100"
                            : "bg-rose-50/20 border-rose-100"
                        }`}>
                          <div className="flex justify-between items-start">
                            <div className="space-y-0.5">
                              <h5 className="text-xs font-black text-slate-800">{ref.userName}</h5>
                              <p className="text-[10px] text-slate-400 font-bold">{ref.userEmail} • UserID: {ref.userId}</p>
                              <div className="text-[10px] font-bold text-slate-650 font-mono mt-1">
                                Amount claimed: <span className="text-sm font-black text-slate-850">₹{ref.amount}</span>
                              </div>
                            </div>

                            <div>
                              {ref.status === "pending" && (
                                <span className="px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full text-[8px] font-black uppercase">PENDING REVIEW</span>
                              )}
                              {ref.status === "approved" && (
                                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full text-[8px] font-black uppercase">APPROVED</span>
                              )}
                              {ref.status === "rejected" && (
                                <span className="px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full text-[8px] font-black uppercase">REJECTED</span>
                              )}
                            </div>
                          </div>

                          <div className="text-[11px] bg-white p-2.5 rounded-lg border border-slate-100 text-slate-650 leading-relaxed font-semibold">
                            <span className="font-bold text-slate-500 block text-[9px] uppercase mb-0.5">Reason for Request:</span>
                            "{ref.reason}"
                          </div>

                          {/* Action Form if Pending */}
                          {isPending ? (
                            <div className="space-y-2 pt-2 border-t border-dashed border-amber-200">
                              <div className="space-y-1">
                                <label className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Decision Notes / Feedback</label>
                                <input
                                  type="text"
                                  placeholder="Specify notes for the user (minimum 5 chars)..."
                                  value={adminNotesText[ref.id] || ""}
                                  onChange={(e) => setAdminNotesText({ ...adminNotesText, [ref.id]: e.target.value })}
                                  className="w-full px-3 py-1.5 rounded-lg border border-slate-200 text-[11px] font-bold text-slate-800 focus:outline-none focus:border-amber-500 bg-white"
                                />
                              </div>

                              <div className="flex space-x-2">
                                <button
                                  type="button"
                                  disabled={processingRefundId !== null || !(adminNotesText[ref.id] && adminNotesText[ref.id].trim().length >= 5)}
                                  onClick={() => handleAdminDecision(ref.id, "approved")}
                                  className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer"
                                >
                                  {processingRefundId === ref.id ? "Processing..." : "Approve & Credit"}
                                </button>
                                <button
                                  type="button"
                                  disabled={processingRefundId !== null || !(adminNotesText[ref.id] && adminNotesText[ref.id].trim().length >= 5)}
                                  onClick={() => handleAdminDecision(ref.id, "rejected")}
                                  className="flex-1 py-2 bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase rounded-lg transition cursor-pointer"
                                >
                                  {processingRefundId === ref.id ? "Processing..." : "Reject Claim"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[10px] p-2 bg-slate-50 border border-slate-100 rounded space-y-0.5 font-semibold text-slate-600">
                              <span className="font-bold text-slate-500 uppercase tracking-wider block text-[8px]">Decision Notes:</span>
                              "{ref.adminNotes || "No review feedback provided"}"
                              <span className="block text-[8px] text-slate-400 font-mono mt-1 text-right">
                                Resolved: {new Date(ref.resolvedAt || ref.createdAt).toLocaleDateString()}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              )}
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

          {dashboardTab === "payment_hub" && (
            <div className="bg-slate-900 p-5 rounded-2xl text-white shadow-sm space-y-4 border border-slate-800" id="payment-architecture-panel">
              <div className="flex items-center space-x-2 text-indigo-400">
                <ShieldCheck className="w-5 h-5 font-black text-indigo-400" />
                <h4 className="text-xs font-black uppercase tracking-widest">Security Architecture</h4>
              </div>
              <p className="text-[11px] font-semibold leading-relaxed text-slate-300">
                Our payment foundation is designed following professional enterprise guidelines. Direct client-side SDK checkouts are mediated by secure server-side Express handlers to guard sensitive webhooks.
              </p>
              <div className="p-3 bg-slate-800/50 rounded-xl space-y-1.5 text-[10px] text-slate-400">
                <span className="font-extrabold text-indigo-400 uppercase tracking-wider block font-sans">Key Specifications:</span>
                <div>• Strict MongoDB Document Schemas</div>
                <div>• Automatic Sandbox Failover Systems</div>
                <div>• Cryptographic Order & Refund Signatures</div>
              </div>
            </div>
          )}

        </div>

        {/* Paginated Historical Ledger & Filters */}
        <div 
          className={dashboardTab === "payment_hub" ? "lg:col-span-7 space-y-6" : "lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between"} 
          id="historical-ledger"
        >
          {dashboardTab === "payment_hub" ? (
            <PaymentHub
              userId={userId}
              token={token}
              role={role}
              onPaymentSuccess={() => {
                fetchWalletDetails();
                fetchTransactionLogs(1);
              }}
            />
          ) : (
            <>
              <div>
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start lg:items-center gap-3 mb-4">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <History className="w-5 h-5 text-orange-500" />
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">Historical Ledger</h4>
                </div>
                <p className="text-[10px] text-slate-400 font-semibold">
                  Secure record of all subsidy credits, debits, and claims.
                </p>
              </div>
              <div className="flex items-center gap-2 self-start sm:self-auto">
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full font-bold">
                  {totalTxCount} Logs Found
                </span>
                <button
                  type="button"
                  onClick={handleDownloadStatement}
                  className="flex items-center space-x-1.5 px-3 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-sm"
                  title="Download CSV statement of current filtered transactions"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Statement</span>
                </button>
              </div>
            </div>

            {/* Filter Panel */}
            <div className="bg-slate-50 p-4 rounded-xl mb-4 border border-slate-100 space-y-3" id="filter-panel">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Search field */}
                <div className="sm:col-span-1 space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Search</span>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                      type="text"
                      value={filterSearch}
                      onChange={(e) => { setFilterSearch(e.target.value); setCurrentPage(1); }}
                      placeholder="Search memo, ID..."
                      className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 pl-8 pr-2 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>

                {/* Filter Type */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Transaction Type</span>
                  <select
                    value={filterType}
                    onChange={(e) => { setFilterType(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Types</option>
                    <option value="credit">Credit</option>
                    <option value="debit">Debit</option>
                    <option value="refund">Refund</option>
                    <option value="adjustment">Adjustment</option>
                  </select>
                </div>
                
                {/* Filter Status */}
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block">Status</span>
                  <select
                    value={filterStatus}
                    onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs font-bold text-slate-700 bg-white border border-slate-200 rounded-lg py-1.5 px-2 focus:outline-none focus:border-orange-500"
                  >
                    <option value="all">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="failed">Failed</option>
                  </select>
                </div>

              </div>

              {/* Date Range Inputs */}
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-200/40">
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> From Date
                  </span>
                  <input
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => { setFilterStartDate(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider block flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" /> To Date
                  </span>
                  <input
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => { setFilterEndDate(e.target.value); setCurrentPage(1); }}
                    className="w-full text-xs font-semibold text-slate-700 bg-white border border-slate-200 rounded-lg py-1 px-1.5 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Reset trigger */}
              {(filterSearch || filterStartDate || filterEndDate || filterType !== "all" || filterStatus !== "all") && (
                <div className="text-right pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      setFilterSearch("");
                      setFilterStartDate("");
                      setFilterEndDate("");
                      setFilterType("all");
                      setFilterStatus("all");
                      setCurrentPage(1);
                    }}
                    className="text-[10px] font-black text-orange-600 hover:text-orange-700 uppercase tracking-wider cursor-pointer transition bg-transparent border-0 p-0"
                  >
                    Reset Filters
                  </button>
                </div>
              )}
            </div>

            {/* Scope / Filtered Period Balance Summary Card */}
            <div className="grid grid-cols-3 gap-3 bg-gradient-to-br from-slate-50 to-slate-100/60 p-3.5 rounded-xl mb-4 border border-slate-200/40 text-slate-800" id="period-summary-widget">
              <div className="space-y-1 border-r border-slate-200/60 pr-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Period Opening</span>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  ₹{openingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[7px] text-slate-400 font-bold block leading-none">Pre-range balance</span>
              </div>

              <div className="space-y-1 border-r border-slate-200/60 px-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Period Closing</span>
                <div className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                  ₹{closingBalance.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className="text-[7px] text-slate-400 font-bold block leading-none">Post-range balance</span>
              </div>

              <div className="space-y-1 pl-2">
                <span className="text-[8px] font-black text-slate-400 uppercase tracking-wider block font-mono">Period Net Flow</span>
                <div className={`text-xs sm:text-sm font-black font-mono ${
                  (closingBalance - openingBalance) >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}>
                  {(closingBalance - openingBalance) >= 0 ? "+" : "-"}₹{Math.abs(closingBalance - openingBalance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <span className={`text-[7px] font-bold block leading-none ${
                  (closingBalance - openingBalance) >= 0 ? "text-emerald-500" : "text-rose-500"
                }`}>
                  {(closingBalance - openingBalance) >= 0 ? "Net Positive" : "Net Negative"}
                </span>
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
          </>
          )}
        </div>

      </div>

    </div>
  );
}
