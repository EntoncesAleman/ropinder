"use client";
import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowLeft, Gavel, Star, CheckCircle2, Trophy, Users, PackageCheck, ShieldCheck } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuctionDetail {
  id: string;
  currentPrice: number;
  startingPrice: number;
  minIncrement: number;
  startsAt: string;
  endsAt: string;
  status: "SCHEDULED" | "ACTIVE" | "ENDED" | "CANCELLED";
  sellerId: string;
  winnerId: string | null;
  item: { id: string; title: string; description: string; imageUrl: string; brand: string; size: string; condition: string; userId: string };
  seller: { id: string; name: string; avatar: string; ratingAvg: number; ratingCount: number; verified: boolean };
  winner: { id: string; name: string; avatar: string } | null;
  bids: { id: string; amount: number; createdAt: string; bidder: { id: string; name: string; avatar: string } }[];
  escrow: { id: string; amount: number; type: "ESCROW_HOLD" | "ESCROW_RELEASE"; status: string; meta: { buyerId?: string; sellerId?: string } } | null;
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Terminada";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h ${minutes}m`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s`;
  return `${minutes}m ${seconds}s`;
}

function Countdown({ endsAt }: { endsAt: string }) {
  const [remaining, setRemaining] = useState(() => new Date(endsAt).getTime() - Date.now());
  useEffect(() => {
    const interval = setInterval(() => setRemaining(new Date(endsAt).getTime() - Date.now()), 1000);
    return () => clearInterval(interval);
  }, [endsAt]);
  return <span>{formatRemaining(remaining)}</span>;
}

