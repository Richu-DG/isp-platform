"use client";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { Building2, Loader2, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/dashboard/Widget";

export default function NewTenantPage() {
  const router = useRouter();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    name: "", slug: "", email: "", phone: "", address: "",
    adminName: "", adminPassword: "", plan: "STARTER",
  });

  const set = (k: string) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.value }));

  const autoSlug = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

  const createMutation = useMutation({
    mutationFn: (data: typeof form) => api.post("/tenants", data),
    onSuccess: () => {
      toast.success("ISP client created! They can now log in.");
      qc.invalidateQueries({ queryKey: ["tenants"] });
      router.push("/dashboard/super/tenants");
    },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Failed to create client"),
  });

  const fields: { key: keyof typeof form; label: string; type?: string; placeholder: string; required?: boolean }[] = [
    { key: "name", label: "Company / ISP Name", placeholder: "e.g. Quicknet Kenya", required: true },
    { key: "slug", label: "Slug (URL identifier)", placeholder: "e.g. quicknet-kenya", required: true },
    { key: "email", label: "Admin Email", type: "email", placeholder: "admin@quicknet.co.ke", required: true },
    { key: "phone", label: "Phone Number", type: "tel", placeholder: "+254712345678" },
    { key: "address", label: "Address / Location", placeholder: "Nairobi, Kenya" },
    { key: "adminName", label: "Admin Full Name", placeholder: "John Kamau" },
    { key: "adminPassword", label: "Admin Password", type: "password", placeholder: "Min 8 characters" },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <PageHeader title="Add ISP Client" subtitle="Create a new ISP operator account on the platform" />

      <Link href="/dashboard/super/tenants"
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors">
        <ArrowLeft className="h-4 w-4" /> Back to Clients
      </Link>

      <div className="rounded-2xl border bg-white p-6 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
        <div className="flex items-center gap-3 mb-6">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-100">
            <Building2 className="h-5 w-5 text-purple-600" />
          </div>
          <div>
            <p className="font-semibold text-gray-900">New ISP Client</p>
            <p className="text-xs text-gray-500">This creates a fully isolated tenant account with its own data</p>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {fields.map(f => (
            <div key={f.key} className={f.key === "address" ? "sm:col-span-2" : ""}>
              <label className="mb-1.5 block text-xs font-semibold text-gray-600">
                {f.label} {f.required && <span className="text-red-500">*</span>}
              </label>
              <input
                type={f.type ?? "text"}
                value={form[f.key]}
                placeholder={f.placeholder}
                onChange={(e) => {
                  set(f.key)(e);
                  if (f.key === "name") setForm(prev => ({ ...prev, name: e.target.value, slug: autoSlug(e.target.value) }));
                }}
                className="w-full rounded-xl border px-3 py-2 text-sm outline-none transition focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
                style={{ borderColor: "var(--card-border)" }}
              />
            </div>
          ))}

          <div>
            <label className="mb-1.5 block text-xs font-semibold text-gray-600">Plan</label>
            <select value={form.plan} onChange={set("plan")}
              className="w-full rounded-xl border px-3 py-2 text-sm outline-none focus:border-purple-500 focus:ring-2 focus:ring-purple-100"
              style={{ borderColor: "var(--card-border)" }}>
              <option value="STARTER">Starter</option>
              <option value="GROWTH">Growth</option>
              <option value="ENTERPRISE">Enterprise</option>
            </select>
          </div>
        </div>

        <div className="mt-4 rounded-xl border border-amber-100 bg-amber-50 p-3">
          <p className="text-xs text-amber-700">
            <strong>Default password:</strong> If left blank, the admin password defaults to <code className="bg-amber-100 px-1 rounded">Admin@123!</code>.
            Share the email + password with the client so they can log in.
          </p>
        </div>

        <div className="mt-6 flex gap-3">
          <Link href="/dashboard/super/tenants"
            className="flex-1 rounded-xl border py-2.5 text-sm font-medium text-gray-600 text-center hover:bg-gray-50 transition-colors"
            style={{ borderColor: "var(--card-border)" }}>
            Cancel
          </Link>
          <button
            onClick={() => createMutation.mutate(form)}
            disabled={createMutation.isPending || !form.name || !form.slug || !form.email}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-2.5 text-sm font-bold text-white hover:bg-purple-700 transition-colors disabled:opacity-60">
            {createMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" /> Creating…</> : <>Create ISP Client</>}
          </button>
        </div>
      </div>
    </div>
  );
}
