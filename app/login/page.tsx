"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import { Shirt, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

export default function LoginPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    const res = await fetch("/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await res.json().catch(() => ({ error: "Error de conexión con el servidor" }));
    if (!res.ok) { setError(data.error); setLoading(false); return; }
    await refresh();
    router.push("/");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-rose-50 to-pink-100 px-4">
      <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-sm bg-white rounded-3xl shadow-xl p-8">
        <div className="flex flex-col items-center gap-2 mb-8">
          <div className="w-14 h-14 rounded-2xl bg-rose-500 flex items-center justify-center">
            <Shirt size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800">Bienvenido</h1>
          <p className="text-sm text-slate-400">Iniciá sesión en Ropinder</p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email" placeholder="Email" value={form.email}
            onChange={(e) => setForm((p) => ({ ...p, email: e.target.value }))}
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
            required
          />
          <div className="relative">
            <input
              type={showPw ? "text" : "password"} placeholder="Contraseña" value={form.password}
              onChange={(e) => setForm((p) => ({ ...p, password: e.target.value }))}
              className="w-full border border-slate-200 rounded-xl px-4 py-3 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
              required
            />
            <button type="button" onClick={() => setShowPw((v) => !v)} className="absolute right-3 top-3 text-slate-400">
              {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {error && <p className="text-rose-500 text-sm text-center">{error}</p>}
          <motion.button whileTap={{ scale: 0.97 }} type="submit" disabled={loading}
            className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
            {loading ? "Ingresando..." : "Ingresar"}
          </motion.button>
        </form>
        <p className="text-center text-sm text-slate-400 mt-6">
          ¿No tenés cuenta?{" "}
          <Link href="/signup" className="text-rose-500 font-medium hover:underline">Registrate</Link>
        </p>
      </motion.div>
    </div>
  );
}
