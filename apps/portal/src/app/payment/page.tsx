import { Suspense } from "react";
import PaymentInner from "./payment-inner";

export default function PaymentPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-white border-t-transparent rounded-full animate-spin"/>
      </div>
    }>
      <PaymentInner />
    </Suspense>
  );
}
