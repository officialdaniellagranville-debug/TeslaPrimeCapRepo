"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import ChatWidget from "@/components/ChatWidget";

const STATUS_LABELS: Record<string, string> = {
  order_confirmed: "Order Confirmed", in_production: "In Production", quality_check: "Quality Check",
  shipped: "Shipped", in_transit: "In Transit", out_for_delivery: "Out for Delivery",
  delivered: "Delivered", cancelled: "Cancelled",
};
const STATUS_COLORS: Record<string, string> = {
  order_confirmed: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  in_production: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  quality_check: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  shipped: "bg-indigo-500/15 text-indigo-400 border-indigo-500/30",
  in_transit: "bg-cyan-500/15 text-cyan-400 border-cyan-500/30",
  out_for_delivery: "bg-orange-500/15 text-orange-400 border-orange-500/30",
  delivered: "bg-green-500/15 text-green-400 border-green-500/30",
  cancelled: "bg-red-500/15 text-red-400 border-red-500/30",
};

interface Order {
  id: string; trackingCode: string;
  vehicle: { name: string; imageUrl: string; slug: string } | any;
  trim: { name: string } | null; selectedColor: string;
  totalPrice: number; status: string; createdAt: string;
}

export default function MyOrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vehicles/orders");
        const json = await res.json();
        if (json.success) setOrders(json.data); else setError("Failed");
      } catch { setError("Error"); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div className="bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 rounded-2xl p-6">
        <h2 className="text-foreground font-bold text-xl">My Vehicle Orders</h2>
        <p className="text-muted-foreground text-sm mt-1">Track your Tesla orders and delivery status.</p>
      </div>
      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">{error}</div>}
      {loading ? (<div className="space-y-3">{[1,2,3].map(i => <div key={i} className="bg-card border border-border rounded-2xl h-28 animate-pulse" />)}</div>) : orders.length === 0 ? (
        <div className="bg-card border border-border rounded-2xl p-10 text-center">
          <p className="text-muted-foreground text-sm mb-3">No vehicle orders yet.</p>
          <Link href="/vehicles" className="text-primary text-sm font-semibold hover:underline">Browse Tesla Showroom</Link>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map(o => (
            <Link key={o.id} href={`/my-orders/detail?id=${o.id}`} className="block group">
              <div className="bg-card border border-border rounded-2xl p-4 hover:border-primary/30 transition-all">
                <div className="flex items-start gap-4">
                  <div className="w-20 h-16 bg-secondary rounded-xl overflow-hidden shrink-0">
                    {o.vehicle?.imageUrl && <img src={o.vehicle.imageUrl} alt={o.vehicle?.name} className="w-full h-full object-cover" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="text-foreground font-semibold text-sm truncate">{o.vehicle?.name || "Vehicle"}{o.trim ? ` ${o.trim.name}` : ""}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${STATUS_COLORS[o.status] || ""}`}>{STATUS_LABELS[o.status] || o.status}</span>
                    </div>
                    <p className="text-muted-foreground text-xs font-mono mt-1">{o.trackingCode}</p>
                    <div className="flex items-center justify-between mt-2">
                      <p className="text-foreground text-sm font-bold">${o.totalPrice.toLocaleString()}</p>
                      <span className="text-[10px] text-muted-foreground">{new Date(o.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
      <ChatWidget />
    </div>
  );
}