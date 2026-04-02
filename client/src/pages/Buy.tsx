import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { ShoppingCart, Coins, Loader2, Zap, Shield, TrendingUp, DollarSign, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { PriceTicker } from "@/components/PriceTicker";

interface StripeProduct {
  product_id: string;
  product_name: string;
  product_description: string;
  product_metadata: any;
  price_id: string;
  unit_amount: number;
  currency: string;
}

function formatPrice(amount: number, currency: string) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(amount / 100);
}

function formatWebd(amount: string) {
  return Number(amount).toLocaleString();
}

function getTierColor(tier: string) {
  switch (tier) {
    case "starter": return "from-green-500/20 to-green-600/5";
    case "growth": return "from-blue-500/20 to-blue-600/5";
    case "pro": return "from-purple-500/20 to-purple-600/5";
    case "whale": return "from-amber-500/20 to-amber-600/5";
    default: return "from-accent/20 to-accent/5";
  }
}

function getTierBorder(tier: string) {
  switch (tier) {
    case "starter": return "border-green-500/30";
    case "growth": return "border-blue-500/30";
    case "pro": return "border-purple-500/30";
    case "whale": return "border-amber-500/30";
    default: return "border-accent/30";
  }
}

export default function Buy() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedPrice, setSelectedPrice] = useState<string | null>(null);
  const [customAmount, setCustomAmount] = useState("");

  const WEBD_PRICE_USD = 0.000963;

  const { data: products, isLoading } = useQuery<StripeProduct[]>({
    queryKey: ["/api/stripe/products"],
  });

  const checkoutMutation = useMutation({
    mutationFn: async (priceId: string) => {
      const res = await apiRequest("POST", "/api/stripe/checkout", { priceId });
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const customCheckoutMutation = useMutation({
    mutationFn: async (webdAmount: number) => {
      const res = await apiRequest("POST", "/api/stripe/checkout-custom", { webdAmount });
      return await res.json();
    },
    onSuccess: (data: { url: string }) => {
      if (data.url) {
        window.location.href = data.url;
      }
    },
    onError: (err: any) => {
      toast({
        title: "Checkout Error",
        description: err.message || "Failed to start checkout",
        variant: "destructive",
      });
    },
  });

  const handleBuy = (priceId: string) => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    setSelectedPrice(priceId);
    checkoutMutation.mutate(priceId);
  };

  const handleCustomBuy = () => {
    if (!user) {
      setLocation("/auth");
      return;
    }
    const amount = parseInt(customAmount);
    if (!amount || amount < 10000) return;
    customCheckoutMutation.mutate(amount);
  };

  const customAmountNum = parseInt(customAmount) || 0;
  const customPriceUsd = customAmountNum * WEBD_PRICE_USD;

  const searchParams = new URLSearchParams(window.location.search);
  const purchaseCancelled = searchParams.get("purchase") === "cancelled";

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-heading font-bold text-accent mb-3" data-testid="text-buy-title">
          Buy WEBD Tokens
        </h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Purchase WebDollar 2 tokens to start mining, transfer, or hold. All purchases are processed securely through Stripe.
        </p>
        <div className="mt-4 flex justify-center">
          <div className="bg-card/50 border border-primary/10 rounded-md px-4 py-1.5">
            <PriceTicker />
          </div>
        </div>
      </div>

      <div className="mb-6 p-4 rounded-md border border-amber-500/30 bg-amber-500/10 flex items-start gap-3" data-testid="text-limited-funds-notice">
        <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-semibold text-amber-300">Limited Availability</p>
          <p className="text-xs text-amber-200/80 mt-1">
            A limited number of WEBD tokens have been allocated from the dev fund for direct purchase. Once the allocated supply runs out, this option will no longer be available. Buy early to secure your tokens.
          </p>
        </div>
      </div>

      {purchaseCancelled && (
        <div className="mb-6 p-4 rounded-md border border-amber-500/30 bg-amber-500/10 text-amber-200 text-center" data-testid="text-purchase-cancelled">
          Purchase was cancelled. You can try again below.
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
        {isLoading ? (
          <div className="col-span-full flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-accent" />
          </div>
        ) : products && products.length > 0 ? (
          products.map((product) => {
            const metadata = typeof product.product_metadata === "string"
              ? JSON.parse(product.product_metadata)
              : product.product_metadata || {};
            const tier = metadata.tier || "starter";
            const webdAmount = metadata.webd_amount || "0";

            return (
              <CyberCard key={product.price_id} className={`relative overflow-visible ${getTierBorder(tier)}`}>
                <div className={`absolute inset-0 bg-gradient-to-b ${getTierColor(tier)} rounded-md pointer-events-none`} />
                <div className="relative p-5 flex flex-col h-full gap-4">
                  <div className="flex items-center gap-2">
                    <Coins className="w-5 h-5 text-accent" />
                    <span className="text-xs font-heading uppercase tracking-wider text-muted-foreground">
                      {tier} Pack
                    </span>
                  </div>

                  <div>
                    <div className="text-2xl font-heading font-bold text-accent" data-testid={`text-webd-amount-${product.price_id}`}>
                      {formatWebd(webdAmount)} WEBD
                    </div>
                    <div className="text-3xl font-bold text-foreground mt-1" data-testid={`text-price-${product.price_id}`}>
                      {formatPrice(product.unit_amount, product.currency)}
                    </div>
                    <div className="text-xs font-mono text-muted-foreground mt-1" data-testid={`text-per-webd-${product.price_id}`}>
                      ${(product.unit_amount / 100 / Number(webdAmount)).toFixed(8)} / WEBD
                    </div>
                  </div>

                  <p className="text-sm text-muted-foreground flex-grow">
                    {product.product_description}
                  </p>

                  <Button
                    onClick={() => handleBuy(product.price_id)}
                    disabled={checkoutMutation.isPending && selectedPrice === product.price_id}
                    className="w-full bg-accent text-accent-foreground border-accent"
                    data-testid={`button-buy-${product.price_id}`}
                  >
                    {checkoutMutation.isPending && selectedPrice === product.price_id ? (
                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    ) : (
                      <ShoppingCart className="w-4 h-4 mr-2" />
                    )}
                    Buy Now
                  </Button>
                </div>
              </CyberCard>
            );
          })
        ) : (
          <div className="col-span-full text-center py-16" data-testid="text-no-products">
            <Coins className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <p className="text-muted-foreground">Token packages coming soon. Check back later.</p>
          </div>
        )}
      </div>

      <CyberCard className="mb-12">
        <div className="p-5">
          <div className="flex items-center gap-2 mb-4">
            <DollarSign className="w-5 h-5 text-accent" />
            <h3 className="font-heading font-bold text-foreground text-lg">Custom Amount</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">
            Enter any amount between 10,000 and 5,000,000 WEBD. Max 5 million WEBD per day per address.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1">
              <Input
                type="number"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-input border-primary/30 font-mono"
                placeholder="Enter WEBD amount (min 10,000)"
                min={10000}
                max={5000000}
                data-testid="input-custom-webd-amount"
              />
              {customAmountNum >= 10000 && (
                <div className="text-xs font-mono text-muted-foreground" data-testid="text-custom-price">
                  {customAmountNum.toLocaleString()} WEBD = <span className="text-accent font-semibold">${customPriceUsd.toFixed(2)} USD</span>
                  <span className="ml-2 text-muted-foreground">(${WEBD_PRICE_USD} per WEBD)</span>
                </div>
              )}
              {customAmountNum > 0 && customAmountNum < 10000 && (
                <div className="text-xs font-mono text-destructive">
                  Minimum purchase is 10,000 WEBD
                </div>
              )}
              {customAmountNum > 5000000 && (
                <div className="text-xs font-mono text-destructive">
                  Maximum purchase is 5,000,000 WEBD per day per address
                </div>
              )}
            </div>
            <Button
              onClick={handleCustomBuy}
              disabled={customCheckoutMutation.isPending || customAmountNum < 10000 || customAmountNum > 5000000}
              className="bg-accent text-accent-foreground border-accent shrink-0"
              data-testid="button-custom-buy"
            >
              {customCheckoutMutation.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
              ) : (
                <ShoppingCart className="w-4 h-4 mr-2" />
              )}
              Buy Custom Amount
            </Button>
          </div>
        </div>
      </CyberCard>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <CyberCard>
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <Shield className="w-8 h-8 text-accent" />
            <h3 className="font-heading font-bold text-foreground">Secure Payments</h3>
            <p className="text-sm text-muted-foreground">
              All transactions are processed through Stripe with bank-level encryption.
            </p>
          </div>
        </CyberCard>
        <CyberCard>
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <Zap className="w-8 h-8 text-accent" />
            <h3 className="font-heading font-bold text-foreground">Instant Delivery</h3>
            <p className="text-sm text-muted-foreground">
              Tokens are credited to your wallet immediately after payment confirmation.
            </p>
          </div>
        </CyberCard>
        <CyberCard>
          <div className="p-5 flex flex-col items-center text-center gap-3">
            <TrendingUp className="w-8 h-8 text-accent" />
            <h3 className="font-heading font-bold text-foreground">Start Mining</h3>
            <p className="text-sm text-muted-foreground">
              Use your tokens to mine and earn passive rewards through Proof-of-Stake.
            </p>
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
