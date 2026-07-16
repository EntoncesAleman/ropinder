"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { ArrowLeft, Star, BadgeCheck, Store, Rocket, Heart, Flag } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

interface Seller { id: string; name: string; avatar: string; bio: string; ratingAvg: number; ratingCount: number; verified: boolean; createdAt: string }
interface Item { id: string; title: string; brand: string; size: string; imageUrl: string; price: number | null; isBumped: boolean }

export default function SellerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<{ seller: Seller; items: Item[] } | null>(null);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [reportedItems, setReportedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) fetch(`/api/sellers/${id}`).then((r) => r.json()).then((d) => { if (d.seller) setData(d); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, id]);

  useEffect(() => {
    if (!user) return;
    fetch("/api/favorites").then((r) => r.json()).then((favs) => {
      if (Array.isArray(favs)) setFavorites(new Set(favs.map((f: { itemId: string }) => f.itemId)));
    });
  }, [user]);

  async function toggleFavorite(itemId: string) {
    const isFav = favorites.has(itemId);
    setFavorites((prev) => {
      const next = new Set(prev);
      if (isFav) next.delete(itemId); else next.add(itemId);
      return next;
    });
    await fetch("/api/favorites", {
      method: isFav ? "DELETE" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ itemId }),
    });
  }

  async function reportItem(itemId: string) {
    if (!confirm("¿Reportar esta prenda (ej: imagen generada por IA o engañosa)?")) return;
    setReportedItems((prev) => new Set(prev).add(itemId));
    await fetch("/api/reports", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: data?.seller.id, itemId, reason: "Imagen generada por IA o engañosa" }),
    });
  }

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  const { seller, items } = data;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>

      <div className="flex flex-col items-center text-center mb-6">
        <Image src={seller.avatar} alt={seller.name} width={72} height={72} className="rounded-2xl object-cover border-2 border-rose-100 mb-2" />
        <div className="flex items-center gap-1.5">
          <h1 className="font-bold text-slate-800 text-xl">{seller.name}</h1>
          {seller.verified && <BadgeCheck size={16} className="text-blue-500" />}
        </div>
        {seller.bio && <p className="text-sm text-slate-500 mt-1 max-w-xs">{seller.bio}</p>}
        <div className="flex items-center gap-3 mt-2">
          {seller.ratingCount > 0 && (
            <span className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 rounded-full px-3 py-1">
              <Star size={11} fill="currentColor" /> {seller.ratingAvg.toFixed(1)} ({seller.ratingCount})
            </span>
          )}
          <span className="flex items-center gap-1 text-xs text-slate-500 bg-slate-100 rounded-full px-3 py-1">
            <Store size={11} /> {items.length} prendas
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        {items.map((item) => (
          <motion.div key={item.id} layout className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100">
            <div className="relative aspect-square">
              <Image src={item.imageUrl} alt={item.title} fill className="object-cover" />
              {item.isBumped && (
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] bg-amber-400 text-white rounded-full px-2 py-0.5 font-semibold">
                  <Rocket size={9} /> Destacada
                </span>
              )}
              <button onClick={() => toggleFavorite(item.id)}
                className="absolute top-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow">
                <Heart size={13} className={favorites.has(item.id) ? "text-rose-500" : "text-slate-400"} fill={favorites.has(item.id) ? "currentColor" : "none"} />
              </button>
              <button onClick={() => reportItem(item.id)} disabled={reportedItems.has(item.id)}
                className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white/90 flex items-center justify-center shadow disabled:opacity-40">
                <Flag size={12} className="text-slate-400" />
              </button>
            </div>
            <div className="p-2.5">
              <p className="text-xs font-semibold text-slate-800 truncate">{item.title}</p>
              <p className="text-[11px] text-slate-400">{item.brand} · Talle {item.size}</p>
              {item.price && <p className="text-xs font-bold text-emerald-600 mt-0.5">${item.price}</p>}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
