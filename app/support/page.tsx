"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, LifeBuoy, Bot, Mail, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";

interface Topic { id: string; label: string; answer: string }

const TOPICS: Topic[] = [
  {
    id: "pago",
    label: "¿Cómo funciona el pago?",
    answer: "Cuando comprás algo dentro de un chat, tu pago queda retenido por Ropinder (no va directo al vendedor). Recién se libera cuando vos confirmás que recibiste la prenda. Los fondos liberados quedan disponibles para retirar 48hs después.",
  },
  {
    id: "reembolso",
    label: "No recibí mi prenda / quiero un reembolso",
    answer: "Andá al chat de ese match y tocá el ícono de bandera 🚩 para reportarlo, con el motivo que corresponda. Nuestro equipo revisa el caso y, si corresponde, te reembolsa el pago — incluso si ya se le había liberado al vendedor.",
  },
  {
    id: "retiro",
    label: "¿Cómo retiro mi plata?",
    answer: "Desde tu perfil, en la sección de saldo. El dinero recién liberado tiene una espera de 48hs; entre las 48hs y 72hs se puede retirar con un pequeño cargo, y después de 72hs no tiene cargo.",
  },
  {
    id: "premium",
    label: "¿Qué es Premium y la insignia verificada?",
    answer: "Premium te da swipes ilimitados y mejor comisión al vender. Podés elegirlo por día, semana, mes o año — el plan mensual y el anual incluyen la insignia de verificado. También podés comprar la insignia sola desde /premium.",
  },
  {
    id: "contraseña",
    label: "Olvidé mi contraseña / quiero cambiarla",
    answer: "Desde tu perfil, en Configuración, tenés la opción 'Cambiar contraseña'. Si no podés entrar a tu cuenta, escribinos por acá abajo y te ayudamos a resetearla.",
  },
  {
    id: "cuenta",
    label: "Mi cuenta fue suspendida",
    answer: "Las cuentas se suspenden cuando hay reportes fundados o se detecta contenido falso/engañoso (por ejemplo, fotos generadas por IA presentadas como reales). Si creés que fue un error, escribinos por acá abajo explicando tu caso.",
  },
];

export default function SupportPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [selected, setSelected] = useState<Topic | null>(null);
  const [showContact, setShowContact] = useState(false);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSend() {
    setSending(true);
    const res = await fetch("/api/support/contact", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ message }),
    });
    if (res.ok) setSent(true);
    setSending(false);
  }

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) { router.push("/login"); return null; }

  return (
    <div className="max-w-sm mx-auto px-4 pt-6 pb-10">
      <Link href="/profile" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4">
        <ArrowLeft size={16} /> Volver
      </Link>
      <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <LifeBuoy size={18} className="text-rose-500" /> Ayuda
      </h1>

      <div className="flex items-start gap-2 bg-slate-50 rounded-2xl p-3 mb-4">
        <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
          <Bot size={14} className="text-rose-500" />
        </div>
        <p className="text-sm text-slate-600">Hola {user.name} 👋 ¿En qué te puedo ayudar? Elegí un tema:</p>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {TOPICS.map((t) => (
          <button key={t.id} onClick={() => { setSelected(t); setShowContact(false); }}
            className={`text-left text-sm px-4 py-2.5 rounded-xl border transition ${selected?.id === t.id ? "bg-rose-50 border-rose-200 text-rose-700" : "bg-white border-slate-100 text-slate-600 hover:bg-slate-50"}`}>
            {t.label}
          </button>
        ))}
      </div>

      <AnimatePresence>
        {selected && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-start gap-2 bg-slate-50 rounded-2xl p-3 mb-4">
            <div className="w-7 h-7 rounded-full bg-rose-100 flex items-center justify-center flex-shrink-0">
              <Bot size={14} className="text-rose-500" />
            </div>
            <p className="text-sm text-slate-600">{selected.answer}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {!showContact && !sent && (
        <button onClick={() => setShowContact(true)} className="w-full text-center text-sm text-rose-500 font-semibold py-2.5 hover:underline">
          ¿Necesitás hablar con una persona?
        </button>
      )}

      <AnimatePresence>
        {showContact && !sent && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 mt-2">
            <p className="text-xs text-slate-500 mb-2 flex items-center gap-1.5">
              <Mail size={13} /> Te va a llegar a Soporte.Ropinder@gmail.com, respondemos por mail.
            </p>
            <textarea value={message} onChange={(e) => setMessage(e.target.value)} placeholder="Contanos tu problema..."
              className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm h-24 resize-none focus:outline-none focus:ring-2 focus:ring-rose-300" />
            <button onClick={handleSend} disabled={sending || !message.trim()}
              className="w-full mt-2 bg-rose-500 text-white text-sm font-semibold py-2.5 rounded-xl hover:bg-rose-600 transition disabled:opacity-50">
              {sending ? "Enviando..." : "Enviar consulta"}
            </button>
          </motion.div>
        )}
        {sent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 bg-emerald-50 rounded-2xl p-4 mt-2 text-emerald-700 text-sm">
            <CheckCircle size={16} /> Listo, te vamos a responder por mail.
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
