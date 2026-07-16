"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Crown, Zap, CheckCircle, CreditCard, Lock, BadgeCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

const CREDIT_PACKS = [
  { id: "credits_10", label: "10 créditos", price: "$2.500", desc: "Pack básico", color: "from-blue-400 to-cyan-400" },
  { id: "credits_30", label: "30 créditos", price: "$6.000", desc: "Pack popular", color: "from-violet-500 to-purple-500", popular: true },
  { id: "credits_100", label: "100 créditos", price: "$15.000", desc: "Mejor valor", color: "from-emerald-500 to-teal-500" },
];

const PREMIUM_FEATURES = [
  "Swipes ilimitados",
  "Insignia de verificado incluida",
  "Comisión reducida al 5% en tus ventas (vs. 8% estándar)",
  "Tus prendas aparecen primero en la búsqueda",
];

export default function PremiumPage() {
  const { user, refresh } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleBuy(packId: string) {
    if (!user) { router.push("/login"); return; }
    setSelected(packId); setLoading(true);
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ packId, paymentMethod: "card" }),
    });
    const data = await res.json();
    if (res.ok) {
      await refresh();
      setSuccess(packId);
      setTimeout(() => { setSuccess(null); setSelected(null); }, 2500);
    } else {
      alert(data.error);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-6">
      <div className="text-center mb-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 mb-3">
          <Crown size={32} className="text-white" />
        </div>
        <h1 className="text-2xl font-extrabold text-slate-800">Premium & Créditos</h1>
        <p className="text-sm text-slate-400 mt-1">Precios en ARS</p>
        {user && (
          <div className="flex items-center justify-center gap-2 mt-3 bg-amber-50 rounded-full px-4 py-1.5 inline-flex mx-auto">
            <Zap size={14} className="text-amber-500" />
            <span className="text-sm font-semibold text-amber-700">Tenés {user.credits} créditos</span>
          </div>
        )}
      </div>

      {/* Premium */}
      <motion.div whileTap={{ scale: 0.98 }} className="relative rounded-2xl p-px bg-gradient-to-r from-amber-400 to-orange-500 shadow-md mb-4">
        <div className="bg-white rounded-2xl p-4">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <Crown size={18} className="text-amber-500" />
              <span className="font-bold text-slate-800">Premium mensual</span>
            </div>
            <span className="font-bold text-slate-700 text-sm">$7.999/mes</span>
          </div>
          <ul className="flex flex-col gap-1 mb-3">
            {PREMIUM_FEATURES.map((f) => (
              <li key={f} className="flex items-start gap-1.5 text-xs text-slate-500">
                <CheckCircle size={12} className="text-emerald-500 mt-0.5 flex-shrink-0" /> {f}
              </li>
            ))}
          </ul>
          <AnimatePresence mode="wait">
            {success === "premium_monthly" ? (
              <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }} className="flex justify-center">
                <CheckCircle size={22} className="text-emerald-500" />
              </motion.div>
            ) : user?.isPremium ? (
              <div className="text-center text-xs font-semibold text-amber-600">Ya sos Premium ✓</div>
            ) : (
              <motion.button key="btn" onClick={() => handleBuy("premium_monthly")} disabled={loading && selected === "premium_monthly"}
                className="w-full flex items-center justify-center gap-1.5 text-white text-xs font-semibold py-2.5 rounded-xl bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 transition disabled:opacity-60">
                <CreditCard size={13} /> {loading && selected === "premium_monthly" ? "..." : "Hacerme Premium"}
              </motion.button>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Verified badge standalone */}
      {!user?.verified && (
        <motion.div whileTap={{ scale: 0.98 }} className="relative rounded-2xl p-px bg-gradient-to-r from-blue-400 to-cyan-500 shadow-md mb-4">
          <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <BadgeCheck size={18} className="text-blue-500" />
                <span className="font-bold text-slate-800">Insignia verificada</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">Generá más confianza al vender</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <span className="font-bold text-slate-700 text-sm">$3.500</span>
              <button onClick={() => handleBuy("verified_badge")} disabled={loading && selected === "verified_badge"}
                className="flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r from-blue-400 to-cyan-500 hover:opacity-90 transition disabled:opacity-60">
                <CreditCard size={13} /> {loading && selected === "verified_badge" ? "..." : "Comprar"}
              </button>
            </div>
          </div>
        </motion.div>
      )}

      <h2 className="font-semibold text-slate-700 text-sm mb-3">Créditos sueltos</h2>
      <div className="flex flex-col gap-3">
        {CREDIT_PACKS.map((pack) => (
          <motion.div key={pack.id} whileTap={{ scale: 0.98 }}
            className={`relative rounded-2xl p-px bg-gradient-to-r ${pack.color} shadow-md`}>
            {pack.popular && (
              <div className="absolute -top-2.5 left-4 bg-violet-600 text-white text-xs font-bold px-3 py-0.5 rounded-full">Más popular</div>
            )}
            <div className="bg-white rounded-2xl p-4 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2">
                  <Zap size={18} className="text-amber-500" />
                  <span className="font-bold text-slate-800">{pack.label}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{pack.desc}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className="font-bold text-slate-700 text-sm">{pack.price}</span>
                <AnimatePresence mode="wait">
                  {success === pack.id ? (
                    <motion.div key="success" initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                      <CheckCircle size={22} className="text-emerald-500" />
                    </motion.div>
                  ) : (
                    <motion.button key="btn" onClick={() => handleBuy(pack.id)} disabled={loading && selected === pack.id}
                      className={`flex items-center gap-1.5 text-white text-xs font-semibold px-3 py-1.5 rounded-xl bg-gradient-to-r ${pack.color} hover:opacity-90 transition disabled:opacity-60`}>
                      <CreditCard size={13} /> {loading && selected === pack.id ? "..." : "Comprar"}
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      <div className="flex items-center justify-center gap-2 mt-6 text-xs text-slate-400">
        <Lock size={12} /> Pago simulado — demo de pasarela
      </div>
    </div>
  );
}
