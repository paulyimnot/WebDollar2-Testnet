import { TrendingUp } from "lucide-react";

const WEBD_PRICE_USD = 0.000963;

export function formatWEBDPrice(price: number = WEBD_PRICE_USD): string {
  return price.toFixed(8);
}

export function WEBD2toUSD(webd: number): number {
  return webd * WEBD_PRICE_USD;
}

export function formatUSD(usd: number): string {
  if (usd >= 1_000_000) return `$${(usd / 1_000_000).toFixed(2)}M`;
  if (usd >= 1_000) return `$${(usd / 1_000).toFixed(2)}K`;
  if (usd >= 1) return `$${usd.toFixed(2)}`;
  if (usd >= 0.01) return `$${usd.toFixed(4)}`;
  return `$${usd.toFixed(8)}`;
}

export function PriceTicker({ className = "" }: { className?: string }) {
  return (
    <div className={`inline-flex items-center gap-1.5 font-mono text-xs ${className}`} data-testid="text-price-ticker">
      <TrendingUp className="w-3 h-3 text-green-400" />
      <span className="text-muted-foreground">WEBD2</span>
      <span className="text-green-400 font-semibold">${formatWEBDPrice()}</span>
      <span className="text-muted-foreground">USD</span>
    </div>
  );
}
