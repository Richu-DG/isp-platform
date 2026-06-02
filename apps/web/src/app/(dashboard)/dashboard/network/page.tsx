"use client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Router, Wifi, Activity, RefreshCw, CheckCircle, XCircle, Plus } from "lucide-react";
import { Widget, PageHeader, Spinner, EmptyState } from "@/components/dashboard/Widget";
import { useState } from "react";

export default function NetworkPage() {
  const qc = useQueryClient();
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", ipAddress: "", apiPort: 8728, username: "admin", password: "", type: "HOTSPOT", location: "" });

  const { data: overview, isLoading, refetch } = useQuery({
    queryKey: ["network-overview"],
    queryFn: () => api.get("/monitoring/overview").then(r => r.data),
    refetchInterval: 15000,
  });
  const { data: sessions = [], refetch: refetchSessions } = useQuery({
    queryKey: ["active-sessions"],
    queryFn: () => api.get("/sessions/active").then(r => r.data),
    refetchInterval: 10000,
  });
  const { data: sessionStats } = useQuery({ queryKey: ["session-stats"], queryFn: () => api.get("/sessions/stats").then(r => r.data) });

  const testMutation = useMutation({
    mutationFn: ({ tenantId, id }: any) => api.get(`/mikrotik/routers/${id}/test`),
    onSuccess: (res) => toast.success(res.data?.online ? "Router is online ✓" : "Router is offline"),
  });
  const addRouterMutation = useMutation({
    mutationFn: (d: any) => api.post("/mikrotik/routers", d),
    onSuccess: () => { toast.success("Router added"); qc.invalidateQueries({ queryKey: ["network-overview"] }); setShowAdd(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });
  const refreshMutation = useMutation({
    mutationFn: () => api.post("/monitoring/refresh"),
    onSuccess: () => { toast.success("Refreshed"); refetch(); },
  });

  const routers = overview?.routers ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Network" subtitle="Routers, access points and live sessions"
        action={
          <div className="flex gap-2">
            <button onClick={() => refreshMutation.mutate()} disabled={refreshMutation.isPending} className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>
              <RefreshCw className={`h-4 w-4 ${refreshMutation.isPending ? "animate-spin" : ""}`}/>Poll All
            </button>
            <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "var(--sidebar-bg)" }}>
              <Plus className="h-4 w-4"/>Add Router
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Total Routers", val: routers.length, color: "#2196f3" },
          { label: "Online", val: overview?.onlineRouters ?? 0, color: "#27ae60" },
          { label: "Offline", val: overview?.offlineRouters ?? 0, color: "#e74c3c" },
          { label: "Active Sessions", val: sessionStats?.active ?? 0, color: "#f39c12" },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.val}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Widget title="Routers" icon={Router} onUpdate={refetch} noPad>
          {isLoading ? <Spinner /> : routers.length === 0 ? <EmptyState msg="No routers configured" /> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{["Router","IP","Type","Status","CPU","Action"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {routers.map((r: any) => (
                  <tr key={r.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900">{r.name}</p><p className="text-xs text-gray-400">{r.location || "—"}</p></td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-600">{r.ipAddress}:{r.apiPort}</td>
                    <td className="px-4 py-3"><span className="rounded-full bg-blue-50 px-2 py-0.5 text-[11px] font-semibold text-blue-700">{r.type}</span></td>
                    <td className="px-4 py-3">
                      {r.isOnline
                        ? <span className="flex items-center gap-1 text-xs font-semibold text-green-600"><CheckCircle className="h-3.5 w-3.5"/>Online</span>
                        : <span className="flex items-center gap-1 text-xs font-semibold text-red-500"><XCircle className="h-3.5 w-3.5"/>Offline</span>}
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-600">{r.cpuLoad != null ? `${r.cpuLoad}%` : "—"}</td>
                    <td className="px-4 py-3"><button onClick={() => testMutation.mutate({ id: r.id })} disabled={testMutation.isPending} className="rounded-lg bg-gray-50 border px-2.5 py-1 text-[11px] font-semibold text-gray-600 hover:bg-blue-50 hover:text-blue-700 hover:border-blue-200 transition-colors" style={{ borderColor: "var(--card-border)" }}>Test</button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Widget>

        <Widget title="Active Sessions" icon={Activity} onUpdate={refetchSessions} noPad>
          {sessions.length === 0 ? <EmptyState msg="No active sessions" /> : (
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{["User","IP","MAC","Uptime","Up/Down"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {sessions.slice(0, 20).map((s: any) => (
                  <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3"><p className="font-semibold text-gray-900 text-xs">{s.subscriber?.fullName ?? s.username}</p><p className="text-[10px] text-gray-400">{s.username}</p></td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-600">{s.framedIpAddress ?? "—"}</td>
                    <td className="px-4 py-3 font-mono text-[11px] text-gray-500">{s.macAddress?.slice(0,14) ?? "—"}</td>
                    <td className="px-4 py-3 text-[11px] text-gray-600">{s.sessionTime ? `${Math.floor(s.sessionTime/60)}m` : "Active"}</td>
                    <td className="px-4 py-3 text-[11px]">
                      <span className="text-blue-600">↑{(s.uploadBytes/1e6).toFixed(1)}MB</span>
                      {" / "}
                      <span className="text-green-600">↓{(s.downloadBytes/1e6).toFixed(1)}MB</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Widget>
      </div>

      {showAdd && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-gray-900">Add Router</h3>
              <button onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[["name","Router Name","text","Office MikroTik"],["ipAddress","IP Address","text","192.168.1.1"],["username","API Username","text","admin"],["password","API Password","password",""],["location","Location","text","Server Room"]].map(([k,l,t,ph])=>(
                <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
              ))}
              <div className="grid grid-cols-2 gap-3">
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">API Port</label>
                  <input type="number" value={form.apiPort} onChange={e=>setForm(f=>({...f,apiPort:+e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
                <div><label className="block text-xs font-semibold text-gray-600 mb-1">Type</label>
                  <select value={form.type} onChange={e=>setForm(f=>({...f,type:e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }}>
                    <option value="HOTSPOT">Hotspot</option><option value="PPPOE">PPPoE</option><option value="BOTH">Both</option>
                  </select>
                </div>
              </div>
            </div>
            <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <button onClick={() => setShowAdd(false)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => addRouterMutation.mutate(form)} disabled={addRouterMutation.isPending} className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--sidebar-bg)" }}>
                {addRouterMutation.isPending ? "Adding…" : "Add Router"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
