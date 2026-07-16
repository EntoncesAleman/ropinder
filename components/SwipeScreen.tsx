"use client";
import { useState, useEffect, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Heart, X, RefreshCw, Shirt, Zap, Search } from "lucide-react";
import { ClothingCard, ClothingItemWithDistance } from "./ClothingCard";
import { DistanceSlider } from "./DistanceSlider";
import { MatchModal } from "./MatchModal";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

export function SwipeScreen() {
  const { user, refresh } = useAuth();
  const { coords, loading: geoLoading } = useGeolocation();
  const [items, setItems] = useState<ClothingItemWithDistance[]>([]);
  const [radius, setRadius] = useState(20);
  const [loading, setLoading] = useState(false);
  const [matchOpen, setMatchOpen] = useState(false);
  const [matchId, setMatchId] = useState<string | null>(null);
  const [gone, setGone] = useState(false);
  const [noCredits, setNoCredits] = useState(false);
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");

  const fetchItems = useCallback(async () => {
    if (geoLoading || !user) return;
    setLoading(true);
    setNoCredits(false);
    try {
      const q = search ? `&q=${encodeURIComponent(search)}` : "";
      const res = await fetch(`/api/clothes?lat=${coords.lat}&lng=${coords.lng}&radius=${radius}&userId=${user.id}${q}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
      setGone(false);
    } finally {
      setLoading(false);
    }
  }, [coords, radius, geoLoading, user, search]);

  useEffect(() => { fetchItems(); }, [fetchItems]);

  function handleSearchSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSearch(query.trim());
  }

  async function handleSwipe(itemId: string, type: "LIKE" | "DISLIKE") {
    if (!user) return;
    setItems((prev) => prev.filter((i) => i.id !== itemId));
    if (items.length <= 1) setGone(true);

    const res = await fetch("/api/swipe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: user.id, clothingItemId: itemId, type }),
    });
    const data = await res.json();

    if (res.status === 402 && data.code === "NO_CREDITS") {
      setNoCredits(true);
      setItems((prev) => [{ id: itemId, title: "", size: "", brand: "", condition: "", imageUrl: "", distance: 0, user: { id: "", name: "", avatar: "" } }, ...prev]);
      return;
    }

    await refresh();
    if (data.match) {
      setMatchOpen(true);
      setMatchId(data.matchId);
    }
  }

  function handleButton(type: "LIKE" | "DISLIKE") {
    const top = items[items.length - 1];
    if (top) handleSwipe(top.id, type);
  }

  const creditCount = user?.credits ?? 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-rose-50 to-pink-50 flex flex-col items-center">
      <header className="w-full max-w-sm px-4 pt-6 pb-3 flex flex-col items-center gap-1">
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center gap-2">
            <Shirt size={24} className="text-rose-500" />
            <h1 className="text-2xl font-extrabold tracking-tight text-slate-800">
              Ropi<span className="text-rose-500">nder</span>
            </h1>
          </div>
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-full px-3 py-1">
            <Zap size={13} className="text-amber-500" />
            <span className="text-xs font-bold text-amber-700">{creditCount} créditos</span>
          </div>
        </div>
      </header>

      <form onSubmit={handleSearchSubmit} className="w-full max-w-sm px-4 mb-3">
        <div className="relative">
          <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
          <input
            value={query} onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por producto o marca..."
            className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
          />
        </div>
      </form>

      <div className="w-full max-w-sm px-4 mb-3">
        <DistanceSlider value={radius} onChange={(v) => setRadius(v)} />
      </div>

      {noCredits && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-sm mx-4 mb-3 bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 text-center">
          <p className="text-sm text-amber-800 font-medium">Sin créditos para hacer LIKE</p>
          <Link href="/premium" className="text-xs text-amber-600 underline mt-1 block">
            Conseguí más créditos →
          </Link>
        </motion.div>
      )}

      <div className="relative w-full max-w-sm px-4" style={{ height: 460 }}>
        {loading || geoLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 text-sm gap-2">
            <RefreshCw size={16} className="animate-spin" /> Cargando prendas...
          </div>
        ) : gone || items.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
            <Shirt size={48} strokeWidth={1} />
            <p className="text-sm font-medium text-center">No hay más prendas en este radio.</p>
            <button onClick={fetchItems} className="flex items-center gap-2 bg-rose-500 text-white rounded-full px-5 py-2 text-sm font-semibold hover:bg-rose-600 transition">
              <RefreshCw size={14} /> Recargar
            </button>
          </div>
        ) : (
          <AnimatePresence>
            {items.map((item, i) => (
              <motion.div key={item.id} className="absolute inset-0" style={{ zIndex: i }}
                initial={{ scale: 0.94, y: (items.length - 1 - i) * 8 }}
                animate={{ scale: 0.94 + 0.06 * (i / items.length), y: (items.length - 1 - i) * 8 }}
                exit={{ x: 400, opacity: 0, transition: { duration: 0.3 } }}>
                <ClothingCard item={item} onSwipe={handleSwipe} isTop={i === items.length - 1} />
              </motion.div>
            ))}
          </AnimatePresence>
        )}
      </div>

      {!loading && !geoLoading && items.length > 0 && (
        <div className="flex gap-8 mt-5">
          <button onClick={() => handleButton("DISLIKE")}
            className="w-14 h-14 rounded-full bg-white shadow-lg flex items-center justify-center text-slate-400 hover:text-rose-400 transition-all hover:scale-110 border border-slate-100">
            <X size={26} />
          </button>
          <button onClick={() => handleButton("LIKE")}
            className="w-14 h-14 rounded-full bg-rose-500 shadow-lg flex items-center justify-center text-white hover:bg-rose-600 transition-all hover:scale-110">
            <Heart size={26} fill="white" />
          </button>
        </div>
      )}

      <MatchModal open={matchOpen} matchId={matchId} onClose={() => setMatchOpen(false)} />
    </div>
  );
}
