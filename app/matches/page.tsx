"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Heart, MessageCircle, Clock } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import Link from "next/link";
import Image from "next/image";

interface Match {
  id: string;
  createdAt: string;
  other: { id: string; name: string; avatar: string };
  lastMessage: { text: string; createdAt: string } | null;
}

export default function MatchesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) { router.push("/login"); return; }
    if (!loading && user?.role === "ADMIN") { router.push("/admin"); return; }
    if (!user) return;
    fetch("/api/matches").then((r) => r.json()).then((d) => { setMatches(Array.isArray(d) ? d : []); setFetching(false); });
  }, [user, loading, router]);

  if (loading || fetching) return (
    <div className="min-h-screen flex items-center justify-center text-slate-400 text-sm">Cargando matches...</div>
  );

  return (
    <div className="max-w-sm mx-auto px-4 pt-6">
      <div className="flex items-center gap-2 mb-6">
        <Heart size={22} className="text-rose-500" fill="currentColor" />
        <h1 className="text-xl font-bold text-slate-800">Mis Matches</h1>
        <span className="ml-auto bg-rose-100 text-rose-600 text-xs font-bold px-2.5 py-0.5 rounded-full">{matches.length}</span>
      </div>

      {matches.length === 0 ? (
        <div className="flex flex-col items-center gap-3 py-16 text-slate-300">
          <Heart size={48} strokeWidth={1} />
          <p className="text-sm text-center text-slate-400">Aún no tenés matches.<br />Seguí swipeando.</p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {matches.map((match, i) => (
            <motion.div key={match.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Link href={`/matches/${match.id}`} className="flex items-center gap-3 bg-white rounded-2xl p-3.5 shadow-sm border border-slate-100 hover:border-rose-100 transition">
                <div className="relative">
                  <Image src={match.other.avatar} alt={match.other.name} width={48} height={48} className="rounded-xl object-cover" />
                  <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-400 rounded-full border-2 border-white" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-800 text-sm">{match.other.name}</p>
                  <p className="text-xs text-slate-400 truncate">
                    {match.lastMessage ? match.lastMessage.text : "¡Nuevo match! Decí hola 👋"}
                  </p>
                </div>
                <div className="flex flex-col items-end gap-1">
                  <Clock size={11} className="text-slate-300" />
                  <MessageCircle size={16} className="text-rose-300" />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
