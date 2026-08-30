"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";

const STEPS = ["order_confirmed", "in_production", "quality_check", "shipped", "in_transit", "out_for_delivery", "delivered"];
const STEP_INFO: Record<string, { label: string; icon: string }> = {
  order_confirmed: { label: "Order Confirmed", icon: "✅" },
  in_production: { label: "In Production", icon: "🏭" },
  quality_check: { label: "Quality Check", icon: "🔍" },
  shipped: { label: "Shipped", icon: "📦" },
  in_transit: { label: "In Transit", icon: "🚚" },
  out_for_delivery: { label: "Out for Delivery", icon: "🏙" },
  delivered: { label: "Delivered", icon: "🎉" },
};

interface Order {
  id: string; trackingCode: string;
  vehicle: { name: string; imageUrl: string } | any;
  trim: { name: string } | null;
  selectedColor: string; selectedInterior: string;
  totalPrice: number; status: string; statusNote: string | null;
  estimatedDelivery: string | null; createdAt: string;
}

function Inner() {
  const sp = useSearchParams();
  const router = useRouter();
  const orderId = sp.get("id") || "";
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const fetchOrder = useCallback(async () => {
    if (!orderId) { setError("No order"); setLoading(false); return; }
    try {
      const res = await fetch(`/api/vehicles/orders/${orderId}`);
      const json = await res.json();
      if (json.success) setOrder(json.data); else setError("Not found");
    } catch { setError("Network error"); }
    finally { setLoading(false); }
  }, [orderId]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  if (loading) return <div className="bg-card border border-border rounded-2xl h-96 animate-pulse" />;
  if (!order) return <div className="bg-destructive/10 border border-destructive/30 text-destructive rounded-xl px-4 py-3">{error}</div>;

  const currentIdx = STEPS.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <button onClick={() => router.push("/my-orders")} className="hover:text-foreground">My Orders</button>
        <span>/</span><span className="text-foreground">{order.trackingCode}</span>
      </div>
      <div className="bg-card border border-border rounded-2xl p-5">
        <div className="flex items-start gap-4">
          <div className="w-24 h-18 bg-secondary rounded-xl overflow-hidden shrink-0">
            {order.vehicle?.imageUrl && <img src={order.vehicle.imageUrl} alt={order.vehicle?.name} className="w-full h-full object-cover" />}
          </div>
          <div className="flex-1">
            <h2 className="text-foreground font-bold text-lg">{order.vehicle?.name}{order.trim ? ` ${order.trim.name}` : ""}</h2>
            <p className="text-muted-foreground text-xs font-mono mt-1">{order.trackingCode}</p>
            <p className="text-foreground font-bold text-xl mt-2">${order.totalPrice.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">USD</span></p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3 mt-4 pt-4 border-t border-border">
          <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider">Color</p><p className="text-foreground text-sm font-medium mt-0.5">{order.selectedColor}</p></div>
          <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider">Interior</p><p className="text-foreground text-sm font-medium mt-0.5">{order.selectedInterior}</p></div>
          <div><p className="text-muted-foreground text-[10px] uppercase tracking-wider">Ordered</p><p className="text-foreground text-sm font-medium mt-0.5">{new Date(order.createdAt).toLocaleDateString()}</p></div>
        </div>
      </div>
      {isCancelled ? (
        <div className="bg-red-500/10 border border-red-500/30 rounded-2xl p-6 text-center">
          <p className="text-red-400 font-bold">Order Cancelled</p>
          {order.statusNote && <p className="text-red-300/70 text-sm mt-1">{order.statusNote}</p>}
        </div>
      ) : (
        <div className="bg-card border border-border rounded-2xl p-5">
          <h3 className="text-foreground font-bold text-sm mb-5">Delivery Tracking</h3>
          {order.estimatedDelivery && (
            <div className="bg-primary/10 border border-primary/20 rounded-xl p-3 mb-5 flex items-center gap-3">
              <span className="text-lg">📅</span>
              <div><p className="text-primary text-[10px] font-bold uppercase">Estimated Delivery</p><p className="text-foreground text-sm font-semibold">{new Date(order.estimatedDelivery).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}</p></div>
            </div>
          )}
          <div className="space-y-0">
            {STEPS.map((step, i) => {
              const done = i <= currentIdx;
              const isCurrent = i === currentIdx;
              const info = STEP_INFO[step];
              return (
                <div key={step} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className={`w-9 h-9 rounded-full flex items-center justify-center text-sm shrink-0 border-2 ${done ? (isCurrent ? "bg-primary border-primary text-primary-foreground" : "bg-green-500/20 border-green-500 text-green-400") : "bg-secondary border-border text-muted-foreground"}`}>
                      {done ? (isCurrent ? info.icon : "✓") : (i + 1)}
                    </div>
                    {i < STEPS.length - 1 && <div className={`w-0.5 h-8 ${i < currentIdx ? "bg-green-500" : "bg-border"}`} />}
                  </div>
                  <div className="pb-6">
                    <p className={`text-sm font-semibold ${done ? "text-foreground" : "text-muted-foreground"}`}>{info.label}</p>
                    {isCurrent && order.statusNote && <p className="text-muted-foreground text-xs mt-0.5">{order.statusNote}</p>}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <ChatWidget />
    </div>
  );
}

export default function OrderDetailPage() {
  return <Suspense fallback={<div className="bg-card border border-border rounded-2xl h-96 animate-pulse" />}><Inner /></Suspense>;
}