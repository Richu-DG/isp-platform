"use client";
import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatCurrency, formatBytes } from "@/lib/api";
import { toast } from "sonner";
import { ArrowLeft, UserCheck, Phone, Mail, Package, Wifi, WifiOff, CreditCard, Ticket, Ban, CheckCircle, Zap } from "lucide-react";
import Link from "next/link";
import { Widget, StatusBadge, Spinner } from "@/components/dashboard/Widget";

export default function SubscriberDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [showAssign, setShowAssign] = useState(false);
  const [assignForm, setAssignForm] = useState({ packageId: "", extendFromNow: true, resetDataUsage: false });
  const [activeTab, setActiveTab] = useState<"sessions"|"payments"|"tickets">("sessions");

  const { data: sub, isLoading } = useQuery({
    queryKey: ["subscriber", id],
    queryFn: () => api.get(`/subscribers/${id}`).then(r => r.data),
    enabled: !!id,
  });
  const { data: packages = [] } = useQuery({ queryKey: ["packages"], queryFn: () => api.get("/packages").then(r => r.data) });

  const disconnectMutation = useMutation({
    mutationFn: () => api.post(`/subscribers/${id}/disconnect`),
    onSuccess: () => { toast.success("Disconnected"); qc.invalidateQueries({ queryKey: ["subscriber", id] }); },
  });
  const suspendMutation = useMutation({
    mutationFn: () => api.post(`/subscribers/${id}/suspend`, { reason: "Admin action" }),
    onSuccess: () => { toast.success("Suspended"); qc.invalidateQueries({ queryKey: ["subscriber", id] }); },
  });
  const unsuspendMutation = useMutation({
    mutationFn: () => api.post(`/subscribers/${id}/unsuspend`),
    onSuccess: () => { toast.success("Unsuspended"); qc.invalidateQueries({ queryKey: ["subscriber", id] }); },
  });
  const assignMutation = useMutation({
    mutationFn: (d: any) => api.post(`/subscribers/${id}/assign-package`, d),
    onSuccess: () => { toast.success("Package assigned"); qc.invalidateQueries({ queryKey: ["subscriber", id] }); setShowAssign(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  if (isLoading) return <div className="flex h-64 items-center justify-center"><div className="h-8 w-8 animate-spin rounded-full border-4 border-blue-500 border-t-transparent"/></div>;
  if (!sub) return <div className="p-8 text-center text-gray-500">Subscriber not found</div>;

  const pctData = sub.dataLimit ? Math.min(100, Math.round((Number(sub.dataUsed) / Number(sub.dataLimit)) * 100)) : 0;

  const TABS = [
    { key: "sessions", label: "Sessions", count: sub.sessions?.length },
    { key: "payments", label: "Payments", count: sub.payments?.length },
    { key: "tickets",  label: "Tickets",  count: sub.tickets?.length },
  ] as const;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/subscribers" className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>
          <ArrowLeft className="h-4 w-4"/>
        </Link>
        <div className="flex-1">
          <h1 className="text-xl font-bold" style={{ color: "var(--text-primary)" }}>{sub.fullName}</h1>
          <p className="text-xs mt-0.5" style={{ color: "var(--text-secondary)" }}>@{sub.username} · {sub.phone}</p>
        </div>
        <StatusBadge status={sub.status} />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Left col */}
        <div className="space-y-4">
          <Widget title="Account Info" icon={UserCheck}>
            <div className="space-y-2.5">
              {[
                [Phone, "Phone", sub.phone],
                [Mail, "Email", sub.email || "—"],
                [Wifi, "Connection", sub.connectionType === "PPPOE" ? "PPPoE / Wired" : "Hotspot / Wi-Fi"],
                [UserCheck, "National ID", sub.nationalId || "—"],
                [UserCheck, "Address", sub.address || "—"],
                [UserCheck, "Unit", sub.apartmentNumber || "—"],
                ...(sub.staticIp ? [[UserCheck, "Static IP", sub.staticIp]] : []),
              ].map(([Icon, label, val]) => (
                <div key={label as string} className="flex items-start gap-2.5">
                  <span className="mt-0.5 rounded-lg bg-gray-100 p-1.5"><Icon className="h-3 w-3 text-gray-500" /></span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400">{label as string}</p>
                    <p className="text-sm text-gray-800 break-all">{val as string}</p>
                  </div>
                </div>
              ))}
            </div>
          </Widget>

          <Widget title="Actions">
            <div className="space-y-2">
              <button onClick={() => setShowAssign(true)} className="w-full inline-flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "var(--sidebar-bg)" }}>
                <Package className="h-4 w-4"/>Assign Package
              </button>
              {sub.status === "ACTIVE" && (
                <button onClick={() => disconnectMutation.mutate()} disabled={disconnectMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-red-600 hover:bg-red-50 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <WifiOff className="h-4 w-4"/>{disconnectMutation.isPending ? "Disconnecting…" : "Disconnect Session"}
                </button>
              )}
              {sub.status === "SUSPENDED" ? (
                <button onClick={() => unsuspendMutation.mutate()} disabled={unsuspendMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-green-600 hover:bg-green-50 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <CheckCircle className="h-4 w-4"/>Unsuspend
                </button>
              ) : sub.status !== "BLACKLISTED" && (
                <button onClick={() => suspendMutation.mutate()} disabled={suspendMutation.isPending}
                  className="w-full inline-flex items-center justify-center gap-2 rounded-xl border py-2.5 text-sm font-semibold text-orange-600 hover:bg-orange-50 transition-colors" style={{ borderColor: "var(--card-border)" }}>
                  <Ban className="h-4 w-4"/>Suspend Account
                </button>
              )}
            </div>
          </Widget>
        </div>

        {/* Right col */}
        <div className="lg:col-span-2 space-y-4">
          {/* Package card */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Widget title="Current Package" icon={Package}>
              {sub.package ? (
                <div className="space-y-2">
                  <p className="font-bold text-gray-900">{sub.package.name}</p>
                  <p className="text-2xl font-bold text-blue-600">{formatCurrency(sub.package.price)}</p>
                  {sub.expiresAt && (
                    <div className={`rounded-xl px-3 py-2 text-xs font-semibold ${new Date(sub.expiresAt) > new Date() ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}`}>
                      Expires: {new Date(sub.expiresAt).toLocaleDateString("en-KE",{day:"2-digit",month:"short",year:"numeric"})}
                    </div>
                  )}
                  {sub.package.speedDown && (
                    <div className="flex items-center gap-1.5 text-xs text-gray-500">
                      <Zap className="h-3.5 w-3.5 text-yellow-500"/>{sub.package.speedDown}/{sub.package.speedUp ?? 0} Mbps
                    </div>
                  )}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm">
                  <Package className="h-6 w-6 mb-1 opacity-30"/>No package assigned
                </div>
              )}
            </Widget>

            <Widget title="Data Usage" icon={Wifi}>
              {sub.dataLimit ? (
                <div className="space-y-2">
                  <p className="text-sm text-gray-500">Used / Total</p>
                  <p className="text-xl font-bold text-gray-900">{formatBytes(Number(sub.dataUsed))} <span className="text-sm font-normal text-gray-400">/ {formatBytes(Number(sub.dataLimit))}</span></p>
                  <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
                    <div className="h-3 rounded-full transition-all" style={{ width: `${pctData}%`, backgroundColor: pctData > 80 ? "#e74c3c" : pctData > 60 ? "#f39c12" : "#27ae60" }}/>
                  </div>
                  <p className={`text-xs font-semibold ${pctData > 80 ? "text-red-600" : "text-gray-500"}`}>{pctData}% used</p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-20 text-gray-400 text-sm">
                  <Wifi className="h-6 w-6 mb-1 opacity-30"/>Unlimited / No data cap
                </div>
              )}
            </Widget>
          </div>

          {/* Tabs */}
          <div className="widget">
            <div className="flex gap-0 border-b" style={{ borderColor: "var(--card-border)" }}>
              {TABS.map(({ key, label, count }) => (
                <button key={key} onClick={() => setActiveTab(key)}
                  className={`flex items-center gap-2 px-4 py-3 text-sm font-semibold border-b-2 transition-colors ${activeTab===key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
                  {label}
                  {count !== undefined && <span className="rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] font-bold text-gray-500">{count}</span>}
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              {activeTab === "sessions" && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["Started","Duration","Upload","Download","Status"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {sub.sessions?.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No sessions yet</td></tr> :
                      sub.sessions?.map((s: any) => (
                        <tr key={s.id} className="hover:bg-blue-50/30">
                          <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(s.startTime).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{s.sessionTime ? `${Math.floor(s.sessionTime/60)}m` : s.isActive ? <span className="text-green-600 font-semibold">Active</span> : "—"}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-blue-600">↑{formatBytes(Number(s.uploadBytes))}</td>
                          <td className="px-4 py-2.5 text-xs font-semibold text-green-600">↓{formatBytes(Number(s.downloadBytes))}</td>
                          <td className="px-4 py-2.5"><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${s.isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>{s.isActive ? "Active" : "Ended"}</span></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              {activeTab === "payments" && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["Date","Amount","Method","Receipt","Status"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {sub.payments?.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No payments yet</td></tr> :
                      sub.payments?.map((p: any) => (
                        <tr key={p.id} className="hover:bg-blue-50/30">
                          <td className="px-4 py-2.5 text-xs text-gray-600">{new Date(p.createdAt).toLocaleDateString("en-KE")}</td>
                          <td className="px-4 py-2.5 font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{p.method.replace(/_/g," ")}</td>
                          <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{p.mpesaReceiptNumber ?? "—"}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={p.status}/></td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
              {activeTab === "tickets" && (
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["#","Subject","Priority","Status","Date"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {sub.tickets?.length === 0 ? <tr><td colSpan={5} className="px-4 py-8 text-center text-xs text-gray-400">No tickets yet</td></tr> :
                      sub.tickets?.map((t: any) => (
                        <tr key={t.id} className="hover:bg-blue-50/30">
                          <td className="px-4 py-2.5 font-mono text-xs font-semibold text-blue-600">{t.ticketNumber}</td>
                          <td className="px-4 py-2.5 font-medium text-gray-900">{t.subject}</td>
                          <td className="px-4 py-2.5 text-xs text-gray-600">{t.priority}</td>
                          <td className="px-4 py-2.5"><StatusBadge status={t.status}/></td>
                          <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(t.createdAt).toLocaleDateString("en-KE")}</td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      </div>

      {showAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-gray-900">Assign Package</h3>
              <button onClick={() => setShowAssign(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Package *</label>
                <select value={assignForm.packageId} onChange={e=>setAssignForm(f=>({...f,packageId:e.target.value}))} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }}>
                  <option value="">— Select —</option>
                  {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} — {formatCurrency(p.price)}</option>)}
                </select>
              </div>
              {[["extendFromNow","Start from today (not last expiry)"],["resetDataUsage","Reset data usage counter"]].map(([k,l])=>(
                <label key={k} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                  <input type="checkbox" checked={(assignForm as any)[k]} onChange={e=>setAssignForm(f=>({...f,[k]:e.target.checked}))} className="rounded" />{l}
                </label>
              ))}
            </div>
            <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <button onClick={() => setShowAssign(false)} className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => assignMutation.mutate(assignForm)} disabled={!assignForm.packageId || assignMutation.isPending}
                className="flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--sidebar-bg)" }}>
                {assignMutation.isPending ? "Assigning…" : "Assign & Activate"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
