"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, DollarSign, Crown, LogOut, Rocket, Plus, Shirt } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

interface ClothingItem {
  id: string; title: string; brand: string; size: string; condition: string;
  imageUrl: string; price: number | null; isBumped: boolean; createdAt: string;
}

export default function ProfilePage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [bumping, setBumping] = useState<string | null>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchItems = useCallback(async () => {
    if (!user) return;
    const res = await fetch(`/api/clothes?lat=${user.latitude}&lng=${user.longitude}&radius=9999&ownerId=${user.id}`);
    const data = await res.json();
    setItems(Array.isArray(data) ? data.filter((i: ClothingItem & { user: { id: string } }) => i.user?.id === user.id || true) : []);
  }, [user]);

  useEffect(() => {
    if (!user) return;
    fetch(`/api/profile/items`).then((r) => r.json()).then((d) => { if (Array.isArray(d)) setItems(d); });
  }, [user]);

  async function handleBump(itemId: string) {
    setBumping(itemId);
    const res = await fetch(`/api/clothes/${itemId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bump" }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); } else { await refresh(); await fetchItems(); }
    setBumping(null);
  }

  async function handleLogout() {
    await logout();
    router.push("/login");
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <Image src={user.avatar} alt={user.name} width={56} height={56} className="rounded-2xl object-cover border-2 border-rose-100" />
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-bold text-slate-800 text-lg">{user.name}</h2>
              {user.isPremium && <Crown size={14} className="text-amber-500" />}
            </div>
            <p className="text-xs text-slate-400">{user.email}</p>
          </div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition p-2">
          <LogOut size={18} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-6">
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex items-center gap-3">
          <Zap size={22} className="text-amber-500" />
          <div>
            <p className="text-2xl font-extrabold text-amber-700">{user.credits}</p>
            <p className="text-xs text-amber-600">Créditos</p>
          </div>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 flex items-center gap-3">
          <DollarSign size={22} className="text-emerald-500" />
          <div>
            <p className="text-2xl font-extrabold text-emerald-700">${user.balance.toFixed(2)}</p>
            <p className="text-xs text-emerald-600">Monedero</p>
          </div>
        </div>
      </div>

      {user.isPremium ? (
        <div className="flex items-center gap-2 bg-gradient-to-r from-amber-400 to-orange-400 text-white rounded-2xl px-4 py-3 mb-6">
          <Crown size={18} /> <span className="font-semibold text-sm">Cuenta Premium activa — Swipes ilimitados</span>
        </div>
      ) : (
        <Link href="/premium" className="flex items-center justify-between bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-2xl px-4 py-3 mb-6 hover:opacity-90 transition">
          <div className="flex items-center gap-2"><Crown size={18} /><span className="font-semibold text-sm">Hacete Premium</span></div>
          <span className="text-xs opacity-80">Swipes ilimitados →</span>
        </Link>
      )}

      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-slate-800">Mis prendas</h3>
        <Link href="/profile/upload" className="flex items-center gap-1 text-xs text-rose-500 font-semibold hover:underline">
          <Plus size={14} /> Subir
        </Link>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-10 text-slate-300">
          <Shirt size={40} strokeWidth={1} />
          <p className="text-sm text-center">Publicá tu primera prenda<br />y ganás 2 créditos</p>
          <Link href="/profile/upload" className="bg-rose-500 text-white text-sm font-semibold px-5 py-2 rounded-full hover:bg-rose-600 transition">
            Publicar prenda
          </Link>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {items.map((item) => (
            <motion.div key={item.id} layout className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <Image src={item.imageUrl} alt={item.title} width={56} height={56} className="rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                <p className="text-xs text-slate-400">{item.brand} · Talle {item.size}</p>
                {item.isBumped && (
                  <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5 mt-1">
                    <Rocket size={10} /> Destacada
                  </span>
                )}
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.price && <p className="text-xs font-bold text-emerald-600">${item.price}</p>}
                {!item.isBumped && (
                  <button onClick={() => handleBump(item.id)} disabled={bumping === item.id}
                    className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-1 hover:bg-amber-200 transition disabled:opacity-50">
                    <Rocket size={10} /> {bumping === item.id ? "..." : "Bump (3✦)"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
