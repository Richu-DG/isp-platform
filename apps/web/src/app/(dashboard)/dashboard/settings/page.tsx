"use client";
import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { toast } from "sonner";
import { Building2, Users, CreditCard, Shield, Loader2, CheckCircle, Eye, EyeOff } from "lucide-react";
import { Widget, PageHeader } from "@/components/dashboard/Widget";

export default function SettingsPage() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"company" | "billing" | "security">("company");

  const { data: tenant } = useQuery({ queryKey: ["tenant-me"], queryFn: () => api.get("/tenants/me").then(r => r.data) });
  const { data: mpesaCfg } = useQuery({ queryKey: ["mpesa-config"], queryFn: () => api.get("/tenants/mpesa-config").then(r => r.data), enabled: tab === "billing" });

  const [mpesa, setMpesa] = useState({ shortcode: "", consumerKey: "", consumerSecret: "", passkey: "", environment: "production" });
  const [sms, setSms] = useState({ smsUsername: "", smsApiKey: "", smsSenderId: "" });
  const [showSecret, setShowSecret] = useState(false);
  const [showPasskey, setShowPasskey] = useState(false);
  const [pw, setPw] = useState({ currentPassword: "", newPassword: "", confirm: "" });

  useEffect(() => {
    if (mpesaCfg) {
      setMpesa(f => ({ ...f, shortcode: mpesaCfg.shortcode ?? "", consumerKey: mpesaCfg.consumerKey ?? "", environment: mpesaCfg.environment ?? "production" }));
      setSms({ smsUsername: mpesaCfg.smsUsername ?? "", smsApiKey: "", smsSenderId: mpesaCfg.smsSenderId ?? "" });
    }
  }, [mpesaCfg]);

  const saveMpesaMutation = useMutation({
    mutationFn: () => api.patch("/tenants/mpesa-config", { ...mpesa, ...sms }),
    onSuccess: () => { toast.success("Credentials saved"); qc.invalidateQueries({ queryKey: ["mpesa-config"] }); },
    onError: (e: any) => toast.error(e?.response?.data?.message ?? "Save failed"),
  });

  const savePwMutation = useMutation({
    mutationFn: () => {
      if (pw.newPassword !== pw.confirm) throw new Error("Passwords don't match");
      return api.post("/auth/change-password", { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
    },
    onSuccess: () => { toast.success("Password updated"); setPw({ currentPassword: "", newPassword: "", confirm: "" }); },
    onError: (e: any) => toast.error(e?.message ?? e?.response?.data?.message ?? "Failed"),
  });

  const TABS = [
    { key: "company", label: "Company", icon: Building2 },
    { key: "billing", label: "M-Pesa & SMS", icon: CreditCard },
    { key: "security", label: "Security", icon: Shield },
  ] as const;

  return (
    <div className="space-y-4">
      <PageHeader title="Settings" subtitle="Configure your ISP account" />

      <div className="flex gap-1 border-b" style={{ borderColor: "var(--card-border)" }}>
        {TABS.map(({ key, label, icon: Icon }) => (
          <button key={key} onClick={() => setTab(key)}
            className={`flex items-center gap-2 px-4 py-2.5 text-sm font-semibold border-b-2 transition-colors ${tab === key ? "border-blue-600 text-blue-700" : "border-transparent text-gray-500 hover:text-gray-700"}`}>
            <Icon className="h-4 w-4" />{label}
          </button>
        ))}
      </div>

      {tab === "company" && (
        <Widget title="Company Information" icon={Building2}>
          <div className="space-y-3 max-w-md">
            {tenant && (
              <>
                {[["Company Name", tenant.name], ["Email", tenant.email || "—"], ["Phone", tenant.phone || "—"], ["Address", tenant.address || "—"], ["Plan", tenant.plan]].map(([l, v]) => (
                  <div key={l} className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: "var(--card-border)" }}>
                    <span className="text-xs font-semibold text-gray-500">{l}</span>
                    <span className="text-sm font-medium text-gray-900">{v}</span>
                  </div>
                ))}
                <div className="rounded-xl bg-blue-50 border border-blue-100 p-3 mt-2">
                  <p className="text-xs font-semibold text-blue-700 mb-1">Tenant ID</p>
                  <p className="font-mono text-xs text-blue-600 break-all">{tenant.id}</p>
                </div>
              </>
            )}
          </div>
        </Widget>
      )}

      {tab === "billing" && (
        <div className="space-y-4 max-w-xl">
          <Widget title="Safaricom Daraja — M-Pesa" icon={CreditCard}>
            <div className="space-y-4">
              <div className="rounded-xl bg-green-50 border border-green-100 p-3">
                <p className="text-xs text-green-800">
                  Get these from the <strong>Safaricom Developer Portal</strong> (developer.safaricom.co.ke).
                  Your paybill/till STK pushes will go directly to your M-Pesa account.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Paybill / Till Number <span className="text-red-500">*</span></label>
                  <input value={mpesa.shortcode} onChange={e => setMpesa(f => ({ ...f, shortcode: e.target.value }))}
                    placeholder="e.g. 174379" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500 focus:ring-1 focus:ring-green-100" style={{ borderColor: "var(--card-border)" }} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Environment</label>
                  <select value={mpesa.environment} onChange={e => setMpesa(f => ({ ...f, environment: e.target.value }))}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500" style={{ borderColor: "var(--card-border)" }}>
                    <option value="production">Production (live payments)</option>
                    <option value="sandbox">Sandbox (testing)</option>
                  </select>
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Consumer Key <span className="text-red-500">*</span></label>
                  <input value={mpesa.consumerKey} onChange={e => setMpesa(f => ({ ...f, consumerKey: e.target.value }))}
                    placeholder={mpesaCfg?.consumerKeyMasked || "Paste from Daraja portal"}
                    className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-green-500" style={{ borderColor: "var(--card-border)" }} />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Consumer Secret <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showSecret ? "text" : "password"} value={mpesa.consumerSecret} onChange={e => setMpesa(f => ({ ...f, consumerSecret: e.target.value }))}
                      placeholder={mpesaCfg?.consumerSecretSet ? "••••••••••••• (saved)" : "Paste from Daraja portal"}
                      className="w-full rounded-lg border px-3 py-2 pr-9 text-sm outline-none focus:border-green-500" style={{ borderColor: "var(--card-border)" }} />
                    <button type="button" onClick={() => setShowSecret(!showSecret)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showSecret ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">Lipa na M-Pesa Passkey <span className="text-red-500">*</span></label>
                  <div className="relative">
                    <input type={showPasskey ? "text" : "password"} value={mpesa.passkey} onChange={e => setMpesa(f => ({ ...f, passkey: e.target.value }))}
                      placeholder={mpesaCfg?.passkeySet ? "••••••••••••• (saved)" : "Lipa na M-Pesa passkey"}
                      className="w-full rounded-lg border px-3 py-2 pr-9 text-sm outline-none focus:border-green-500" style={{ borderColor: "var(--card-border)" }} />
                    <button type="button" onClick={() => setShowPasskey(!showPasskey)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                      {showPasskey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
              </div>

              {mpesaCfg?.consumerKeyMasked && (
                <div className="flex items-center gap-2 text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2">
                  <CheckCircle className="h-3.5 w-3.5 shrink-0" />
                  Credentials saved. Only fill fields you want to update.
                </div>
              )}
            </div>
          </Widget>

          <Widget title="SMS — Africa's Talking" icon={Shield}>
            <div className="space-y-3">
              <div className="rounded-xl bg-blue-50 border border-blue-100 p-3">
                <p className="text-xs text-blue-800">
                  Get your credentials from <strong>account.africastalking.com</strong>.
                  Used for payment SMS receipts and expiry reminders to your subscribers.
                </p>
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  { key: "smsUsername", label: "Username", ph: "e.g. MyISP", secret: false },
                  { key: "smsApiKey", label: "API Key", ph: mpesaCfg?.smsApiKeySet ? "•••••••••• (saved)" : "Paste API key", secret: true },
                  { key: "smsSenderId", label: "Sender ID (optional)", ph: "e.g. MYISP", secret: false },
                ].map(f => (
                  <div key={f.key} className={f.key === "smsSenderId" ? "sm:col-span-2" : ""}>
                    <label className="mb-1.5 block text-xs font-semibold text-gray-600">{f.label}</label>
                    <input type={f.secret ? "password" : "text"}
                      value={(sms as any)[f.key]} onChange={e => setSms(s => ({ ...s, [f.key]: e.target.value }))}
                      placeholder={f.ph} className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} />
                  </div>
                ))}
              </div>
            </div>
          </Widget>

          <button onClick={() => saveMpesaMutation.mutate()} disabled={saveMpesaMutation.isPending}
            className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-6 py-2.5 text-sm font-bold text-white hover:bg-green-700 transition-colors disabled:opacity-60">
            {saveMpesaMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Saving…</> : <>Save Credentials</>}
          </button>
        </div>
      )}

      {tab === "security" && (
        <Widget title="Change Password" icon={Shield}>
          <div className="space-y-3 max-w-sm">
            {[["Current Password", "currentPassword"], ["New Password", "newPassword"], ["Confirm New Password", "confirm"]].map(([l, k]) => (
              <div key={k}>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">{l}</label>
                <input type="password" value={(pw as any)[k]} onChange={e => setPw(p => ({ ...p, [k]: e.target.value }))}
                  placeholder="••••••••" className="w-full rounded-lg border px-3 py-2 text-sm outline-none focus:border-blue-500" style={{ borderColor: "var(--card-border)" }} />
              </div>
            ))}
            <button onClick={() => savePwMutation.mutate()} disabled={savePwMutation.isPending || !pw.currentPassword || !pw.newPassword}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-60"
              style={{ backgroundColor: "var(--sidebar-bg)" }}>
              {savePwMutation.isPending ? <><Loader2 className="h-4 w-4 animate-spin" />Updating…</> : <>Update Password</>}
            </button>
          </div>
        </Widget>
      )}
    </div>
  );
}
