// Guided-chat quick-reply formatting — pure, no DB. Kept separate from the
// API route so the message-text contract is unit-testable.
export function formatGuidedMessage(questionText: string, answerText: string): string {
  return `${questionText} → ${answerText}`;
}

export const DEFAULT_CHAT_BANK: { key: string; label: string; order: number; questions: { text: string; order: number; answers: { text: string; order: number }[] }[] }[] = [
  {
    key: "availability", label: "Disponibilidad", order: 0,
    questions: [
      { text: "¿Sigue disponible?", order: 0, answers: [{ text: "Sí", order: 0 }, { text: "No, ya se vendió", order: 1 }] },
    ],
  },
  {
    key: "condition", label: "Estado", order: 1,
    questions: [
      { text: "¿Tiene detalles?", order: 0, answers: [
        { text: "Nuevo", order: 0 }, { text: "Excelente", order: 1 }, { text: "Bueno", order: 2 }, { text: "Regular", order: 3 },
      ] },
    ],
  },
  {
    key: "size", label: "Talle", order: 2,
    questions: [
      { text: "¿Tenés otro talle?", order: 0, answers: [{ text: "Sí", order: 0 }, { text: "No, solo este", order: 1 }] },
    ],
  },
  {
    key: "measurements", label: "Medidas", order: 3,
    questions: [
      { text: "¿Podés pasar medidas?", order: 0, answers: [{ text: "Sí, dame un momento", order: 0 }, { text: "No tengo cómo medir ahora", order: 1 }] },
    ],
  },
  {
    key: "delivery", label: "Entrega", order: 4,
    questions: [
      { text: "¿Hacés envío?", order: 0, answers: [
        { text: "Sí, hago envío", order: 0 }, { text: "Solo retiro en persona", order: 1 }, { text: "Podemos coordinar", order: 2 },
      ] },
    ],
  },
];
