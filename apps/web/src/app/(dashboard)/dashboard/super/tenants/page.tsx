"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Plus, Search, CheckCircle, XCircle, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Widget, PageHeader, StatusBadge, Spinner, EmptyState } from "@/components/dashboard/Widget";

export default function TenantsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: tenants, isLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants").then(r => r.data),
  });

  const suspendMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tenants/${id}/suspend`),
    onSuccess: () => { toast.success("Client suspended"); qc.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: () => toast.error("Failed to suspend client"),
  });

  const activateMutation = useMutation({
    mutationFn: (id: string) => api.patch(`/tenants/${id}/activate`),
    onSuccess: () => { toast.success("Client activated"); qc.invalidateQueries({ queryKey: ["tenants"] }); },
    onError: () => toast.error("Failed to activate client"),
  });

  const filtered = (tenants ?? []).filter((t: any) =>
    !search || t.name.toLowerCase().includes(search.toLowerCase()) || t.email?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <PageHeader
        title="ISP Clients"
        subtitle="All registered ISP operators on the platform"
        action={
          <Link href="/dashboard/super/tenants/new"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition-colors">
            <Plus className="h-4 w-4" /> Add Client
          </Link>
        }
      />

      <Widget title="All Clients" icon={Building2} noPad
        actions={
          <div className="relative mr-2">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search clients…"
              className="rounded-lg border border-gray-200 py-1 pl-8 pr-3 text-xs outline-none focus:border-purple-400 focus:ring-1 focus:ring-purple-100 w-44" />
          </div>
        }
      >
        {isLoading ? <Spinner /> : filtered.length === 0 ? <EmptyState msg="No clients found" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Client", "Contact", "Plan", "Subscribers", "Routers", "Status", "Actions"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {filtered.map((t: any) => (
                  <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400 font-mono">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-gray-600">{t.email ?? "—"}</p>
                      <p className="text-xs text-gray-400">{t.phone ?? ""}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700">{t.plan}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{t._count?.subscribers ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{t._count?.routers ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.isActive ? "ACTIVE" : "SUSPENDED"} /></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        {t.isActive ? (
                          <button onClick={() => { if (confirm(`Suspend ${t.name}?`)) suspendMutation.mutate(t.id); }}
                            className="inline-flex items-center gap-1 rounded-lg bg-red-50 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-100 transition-colors">
                            <XCircle className="h-3 w-3" /> Suspend
                          </button>
                        ) : (
                          <button onClick={() => activateMutation.mutate(t.id)}
                            className="inline-flex items-center gap-1 rounded-lg bg-green-50 px-2 py-1 text-[11px] font-semibold text-green-700 hover:bg-green-100 transition-colors">
                            <CheckCircle className="h-3 w-3" /> Activate
                          </button>
                        )}
                        <Link href={`/dashboard/super/tenants/${t.id}`}
                          className="inline-flex items-center gap-1 rounded-lg bg-gray-50 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-100 transition-colors">
                          View <ChevronRight className="h-3 w-3" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Widget>
    </div>
  );
}
