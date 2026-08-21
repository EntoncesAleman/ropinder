"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Check, Search } from "lucide-react";
import { STYLES, POPULAR_BRANDS, type StyleId } from "@/lib/catalog";

export default function OnboardingPreferenciasPage() {
  const router = useRouter();
  const [step, setStep] = useState<"estilo" | "marcas">("estilo");
  const [styles, setStyles] = useState<StyleId[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [brandQuery, setBrandQuery] = useState("");
  const [saving, setSaving] = useState(false);

  function toggleStyle(id: StyleId) {
    setStyles((prev) => (prev.includes(id) ? prev.filter((s) => s !== id) : [...prev, id]));
  }

  function toggleBrand(name: string) {
    setBrands((prev) => (prev.includes(name) ? prev.filter((b) => b !== name) : [...prev, name]));
  }

  async function finish() {
    setSaving(true);
    await fetch("/api/profile/preferences", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ stylePrefs: styles, brandPrefs: brands }),
    }).catch(() => {});
    router.push("/");
  }

  const filteredBrands = POPULAR_BRANDS.filter((b) => b.toLowerCase().includes(brandQuery.toLowerCase()));

  return (
    <div className="min-h-screen bg-white px-4 py-6 max-w-sm mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div className="flex gap-1.5">
          <div className={`h-1.5 w-8 rounded-full ${step === "estilo" ? "bg-rose-500" : "bg-rose-200"}`} />
          <div className={`h-1.5 w-8 rounded-full ${step === "marcas" ? "bg-rose-500" : "bg-slate-100"}`} />
        </div>
        <button onClick={finish} className="text-sm text-slate-400 hover:underline">Saltar</button>
      </div>

      <AnimatePresence mode="wait">
        {step === "estilo" ? (
          <motion.div key="estilo" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Elegí los estilos que te gustan</h1>
            <p className="text-sm text-slate-400 mb-5">Vamos a mostrarte más de lo que te copa. Podés elegir varios.</p>

            <div className="grid grid-cols-2 gap-3 mb-6">
              {STYLES.map((s) => {
                const active = styles.includes(s.id);
                return (
                  <motion.button
                    key={s.id}
                    type="button"
                    whileTap={{ scale: 0.96 }}
                    onClick={() => toggleStyle(s.id)}
                    className={`relative aspect-[4/5] rounded-2xl bg-gradient-to-br ${s.gradient} flex flex-col items-center justify-center gap-2 text-white overflow-hidden ring-2 transition ${active ? "ring-rose-500" : "ring-transparent"}`}
                  >
                    {active && (
                      <div className="absolute top-2 right-2 bg-rose-500 rounded-full p-1">
                        <Check size={12} strokeWidth={3} />
                      </div>
                    )}
                    <span className="text-3xl">{s.emoji}</span>
                    <span className="text-sm font-semibold">{s.label}</span>
                  </motion.button>
                );
              })}
            </div>

            <motion.button whileTap={{ scale: 0.97 }} onClick={() => setStep("marcas")}
              className="w-full bg-rose-500 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-600 transition">
              Continuar
            </motion.button>
          </motion.div>
        ) : (
          <motion.div key="marcas" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
            <h1 className="text-2xl font-bold text-slate-800 mb-1">Seleccioná marcas que te interesen</h1>
            <p className="text-sm text-slate-400 mb-5">Te vamos a priorizar prendas de estas marcas en tu feed.</p>

            <div className="relative mb-4">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                value={brandQuery}
                onChange={(e) => setBrandQuery(e.target.value)}
                placeholder="Buscá por marca"
                className="w-full border border-slate-200 rounded-xl pl-9 pr-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
            </div>

            <div className="flex flex-wrap gap-2 mb-6 max-h-80 overflow-y-auto">
              {filteredBrands.map((b) => {
                const active = brands.includes(b);
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => toggleBrand(b)}
                    className={`px-4 py-2 rounded-full text-sm font-medium border transition ${active ? "bg-rose-500 text-white border-rose-500" : "bg-white text-slate-600 border-slate-200 hover:border-rose-300"}`}
                  >
                    {b}
                  </button>
                );
              })}
              {filteredBrands.length === 0 && (
                <p className="text-sm text-slate-400 py-4">No encontramos esa marca.</p>
              )}
            </div>

            <div className="flex gap-3">
              <button onClick={() => setStep("estilo")} className="px-5 py-3.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50">
                Atrás
              </button>
              <motion.button whileTap={{ scale: 0.97 }} onClick={finish} disabled={saving}
                className="flex-1 bg-rose-500 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
                {saving ? "Guardando..." : "Continuar"}
              </motion.button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
