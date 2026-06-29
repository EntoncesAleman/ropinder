"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, PackageCheck, CheckCircle } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

interface Message { id: string; senderId: string; text: string; createdAt: string; sender: { id: string; name: string; avatar: string } }
interface ChatData { match: { id: string; userAId: string; userBId: string }; other: { id: string; name: string; avatar: string }; messages: Message[] }

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ChatData | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchChat() {
    const res = await fetch(`/api/matches/${id}/messages`);
    if (res.ok) { const d = await res.json(); setData(d); }
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

  async function handleConfirmReceipt() {
    setConfirming(true);
    setTimeout(() => { setConfirmed(true); setConfirming(false); }, 800);
  }

  if (loading || !data) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando chat...</div>;
  if (!user) return null;

  const { other, messages } = data;

  return (
    <div className="flex flex-col h-screen max-w-sm mx-auto">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
        <Link href="/matches" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <Image src={other.avatar} alt={other.name} width={36} height={36} className="rounded-xl object-cover" />
        <div>
          <p className="font-semibold text-slate-800 text-sm">{other.name}</p>
          <p className="text-xs text-emerald-500 font-medium">Match confirmado ✓</p>
        </div>
      </div>

      <AnimatePresence>
        {!confirmed ? (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex items-center justify-between">
            <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
              <PackageCheck size={14} /> ¿Recibiste la prenda?
            </p>
            <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmReceipt} disabled={confirming}
              className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-amber-600 transition disabled:opacity-60">
              {confirming ? "..." : "Confirmar Recepción"}
            </motion.button>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <p className="text-xs text-emerald-700 font-semibold">¡Recepción confirmada! Fondos liberados al vendedor.</p>
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
