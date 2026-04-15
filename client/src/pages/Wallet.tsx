import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWallet } from "@/hooks/use-wallet";
import { useStaking } from "@/hooks/use-staking";
import { useAddresses } from "@/hooks/use-addresses";
import { useP2P } from "@/hooks/use-p2p";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowRight, Wallet as WalletIcon, Send, Loader2, Copy, Check, Globe, ExternalLink, QrCode, X, Plus, Lock, Unlock, Trash2, Eye, EyeOff, KeyRound, Zap, ShieldCheck } from "lucide-react";
import { useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QRCodeSVG } from "qrcode.react";
import { PriceTicker, WEBD2toUSD, formatUSD } from "@/components/PriceTicker";
import { TwoFactorSettings } from "@/components/TwoFactorSettings";
import { calculatePoW } from "@/lib/crypto";

export default function Wallet() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { wallet, transfer, privateTransfer, isTransferring } = useWallet();
  const { stakingInfo } = useStaking();
  const { addresses, createAddress, isCreating, getPhrase, lockAddress, unlockAddress, deleteAddress } = useAddresses();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("");
  const [txPassword, setTxPassword] = useState("");
  const [copied, setCopied] = useState<string | boolean>(false);
  const [showQR, setShowQR] = useState(false);
  const [revealedPhrase, setRevealedPhrase] = useState<{ id: number; mnemonic: string; address: string; publicKey: string } | null>(null);

  // Alias & Private Transaction state
  const [isPrivate, setIsPrivate] = useState(false);
  const [isResolvingAlias, setIsResolvingAlias] = useState(false);

  const [customAlias, setCustomAlias] = useState("");
  const [isSavingAlias, setIsSavingAlias] = useState(false);
  const [networkLatency, setNetworkLatency] = useState<number | null>(null);

  // 📡 P2P Backend backbone logic
  const { isBackbone, toggleBackbone, isConnected: isP2PConnected } = useP2P();

  // Measure Latency (Visual Only)
  useEffect(() => {
    const measureLatency = async () => {
        const start = performance.now();
        try {
            await fetch("/api/blockchain/status");
            const end = performance.now();
            setNetworkLatency(Math.round(end - start));
        } catch {
            setNetworkLatency(null);
        }
    };
    measureLatency();
    const interval = setInterval(measureLatency, 10000);
    return () => clearInterval(interval);
  }, []);

  const saveAlias = async () => {
    if (!customAlias.trim()) return;
    setIsSavingAlias(true);
    try {
      const currentActive = (user as any)?.isAliasActive || false;
      const res = await fetch("/api/alias/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alias: customAlias, isAliasActive: currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update alias");
      queryClient.setQueryData(["/api/auth/me"], data);
      setCustomAlias("");
      toast({ title: "ALIAS SAVED", description: "Your custom alias has been updated." });
    } catch (e: any) {
      toast({ title: "ALIAS ERROR", description: e.message, variant: "destructive" });
    } finally {
      setIsSavingAlias(false);
    }
  };

  const toggleAliasActive = async () => {
    try {
      const currentActive = (user as any)?.isAliasActive || false;
      const res = await fetch("/api/alias/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ alias: (user as any)?.alias || null, isAliasActive: !currentActive }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to toggle alias");
      queryClient.setQueryData(["/api/auth/me"], data);
      toast({ title: "ALIAS TOGGLED", description: `Alias is now ${!currentActive ? "ACTIVE" : "INACTIVE"}.` });
    } catch (e: any) {
      toast({ title: "TOGGLE ERROR", description: e.message, variant: "destructive" });
    }
  };

  const searchParams = new URLSearchParams(window.location.search);
  const purchaseSuccess = searchParams.get("purchase") === "success";
  const purchaseAmount = searchParams.get("amount");

  useEffect(() => {
    if (purchaseSuccess) {
      const amountStr = purchaseAmount ? `${Number(purchaseAmount).toLocaleString()} WD2` : 'WD2 tokens';
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
      if (!res.ok) throw new Error("Status fetch failed");
      return await res.json();
    },
    refetchInterval: 30000,
    retry: 2,
    retryDelay: 3000,
    staleTime: 60000,
    placeholderData: (prev: any) => prev,
  });

  const faucetMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id) throw new Error("Authentication required.");
      const challenge = "faucet_" + Date.now();
      const nonce = await calculatePoW(user.id, challenge);
      const res = await fetch("/api/wallet/testnet-faucet", { 
        method: "POST", 
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ challenge, nonce }),
        credentials: "include" 
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Faucet claim failed");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/wallet"] });
      toast({ title: "TESTNET FAUCET", description: `+${data.amount.toLocaleString()} WD2 claimed successfully!`, className: "border-accent text-accent bg-black font-mono" });
    },
    onError: () => {
      toast({ title: "ERROR", description: "Could not claim faucet.", variant: "destructive" });
    }
  });

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

  const handleTransfer = async () => {
    let finalRecipient = recipient.trim();
    if (finalRecipient.startsWith('@') || !finalRecipient.startsWith('WEBD$')) {
      const aliasLookup = finalRecipient.startsWith('@') ? finalRecipient.substring(1) : finalRecipient;
      setIsResolvingAlias(true);
      try {
        const res = await fetch(`/api/alias/resolve/${aliasLookup}`);
        if (!res.ok) {
           const errData = await res.json().catch(() => ({}));
           throw new Error(errData.message || "Alias or username not found on the network.");
        }
        const data = await res.json();
        finalRecipient = data.address;
        toast({ title: "ALIAS RESOLVED", description: `Sending to ${data.username} (${finalRecipient.substring(0, 12)}...)`, className: "font-mono border-accent/30 text-accent/80" });
      } catch (e: any) {
        setIsResolvingAlias(false);
        toast({ title: "ALIAS ERROR", description: e.message || "Username/Alias not found or has no active wallet.", variant: "destructive", className: "font-mono" });
        return;
      }
      setIsResolvingAlias(false);
    }
    if (isPrivate) {
      privateTransfer({ recipientAddress: finalRecipient, amount, password: txPassword });
      setRecipient("");
      setAmount("");
      setTxPassword("");
    } else {
      transfer({ recipientAddress: finalRecipient, amount, password: txPassword });
      setRecipient("");
      setAmount("");
      setTxPassword("");
    }
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
  const addrTotal = addresses?.reduce((sum: number, addr: any) => {
    const v = parseFloat(addr.balance || "0");
    return sum + (isNaN(v) ? 0 : v);
  }, 0) ?? 0;
  const userBalance = parseFloat((user as any)?.balance || "0");
  const totalBalance = (addrTotal > 0 ? addrTotal : (isNaN(userBalance) ? 0 : userBalance));

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end border-b border-primary/20 pb-6 gap-6">
        <div className="w-full lg:w-auto">
          <h1 className="text-4xl md:text-5xl font-heading text-white border-b border-accent/20 pb-2 w-fit mb-4" data-testid="text-wallet-title">WALLET DASHBOARD</h1>
          <div className="flex flex-wrap items-center gap-3 mt-4">
            <p className="font-mono text-primary/90 text-2xl md:text-3xl font-black truncate max-w-[280px] sm:max-w-md bg-primary/10 px-3 py-2 rounded-lg border border-primary/20 shadow-[0_0_15px_rgba(255,193,44,0.1)]" data-testid="text-wallet-address">
              {wallet?.walletAddress || "Loading..."}
            </p>
            <div className="flex gap-2">
              <button onClick={copyAddress} className="p-3 bg-primary/10 rounded-md text-primary hover:text-accent transition-colors" data-testid="button-copy-address">
                {copied === true ? <Check className="w-6 h-6 text-accent" /> : <Copy className="w-6 h-6" />}
              </button>
              <button onClick={() => setShowQR(!showQR)} className="p-3 bg-accent/10 rounded-md text-accent hover:text-white transition-colors" data-testid="button-show-qr">
                <QrCode className="w-6 h-6" />
              </button>
               <div className="flex items-center gap-3 ml-2">
                <button 
                  onClick={toggleBackbone} 
                  className={`flex items-center gap-2 px-4 py-3 rounded-md font-heading font-black text-sm transition-all border-2 ${isBackbone ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.3)] animate-pulse' : 'bg-primary/5 border-primary/20 text-primary/60 hover:border-primary/50'}`}
                  title={isBackbone ? "Backbone Mode is ACTIVE. Your computer is serving as a network pillar." : "Elevate this computer to a Backbone Node (Recommended for 24/7 devices)"}
                >
                  <Zap className={`w-4 h-4 ${isBackbone ? 'fill-current' : ''}`} />
                  {isBackbone ? "BACKBONE ACTIVE" : "BACKBONE MODE"}
                </button>
                <p className="hidden sm:block text-[10px] font-mono text-muted-foreground/60 italic max-w-[200px] leading-snug border-l border-primary/20 pl-3">
                  {isBackbone ? "Network Pillar Active: Bypassing sleep (10% Mining Bonus Applied)." : "Turn on to prevent device sleep and earn 10% extra mining rewards."}
                </p>
               </div>
            </div>
          </div>
          {showQR && wallet?.walletAddress && (
            <div className="mt-3 bg-white rounded-md p-4 w-fit relative mx-auto lg:mx-0">
              <button onClick={() => setShowQR(false)} className="absolute top-1 right-1 text-gray-500 hover:text-gray-800" data-testid="button-close-qr">
                <X className="w-4 h-4" />
              </button>
              <QRCodeSVG value={wallet.walletAddress} size={160} level="M" />
              <div className="text-center mt-2 text-[10px] text-gray-400 font-mono uppercase tracking-widest font-black">RECEIVE WD2</div>
            </div>
          )}
        </div>
        <div className="w-full lg:w-auto text-left lg:text-right flex flex-col items-start lg:items-end bg-primary/5 lg:bg-transparent p-4 lg:p-0 rounded-lg border border-primary/10 lg:border-0">
          <div className="text-xs font-mono text-muted-foreground tracking-widest uppercase mb-1">TOTAL AVAILABLE BALANCE</div>
          <div className="text-4xl md:text-6xl font-mono text-accent text-gold-glow font-black flex items-baseline gap-2 tracking-tighter" data-testid="text-balance">
            {(isNaN(totalBalance) ? 0 : totalBalance).toLocaleString(undefined, { minimumFractionDigits: 4 })} <span className="text-xl md:text-2xl text-primary font-bold tracking-normal">WEBD2</span>
          </div>
          <div className="text-base md:text-lg font-mono text-muted-foreground mt-1 opacity-70" data-testid="text-balance-usd">
            ≈ {formatUSD(WEBD2toUSD(totalBalance + stakedNum))} USD
          </div>
          {stakedNum > 0 && (
            <div className="text-sm font-mono text-primary/60 mt-1" data-testid="text-staked-balance-header">
              + {stakedNum.toLocaleString(undefined, { minimumFractionDigits: 4 })} <span className="text-xs">MINING</span>
            </div>
          )}
          {blockchainStatus?.connected && (
            <div className="flex flex-col items-start lg:items-end gap-2 mt-4" data-testid="text-blockchain-status">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
                <span className="text-[10px] font-mono font-black text-green-400 tracking-widest uppercase">{blockchainStatus.network}</span>
                <span className="text-[10px] font-mono text-muted-foreground bg-white/5 px-2 py-0.5 rounded border border-white/10 italic">Block #{blockchainStatus.blockNumber?.toLocaleString()}</span>
              </div>
              <div className="flex flex-wrap items-center gap-3 mt-4">
                 <div className="flex items-center gap-2 bg-accent/10 border border-accent/30 px-3 py-1.5 rounded shadow-[0_0_15px_rgba(255,193,44,0.05)] group cursor-help transition-all hover:border-accent">
                    <Zap className="w-3.5 h-3.5 text-accent fill-accent/20 animate-pulse" />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-heading font-black text-accent tracking-[0.1em] uppercase leading-none mb-0.5">SETTLEMENT</span>
                       <span className="text-base font-mono font-black text-white leading-none">~4.8<span className="text-xs text-accent/80 ml-0.5">s</span></span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-primary/10 border border-primary/30 px-3 py-1.5 rounded group hover:border-primary transition-all cursor-help">
                    <div className={`w-2 h-2 rounded-full ${blockchainStatus.txLatency && blockchainStatus.txLatency < 200 ? 'bg-green-500' : 'bg-yellow-500'}`} />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-heading font-black text-primary tracking-[0.1em] uppercase leading-none mb-0.5">ENGINE PULSE</span>
                       <span className="text-base font-mono font-black text-white leading-none">
                          {blockchainStatus.txLatency ? blockchainStatus.txLatency : "---"}<span className="text-xs text-primary/80 ml-0.5">ms</span>
                       </span>
                    </div>
                 </div>
                 <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/30 px-3 py-1.5 rounded group hover:border-blue-500 transition-all cursor-help">
                    <Globe className={`w-3.5 h-3.5 ${networkLatency && networkLatency < 150 ? 'text-blue-400' : 'text-yellow-400'} animate-pulse`} />
                    <div className="flex flex-col">
                       <span className="text-[9px] font-heading font-black text-blue-400 tracking-[0.1em] uppercase leading-none mb-0.5">NETWORK PING</span>
                       <span className="text-base font-mono font-black text-white leading-none">
                          {networkLatency ? networkLatency : "---"}<span className="text-xs text-blue-400/80 ml-0.5">ms</span>
                       </span>
                    </div>
                 </div>
                  <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/30 px-3 py-1.5 rounded group hover:border-red-500 transition-all cursor-help relative overflow-hidden">
                     {isBackbone && <div className="absolute inset-0 bg-red-500/5 animate-pulse" />}
                     <ShieldCheck className={`w-3.5 h-3.5 ${isBackbone ? 'text-red-500' : 'text-primary/60'}`} />
                     <div className="flex flex-col">
                        <span className="text-[9px] font-heading font-black text-red-400 tracking-[0.1em] uppercase leading-none mb-0.5">WEBMESH STATUS</span>
                        <span className="text-base font-mono font-black text-white leading-none">
                           {isBackbone ? "BACKBONE" : "INACTIVE"}
                        </span>
                     </div>
                  </div>
               </div>
            </div>
          )}
          <div className="mt-3 w-full lg:w-auto">
            <PriceTicker />
          </div>
        </div>
      </div>
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 pt-4">
        <h2 className="text-3xl font-heading text-accent border-l-4 border-accent pl-4" data-testid="text-addresses-title">WALLET ADDRESSES</h2>
        <Button
          onClick={() => {
            const password = window.prompt("Enter your password to secure the new address:");
            if (!password) return;
            const label = window.prompt("Label for this address (optional):") || "Secondary Wallet";
            createAddress({ label, password });
          }}
          disabled={isCreating}
          className="btn-gold shrink-0 w-full md:w-auto py-4 h-10 text-sm font-black tracking-widest"
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
              <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4">
                <div className="flex items-start gap-3 w-full">
                  <KeyRound className={`w-5 h-5 mt-1 shrink-0 ${addr.isPrimary ? 'text-accent' : 'text-primary'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-heading text-sm text-white truncate max-w-[200px]" data-testid={`text-address-label-${addr.id}`}>{addr.label}</span>
                      {addr.isPrimary && <span className="text-[10px] px-2 py-0.5 bg-accent/20 text-accent border border-accent/30 rounded-sm font-mono">PRIMARY</span>}
                      {addr.isLocked && <span className="text-[10px] px-2 py-0.5 bg-destructive/20 text-destructive border border-destructive/30 rounded-sm font-mono">LOCKED</span>}
                    </div>
                    <div className="flex items-center gap-2 mt-1 w-full">
                      <span className="font-mono text-sm md:text-base text-muted-foreground truncate flex-1 min-w-0" data-testid={`text-address-value-${addr.id}`}>
                        {addr.address}
                      </span>
                      <button
                        onClick={() => copyToClipboard(addr.address, `addr-${addr.id}`)}
                        className="text-muted-foreground hover:text-primary transition-colors shrink-0 p-1"
                        data-testid={`button-copy-address-${addr.id}`}
                      >
                        {copied === `addr-${addr.id}` ? <Check className="w-3 h-3 text-accent" /> : <Copy className="w-3 h-3" />}
                      </button>
                    </div>
                    <div className="flex items-center gap-2 mt-4 flex-wrap">
                      <Button variant="outline" size="sm" onClick={() => handleReveal(addr.id)} disabled={addr.isLocked} className="font-mono text-[10px] md:text-xs h-8">
                        {revealedPhrase?.id === addr.id ? <EyeOff className="w-3 h-3 mr-1" /> : <Eye className="w-3 h-3 mr-1" />}
                        {revealedPhrase?.id === addr.id ? "HIDE" : "SEED PHRASE"}
                      </Button>
                      {addr.isLocked ? (
                        <Button variant="outline" size="sm" onClick={() => unlockAddress(addr.id)} className="font-mono text-[10px] md:text-xs h-8">
                          <Unlock className="w-3 h-3 mr-1" /> UNLOCK
                        </Button>
                      ) : (
                        <Button variant="outline" size="sm" onClick={() => lockAddress(addr.id)} className="font-mono text-[10px] md:text-xs h-8">
                          <Lock className="w-3 h-3 mr-1" /> LOCK
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
                <div className="w-full xl:w-auto text-right shrink-0 bg-primary/5 px-4 py-2 rounded border border-primary/10 self-end xl:self-center">
                  <div className="text-[10px] text-muted-foreground font-mono font-bold uppercase tracking-tighter">BALANCE</div>
                  <div className="text-xl md:text-2xl font-mono text-accent font-black">
                    {Number(addr.balance || 0).toLocaleString(undefined, { minimumFractionDigits: 4 })}
                  </div>
                  <div className="text-[10px] text-primary font-mono font-bold">WD2</div>
                </div>
              </div>
              {revealedPhrase?.id === addr.id && (
                <div className="bg-background border border-accent/20 rounded-md p-4 space-y-3">
                  <div>
                    <div className="text-xs text-accent font-mono mb-1">SEED PHRASE (12 WORDS) - KEEP SECRET!</div>
                    <div className="bg-card p-3 rounded-md font-mono text-sm text-white border border-accent/10 flex items-center justify-between gap-2 flex-wrap">
                      <span className="break-all">{revealedPhrase!.mnemonic}</span>
                      <button onClick={() => copyToClipboard(revealedPhrase!.mnemonic, `phrase-${addr.id}`)} className="text-muted-foreground hover:text-accent transition-colors shrink-0">
                        {copied === `phrase-${addr.id}` ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CyberCard>
        ))}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <CyberCard title="WD2 ALIAS (IDENTITY)" className="h-full border-primary/30 bg-primary/5">
          <div className="flex flex-col h-full justify-between p-4">
            <div>
              <h3 className="text-2xl font-heading text-primary mb-1 font-black tracking-wider">SET YOUR ALIAS</h3>
              <p className="text-xs font-mono text-white/50 mb-4 italic">Create a custom Identity to hide your public address.</p>
              
              <div className="flex items-center justify-between mb-6 p-3 bg-black/40 rounded border border-primary/10">
                {user?.alias ? (
                  <div className="flex items-center gap-3">
                     <div className={`w-2 h-2 rounded-full ${user.isAliasActive ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500 opacity-50'}`} />
                     <span className="font-heading text-lg text-white font-black tracking-widest">
                        {user.alias}
                     </span>
                     <Button 
                        variant="outline" 
                        size="sm" 
                        onClick={toggleAliasActive} 
                        className={`text-[9px] font-mono h-6 transition-all duration-500 border-2 ${!user.isAliasActive ? 'bg-green-500/10 border-green-500 text-green-400 shadow-[0_0_15px_rgba(34,197,94,0.4)] hover:bg-green-500 hover:text-black' : 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)] hover:bg-red-500 hover:text-white'}`}
                     >
                        {user.isAliasActive ? 'DEACTIVATE' : 'ACTIVATE'}
                     </Button>
                  </div>
                ) : (
                  <span className="text-[10px] font-mono text-muted-foreground italic">No alias linked. Set one below.</span>
                )}
              </div>
            </div>
            <div className="mt-8 space-y-4">
               <div className="flex items-center gap-2">
                 <Input value={customAlias} onChange={(e) => setCustomAlias(e.target.value)} placeholder="Sample@WEBD2" className="font-mono bg-black/60 border-primary/30 h-10 text-base" />
                 <Button onClick={saveAlias} disabled={isSavingAlias} className="h-10 btn-neon font-mono text-xs px-4">
                   {isSavingAlias ? <Loader2 className="w-4 h-4 animate-spin" /> : "SAVE"}
                 </Button>
               </div>
            </div>
          </div>
        </CyberCard>
        <CyberCard title="SEND WD2" className="border-accent/20">
          <div className="space-y-6">
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70">RECIPIENT ADDRESS OR ALIAS</label>
              <Input value={recipient} onChange={(e) => setRecipient(e.target.value)} className="bg-input border-primary/30 font-mono py-8 text-lg" placeholder="Enter Address or @Alias..." />
            </div>
            <div className="space-y-4">
              <label className="text-sm font-mono text-primary font-bold uppercase tracking-wider">AMOUNT (WD2)</label>
              <Input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} className="bg-input border-primary/30 font-mono text-3xl py-10 text-accent font-black max-w-[280px]" placeholder="0.00" />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70 uppercase tracking-widest flex items-center gap-2">PASSWORD</label>
              <Input type="password" placeholder="Confirm your password" value={txPassword} onChange={(e) => setTxPassword(e.target.value)} className="bg-input border-primary/20 font-mono py-6" />
            </div>
            <Button className="w-full btn-neon" disabled={isTransferring || !amount || !recipient || !txPassword} onClick={handleTransfer}>
              {isTransferring ? <Loader2 className="w-4 h-4 animate-spin" /> : "EXECUTE WD2 TRANSFER"}
            </Button>
          </div>
        </CyberCard>
      </div>
      <TwoFactorSettings />
    </div>
  );
}
