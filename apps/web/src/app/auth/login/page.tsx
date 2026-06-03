"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Wifi, Loader2, Lock, Mail, Eye, EyeOff, KeyRound } from "lucide-react";
import { useAuthStore } from "@/store/auth.store";

const schema = z.object({
  email: z.string().email("Invalid email"),
  password: z.string().min(6, "Min 6 characters"),
  mfaCode: z.string().length(6).optional().or(z.literal("")),
});
type FormData = z.infer<typeof schema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [requiresMfa, setRequiresMfa] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await login(data.email, data.password, data.mfaCode || undefined);
      toast.success("Welcome back!");
      const { user: loggedInUser } = useAuthStore.getState();
      router.push(loggedInUser?.role === "SUPER_ADMIN" ? "/dashboard/super" : "/dashboard");
    } catch (err: any) {
      const msg = err?.response?.data?.message ?? "";
      if (msg.includes("MFA") || err?.response?.data?.requiresMfa) {
        setRequiresMfa(true);
        toast.info("Enter your 6-digit MFA code");
      } else {
        toast.error(msg || "Invalid credentials");
      }
    }
  };

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* Left panel */}
      <div className="hidden lg:flex lg:w-1/2 flex-col items-center justify-center p-12" style={{ backgroundColor: "var(--sidebar-bg)" }}>
        <div className="max-w-sm text-center">
          <div className="flex h-20 w-20 mx-auto items-center justify-center rounded-2xl bg-blue-600 mb-6 shadow-xl">
            <Wifi className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">ISP Manager</h1>
          <p className="text-slate-400 text-sm leading-relaxed">
            Complete ISP Billing, AAA Authentication & Hotspot Management Platform for Kenya.
            Powered by MikroTik, FreeRADIUS &amp; M-Pesa.
          </p>

          <div className="mt-10 grid grid-cols-2 gap-4 text-left">
            {[
              { label: "Subscribers", desc: "Manage all customers" },
              { label: "M-Pesa",      desc: "Auto STK Push billing" },
              { label: "MikroTik",    desc: "RouterOS integration" },
              { label: "Analytics",   desc: "Live network metrics" },
            ].map(f => (
              <div key={f.label} className="rounded-xl p-3" style={{ backgroundColor: "var(--sidebar-hover)" }}>
                <p className="text-sm font-semibold text-white">{f.label}</p>
                <p className="text-xs text-slate-400">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 items-center justify-center p-6">
        <div className="w-full max-w-md">
          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-8 lg:hidden">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600">
              <Wifi className="h-5 w-5 text-white" />
            </div>
            <div>
              <p className="font-bold text-gray-900">ISP Manager</p>
              <p className="text-xs text-gray-500">Kenya Billing Platform</p>
            </div>
          </div>

          <div className="rounded-2xl border bg-white p-8 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
            <h2 className="text-xl font-bold text-gray-900 mb-1">Sign In</h2>
            <p className="text-sm text-gray-500 mb-6">Enter your credentials to access the admin portal</p>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input {...register("email")} type="email" placeholder="admin@isp.co.ke"
                    className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    style={{ borderColor: errors.email ? "#ef4444" : "var(--card-border)" }} />
                </div>
                {errors.email && <p className="mt-1 text-xs text-red-500">{errors.email.message}</p>}
              </div>

              <div>
                <label className="mb-1.5 block text-xs font-semibold text-gray-600">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input {...register("password")} type={showPw ? "text" : "password"} placeholder="••••••••"
                    className="w-full rounded-xl border py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                    style={{ borderColor: errors.password ? "#ef4444" : "var(--card-border)" }} />
                  <button type="button" onClick={() => setShowPw(!showPw)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                    {showPw ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
                {errors.password && <p className="mt-1 text-xs text-red-500">{errors.password.message}</p>}
              </div>

              {requiresMfa && (
                <div>
                  <label className="mb-1.5 block text-xs font-semibold text-gray-600">MFA Code</label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                    <input {...register("mfaCode")} type="text" maxLength={6} placeholder="123456"
                      className="w-full rounded-xl border py-2.5 pl-10 pr-4 text-sm text-center tracking-[0.5em] outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100"
                      style={{ borderColor: "var(--card-border)" }} />
                  </div>
                </div>
              )}

              <button type="submit" disabled={isSubmitting}
                className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-bold text-white transition-colors disabled:opacity-60"
                style={{ backgroundColor: "#1a2744" }}
                onMouseEnter={e => (e.currentTarget.style.backgroundColor = "#243361")}
                onMouseLeave={e => (e.currentTarget.style.backgroundColor = "#1a2744")}
              >
                {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                {isSubmitting ? "Signing in…" : "Sign In to Dashboard"}
              </button>
            </form>

            <div className="mt-5 rounded-xl border border-blue-100 bg-blue-50 p-3">
              <p className="text-center text-xs text-blue-700">
                <span className="font-semibold">Demo:</span> admin@demoisp.co.ke / Admin@123!
              </p>
            </div>
          </div>

          <p className="mt-4 text-center text-xs text-gray-400">
            ISP Platform © {new Date().getFullYear()} — Kenya Hotspot &amp; Billing
          </p>
        </div>
      </div>
    </div>
  );
}
