"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatCurrency } from "@/lib/api";
import { toast } from "sonner";
import { Package, Plus, Pencil, Trash2, Zap, Clock, Database } from "lucide-react";
import { Widget, PageHeader, StatusBadge, Spinner, EmptyState } from "@/components/dashboard/Widget";

const TYPES: Record<string, { label: string; color: string }> = {
  HYBRID:     { label: "Hybrid",    color: "#2196f3" },
  TIME_BASED: { label: "Time",      color: "#9b59b6" },
  DATA_BASED: { label: "Data",      color: "#27ae60" },
  UNLIMITED:  { label: "Unlimited", color: "#f39c12" },
};

function fmtBytes(b?: number) {
  if (!b) return "—";
  if (b >= 1e9) return `${(b / 1e9).toFixed(0)} GB`;
  if (b >= 1e6) return `${(b / 1e6).toFixed(0)} MB`;
  return `${b} B`;
}

function Modal({ pkg, onClose }: { pkg?: any; onClose: () => void }) {
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: pkg?.name ?? "", description: pkg?.description ?? "",
    type: pkg?.type ?? "HYBRID",
    speedDown: pkg?.speedDown ?? "", speedUp: pkg?.speedUp ?? "",
    dataCap: pkg?.dataCap ? (pkg.dataCap / 1e9).toFixed(0) : "",
    duration: pkg?.duration ?? "", price: pkg?.price ?? "",
    taxRate: pkg?.taxRate ?? 16,
    radiusProfile: pkg?.radiusProfile ?? "", mikrotikProfile: pkg?.mikrotikProfile ?? "",
    isActive: pkg?.isActive ?? true, isPublic: pkg?.isPublic ?? true,
  });

  const mutation = useMutation({
    mutationFn: (d: any) => pkg ? api.put(`/packages/${pkg.id}`, d) : api.post("/packages", d),
    onSuccess: () => { toast.success(pkg ? "Updated" : "Created"); qc.invalidateQueries({ queryKey: ["packages"] }); onClose(); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error"),
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));
  const fld = (label: string, key: string, type = "text", ph = "") => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}</label>
      <input type={type} value={(form as any)[key]} onChange={set(key)} placeholder={ph}
        className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
        style={{ borderColor: "var(--card-border)" }} />
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
      <form onSubmit={e => { e.preventDefault(); mutation.mutate({ ...form, speedDown: form.speedDown ? +form.speedDown : undefined, speedUp: form.speedUp ? +form.speedUp : undefined, dataCap: form.dataCap ? +form.dataCap * 1e9 : undefined, duration: form.duration ? +form.duration : undefined, price: +form.price, taxRate: +form.taxRate }); }}
        className="w-full max-w-lg rounded-2xl bg-white shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
          <h3 className="font-bold text-gray-900">{pkg ? "Edit Package" : "New Package"}</h3>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            {fld("Package Name *", "name", "text", "Monthly 20GB")}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">Type *</label>
              <select value={form.type} onChange={set("type")} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }}>
                {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          </div>
          <div><label className="block text-xs font-semibold text-gray-600 mb-1">Description</label>
            <textarea value={form.description} onChange={set("description")} rows={2} placeholder="Package description" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500 resize-none" style={{ borderColor: "var(--card-border)" }} /></div>
          <div className="grid grid-cols-3 gap-3">{fld("Price (KES) *","price","number","500")}{fld("Tax (%)","taxRate","number","16")}{fld("Duration (days)","duration","number","30")}</div>
          <div className="grid grid-cols-3 gap-3">{fld("Speed Down (Mbps)","speedDown","number","20")}{fld("Speed Up (Mbps)","speedUp","number","10")}{fld("Data Cap (GB)","dataCap","number","50")}</div>
          <div className="grid grid-cols-2 gap-3">{fld("RADIUS Profile","radiusProfile","text","monthly-20gb")}{fld("MikroTik Profile","mikrotikProfile","text","monthly-20gb")}</div>
          <div className="flex gap-4">
            {[["isActive","Active"],["isPublic","Visible on portal"]].map(([k,l]) => (
              <label key={k} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={(form as any)[k]} onChange={e => setForm(f => ({...f,[k]:e.target.checked}))} className="rounded" />{l}
              </label>
            ))}
          </div>
        </div>
        <div className="flex justify-end gap-3 border-t px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
          <button type="button" onClick={onClose} className="rounded-lg border px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50" style={{ borderColor: "var(--card-border)" }}>Cancel</button>
          <button type="submit" disabled={mutation.isPending} className="rounded-lg px-4 py-2 text-sm font-bold text-white disabled:opacity-60" style={{ backgroundColor: "var(--sidebar-bg)" }}>
            {mutation.isPending ? "Saving…" : pkg ? "Update" : "Create"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function PackagesPage() {
  const qc = useQueryClient();
  const [modal, setModal] = useState<any>(null);
  const [delId, setDelId] = useState<string | null>(null);
  const { data: pkgs = [], isLoading, refetch } = useQuery({ queryKey: ["packages"], queryFn: () => api.get("/packages?all=true").then(r => r.data) });
  const delMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/packages/${id}`),
    onSuccess: () => { toast.success("Deleted"); qc.invalidateQueries({ queryKey: ["packages"] }); setDelId(null); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Cannot delete"),
  });

  return (
    <div className="space-y-4">
      <PageHeader title="Packages" subtitle="Manage internet packages and pricing"
        action={<button onClick={() => setModal({})} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "var(--sidebar-bg)" }}><Plus className="h-4 w-4" />New Package</button>} />
      <Widget title="All Packages" icon={Package} onUpdate={refetch} noPad>
        {isLoading ? <Spinner /> : pkgs.length === 0 ? <EmptyState msg="No packages yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50 text-left">{["Package","Type","Speed","Data / Duration","Price","Subscribers","Status",""].map(h=><th key={h} className="px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {pkgs.map((p: any) => {
                  const t = TYPES[p.type] ?? TYPES.HYBRID;
                  return (
                    <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                      <td className="px-4 py-3"><p className="font-semibold text-gray-900">{p.name}</p><p className="text-xs text-gray-400 truncate max-w-[160px]">{p.description}</p></td>
                      <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: t.color+"18", color: t.color }}>{t.label}</span></td>
                      <td className="px-4 py-3 text-xs text-gray-600">{p.speedDown ? <span className="flex items-center gap-1"><Zap className="h-3 w-3 text-yellow-500"/>{p.speedDown}/{p.speedUp??0} Mbps</span> : "—"}</td>
                      <td className="px-4 py-3 text-xs text-gray-600">
                        <div className="space-y-0.5">
                          {p.dataCap && <div className="flex items-center gap-1"><Database className="h-3 w-3 text-blue-400"/>{fmtBytes(p.dataCap)}</div>}
                          {p.duration && <div className="flex items-center gap-1"><Clock className="h-3 w-3 text-purple-400"/>{p.duration} days</div>}
                          {!p.dataCap && !p.duration && "—"}
                        </div>
                      </td>
                      <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(p.price)}</td>
                      <td className="px-4 py-3 text-center font-semibold text-blue-600">{p._count?.subscribers ?? 0}</td>
                      <td className="px-4 py-3"><StatusBadge status={p.isActive ? "ACTIVE" : "SUSPENDED"} /></td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1.5">
                          <button onClick={() => setModal(p)} className="rounded p-1.5 text-blue-500 hover:bg-blue-50"><Pencil className="h-3.5 w-3.5"/></button>
                          <button onClick={() => setDelId(p.id)} className="rounded p-1.5 text-red-400 hover:bg-red-50"><Trash2 className="h-3.5 w-3.5"/></button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Widget>
      {modal !== null && <Modal pkg={Object.keys(modal).length > 0 ? modal : undefined} onClose={() => setModal(null)} />}
      {delId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="rounded-2xl bg-white p-6 w-80 shadow-2xl">
            <p className="font-bold text-gray-900 mb-2">Delete Package?</p>
            <p className="text-sm text-gray-500 mb-4">Subscribers on this package keep their access but cannot renew.</p>
            <div className="flex gap-3">
              <button onClick={() => setDelId(null)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => delMutation.mutate(delId)} disabled={delMutation.isPending} className="flex-1 rounded-lg bg-red-600 py-2 text-sm font-bold text-white hover:bg-red-700 disabled:opacity-60">
                {delMutation.isPending ? "…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
