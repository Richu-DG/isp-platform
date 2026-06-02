"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, Users, Search, ChevronLeft, ChevronRight, CheckCircle2, XCircle, AlertTriangle, Clock } from "lucide-react";
import { clsx } from "clsx";

const STATUS = {
  ACTIVE:      { label: "Active",      cls: "bg-green-100 text-green-700",   dot: "bg-green-500" },
  EXPIRED:     { label: "Expired",     cls: "bg-red-100 text-red-700",       dot: "bg-red-500" },
  SUSPENDED:   { label: "Suspended",   cls: "bg-orange-100 text-orange-700", dot: "bg-orange-500" },
  PENDING:     { label: "Pending",     cls: "bg-yellow-100 text-yellow-700", dot: "bg-yellow-500" },
  BLACKLISTED: { label: "Blacklisted", cls: "bg-gray-100 text-gray-600",     dot: "bg-gray-400" },
};

export default function SubscribersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["subscribers", page, search, status],
    queryFn: () => api.get("/subscribers", { params: { page, limit: 20, search: search || undefined, status: status || undefined } }).then(r => r.data),
  });

  const { data: stats } = useQuery({
    queryKey: ["subscriber-stats"],
    queryFn: () => api.get("/subscribers/stats").then(r => r.data),
    refetchInterval: 30000,
  });

  const disconnectMutation = useMutation({
    mutationFn: (id: string) => api.post(`/subscribers/${id}/disconnect`),
    onSuccess: () => { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["subscribers"] }); },
    onError: () => toast.error("Failed to disconnect"),
  });

  const subscribers = data?.data ?? [];
  const meta = data?.meta;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Subscribers</h1>
          <p className="mt-1 text-sm text-gray-500">Manage your internet customers</p>
        </div>
        <Link href="/dashboard/subscribers/new" className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-sky-700 transition-colors">
          <UserPlus className="h-4 w-4" />
          New Subscriber
        </Link>
      </div>

      {/* Status filter pills */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(STATUS).map(([key, val]) => (
          <button key={key} onClick={() => setStatus(status === key ? "" : key)}
            className={clsx("inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium border transition-all",
              status === key ? "border-sky-500 ring-2 ring-sky-200 " + val.cls : "border-gray-200 bg-white text-gray-600 hover:border-gray-300"
            )}>
            <span className={`h-2 w-2 rounded-full ${val.dot}`} />
            {val.label}
            {stats && <span className="ml-1 font-bold">{stats[key.toLowerCase()] ?? 0}</span>}
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm overflow-hidden">
        <div className="border-b border-gray-100 px-5 py-4">
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search name, phone, username…"
              className="w-full rounded-xl border border-gray-200 py-2.5 pl-9 pr-4 text-sm outline-none focus:border-sky-500 focus:ring-2 focus:ring-sky-100" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex h-48 items-center justify-center">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-sky-500 border-t-transparent" />
          </div>
        ) : subscribers.length === 0 ? (
          <div className="flex h-48 flex-col items-center justify-center text-gray-400">
            <Users className="mb-2 h-10 w-10 opacity-30" />
            <p className="text-sm">No subscribers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["Subscriber", "Phone", "Package", "Status", "Expires", ""].map(h => (
                    <th key={h} className="px-5 py-3 text-xs font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {subscribers.map((sub: any) => {
                  const s = STATUS[sub.status as keyof typeof STATUS] ?? STATUS.PENDING;
                  return (
                    <tr key={sub.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-gray-900">{sub.fullName}</div>
                        <div className="text-xs text-gray-400">@{sub.username}</div>
                      </td>
                      <td className="px-5 py-3.5 text-gray-600">{sub.phone}</td>
                      <td className="px-5 py-3.5">
                        {sub.package ? (
                          <span className="rounded-full bg-sky-50 px-2.5 py-1 text-xs font-medium text-sky-700">{sub.package.name}</span>
                        ) : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${s.cls}`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${s.dot}`} />
                          {s.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-gray-500">
                        {sub.expiresAt ? new Date(sub.expiresAt).toLocaleDateString("en-KE") : <span className="text-gray-300">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-3">
                          <Link href={`/dashboard/subscribers/${sub.id}`} className="text-sky-600 hover:text-sky-800 font-medium text-xs">View</Link>
                          {sub.status === "ACTIVE" && (
                            <button onClick={() => disconnectMutation.mutate(sub.id)} className="text-xs font-medium text-red-500 hover:text-red-700">Kick</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {meta && (
          <div className="flex items-center justify-between border-t border-gray-100 px-5 py-3 text-sm text-gray-500">
            <span>Showing {Math.min((page - 1) * 20 + 1, meta.total)}–{Math.min(page * 20, meta.total)} of {meta.total}</span>
            <div className="flex gap-1">
              <button onClick={() => setPage(p => p - 1)} disabled={page === 1} className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
              <button onClick={() => setPage(p => p + 1)} disabled={!meta.hasNext} className="rounded-lg p-1.5 hover:bg-gray-100 disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
