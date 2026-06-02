"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatCurrency } from "@/lib/api";
import { toast } from "sonner";
import { CreditCard, Phone, Loader2, TrendingUp } from "lucide-react";
import { Widget, PageHeader, StatusBadge, TablePager, Spinner, EmptyState } from "@/components/dashboard/Widget";

export default function PaymentsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [stkForm, setStkForm] = useState({ subscriberId: "", phoneNumber: "", amount: "" });
  const [showStk, setShowStk] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["payments", page, status],
    queryFn: () => api.get("/payments", { params: { page, limit: 20, status: status || undefined } }).then(r => r.data),
  });
  const { data: revStats } = useQuery({ queryKey: ["revenue-stats"], queryFn: () => api.get("/payments/revenue/stats").then(r => r.data) });

  const stkMutation = useMutation({
    mutationFn: (d: any) => api.post("/payments/mpesa/stk-push", d),
    onSuccess: (res) => { toast.success(res.data?.customerMessage ?? "STK Push sent!"); setShowStk(false); qc.invalidateQueries({ queryKey: ["payments"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "STK Push failed"),
  });

  const payments = data?.data ?? [];
  const METHOD_COLOR: Record<string,string> = { MPESA_STK:"#27ae60", MPESA_PAYBILL:"#2196f3", CASH:"#f39c12", VOUCHER:"#9b59b6", CARD:"#e74c3c" };

  return (
    <div className="space-y-4">
      <PageHeader title="Payments" subtitle="M-Pesa transactions and payment history"
        action={<button onClick={() => setShowStk(true)} className="inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "#27ae60" }}><Phone className="h-4 w-4"/>STK Push</button>} />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Today", val: formatCurrency(revStats?.today ?? 0), color: "#2196f3" },
          { label: "This Month", val: formatCurrency(revStats?.month ?? 0), color: "#27ae60" },
          { label: "Last Month", val: formatCurrency(revStats?.lastMonth ?? 0), color: "#f39c12" },
          { label: "All Time", val: formatCurrency(revStats?.total ?? 0), color: "#9b59b6" },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-xl font-bold" style={{ color: c.color }}>{c.val}</p>
          </div>
        ))}
      </div>

      <Widget title="Payment Transactions" icon={CreditCard} onUpdate={refetch} noPad
        actions={
          <div className="flex gap-1.5 mr-2">
            {["","COMPLETED","PENDING","FAILED"].map(s => (
              <button key={s} onClick={() => setStatus(s)} className={`rounded px-2 py-0.5 text-[11px] font-semibold border transition-colors ${status===s?"border-blue-500 bg-blue-50 text-blue-700":"border-gray-200 text-gray-500"}`}>{s||"All"}</button>
            ))}
          </div>
        }
      >
        {isLoading ? <Spinner /> : payments.length === 0 ? <EmptyState msg="No payments found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{["Date","Subscriber","Method","Amount","Receipt","Status"].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {payments.map((p: any) => (
                  <tr key={p.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 text-xs text-gray-500">{new Date(p.createdAt).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{p.subscriber?.fullName}</p><p className="text-xs text-gray-400">{p.subscriber?.phone}</p></td>
                    <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: (METHOD_COLOR[p.method]||"#999")+"18", color: METHOD_COLOR[p.method]||"#999" }}>{p.method.replace(/_/g," ")}</span></td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(p.amount)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-gray-500">{p.mpesaReceiptNumber ?? "—"}</td>
                    <td className="px-4 py-3"><StatusBadge status={p.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
            <TablePager meta={data?.meta} page={page} setPage={setPage} />
          </div>
        )}
      </Widget>

      {showStk && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <h3 className="font-bold text-gray-900">M-Pesa STK Push</h3>
              <button onClick={() => setShowStk(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <div className="p-5 space-y-3">
              {[["subscriberId","Subscriber ID","text","cmxxx..."],["phoneNumber","Phone Number","tel","+254712345678"],["amount","Amount (KES)","number","500"]].map(([k,l,t,ph])=>(
                <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={t} value={(stkForm as any)[k]} onChange={e => setStkForm(f=>({...f,[k]:e.target.value}))} placeholder={ph}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-2 focus:ring-green-100" style={{ borderColor: "var(--card-border)" }} /></div>
              ))}
            </div>
            <div className="flex gap-3 border-t px-5 py-4" style={{ borderColor: "var(--card-border)" }}>
              <button onClick={() => setShowStk(false)} className="flex-1 rounded-lg border py-2 text-sm font-medium text-gray-600">Cancel</button>
              <button onClick={() => stkMutation.mutate(stkForm)} disabled={stkMutation.isPending}
                className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-green-600 py-2 text-sm font-bold text-white hover:bg-green-700 disabled:opacity-60">
                {stkMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin"/>Sending…</> : <>Send STK Push</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
