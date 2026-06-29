"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shirt, Gift } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function SignupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ name: "", email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/signup", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json();
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    await refresh();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 px-4">
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
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input type="text" placeholder="Tu nombre" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
          <input type="email" placeholder="Email" value={form.email} onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required />
          <input type="password" placeholder="Contraseña (mín. 6 caracteres)" value={form.password} onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" required minLength={6} />
          {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
            {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
          </motion.button>
        </form>
        <p className="text-center text-sm text-slate-400 mt-6">
          ¿Ya tenés cuenta?{" "}
          <Link href="/login" className="text-rose-500 font-medium hover:underline">Iniciá sesión</Link>
        </p>
      </motion.div>
    </div>
  );
}
