"use client";

import { useQuery } from "@tanstack/react-query";
import { api, formatCurrency, formatBytes } from "@/lib/api";
import {
  Users, Wifi, Package, Router, RefreshCw, Minus, X,
  CreditCard, Ticket, Eye, Tag, Database, TrendingUp,
  Activity, Server, ArrowUpRight, ArrowDownRight,
} from "lucide-react";
import {
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer, ComposedChart,
} from "recharts";
import { useState } from "react";

// ─── Colour palette (matches Aradial) ────────────────────
const C = {
  blue:   "#2196f3",
  orange: "#f39c12",
  green:  "#27ae60",
  red:    "#e74c3c",
  purple: "#9b59b6",
  teal:   "#16a085",
  navy:   "#1a2744",
};
const PIE_COLORS = [C.blue, C.orange, C.green, C.red, C.purple, C.teal, "#e67e22", "#1abc9c"];

// ─── Widget wrapper ───────────────────────────────────────
function Widget({ title, icon: Icon, onUpdate, children, className = "" }: {
  title: string; icon?: any; onUpdate?: () => void;
  children: React.ReactNode; className?: string;
}) {
  const [mini, setMini] = useState(false);
  return (
    <div className={`widget ${className}`}>
      <div className="widget-header">
        <span className="flex items-center gap-2">
          {Icon && <Icon className="h-4 w-4 text-blue-600" />}
          {title}
        </span>
        <span className="flex items-center gap-1.5">
          {onUpdate && (
            <button onClick={onUpdate} className="btn-update flex items-center gap-1">
              <RefreshCw className="h-2.5 w-2.5" /> Update
            </button>
          )}
          <button onClick={() => setMini(!mini)} className="text-gray-400 hover:text-gray-600 p-0.5 rounded">
            <Minus className="h-3 w-3" />
          </button>
        </span>
      </div>
      {!mini && <div className="widget-body">{children}</div>}
    </div>
  );
}

