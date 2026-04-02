import { useState } from "react";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CreditCard, Wifi, Fingerprint, ShieldCheck, Globe, ArrowRightLeft, Store, Smartphone, Banknote, TrendingUp, Clock, Percent, Lock, Loader2, CheckCircle, Mail } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "JPY", "AUD", "CAD", "CHF"];

const FEE_TIERS = [
  { range: "0 - 500", fee: "2.5%" },
  { range: "500 - 5,000", fee: "1.8%" },
  { range: "5,000 - 50,000", fee: "1.2%" },
  { range: "50,000+", fee: "0.8%" },
];

export default function CardPage() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const { data: waitlistStatus } = useQuery<{ joined: boolean; email?: string; position: number | null; totalCount: number }>({
    queryKey: ["/api/card/waitlist/status"],
    enabled: !!user,
  });

  const joinMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/card/waitlist/join", { email });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/card/waitlist/status"] });
      toast({ title: "You're on the list!", description: "We'll notify you when the WDollar Card is available." });
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to join waitlist", variant: "destructive" });
    },
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const basePosition = 4281;
  const displayPosition = waitlistStatus?.joined && waitlistStatus.position
    ? basePosition + waitlistStatus.position
    : basePosition + (waitlistStatus?.totalCount || 0) + 1;

  return (
    <div className="container mx-auto px-4 py-16 flex flex-col items-center">
      <h1 className="text-4xl md:text-5xl font-heading text-center mb-4 text-accent" data-testid="text-card-title">WDOLLAR CARD</h1>
      <p className="text-2xl font-heading text-center mb-2">SPEND CRYPTO. ANYWHERE.</p>
      <p className="font-mono text-muted-foreground text-center max-w-xl mb-12">
        The WDollar 2 Card converts your WEBD to fiat instantly at the point of sale.
        Accepted by over 50 million merchants worldwide via Visa/Mastercard networks.
      </p>

      <div className="relative w-[340px] h-[220px] md:w-[480px] md:h-[300px] mb-12 group">
        <div className="absolute inset-0 bg-gradient-to-br from-zinc-900 via-zinc-800 to-black rounded-xl border border-accent/40 shadow-[0_0_50px_rgba(255,193,44,0.2)] flex flex-col justify-between p-8 transform transition-transform group-hover:scale-105 duration-500">

          <div className="flex justify-between items-start">
            <Wifi className="w-8 h-8 md:w-12 md:h-12 text-accent/50 rotate-90" />
            <div className="text-right flex items-center gap-2">
              <img src={logoImg} alt="WDollar 2" className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" />
              <div>
                <div className="font-heading font-bold text-lg md:text-xl text-accent">WDOLLAR</div>
                <div className="font-mono text-xs text-primary tracking-widest">PREMIUM</div>
              </div>
            </div>
          </div>

          <div className="w-12 h-10 md:w-16 md:h-12 bg-gradient-to-br from-yellow-200 to-yellow-600 rounded-md border border-yellow-700/50 flex items-center justify-center">
            <div className="w-full h-[1px] bg-black/20"></div>
          </div>

          <div className="font-mono text-xl md:text-3xl text-accent tracking-widest text-gold-glow">
            {'\u2022\u2022\u2022\u2022'} {'\u2022\u2022\u2022\u2022'} {'\u2022\u2022\u2022\u2022'} 4242
          </div>

          <div className="flex justify-between items-end">
            <div>
              <div className="text-[10px] text-muted-foreground font-mono">CARDHOLDER</div>
              <div className="font-mono text-sm md:text-lg text-white uppercase" data-testid="text-cardholder">{user.username}</div>
            </div>
            <Fingerprint className="w-8 h-8 md:w-12 md:h-12 text-accent/30" />
          </div>

          <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-xl pointer-events-none"></div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6 mb-12 max-w-4xl w-full">
        <CyberCard className="text-center">
          <ArrowRightLeft className="w-10 h-10 text-accent mx-auto mb-3" />
          <h3 className="font-heading text-sm mb-1">INSTANT CONVERSION</h3>
          <p className="text-xs font-mono text-muted-foreground">WEBD to fiat at point of sale. Real-time exchange rates with no hidden markups.</p>
        </CyberCard>
        <CyberCard className="text-center">
          <Store className="w-10 h-10 text-primary mx-auto mb-3" />
          <h3 className="font-heading text-sm mb-1">50M+ MERCHANTS</h3>
          <p className="text-xs font-mono text-muted-foreground">Accepted anywhere Visa/Mastercard is accepted worldwide. Online and in-store.</p>
        </CyberCard>
        <CyberCard className="text-center">
          <ShieldCheck className="w-10 h-10 text-accent mx-auto mb-3" />
          <h3 className="font-heading text-sm mb-1">SECURE</h3>
          <p className="text-xs font-mono text-muted-foreground">3D Secure. Biometric auth. Instant freeze capability via app.</p>
        </CyberCard>
      </div>

      <div className="grid md:grid-cols-2 gap-8 mb-12 max-w-4xl w-full">

        <CyberCard title="CONVERSION FLOW">
          <div className="space-y-4 font-mono text-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">1</div>
              <div>
                <div className="text-foreground font-bold">TAP OR SWIPE</div>
                <div className="text-muted-foreground text-xs">Present your WDollar Card at any merchant terminal</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">2</div>
              <div>
                <div className="text-foreground font-bold">REAL-TIME QUOTE</div>
                <div className="text-muted-foreground text-xs">System fetches live WEBD/fiat rate from aggregated exchange feeds</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">3</div>
              <div>
                <div className="text-foreground font-bold">DEBIT WEBD</div>
                <div className="text-muted-foreground text-xs">Exact WEBD amount deducted from your primary wallet + conversion fee</div>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-full bg-accent/20 flex items-center justify-center shrink-0 text-accent font-bold text-xs">4</div>
              <div>
                <div className="text-foreground font-bold">SETTLE IN FIAT</div>
                <div className="text-muted-foreground text-xs">Merchant receives fiat via Visa/Mastercard network. Settlement in 1-2 business days.</div>
              </div>
            </div>
          </div>
        </CyberCard>

        <CyberCard title="FEE SCHEDULE">
          <div className="space-y-3 font-mono text-sm">
            <p className="text-xs text-muted-foreground mb-4">
              Conversion fees based on monthly spending volume (in USD equivalent)
            </p>
            <div className="space-y-2">
              {FEE_TIERS.map((tier, idx) => (
                <div key={idx} className="flex justify-between items-center py-2 border-b border-primary/10" data-testid={`fee-tier-${idx}`}>
                  <span className="text-muted-foreground">${tier.range}</span>
                  <span className="text-accent font-bold">{tier.fee}</span>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-accent/5 border border-accent/20 rounded-md">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Percent className="w-4 h-4 text-accent shrink-0" />
                No monthly fees. No annual fees. No foreign transaction fees.
              </div>
            </div>
          </div>
        </CyberCard>
      </div>

      <div className="grid md:grid-cols-4 gap-4 mb-12 max-w-4xl w-full">
        <CyberCard className="text-center">
          <Globe className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-heading text-xs mb-1">MULTI-CURRENCY</h3>
          <div className="flex flex-wrap justify-center gap-1 mt-2">
            {SUPPORTED_CURRENCIES.map(c => (
              <span key={c} className="text-[10px] font-mono text-accent bg-accent/10 px-2 py-0.5 rounded-md">{c}</span>
            ))}
          </div>
        </CyberCard>
        <CyberCard className="text-center">
          <Smartphone className="w-8 h-8 text-accent mx-auto mb-2" />
          <h3 className="font-heading text-xs mb-1">MOBILE APP</h3>
          <p className="text-[10px] font-mono text-muted-foreground">Track spending, freeze card, set limits</p>
        </CyberCard>
        <CyberCard className="text-center">
          <Banknote className="w-8 h-8 text-primary mx-auto mb-2" />
          <h3 className="font-heading text-xs mb-1">ATM WITHDRAWAL</h3>
          <p className="text-[10px] font-mono text-muted-foreground">Withdraw fiat at ATMs worldwide</p>
        </CyberCard>
        <CyberCard className="text-center">
          <Lock className="w-8 h-8 text-accent mx-auto mb-2" />
          <h3 className="font-heading text-xs mb-1">SPENDING LIMITS</h3>
          <p className="text-[10px] font-mono text-muted-foreground">Daily/monthly caps configurable per wallet</p>
        </CyberCard>
      </div>

      <CyberCard title="EARLY ACCESS" className="max-w-md w-full text-center">
        <div className="space-y-4">
          <p className="text-sm font-mono text-muted-foreground">
            We are in beta with selected partners.
            Join the waitlist to receive your physical WDollar Card.
          </p>
          {waitlistStatus?.joined ? (
            <div className="space-y-3">
              <div className="flex items-center justify-center gap-2 text-accent">
                <CheckCircle className="w-5 h-5" />
                <span className="font-heading font-bold">YOU'RE ON THE LIST</span>
              </div>
              <p className="text-xs font-mono text-muted-foreground">
                We'll notify you at <span className="text-foreground">{waitlistStatus.email}</span> when your card is ready.
              </p>
              <p className="text-xs text-accent/70 font-mono" data-testid="text-waitlist-position">
                Your position in queue: #{displayPosition.toLocaleString()}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                  <Input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter your email"
                    className="pl-9 bg-input border-primary/30 font-mono"
                    data-testid="input-waitlist-email"
                  />
                </div>
                <Button
                  className="btn-gold shrink-0"
                  disabled={joinMutation.isPending || !email.includes("@")}
                  onClick={() => joinMutation.mutate(email)}
                  data-testid="button-join-waitlist"
                >
                  {joinMutation.isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : null}
                  JOIN WAITLIST
                </Button>
              </div>
              <p className="text-xs text-primary/50 font-mono" data-testid="text-waitlist-position">
                Position in queue: #{displayPosition.toLocaleString()}
              </p>
            </div>
          )}
        </div>
      </CyberCard>
    </div>
  );
}
