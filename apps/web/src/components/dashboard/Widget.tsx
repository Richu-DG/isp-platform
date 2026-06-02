"use client";

import { useState } from "react";
import { RefreshCw, Minus, ChevronLeft, ChevronRight } from "lucide-react";
import { clsx } from "clsx";

export function Widget({
  title, icon: Icon, onUpdate, actions, children, className = "", noPad = false,
}: {
  title: string; icon?: any; onUpdate?: () => void;
  actions?: React.ReactNode; children: React.ReactNode;
  className?: string; noPad?: boolean;
}) {
  const [mini, setMini] = useState(false);
  return (
    <div className={`widget ${className}`}>
      <div className="widget-header">
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-blue-600" />}
          <span>{title}</span>
        </span>
        <span className="flex items-center gap-1.5">
          {actions}
          {onUpdate && (
            <button onClick={onUpdate} className="btn-update flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" /> Update
            </button>
          )}
          <button onClick={() => setMini(!mini)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
            <Minus className="h-3 w-3" />
          </button>
        </span>
      </div>
      {!mini && <div className={noPad ? "" : "widget-body"}>{children}</div>}
    </div>
  );
}

export function PageHeader({
  title, subtitle, action,
}: { title: string; subtitle?: string; action?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{title}</h1>
        {subtitle && <p className="mt-0.5 text-xs" style={{ color: "var(--text-secondary)" }}>{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    ACTIVE:      "bg-green-100 text-green-700",
    EXPIRED:     "bg-red-100 text-red-700",
    SUSPENDED:   "bg-orange-100 text-orange-700",
    PENDING:     "bg-yellow-100 text-yellow-700",
    BLACKLISTED: "bg-gray-100 text-gray-600",
    COMPLETED:   "bg-green-100 text-green-700",
    FAILED:      "bg-red-100 text-red-700",
    REFUNDED:    "bg-purple-100 text-purple-700",
    CANCELLED:   "bg-gray-100 text-gray-500",
    PAID:        "bg-green-100 text-green-700",
    OVERDUE:     "bg-red-100 text-red-700",
    OPEN:        "bg-blue-100 text-blue-700",
    IN_PROGRESS: "bg-yellow-100 text-yellow-700",
    RESOLVED:    "bg-green-100 text-green-700",
    CLOSED:      "bg-gray-100 text-gray-500",
    ONLINE:      "bg-green-100 text-green-700",
    OFFLINE:     "bg-red-100 text-red-700",
  };
  const cls = map[status] ?? "bg-gray-100 text-gray-600";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${cls}`}>
      <span className="h-1.5 w-1.5 rounded-full bg-current opacity-60" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function TablePager({
  meta, page, setPage,
}: { meta: any; page: number; setPage: (p: number) => void }) {
  if (!meta) return null;
  return (
    <div className="flex items-center justify-between border-t px-4 py-3 text-xs text-gray-500" style={{ borderColor: "var(--card-border)" }}>
      <span>Showing {Math.min((page-1)*meta.limit+1, meta.total)}–{Math.min(page*meta.limit, meta.total)} of {meta.total}</span>
      <div className="flex gap-1">
        <button onClick={() => setPage(page-1)} disabled={page===1}
          className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="h-3.5 w-3.5" /></button>
        <span className="px-2 py-1 font-medium">{page} / {meta.totalPages}</span>
        <button onClick={() => setPage(page+1)} disabled={!meta.hasNext}
          className="rounded p-1.5 hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="h-3.5 w-3.5" /></button>
      </div>
    </div>
  );
}

export function EmptyState({ msg = "No data found" }: { msg?: string }) {
  return (
    <div className="flex h-32 items-center justify-center text-sm text-gray-400">{msg}</div>
  );
}

export function Spinner() {
  return (
    <div className="flex h-32 items-center justify-center">
      <div className="h-7 w-7 animate-spin rounded-full border-4 border-blue-500 border-t-transparent" />
    </div>
  );
}
