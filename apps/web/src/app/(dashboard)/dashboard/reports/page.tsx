"use client";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency, formatBytes } from "@/lib/api";
import { FileText, Download, Users, CreditCard, Activity } from "lucide-react";
import { Widget, PageHeader, StatusBadge, Spinner } from "@/components/dashboard/Widget";

export default function ReportsPage() {
  const today = new Date().toISOString().slice(0,10);
  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString().slice(0,10);
  const [dateRange, setDateRange] = useState({ from: monthStart, to: today });
  const [activeTab, setActiveTab] = useState<"revenue"|"subscribers"|"usage">("revenue");

  const { data: revenue, isLoading: revLoading, refetch: refetchRev } = useQuery({
    queryKey: ["report-revenue", dateRange],
    queryFn: () => api.get("/reports/revenue", { params: dateRange }).then(r => r.data),
  });
  const { data: subscribers, isLoading: subLoading } = useQuery({
    queryKey: ["report-subscribers"],
    queryFn: () => api.get("/reports/subscribers").then(r => r.data),
  });
  const { data: usage, isLoading: useLoading } = useQuery({
    queryKey: ["report-usage", dateRange],
    queryFn: () => api.get("/reports/usage", { params: dateRange }).then(r => r.data),
  });

  const TABS = [
    { key: "revenue", label: "Revenue", icon: CreditCard },
    { key: "subscribers", label: "Subscribers", icon: Users },
    { key: "usage", label: "Usage", icon: Activity },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="Reports" subtitle="Export and analyse your ISP data"
        action={
          <a href={`/api/v1/reports/revenue/csv?from=${dateRange.from}&to=${dateRange.to}`}
            className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>
            <Download className="h-4 w-4"/>Export CSV
          </a>
        }
      />

      <div className="flex items-center gap-4 rounded-2xl border bg-white p-4 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">From:</label>
          <input type="date" value={dateRange.from} onChange={e => setDateRange(d => ({...d, from: e.target.value}))} className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-gray-600">To:</label>
          <input type="date" value={dateRange.to} onChange={e => setDateRange(d => ({...d, to: e.target.value}))} className="rounded-lg border px-3 py-1.5 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} />
        </div>
        <div className="flex gap-1.5 ml-auto">
          {[["7d","7 Days"],["30d","30 Days"],["90d","90 Days"]].map(([k,l]) => (
            <button key={k} onClick={() => {
              const d = new Date(); const from = new Date(d);
              from.setDate(d.getDate() - (k==="7d"?7:k==="30d"?30:90));
              setDateRange({ from: from.toISOString().slice(0,10), to: d.toISOString().slice(0,10) });
            }} className="rounded-lg border px-3 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>{l}</button>
          ))}
        </div>
      </div>

      <div className="flex gap-1 border-b" style={{ borderColor: "var(--card-border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setActiveTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${activeTab===key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon className="h-4 w-4"/>{label}
          </button>
        ))}
      </div>

      {activeTab === "revenue" && (
        <Widget title={`Revenue — ${dateRange.from} to ${dateRange.to}`} icon={CreditCard} noPad>
          {revLoading ? <Spinner /> : !revenue ? null : (
            <>
              <div className="flex gap-4 p-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="rounded-xl bg-green-50 px-5 py-3 text-center"><p className="text-2xl font-bold text-green-700">{formatCurrency(revenue.total)}</p><p className="text-xs text-green-600 mt-0.5">Total Revenue</p></div>
                <div className="rounded-xl bg-blue-50 px-5 py-3 text-center"><p className="text-2xl font-bold text-blue-700">{revenue.count}</p><p className="text-xs text-blue-600 mt-0.5">Transactions</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["Date","Subscriber","Phone","Method","Amount","Receipt"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {revenue.payments?.slice(0,100).map((p: any) => (
                      <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(p.createdAt).toLocaleDateString("en-KE")}</td>
                        <td className="px-4 py-2.5 font-medium text-gray-900">{p.subscriber?.fullName}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{p.subscriber?.phone}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{p.method.replace(/_/g," ")}</td>
                        <td className="px-4 py-2.5 font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                        <td className="px-4 py-2.5 font-mono text-[11px] text-gray-400">{p.mpesaReceiptNumber ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Widget>
      )}

      {activeTab === "subscribers" && (
        <Widget title="Subscriber Report" icon={Users} noPad>
          {subLoading ? <Spinner /> : !subscribers ? null : (
            <>
              <div className="flex flex-wrap gap-3 p-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                {[["total","#1a2744"],["active","#27ae60"],["expired","#e74c3c"],["suspended","#f39c12"],["pending","#2196f3"]].map(([k,c])=>(
                  <div key={k} className="rounded-xl px-4 py-2.5 text-center" style={{ backgroundColor: c+"18" }}>
                    <p className="text-xl font-bold" style={{ color: c }}>{(subscribers.summary as any)[k] ?? 0}</p>
                    <p className="text-[10px] font-semibold uppercase" style={{ color: c }}>{k}</p>
                  </div>
                ))}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["Name","Phone","Package","Status","Joined"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {subscribers.subscribers?.slice(0,100).map((s: any) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-900">{s.fullName}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.phone}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.package?.name ?? "—"}</td>
                        <td className="px-4 py-2.5"><StatusBadge status={s.status} /></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(s.createdAt).toLocaleDateString("en-KE")}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Widget>
      )}

      {activeTab === "usage" && (
        <Widget title="Bandwidth Usage Report" icon={Activity} noPad>
          {useLoading ? <Spinner /> : !usage ? null : (
            <>
              <div className="flex gap-4 p-4 border-b" style={{ borderColor: "var(--card-border)" }}>
                <div className="rounded-xl bg-blue-50 px-5 py-3 text-center"><p className="text-xl font-bold text-blue-700">{formatBytes(usage.totalUpload)}</p><p className="text-xs text-blue-600 mt-0.5">Total Upload</p></div>
                <div className="rounded-xl bg-green-50 px-5 py-3 text-center"><p className="text-xl font-bold text-green-700">{formatBytes(usage.totalDownload)}</p><p className="text-xs text-green-600 mt-0.5">Total Download</p></div>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["User","Started","Duration","Upload","Download"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {usage.sessions?.slice(0,50).map((s: any) => (
                      <tr key={s.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-2.5"><p className="font-medium text-gray-900">{s.subscriber?.fullName ?? s.username}</p></td>
                        <td className="px-4 py-2.5 text-xs text-gray-500">{new Date(s.startTime).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                        <td className="px-4 py-2.5 text-xs text-gray-600">{s.sessionTime ? `${Math.floor(s.sessionTime/3600)}h ${Math.floor((s.sessionTime%3600)/60)}m` : "—"}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-blue-600">↑ {formatBytes(s.uploadBytes)}</td>
                        <td className="px-4 py-2.5 text-xs font-semibold text-green-600">↓ {formatBytes(s.downloadBytes)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Widget>
      )}
    </div>
  );
}
