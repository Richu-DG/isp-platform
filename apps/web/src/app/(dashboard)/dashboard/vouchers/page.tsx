"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Tag, Download, Plus } from "lucide-react";
import { Widget, PageHeader, Spinner, EmptyState, TablePager } from "@/components/dashboard/Widget";

export default function VouchersPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [batch, setBatch] = useState("");
  const [showGen, setShowGen] = useState(false);
  const [form, setForm] = useState({ quantity: 10, packageId: "", prefix: "", batchName: "", usageLimit: 1, type: "HYBRID" });

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["vouchers", page, batch],
    queryFn: () => api.get("/vouchers", { params: { page, limit: 50, batchName: batch || undefined } }).then(r => r.data),
  });
  const { data: batches = [] } = useQuery({ queryKey: ["voucher-batches"], queryFn: () => api.get("/vouchers/batches").then(r => r.data) });
  const { data: packages = [] } = useQuery({ queryKey: ["packages"], queryFn: () => api.get("/packages").then(r => r.data) });

  const genMutation = useMutation({
    mutationFn: (d: any) => api.post("/vouchers/generate", d),
    onSuccess: (res) => { toast.success(`${res.data.created} vouchers created`); qc.invalidateQueries({ queryKey: ["vouchers","voucher-batches"] }); setShowGen(false); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const vouchers = data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Vouchers" subtitle="Generate, manage and export hotspot voucher codes"
        action={
          <div className="flex gap-2">
            <button onClick={() => window.open(`/api/vouchers/export${batch ? `?batch=${batch}` : ""}`, "_blank")}
              className="inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>
              <Download className="h-4 w-4"/>Export CSV
            </button>
            <button onClick={() => setShowGen(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "var(--sidebar-bg)" }}>
              <Plus className="h-4 w-4"/>Generate
            </button>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-4">
        <div className="lg:col-span-1">
          <Widget title="Batches" icon={Tag}>
            <div className="space-y-1">
              <button onClick={() => setBatch("")} className={`w-full rounded-lg px-3 py-2 text-left text-sm transition-colors ${!batch ? "font-bold text-white" : "text-gray-600 hover:bg-gray-50"}`} style={!batch ? { backgroundColor: "var(--sidebar-active)" } : {}}>
                All Vouchers
              </button>
              {batches.map((b: any) => (
                <button key={b.batchName} onClick={() => setBatch(b.batchName)}
                  className={`w-full rounded-lg px-3 py-2 text-left text-sm flex justify-between items-center transition-colors ${batch===b.batchName ? "font-bold text-white" : "text-gray-600 hover:bg-gray-50"}`}
                  style={batch===b.batchName ? { backgroundColor: "var(--sidebar-active)" } : {}}>
                  <span className="truncate">{b.batchName}</span>
                  <span className="ml-2 shrink-0 rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-bold text-blue-700">{b._count}</span>
                </button>
              ))}
            </div>
          </Widget>
        </div>

        <div className="lg:col-span-3">
          <Widget title={`Vouchers${batch ? ` — ${batch}` : ""}`} onUpdate={refetch} noPad>
            {isLoading ? <Spinner /> : vouchers.length === 0 ? <EmptyState msg="No vouchers in this batch" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["Code","Package","Usage","Expires","Status"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {vouchers.map((v: any) => (
                      <tr key={v.id} className="hover:bg-blue-50/30 transition-colors">
                        <td className="px-4 py-3 font-mono font-bold text-gray-900 text-sm">{v.code}</td>
                        <td className="px-4 py-3 text-gray-600 text-xs">{v.package?.name ?? "—"}</td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-16 rounded-full bg-gray-100"><div className="h-1.5 rounded-full bg-blue-500" style={{ width: `${Math.round(v.usageCount/v.usageLimit*100)}%` }}/></div>
                            <span className="text-xs text-gray-500">{v.usageCount}/{v.usageLimit}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500">{v.expiresAt ? new Date(v.expiresAt).toLocaleDateString("en-KE") : "Never"}</td>
                        <td className="px-4 py-3">
                          <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${v.isActive && v.usageCount < v.usageLimit ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                            {v.usageCount >= v.usageLimit ? "Used" : v.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager meta={data?.meta} page={page} setPage={setPage} />
              </div>
            )}
          </Widget>
        </div>
      </div>

      {showGen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-gray-900">Generate Vouchers</h3>
              <button onClick={() => setShowGen(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[["quantity","Quantity","number","10"],["prefix","Code Prefix","text","VCH"],["batchName","Batch Name","text","Batch-Jan"],["usageLimit","Uses per code","number","1"]].map(([k,l,t,ph])=>(
                <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={t} value={(form as any)[k]} onChange={e=>setForm(f=>({...f,[k]:t==="number"?+e.target.value:e.target.value}))} placeholder={ph}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
              ))}
              <div><label className="block text-xs font-semibold text-gray-600 mb-1">Package</label>
                <select value={form.packageId} onChange={e=>setForm(f=>({...f,packageId:e.target.value}))} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }}>
                  <option value="">— No package —</option>
                  {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <button onClick={() => setShowGen(false)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => genMutation.mutate(form)} disabled={genMutation.isPending}
                className="flex-1 rounded-lg py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--sidebar-bg)" }}>
                {genMutation.isPending ? "Generating…" : `Generate ${form.quantity}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
