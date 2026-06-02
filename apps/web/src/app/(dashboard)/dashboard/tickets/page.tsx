"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Ticket, Plus, MessageSquare } from "lucide-react";
import { Widget, PageHeader, StatusBadge, TablePager, Spinner, EmptyState } from "@/components/dashboard/Widget";

const PRIORITY_COLOR: Record<string,string> = { LOW:"#27ae60", MEDIUM:"#f39c12", HIGH:"#e67e22", URGENT:"#e74c3c" };

export default function TicketsPage() {
  const qc = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState("");
  const [selected, setSelected] = useState<any>(null);
  const [comment, setComment] = useState("");

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["tickets", page, status],
    queryFn: () => api.get("/tickets", { params: { page, limit: 20, status: status || undefined } }).then(r => r.data),
  });
  const { data: detail, refetch: refetchDetail } = useQuery({
    queryKey: ["ticket", selected?.id],
    queryFn: () => api.get(`/tickets/${selected.id}`).then(r => r.data),
    enabled: !!selected?.id,
  });

  const commentMutation = useMutation({
    mutationFn: (d: any) => api.post(`/tickets/${selected.id}/comments`, d),
    onSuccess: () => { toast.success("Comment added"); setComment(""); refetchDetail(); },
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, ...d }: any) => api.patch(`/tickets/${id}`, d),
    onSuccess: () => { toast.success("Updated"); qc.invalidateQueries({ queryKey: ["tickets"] }); refetchDetail(); },
  });

  const tickets = data?.data ?? [];

  return (
    <div className="space-y-4">
      <PageHeader title="Trouble Tickets" subtitle="Customer support tickets and issue tracking" />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className={selected ? "lg:col-span-2" : "lg:col-span-3"}>
          <Widget title="Support Tickets" icon={Ticket} onUpdate={refetch} noPad
            actions={
              <div className="flex gap-1.5 mr-2">
                {["","OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s => (
                  <button key={s} onClick={() => setStatus(s)} className={`rounded px-2 py-0.5 text-[11px] font-semibold border transition-colors ${status===s?"border-blue-500 bg-blue-50 text-blue-700":"border-gray-200 text-gray-500"}`}>{s.replace("_"," ")||"All"}</button>
                ))}
              </div>
            }
          >
            {isLoading ? <Spinner /> : tickets.length === 0 ? <EmptyState msg="No tickets found" /> : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead><tr className="bg-gray-50">{["#","Subject","Subscriber","Priority","Status","Comments",""].map(h=><th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>)}</tr></thead>
                  <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                    {tickets.map((t: any) => (
                      <tr key={t.id} className="hover:bg-blue-50/30 transition-colors cursor-pointer" onClick={() => setSelected(t)}>
                        <td className="px-4 py-3 font-mono text-xs font-semibold text-blue-600">{t.ticketNumber}</td>
                        <td className="px-4 py-3 font-medium text-gray-900 max-w-[200px] truncate">{t.subject}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{t.subscriber?.fullName}<br/><span className="text-gray-400">{t.subscriber?.phone}</span></td>
                        <td className="px-4 py-3"><span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: (PRIORITY_COLOR[t.priority]||"#999")+"18", color: PRIORITY_COLOR[t.priority]||"#999" }}>{t.priority}</span></td>
                        <td className="px-4 py-3"><StatusBadge status={t.status} /></td>
                        <td className="px-4 py-3 text-center text-xs font-semibold text-gray-500">{t._count?.comments ?? 0}</td>
                        <td className="px-4 py-3"><button className="rounded p-1.5 text-blue-500 hover:bg-blue-50"><MessageSquare className="h-3.5 w-3.5"/></button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <TablePager meta={data?.meta} page={page} setPage={setPage} />
              </div>
            )}
          </Widget>
        </div>

        {selected && detail && (
          <div>
            <Widget title={detail.ticketNumber} icon={MessageSquare} actions={<button onClick={() => setSelected(null)} className="text-gray-400 hover:text-gray-600 mr-2 text-xs">✕ Close</button>}>
              <div className="space-y-3">
                <div><p className="font-semibold text-gray-900 text-sm">{detail.subject}</p><p className="text-xs text-gray-500 mt-1">{detail.description}</p></div>
                <div className="flex gap-2">
                  <StatusBadge status={detail.status} />
                  <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold" style={{ backgroundColor: (PRIORITY_COLOR[detail.priority]||"#999")+"18", color: PRIORITY_COLOR[detail.priority]||"#999" }}>{detail.priority}</span>
                </div>
                <div className="flex gap-2">
                  {["OPEN","IN_PROGRESS","RESOLVED","CLOSED"].map(s => (
                    <button key={s} onClick={() => updateMutation.mutate({ id: detail.id, status: s })}
                      className={`rounded px-2 py-1 text-[10px] font-bold border transition-colors ${detail.status===s?"border-blue-500 bg-blue-600 text-white":"border-gray-200 text-gray-500 hover:border-blue-300"}`}>
                      {s.replace("_"," ")}
                    </button>
                  ))}
                </div>
                <div className="max-h-48 space-y-2 overflow-y-auto">
                  {(detail.comments||[]).map((c: any) => (
                    <div key={c.id} className={`rounded-lg p-2.5 text-xs ${c.isInternal ? "bg-yellow-50 border border-yellow-100" : "bg-gray-50"}`}>
                      <p className="font-semibold text-gray-700 mb-1">{c.author?.name ?? "System"} <span className="font-normal text-gray-400">{new Date(c.createdAt).toLocaleString("en-KE",{dateStyle:"short",timeStyle:"short"})}</span></p>
                      <p className="text-gray-600">{c.content}</p>
                    </div>
                  ))}
                </div>
                <div>
                  <textarea value={comment} onChange={e => setComment(e.target.value)} rows={3} placeholder="Add a comment…"
                    className="w-full rounded-lg border px-3 py-2 text-xs outline-none focus:border-blue-500 resize-none" style={{ borderColor: "var(--card-border)" }} />
                  <button onClick={() => commentMutation.mutate({ content: comment })} disabled={!comment || commentMutation.isPending}
                    className="mt-1.5 w-full rounded-lg py-1.5 text-xs font-bold text-white disabled:opacity-40" style={{ backgroundColor: "var(--sidebar-bg)" }}>
                    {commentMutation.isPending ? "Posting…" : "Post Comment"}
                  </button>
                </div>
              </div>
            </Widget>
          </div>
        )}
      </div>
    </div>
  );
}
