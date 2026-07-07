import React, { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface PaginationProps {
  id?: string;
  page: number;
  totalPages: number;
  totalItems: number;
  limit: number;
  onPageChange: (page: number) => void;
  onLimitChange: (limit: number) => void;
}

export default function Pagination({
  id = "reusable-pagination",
  page,
  totalPages,
  totalItems,
  limit,
  onPageChange,
  onLimitChange,
}: PaginationProps) {
  const [goPageInput, setGoPageInput] = useState("");

  useEffect(() => {
    setGoPageInput("");
  }, [page]);

  const handleGoPageSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseInt(goPageInput, 10);
    if (!isNaN(parsed) && parsed >= 1 && parsed <= totalPages) {
      onPageChange(parsed);
      setGoPageInput("");
    }
  };

  // Generate range of page numbers to display with ellipses
  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Always show first page
      pages.push(1);

      let start = Math.max(2, page - 1);
      let end = Math.min(totalPages - 1, page + 1);

      if (page <= 2) {
        end = 4;
      } else if (page >= totalPages - 1) {
        start = totalPages - 3;
      }

      if (start > 2) {
        pages.push("...");
      }

      for (let i = start; i <= end; i++) {
        pages.push(i);
      }

      if (end < totalPages - 1) {
        pages.push("...");
      }

      // Always show last page
      pages.push(totalPages);
    }
    return pages;
  };

  const startIdx = totalItems === 0 ? 0 : (page - 1) * limit + 1;
  const endIdx = Math.min(page * limit, totalItems);

  return (
    <div
      id={id}
      className="flex flex-col lg:flex-row items-center justify-between gap-4 p-4 md:p-6 bg-white border border-slate-100 rounded-3xl shadow-sm transition hover:shadow-md"
    >
      {/* 1. Item Count Indicator */}
      <div className="text-xs text-slate-500 font-bold font-mono order-2 lg:order-1 text-center lg:text-left">
        Showing{" "}
        <span className="text-emerald-600 font-black">{startIdx}</span> to{" "}
        <span className="text-emerald-600 font-black">{endIdx}</span> of{" "}
        <span className="text-slate-800 font-black">{totalItems}</span> entries
      </div>

      {/* 2. Interactive Navigation Controls */}
      <div className="flex flex-wrap items-center justify-center gap-2 order-1 lg:order-2">
        {/* First Page */}
        <button
          onClick={() => onPageChange(1)}
          disabled={page === 1}
          className="p-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-500 transition cursor-pointer"
          title="First Page"
        >
          <ChevronsLeft className="w-4 h-4" />
        </button>

        {/* Previous Page */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className="p-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-500 transition cursor-pointer"
          title="Previous Page"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {/* Page Numbers */}
        <div className="flex items-center gap-1">
          {getPageNumbers().map((num, idx) => (
            <React.Fragment key={idx}>
              {num === "..." ? (
                <span className="px-3 py-1.5 text-slate-400 font-black text-xs">...</span>
              ) : (
                <button
                  onClick={() => onPageChange(num as number)}
                  className={`px-3 py-1.5 text-xs font-black rounded-xl transition cursor-pointer ${
                    page === num
                      ? "bg-slate-900 text-white shadow-sm"
                      : "border border-slate-100 hover:bg-slate-50 text-slate-600 hover:text-slate-900"
                  }`}
                >
                  {num}
                </button>
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Next Page */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages || totalPages === 0}
          className="p-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-500 transition cursor-pointer"
          title="Next Page"
        >
          <ChevronRight className="w-4 h-4" />
        </button>

        {/* Last Page */}
        <button
          onClick={() => onPageChange(totalPages)}
          disabled={page === totalPages || totalPages === 0}
          className="p-2 border border-slate-100 rounded-xl bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-800 disabled:opacity-40 disabled:hover:bg-slate-50 disabled:hover:text-slate-500 transition cursor-pointer"
          title="Last Page"
        >
          <ChevronsRight className="w-4 h-4" />
        </button>
      </div>

      {/* 3. Dropdowns & Manual "Go to Page" */}
      <div className="flex flex-wrap items-center justify-center gap-4 order-3 lg:order-3">
        {/* Rows Per Page Selector */}
        <div className="flex items-center space-x-2">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
            Rows per page:
          </span>
          <select
            value={limit}
            onChange={(e) => {
              onLimitChange(parseInt(e.target.value, 10));
              onPageChange(1); // Reset to first page
            }}
            className="px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition cursor-pointer"
          >
            <option value={5}>5</option>
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
            <option value={100}>100</option>
          </select>
        </div>

        {/* Go To Page Input */}
        <form onSubmit={handleGoPageSubmit} className="flex items-center space-x-1.5">
          <span className="text-[11px] font-black uppercase text-slate-400 tracking-wider">
            Go to:
          </span>
          <input
            type="number"
            min={1}
            max={totalPages || 1}
            value={goPageInput}
            onChange={(e) => setGoPageInput(e.target.value)}
            placeholder={`1-${totalPages || 1}`}
            className="w-14 px-2 py-1.5 bg-slate-50 border border-slate-100 rounded-xl text-xs font-black text-center text-slate-700 focus:bg-white focus:outline-none focus:border-emerald-500 transition"
          />
          <button
            type="submit"
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-black rounded-xl transition cursor-pointer uppercase tracking-wider"
          >
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
