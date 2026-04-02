import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { useStaking } from "@/hooks/use-staking";
import { useAddresses } from "@/hooks/use-addresses";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Wallet as WalletIcon, Send, Loader2, Copy, Check, Globe, ExternalLink, QrCode, X, Plus, Lock, Unlock, Trash2, Eye, EyeOff, KeyRound } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { PriceTicker, wEBDtoUSD, formatUSD } from "@/components/PriceTicker";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";

export default function Wallet() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { wallet, transfer, isTransferring } = useWallet();
  const { stakingInfo } = useStaking();
  const { addresses, createAddress, isCreating, getPhrase, lockAddress, unlockAddress, deleteAddress } = useAddresses();
  const { toast } = useToast();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [copied, setCopied] = useState<string | boolean>(false);
  const [showQR, setShowQR] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<{ id: number; mnemonic: string; address: string; publicKey: string } | null>(null);

  const searchParams = new URLSearchParams(window.location.search);
  const purchaseSuccess = searchParams.get("purchase") === "success";
  const purchaseAmount = searchParams.get("amount");

  useEffect(() => {
    if (purchaseSuccess) {
      const amountStr = purchaseAmount ? `${Number(purchaseAmount).toLocaleString()} WEBD` : 'WEBD tokens';
      toast({
        title: "Purchase Successful",
        description: `${amountStr} have been credited to your wallet.`,
      });
      window.history.replaceState({}, "", "/wallet");
    }
  }, [purchaseSuccess]);

  const { data: blockchainStatus } = useQuery({
    queryKey: ["/api/blockchain/status"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/status");
      if (!res.ok) return null;
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const { data: polygonInfo } = useQuery({
    queryKey: ["/api/wallet/polygon-info"],
    queryFn: async () => {
      const res = await fetch("/api/wallet/polygon-info");
      if (!res.ok) return null;
      return await res.json();
    },
    enabled: !!user,
  });

  const { data: polygonscanData } = useQuery({
    queryKey: ["/api/blockchain/polygonscan-url"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/polygonscan-url");
      if (!res.ok) return { url: "https://amoy.polygonscan.com" };
      return await res.json();
    },
  });
  const scanUrl = polygonscanData?.url || "https://amoy.polygonscan.com";

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  const copyAddress = () => {
    if (wallet?.walletAddress) {
      navigator.clipboard.writeText(wallet.walletAddress);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTransfer = () => {
    transfer({ recipientAddress: recipient, amount });
    setRecipient("");
    setAmount("");
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

  const stakedNum = parseFloat(stakingInfo?.stakedBalance || "0");

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">

      <div className="flex flex-col md:flex-row justify-between items-start md:items-end border-b border-primary/20 pb-6 gap-4">
        <div>
          <h1 className="text-4xl font-heading text-white" data-testid="text-wallet-title">WALLET DASHBOARD</h1>
          <div className="flex items-center gap-2 mt-2">
            <p className="font-mono text-primary/60 text-lg truncate max-w-md" data-testid="text-wallet-address">
              {wallet?.walletAddress || "Loading..."}
            </p>
            <button onClick={copyAddress} className="text-muted-foreground hover:text-primary transition-colors" data-testid="button-copy-address">
              {copied === true ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
            </button>
            <button onClick={() => setShowQR(!showQR)} className="text-muted-foreground hover:text-accent transition-colors" data-testid="button-show-qr">
              <QrCode className="w-4 h-4" />
            </button>
          </div>
          {showQR && wallet?.walletAddress && (
            <div className="mt-3 bg-white rounded-md p-4 w-fit relative">
              <button onClick={() => setShowQR(false)} className="absolute top-1 right-1 text-gray-500 hover:text-gray-800" data-testid="button-close-qr">
                <X className="w-4 h-4" />
              </button>
              <QRCodeSVG value={wallet.walletAddress} size={160} level="M" />
              <div className="text-center mt-2 text-[10px] text-gray-500 font-mono">Scan to receive WEBD</div>
            </div>
          )}
          {polygonInfo?.primaryPolygonAddress && (
            <div className="flex items-center gap-2 mt-1">
              <Globe className="w-3 h-3 text-purple-400" />
              <p className="font-mono text-purple-400/70 text-base truncate max-w-md" data-testid="text-polygon-address">
                {polygonInfo.primaryPolygonAddress}
              </p>
              <button
                onClick={() => { navigator.clipboard.writeText(polygonInfo.primaryPolygonAddress); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="text-muted-foreground hover:text-purple-400 transition-colors"
                data-testid="button-copy-polygon-address"
              >
                <Copy className="w-3 h-3" />
              </button>
              <a
                href={`${polygonInfo.polygonscanUrl || 'https://amoy.polygonscan.com'}/address/${polygonInfo.primaryPolygonAddress}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-purple-400/60 hover:text-purple-300 transition-colors"
                data-testid="link-polygonscan-address"
              >
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-sm font-mono text-muted-foreground">AVAILABLE BALANCE</div>
          <div className="text-5xl font-mono text-accent text-gold-glow" data-testid="text-balance">
            {Number(wallet?.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 4 })} <span className="text-lg text-primary">WEBD</span>
          </div>
          <div className="text-sm font-mono text-muted-foreground mt-0.5" data-testid="text-balance-usd">
            {formatUSD(wEBDtoUSD(Number(wallet?.balance || 0) + stakedNum))} USD
          </div>
          {stakedNum > 0 && (
            <div className="text-sm font-mono text-primary/60 mt-1" data-testid="text-staked-balance-header">
              + {stakedNum.toLocaleString(undefined, { minimumFractionDigits: 4 })} <span className="text-xs">MINING</span>
            </div>
          )}
          {polygonInfo?.maticBalance && parseFloat(polygonInfo.maticBalance) > 0 && (
            <div className="text-sm font-mono text-purple-400/80 mt-1" data-testid="text-matic-balance">
              {parseFloat(polygonInfo.maticBalance).toFixed(4)} <span className="text-xs text-purple-400/50">POL (on-chain)</span>
            </div>
          )}
          {blockchainStatus?.connected && (
            <div className="flex items-center justify-end gap-2 mt-2" data-testid="text-blockchain-status">
              <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
              <span className="text-xs font-mono text-green-400/80">{blockchainStatus.network}</span>
              <span className="text-xs font-mono text-muted-foreground">Block #{blockchainStatus.blockNumber?.toLocaleString()}</span>
            </div>
          )}
          <div className="mt-2">
            <PriceTicker />
          </div>
        </div>
      </div>

      <CyberCard title="SEND WEBD">
        <div className="space-y-6">
          <div className="space-y-2">
            <label className="text-xs font-mono text-primary/70">RECIPIENT ADDRESS</label>
            <Input
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              className="bg-input border-primary/30 font-mono"
              placeholder="WEBD$..."
              data-testid="input-recipient"
            />
          </div>
          <div className="space-y-2">
            <label className="text-xs font-mono text-primary/70">AMOUNT (WEBD)</label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-input border-primary/30 font-mono text-xl"
              placeholder="0.00"
              data-testid="input-amount"
            />
          </div>
          <Button
            className="w-full btn-neon flex justify-between items-center group"
            disabled={isTransferring || !amount || !recipient}
            onClick={handleTransfer}
            data-testid="button-transfer"
          >
            <span>{isTransferring ? "BROADCASTING..." : "EXECUTE TRANSFER"}</span>
            {!isTransferring && <ArrowRight className="group-hover:translate-x-1 transition-transform" />}
          </Button>
        </div>
      </CyberCard>

      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-2xl font-heading text-accent" data-testid="text-addresses-title">WALLET ADDRESSES</h2>
        <Button
          onClick={() => createAddress(undefined)}
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
                      <span className="font-mono text-base text-muted-foreground truncate max-w-[300px] sm:max-w-[500px]" data-testid={`text-address-value-${addr.id}`}>
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
                        <span className="font-mono text-base text-purple-400/60 truncate max-w-[300px] sm:max-w-[500px]" data-testid={`text-polygon-address-${addr.id}`}>
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
