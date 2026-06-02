import { Suspense } from "react";
import PortalHome from "./portal-home";

export default function Page() {
  return <Suspense fallback={<div className="min-h-screen bg-sky-700 flex items-center justify-center"><div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"/></div>}><PortalHome /></Suspense>;
}
