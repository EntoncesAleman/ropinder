"use client";
import { useEffect, useState, useRef, use } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Send, ArrowLeft, PackageCheck, CheckCircle, Flag, ShieldCheck, Star, Truck, Users, MessageCircleQuestion, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Image from "next/image";
import Link from "next/link";

interface Message { id: string; senderId: string; text: string; createdAt: string; sender: { id: string; name: string; avatar: string } }
interface SellerItem { id: string; title: string; price: number | null }
interface DeliveryInfo { type: "meetup" | "shipping"; fullName?: string; address?: string }
interface Escrow { id: string; amount: number; type: "ESCROW_HOLD" | "ESCROW_RELEASE"; status: string; meta: { buyerId?: string; sellerId?: string; delivery?: DeliveryInfo } }
interface MyRating { id: string; score: number }
interface Offer {
  id: string; matchId: string; itemId: string; buyerId: string; sellerId: string;
  amount: number; offeredItemId: string | null; completedAt: string | null;
  status: "PENDING" | "ACCEPTED" | "REJECTED" | "CANCELLED"; createdAt: string;
}
interface ChatData {
  match: { id: string; userAId: string; userBId: string };
  other: { id: string; name: string; avatar: string };
  messages: Message[];
  escrow: Escrow | null;
  myRating: MyRating | null;
  offers: Offer[];
}
interface ChatAnswerOption { id: string; text: string }
interface ChatQuestionOption { id: string; text: string; answers: ChatAnswerOption[] }
interface ChatCategoryOption { id: string; label: string; questions: ChatQuestionOption[] }

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<ChatData | null>(null);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState("");
  const [confirming, setConfirming] = useState(false);
  const [paying, setPaying] = useState(false);
  const [payItemId, setPayItemId] = useState("");
  const [sellerItems, setSellerItems] = useState<SellerItem[]>([]);
  const [payError, setPayError] = useState("");
  const [myItems, setMyItems] = useState<SellerItem[]>([]);
  const [deliveryType, setDeliveryType] = useState<"meetup" | "shipping">("meetup");
  const [shipFullName, setShipFullName] = useState("");
  const [shipAddress, setShipAddress] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [showOfferInput, setShowOfferInput] = useState(false);
  const [offerBusy, setOfferBusy] = useState(false);
  const [offerError, setOfferError] = useState("");
  const [showTradeInput, setShowTradeInput] = useState(false);
  const [tradeItemId, setTradeItemId] = useState("");
  const [reporting, setReporting] = useState(false);
  const [reportReason, setReportReason] = useState("");
  const [reportSent, setReportSent] = useState(false);
  const [ratingScore, setRatingScore] = useState(0);
  const [ratingSaving, setRatingSaving] = useState(false);
  const [chatBank, setChatBank] = useState<ChatCategoryOption[]>([]);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [activeQuestion, setActiveQuestion] = useState<ChatQuestionOption | null>(null);
  const [sendingGuided, setSendingGuided] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  async function fetchChat() {
    const res = await fetch(`/api/matches/${id}/messages`);
    if (res.ok) {
      const d = await res.json();
      setData(d);
      if (!d.escrow) {
        const [sres, mres] = await Promise.all([fetch(`/api/sellers/${d.other.id}`), fetch(`/api/profile/items`)]);
        if (sres.ok) setSellerItems((await sres.json()).items ?? []);
        if (mres.ok) setMyItems(await mres.json());
      }
    }
  }

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) {
      Promise.resolve().then(() => fetchChat());
      fetch("/api/chat/questions").then((r) => (r.ok ? r.json() : [])).then(setChatBank);
    }
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
    setSendError("");
    const res = await fetch(`/api/matches/${id}/messages`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({ error: "No se pudo enviar el mensaje" }));
      setSendError(data.error);
      setSending(false);
      return;
    }
    setText("");
    await fetchChat();
    setSending(false);
  }

  async function handleSendGuided(answerId: string) {
    setSendingGuided(true);
    const res = await fetch(`/api/matches/${id}/guided`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ answerId }),
    });
    if (res.ok) { await fetchChat(); setShowQuickReplies(false); setActiveQuestion(null); }
    setSendingGuided(false);
  }

  async function handlePay(amount: number) {
    if (deliveryType === "shipping" && (!shipFullName.trim() || !shipAddress.trim())) {
      setPayError("Completá nombre y dirección de envío");
      return;
    }
    setPaying(true);
    setPayError("");
    const res = await fetch(`/api/matches/${id}/pay`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        amount, itemId: payItemId || undefined,
        delivery: deliveryType === "shipping" ? { type: "shipping", fullName: shipFullName, address: shipAddress } : { type: "meetup" },
      }),
    });
    const d = await res.json();
    if (!res.ok) setPayError(d.error ?? "Error al pagar");
    else await fetchChat();
    setPaying(false);
  }

  async function handleMakeOffer() {
    const amount = Number(offerAmount);
    if (!amount || amount <= 0 || !payItemId) { setOfferError("Elegí una prenda e ingresá un monto válido"); return; }
    setOfferBusy(true);
    setOfferError("");
    const res = await fetch(`/api/matches/${id}/offers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: payItemId, amount }),
    });
    const d = await res.json();
    if (!res.ok) setOfferError(d.error ?? "No se pudo enviar la oferta");
    else { setOfferAmount(""); setShowOfferInput(false); await fetchChat(); }
    setOfferBusy(false);
  }

  async function handleProposeTrade() {
    if (!payItemId || !tradeItemId) { setOfferError("Elegí cuál de tus prendas ofrecés a cambio"); return; }
    setOfferBusy(true);
    setOfferError("");
    const res = await fetch(`/api/matches/${id}/offers`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ itemId: payItemId, offeredItemId: tradeItemId }),
    });
    const d = await res.json();
    if (!res.ok) setOfferError(d.error ?? "No se pudo proponer el canje");
    else { setTradeItemId(""); setShowTradeInput(false); await fetchChat(); }
    setOfferBusy(false);
  }

  async function handleRespondOffer(offerId: string, action: "accept" | "reject" | "cancel" | "complete") {
    setOfferBusy(true);
    await fetch(`/api/matches/${id}/offers/${offerId}`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
    });
    await fetchChat();
    setOfferBusy(false);
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

  const { other, messages, escrow, myRating, offers } = data;
  const isBuyer = escrow?.meta.buyerId === user.id;
  const released = escrow?.type === "ESCROW_RELEASE";
  const completedTrade = offers.find((o) => o.offeredItemId && o.completedAt);

  const selectedItem = sellerItems.find((i) => i.id === payItemId);
  const acceptedOfferForItem = offers.find((o) => o.itemId === payItemId && o.status === "ACCEPTED");
  const myPendingOfferForItem = offers.find((o) => o.itemId === payItemId && o.buyerId === user.id && o.status === "PENDING");
  const incomingOffers = offers.filter((o) => o.sellerId === user.id && o.status === "PENDING");
  const payableAmount = acceptedOfferForItem
    ? (acceptedOfferForItem.offeredItemId ? null : acceptedOfferForItem.amount)
    : (selectedItem?.price ?? null);
  const acceptedTradeForItem = acceptedOfferForItem?.offeredItemId ? acceptedOfferForItem : undefined;

  return (
    <div className="flex flex-col h-screen max-w-sm lg:max-w-2xl mx-auto lg:border-x lg:border-slate-100">
      <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-100 shadow-sm">
        <Link href="/matches" aria-label="Volver" className="text-slate-400 hover:text-slate-600">
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
          aria-label="Reportar"
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
        {!escrow && !completedTrade && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-slate-50 border-b border-slate-100 px-4 py-2.5 flex flex-col gap-2">
            <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5">
              <ShieldCheck size={14} /> El pago queda en custodia de Ropinder hasta confirmar la entrega — o coordiná un canje directo.
            </p>
            {sellerItems.length > 0 && (
              <select value={payItemId} onChange={(e) => { setPayItemId(e.target.value); setShowOfferInput(false); setShowTradeInput(false); setOfferError(""); }}
                className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                <option value="">¿Qué prenda te interesa?</option>
                {sellerItems.map((i) => (
                  <option key={i.id} value={i.id}>{i.title}{i.price ? ` — $${i.price}` : " — para canje"}</option>
                ))}
              </select>
            )}

            {payItemId && (
              <>
                {acceptedTradeForItem && (
                  <div className="flex items-center justify-between bg-emerald-50 rounded-lg px-2.5 py-1.5 gap-2">
                    <p className="text-[11px] text-emerald-700 font-medium">✓ Canje aceptado — coordinen la entrega y confirmen acá</p>
                    <button onClick={() => handleRespondOffer(acceptedTradeForItem.id, "complete")} disabled={offerBusy}
                      className="text-[11px] bg-emerald-500 text-white font-semibold px-2.5 py-1 rounded-full hover:bg-emerald-600 transition disabled:opacity-60 flex-shrink-0">
                      {offerBusy ? "..." : "Ya lo hicimos"}
                    </button>
                  </div>
                )}
                {acceptedOfferForItem && !acceptedTradeForItem && (
                  <p className="text-[11px] text-emerald-600 font-medium">✓ Tu oferta de ${acceptedOfferForItem.amount} fue aceptada</p>
                )}
                {!acceptedOfferForItem && myPendingOfferForItem && (
                  <div className="flex items-center justify-between bg-amber-50 rounded-lg px-2.5 py-1.5">
                    <p className="text-[11px] text-amber-700">
                      {myPendingOfferForItem.offeredItemId
                        ? `Tu propuesta de canje ("${myItems.find((i) => i.id === myPendingOfferForItem.offeredItemId)?.title ?? "tu prenda"}") está pendiente`
                        : `Tu oferta de $${myPendingOfferForItem.amount} está pendiente`}
                    </p>
                    <button onClick={() => handleRespondOffer(myPendingOfferForItem.id, "cancel")} disabled={offerBusy}
                      className="text-[11px] text-slate-400 hover:text-rose-500 underline">Cancelar</button>
                  </div>
                )}

                {payableAmount != null && (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex gap-1.5">
                      <button type="button" onClick={() => setDeliveryType("meetup")}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-1.5 border transition ${deliveryType === "meetup" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"}`}>
                        <Users size={12} /> Coordinar en persona
                      </button>
                      <button type="button" onClick={() => setDeliveryType("shipping")}
                        className={`flex-1 flex items-center justify-center gap-1.5 text-[11px] font-medium rounded-lg px-2 py-1.5 border transition ${deliveryType === "shipping" ? "bg-slate-800 text-white border-slate-800" : "bg-white text-slate-500 border-slate-200"}`}>
                        <Truck size={12} /> Envío a domicilio
                      </button>
                    </div>
                    {deliveryType === "shipping" && (
                      <div className="flex flex-col gap-1.5">
                        <p className="text-[10px] text-amber-600">Coordinación manual por ahora — todavía no gestionamos el envío con un courier.</p>
                        <input value={shipFullName} onChange={(e) => setShipFullName(e.target.value)}
                          placeholder="Nombre y apellido (como en el DNI)"
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                        <input value={shipAddress} onChange={(e) => setShipAddress(e.target.value)}
                          placeholder="Dirección de envío completa"
                          className="border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                      </div>
                    )}
                  </div>
                )}

                <div className="flex items-center gap-2 flex-wrap">
                  {payableAmount != null && (
                    <button onClick={() => handlePay(payableAmount)} disabled={paying}
                      className="text-xs bg-slate-800 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-slate-900 transition disabled:opacity-60">
                      {paying ? "..." : `Comprar $${payableAmount}`}
                    </button>
                  )}
                  {!acceptedOfferForItem && !myPendingOfferForItem && selectedItem?.price && (
                    <button onClick={() => { setShowOfferInput((v) => !v); setShowTradeInput(false); }}
                      className="text-xs border border-slate-300 text-slate-600 font-semibold px-3 py-1.5 rounded-full hover:bg-slate-100 transition">
                      Ofertar
                    </button>
                  )}
                  {!acceptedOfferForItem && !myPendingOfferForItem && myItems.length > 0 && (
                    <button onClick={() => { setShowTradeInput((v) => !v); setShowOfferInput(false); }}
                      className="text-xs border border-slate-300 text-slate-600 font-semibold px-3 py-1.5 rounded-full hover:bg-slate-100 transition">
                      Proponer canje
                    </button>
                  )}
                </div>

                {showOfferInput && (
                  <div className="flex items-center gap-2">
                    <input type="number" min="0" step="0.01" value={offerAmount} onChange={(e) => setOfferAmount(e.target.value)}
                      placeholder="Tu oferta ($)"
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-rose-300" />
                    <button onClick={handleMakeOffer} disabled={offerBusy}
                      className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-rose-600 transition disabled:opacity-60">
                      {offerBusy ? "..." : "Enviar"}
                    </button>
                  </div>
                )}
                {showTradeInput && (
                  <div className="flex items-center gap-2">
                    <select value={tradeItemId} onChange={(e) => setTradeItemId(e.target.value)}
                      className="flex-1 border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs bg-white">
                      <option value="">¿Qué prenda tuya ofrecés?</option>
                      {myItems.map((i) => <option key={i.id} value={i.id}>{i.title}</option>)}
                    </select>
                    <button onClick={handleProposeTrade} disabled={offerBusy}
                      className="text-xs bg-rose-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-rose-600 transition disabled:opacity-60">
                      {offerBusy ? "..." : "Enviar"}
                    </button>
                  </div>
                )}
                {offerError && <p className="text-xs text-rose-500">{offerError}</p>}
              </>
            )}
            {payError && <p className="text-xs text-rose-500">{payError}</p>}

            {incomingOffers.length > 0 && (
              <div className="flex flex-col gap-1.5 mt-1 pt-2 border-t border-slate-200">
                <p className="text-[11px] font-semibold text-slate-500">Ofertas recibidas</p>
                {incomingOffers.map((o) => {
                  const item = myItems.find((i) => i.id === o.itemId);
                  const offeredItem = o.offeredItemId ? sellerItems.find((i) => i.id === o.offeredItemId) : undefined;
                  return (
                    <div key={o.id} className="flex items-center justify-between bg-white rounded-lg px-2.5 py-1.5 border border-slate-100">
                      <p className="text-[11px] text-slate-600">
                        {o.offeredItemId
                          ? `${other.name} propone "${offeredItem?.title ?? "una prenda"}"${item ? ` por tu "${item.title}"` : ""}`
                          : `${other.name} ofrece $${o.amount}${item ? ` por "${item.title}"` : ""}`}
                      </p>
                      <div className="flex gap-1.5">
                        <button onClick={() => handleRespondOffer(o.id, "reject")} disabled={offerBusy}
                          className="text-[11px] text-slate-400 hover:text-rose-500 px-2 py-0.5">Rechazar</button>
                        <button onClick={() => handleRespondOffer(o.id, "accept")} disabled={offerBusy}
                          className="text-[11px] bg-emerald-500 text-white font-semibold px-2.5 py-0.5 rounded-full hover:bg-emerald-600">Aceptar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {escrow?.type === "ESCROW_HOLD" && isBuyer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <p className="text-xs text-amber-700 font-medium flex items-center gap-1.5">
                <PackageCheck size={14} /> ¿Recibiste la prenda? (${escrow.amount} en custodia)
              </p>
              <motion.button whileTap={{ scale: 0.95 }} onClick={handleConfirmReceipt} disabled={confirming}
                className="text-xs bg-amber-500 text-white font-semibold px-3 py-1.5 rounded-full hover:bg-amber-600 transition disabled:opacity-60">
                {confirming ? "..." : "Confirmar Recepción"}
              </motion.button>
            </div>
            {escrow.meta.delivery?.type === "shipping" && (
              <p className="text-[11px] text-amber-600">Envío a: {escrow.meta.delivery.fullName} — {escrow.meta.delivery.address}</p>
            )}
          </motion.div>
        )}

        {escrow?.type === "ESCROW_HOLD" && !isBuyer && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-amber-50 border-b border-amber-100 px-4 py-2.5 flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <ShieldCheck size={16} className="text-amber-500" />
              <p className="text-xs text-amber-700 font-semibold">${escrow.amount} en custodia — esperando que {other.name} confirme la recepción.</p>
            </div>
            {escrow.meta.delivery?.type === "shipping" ? (
              <p className="text-[11px] text-amber-600 flex items-center gap-1"><Truck size={11} /> Enviar a: {escrow.meta.delivery.fullName} — {escrow.meta.delivery.address}</p>
            ) : (
              <p className="text-[11px] text-amber-600 flex items-center gap-1"><Users size={11} /> Coordinar entrega en persona por el chat</p>
            )}
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

        {completedTrade && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-emerald-50 border-b border-emerald-100 px-4 py-2.5 flex items-center gap-2">
            <CheckCircle size={16} className="text-emerald-500" />
            <p className="text-xs text-emerald-700 font-semibold">¡Canje completado!</p>
          </motion.div>
        )}

        {(released || completedTrade) && !myRating && (
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
        {(released || completedTrade) && myRating && (
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

      {sendError && <p className="text-rose-500 text-xs text-center px-4 pt-2">{sendError}</p>}

      {!released && !completedTrade && chatBank.length > 0 && (
        <div className="border-t border-slate-100 bg-white">
          <button type="button" onClick={() => { setShowQuickReplies((v) => !v); setActiveQuestion(null); }}
            className="w-full flex items-center gap-1.5 px-4 py-2 text-xs font-medium text-slate-500 hover:text-rose-500 transition">
            <MessageCircleQuestion size={14} /> Preguntas rápidas {showQuickReplies ? <X size={12} className="ml-auto" /> : null}
          </button>
          <AnimatePresence>
            {showQuickReplies && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                className="px-4 pb-3 flex flex-col gap-2 overflow-hidden">
                {!activeQuestion ? (
                  <div className="flex flex-wrap gap-1.5">
                    {chatBank.flatMap((c) => c.questions).map((q) => (
                      <button key={q.id} onClick={() => setActiveQuestion(q)}
                        className="text-xs border border-slate-200 text-slate-600 rounded-full px-3 py-1.5 hover:bg-slate-50 transition">
                        {q.text}
                      </button>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => setActiveQuestion(null)} aria-label="Volver a las categorías" className="text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /></button>
                      <p className="text-xs font-medium text-slate-600">{activeQuestion.text}</p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {activeQuestion.answers.map((a) => (
                        <button key={a.id} onClick={() => handleSendGuided(a.id)} disabled={sendingGuided}
                          className="text-xs bg-rose-50 text-rose-600 rounded-full px-3 py-1.5 hover:bg-rose-100 transition disabled:opacity-50">
                          {a.text}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

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
