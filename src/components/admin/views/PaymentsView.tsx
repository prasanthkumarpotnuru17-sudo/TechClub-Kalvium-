"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  CreditCard,
  Search,
  Filter,
  CheckCircle2,
  XCircle,
  Clock,
  Eye,
  AlertTriangle,
  FileText,
  DollarSign,
  User,
  Mail,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  RotateCcw,
  X,
  Copy,
  Check,
  Trash2,
  ArrowUpDown,
  Layers,
  Building2,
  Calendar,
  Download,
  FileSpreadsheet,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { paymentService } from "@/services/paymentService";
import { PaymentRecord } from "@/types/paymentTypes";
import { cn } from "@/lib/utils";
import { exportToCSV, exportToExcel } from "@/lib/services/exportUtils";

export function PaymentsView() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("All"); // "All" | "Pending" | "Verified" | "Rejected" | "Expired"
  const [eventFilter, setEventFilter] = useState<string>("All"); // Event title filter
  const [sortBy, setSortBy] = useState<"newest" | "oldest" | "amount_high" | "amount_low" | "name_asc" | "event_asc">("newest");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Modal / Lightbox State
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [actionLoadingId, setActionLoadingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Reject / Re-upload Modal State
  const [rejectModal, setRejectModal] = useState<{
    isOpen: boolean;
    payment: PaymentRecord | null;
    actionType: "Reject" | "RequestReupload";
    remarks: string;
  }>({
    isOpen: false,
    payment: null,
    actionType: "Reject",
    remarks: "",
  });

  const [copiedUtr, setCopiedUtr] = useState<string | null>(null);

  // Subscribe to real-time payments
  useEffect(() => {
    setLoading(true);

    const unsub = paymentService.subscribePayments(
      (data) => {
        setPayments(data);
        setLoading(false);
      },
      (err) => {
        console.warn("[PaymentsView] Subscription notice:", err?.message || err);
        setPayments([]);
        setLoading(false);
      }
    );
    return () => unsub();
  }, []);

  // Compute unique list of events for the event filter
  const uniqueEvents = useMemo(() => {
    const map = new Map<string, { title: string; count: number; revenue: number }>();
    payments.forEach((p) => {
      const title = p.eventTitle || "Tech Club Event";
      const existing = map.get(title) || { title, count: 0, revenue: 0 };
      existing.count += 1;
      if ((p.status as string) === "Verified" || (p.status as string) === "Approved") {
        existing.revenue += p.amount || 0;
      }
      map.set(title, existing);
    });
    return Array.from(map.values()).sort((a, b) => a.title.localeCompare(b.title));
  }, [payments]);

  // Compute payments scoped to selected event
  const eventScopedPayments = useMemo(() => {
    if (eventFilter === "All") return payments;
    return payments.filter((p) => (p.eventTitle || "Tech Club Event") === eventFilter);
  }, [payments, eventFilter]);

  // Compute Verified Revenue strictly from Approved / Verified payments in scope
  const verifiedRevenue = useMemo(() => {
    return eventScopedPayments
      .filter((p) => (p.status as string) === "Verified" || (p.status as string) === "Approved")
      .reduce((sum, p) => sum + (p.amount || 0), 0);
  }, [eventScopedPayments]);

  // Compute status counts in scope
  const counts = useMemo(() => {
    return {
      total: eventScopedPayments.length,
      pending: eventScopedPayments.filter((p) => (p.status as string) === "Pending").length,
      verified: eventScopedPayments.filter((p) => (p.status as string) === "Verified" || (p.status as string) === "Approved").length,
      rejected: eventScopedPayments.filter((p) => (p.status as string) === "Rejected").length,
      expired: eventScopedPayments.filter((p) => (p.status as string) === "Expired").length,
    };
  }, [eventScopedPayments]);

  // Filtering & Sorting
  const filteredPayments = useMemo(() => {
    return eventScopedPayments
      .filter((p) => {
        if (statusFilter !== "All" && p.status !== statusFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.toLowerCase().trim();
          const matchName = (p.studentName || "").toLowerCase().includes(q);
          const matchEmail = (p.studentEmail || "").toLowerCase().includes(q);
          const matchEvent = (p.eventTitle || "").toLowerCase().includes(q);
          const matchUtr = (p.transactionId || "").toLowerCase().includes(q);
          const matchId = (p.paymentId || "").toLowerCase().includes(q);
          return matchName || matchEmail || matchEvent || matchUtr || matchId;
        }
        return true;
      })
      .sort((a, b) => {
        const timeA = new Date(a.submittedAt || a.createdAt || 0).getTime();
        const timeB = new Date(b.submittedAt || b.createdAt || 0).getTime();

        if (sortBy === "newest") return timeB - timeA;
        if (sortBy === "oldest") return timeA - timeB;
        if (sortBy === "amount_high") return (b.amount || 0) - (a.amount || 0);
        if (sortBy === "amount_low") return (a.amount || 0) - (b.amount || 0);
        if (sortBy === "name_asc") return (a.studentName || "").localeCompare(b.studentName || "");
        if (sortBy === "event_asc") return (a.eventTitle || "").localeCompare(b.eventTitle || "");
        return timeB - timeA;
      });
  }, [eventScopedPayments, statusFilter, searchQuery, sortBy]);

  // Pagination
  const totalPages = Math.ceil(filteredPayments.length / itemsPerPage) || 1;
  const paginatedPayments = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredPayments.slice(start, start + itemsPerPage);
  }, [filteredPayments, currentPage]);

  const handleApprove = async (payment: PaymentRecord) => {
    setActionLoadingId(payment.id);
    // Optimistic UI update
    setPayments((prev) =>
      prev.map((p) => (p.id === payment.id ? { ...p, status: "Approved", verifiedAt: new Date().toISOString() } : p))
    );
    try {
      await paymentService.verifyPayment(payment.id, "Approve");
    } catch (err: any) {
      console.error("[PaymentsView] Approve failed:", err);
      alert(err.message || "Failed to approve payment.");
      const fresh = await paymentService.getPayments();
      setPayments(fresh);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleOpenRejectModal = (payment: PaymentRecord, actionType: "Reject" | "RequestReupload") => {
    setRejectModal({
      isOpen: true,
      payment,
      actionType,
      remarks: actionType === "RequestReupload" ? "Please re-upload a clear screenshot showing the 12-digit UTR reference number." : "Payment proof verification rejected.",
    });
  };

  const handleConfirmReject = async () => {
    if (!rejectModal.payment) return;
    const targetId = rejectModal.payment.id;
    const actionType = rejectModal.actionType;
    setActionLoadingId(targetId);

    // Optimistic UI update
    setPayments((prev) =>
      prev.map((p) => (p.id === targetId ? { ...p, status: "Rejected", verifiedAt: new Date().toISOString() } : p))
    );
    setRejectModal({ isOpen: false, payment: null, actionType: "Reject", remarks: "" });

    try {
      await paymentService.verifyPayment(
        targetId,
        actionType,
        rejectModal.remarks
      );
    } catch (err: any) {
      console.error("[PaymentsView] Reject failed:", err);
      alert(err.message || "Failed to submit decision.");
      const fresh = await paymentService.getPayments();
      setPayments(fresh);
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleDeletePayment = async (payment: PaymentRecord) => {
    if (
      !confirm(
        `Are you sure you want to permanently delete payment record ${payment.paymentId} (UTR: ${payment.transactionId})? This action cannot be undone.`
      )
    ) {
      return;
    }

    setDeletingId(payment.id);
    setPayments((prev) => prev.filter((p) => p.id !== payment.id));

    try {
      await paymentService.deletePaymentRecord(payment.id);
    } catch (err: any) {
      console.error("[PaymentsView] Delete payment error:", err);
      alert("Failed to delete payment record: " + (err?.message || "Unknown error"));
      const fresh = await paymentService.getPayments();
      setPayments(fresh);
    } finally {
      setDeletingId(null);
    }
  };

  const handleExportCSV = () => {
    if (filteredPayments.length === 0) {
      alert("No payment records available to export for the selected filters.");
      return;
    }
    const exportData = filteredPayments.map((p) => ({
      "Payment ID": p.paymentId || p.id,
      "Student Name": p.studentName || "N/A",
      "Student Email": p.studentEmail || "N/A",
      "Event Title": p.eventTitle || "Tech Club Event",
      "Fee Amount (INR)": p.amount || 0,
      "Transaction UTR": p.transactionId || "N/A",
      "Payment Status": p.status || "Pending",
      "Submitted Date": p.submittedAt ? new Date(p.submittedAt).toLocaleString() : "N/A",
      "Verified By": p.verifiedBy || "N/A",
      "Verified Date": p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : "N/A",
      "Remarks": p.remarks || "N/A",
    }));

    const sanitizeEventName = eventFilter.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Payments_${sanitizeEventName}_${dateStr}`;
    exportToCSV(exportData, filename);
  };

  const handleExportExcel = () => {
    if (filteredPayments.length === 0) {
      alert("No payment records available to export for the selected filters.");
      return;
    }
    const exportData = filteredPayments.map((p) => ({
      "Payment ID": p.paymentId || p.id,
      "Student Name": p.studentName || "N/A",
      "Student Email": p.studentEmail || "N/A",
      "Event Title": p.eventTitle || "Tech Club Event",
      "Fee Amount (INR)": p.amount || 0,
      "Transaction UTR": p.transactionId || "N/A",
      "Payment Status": p.status || "Pending",
      "Submitted Date": p.submittedAt ? new Date(p.submittedAt).toLocaleString() : "N/A",
      "Verified By": p.verifiedBy || "N/A",
      "Verified Date": p.verifiedAt ? new Date(p.verifiedAt).toLocaleString() : "N/A",
      "Remarks": p.remarks || "N/A",
    }));

    const sanitizeEventName = eventFilter.replace(/[^a-zA-Z0-9]/g, "_");
    const dateStr = new Date().toISOString().split("T")[0];
    const filename = `Payments_${sanitizeEventName}_${dateStr}`;
    exportToExcel(exportData, filename);
  };

  const copyUtr = (utr: string) => {
    navigator.clipboard.writeText(utr);
    setCopiedUtr(utr);
    setTimeout(() => setCopiedUtr(null), 2000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold uppercase tracking-wider border border-emerald-200 dark:border-emerald-800">
              Paid Events & Revenue
            </span>
            {counts.pending > 0 && (
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500 text-white text-[11px] font-bold animate-pulse">
                {counts.pending} Action Required
              </span>
            )}
          </div>
          <h2 className="text-2xl md:text-3xl font-extrabold text-gray-900 dark:text-white mt-1">
            Payment Verifications & Audit
          </h2>
          <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
            Atomic verification of event registration payments, UTR references, screenshot proofs, and event revenue audits.
          </p>
        </div>

        {/* EVENT SELECTOR & EXPORT DATA SHEET ACTIONS */}
        <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
          {/* Event Filter Dropdown */}
          <div className="bg-white dark:bg-slate-900 p-1.5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex items-center gap-2">
            <Layers className="w-4 h-4 text-blue-600 dark:text-blue-400 ml-2" />
            <select
              value={eventFilter}
              onChange={(e) => {
                setEventFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer pr-2"
            >
              <option value="All">All Events ({uniqueEvents.reduce((acc, ev) => acc + ev.count, 0)} payments)</option>
              {uniqueEvents.map((ev) => (
                <option key={ev.title} value={ev.title}>
                  {ev.title} ({ev.count} payments • ₹{ev.revenue.toLocaleString("en-IN")})
                </option>
              ))}
            </select>
          </div>

          {/* Export CSV Button */}
          <button
            onClick={handleExportCSV}
            className="px-3.5 py-2 rounded-2xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-gray-800 dark:text-gray-200 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-xs border border-gray-200 dark:border-gray-700"
            title="Export filtered payments to CSV sheet"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
            CSV Sheet
          </button>

          {/* Export Excel Button */}
          <button
            onClick={handleExportExcel}
            className="px-3.5 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-sm active:scale-95"
            title="Export filtered payments to Excel (.xls) sheet"
          >
            <Download className="w-3.5 h-3.5" />
            Excel Sheet
          </button>
        </div>
      </div>

      {/* METRICS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Verified Revenue */}
        <div className="p-5 rounded-3xl bg-gradient-to-br from-emerald-50 to-teal-50 dark:from-emerald-950/40 dark:to-teal-950/40 border border-emerald-200/80 dark:border-emerald-800/60 shadow-sm relative overflow-hidden">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300">
              {eventFilter === "All" ? "Total Verified Revenue" : "Event Revenue"}
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-600 text-white flex items-center justify-center font-bold shadow-md">
              ₹
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-emerald-950 dark:text-emerald-100">
              ₹{verifiedRevenue.toLocaleString("en-IN")}
            </div>
            <p className="text-[11px] text-emerald-700 dark:text-emerald-400 font-medium mt-1">
              Calculated strictly from {counts.verified} verified payments
            </p>
          </div>
        </div>

        {/* Pending Verification */}
        <div className="p-5 rounded-3xl bg-amber-50/60 dark:bg-amber-950/40 border border-amber-200/80 dark:border-amber-800/60 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-700 dark:text-amber-300">
              Pending Proofs
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-500 text-white flex items-center justify-center shadow-md">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-amber-950 dark:text-amber-100">
              {counts.pending}
            </div>
            <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium mt-1">
              Awaiting admin approval
            </p>
          </div>
        </div>

        {/* Verified Payments */}
        <div className="p-5 rounded-3xl bg-blue-50/60 dark:bg-blue-950/40 border border-blue-200/80 dark:border-blue-800/60 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-700 dark:text-blue-300">
              Approved Payments
            </span>
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-blue-950 dark:text-blue-100">
              {counts.verified}
            </div>
            <p className="text-[11px] text-blue-700 dark:text-blue-400 font-medium mt-1">
              Tickets & passes active
            </p>
          </div>
        </div>

        {/* Rejected / Expired */}
        <div className="p-5 rounded-3xl bg-rose-50/60 dark:bg-rose-950/40 border border-rose-200/80 dark:border-rose-800/60 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-700 dark:text-rose-300">
              Rejected / Expired
            </span>
            <div className="w-10 h-10 rounded-2xl bg-rose-600 text-white flex items-center justify-center shadow-md">
              <XCircle className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-3xl font-black text-rose-950 dark:text-rose-100">
              {counts.rejected + counts.expired}
            </div>
            <p className="text-[11px] text-rose-700 dark:text-rose-400 font-medium mt-1">
              Invalid UTRs or expired submissions
            </p>
          </div>
        </div>
      </div>

      {/* EVENT QUICK SELECTION TABS */}
      {uniqueEvents.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => {
              setEventFilter("All");
              setCurrentPage(1);
            }}
            className={cn(
              "px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border",
              eventFilter === "All"
                ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900 dark:border-white shadow-sm"
                : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-slate-50"
            )}
          >
            <Layers className="w-3.5 h-3.5" />
            All Events ({payments.length})
          </button>
          {uniqueEvents.map((ev) => (
            <button
              key={ev.title}
              onClick={() => {
                setEventFilter(ev.title);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 border",
                eventFilter === ev.title
                  ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                  : "bg-white dark:bg-slate-900 text-gray-600 dark:text-gray-300 border-gray-200 dark:border-gray-800 hover:bg-slate-50"
              )}
            >
              <span>{ev.title}</span>
              <span className="px-1.5 py-0.5 rounded-full bg-black/10 dark:bg-white/20 text-[10px]">
                {ev.count}
              </span>
            </button>
          ))}
        </div>
      )}

      {/* FILTER, SORT & SEARCH BAR */}
      <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
          {["All", "Pending", "Verified", "Rejected", "Expired"].map((st) => (
            <button
              key={st}
              onClick={() => {
                setStatusFilter(st);
                setCurrentPage(1);
              }}
              className={cn(
                "px-3.5 py-1.5 rounded-2xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer",
                statusFilter === st
                  ? "bg-blue-600 text-white shadow-md shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800 text-gray-600 dark:text-gray-300 hover:bg-slate-200"
              )}
            >
              {st === "All" ? `All (${counts.total})` : `${st} (${(counts as any)[st.toLowerCase()] || 0})`}
            </button>
          ))}
        </div>

        {/* Sort & Search Controls */}
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
          {/* Sorting Dropdown */}
          <div className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-800 px-3 py-1.5 rounded-2xl border border-gray-200 dark:border-gray-700 w-full sm:w-auto">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="bg-transparent text-xs font-bold text-gray-900 dark:text-white focus:outline-none cursor-pointer w-full"
            >
              <option value="newest">Sort: Date (Newest First)</option>
              <option value="oldest">Sort: Date (Oldest First)</option>
              <option value="amount_high">Sort: Amount (High to Low)</option>
              <option value="amount_low">Sort: Amount (Low to High)</option>
              <option value="name_asc">Sort: Student Name (A-Z)</option>
              <option value="event_asc">Sort: Event Title (A-Z)</option>
            </select>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Search by student, UTR, event..."
              className="w-full pl-10 pr-4 py-2 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-gray-200 dark:border-gray-700 text-xs focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      </div>

      {/* PAYMENTS TABLE */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 border border-gray-200/80 dark:border-gray-800 shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-gray-400 space-y-3">
            <div className="w-8 h-8 rounded-full border-2 border-blue-600 border-t-transparent animate-spin mx-auto" />
            <p>Loading payment records...</p>
          </div>
        ) : paginatedPayments.length === 0 ? (
          <div className="p-12 text-center space-y-3 text-gray-400">
            <CreditCard className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-700" />
            <h4 className="font-bold text-gray-700 dark:text-gray-300">No Payments Found</h4>
            <p className="text-xs">No payment records match your current filters.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 dark:bg-slate-950/80 text-gray-400 font-bold uppercase tracking-wider border-b border-gray-100 dark:border-gray-800">
                <tr>
                  <th
                    onClick={() => setSortBy(sortBy === "name_asc" ? "newest" : "name_asc")}
                    className="py-4 px-4 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Student / Sender</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th
                    onClick={() => setSortBy(sortBy === "event_asc" ? "newest" : "event_asc")}
                    className="py-4 px-4 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Event & Fee</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-4 px-4">Transaction UTR</th>
                  <th className="py-4 px-4">Screenshot Proof</th>
                  <th
                    onClick={() => setSortBy(sortBy === "newest" ? "oldest" : "newest")}
                    className="py-4 px-4 cursor-pointer hover:text-gray-700 dark:hover:text-gray-200 transition-colors"
                  >
                    <div className="flex items-center gap-1">
                      <span>Submitted Date</span>
                      <ArrowUpDown className="w-3 h-3" />
                    </div>
                  </th>
                  <th className="py-4 px-4">Status</th>
                  <th className="py-4 px-4 text-right">Verification & Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800/60 font-medium">
                {paginatedPayments.map((p) => {
                  const rawDate = p.submittedAt || p.createdAt;
                  const parsedDate = rawDate ? new Date(rawDate) : null;
                  const isValidDate = parsedDate && !isNaN(parsedDate.getTime());
                  const dateStr = isValidDate
                    ? parsedDate.toLocaleString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })
                    : "N/A";

                  return (
                    <tr key={p.id} className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Student Info */}
                      <td className="py-4 px-4 max-w-[200px]">
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {p.studentName || "N/A"}
                        </div>
                        <div className="text-[11px] text-gray-500 dark:text-gray-400 flex items-center gap-1 mt-0.5 truncate">
                          <Mail className="w-3 h-3 text-gray-400 shrink-0" />
                          <span className="truncate">{p.studentEmail || "N/A"}</span>
                        </div>
                      </td>

                      {/* Event & Fee */}
                      <td className="py-4 px-4 max-w-[220px]">
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {p.eventTitle || "Tech Club Event"}
                        </div>
                        <div className="text-xs font-black text-emerald-600 dark:text-emerald-400 mt-0.5">
                          ₹{p.amount} INR
                        </div>
                      </td>

                      {/* UTR */}
                      <td className="py-4 px-4">
                        <div className="inline-flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-xl border border-gray-200 dark:border-gray-700">
                          <span className="font-mono font-bold text-xs text-gray-900 dark:text-gray-100">
                            {p.transactionId}
                          </span>
                          <button
                            onClick={() => copyUtr(p.transactionId)}
                            className="p-1 text-gray-400 hover:text-blue-600 transition-colors cursor-pointer"
                            title="Copy UTR"
                          >
                            {copiedUtr === p.transactionId ? (
                              <Check className="w-3.5 h-3.5 text-green-600" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </button>
                        </div>
                      </td>

                      {/* Screenshot Proof */}
                      <td className="py-4 px-4">
                        {p.paymentScreenshotUrl ? (
                          <button
                            onClick={() => setPreviewImage(p.paymentScreenshotUrl)}
                            className="group relative w-16 h-12 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 bg-black cursor-pointer shadow-sm hover:ring-2 ring-blue-500 transition-all"
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={p.paymentScreenshotUrl}
                              alt="Proof Screenshot"
                              className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                            />
                            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity text-white">
                              <Eye className="w-4 h-4" />
                            </div>
                          </button>
                        ) : (
                          <span className="text-gray-400 text-xs">No Image</span>
                        )}
                      </td>

                      {/* Submitted Date */}
                      <td className="py-4 px-4 text-gray-500 whitespace-nowrap text-[11px]">
                        {dateStr}
                      </td>

                      {/* Status Badge */}
                      <td className="py-4 px-4">
                        <span
                          className={cn(
                            "px-2.5 py-1 rounded-full text-[10px] font-bold border inline-block",
                            p.status === "Approved" || (p.status as string) === "Verified"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800"
                              : p.status === "Pending"
                              ? "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950 dark:text-amber-300 dark:border-amber-800"
                              : p.status === "Rejected"
                              ? "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950 dark:text-rose-300 dark:border-rose-800"
                              : "bg-gray-100 text-gray-600 border-gray-200 dark:bg-gray-800 dark:text-gray-400"
                          )}
                        >
                          {p.status}
                        </span>
                      </td>

                      {/* Verification & Actions */}
                      <td className="py-4 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          {p.status === "Pending" ? (
                            <>
                              <button
                                disabled={actionLoadingId === p.id || deletingId === p.id}
                                onClick={() => handleApprove(p)}
                                className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                Approve
                              </button>

                              <button
                                disabled={actionLoadingId === p.id || deletingId === p.id}
                                onClick={() => handleOpenRejectModal(p, "Reject")}
                                className="px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 border border-rose-200 hover:bg-rose-100 font-bold text-xs active:scale-95 transition-all flex items-center gap-1 cursor-pointer"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </>
                          ) : (
                            <div className="text-[11px] text-gray-400 italic">
                              Verified by {p.verifiedBy || "Admin"}
                            </div>
                          )}

                          {/* DELETE PAYMENT RECORD BUTTON */}
                          <button
                            disabled={deletingId === p.id}
                            onClick={() => handleDeletePayment(p)}
                            className="p-1.5 rounded-xl text-gray-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/50 transition-colors cursor-pointer ml-1"
                            title="Delete Payment Record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* PAGINATION */}
        {filteredPayments.length > itemsPerPage && (
          <div className="p-4 border-t border-gray-100 dark:border-gray-800 flex items-center justify-between text-xs text-gray-500">
            <span>
              Page <strong className="text-gray-900 dark:text-white">{currentPage}</strong> of{" "}
              <strong className="text-gray-900 dark:text-white">{totalPages}</strong>
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                disabled={currentPage === totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="p-1.5 rounded-lg border border-gray-200 dark:border-gray-800 text-gray-600 dark:text-gray-300 disabled:opacity-40 hover:bg-slate-50 transition-colors cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* SCREENSHOT LIGHTBOX MODAL */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="fixed inset-0 bg-black/80 backdrop-blur-xs cursor-pointer"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative z-10 max-w-4xl max-h-[90vh] rounded-3xl overflow-hidden bg-black border border-gray-800 shadow-2xl p-2"
            >
              <button
                onClick={() => setPreviewImage(null)}
                className="absolute top-4 right-4 p-2 rounded-full bg-black/60 text-white hover:bg-black transition-colors z-20 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewImage}
                alt="Payment Proof Full View"
                className="max-h-[85vh] max-w-full object-contain rounded-2xl mx-auto"
              />
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REJECT / RE-UPLOAD REMARKS MODAL */}
      <AnimatePresence>
        {rejectModal.isOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setRejectModal({ isOpen: false, payment: null, actionType: "Reject", remarks: "" })}
              className="fixed inset-0 bg-black/60 backdrop-blur-xs"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative z-10 w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-gray-800 shadow-2xl p-6 space-y-4"
            >
              <div className="flex justify-between items-center">
                <h3 className="font-bold text-gray-900 dark:text-white text-base">
                  Reject Payment Verification
                </h3>
                <button
                  onClick={() => setRejectModal({ isOpen: false, payment: null, actionType: "Reject", remarks: "" })}
                  className="p-1 rounded-full text-gray-400 hover:text-gray-600"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <p className="text-xs text-gray-500">
                Please provide a reason or remarks for rejecting payment <strong>{rejectModal.payment?.paymentId}</strong> (UTR: {rejectModal.payment?.transactionId}).
              </p>

              <div>
                <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">
                  Reason / Remarks
                </label>
                <textarea
                  rows={3}
                  value={rejectModal.remarks}
                  onChange={(e) => setRejectModal({ ...rejectModal, remarks: e.target.value })}
                  className="w-full p-3 rounded-2xl border border-gray-200 dark:border-gray-700 bg-slate-50 dark:bg-slate-800 text-xs focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  onClick={() => setRejectModal({ isOpen: false, payment: null, actionType: "Reject", remarks: "" })}
                  className="px-4 py-2 rounded-xl text-xs font-bold border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReject}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white shadow-md cursor-pointer"
                >
                  Confirm Rejection
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
