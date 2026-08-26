"use client";
import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { Search, ArrowLeft, MapPin, SlidersHorizontal, Repeat, Gavel, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useGeolocation } from "@/hooks/useGeolocation";
import { CATEGORIES, SIZES_CLOTHING } from "@/lib/catalog";
import Image from "next/image";

interface SearchItem {
  id: string; title: string; brand: string; size: string; price: number | null;
  imageUrl: string; distance: number;
  user: { id: string; name: string; avatar: string };
  auction?: { id: string; currentPrice: number; endsAt: string; _count: { bids: number } } | null;
}

export default function BuscarPage() {
  const { user } = useAuth();
  const { coords } = useGeolocation();
  const [q, setQ] = useState("");
  const [category, setCategory] = useState("");
  const [size, setSize] = useState("");
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [canjeOnly, setCanjeOnly] = useState(false);
  const [auctionOnly, setAuctionOnly] = useState(false);
  const [sortBy, setSortBy] = useState("recent");
  const [showFilters, setShowFilters] = useState(false);
  const [items, setItems] = useState<SearchItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchResults = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const params = new URLSearchParams({ lat: String(coords.lat), lng: String(coords.lng), sortBy });
    if (q.trim()) params.set("q", q.trim());
    if (category) params.set("category", category);
    if (size) params.set("size", size);
    if (auctionOnly) params.set("auctionOnly", "true");
    else if (canjeOnly) params.set("canjeOnly", "true");
    else {
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
    }
    const res = await fetch(`/api/clothes/search?${params.toString()}`);
    setItems(res.ok ? await res.json() : []);
    setLoading(false);
  }, [user, coords, q, category, size, minPrice, maxPrice, canjeOnly, auctionOnly, sortBy]);

  useEffect(() => { Promise.resolve().then(() => fetchResults()); }, [fetchResults]);

  const filterControls = (
    <>
      <div className="grid grid-cols-2 gap-2">
        <select value={category} onChange={(e) => setCategory(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white">
          <option value="">Categoría</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={size} onChange={(e) => setSize(e.target.value)} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white">
          <option value="">Talle</option>
          {SIZES_CLOTHING.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>
      <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2">
        <input type="checkbox" checked={canjeOnly} disabled={auctionOnly}
          onChange={(e) => setCanjeOnly(e.target.checked)} className="accent-rose-500 disabled:opacity-40" />
        <Repeat size={13} /> Solo prendas para canje (sin precio)
      </label>
      <label className="flex items-center gap-2 text-xs text-slate-600 bg-slate-50 rounded-lg px-2.5 py-2">
        <input type="checkbox" checked={auctionOnly} disabled={canjeOnly}
          onChange={(e) => setAuctionOnly(e.target.checked)} className="accent-amber-500 disabled:opacity-40" />
        <Gavel size={13} /> Solo subastas activas
      </label>
      <div className="grid grid-cols-2 gap-2">
        <input type="number" min="0" value={minPrice} onChange={(e) => setMinPrice(e.target.value)} placeholder="Precio mín."
          disabled={canjeOnly || auctionOnly} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs disabled:opacity-40" />
        <input type="number" min="0" value={maxPrice} onChange={(e) => setMaxPrice(e.target.value)} placeholder="Precio máx."
          disabled={canjeOnly || auctionOnly} className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs disabled:opacity-40" />
      </div>
      <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
        className="border border-slate-200 rounded-lg px-2.5 py-2 text-xs bg-white">
        <option value="recent">Más recientes</option>
        <option value="price_asc">Precio: menor a mayor</option>
        <option value="price_desc">Precio: mayor a menor</option>
      </select>
    </>
  );

  const resultsGrid = loading ? (
    <p className="text-center text-sm text-slate-400 py-10">Buscando...</p>
  ) : items.length === 0 ? (
    <p className="text-center text-sm text-slate-400 py-10">No encontramos prendas con esos filtros.</p>
  ) : (
    <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-2.5 lg:gap-4 px-4 lg:px-0">
      {items.map((item) => (
        <Link key={item.id} href={item.auction ? `/subastas/${item.auction.id}` : `/item/${item.id}`}
          className="rounded-2xl overflow-hidden bg-white border border-slate-100 hover:shadow-md transition">
          <div className="relative w-full aspect-square">
            <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 480px) 50vw, 240px" className="object-cover" />
            {item.auction && (
              <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-semibold bg-amber-500 text-white rounded-full px-2 py-0.5">
                <Gavel size={9} /> Subasta
              </span>
            )}
          </div>
          <div className="p-2.5">
            <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
            <p className="text-[11px] text-slate-400">{item.brand} · {item.size}</p>
            {item.auction ? (
              <div className="flex items-center justify-between mt-1">
                <p className="text-sm font-bold text-slate-900">${item.auction.currentPrice}</p>
                <span className="flex items-center gap-0.5 text-[10px] text-slate-400"><Users size={10} /> {item.auction._count.bids}</span>
              </div>
            ) : (
              <div className="flex items-center justify-between mt-1">
                {item.price != null ? (
                  <p className="text-sm font-bold text-slate-900">${item.price}</p>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] font-semibold text-emerald-600">
                    <Repeat size={10} /> Canje
                  </span>
                )}
                <span className="flex items-center gap-0.5 text-[10px] text-rose-400">
                  <MapPin size={10} /> {item.distance.toFixed(1)}km
                </span>
              </div>
            )}
          </div>
        </Link>
      ))}
    </div>
  );

  return (
    <div className="max-w-sm lg:max-w-6xl mx-auto pb-8 lg:pt-6 lg:px-8 lg:flex lg:gap-8 lg:items-start">
      {/* Desktop: persistent filter sidebar, no toggle needed with the extra width */}
      <aside className="hidden lg:flex lg:flex-col lg:gap-3 lg:w-64 lg:flex-shrink-0 bg-white border border-slate-100 rounded-2xl p-4">
        <h2 className="font-bold text-slate-800 text-sm flex items-center gap-1.5"><SlidersHorizontal size={14} /> Filtros</h2>
        {filterControls}
      </aside>

      <div className="lg:flex-1 lg:min-w-0">
        <div className="flex items-center gap-3 px-4 lg:px-0 pt-6 lg:pt-0 pb-3">
          <Link href="/" aria-label="Volver" className="text-slate-400 hover:text-slate-600 lg:hidden"><ArrowLeft size={20} /></Link>
          <h1 className="text-xl font-bold text-slate-800">Buscar</h1>
        </div>

        <div className="px-4 lg:px-0 flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-300" />
              <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar por producto o marca..."
                className="w-full bg-white border border-slate-200 rounded-full pl-9 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>
            <button onClick={() => setShowFilters((v) => !v)}
              className={`lg:hidden p-2.5 rounded-full border transition ${showFilters ? "bg-rose-500 border-rose-500 text-white" : "bg-white border-slate-200 text-slate-500"}`}>
              <SlidersHorizontal size={16} />
            </button>
          </div>

          {showFilters && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }}
              className="lg:hidden flex flex-col gap-2 bg-white border border-slate-100 rounded-2xl p-3">
              {filterControls}
            </motion.div>
          )}
        </div>

        {resultsGrid}
      </div>
    </div>
  );
}
