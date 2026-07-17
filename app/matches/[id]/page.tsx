"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, PackageCheck, CheckCircle, Flag, ShieldCheck, Star } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

interface Message { id: string; senderId: string; text: string; createdAt: string; sender: { id: string; name: string; avatar: string } }
interface SellerItem { id: string; title: string; price: number | null }
interface Escrow { id: string; amount: number; type: "ESCROW_HOLD" | "ESCROW_RELEASE"; status: string; meta: { buyerId?: string; sellerId?: string } }
interface MyRating { id: string; score: number }
interface ChatData {
  match: { id: string; userAId: string; userBId: string };
  other: { id: string; name: string; avatar: string };
  messages: Message[];
  escrow: Escrow | null;
  myRating: MyRating | null;
}

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ChatData | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payAmount, setPayAmount] = useState("");
  const [payItemId, setPayItemId] = useState("");
  const [sellerItems, setSellerItems] = useState<SellerItem[]>([]);
  const [payError, setPayError] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchChat() {
    const res = await fetch(`/api/matches/${id}/messages`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      if (!d.escrow) {
        const sres = await fetch(`/api/sellers/${d.other.id}`);
        if (sres.ok) setSellerItems((await sres.json()).items ?? []);
      }
    }
  }

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) fetchChat();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [data?.messages.length]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchChat, 3000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  async function handleSend(e: React.FormEvent) {
    e.preventDefault();
    if (!text.trim() || sending) return;
    setSending(true);
    await fetch(`/api/matches/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    setText("");
    await fetchChat();
    setSending(false);
  }

  async function handlePay() {
    const amount = Number(payAmount);
    if (!amount || amount <= 0) { setPayError("Ingresá un monto válido"); return; }
    setPaying(true);
    setPayError("");
    const res = await fetch(`/api/matches/${id}/pay`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount, itemId: payItemId || undefined }),
    });
    const d = await res.json();
    if (!res.ok) setPayError(d.error ?? "Error al pagar");
    else await fetchChat();
    setPaying(false);
  }

  async function handleConfirmReceipt() {
    setConfirming(true);
    const res = await fetch("/api/transactions/release", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ matchId: id }),
    });
    if (res.ok) await fetchChat();
    setConfirming(false);
  }

  async function handleRate(score: number) {
    setRatingSaving(true);
    setRatingScore(score);
    const res = await fetch(`/api/matches/${id}/rate`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ score }),
    });
    if (res.ok) await fetchChat();
    setRatingSaving(false);
  }

  async function handleReport() {
    if (!reportReason.trim() || !data) return;
    await fetch("/api/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reportedUserId: data.other.id, matchId: id, reason: reportReason.trim() }),
    });
    setReportSent(true);
    setReporting(false);
  }

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando chat...</div>;
  if (!user) return null;

  const { other, messages, escrow, myRating } = data;
  const isBuyer = escrow?.meta.buyerId === user.id;
  const released = escrow?.type === "ESCROW_RELEASE";

  return (
    <div className="flex flex-col h-screen max-w-sm mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
        <Link href="/matches" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <Link href={`/seller/${other.id}`} className="flex items-center gap-3 flex-1 min-w-0">
          <Image src={other.avatar} alt={other.name} width={36} height={36} className="rounded-xl object-cover" />
          <div className="min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{other.name}</p>
            <p className="text-xs text-emerald-500 font-medium">Match confirmado ✓</p>
          </div>
        </Link>
        <button
          onClick={() => setReporting((v) => !v)}
          disabled={reportSent}
          className="text-slate-300 hover:text-rose-500 transition p-1 disabled:opacity-40"
          title="Reportar"
        >
          <Flag size={16} />
        </button>
      </div>

      <AnimatePresence>
        {reporting && !reportSent && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-rose-50 border-b border-rose-100 px-4 py-3 flex flex-col gap-2">
            <p className="text-xs font-semibold text-rose-700">Reportar a {other.name}</p>
            <select
              value={reportReason}
              onChange={(e) => setReportReason(e.target.value)}
              className="text-xs border border-rose-200 rounded-lg px-2 py-1.5 bg-white"
            >
              <option value="">Elegí un motivo...</option>
              <option value="Prenda no coincide con la publicación">Prenda no coincide con la publicación</option>
              <option value="Imagen generada por IA o engañosa">Imagen generada por IA o engañosa</option>
              <option value="No responde / no entrega">No responde / no entrega</option>
              <option value="Comportamiento inapropiado">Comportamiento inapropiado</option>
              <option value="Posible estafa">Posible estafa</option>
              <option value="Otro">Otro</option>
            </select>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setReporting(false)} className="text-xs text-slate-500 px-3 py-1.5">Cancelar</button>
              <button
                onClick={handleReport}
                disabled={!reportReason.trim()}
                className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-rose-600 transition disabled:opacity-50"
              >
                Enviar reporte
              </button>
            </div>
          </motion.div>
        )}
        {reportSent && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-slate-100 px-4 py-2 text-xs text-slate-500">
            Reporte enviado. El equipo lo va a revisar.
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {!escrow && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex flex-col gap-2">
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} /> El pago queda en custodia de Ropinder hasta confirmar la entrega.
            </p>
            {sellerItems.length > 0 && (
              <select value={payItemId} onChange={(e) => {
                setPayItemId(e.target.value);
                const item = sellerItems.find((i) => i.id === e.target.value);
                if (item?.price) setPayAmount(String(item.price));
              }} className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="">¿Qué prenda estás pagando? (opcional)</option>
                {sellerItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.title}{i.price ? ` — $${i.price}` : ""}</option>
                ))}
              </select>
            )}
            <div className="flex items-center gap-2">
              <input
                type="number" min="0" step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)}
                placeholder="Monto acordado ($)"
                className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300"
              />
              <button onClick={handlePay} disabled={paying}
                className="text-xs bg-slate-700 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-slate-800 transition disabled:opacity-60">
                {paying ? "..." : "Pagar"}
              </button>
            </div>
            {payError && <p className="text-xs text-rose-500">{payError}</p>}
          </motion.div>
        )}

        {escrow?.type === "ESCROW_HOLD" && isBuyer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <PackageCheck size={14} /> ¿Recibiste la prenda? (${escrow.amount} en custodia)
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmReceipt} disabled={confirming}
              className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-amber-600 transition disabled:opacity-60">
              {confirming ? "..." : "Confirmar Recepción"}
            </motion.button>
          </motion.div>
        )}

        {escrow?.type === "ESCROW_HOLD" && !isBuyer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center gap-2">
            <ShieldCheck size={16} className="text-amber-500" />
            <p className="text-xs text-amber-700 font-semibold">${escrow.amount} en custodia — esperando que {other.name} confirme la recepción.</p>
          </motion.div>
        )}

        {released && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <p className="text-xs text-emerald-700 font-semibold">
              ¡Recepción confirmada! Fondos liberados{!isBuyer ? " — disponibles para retiro en 48hs" : ""}.
            </p>
          </motion.div>
        )}

        {released && !myRating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border-b border-slate-100 px-4 py-2.5 flex items-center gap-2">
            <p className="text-xs text-slate-500">Calificá a {other.name}:</p>
            <div className="flex gap-0.5">
              {[1, 2, 3, 4, 5].map((n) => (
                <button key={n} onClick={() => handleRate(n)} disabled={ratingSaving} className="disabled:opacity-50">
                  <Star size={16} className={n <= ratingScore ? "text-amber-400" : "text-slate-200"} fill={n <= ratingScore ? "currentColor" : "none"} />
                </button>
              ))}
            </div>
          </motion.div>
        )}
        {released && myRating && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-white border-b border-slate-100 px-4 py-2 text-xs text-slate-400">
            Calificaste a {other.name} con {myRating.score} ⭐
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-3 bg-slate-50">
        {messages.length === 0 && (
          <div className="text-center text-slate-300 text-sm mt-10">
            ¡Match nuevo! Decile hola 👋
          </div>
        )}
        {messages.map((msg) => {
          const isMe = msg.senderId === user.id;
          return (
            <motion.div key={msg.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className={`flex items-end gap-2 ${isMe ? "flex-row-reverse" : ""}`}>
              {!isMe && <Image src={msg.sender.avatar} alt={msg.sender.name} width={28} height={28} className="rounded-lg object-cover flex-shrink-0" />}
              <div className={`max-w-[75%] rounded-2xl px-3.5 py-2.5 text-sm ${isMe ? "bg-rose-500 text-white rounded-br-sm" : "bg-white text-slate-800 rounded-bl-sm shadow-sm border border-slate-100"}`}>
                {msg.text}
              </div>
            </motion.div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSend} className="flex items-center gap-2 px-4 py-3 bg-white border-t border-slate-100">
        <input
          value={text} onChange={(e) => setText(e.target.value)}
          placeholder="Escribí un mensaje..."
          className="flex-1 border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300"
        />
        <motion.button whileTap={{ scale: 0.9 }} type="submit" disabled={!text.trim() || sending}
          className="w-10 h-10 rounded-xl bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition disabled:opacity-50">
          <Send size={16} />
        </motion.button>
      </form>
    </div>
  );
}
