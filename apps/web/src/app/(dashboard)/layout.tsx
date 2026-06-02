"use client";

import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard, Users, Package, CreditCard, Wifi,
  Ticket, FileText, Tag, Settings, LogOut, Bell,
  Menu, X, ChevronRight, ChevronDown, Search,
  Activity, BarChart3, Router, Network, Database,
  Receipt, UserCheck, AlertCircle, Server, Globe,
} from "lucide-react";
import { useAuthStore } from "@/store/auth.store";
import { clsx } from "clsx";

const NAV = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  {
    label: "Subscribers", icon: Users, children: [
      { href: "/dashboard/subscribers", label: "All Subscribers" },
      { href: "/dashboard/subscribers/new", label: "Add Subscriber" },
    ],
  },
  {
    label: "Billing", icon: Receipt, children: [
      { href: "/dashboard/billing", label: "Invoices" },
      { href: "/dashboard/payments", label: "Payments" },
    ],
  },
  { href: "/dashboard/packages", label: "Packages", icon: Package },
  { href: "/dashboard/vouchers", label: "Vouchers", icon: Tag },
  { href: "/dashboard/tickets", label: "Trouble Tickets", icon: Ticket },
  {
    label: "Network", icon: Network, children: [
      { href: "/dashboard/network", label: "Routers & APs" },
      { href: "/dashboard/network/sessions", label: "Active Sessions" },
    ],
  },
  { href: "/dashboard/reports", label: "Reports", icon: BarChart3 },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

function NavItem({ item, depth = 0 }: { item: any; depth?: number }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = item.href
    ? item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href)
    : item.children?.some((c: any) => pathname.startsWith(c.href));

  useEffect(() => {
    if (isActive && item.children) setOpen(true);
  }, []);

  if (item.children) {
    return (
      <div>
        <button
          onClick={() => setOpen(!open)}
          className={clsx(
            "sidebar-item w-full justify-between",
            isActive && "text-white"
          )}
          style={isActive ? { backgroundColor: "var(--sidebar-hover)" } : undefined}
        >
          <span className="flex items-center gap-2.5">
            <item.icon className="h-4 w-4 shrink-0 opacity-80" />
            <span>{item.label}</span>
          </span>
          <ChevronDown className={clsx("h-3.5 w-3.5 transition-transform opacity-60", open && "rotate-180")} />
        </button>
        {open && (
          <div className="ml-6 mt-0.5 space-y-0.5 border-l border-slate-700 pl-3">
            {item.children.map((child: any) => (
              <Link key={child.href} href={child.href}
                className={clsx(
                  "block rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                  pathname === child.href || pathname.startsWith(child.href)
                    ? "text-white" : "text-slate-400 hover:text-white"
                )}
                style={pathname.startsWith(child.href) ? { backgroundColor: "var(--sidebar-active)" } : undefined}
              >
                {child.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <Link href={item.href}
      className={clsx("sidebar-item", isActive && "active")}
    >
      <item.icon className="h-4 w-4 shrink-0 opacity-80" />
      <span>{item.label}</span>
      {isActive && <ChevronRight className="ml-auto h-3.5 w-3.5 opacity-60" />}
    </Link>
  );
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { user, isAuthenticated, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [search, setSearch] = useState("");
  const now = new Date();
  const timeStr = now.toLocaleTimeString("en-KE", { hour: "2-digit", minute: "2-digit" });

  useEffect(() => {
    if (!isAuthenticated) router.replace("/auth/login");
  }, [isAuthenticated, router]);

  if (!isAuthenticated) return null;

  return (
    <div className="flex h-screen overflow-hidden" style={{ backgroundColor: "var(--page-bg)" }}>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/60 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* ── Sidebar ── */}
      <aside
        className={clsx(
          "fixed inset-y-0 left-0 z-40 flex w-56 flex-col transition-transform duration-200 lg:relative lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        )}
        style={{ backgroundColor: "var(--sidebar-bg)" }}
      >
        {/* Logo */}
        <div className="flex items-center gap-2.5 border-b px-4 py-3.5" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-600">
            <Wifi className="h-4 w-4 text-white" />
          </div>
          <div>
            <p className="text-sm font-bold text-white leading-tight">ISP Manager</p>
            <p className="text-[10px] text-slate-400">Kenya Billing</p>
          </div>
          <button onClick={() => setSidebarOpen(false)} className="ml-auto text-slate-400 hover:text-white lg:hidden">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 py-2.5" style={{ borderBottom: "1px solid var(--sidebar-border)" }}>
          <div className="relative">
            <Search className="absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" />
            <input
              value={search} onChange={(e) => setSearch(e.target.value)}
              placeholder="Search…"
              className="w-full rounded-lg py-1.5 pl-7 pr-3 text-xs text-white placeholder-slate-500 outline-none focus:ring-1 focus:ring-blue-500"
              style={{ backgroundColor: "var(--sidebar-hover)" }}
            />
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 space-y-0.5 overflow-y-auto px-2 py-3">
          {NAV.map((item, i) => <NavItem key={i} item={item} />)}
        </nav>

        {/* User */}
        <div className="border-t p-3" style={{ borderColor: "var(--sidebar-border)" }}>
          <div className="flex items-center gap-2.5 rounded-lg p-2" style={{ backgroundColor: "var(--sidebar-hover)" }}>
            <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold uppercase text-white">
              {user?.name?.[0]}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold text-white">{user?.name}</p>
              <p className="truncate text-[10px] text-slate-400">{user?.role?.replace(/_/g, " ")}</p>
            </div>
            <button onClick={logout} className="shrink-0 text-slate-500 hover:text-red-400 transition-colors">
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      {/* ── Main ── */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header */}
        <header className="flex items-center gap-3 border-b bg-white px-4 py-2.5 shadow-sm" style={{ borderColor: "var(--card-border)" }}>
          <button onClick={() => setSidebarOpen(true)} className="rounded-lg p-1.5 hover:bg-gray-100 lg:hidden">
            <Menu className="h-5 w-5 text-gray-600" />
          </button>

          <span className="hidden text-xs font-medium text-gray-400 sm:block">Home</span>

          <div className="flex-1" />

          {/* Server status badge */}
          <div className="hidden items-center gap-2 rounded-full border border-green-200 bg-green-50 px-3 py-1 sm:flex">
            <span className="h-2 w-2 animate-pulse rounded-full bg-green-500" />
            <span className="text-xs font-semibold text-green-700">Server ON</span>
          </div>

          <button className="relative rounded-lg p-2 hover:bg-gray-100">
            <Bell className="h-4.5 w-4.5 text-gray-600 h-5 w-5" />
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500" />
          </button>

          <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-1.5 text-sm">
            <span className="text-xs text-gray-500">Hi,</span>
            <span className="text-xs font-semibold text-gray-800">{user?.name?.split(" ")[0]}</span>
            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-[10px] font-bold uppercase text-white">
              {user?.name?.[0]}
            </div>
          </div>
        </header>

        {/* Page */}
        <main className="flex-1 overflow-auto p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
