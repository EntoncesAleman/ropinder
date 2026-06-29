"use client";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, X, MessageCircle } from "lucide-react";
import Link from "next/link";

interface Props {
  open: boolean;
  matchId: string | null;
  onClose: () => void;
}

export function MatchModal({ open, matchId, onClose }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
          <motion.div className="relative flex flex-col items-center gap-5 rounded-3xl bg-gradient-to-br from-pink-500 via-rose-500 to-orange-400 p-10 shadow-2xl text-white max-w-xs mx-4"
            initial={{ scale: 0.5, rotate: -10 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0.5, opacity: 0 }}
            transition={{ type: "spring", stiffness: 200, damping: 15 }}>
            <button onClick={onClose} className="absolute top-4 right-4 text-white/70 hover:text-white"><X size={20} /></button>
            <motion.div animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.2 }}>
              <Heart size={64} fill="white" className="drop-shadow-lg" />
            </motion.div>
            <div className="text-center">
              <p className="text-sm font-medium opacity-90 tracking-widest uppercase">Es un</p>
              <h2 className="text-4xl font-extrabold tracking-tight">¡Match!</h2>
              <p className="mt-2 text-sm opacity-80">Se gustaron mutuamente. ¡Coordiná el intercambio!</p>
            </div>
            <div className="flex flex-col gap-2 w-full">
              {matchId && (
                <Link href={`/matches/${matchId}`} onClick={onClose}
                  className="flex items-center justify-center gap-2 w-full rounded-2xl bg-white text-rose-500 font-bold py-2.5 text-sm hover:bg-rose-50 transition">
                  <MessageCircle size={16} /> Abrir chat
                </Link>
              )}
              <button onClick={onClose} className="w-full rounded-2xl bg-white/20 text-white font-semibold py-2 text-sm hover:bg-white/30 transition">
                Seguir swipeando
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
