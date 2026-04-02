import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useConversion } from "@/hooks/use-conversion";
import { useQuery } from "@tanstack/react-query";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RefreshCw, CheckCircle2, Clock, AlertTriangle, Ban, Copy, ArrowDown, Send, ExternalLink, Eye, Info } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";

const BURN_ADDRESS = "[ HIDDEN UNTIL FORMAL MAINNET LAUNCH ]";

export default function Conversion() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { requests, submitRequest, isSubmitting } = useConversion();
  const { toast } = useToast();

  const [oldAddress, setOldAddress] = useState("");
  const [amount, setAmount] = useState("");

  const { data: burnData, isLoading: burnLoading } = useQuery<{ balance: string; explorerUrl: string }>({
    queryKey: ["/api/conversion/burn-balance"],
    refetchInterval: 60000,
    enabled: false, // Disabled during Testnet to prevent errors on fake address
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitRequest({
      oldWalletAddress: oldAddress,
      amountClaimed: amount,
    });
    setOldAddress("");
    setAmount("");
  };

  const copyBurnAddress = () => {
    navigator.clipboard.writeText(BURN_ADDRESS);
    toast({
      title: "COPIED",
      description: "Burn address copied to clipboard.",
      className: "border-primary text-primary bg-black font-mono",
    });
  };

  const totalConverted = requests?.filter((r: any) => r.status === "approved").reduce((sum: number, r: any) => sum + parseFloat(r.amountApproved || "0"), 0) || 0;

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-heading text-accent mb-4" data-testid="text-conversion-title">LEGACY MIGRATION</h1>
        <p className="font-mono text-muted-foreground max-w-2xl mx-auto">
          Convert your original WEBD tokens to the new WDollar 2 (WD2) chain.
          Send your old tokens to the burn address below, then submit your old address and amount.
        </p>
      </div>

      <div className="mb-8 p-4 bg-card border border-primary/30 rounded-md flex items-start gap-3" data-testid="notice-verification-time">
        <Info className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="font-mono text-sm text-muted-foreground space-y-1">
          <span className="text-foreground font-semibold">This is not an instant swap.</span> After you send your old WEBD to the burn address, your deposit must be confirmed on the old blockchain and then manually verified by the team. This process can take anywhere from a few hours to a few days depending on network conditions and review queue. You will see your request status update from "Pending" to "Approved" once verification is complete.
        </div>
      </div>

      <div className="mb-8 p-4 bg-card border border-accent/20 rounded-md font-mono text-sm">
        <div className="flex flex-wrap gap-6 justify-around">
          <div className="text-center">
            <div className="text-muted-foreground text-xs">APPROVED</div>
            <div className="text-xl text-accent" data-testid="text-total-converted">{totalConverted.toLocaleString()} WD2</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">PENDING REVIEW</div>
            <div className="text-xl text-yellow-500">{requests?.filter((r: any) => r.status === "pending").length || 0}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">LIFETIME CAP</div>
            <div className="text-xl text-primary">5,000,000 WD2</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">REMAINING</div>
            <div className="text-xl text-primary" data-testid="text-remaining">{Math.max(0, 5000000 - totalConverted).toLocaleString()} WD2</div>
          </div>
        </div>
      </div>

      <div className="mb-8">
        <CyberCard title="BURN ADDRESS - SEND OLD WEBD HERE">
          <div className="space-y-4">
            <p className="text-sm font-mono text-muted-foreground">
              Transfer your old WEBD tokens to this address on the original WebDollar chain.
              The coins will be permanently removed from the old chain. You will receive the same amount on WDollar 2.
            </p>

            <div className="p-4 bg-background border border-accent/30 rounded-md">
              <div className="text-xs text-muted-foreground font-mono mb-2">DEPOSIT ADDRESS (Old WebDollar Chain)</div>
              <div className="flex items-center gap-2">
                <code className="text-accent font-mono text-base break-all flex-1" data-testid="text-burn-address">
                  {BURN_ADDRESS}
                </code>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={copyBurnAddress}
                  data-testid="button-copy-burn-address"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>

            <div className="p-4 bg-background border border-primary/20 rounded-md">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="text-xs text-muted-foreground font-mono mb-1">BURN ADDRESS BALANCE (Live from old chain)</div>
                  <div className="text-2xl font-mono text-accent" data-testid="text-burn-balance">
                    {burnLoading ? "Loading..." : burnData?.balance ? `${Number(burnData.balance).toLocaleString()} WD2` : "Unavailable"}
                  </div>
                  <div className="text-xs text-muted-foreground font-mono mt-1">
                    Total old WEBD deposited for conversion
                  </div>
                </div>
                {burnData?.explorerUrl && (
                  <a
                    href={burnData.explorerUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-1 text-xs font-mono text-primary hover:text-accent transition-colors"
                    data-testid="link-burn-explorer"
                  >
                    <Eye className="w-4 h-4" />
                    View on Explorer
                    <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            </div>

            <div className="p-4 bg-accent/5 border border-accent/20 text-xs font-mono text-muted-foreground rounded-md space-y-2">
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold shrink-0">STEP 1:</span>
                <span>Open your old WebDollar wallet and send the amount you want to convert to the burn address above.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold shrink-0">STEP 2:</span>
                <span>Fill out the form below with the old address you sent from and the amount you sent.</span>
              </div>
              <div className="flex items-start gap-2">
                <span className="text-accent font-bold shrink-0">RESULT:</span>
                <span>Once verified, you receive the same amount of WDollar 2 tokens. 1:1 swap ratio.</span>
              </div>
            </div>
          </div>
        </CyberCard>
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        <CyberCard title="SUBMIT CONVERSION REQUEST">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70">YOUR OLD WALLET ADDRESS (sender)</label>
              <Input
                value={oldAddress}
                onChange={(e) => setOldAddress(e.target.value)}
                className="bg-input border-primary/30 font-mono"
                placeholder="WEBD$..."
                required
                data-testid="input-old-address"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70">AMOUNT SENT TO BURN ADDRESS</label>
              <Input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="bg-input border-primary/30 font-mono"
                placeholder="0.00"
                required
                data-testid="input-claim-amount"
              />
            </div>
            <div className="p-4 bg-accent/5 border border-accent/20 text-xs font-mono text-muted-foreground rounded-md space-y-1">
              <div><AlertTriangle className="w-4 h-4 text-accent inline mr-2" />Your deposit will be verified on the burn address before tokens are credited.</div>
              <div>Old wallet addresses are automatically locked after submission.</div>
              <div>Initial swap limit: 5,000,000 WD2 per address, then 2,000,000 WD2 every 6 months after.</div>
            </div>

            <Button type="submit" disabled={isSubmitting} className="w-full btn-gold" data-testid="button-submit-claim">
              {isSubmitting ? "PROCESSING..." : "SUBMIT CONVERSION REQUEST"}
            </Button>
          </form>
        </CyberCard>

        <CyberCard title="REQUEST HISTORY">
          <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2">
            {requests?.length === 0 && (
              <div className="text-center py-8 text-muted-foreground font-mono text-sm">
                No conversion requests yet.
              </div>
            )}

            {requests?.map((req: any) => (
              <div key={req.id} className="p-4 border border-primary/10 bg-background rounded-md" data-testid={`conversion-request-${req.id}`}>
                <div className="flex justify-between items-center gap-2 mb-2">
                  <div className="text-lg font-mono text-foreground">{Number(req.status === "approved" ? req.amountApproved : req.amountClaimed).toLocaleString()} WD2</div>
                  <div className="flex items-center space-x-2 shrink-0">
                    {req.status === 'pending' && <Clock className="w-4 h-4 text-yellow-500" />}
                    {req.status === 'approved' && <CheckCircle2 className="w-4 h-4 text-accent" />}
                    {req.status === 'vesting' && <Clock className="w-4 h-4 text-primary" />}
                    {req.status === 'rejected' && <Ban className="w-4 h-4 text-destructive" />}
                    <span className={`text-xs font-bold uppercase ${
                      req.status === 'approved' ? 'text-accent' :
                      req.status === 'vesting' ? 'text-primary' :
                      req.status === 'rejected' ? 'text-destructive' : 'text-yellow-500'
                    }`}>
                      {req.status}
                    </span>
                  </div>
                </div>
                <div className="text-xs text-muted-foreground font-mono space-y-1">
                  <div className="truncate">From: {req.oldWalletAddress}</div>
                </div>
              </div>
            ))}
          </div>
        </CyberCard>
      </div>
    </div>
  );
}
