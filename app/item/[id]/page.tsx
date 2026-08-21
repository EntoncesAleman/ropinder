"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Eye, Tag, Ruler, Star, ShieldCheck, Heart, CheckCircle2, MessageCircleQuestion, Send, Repeat } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface Question {
  id: string; text: string; answer: string | null; createdAt: string; answeredAt: string | null;
  asker: { id: string; name: string; avatar: string };
}

interface ItemDetail {
  id: string;
  title: string;
  description: string;
  size: string;
  brand: string;
  condition: string;
  category: string;
  style: string;
  imageUrl: string;
  price: number | null;
  viewCount: number;
  createdAt: string;
  userId: string;
  auction: { id: string } | null;
  user: { id: string; name: string; avatar: string; ratingAvg: number; ratingCount: number; verified: boolean; lastSeenAt: string | null };
}

function timeAgo(iso: string | null): string {
  if (!iso) return "hace un tiempo";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "recién";
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr}h`;
  return `hace ${Math.floor(hr / 24)}d`;
}

export default function ItemDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [item, setItem] = useState<ItemDetail | null>(null);
  const [liking, setLiking] = useState(false);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [askBusy, setAskBusy] = useState(false);
  const [answerDrafts, setAnswerDrafts] = useState<Record<string, string>>({});
  const [answerBusyId, setAnswerBusyId] = useState<string | null>(null);

  async function fetchQuestions() {
    const res = await fetch(`/api/clothes/${id}/questions`);
    if (res.ok) setQuestions(await res.json());
  }

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!user) return;
    Promise.resolve().then(async () => {
      const res = await fetch(`/api/clothes/${id}`);
      if (!res.ok) { setError("No encontramos esta prenda."); return; }
      const data: ItemDetail = await res.json();
      // Auctions have their own dedicated page (live countdown, bid form,
      // bid history) — this page's swipe/offer treatment doesn't apply.
      if (data.auction) { router.replace(`/subastas/${data.auction.id}`); return; }
      setItem(data);
    });
    Promise.resolve().then(() => fetchQuestions());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, id]);

  async function handleAsk(e: React.FormEvent) {
    e.preventDefault();
    if (!newQuestion.trim() || askBusy) return;
    setAskBusy(true);
    const res = await fetch(`/api/clothes/${id}/questions`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: newQuestion }),
    });
    if (res.ok) { setNewQuestion(""); await fetchQuestions(); }
    setAskBusy(false);
  }

  async function handleAnswer(questionId: string) {
    const answer = answerDrafts[questionId];
    if (!answer?.trim()) return;
    setAnswerBusyId(questionId);
    const res = await fetch(`/api/clothes/${id}/questions/${questionId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answer }),
    });
    if (res.ok) { setAnswerDrafts((p) => ({ ...p, [questionId]: "" })); await fetchQuestions(); }
    setAnswerBusyId(null);
  }

  async function handleLike() {
    setLiking(true);
    const res = await fetch("/api/swipe", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clothingItemId: id, type: "LIKE" }),
    });
    if (res.ok) setLiked(true);
    setLiking(false);
  }

  if (loading || (!item && !error)) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (error || !item) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">{error}</div>;

  const isMine = item.userId === user?.id;

  return (
    <div className="max-w-sm lg:max-w-5xl mx-auto pb-8 lg:pt-6 lg:px-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
      <div className="relative w-full aspect-square lg:rounded-2xl lg:overflow-hidden lg:sticky lg:top-6">
        <Image src={item.imageUrl} alt={item.title} fill sizes="(max-width: 1024px) 384px, 480px" priority className="object-cover" />
        <Link href="/" className="absolute top-4 left-4 bg-white/90 rounded-full p-2 shadow lg:hidden">
          <ArrowLeft size={18} className="text-slate-700" />
        </Link>
        <span className="absolute bottom-3 right-3 flex items-center gap-1 text-[11px] font-medium bg-black/60 text-white rounded-full px-2.5 py-1">
          <Eye size={11} /> {item.viewCount} visitas
        </span>
      </div>

      <div className="px-4 pt-4 lg:px-0 lg:pt-0 flex flex-col gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{item.title}</h1>
          {item.price != null ? (
            <p className="text-2xl font-extrabold text-slate-900 mt-1">${item.price}</p>
          ) : (
            <p className="flex items-center gap-1.5 text-sm font-semibold text-emerald-600 mt-1">
              <Repeat size={15} /> Para canje
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
            <Ruler size={12} /> Talle {item.size}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
            <Tag size={12} /> {item.brand}
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">
            <Star size={12} /> {item.condition}
          </span>
        </div>

        {item.description && <p className="text-sm text-slate-500">{item.description}</p>}

        <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3.5 py-2.5 text-xs">
          <ShieldCheck size={16} className="flex-shrink-0" />
          {item.price != null ? (
            <p><strong>Compra protegida.</strong> El pago queda en custodia de Ropinder hasta que confirmes que recibiste la prenda tal como se publicó.</p>
          ) : (
            <p><strong>Canje directo.</strong> Si hacés match, van a coordinar el intercambio por chat y confirmarlo ahí cuando se haga.</p>
          )}
        </div>

        <Link href={`/seller/${item.user.id}`} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3.5 py-3 hover:bg-slate-50 transition">
          <Image src={item.user.avatar} alt={item.user.name} width={40} height={40} className="rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1 truncate">
              {item.user.name}
              {item.user.verified && <CheckCircle2 size={13} className="text-sky-500 flex-shrink-0" />}
            </p>
            <p className="text-xs text-slate-400">
              {item.user.ratingCount > 0 && (
                <span className="flex items-center gap-0.5 inline-flex mr-2">
                  <Star size={11} fill="currentColor" className="text-amber-400" /> {item.user.ratingAvg.toFixed(1)} ({item.user.ratingCount})
                </span>
              )}
              Última conexión: {timeAgo(item.user.lastSeenAt)}
            </p>
          </div>
        </Link>

        {!isMine && (
          <motion.button whileTap={{ scale: 0.97 }} onClick={handleLike} disabled={liking || liked}
            className="w-full bg-rose-500 text-white font-semibold py-3.5 rounded-xl hover:bg-rose-600 transition disabled:opacity-60 flex items-center justify-center gap-2">
            <Heart size={18} fill={liked ? "currentColor" : "none"} />
            {liked ? "¡Te gusta! Si hace match, van a poder chatear" : liking ? "..." : "Me gusta"}
          </motion.button>
        )}

        <div className="border-t border-slate-100 pt-4 mt-1">
          <p className="font-semibold text-slate-800 text-sm flex items-center gap-1.5 mb-3">
            <MessageCircleQuestion size={16} className="text-slate-400" /> Preguntas y respuestas
          </p>

          {!isMine && (
            <form onSubmit={handleAsk} className="flex items-center gap-2 mb-4">
              <input value={newQuestion} onChange={(e) => setNewQuestion(e.target.value)} maxLength={500}
                placeholder="Escribí tu pregunta..."
                className="flex-1 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-rose-300" />
              <button type="submit" disabled={!newQuestion.trim() || askBusy} aria-label="Enviar pregunta"
                className="w-10 h-10 flex-shrink-0 rounded-xl bg-rose-500 flex items-center justify-center text-white hover:bg-rose-600 transition disabled:opacity-50">
                <Send size={15} />
              </button>
            </form>
          )}

          {questions.length === 0 && <p className="text-xs text-slate-400">Todavía no hay preguntas — sé el primero.</p>}

          <div className="flex flex-col gap-3">
            {questions.map((q) => (
              <div key={q.id} className="text-sm">
                <div className="flex items-start gap-2">
                  <Image src={q.asker.avatar} alt={q.asker.name} width={24} height={24} className="rounded-full object-cover flex-shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="text-slate-700"><span className="font-semibold">{q.asker.name}:</span> {q.text}</p>
                    {q.answer && (
                      <p className="text-slate-500 mt-1 pl-3 border-l-2 border-rose-200">
                        <span className="font-semibold text-slate-600">{item.user.name} respondió:</span> {q.answer}
                      </p>
                    )}
                    {!q.answer && isMine && (
                      <div className="flex items-center gap-2 mt-1.5">
                        <input value={answerDrafts[q.id] ?? ""} onChange={(e) => setAnswerDrafts((p) => ({ ...p, [q.id]: e.target.value }))}
                          placeholder="Responder..." maxLength={500}
                          className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        <button onClick={() => handleAnswer(q.id)} disabled={!answerDrafts[q.id]?.trim() || answerBusyId === q.id}
                          className="text-xs bg-slate-800 text-white font-semibold px-2.5 py-1.5 rounded-lg hover:bg-slate-900 transition disabled:opacity-50">
                          {answerBusyId === q.id ? "..." : "Responder"}
                        </button>
                      </div>
                    )}
                    {!q.answer && !isMine && <p className="text-[11px] text-slate-400 mt-0.5">Sin responder todavía</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
