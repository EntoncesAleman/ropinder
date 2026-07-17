"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shirt, Gift, Mail, MapPin } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { GoogleSignInButton } from "@/components/GoogleSignInButton";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: "", fullName: "", email: "", password: "", phone: "" });
  const [address, setAddress] = useState("");
  const [crossStreets, setCrossStreets] = useState("");
  const [postalCode, setPostalCode] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [devCode, setDevCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [formRenderedAt] = useState(() => Date.now());
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);

  async function handleRequestCode(e: React.FormEvent) {
    e.preventDefault();
    if (!acceptedTerms) { setError("Tenés que aceptar los Términos y Condiciones"); return; }
    if (!coords) { setError("Elegí tu domicilio de la lista de sugerencias"); return; }
    if (!form.phone.trim()) { setError("Falta tu celular"); return; }
    setLoading(true); setError("");
    const res = await fetch("/api/auth/signup/request-code", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, hp: "", formRenderedAt }),
    });
    const data = await res.json().catch(() => ({ error: "Error de conexión con el servidor" }));
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    setDevCode(data.devCode ?? null);
    setStep("code");
    setLoading(false);
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/signup/verify", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, code, acceptedTerms, address, crossStreets, postalCode, ...coords }),
    });
    const data = await res.json().catch(() => ({ error: "Error de conexión con el servidor" }));
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    await refresh();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 px-4 py-8">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center">
            <Shirt size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Crear cuenta</h1>
          <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-full px-4 py-1.5 text-xs font-semibold">
            <Gift size={14} /> 5 créditos gratis de bienvenida
          </div>
        </div>

        {step === "form" && (
          <>
            <GoogleSignInButton />
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-slate-100" />
              <span className="text-xs text-slate-400">o registrate con tu email</span>
              <div className="flex-1 h-px bg-slate-100" />
            </div>
          </>
        )}

        {step === "form" ? (
          <form onSubmit={handleRequestCode} className="flex flex-col gap-4">
            <input type="text" placeholder="Nombre y apellido" value={form.fullName} onChange={(e) => setForm((p) => ({ ...p, fullName: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
            <input type="text" placeholder="Nombre de usuario" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
            <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
            <input type="tel" placeholder="Celular" value={form.phone} onChange={(e) => setForm((p) => ({ ...p, phone: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
            <input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required minLength={6} />

            <AddressAutocomplete
              value={address}
              onChange={(v) => { setAddress(v); setCoords(null); }}
              onSelect={(s) => setCoords({ latitude: s.latitude, longitude: s.longitude })}
              placeholder="Domicilio (calle y altura)"
            />
            {address.length >= 3 && !coords && (
              <p className="text-[11px] text-amber-600 -mt-2 flex items-center gap-1"><MapPin size={11} /> Elegí una dirección de la lista para confirmarla.</p>
            )}
            {coords && (
              <p className="text-[11px] text-emerald-600 -mt-2 flex items-center gap-1"><MapPin size={11} /> Domicilio confirmado ✓</p>
            )}

            <div className="flex gap-2">
              <input type="text" placeholder="Entre calles" value={crossStreets} onChange={(e) => setCrossStreets(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <input type="text" placeholder="Código postal" value={postalCode} onChange={(e) => setPostalCode(e.target.value)}
                className="w-32 border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
            </div>

            {/* Honeypot — hidden from real users, bots that auto-fill every field will trip it */}
            <input type="text" name="website" tabIndex={-1} autoComplete="off" style={{ position: "absolute", left: "-9999px", opacity: 0 }} aria-hidden="true" />
            <label className="flex items-start gap-2 text-xs text-slate-500">
              <input type="checkbox" checked={acceptedTerms} onChange={(e) => setAcceptedTerms(e.target.checked)}
                className="mt-0.5 accent-rose-500" />
              Acepto los{" "}
              <Link href="/terms" target="_blank" className="text-rose-500 hover:underline">Términos y Condiciones</Link>
            </label>
            {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading || !acceptedTerms}
              className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
              {loading ? "Enviando código..." : "Continuar"}
            </motion.button>
          </form>
        ) : (
          <form onSubmit={handleVerify} className="flex flex-col gap-4">
            <div className="flex items-center gap-2 bg-slate-50 text-slate-500 rounded-xl px-4 py-3 text-xs">
              <Mail size={16} /> Te mandamos un código a {form.email}
            </div>
            {devCode && (
              <p className="text-xs text-amber-600 bg-amber-50 rounded-xl px-4 py-2 text-center">
                Modo prueba (sin mail configurado) — tu código es: <strong>{devCode}</strong>
              </p>
            )}
            <input type="text" inputMode="numeric" placeholder="Código de 6 dígitos" value={code} onChange={(e) => setCode(e.target.value)}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm text-center tracking-[0.3em] focus:outline-none focus:ring-2 focus:ring-rose-300" required maxLength={6} />
            {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
            <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
              className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
              {loading ? "Verificando..." : "Confirmar y crear cuenta"}
            </motion.button>
            <button type="button" onClick={() => setStep("form")} className="text-xs text-slate-400 hover:underline">
              ← Volver
            </button>
          </form>
        )}

        <p className="text-center text-sm text-slate-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-rose-500 font-medium hover:underline">Iniciá sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}
