"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, formatCurrency } from "@/lib/api";
import { toast } from "sonner";
import { Receipt, CheckCircle, Search } from "lucide-react";
import { Widget, PageHeader, StatusBadge, TablePager, Spinner, EmptyState } from "@/components/dashboard/Widget";

export default function BillingPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["invoices", page, status],
    queryFn: () => api.get("/billing/invoices", { params: { page, limit: 20, status: status || undefined } }).then(r => r.data),
  });
  const { data: outstanding } = useQuery({ queryKey: ["outstanding"], queryFn: () => api.get("/billing/outstanding").then(r => r.data) });
  const markPaidMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/billing/invoices/${id}/mark-paid`),
    onSuccess: () => { toast.success("Marked as paid"); qc.invalidateQueries({ queryKey: ["invoices"] }); },
  });

  const invoices = data?.data ?? [];
  return (
    <div className="space-y-4">
      <PageHeader title="Billing & Invoices" subtitle="Track all invoices and outstanding balances" />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Outstanding", val: formatCurrency(outstanding?.total ?? 0), color: "#e74c3c" },
          { label: "Pending Invoices", val: outstanding?.count ?? 0, color: "#f39c12" },
          { label: "Paid This Month", val: "—", color: "#27ae60" },
          { label: "Total Invoiced", val: "—", color: "#2196f3" },
        ].map(c => (
          <div key={c.label} className="stat-card">
            <p className="text-xs text-gray-500">{c.label}</p>
            <p className="text-2xl font-bold" style={{ color: c.color }}>{c.val}</p>
          </div>
        ))}
      </div>

      <Widget title="Invoices" icon={Receipt} onUpdate={refetch} noPad
        actions={
          <div className="flex gap-2 mr-2">
            {["","PENDING","PAID","OVERDUE"].map(s => (
              <button key={s} onClick={() => setStatus(s)}
                className={`rounded px-2 py-0.5 text-[11px] font-semibold border transition-colors ${status===s?"border-blue-500 bg-blue-50 text-blue-700":"border-gray-200 text-gray-500 hover:border-gray-300"}`}>
                {s || "All"}
              </button>
            ))}
          </div>
        }
      >
        {isLoading ? <Spinner /> : invoices.length === 0 ? <EmptyState msg="No invoices found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead><tr className="bg-gray-50">{["Invoice #","Subscriber","Amount","Tax","Total","Due Date","Status",""].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {invoices.map((inv: any) => (
                  <tr key={inv.id} className="hover:bg-blue-50/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3"><p className="font-medium text-gray-900">{inv.subscriber?.fullName}</p><p className="text-xs text-gray-400">{inv.subscriber?.phone}</p></td>
                    <td className="px-4 py-3 text-gray-700">{formatCurrency(inv.amount)}</td>
                    <td className="px-4 py-3 text-gray-500">{formatCurrency(inv.taxAmount)}</td>
                    <td className="px-4 py-3 font-bold text-gray-900">{formatCurrency(inv.total)}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{new Date(inv.dueDate).toLocaleDateString("en-KE")}</td>
                    <td className="px-4 py-3"><StatusBadge status={inv.status} /></td>
                    <td className="px-4 py-3">
                      {inv.status === "PENDING" && (
                        <button onClick={() => markPaidMutation.mutate(inv.id)}
                          className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2.5 py-1 text-xs font-semibold text-green-700 hover:bg-green-100 transition-colors">
                          <CheckCircle className="h-3 w-3"/>Mark Paid
                        </button>
                      )}
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
  );
}
