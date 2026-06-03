"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { UserPlus, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Widget, PageHeader } from "@/components/dashboard/Widget";

export default function NewSubscriberPage() {
  const router = useRouter();
  const [form, setForm] = useState({
    fullName: "", phone: "", email: "", nationalId: "",
    address: "", apartmentNumber: "", notes: "",
    username: "", password: "", packageId: "", autoRenew: false,
    connectionType: "HOTSPOT", staticIp: "",
  });

  const { data: packages = [] } = useQuery({ queryKey: ["packages"], queryFn: () => api.get("/packages").then(r => r.data) });

  const mutation = useMutation({
    mutationFn: (d: any) => api.post("/subscribers", d),
    onSuccess: (res) => { toast.success("Subscriber created!"); router.push(`/dashboard/subscribers/${res.data.id}`); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Error creating subscriber"),
  });

  const set = (k: string) => (e: any) => setForm(f => ({ ...f, [k]: e.target.value }));
  const fld = (label: string, key: string, type = "text", ph = "", required = false) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>
      <input type={type} value={(form as any)[key]} onChange={set(key)} placeholder={ph} required={required}
        className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-colors"
        style={{ borderColor: "var(--card-border)" }} />
    </div>
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const data: any = { ...form };
    if (!data.packageId) delete data.packageId;
    mutation.mutate(data);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Link href="/dashboard/subscribers" className="rounded-lg border p-2 text-gray-500 hover:bg-gray-50 transition-colors" style={{ borderColor: "var(--card-border)" }}>
          <ArrowLeft className="h-4 w-4"/>
        </Link>
        <PageHeader title="New Subscriber" subtitle="Register a new internet customer" />
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Widget title="Personal Information" icon={UserPlus}>
            <div className="grid grid-cols-2 gap-4">
              {fld("Full Name", "fullName", "text", "John Doe", true)}
              {fld("Phone Number", "phone", "tel", "+254712345678", true)}
              {fld("Email Address", "email", "email", "john@example.com")}
              {fld("National ID", "nationalId", "text", "12345678")}
              {fld("Address", "address", "text", "123 Main Street, Nairobi")}
              {fld("Apartment / Unit", "apartmentNumber", "text", "Apt 4B")}
            </div>
            <div className="mt-4">
              <label className="block text-xs font-semibold text-gray-600 mb-1">Notes</label>
              <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} rows={2} placeholder="Any notes about this subscriber…"
                className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500 resize-none" style={{ borderColor: "var(--card-border)" }} />
            </div>
          </Widget>

          <Widget title="Connection Type & Credentials">
            <div className="mb-4">
              <label className="block text-xs font-semibold text-gray-600 mb-2">Connection Type <span className="text-red-500">*</span></label>
              <div className="grid grid-cols-2 gap-3">
                {[
                  { val: "HOTSPOT", label: "Hotspot / Wi-Fi", desc: "Captive portal, vouchers, prepaid" },
                  { val: "PPPOE", label: "PPPoE / Wired", desc: "Ethernet to home, monthly billing" },
                ].map(o => (
                  <button key={o.val} type="button"
                    onClick={() => setForm(f => ({ ...f, connectionType: o.val }))}
                    className={`rounded-xl border-2 p-3 text-left transition-colors ${form.connectionType === o.val ? "border-blue-500 bg-blue-50" : "border-gray-200 hover:border-gray-300"}`}>
                    <p className={`text-sm font-bold ${form.connectionType === o.val ? "text-blue-700" : "text-gray-700"}`}>{o.label}</p>
                    <p className="text-xs text-gray-500 mt-0.5">{o.desc}</p>
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              {fld("Username", "username", "text", form.connectionType === "PPPOE" ? "PPPoE username" : "johndoe", true)}
              {fld("Password", "password", "password", "Min 6 chars", true)}
              {form.connectionType === "PPPOE" && fld("Static IP (optional)", "staticIp", "text", "e.g. 192.168.1.10")}
            </div>
            <p className="mt-3 text-xs text-gray-400">
              {form.connectionType === "PPPOE"
                ? "PPPoE: credentials provisioned directly to MikroTik PPP secrets. Subscriber dials with their router."
                : "Hotspot: credentials used for captive portal login and FreeRADIUS authentication."}
            </p>
          </Widget>
        </div>

        <div className="space-y-4">
          <Widget title="Package Assignment">
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Internet Package</label>
                <select value={form.packageId} onChange={set("packageId")} className="w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }}>
                  <option value="">— Assign later —</option>
                  {packages.map((p: any) => <option key={p.id} value={p.id}>{p.name} — KES {p.price}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
                <input type="checkbox" checked={form.autoRenew} onChange={e => setForm(f=>({...f,autoRenew:e.target.checked}))} className="rounded" />
                Auto-renew when expired
              </label>
            </div>
          </Widget>

          <div className="rounded-2xl border bg-white p-5 space-y-3 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
            <button type="submit" disabled={mutation.isPending}
              className="w-full rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--sidebar-bg)" }}>
              {mutation.isPending ? "Creating…" : "Create Subscriber"}
            </button>
            <Link href="/dashboard/subscribers" className="block text-center text-sm text-gray-500 hover:text-gray-700 transition-colors">Cancel</Link>
          </div>
        </div>
      </form>
    </div>
  );
}
