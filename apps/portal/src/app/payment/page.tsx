"use client";

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "@tanstack/react-query";
import axios from "axios";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Phone, Loader2, CheckCircle, ArrowLeft, Wifi } from "lucide-react";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3001/api/v1";

const schema = z.object({
  phone: z.string().min(10).max(13),
  name: z.string().min(2).optional(),
});

type FormData = z.infer<typeof schema>;

type PaymentState = "form" | "waiting" | "success" | "error";

export default function PaymentPage() {
  const params = useSearchParams();
  const router = useRouter();
  const [state, setState] = useState<PaymentState>("form");
  const [paymentId, setPaymentId] = useState<string | null>(null);

  const packageId = params.get("packageId") ?? "";
  const tenantSlug = params.get("tenant") ?? "demo-isp";
  const mac = params.get("mac") ?? "";
  const loginUrl = decodeURIComponent(params.get("loginUrl") ?? "");

  const { data: pkg } = useQuery({
    queryKey: ["package", packageId],
    queryFn: () => axios.get(`${API_URL}/packages/${packageId}?tenant=${tenantSlug}`).then((r) => r.data),
    enabled: !!packageId,
  });

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const payMutation = useMutation({
    mutationFn: async (data: FormData) => {
      const res = await axios.post(`${API_URL}/portal/pay`, {
        packageId,
        phone: data.phone,
        name: data.name,
        macAddress: mac,
        tenantSlug,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setPaymentId(data.paymentId);
      setState("waiting");
      pollPayment(data.paymentId);
    },
    onError: (err: any) => {
      toast.error(err?.response?.data?.message ?? "Payment failed. Try again.");
    },
  });

  const pollPayment = (id: string) => {
    let attempts = 0;
    const interval = setInterval(async () => {
      attempts++;
      try {
        const { data } = await axios.get(`${API_URL}/portal/payment-status/${id}?tenant=${tenantSlug}`);
        if (data.status === "COMPLETED") {
          clearInterval(interval);
          setState("success");
          if (loginUrl && data.username && data.password) {
            setTimeout(() => {
              window.location.href = `${loginUrl}?username=${encodeURIComponent(data.username)}&password=${encodeURIComponent(data.password)}`;
            }, 2000);
          }
        } else if (data.status === "FAILED") {
          clearInterval(interval);
          setState("error");
        }
      } catch {}
      if (attempts >= 30) {
        clearInterval(interval);
        setState("error");
      }
    }, 5000);
  };

  if (state === "waiting") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <Phone className="w-8 h-8 text-green-600 animate-pulse" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Check Your Phone</h2>
          <p className="text-gray-500 text-sm mb-4">
            An M-Pesa prompt has been sent to your phone. Enter your PIN to complete payment.
          </p>
          <div className="flex items-center justify-center gap-2 text-sky-600">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span className="text-sm">Waiting for payment confirmation...</span>
          </div>
          <p className="text-xs text-gray-400 mt-4">Amount: KES {Number(pkg?.price ?? 0).toLocaleString()}</p>
        </div>
      </div>
    );
  }

  if (state === "success") {
    return (
      <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl p-8 max-w-sm w-full text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-8 h-8 text-green-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-900 mb-2">Payment Successful!</h2>
          <p className="text-gray-500 text-sm mb-6">
            Your internet access has been activated. Connecting you now...
          </p>
          <div className="flex items-center justify-center gap-2 text-sky-600">
            <Wifi className="w-4 h-4 animate-pulse" />
            <span className="text-sm">Connecting to Wi-Fi...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-600 to-sky-800 flex flex-col items-center justify-start pt-8 pb-16 px-4">
      <div className="w-full max-w-sm">
        <button onClick={() => router.back()} className="flex items-center gap-2 text-white/80 hover:text-white mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Back</span>
        </button>

        {pkg && (
          <div className="bg-white/10 backdrop-blur rounded-2xl p-4 mb-6 text-white">
            <h3 className="font-bold text-lg">{pkg.name}</h3>
            <p className="text-sky-200 text-sm">{pkg.description}</p>
            <p className="text-3xl font-bold mt-2">KES {Number(pkg.price).toLocaleString()}</p>
          </div>
        )}

        <div className="bg-white rounded-2xl p-6">
          <h2 className="font-bold text-gray-900 text-xl mb-1">Pay with M-Pesa</h2>
          <p className="text-gray-500 text-sm mb-6">Enter your Safaricom number to receive the payment prompt</p>

          <form onSubmit={handleSubmit((data) => payMutation.mutate(data))} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">M-Pesa Phone Number</label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 text-gray-400 text-sm">+254</span>
                <input
                  {...register("phone")}
                  type="tel"
                  placeholder="712345678"
                  className="w-full pl-12 pr-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
                />
              </div>
              {errors.phone && <p className="text-red-500 text-xs mt-1">{errors.phone.message}</p>}
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Your Name (optional)</label>
              <input
                {...register("name")}
                type="text"
                placeholder="John Doe"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-500 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={payMutation.isPending}
              className="w-full py-3 bg-green-600 hover:bg-green-700 text-white font-bold rounded-xl transition-colors flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {payMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {payMutation.isPending ? "Processing..." : `Pay KES ${Number(pkg?.price ?? 0).toLocaleString()}`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
