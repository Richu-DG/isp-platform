"use client";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Settings, Building2, Users, Bell, Shield, Key } from "lucide-react";
import { Widget, PageHeader } from "@/components/dashboard/Widget";
import { useAuthStore } from "@/store/auth.store";

export default function SettingsPage() {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"company"|"users"|"billing"|"security">("company");
  const { data: tenant } = useQuery({ queryKey: ["tenant-me"], queryFn: () => api.get("/tenants/me").then(r => r.data) });
  const [settings, setSettings] = useState<any>({});
  const updateMutation = useMutation({
    mutationFn: (d: any) => api.patch("/tenants/settings", d),
    onSuccess: () => { toast.success("Settings saved"); qc.invalidateQueries({ queryKey: ["tenant-me"] }); },
  });

  const TABS = [
    { key: "company", label: "Company", icon: Building2 },
    { key: "users", label: "Users", icon: Users },
    { key: "billing", label: "Billing Config", icon: Bell },
    { key: "security", label: "Security", icon: Shield },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Configure your ISP platform" />
      <div className="flex gap-1 border-b" style={{ borderColor: "var(--card-border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab===key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon className="h-4 w-4"/>{label}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <Widget title="Company Information" icon={Building2}>
          <div className="space-y-4 max-w-md">
            {tenant && (
              <>
                {[["Company Name", tenant.name], ["Email", tenant.email||"—"], ["Phone", tenant.phone||"—"], ["Address", tenant.address||"—"], ["Plan", tenant.plan]].map(([l,v])=>(
                  <div key={l} className="flex items-center justify-between border-b pb-2" style={{ borderColor: "var(--card-border)" }}>
                    <span className="text-xs font-semibold text-gray-500">{l}</span>
                    <span className="text-sm font-medium text-gray-900">{v}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-4">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Tenant ID</p>
                  <p className="font-mono text-xs text-blue-600 break-all">{tenant.id}</p>
                </div>
              </>
            )}
          </div>
        </Widget>
      )}

      {tab === "billing" && (
        <Widget title="Billing Configuration" icon={Bell}>
          <div className="space-y-4 max-w-md">
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">M-Pesa Settings</p>
              {[["MPESA_SHORTCODE","Paybill / Till Number"],["MPESA_CONSUMER_KEY","Consumer Key"],["MPESA_CONSUMER_SECRET","Consumer Secret"],["MPESA_PASSKEY","Lipa na M-Pesa Passkey"]].map(([k,l])=>(
                <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={k.includes("SECRET")||k.includes("PASSKEY")?"password":"text"} placeholder={`${l}…`}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
              ))}
            </div>
            <div className="rounded-xl border p-4 space-y-3" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">SMS — Africa's Talking</p>
              {[["AT_USERNAME","Username"],["AT_API_KEY","API Key"],["AT_SMS_SENDER_ID","Sender ID (optional)"]].map(([k,l])=>(
                <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                  <input type={k.includes("KEY")?"password":"text"} placeholder={`${l}…`}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
              ))}
            </div>
            <p className="text-xs text-amber-600 bg-amber-50 border border-amber-100 rounded-xl px-4 py-3">
              ⚠ To update API keys, edit <code className="font-mono">/home/richu/isp-platform/ecosystem.config.js</code> and restart PM2.
            </p>
          </div>
        </Widget>
      )}

      {tab === "security" && (
        <Widget title="Security" icon={Shield}>
          <div className="space-y-4 max-w-md">
            <div className="rounded-xl border p-4" style={{ borderColor: "var(--card-border)" }}>
              <p className="text-sm font-bold text-gray-900 mb-3">Change Password</p>
              <div className="space-y-3">
                {[["Current Password","currentPassword"],["New Password","newPassword"],["Confirm Password","confirm"]].map(([l,k])=>(
                  <div key={k}><label className="block text-xs font-semibold text-gray-600 mb-1">{l}</label>
                    <input type="password" placeholder="••••••••" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} /></div>
                ))}
                <button className="w-full rounded-xl py-2.5 text-sm font-bold text-white" style={{ backgroundColor: "var(--sidebar-bg)" }}>Update Password</button>
              </div>
            </div>
            <div className="rounded-xl border p-4 flex items-center justify-between" style={{ borderColor: "var(--card-border)" }}>
              <div><p className="text-sm font-semibold text-gray-900">Two-Factor Authentication</p><p className="text-xs text-gray-500 mt-0.5">Add extra security with TOTP</p></div>
              <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">Disabled</span>
            </div>
          </div>
        </Widget>
      )}
    </div>
  );
}
