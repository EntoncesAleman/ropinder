export interface AuctionState {
  status: string;
  startsAt: Date;
  endsAt: Date;
  currentPrice: number;
  minIncrement: number;
  sellerId: string;
}

// Pure, server-side rules for whether a bid is acceptable — kept separate
// from the route so the money-math can be unit tested without a database.
// The route still re-derives everything from the DB row, never the client.
export function validateBid(auction: AuctionState, bidderId: string, amount: number, now: Date): string | null {
  if (!Number.isFinite(amount) || amount <= 0) return "Monto inválido";
  if (auction.sellerId === bidderId) return "No podés pujar en tu propia subasta";
  if (auction.status !== "ACTIVE" || now < auction.startsAt || now >= auction.endsAt)
    return "Esta subasta no está activa";
  const minValid = auction.currentPrice + auction.minIncrement;
  if (amount < minValid) return `La puja mínima es $${minValid}`;
  return null;
}
