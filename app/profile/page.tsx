"use client";
import { useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Zap, DollarSign, Crown, LogOut, Rocket, Plus, Shirt, Star, Pencil, BadgeCheck, Store, Lock, FileText } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

interface ClothingItem {
  id: string; title: string; brand: string; size: string; condition: string;
  imageUrl: string; price: number | null; isBumped: boolean; createdAt: string;
}

interface WithdrawInfo {
  withdrawable: number; withdrawableAfterFee: number; feeAppliesTo: number; feeRate: number;
  pending: number; pendingUntil: string | null;
}

export default function ProfilePage() {
  const { user, loading, logout, refresh } = useAuth();
  const router = useRouter();
  const [items, setItems] = useState<ClothingItem[]>([]);
  const [bumping, setBumping] = useState<string | null>(null);
  const [withdrawInfo, setWithdrawInfo] = useState<WithdrawInfo | null>(null);
  const [withdrawing, setWithdrawing] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editError, setEditError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");
  const [passwordSaved, setPasswordSaved] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  const fetchWithdrawInfo = useCallback(async () => {
    const res = await fetch("/api/transactions/withdraw");
    if (res.ok) setWithdrawInfo(await res.json());
  }, []);

  useEffect(() => {
    if (user) fetchWithdrawInfo();
  }, [user, fetchWithdrawInfo]);

  async function handleWithdraw() {
    setWithdrawing(true);
    const res = await fetch("/api/transactions/withdraw", { method: "POST" });
    if (res.ok) { await refresh(); await fetchWithdrawInfo(); }
    setWithdrawing(false);
  }

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

  async function handleVerify() {
    setVerifying(true);
    const res = await fetch("/api/profile/verify", { method: "POST" });
    if (res.ok) await refresh();
    else alert((await res.json()).error);
    setVerifying(false);
  }

  function startEditing() {
    setEditName(user?.name ?? "");
    setEditPhone(user?.phone ?? "");
    setEditError("");
    setEditing(true);
  }

  async function handleChangePassword() {
    setSavingPassword(true);
    setPasswordError("");
    const res = await fetch("/api/profile/password", {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    if (!res.ok) { setPasswordError(data.error); setSavingPassword(false); return; }
    setCurrentPassword(""); setNewPassword(""); setPasswordSaved(true);
    setSavingPassword(false);
    setTimeout(() => { setPasswordSaved(false); setChangingPassword(false); }, 1500);
  }

  async function handleAvatarChange(file: File) {
    const fd = new FormData();
    fd.append("file", file);
    const uploadRes = await fetch("/api/upload", { method: "POST", body: fd });
    const { url } = await uploadRes.json();
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ avatar: url }),
    });
    if (res.ok) await refresh();
  }

  async function handleSaveName() {
    setSavingProfile(true);
    setEditError("");
    const res = await fetch("/api/profile", {
      method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: editName, phone: editPhone }),
    });
    const data = await res.json();
    if (!res.ok) { setEditError(data.error); setSavingProfile(false); return; }
    await refresh();
    setEditing(false);
    setSavingProfile(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-6">
      <div className="flex items-start justify-between mb-6">
        <div className="flex items-center gap-3">
          <label className="relative cursor-pointer group">
            <Image src={user.avatar} alt={user.name} width={56} height={56} className="rounded-2xl object-cover border-2 border-rose-100" />
            <div className="absolute inset-0 rounded-2xl bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
              <Pencil size={16} className="text-white" />
            </div>
            <input type="file" accept="image/*" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatarChange(f); }} />
          </label>
          <div>
            {editing ? (
              <div className="flex flex-col gap-1.5">
                <input value={editName} onChange={(e) => setEditName(e.target.value)} placeholder="Nombre de usuario"
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-rose-300" />
                <input value={editPhone} onChange={(e) => setEditPhone(e.target.value)} placeholder="Teléfono (opcional)"
                  className="border border-slate-200 rounded-lg px-2 py-1 text-sm w-40 focus:outline-none focus:ring-2 focus:ring-rose-300" />
                {editError && <p className="text-xs text-rose-500">{editError}</p>}
                <div className="flex gap-2">
                  <button onClick={handleSaveName} disabled={savingProfile} className="text-xs bg-rose-500 text-white font-semibold px-2.5 py-1 rounded-full disabled:opacity-50">
                    {savingProfile ? "..." : "Guardar"}
                  </button>
                  <button onClick={() => setEditing(false)} className="text-xs text-slate-400 px-2.5 py-1">Cancelar</button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-1.5">
                  <h2 className="font-bold text-slate-800 text-lg">{user.name}</h2>
                  {user.verified && <BadgeCheck size={15} className="text-blue-500" />}
                  {user.isPremium && <Crown size={14} className="text-amber-500" />}
                  <button onClick={startEditing} className="text-slate-300 hover:text-rose-500">
                    <Pencil size={12} />
                  </button>
                </div>
                <p className="text-xs text-slate-400">{user.email}</p>
                {user.phone && <p className="text-xs text-slate-400">{user.phone}</p>}
                {user.ratingCount > 0 && (
                  <p className="text-xs text-amber-600 flex items-center gap-1 mt-0.5">
                    <Star size={11} fill="currentColor" /> {user.ratingAvg.toFixed(1)} ({user.ratingCount} calificaciones)
                  </p>
                )}
              </>
            )}
          </div>
        </div>
        <button onClick={handleLogout} className="text-slate-400 hover:text-rose-500 transition p-2">
          <LogOut size={18} />
        </button>
      </div>

      {items.length >= 5 && (
        <Link href={`/seller/${user.id}`} className="flex items-center gap-2 bg-slate-50 border border-slate-100 rounded-2xl px-4 py-2.5 mb-4 text-xs text-slate-600 hover:bg-slate-100 transition">
          <Store size={14} /> Ver mi perfil en modo tienda →
        </Link>
      )}

      {!user.verified && (
        <button onClick={handleVerify} disabled={verifying || user.credits < 50}
          className="w-full flex items-center justify-between bg-blue-50 border border-blue-100 rounded-2xl px-4 py-2.5 mb-4 text-xs text-blue-700 hover:bg-blue-100 transition disabled:opacity-50">
          <span className="flex items-center gap-2"><BadgeCheck size={14} /> Verificar tu cuenta (50 créditos)</span>
          <span>{verifying ? "..." : "Verificarme"}</span>
        </button>
      )}

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
          {withdrawInfo.withdrawable > 0 && (
            <button onClick={handleWithdraw} disabled={withdrawing}
              className="mt-1 text-xs bg-slate-700 text-white font-semibold px-3 py-2 rounded-full hover:bg-slate-800 transition disabled:opacity-60">
              {withdrawing ? "Retirando..." : `Retirar $${withdrawInfo.withdrawableAfterFee.toFixed(2)}`}
            </button>
          )}
        </div>
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

      <div className="mt-8 pt-6 border-t border-slate-100">
        <h3 className="font-bold text-slate-800 mb-3">Configuración</h3>

        {!changingPassword ? (
          <button onClick={() => setChangingPassword(true)} className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500 mb-3">
            <Lock size={15} /> Cambiar contraseña
          </button>
        ) : (
          <div className="bg-slate-50 rounded-2xl p-4 mb-3 flex flex-col gap-2">
            <input type="password" placeholder="Contraseña actual" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <input type="password" placeholder="Contraseña nueva (mín. 6 caracteres)" value={newPassword} onChange={(e) => setNewPassword(e.target.value)}
              className="border border-slate-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            {passwordError && <p className="text-xs text-rose-500">{passwordError}</p>}
            {passwordSaved && <p className="text-xs text-emerald-600">Contraseña actualizada ✓</p>}
            <div className="flex gap-2">
              <button onClick={handleChangePassword} disabled={savingPassword || !currentPassword || newPassword.length < 6}
                className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full disabled:opacity-50">
                {savingPassword ? "..." : "Guardar"}
              </button>
              <button onClick={() => { setChangingPassword(false); setPasswordError(""); }} className="text-xs text-slate-400 px-3 py-1.5">Cancelar</button>
            </div>
          </div>
        )}

        <Link href="/terms" className="flex items-center gap-2 text-sm text-slate-600 hover:text-rose-500">
          <FileText size={15} /> Términos y condiciones
        </Link>
      </div>
    </div>
  );
}