export default function AuctionDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user, loading } = useAuth();
  const router = useRouter();
  const [auction, setAuction] = useState<AuctionDetail | null>(null);
  const [bidAmount, setBidAmount] = useState("");
  const [bidding, setBidding] = useState(false);
  const [error, setError] = useState("");
  const [notFound, setNotFound] = useState(false);
  const [confirming, setConfirming] = useState(false);

  async function fetchAuction() {
    const res = await fetch(`/api/auctions/${id}`);
    if (res.ok) setAuction(await res.json());
    else setNotFound(true);
  }

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (user) Promise.resolve().then(() => fetchAuction());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, loading, id]);

  useEffect(() => {
    if (!user) return;
    const interval = setInterval(fetchAuction, 4000);
    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, id]);

  async function handleBid(e: React.FormEvent) {
    e.preventDefault();
    const amount = Number(bidAmount);
    if (!amount || amount <= 0) return;
    setBidding(true);
    setError("");
    const res = await fetch(`/api/auctions/${id}/bid`, {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ amount }),
    });
    const data = await res.json().catch(() => ({ error: "Error de conexión" }));
    if (!res.ok) setError(data.error ?? "No se pudo pujar");
    else { setBidAmount(""); await fetchAuction(); }
    setBidding(false);
  }

  async function handleConfirmReceipt() {
    setConfirming(true);
    const res = await fetch("/api/transactions/release", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ transactionId: auction?.escrow?.id }),
    });
    if (res.ok) await fetchAuction();
    setConfirming(false);
  }

  if (loading || (!auction && !notFound)) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (notFound || !auction) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">No encontramos esta subasta.</div>;
  if (!user) return null;

  const isSeller = auction.sellerId === user.id;
  const isEnded = auction.status === "ENDED" || auction.status === "CANCELLED";
  const minBid = auction.currentPrice + auction.minIncrement;

  return (
    <div className="max-w-sm lg:max-w-5xl mx-auto pb-8 lg:pt-6 lg:px-8 lg:grid lg:grid-cols-2 lg:gap-10 lg:items-start">
      <div className="relative w-full aspect-square lg:rounded-2xl lg:overflow-hidden lg:sticky lg:top-6">
        <Image src={auction.item.imageUrl} alt={auction.item.title} fill sizes="(max-width: 1024px) 384px, 480px" priority className="object-cover" />
        <Link href="/subastas" aria-label="Volver" className="absolute top-4 left-4 bg-white/90 rounded-full p-2 shadow lg:hidden">
          <ArrowLeft size={18} className="text-slate-700" />
        </Link>
        <span className="absolute top-4 right-4 flex items-center gap-1 text-[11px] font-semibold bg-amber-500 text-white rounded-full px-2.5 py-1">
          <Gavel size={11} /> Subasta {isEnded ? "finalizada" : "activa"}
        </span>
      </div>

      <div className="px-4 pt-4 lg:px-0 lg:pt-0 flex flex-col gap-3">
        <h1 className="text-xl font-bold text-slate-800">{auction.item.title}</h1>

        <div className="flex flex-wrap gap-2">
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">Talle {auction.item.size}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">{auction.item.brand}</span>
          <span className="flex items-center gap-1 text-xs font-medium text-slate-600 bg-slate-100 rounded-full px-3 py-1">{auction.item.condition}</span>
        </div>

        {auction.item.description && <p className="text-sm text-slate-500">{auction.item.description}</p>}

        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[11px] text-amber-700 font-medium">{isEnded ? "Precio final" : "Puja actual"}</p>
              <p className="text-2xl font-extrabold text-slate-900">${auction.currentPrice}</p>
            </div>
            {!isEnded && (
              <div className="text-right">
                <p className="text-[11px] text-amber-700 font-medium">Termina en</p>
                <p className="text-sm font-bold text-rose-500"><Countdown endsAt={auction.endsAt} /></p>
              </div>
            )}
          </div>
          <p className="flex items-center gap-1 text-[11px] text-amber-700"><Users size={11} /> {auction.bids.length} {auction.bids.length === 1 ? "puja" : "pujas"}</p>

          {isEnded ? (
            auction.winner ? (
              <div className="flex flex-col gap-1.5 mt-1">
                <div className="flex items-center gap-2 bg-white rounded-xl px-3 py-2">
                  <Trophy size={16} className="text-amber-500" />
                  <p className="text-xs text-slate-600">
                    Ganó <strong>{auction.winner.id === user.id ? "vos" : auction.winner.name}</strong> con ${auction.currentPrice}
                  </p>
                </div>

                {auction.escrow?.type === "ESCROW_HOLD" && auction.escrow.meta.buyerId === user.id && (
                  <div className="flex items-center justify-between bg-white rounded-xl px-3 py-2 gap-2">
                    <p className="text-[11px] text-slate-600 flex items-center gap-1.5"><PackageCheck size={14} className="text-amber-500 flex-shrink-0" /> ¿Recibiste la prenda?</p>
                    <button onClick={handleConfirmReceipt} disabled={confirming}
                      className="text-[11px] bg-amber-500 text-white font-semibold px-2.5 py-1.5 rounded-full hover:bg-amber-600 transition disabled:opacity-60 flex-shrink-0">
                      {confirming ? "..." : "Confirmar recepción"}
                    </button>
                  </div>
                )}
                {auction.escrow?.type === "ESCROW_HOLD" && auction.escrow.meta.sellerId === user.id && (
                  <p className="text-[11px] text-slate-500 bg-white rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-amber-500 flex-shrink-0" /> ${auction.escrow.amount} en custodia — esperando que confirmen la recepción.
                  </p>
                )}
                {auction.escrow?.type === "ESCROW_RELEASE" && (
                  <p className="text-[11px] text-emerald-600 bg-white rounded-xl px-3 py-2 flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="flex-shrink-0" /> Recepción confirmada — fondos liberados{auction.escrow.meta.sellerId === user.id ? " (disponibles para retiro en 48hs)" : ""}.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 bg-white rounded-xl px-3 py-2 mt-1">Terminó sin pujas.</p>
            )
          ) : isSeller ? (
            <p className="text-xs text-slate-500 bg-white rounded-xl px-3 py-2 mt-1">Es tu subasta — no podés pujar en ella.</p>
          ) : (
            <form onSubmit={handleBid} className="flex items-center gap-2 mt-1">
              <div className="relative flex-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                <input type="number" min={minBid} step="0.01" value={bidAmount} onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Mín. $${minBid}`}
                  className="w-full border border-slate-200 rounded-xl pl-6 pr-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-rose-300" />
              </div>
              <motion.button whileTap={{ scale: 0.96 }} type="submit" disabled={bidding}
                className="bg-rose-500 text-white font-semibold px-4 py-2.5 rounded-xl hover:bg-rose-600 transition disabled:opacity-60 flex items-center gap-1.5">
                <Gavel size={14} /> {bidding ? "..." : "Pujar"}
              </motion.button>
            </form>
          )}
          {error && <p className="text-xs text-rose-500">{error}</p>}
        </div>

        <Link href={`/seller/${auction.seller.id}`} className="flex items-center gap-3 border border-slate-100 rounded-xl px-3.5 py-3 hover:bg-slate-50 transition">
          <Image src={auction.seller.avatar} alt={auction.seller.name} width={40} height={40} className="rounded-xl object-cover" />
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-800 text-sm flex items-center gap-1 truncate">
              {auction.seller.name}
              {auction.seller.verified && <CheckCircle2 size={13} className="text-sky-500 flex-shrink-0" />}
            </p>
            {auction.seller.ratingCount > 0 && (
              <p className="text-xs text-slate-400 flex items-center gap-0.5">
                <Star size={11} fill="currentColor" className="text-amber-400" /> {auction.seller.ratingAvg.toFixed(1)} ({auction.seller.ratingCount})
              </p>
            )}
          </div>
        </Link>

        {auction.bids.length > 0 && (
          <div className="border-t border-slate-100 pt-4">
            <p className="font-semibold text-slate-800 text-sm mb-3">Historial de pujas</p>
            <div className="flex flex-col gap-2">
              {auction.bids.map((b) => (
                <div key={b.id} className="flex items-center gap-2 text-sm">
                  <Image src={b.bidder.avatar} alt={b.bidder.name} width={24} height={24} className="rounded-full object-cover flex-shrink-0" />
                  <p className="text-slate-600 flex-1 truncate">{b.bidder.id === user.id ? "Vos" : b.bidder.name}</p>
                  <p className="font-bold text-slate-800">${b.amount}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
