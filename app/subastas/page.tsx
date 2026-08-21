"use client";
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, Gavel, Users } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";

interface AuctionListItem {
  id: string;
  currentPrice: number;
  endsAt: string;
  status: string;
  item: { id: string; title: string; imageUrl: string; brand: string; size: string };
  _count: { bids: number };
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return "Terminada";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
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

export default function AuctionsPage() {
  const { user, loading } = useAuth();
  const [auctions, setAuctions] = useState<AuctionListItem[]>([]);

  const fetchAuctions = useCallback(async () => {
    const res = await fetch("/api/auctions");
    if (res.ok) setAuctions(await res.json());
  }, []);

  useEffect(() => {
    if (user) Promise.resolve().then(() => fetchAuctions());
  }, [user, fetchAuctions]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando...</div>;
  if (!user) return null;

  return (
    <div className="max-w-sm lg:max-w-6xl mx-auto px-4 lg:px-8 pt-6 pb-10">
      <Link href="/" className="flex items-center gap-1 text-slate-400 hover:text-slate-600 text-sm mb-4 lg:hidden">
        <ArrowLeft size={16} /> Volver
      </Link>
      <h1 className="text-xl font-bold text-slate-800 mb-4 flex items-center gap-2">
        <Gavel size={18} className="text-rose-500" /> Subastas activas
      </h1>

      {auctions.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
          <Gavel size={40} strokeWidth={1} />
          <p className="text-sm text-center">No hay subastas activas ahora.<br />Publicá una prenda en modalidad Subasta.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-3 lg:gap-4">
          {auctions.map((a) => (
            <Link key={a.id} href={`/subastas/${a.id}`} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-slate-100 hover:shadow-md transition">
              <div className="relative aspect-square">
                <Image src={a.item.imageUrl} alt={a.item.title} fill sizes="(max-width: 480px) 50vw, 192px" className="object-cover" />
                <span className="absolute top-2 left-2 flex items-center gap-1 text-[10px] font-semibold bg-amber-500 text-white rounded-full px-2 py-0.5">
                  <Gavel size={9} /> Subasta
                </span>
              </div>
              <div className="p-2.5">
                <p className="text-xs font-semibold text-slate-800 truncate">{a.item.title}</p>
                <p className="text-[11px] text-slate-400">{a.item.brand} · Talle {a.item.size}</p>
                <p className="text-sm font-extrabold text-slate-900 mt-1">${a.currentPrice}</p>
                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                  <span className="flex items-center gap-0.5"><Users size={10} /> {a._count.bids} pujas</span>
                  <span className="font-semibold text-rose-500"><Countdown endsAt={a.endsAt} /></span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