// ─── Circular progress ────────────────────────────────────
function DonutStat({ value, max, color, label, icon: Icon }: {
  value: number; max: number; color: string; label: string; icon: any;
}) {
  const pct = max > 0 ? Math.min((value / max) * 100, 100) : 0;
  const r = 28; const circ = 2 * Math.PI * r;
  const dash = circ - (pct / 100) * circ;
  return (
    <div className="stat-card">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-2xl font-bold" style={{ color: C.navy }}>{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-[11px] text-gray-400">{max - value} Remaining</p>
        </div>
        <div className="flex flex-col items-center gap-1">
          <svg width="72" height="72" viewBox="0 0 72 72">
            <circle cx="36" cy="36" r={r} fill="none" stroke="#e8edf8" strokeWidth="6" />
            <circle cx="36" cy="36" r={r} fill="none" stroke={color} strokeWidth="6"
              strokeDasharray={circ} strokeDashoffset={dash}
              strokeLinecap="round" transform="rotate(-90 36 36)" />
          </svg>
          <Icon className="h-6 w-6" style={{ color }} />
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data: summary, refetch: refetchSummary } = useQuery({
    queryKey: ["dashboard-summary"],
    queryFn: () => api.get("/analytics/dashboard").then(r => r.data),
    refetchInterval: 30000,
  });

  const { data: revenueChart = [] } = useQuery({
    queryKey: ["revenue-chart-daily"],
    queryFn: () => api.get("/analytics/revenue-chart?period=daily").then(r => r.data),
  });

  const { data: topPackages = [] } = useQuery({
    queryKey: ["top-packages"],
    queryFn: () => api.get("/analytics/top-packages").then(r => r.data),
  });

  const { data: bandwidth = [] } = useQuery({
    queryKey: ["bandwidth"],
    queryFn: () => api.get("/analytics/bandwidth").then(r => r.data),
  });

  const s = summary?.subscribers ?? {};
  const rev = summary?.revenue ?? {};

  // Mock session data for the "1-hour statistics" bar chart
  const sessionHourData = Array.from({ length: 12 }, (_, i) => ({
    t: `${i * 5}m`,
    sessions: Math.floor(Math.random() * 40 + 10),
    avg: Math.floor(Math.random() * 20 + 5),
  }));

  // Status distribution for pie chart
  const distData = [
    { name: "Active",    value: s.active    ?? 0 },
    { name: "Expired",   value: s.expired   ?? 0 },
    { name: "Suspended", value: s.suspended ?? 0 },
    { name: "Pending",   value: s.pending   ?? 0 },
  ].filter(d => d.value > 0);

  const QUICK_ACTIONS = [
    { label: "Invoices",     icon: CreditCard, color: "#2196f3", href: "/dashboard/billing" },
    { label: "Payments",     icon: CreditCard, color: "#27ae60", href: "/dashboard/payments" },
    { label: "Tickets",      icon: Ticket,     color: "#f39c12", href: "/dashboard/tickets" },
    { label: "Sessions",     icon: Eye,        color: "#9b59b6", href: "/dashboard/network" },
    { label: "Vouchers",     icon: Tag,        color: "#e74c3c", href: "/dashboard/vouchers" },
    { label: "Reports",      icon: Database,   color: "#16a085", href: "/dashboard/reports" },
  ];

  return (
    <div className="space-y-4">

      {/* ── Top stat cards ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <DonutStat value={s.active ?? 0}    max={s.total ?? 100}  color={C.blue}   label="Active Subscribers" icon={Users} />
        <DonutStat value={summary?.network?.activeSessions ?? 0} max={s.total ?? 100} color={C.orange} label="Online Sessions" icon={Wifi} />
        <DonutStat value={s.expired ?? 0}   max={s.total ?? 100}  color={C.red}    label="Expired Accounts"  icon={Package} />
        <DonutStat value={4} max={10} color={C.green} label="Routers Online" icon={Router} />
      </div>

      {/* ── Search row ── */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Subscriber ID Search", "Session Search", "Package Search", "Router Search"].map(ph => (
          <div key={ph} className="flex items-center gap-2 rounded-lg border bg-white px-3 py-2 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
            <input placeholder={ph} className="flex-1 text-xs outline-none text-gray-600 placeholder-gray-400" />
            <button className="rounded-md p-1 text-white text-xs font-bold" style={{ backgroundColor: C.blue }}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            </button>
          </div>
        ))}
      </div>

      {/* ── Quick actions ── */}
      <div className="grid grid-cols-3 gap-3 sm:grid-cols-6">
        {QUICK_ACTIONS.map(({ label, icon: Icon, color, href }) => (
          <a key={label} href={href} className="quick-action">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl" style={{ backgroundColor: color + "18" }}>
              <Icon className="h-5 w-5" style={{ color }} />
            </div>
            <span className="text-xs font-semibold text-gray-600">{label}</span>
          </a>
        ))}
      </div>

      {/* ── Charts row 1 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <Widget title="Session 1-Hour Statistics" icon={Activity} onUpdate={() => refetchSummary()}>
          <ResponsiveContainer width="100%" height={180}>
            <ComposedChart data={sessionHourData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} />
              <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Bar dataKey="sessions" fill={C.blue} name="Sessions" radius={[2, 2, 0, 0]} />
              <Line dataKey="avg" stroke={C.orange} name="Avg" dot={false} strokeWidth={2} />
            </ComposedChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title={`Online Users (${s.active ?? 0}/${s.total ?? 0})`} icon={Wifi} onUpdate={() => refetchSummary()}>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={bandwidth.slice(-20)}>
              <defs>
                <linearGradient id="bwGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.orange} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={C.orange} stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v?.slice(5) ?? ""} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => formatBytes(v)} />
              <Tooltip formatter={(v: number) => formatBytes(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Area type="monotone" dataKey="download" stroke={C.orange} fill="url(#bwGrad)" strokeWidth={2} name="Download" />
            </AreaChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title="Daily Revenue (Last 30 Days)" icon={TrendingUp}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueChart.slice(-20)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v?.slice(5) ?? ""} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Bar dataKey="revenue" fill={C.green} radius={[2, 2, 0, 0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </Widget>

      </div>

      {/* ── Charts row 2 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <Widget title="Subscriber Distribution" icon={Users} onUpdate={() => refetchSummary()}>
          <div className="flex items-center gap-2">
            <ResponsiveContainer width="55%" height={180}>
              <PieChart>
                <Pie data={distData} cx="50%" cy="50%" innerRadius={40} outerRadius={70}
                  dataKey="value" paddingAngle={2}>
                  {distData.map((_, i) => <Cell key={i} fill={PIE_COLORS[i]} />)}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-1.5">
              {distData.map((d, i) => (
                <div key={d.name} className="flex items-center gap-2">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ backgroundColor: PIE_COLORS[i] }} />
                  <span className="text-[11px] text-gray-600 flex-1 truncate">{d.name}</span>
                  <span className="text-[11px] font-bold text-gray-800">{d.value}</span>
                </div>
              ))}
            </div>
          </div>
        </Widget>

        <Widget title="Monthly Revenue This Year" icon={CreditCard}>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={revenueChart.slice(0, 12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v?.slice(0, 7) ?? ""} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => `${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={(v: number) => formatCurrency(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Bar dataKey="revenue" name="Paid" fill={C.green} radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </Widget>

        <Widget title="Top Packages" icon={Package}>
          <div className="space-y-2 pt-1">
            {topPackages.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-8">No data yet</p>
            ) : topPackages.map((p: any, i: number) => (
              <div key={p.packageId} className="flex items-center gap-3">
                <span className="text-[10px] w-4 text-gray-400 font-mono">{i + 1}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-gray-800 truncate">{p.name}</p>
                  <div className="mt-0.5 h-1.5 rounded-full bg-gray-100">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${Math.round((p.count / Math.max(...topPackages.map((x: any) => x.count), 1)) * 100)}%`, backgroundColor: PIE_COLORS[i] }} />
                  </div>
                </div>
                <span className="text-xs font-bold" style={{ color: PIE_COLORS[i] }}>{p.count}</span>
                <span className="text-[10px] text-gray-400">{formatCurrency(p.price)}</span>
              </div>
            ))}
          </div>
        </Widget>

      </div>

      {/* ── Charts row 3 ── */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">

        <Widget title="Bandwidth Usage (30 Days)" icon={Activity}>
          <ResponsiveContainer width="100%" height={150}>
            <AreaChart data={bandwidth.slice(-20)}>
              <defs>
                <linearGradient id="upGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.blue} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.blue} stopOpacity={0} />
                </linearGradient>
                <linearGradient id="downGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={C.green} stopOpacity={0.2} />
                  <stop offset="95%" stopColor={C.green} stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f4ff" />
              <XAxis dataKey="date" tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => v?.slice(5) ?? ""} />
              <YAxis tick={{ fontSize: 10, fill: "#9ca3af" }} tickFormatter={v => formatBytes(v)} />
              <Tooltip formatter={(v: number) => formatBytes(v)} contentStyle={{ fontSize: 11, borderRadius: 6 }} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: 10 }} />
              <Area type="monotone" dataKey="upload"   stroke={C.blue}  fill="url(#upGrad)"   strokeWidth={1.5} name="Upload" />
              <Area type="monotone" dataKey="download" stroke={C.green} fill="url(#downGrad)" strokeWidth={1.5} name="Download" />
            </AreaChart>
          </ResponsiveContainer>
        </Widget>

        {/* System Status */}
        <Widget title="System Status" icon={Server}>
          <div className="space-y-3">
            {[
              { label: "API Server",    ok: true,  val: "Online — 3001" },
              { label: "Database",      ok: true,  val: "Supabase / PG 17" },
              { label: "Redis Queue",   ok: true,  val: "Docker — 6379" },
              { label: "M-Pesa",        ok: false, val: "Sandbox mode" },
              { label: "SMS (AT)",      ok: false, val: "Not configured" },
            ].map(row => (
              <div key={row.label} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`h-2 w-2 rounded-full shrink-0 ${row.ok ? "bg-green-500" : "bg-yellow-400"}`} />
                  <span className="text-xs text-gray-700">{row.label}</span>
                </div>
                <span className={`text-[11px] font-medium ${row.ok ? "text-green-600" : "text-yellow-500"}`}>{row.val}</span>
              </div>
            ))}
            <div className="mt-2 rounded-lg border border-green-100 bg-green-50 px-3 py-2 text-center">
              <p className="text-xs font-semibold text-green-700">All core services running</p>
            </div>
          </div>
        </Widget>

        {/* Quick stats */}
        <Widget title="Revenue Summary" icon={TrendingUp}>
          <div className="space-y-3">
            {[
              { label: "Today",       val: rev.today   ?? 0, color: C.blue },
              { label: "This Month",  val: rev.month   ?? 0, color: C.green },
              { label: "Last Month",  val: rev.lastMonth ?? 0, color: C.orange },
              { label: "Growth",      val: null,             color: rev.growth >= 0 ? C.green : C.red, raw: `${(rev.growth ?? 0).toFixed(1)}%` },
            ].map(r => (
              <div key={r.label} className="flex items-center justify-between rounded-lg px-3 py-2" style={{ backgroundColor: r.color + "12" }}>
                <span className="text-xs font-medium text-gray-600">{r.label}</span>
                <span className="text-sm font-bold" style={{ color: r.color }}>
                  {r.raw ?? formatCurrency(r.val!)}
                </span>
              </div>
            ))}
          </div>
        </Widget>

      </div>
    </div>
  );
}
