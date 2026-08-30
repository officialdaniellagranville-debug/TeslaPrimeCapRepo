"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ChatWidget from "@/components/ChatWidget";

interface Trim { id: string; name: string; price: number; description: string | null; }
interface Vehicle { id: string; slug: string; name: string; tagline: string | null; description: string; basePrice: number; imageUrl: string; specs: string; trims: Trim[]; }

function SpecsGrid({ specs }: { specs: Record<string, string> }) {
  const labels: Record<string, string> = { range: "Range", acceleration: "0-60 mph", topSpeed: "Top Speed", cargo: "Cargo", seating: "Seating", drivetrain: "Drivetrain" };
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
      {Object.entries(specs).map(([key, val]) => (
        <div key={key} className="bg-secondary rounded-lg p-2.5 text-center">
          <p className="text-muted-foreground text-[10px] font-medium uppercase tracking-wider">{labels[key] || key}</p>
          <p className="text-foreground text-sm font-bold mt-0.5">{val}</p>
        </div>
      ))}
    </div>
  );
}

export default function VehiclesPage() {
  const router = useRouter();
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/vehicles");
        const json = await res.json();
        if (json.success) setVehicles(json.data); else setError("Failed");
      } catch { setError("Error"); }
      finally { setLoading(false); }
    })();
  }, []);

  return (
    <div className="space-y-5">
      <div className="relative bg-gradient-to-br from-primary/20 via-card to-card border border-primary/20 rounded-2xl p-6 overflow-hidden">
        <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 rounded-full blur-3xl" />
        <div className="relative">
          <h2 className="text-foreground font-bold text-xl">Tesla Showroom</h2>
          <p className="text-muted-foreground text-sm mt-1">Browse our complete lineup, configure your dream car, and track delivery in real-time.</p>
        </div>
      </div>
      {error && <div className="bg-destructive/10 border border-destructive/30 text-destructive text-sm rounded-xl px-4 py-3">{error}</div>}
      {loading ? (<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{[1,2,3].map(i => <div key={i} className="bg-card border border-border rounded-2xl h-80 animate-pulse" />)}</div>) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{vehicles.map(v => {
          const specs = typeof v.specs === "string" ? JSON.parse(v.specs) : v.specs;
          const minP = v.trims.length ? Math.min(...v.trims.map(t => t.price)) : v.basePrice;
          return (
            <button key={v.id} onClick={() => router.push(`/vehicles/detail?slug=${v.slug}`)} className="group block w-full text-left">
              <div className="bg-card border border-border rounded-2xl overflow-hidden hover:border-primary/40 transition-all">
                <div className="relative h-48 bg-secondary overflow-hidden">
                  <img src={v.imageUrl} alt={v.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute inset-0 bg-gradient-to-t from-card/90 via-transparent to-transparent" />
                  <div className="absolute bottom-3 left-3 right-3"><h3 className="text-foreground font-bold text-base">{v.name}</h3>{v.tagline && <p className="text-muted-foreground text-[11px] mt-0.5">{v.tagline}</p>}</div>
                </div>
                <div className="p-3">
                  <SpecsGrid specs={specs} />
                  <div className="mt-3 pt-3 border-t border-border flex items-center justify-between">
                    <span className="text-foreground font-bold text-sm">From ${minP.toLocaleString()}</span>
                    <span className="text-primary text-xs font-semibold">Configure</span>
                  </div>
                </div>
              </div>
            </button>
          );
        })}</div>
      )}
      <ChatWidget />
    </div>
  );
}