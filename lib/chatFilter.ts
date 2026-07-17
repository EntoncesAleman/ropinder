// Blocks messages that try to move the deal off-platform (phone numbers,
// emails, WhatsApp mentions, direct-transfer requests) before a sale closes.
// Once a match's escrow has actually released, contact info is allowed
// through so buyer and seller can coordinate delivery.

const EMAIL_RE = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/;
const PHONE_RE = /(\+?\d[\d\s\-().]{6,}\d)/;
const KEYWORD_RE = /\b(whatsapp|wsp|whats\s?app|transferencia\s+directa|alias\s+(de\s+)?mercado\s?pago|fuera\s+de\s+la\s+app|por\s+afuera|te\s+paso\s+mi\s+n[uú]mero)\b/i;

function hasRealPhoneNumber(text: string): boolean {
  const match = text.match(PHONE_RE);
  if (!match) return false;
  const digitsOnly = match[0].replace(/\D/g, "");
  return digitsOnly.length >= 7;
}

export function findContactInfoReason(text: string): string | null {
  if (EMAIL_RE.test(text)) return "No podés compartir un email por acá — coordiná todo dentro del chat de Ropinder.";
  if (hasRealPhoneNumber(text)) return "No podés compartir un número de teléfono todavía — se habilita automáticamente cuando se confirma la venta.";
  if (KEYWORD_RE.test(text)) return "Para tu seguridad, la transacción tiene que coordinarse acá dentro de la app, no por fuera.";
  return null;
}
