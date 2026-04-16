import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQueryClient } from "@tanstack/react-query";
import { decryptPrivateKeyBrowser, signTransaction } from "@/lib/crypto";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { ShieldAlert, Crosshair, Zap, CheckCircle2, XCircle } from "lucide-react";

export default function DoubleSpendTest() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [password, setPassword] = useState("");
  const [targetAddress, setTargetAddress] = useState("");
  const [isAttacking, setIsAttacking] = useState(false);
  const [results, setResults] = useState<{ id: number; status: string; message: string; latency: number }[]>([]);

  const launchAttack = async () => {
    if (!password || !targetAddress) {
      toast({ title: "Error", description: "Missing password or target address", variant: "destructive" });
      return;
    }

    setIsAttacking(true);
    setResults([]);

    try {
      // 1. Fetch encrypted private key and current network nonce
      const preRes = await fetch('/api/wallet/sign-preflight', { credentials: "include" });
      if (!preRes.ok) throw new Error("Failed to initialize attack preflight");
      const { encryptedPrivateKey, nonce } = await preRes.json();

      // 2. Decrypt key locally
      const privateKey = await decryptPrivateKeyBrowser(encryptedPrivateKey, password);
      if (!privateKey) throw new Error("Password incorrect. Decryption failed.");

      // AMOUNT TO ATTACK (Attempting to spend the same 10 WEBD 5 times concurrently)
      const attackAmount = "10";

      const message = JSON.stringify({ 
        recipientAddress: targetAddress.trim(), 
        amount: parseFloat(attackAmount).toString(), 
        nonce // VULNERABILITY EXPLOIT: Reusing the exact same chronological nonce
      });
      
      const signature = await signTransaction(message, privateKey);
      
      const attackPayload = {
        recipientAddress: targetAddress.trim(),
        amount: attackAmount,
        signature,
        nonce 
      };

      toast({ title: "ATTACK LAUNCHED", description: "Firing 5 concurrent double-spend clones directly into the mesh...", className: "bg-red-900 border-red-500 font-mono text-white" });

      // 3. BLAST 5 IDENTICAL TRANSACTIONS AT THE EXACT SAME MILLISECOND
      const attackPromises = [1, 2, 3, 4, 5].map(async (id) => {
        const start = performance.now();
        try {
          const res = await fetch("/api/wallet/transfer", {
             method: "POST",
             headers: { "Content-Type": "application/json" },
             body: JSON.stringify(attackPayload),
             credentials: "include",
          });
          const latency = Math.round(performance.now() - start);
          if (res.ok) {
             return { id, status: "SUCCESS", message: "Transaction completed! (WARNING: IF > 1 SUCCEEDS, NETWORK IS COMPROMISED)", latency };
          } else {
             const err = await res.json();
             return { id, status: "DEFLECTED", message: err.message, latency };
          }
        } catch (e: any) {
             const latency = Math.round(performance.now() - start);
             return { id, status: "DEFLECTED", message: e.message || "Network rejected request", latency };
        }
      });

      const attackResults = await Promise.all(attackPromises);
      setResults(attackResults);
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });

    } catch (e: any) {
      toast({ title: "Attack Aborted", description: e.message, variant: "destructive" });
    } finally {
      setIsAttacking(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8 border-b border-red-500 pb-4">
        <h1 className="text-4xl font-heading font-black text-red-500 flex items-center mb-2">
          <ShieldAlert className="mr-4 w-10 h-10" />
          ADVERSARIAL TESTING: DOUBLE SPEND EXPLOIT
        </h1>
        <p className="font-mono text-primary/80">
          This secure terminal attempts to exploit the network by firing 5 cryptographically identical transactions in parallel. 
          If the Distributed In-Environment Ledger Consensus is secure, exactly 1 will succeed, and the remaining 4 will be violently deflected by the Row-Locking architecture.
        </p>
      </div>

      <Card className="bg-black/50 border-red-900 border-2">
        <CardHeader>
          <CardTitle className="font-mono text-red-400">CONFIGURE LOAD ATTACK</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div>
             <label className="text-xs font-mono text-white/50">TARGET WALLET ADDRESS (Who receives the 10 WEBD)</label>
             <Input 
                value={targetAddress} 
                onChange={(e) => setTargetAddress(e.target.value)} 
                className="bg-[#020817] font-mono border-red-900 focus:border-red-500" 
                placeholder="WEBD$..."
             />
          </div>
          <div>
             <label className="text-xs font-mono text-white/50">DECRYPT PASSWORD (To sign the exploit payloads)</label>
             <Input 
                type="password"
                value={password} 
                onChange={(e) => setPassword(e.target.value)} 
                className="bg-[#020817] font-mono border-red-900 focus:border-red-500" 
             />
          </div>
          
          <Button 
            disabled={isAttacking || !password || !targetAddress}
            onClick={launchAttack}
            className="w-full bg-red-900 hover:bg-red-700 text-white font-black tracking-widest h-14"
          >
            {isAttacking ? "EXECUTING CONCURRENT ATTACK..." : "🔥 FIRE 5 DOUBLE-SPEND ATTEMPTS 🔥"}
          </Button>

          {results.length > 0 && (
            <div className="mt-8 space-y-4">
              <h3 className="font-mono font-bold text-white mb-4 border-b border-white/20 pb-2">🛡️ CONSENSUS DEFENSE REPORT:</h3>
              <div className="grid gap-3">
                {results.map((r) => (
                  <div key={r.id} className={`p-4 rounded border font-mono flex items-start sm:items-center flex-col sm:flex-row gap-4 ${r.status === 'SUCCESS' ? 'bg-red-950 border-red-500' : 'bg-green-950 border-green-500'}`}>
                    {r.status === 'SUCCESS' ? <Crosshair className="w-8 h-8 text-red-500 shrink-0" /> : <CheckCircle2 className="w-8 h-8 text-green-500 shrink-0" />}
                    <div className="flex-1">
                      <div className="flex gap-2 items-center mb-1">
                        <span className={`font-black tracking-widest text-sm px-2 py-0.5 rounded ${r.status === 'SUCCESS' ? 'bg-red-500 text-black' : 'bg-green-500 text-black'}`}>
                          {r.status === 'SUCCESS' ? 'ASSET COMPROMISED' : 'ATTACK BLOCKED'}
                        </span>
                        <span className="text-xs text-white/40">Latency: {r.latency}ms</span>
                      </div>
                      <p className="text-sm text-white/80">{r.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
