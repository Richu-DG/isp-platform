"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import axios from "axios";
import { Wifi, Zap, Clock, Database, ChevronRight, CheckCircle } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";
const qc = new QueryClient();

function PortalInner() {
  const params = useSearchParams();
  const tenantSlug = params.get("tenant") ?? "demo-isp";
  const mac = params.get("mac") ?? "";
  const ip = params.get("ip") ?? "";
  const loginUrl = params.get("login-url") ?? "";

  const { data: packages, isLoading } = useQuery({
    queryKey: ["portal-packages", tenantSlug],
    queryFn: () => axios.get(`${API_URL}/portal/packages?tenant=${tenantSlug}`).then(r => r.data),
  });

  const pkgList = packages ?? [];

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex flex-col items-center justify-start pt-8 pb-16 px-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-white/20 backdrop-blur rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Wifi className="w-9 h-9 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Wi-Fi Hotspot</h1>
          <p className="text-sky-200 mt-2">Select a package to get connected</p>
        </div>
        <div className="space-y-3 mb-6">
          {isLoading ? (
            <div className="bg-white/10 rounded-2xl p-8 flex justify-center">
              <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin" />
            </div>
          ) : pkgList.length === 0 ? (
            <div className="bg-white/10 rounded-2xl p-8 text-center text-white">No packages available</div>
          ) : (
            pkgList.map((pkg: any) => (
              <Link key={pkg.id} href={`/payment?packageId=${pkg.id}&tenant=${tenantSlug}&mac=${mac}&ip=${ip}&loginUrl=${encodeURIComponent(loginUrl)}`}
                className="block bg-white rounded-2xl p-5 hover:shadow-lg transition-all hover:scale-[1.01]">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-bold text-gray-900 text-lg">{pkg.name}</h3>
                    {pkg.description && <p className="text-gray-500 text-sm mt-0.5">{pkg.description}</p>}
                    <div className="flex items-center gap-3 mt-2">
                      {pkg.speedDown && <span className="flex items-center gap-1 text-xs text-sky-600 bg-sky-50 px-2 py-1 rounded-full"><Zap className="w-3 h-3" />{pkg.speedDown} Mbps</span>}
                      {pkg.duration && <span className="flex items-center gap-1 text-xs text-purple-600 bg-purple-50 px-2 py-1 rounded-full"><Clock className="w-3 h-3" />{pkg.duration === 1 ? "1 Day" : `${pkg.duration} Days`}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <p className="text-2xl font-bold text-gray-900">KES {Number(pkg.price).toLocaleString()}</p>
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  </div>
                </div>
              </Link>
            ))
          )}
        </div>
        <Link href={`/login?tenant=${tenantSlug}&mac=${mac}&ip=${ip}&loginUrl=${encodeURIComponent(loginUrl)}`}
          className="block bg-white/10 hover:bg-white/20 text-white text-center py-3.5 rounded-2xl font-medium transition-colors">
          Already have an account? Sign In
        </Link>
      </div>
    </div>
  );
}

export default function PortalHome() {
  return <QueryClientProvider client={qc}><PortalInner /></QueryClientProvider>;
}
