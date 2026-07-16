"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, ArrowLeft } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

interface FavoriteItem {
  itemId: string;
  item: { id: string; title: string; brand: string; size: string; imageUrl: string; price: number | null; user: { id: string; name: string; avatar: string } };
}

export default function FavoritesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteItem[]>([]);

  const fetchFavorites = useCallback(async () => {
    const res = await fetch("/api/favorites");
    if (res.ok) setFavorites(await res.json());
  }, []);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) fetchFavorites();
  }, [user, loading, router, fetchFavorites]);

  async function remove(itemId: string) {
    setFavorites((prev) => prev.filter((f) => f.itemId !== itemId));
    await fetch("/api/favorites", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId }) });
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>
      <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Heart size={18} className="text-rose-500" fill="currentColor" /> Favoritos
      </h1>

      {favorites.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
          <Heart size={40} strokeWidth={1} />
          <p className="text-sm text-center">Todavía no guardaste ninguna prenda.</p>
        </div>
      ) : (
        <AnimatePresence>
          <div className="flex flex-col gap-3">
            {favorites.map(({ itemId, item }) => (
              <motion.div key={itemId} layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
                <Link href={`/seller/${item.user.id}`} className="flex items-center gap-3 flex-1 min-w-0">
                  <Image src={item.imageUrl} alt={item.title} width={56} height={56} className="rounded-xl object-cover" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                    <p className="text-xs text-slate-400">{item.brand} · Talle {item.size}</p>
                    <p className="text-xs text-slate-400">de {item.user.name}</p>
                  </div>
                </Link>
                {item.price && <p className="text-xs font-bold text-emerald-600">${item.price}</p>}
                <button onClick={() => remove(itemId)} className="text-slate-300 hover:text-rose-500 p-1">
                  <Heart size={16} fill="currentColor" />
                </button>
              </motion.div>
            ))}
          </div>
        </AnimatePresence>
      )}
    </div>
  );
}
