import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Droplets, Clock, Wallet, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function Faucet() {
  const { user } = useAuth();
  const { toast } = useToast();
  
  const [address, setAddress] = useState("");
  const [isClaiming, setIsClaiming] = useState(false);
  const [hasClaimed, setHasClaimed] = useState(false);
  const [timeLeft, setTimeLeft] = useState("23:59:59");

  // Auto-fill address if logged in
  useEffect(() => {
    if (user?.walletAddress) {
      setAddress(user.walletAddress);
    }
  }, [user]);

  // Fake countdown for prototype visual
  useEffect(() => {
    if (!hasClaimed) return;
    
    const interval = setInterval(() => {
      setTimeLeft(prev => {
        const [h, m, s] = prev.split(':').map(Number);
        let total = h * 3600 + m * 60 + s - 1;
        if (total <= 0) {
          setHasClaimed(false);
          return "23:59:59";
        }
        const newH = Math.floor(total / 3600);
        const newM = Math.floor((total % 3600) / 60);
        const newS = total % 60;
        return `${String(newH).padStart(2, '0')}:${String(newM).padStart(2, '0')}:${String(newS).padStart(2, '0')}`;
      });
    }, 1000);
    
    return () => clearInterval(interval);
  }, [hasClaimed]);

  const handleClaim = () => {
    if (!address) {
      toast({ title: "Address Required", description: "Please enter your WEBD2ollar 2 wallet address.", variant: "destructive" });
      return;
    }
    
    setIsClaiming(true);
    
    // Simulate network request
    setTimeout(() => {
      setIsClaiming(false);
      setHasClaimed(true);
      toast({
        title: "Faucet Claim Successful!",
        description: "100 WEBD2 has been added to your simulated balance.",
        variant: "default",
      });
    }, 1500);
  };

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[80vh]">
      
      <div className="text-center mb-8 animate-fade-in">
        <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-primary/10 border border-primary/30 mb-4 shadow-[0_0_30px_rgba(255,215,0,0.2)]">
          <Droplets className="w-12 h-12 text-primary" />
        </div>
        <h1 className="text-4xl md:text-5xl font-heading font-bold text-white tracking-wider mb-2 drop-shadow-[0_0_10px_rgba(255,215,0,0.5)]">
          WEBD2 FAUCET
        </h1>
        <p className="text-muted-foreground font-mono max-w-lg mx-auto">
          Claim free WEBD2ollar 2 daily to test the network latency, play the simulated Crash game, and verify your wallet.
        </p>
      </div>

      <Card className="w-full max-w-md bg-card/50 backdrop-blur-sm border-primary/20 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
        <CardHeader>
          <CardTitle className="font-mono flex items-center gap-2">
            {hasClaimed ? <Clock className="w-5 h-5 text-accent" /> : <Wallet className="w-5 h-5 text-primary" />}
            {hasClaimed ? "COOLDOWN ACTIVE" : "CLAIM TEST TOKENS"}
          </CardTitle>
          <CardDescription className="opacity-70">
            {hasClaimed ? "You have already claimed your daily tokens." : "Receive 100 simulated WEBD2 daily."}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          
          {hasClaimed ? (
             <div className="bg-background/80 rounded-xl border border-accent/20 p-8 text-center flex flex-col items-center justify-center gap-4 relative overflow-hidden">
               <div className="absolute inset-0 bg-accent/5 opacity-50"></div>
               <CheckCircle2 className="w-16 h-16 text-accent animate-pulse" />
               <div>
                  <div className="text-sm font-mono text-muted-foreground uppercase tracking-widest mb-1">Time Until Next Claim</div>
                  <div className="text-4xl font-mono text-white font-bold drop-shadow-[0_0_10px_rgba(255,215,0,0.3)]">{timeLeft}</div>
               </div>
             </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Wallet Address</label>
                <Input 
                  placeholder="WD2..." 
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="font-mono bg-background/50 border-primary/30 py-6"
                />
              </div>

              <div className="p-3 rounded-lg bg-primary/5 border border-primary/10 text-xs font-mono text-muted-foreground">
                <strong>NETWORK NOTICE:</strong> Faucet payouts are batched daily to reduce simulated main-chain congestion. Daily simulation wins are recorded to your gross ledger before payouts.
              </div>

              <Button 
                onClick={handleClaim} 
                disabled={isClaiming || !address} 
                className="w-full h-14 font-heading text-xl font-bold tracking-widest hover:bg-primary/80 transition-all btn-neon group"
              >
                {isClaiming ? "CONNECTING DIELBS..." : "CLAIM 100 WEBD2"}
                {!isClaiming && <Droplets className="w-5 h-5 ml-2 opacity-50 group-hover:opacity-100 transition-opacity" />}
              </Button>
            </div>
          )}

        </CardContent>
      </Card>

      <div className="mt-8 text-xs text-muted-foreground/40 font-mono text-center max-w-md">
        *Tokens acquired from this faucet are currently tracked as simulated balances until weekly gross settlements are authorized by server administrators.
      </div>
    </div>
  );
}
