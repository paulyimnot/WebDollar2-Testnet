import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useAddresses } from "@/hooks/use-addresses";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import { Plus, Lock, Unlock, Trash2, Eye, EyeOff, Copy, Check, KeyRound, Globe, ExternalLink } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";

export default function Addresses() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { addresses, createAddress, isCreating, getPhrase, lockAddress, unlockAddress, deleteAddress } = useAddresses();

  const [revealedPhrase, setRevealedPhrase] = useState<{ id: number; mnemonic: string; address: string; publicKey: string } | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  const { data: polygonscanData } = useQuery({
    queryKey: ["/api/blockchain/polygonscan-url"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/polygonscan-url");
      if (!res.ok) return { url: "https://amoy.polygonscan.com" };
      return await res.json();
    },
  });
  const scanUrl = polygonscanData?.url || "https://amoy.polygonscan.com";

  if (!user) {
    setLocation("/auth");
    return null;
  }

  const handleCreate = () => {
    createAddress(undefined as any);
  };

  const handleReveal = async (id: number) => {
    if (revealedPhrase?.id === id) {
      setRevealedPhrase(null);
      return;
    }
    try {
      const data = await getPhrase(id);
      setRevealedPhrase({ id, ...data });
    } catch {}
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl space-y-8">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-4xl font-heading text-accent" data-testid="text-addresses-title">WALLET ADDRESSES</h1>
          <p className="font-mono text-muted-foreground text-sm mt-1">
            Manage your cryptographic addresses. Each has a unique seed phrase.
          </p>
        </div>
        <Button
          onClick={handleCreate}
          disabled={isCreating}
          className="btn-gold shrink-0"
          data-testid="button-create-address"
        >
          <Plus className="w-4 h-4 mr-2" />
          {isCreating ? "GENERATING..." : "NEW ADDRESS"}
        </Button>
      </div>

      <div className="space-y-4">
        {addresses?.map((addr: any) => (
          <CyberCard key={addr.id} className={addr.isLocked ? "opacity-60" : ""}>
            <div className="flex flex-col gap-4">
              <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-2">
                <div className="flex items-center gap-3">
                  <KeyRound className={`w-5 h-5 ${addr.isPrimary ? 'text-accent' : 'text-primary'}`} />
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-sm text-white" data-testid={`text-address-label-${addr.id}`}>{addr.label}</span>
                      {addr.isPrimary && <span className="text-[10px] px-2 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded-sm font-mono">PRIMARY</span>}
                      {addr.isLocked && <span className="text-[10px] px-2 py-0.5 bg-destructive/20 text-destructive border border-destructive/30 rounded-sm font-mono">LOCKED</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="font-mono text-xs text-muted-foreground truncate max-w-[200px] sm:max-w-[350px]" data-testid={`text-address-value-${addr.id}`}>
                        {addr.address}
                      </span>
                      <button
                        onClick={() => copyToClipboard(addr.address, `addr-${addr.id}`)}
                        className="text-muted-foreground hover:text-primary transition-colors"
                        data-testid={`button-copy-address-${addr.id}`}
                      >
                        {copied === `addr-${addr.id}` ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    {addr.polygonAddress && (
                      <div className="flex items-center gap-2 mt-1">
                        <Globe className="w-3 h-3 text-purple-400" />
                        <span className="font-mono text-xs text-purple-400/60 truncate max-w-[200px] sm:max-w-[350px]" data-testid={`text-polygon-address-${addr.id}`}>
                          {addr.polygonAddress}
                        </span>
                        <button
                          onClick={() => copyToClipboard(addr.polygonAddress, `poly-${addr.id}`)}
                          className="text-muted-foreground hover:text-purple-400 transition-colors"
                          data-testid={`button-copy-polygon-${addr.id}`}
                        >
                          {copied === `poly-${addr.id}` ? <Check className="w-3 h-3 text-purple-400" /> : <Copy className="w-3 h-3" />}
                        </button>
                        <a
                          href={`${scanUrl}/address/${addr.polygonAddress}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-purple-400/60 hover:text-purple-300 transition-colors"
                          data-testid={`link-polygonscan-${addr.id}`}
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className="text-xs text-muted-foreground font-mono">BALANCE</div>
                  <div className="text-lg font-mono text-accent" data-testid={`text-address-balance-${addr.id}`}>
                    {Number(addr.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                  </div>
                  <div className="text-[10px] text-primary font-mono">WEBD</div>
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleReveal(addr.id)}
                    disabled={addr.isLocked}
                    className="font-mono text-xs"
                    data-testid={`button-reveal-phrase-${addr.id}`}
                  >
                    {revealedPhrase?.id === addr.id ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                    {revealedPhrase?.id === addr.id ? "HIDE" : "SEED PHRASE"}
                  </Button>

                  {addr.isLocked ? (
                    <Button variant="outline" size="sm" onClick={() => unlockAddress(addr.id)} className="font-mono text-xs" data-testid={`button-unlock-${addr.id}`}>
                      <Unlock className="w-3 h-3 mr-1" /> UNLOCK
                    </Button>
                  ) : (
                    <Button variant="outline" size="sm" onClick={() => lockAddress(addr.id)} className="font-mono text-xs" data-testid={`button-lock-${addr.id}`}>
                      <Lock className="w-3 h-3 mr-1" /> LOCK
                    </Button>
                  )}

                  {!addr.isPrimary && Number(addr.balance || 0) === 0 && (
                    <Button variant="outline" size="sm" onClick={() => deleteAddress(addr.id)} className="font-mono text-xs text-destructive border-destructive/30" data-testid={`button-delete-${addr.id}`}>
                      <Trash2 className="w-3 h-3 mr-1" /> DELETE
                    </Button>
                  )}
                </div>
              </div>

              {revealedPhrase?.id === addr.id && (
                <div className="bg-background border border-accent/20 rounded-md p-4 space-y-3">
                  <div>
                    <div className="text-xs text-accent font-mono mb-1">SEED PHRASE (12 WORDS) - KEEP SECRET!</div>
                    <div className="bg-card p-3 rounded-md font-mono text-sm text-white border border-accent/10 flex items-center justify-between gap-2 flex-wrap" data-testid={`text-seed-phrase-${addr.id}`}>
                      <span className="break-all">{revealedPhrase!.mnemonic}</span>
                      <button
                        onClick={() => copyToClipboard(revealedPhrase!.mnemonic, `phrase-${addr.id}`)}
                        className="text-muted-foreground hover:text-accent transition-colors shrink-0"
                      >
                        {copied === `phrase-${addr.id}` ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-primary font-mono mb-1">PUBLIC KEY</div>
                    <div className="bg-card p-2 rounded-md font-mono text-xs text-muted-foreground border border-primary/10 break-all" data-testid={`text-public-key-${addr.id}`}>
                      {revealedPhrase!.publicKey}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CyberCard>
        ))}

        {(!addresses || addresses.length === 0) && (
          <div className="text-center py-12 text-muted-foreground font-mono">
            No addresses found. Create your first one above.
          </div>
        )}
      </div>

      <TwoFactorSettings />
    </div>
  );
}
