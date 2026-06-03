"use client";
import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency } from "@/lib/api";
import { Building2, Users, TrendingUp, UserCheck, Plus, ChevronRight } from "lucide-react";
import Link from "next/link";
import { Widget, PageHeader, StatusBadge, Spinner, EmptyState } from "@/components/dashboard/Widget";

export default function SuperDashboard() {
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ["platform-stats"],
    queryFn: () => api.get("/tenants/platform-stats").then(r => r.data),
  });
  const { data: tenants, isLoading: tenantsLoading } = useQuery({
    queryKey: ["tenants"],
    queryFn: () => api.get("/tenants").then(r => r.data),
  });

  const kpis = [
    { label: "Total ISP Clients", val: stats?.tenants ?? "—", icon: Building2, color: "#7c3aed" },
    { label: "Total Subscribers", val: stats?.subscribers ?? "—", icon: Users, color: "#2196f3" },
    { label: "Staff Accounts", val: stats?.users ?? "—", icon: UserCheck, color: "#27ae60" },
    { label: "Total Revenue", val: stats ? formatCurrency(stats.totalRevenue) : "—", icon: TrendingUp, color: "#f39c12" },
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Platform Overview"
        subtitle="All ISP clients on the platform"
        action={
          <Link href="/dashboard/super/tenants/new"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition-colors">
            <Plus className="h-4 w-4" /> Add ISP Client
          </Link>
        }
      />

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {kpis.map(k => (
          <div key={k.label} className="stat-card flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ backgroundColor: k.color + "18" }}>
              <k.icon className="h-5 w-5" style={{ color: k.color }} />
            </div>
            <div>
              <p className="text-xs text-gray-500">{k.label}</p>
              <p className="text-xl font-bold text-gray-900">{statsLoading ? "…" : k.val}</p>
            </div>
          </div>
        ))}
      </div>

      <Widget title="ISP Clients" icon={Building2} noPad
        actions={
          <Link href="/dashboard/super/tenants/new"
            className="mr-2 inline-flex items-center gap-1 rounded-lg bg-purple-50 px-3 py-1 text-xs font-semibold text-purple-700 hover:bg-purple-100 transition-colors">
            <Plus className="h-3 w-3" /> New Client
          </Link>
        }
      >
        {tenantsLoading ? <Spinner /> : !tenants?.length ? <EmptyState msg="No ISP clients yet" /> : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50">
                  {["Client Name", "Email", "Plan", "Subscribers", "Staff", "Status", ""].map(h => (
                    <th key={h} className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--card-border)" }}>
                {tenants.map((t: any) => (
                  <tr key={t.id} className="hover:bg-purple-50/30 transition-colors">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-gray-900">{t.name}</p>
                      <p className="text-xs text-gray-400">{t.slug}</p>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{t.email ?? "—"}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-full px-2.5 py-0.5 text-[11px] font-bold bg-blue-50 text-blue-700">{t.plan}</span>
                    </td>
                    <td className="px-4 py-3 font-semibold text-gray-700">{t._count?.subscribers ?? 0}</td>
                    <td className="px-4 py-3 text-gray-600">{t._count?.users ?? 0}</td>
                    <td className="px-4 py-3"><StatusBadge status={t.isActive ? "ACTIVE" : "SUSPENDED"} /></td>
                    <td className="px-4 py-3">
                      <Link href={`/dashboard/super/tenants/${t.id}`}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-purple-600 hover:text-purple-800">
                        View <ChevronRight className="h-3 w-3" />
                      </Link>
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
