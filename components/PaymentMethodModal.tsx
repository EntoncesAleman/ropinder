"use client";
import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CreditCard, Landmark, X, Upload, Check } from "lucide-react";

// Placeholder — swap for Ropinder's real CVU/alias before launch. Until then
// this is a demo value like the rest of the checkout flow (no real money
// moves on the "card" path either).
const CVU = "0000003100012345678901";
const ALIAS = "ROPINDER.PAGOS";

interface Props {
  open: boolean;
  label: string;
  price: string;
  onClose: () => void;
  onPayCard: () => Promise<void>;
  onPayBankTransfer: (receiptUrl: string) => Promise<void>;
}

export function PaymentMethodModal({ open, label, price, onClose, onPayCard, onPayBankTransfer }: Props) {
  const [method, setMethod] = useState<"card" | "bank_transfer" | null>(null);
  const [uploading, setUploading] = useState(false);
  const [receiptUrl, setReceiptUrl] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  function reset() {
    setMethod(null); setReceiptUrl(null); setError(""); onClose();
  }

  async function handleFile(file: File) {
    setUploading(true); setError("");
    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json().catch(() => ({ error: "Error al subir" }));
    if (!res.ok) setError(data.error ?? "No se pudo subir el comprobante");
    else setReceiptUrl(data.url);
    setUploading(false);
  }

  async function confirmCard() {
    setBusy(true); setError("");
    try { await onPayCard(); reset(); } catch { setError("No se pudo procesar el pago"); } finally { setBusy(false); }
  }

  async function confirmTransfer() {
    if (!receiptUrl) return;
    setBusy(true); setError("");
    try { await onPayBankTransfer(receiptUrl); reset(); } catch { setError("No se pudo enviar el comprobante"); } finally { setBusy(false); }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center" onClick={reset}>
          <motion.div initial={{ y: 40, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 40, opacity: 0 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm bg-white rounded-t-3xl sm:rounded-3xl p-5 pb-8 sm:pb-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-xs text-slate-400">Elegí un método de pago</p>
                <p className="font-bold text-slate-800">{label} — {price}</p>
              </div>
              <button onClick={reset} aria-label="Cerrar" className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>

            {!method && (
              <div className="flex flex-col gap-2">
                <button onClick={() => setMethod("card")}
                  className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3.5 hover:border-rose-300 hover:bg-rose-50 transition text-left">
                  <CreditCard size={20} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Tarjeta de Crédito/Débito</p>
                    <p className="text-xs text-slate-400">Paga con tu tarjeta directamente en la app</p>
                  </div>
                </button>
                <button onClick={() => setMethod("bank_transfer")}
                  className="flex items-center gap-3 border border-slate-200 rounded-xl px-4 py-3.5 hover:border-rose-300 hover:bg-rose-50 transition text-left">
                  <Landmark size={20} className="text-slate-500" />
                  <div>
                    <p className="text-sm font-semibold text-slate-800">Transferencia Bancaria</p>
                    <p className="text-xs text-slate-400">Transferencia a CVU con comprobante</p>
                  </div>
                </button>
              </div>
            )}

            {method === "card" && (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-400">Pago simulado — demo de pasarela.</p>
                {error && <p className="text-xs text-rose-500">{error}</p>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={confirmCard} disabled={busy}
                  className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
                  {busy ? "Procesando..." : `Pagar ${price}`}
                </motion.button>
              </div>
            )}

            {method === "bank_transfer" && (
              <div className="flex flex-col gap-3">
                <div className="bg-slate-50 rounded-xl p-3.5 text-xs text-slate-600 flex flex-col gap-1">
                  <p>CVU: <strong className="select-all">{CVU}</strong></p>
                  <p>Alias: <strong className="select-all">{ALIAS}</strong></p>
                  <p className="text-slate-400 mt-1">Transferí {price} y subí el comprobante. Un admin lo revisa y acredita el beneficio — no es automático.</p>
                </div>

                {!receiptUrl ? (
                  <button type="button" onClick={() => fileRef.current?.click()} disabled={uploading}
                    className="flex items-center justify-center gap-2 border-2 border-dashed border-slate-200 rounded-xl py-4 text-sm text-slate-500 hover:border-rose-300 transition">
                    <Upload size={16} /> {uploading ? "Subiendo..." : "Subir comprobante"}
                  </button>
                ) : (
                  <div className="flex items-center gap-2 bg-emerald-50 text-emerald-700 rounded-xl px-3.5 py-2.5 text-xs font-medium">
                    <Check size={14} /> Comprobante subido
                  </div>
                )}
                <input ref={fileRef} type="file" accept="image/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

                {error && <p className="text-xs text-rose-500">{error}</p>}
                <motion.button whileTap={{ scale: 0.97 }} onClick={confirmTransfer} disabled={busy || !receiptUrl}
                  className="w-full bg-rose-500 text-white font-semibold py-3 rounded-xl hover:bg-rose-600 transition disabled:opacity-60">
                  {busy ? "Enviando..." : "Enviar comprobante"}
                </motion.button>
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
