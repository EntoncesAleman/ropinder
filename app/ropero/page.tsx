"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, DollarSign, Crown, Rocket, Plus, Shirt, BadgeCheck, Store, Megaphone, Gavel, Eye, Heart, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

interface ClothingItem {
  id: string; title: string; brand: string; size: string; condition: string;
  imageUrl: string; price: number | null; isBumped: boolean; isAd: boolean; isVip: boolean; createdAt: string;
  viewCount: number; likesCount: number; favoritesCount: number;
}

interface WithdrawInfo {
  withdrawable: number; withdrawableAfterFee: number; feeAppliesTo: number; feeRate: number;
  pending: number; pendingUntil: string | null;
}

export default function RoperoPage() {
  const { user, loading, refresh } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [bumping, setBumping] = useState<string | null>(null);
  const [withdrawInfo, setWithdrawInfo] = useState<WithdrawInfo | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [payoutDestination, setPayoutDestination] = useState("");
  const [withdrawError, setWithdrawError] = useState("");
  const [withdrawRequested, setWithdrawRequested] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [priceDraft, setPriceDraft] = useState("");

  useEffect(() => {
    if (!loading && !user) router.push("/login");
    if (!loading && user?.role === "ADMIN") router.push("/admin");
  }, [user, loading, router]);

  const fetchWithdrawInfo = useCallback(async () => {
    const res = await fetch("/api/transactions/withdraw");
    if (res.ok) setWithdrawInfo(await res.json());
  }, []);

  useEffect(() => {
    if (user && user.role !== "ADMIN") Promise.resolve().then(() => fetchWithdrawInfo());
  }, [user, fetchWithdrawInfo]);

  const fetchItems = useCallback(async () => {
    const res = await fetch(`/api/profile/items`);
    const data = await res.json();
    if (Array.isArray(data)) setItems(data);
  }, []);

  useEffect(() => {
    if (user && user.role !== "ADMIN") Promise.resolve().then(() => fetchItems());
  }, [user, fetchItems]);

  async function handleWithdraw() {
    if (!payoutDestination.trim()) { setWithdrawError("Indicá un CBU, alias o cuenta para recibir el pago"); return; }
    setWithdrawing(true);
    setWithdrawError("");
    const res = await fetch("/api/transactions/withdraw", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ payoutDestination }),
    });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      await refresh(); await fetchWithdrawInfo();
      setPayoutDestination("");
      setWithdrawRequested(true);
      setTimeout(() => setWithdrawRequested(false), 5000);
    } else {
      setWithdrawError(data.error ?? "No se pudo solicitar el retiro");
    }
    setWithdrawing(false);
  }

  async function handleBump(itemId: string) {
    setBumping(itemId);
    const res = await fetch(`/api/clothes/${itemId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "bump" }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); } else { await refresh(); await fetchItems(); }
    setBumping(null);
  }

  async function handleToggleAd(itemId: string) {
    setBumping(itemId);
    const res = await fetch(`/api/clothes/${itemId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "toggleAd" }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); } else { await fetchItems(); }
    setBumping(null);
  }

  async function handlePublishVip(itemId: string) {
    setBumping(itemId);
    const res = await fetch(`/api/clothes/${itemId}`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "publishVip" }) });
    const data = await res.json();
    if (!res.ok) { alert(data.error); } else { await refresh(); await fetchItems(); }
    setBumping(null);
  }

  async function handleSavePrice(itemId: string) {
    const price = Number(priceDraft);
    setEditingPriceId(null);
    if (!Number.isFinite(price) || price <= 0) return;
    const res = await fetch(`/api/clothes/${itemId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ price }),
    });
    if (res.ok) await fetchItems();
  }

  async function handleVerify() {
    setVerifying(true);
    const res = await fetch("/api/profile/verify", { method: "POST" });
    if (res.ok) await refresh();
    else alert((await res.json()).error);
    setVerifying(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user || user.role === "ADMIN") return null;

  return (
    <div className="max-w-sm lg:max-w-5xl mx-auto px-4 lg:px-8 pt-6 pb-6 lg:grid lg:grid-cols-[300px_1fr] lg:gap-8 lg:items-start">
    <div className="lg:sticky lg:top-6 lg:flex lg:flex-col">
      <h1 className="font-extrabold text-slate-800 text-xl mb-5">Ropero</h1>

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
            <p className="text-xs text-emerald-600">Ropinder Cash</p>
          </div>
        </div>
      </div>

      {withdrawInfo && (withdrawInfo.withdrawable > 0 || withdrawInfo.pending > 0) && (
        <div className="bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-6 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-500">Disponible para retirar</span>
            <span className="font-bold text-slate-700">${withdrawInfo.withdrawableAfterFee.toFixed(2)}</span>
          </div>
          {withdrawInfo.feeAppliesTo > 0 && (
            <p className="text-[11px] text-amber-600">
              Incluye ${withdrawInfo.feeAppliesTo.toFixed(2)} con fee del {(withdrawInfo.feeRate * 100).toFixed(0)}% (retiro entre 48hs y 72hs de liberado). Esperá hasta las 72hs para retirar sin fee.
            </p>
          )}
          {withdrawInfo.pending > 0 && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">En espera (todavía no pasaron 48hs)</span>
              <span className="font-semibold text-slate-400">${withdrawInfo.pending.toFixed(2)}</span>
            </div>
          )}
          {withdrawInfo.withdrawable > 0 && !withdrawRequested && (
            <div className="flex flex-col gap-1.5 mt-1">
              <input value={payoutDestination} onChange={(e) => setPayoutDestination(e.target.value)}
                placeholder="CBU, alias o cuenta para recibir el pago"
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-slate-300" />
              {withdrawError && <p className="text-[11px] text-rose-500">{withdrawError}</p>}
              <button onClick={handleWithdraw} disabled={withdrawing}
                className="text-xs bg-slate-700 text-white font-semibold px-3 py-2 rounded-full hover:bg-slate-800 transition disabled:opacity-60 self-start">
                {withdrawing ? "Solicitando..." : `Retirar $${withdrawInfo.withdrawableAfterFee.toFixed(2)}`}
              </button>
              <p className="text-[10px] text-slate-400">Un admin revisa y envía la transferencia — no es instantáneo.</p>
            </div>
          )}
          {withdrawRequested && (
            <p className="text-xs text-emerald-600 font-medium mt-1">Retiro solicitado — te avisamos cuando se envíe.</p>
          )}
        </div>
      )}

      {!user.verified && (
        <button onClick={handleVerify} disabled={verifying || user.credits < 50}
          className="w-full flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 mb-4 text-xs text-blue-700 hover:bg-blue-100 transition disabled:opacity-50">
          <span className="flex items-center gap-2"><BadgeCheck size={14} /> Verificar tu cuenta (50 créditos)</span>
          <span>{verifying ? "..." : "Verificarme"}</span>
        </button>
      )}

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

      {items.length >= 5 && (
        <Link href={`/seller/${user.id}`} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 mb-3 text-xs text-slate-600 hover:bg-slate-100 transition">
          <Store size={14} /> Ver mi perfil en modo tienda →
        </Link>
      )}

      <Link href="/subastas" className="flex items-center gap-2 bg-amber-50 border border-amber-100 rounded-2xl px-4 py-2.5 mb-4 text-xs text-amber-700 hover:bg-amber-100 transition">
        <Gavel size={14} /> Ver subastas activas →
      </Link>
    </div>

    <div>
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
        <div className="flex flex-col gap-3 lg:grid lg:grid-cols-2 xl:grid-cols-3">
          {items.map((item) => (
            <motion.div key={item.id} layout className="flex items-center gap-3 bg-white rounded-2xl p-3 shadow-sm border border-slate-100">
              <Image src={item.imageUrl} alt={item.title} width={56} height={56} className="rounded-xl object-cover" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-slate-800 text-sm truncate">{item.title}</p>
                <p className="text-xs text-slate-400">{item.brand} · Talle {item.size}</p>
                <div className="flex gap-1 mt-1">
                  {item.isBumped && (
                    <span className="inline-flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-0.5">
                      <Rocket size={10} /> Destacada
                    </span>
                  )}
                  {item.isAd && (
                    <span className="inline-flex items-center gap-1 text-xs bg-violet-100 text-violet-700 rounded-full px-2 py-0.5">
                      <Megaphone size={10} /> Publicidad
                    </span>
                  )}
                  {item.isVip && (
                    <span className="inline-flex items-center gap-1 text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-0.5">
                      <Zap size={10} /> VIP
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2.5 mt-1 text-[11px] text-slate-400">
                  <span className="flex items-center gap-0.5"><Eye size={11} /> {item.viewCount}</span>
                  <span className="flex items-center gap-0.5"><Heart size={11} /> {item.likesCount}</span>
                  <span className="flex items-center gap-0.5"><Star size={11} /> {item.favoritesCount}</span>
                </div>
              </div>
              <div className="flex flex-col items-end gap-1">
                {item.price != null && (
                  editingPriceId === item.id ? (
                    <input
                      autoFocus type="number" min="1" step="1" value={priceDraft}
                      onChange={(e) => setPriceDraft(e.target.value)}
                      onBlur={() => handleSavePrice(item.id)}
                      onKeyDown={(e) => e.key === "Enter" && handleSavePrice(item.id)}
                      className="w-20 text-xs font-bold text-emerald-600 border border-emerald-200 rounded px-1.5 py-0.5 text-right focus:outline-none"
                    />
                  ) : (
                    <button onClick={() => { setEditingPriceId(item.id); setPriceDraft(String(item.price)); }}
                      title="Editar precio — si lo bajás, avisamos a quienes le dieron like"
                      className="text-xs font-bold text-emerald-600 hover:underline">
                      ${item.price}
                    </button>
                  )
                )}
                {!item.isBumped && (
                  <button onClick={() => handleBump(item.id)} disabled={bumping === item.id}
                    className="flex items-center gap-1 text-xs bg-amber-100 text-amber-700 rounded-full px-2 py-1 hover:bg-amber-200 transition disabled:opacity-50">
                    <Rocket size={10} /> {bumping === item.id ? "..." : "Bump (3✦)"}
                  </button>
                )}
                {user.premiumPlan === "premium_yearly" && user.isPremium && (
                  <button onClick={() => handleToggleAd(item.id)} disabled={bumping === item.id}
                    className={`flex items-center gap-1 text-xs rounded-full px-2 py-1 transition disabled:opacity-50 ${item.isAd ? "bg-violet-200 text-violet-800" : "bg-violet-100 text-violet-700 hover:bg-violet-200"}`}>
                    <Megaphone size={10} /> {item.isAd ? "Quitar de publicidad" : "Poner en publicidad"}
                  </button>
                )}
                {!item.isVip && (
                  <button onClick={() => handlePublishVip(item.id)} disabled={bumping === item.id}
                    className="flex items-center gap-1 text-xs bg-rose-100 text-rose-700 rounded-full px-2 py-1 hover:bg-rose-200 transition disabled:opacity-50">
                    <Zap size={10} /> {bumping === item.id ? "..." : "Publicar VIP"}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
    </div>
  );
}
