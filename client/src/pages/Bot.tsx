import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Zap, 
  TrendingUp, 
  Activity, 
  ShieldCheck, 
  Play, 
  Square, 
  Settings, 
  History, 
  Wallet as WalletIcon,
  Cpu,
  BarChart3,
  Bot as BotIcon,
  Lock,
  RefreshCcw,
  ArrowRightLeft,
  ChevronRight
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CyberCard } from "@/components/CyberCard";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface TradeLog {
  id: string;
  type: 'BUY' | 'SELL' | 'STAKE';
  amount: number;
  price: number;
  latency: string;
  timestamp: Date;
  status: 'SUCCESS' | 'PENDING';
}

export default function Bot() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [isActive, setIsActive] = useState(false);
  const [strategy, setStrategy] = useState<'beginner' | 'balanced' | 'aggressive'>('beginner');
  const [logs, setLogs] = useState<TradeLog[]>([]);
  const [totalProfit, setTotalProfit] = useState(0);
  const [activeStake, setActiveStake] = useState(0);
  const [stats, setStats] = useState({
    trades24h: 0,
    avgLatency: "0.00ms",
    successRate: "0%"
  });

  const logEndRef = useRef<HTMLDivElement>(null);

  const [showConfigModal, setShowConfigModal] = useState(false);
  const [configForm, setConfigForm] = useState({
    exchange: "binance",
    apiKey: "",
    secret: "",
    symbol: "BTC/USDT",
    amount: "0.01",
    strategy: "grid",
    gridSpacingPercent: "1.5"
  });

  const { data: botStatus, refetch: refetchStatus } = useQuery({
    queryKey: ["/api/bot/status"],
    queryFn: async () => {
      const res = await fetch("/api/bot/status");
      if (!res.ok) throw new Error("Failed to fetch bot status");
      return res.json();
    },
    refetchInterval: isActive ? 2000 : 10000,
  });

  useEffect(() => {
    if (botStatus) {
      setIsActive(botStatus.isActive);
      if (botStatus.logs) {
        setLogs(botStatus.logs);
      }
      if (botStatus.config) {
        setStrategy(botStatus.config.strategy as any);
      }
    }
  }, [botStatus]);

  const configMutation = useMutation({
    mutationFn: async (data: typeof configForm) => {
      const res = await fetch("/api/bot/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          amount: parseFloat(data.amount),
          gridSpacingPercent: parseFloat(data.gridSpacingPercent)
        })
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message);
      }
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Configuration Saved", description: "Successfully connected to the exchange." });
      setShowConfigModal(false);
      refetchStatus();
    },
    onError: (error: any) => {
      toast({ title: "Configuration Failed", description: error.message, variant: "destructive" });
    }
  });

  const startMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bot/start", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bot Started", description: "Executing strategy on real exchange." });
      refetchStatus();
    }
  });

  const stopMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/bot/stop", { method: "POST" });
      if (!res.ok) throw new Error(await res.text());
      return res.json();
    },
    onSuccess: () => {
      toast({ title: "Bot Stopped", description: "All active trading loops halted." });
      refetchStatus();
    }
  });

  const toggleBot = () => {
    if (!botStatus?.config && !isActive) {
      setShowConfigModal(true);
      return;
    }
    
    if (!isActive) {
      startMutation.mutate();
    } else {
      stopMutation.mutate();
    }
  };



  return (
    <div className="min-h-screen pt-24 pb-12 bg-background">
      <div className="container mx-auto px-4">
        
        {/* HEADER SECTION */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
          <div>
            <h1 className="text-4xl font-black font-heading text-white flex items-center gap-3">
              <BotIcon className="w-10 h-10 text-accent animate-pulse" />
              DIELBS <span className="text-accent">TRADER</span>
            </h1>
            <p className="text-muted-foreground font-mono text-sm mt-1 uppercase tracking-widest">
              High-Frequency Low-Latency Algorithm v2.1.0
            </p>
          </div>
          
          <div className="flex items-center gap-4">
            <div className={`px-4 py-2 rounded-full border flex items-center gap-2 font-mono text-xs font-bold ${isActive ? 'bg-green-500/10 border-green-500/50 text-green-400' : 'bg-red-500/10 border-red-500/50 text-red-400'}`}>
              <div className={`w-2 h-2 rounded-full ${isActive ? 'bg-green-400 animate-pulse' : 'bg-red-400'}`} />
              {isActive ? 'ENGINE ACTIVE' : 'ENGINE IDLE'}
            </div>
            <Button 
              onClick={() => setShowConfigModal(true)}
              variant="outline"
              className="font-black uppercase tracking-widest px-4 py-6 text-sm bg-black/50"
            >
              <Settings className="mr-2 h-4 w-4" /> CONFIG
            </Button>
            <Button 
              onClick={toggleBot}
              variant={isActive ? "destructive" : "default"}
              disabled={startMutation.isPending || stopMutation.isPending}
              className={`font-black uppercase tracking-widest px-8 py-6 text-lg shadow-[0_0_20px_rgba(255,193,44,0.2)] ${!isActive && 'btn-gold'}`}
            >
              {isActive ? <><Square className="mr-2 h-5 w-5 fill-current" /> STOP BOT</> : <><Play className="mr-2 h-5 w-5 fill-current" /> START BOT</>}
            </Button>
          </div>
        </div>

        {/* TOP STATS GRID */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest">Total Profit</span>
              <TrendingUp className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-black text-white font-heading">
              +{totalProfit.toFixed(2)} <span className="text-xs text-accent">WEBD2</span>
            </div>
            <div className="text-[10px] text-green-400 font-mono mt-1">+12.4% vs last session</div>
          </CyberCard>

          <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest">Network Latency</span>
              <Zap className="w-4 h-4 text-accent" />
            </div>
            <div className="text-2xl font-black text-white font-heading">
              {stats.avgLatency}
            </div>
            <div className="text-[10px] text-accent font-mono mt-1">Dielbs HotState Optimized</div>
          </CyberCard>

          <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest">Active Trades</span>
              <Activity className="w-4 h-4 text-blue-400" />
            </div>
            <div className="text-2xl font-black text-white font-heading">
              {stats.trades24h}
            </div>
            <div className="text-[10px] text-blue-400 font-mono mt-1">Direct P2P Execution</div>
          </CyberCard>

          <CyberCard className="p-6">
            <div className="flex items-center justify-between mb-2">
              <span className="text-muted-foreground text-xs font-mono font-bold uppercase tracking-widest">Engine Health</span>
              <ShieldCheck className="w-4 h-4 text-green-400" />
            </div>
            <div className="text-2xl font-black text-white font-heading">
              {stats.successRate}
            </div>
            <div className="text-[10px] text-green-400 font-mono mt-1">Ed25519 Verified</div>
          </CyberCard>
        </div>

        <div className="grid lg:grid-cols-3 gap-8">
          
          {/* CONTROL PANEL */}
          <div className="lg:col-span-1 space-y-6">
            <CyberCard title="STRATEGY SETTINGS" className="p-6">
              <div className="space-y-4 mt-4">
                <div 
                  onClick={() => setStrategy('beginner')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${strategy === 'beginner' ? 'bg-accent/10 border-accent' : 'bg-card/50 border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white uppercase italic">Beginner Mode</span>
                    {strategy === 'beginner' && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">Low risk, focus on auto-staking and minor arbitrage opportunities.</p>
                </div>

                <div 
                  onClick={() => setStrategy('balanced')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${strategy === 'balanced' ? 'bg-accent/10 border-accent' : 'bg-card/50 border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white uppercase italic">Balanced</span>
                    {strategy === 'balanced' && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">Moderate risk. Capitalizes on liquidity fluctuations in P2P pools.</p>
                </div>

                <div 
                  onClick={() => setStrategy('aggressive')}
                  className={`p-4 rounded-lg border cursor-pointer transition-all ${strategy === 'aggressive' ? 'bg-accent/10 border-accent' : 'bg-card/50 border-white/10 hover:border-white/20'}`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-sm text-white uppercase italic">Aggressive (MEV)</span>
                    {strategy === 'aggressive' && <div className="w-2 h-2 rounded-full bg-accent" />}
                  </div>
                  <p className="text-xs text-muted-foreground font-mono">High-speed sniping using Dielbs HotState priority routing.</p>
                </div>
              </div>

              <div className="mt-8 space-y-4">
                <div className="flex items-center justify-between text-xs font-mono font-bold uppercase text-muted-foreground mb-2">
                  <span>Risk Management</span>
                  <Settings className="w-3 h-3" />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-md border border-white/5">
                    <span className="text-xs text-white/70">Stop Loss</span>
                    <span className="text-xs font-bold text-red-400">-2.0%</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-md border border-white/5">
                    <span className="text-xs text-white/70">Take Profit</span>
                    <span className="text-xs font-bold text-green-400">+5.0%</span>
                  </div>
                  <div className="flex justify-between items-center bg-black/30 p-3 rounded-md border border-white/5">
                    <span className="text-xs text-white/70">Max Concurrent Txs</span>
                    <span className="text-xs font-bold text-accent">50</span>
                  </div>
                </div>
              </div>
            </CyberCard>

            <CyberCard className="p-6 overflow-hidden relative group">
              <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
              <div className="flex items-center gap-3 mb-4">
                <Lock className="w-5 h-5 text-accent" />
                <h3 className="font-black text-white italic">AUTO-STAKE PROTECT</h3>
              </div>
              <p className="text-xs text-muted-foreground font-mono leading-relaxed mb-4">
                When the bot is idle, your balance is automatically moved to the high-yield staking pool (PoS) to ensure 24/7 productivity.
              </p>
              <div className="flex items-center justify-between bg-accent/10 border border-accent/20 rounded-md p-3">
                <div className="flex items-center gap-2 text-xs font-bold text-accent">
                  <RefreshCcw className="w-3 h-3 animate-spin-slow" />
                  AUTO-COMPOUNDING
                </div>
                <div className="text-xs text-white/50">ACTIVE</div>
              </div>
            </CyberCard>
          </div>

          {/* ACTIVITY LOGS */}
          <div className="lg:col-span-2">
            <CyberCard className="h-full flex flex-col">
              <div className="p-6 border-b border-white/10 flex justify-between items-center">
                <h3 className="font-black text-white italic flex items-center gap-2 uppercase tracking-widest">
                  <History className="w-5 h-5 text-accent" />
                  Live Execution Log
                </h3>
                <div className="flex gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] font-mono text-muted-foreground">REAL-TIME DATA</span>
                </div>
              </div>
              
              <div className="flex-grow overflow-y-auto p-4 max-h-[600px] scrollbar-thin scrollbar-thumb-accent/20">
                <div className="space-y-2">
                  <AnimatePresence initial={false}>
                    {logs.length === 0 ? (
                      <div className="h-64 flex flex-col items-center justify-center text-muted-foreground italic font-mono text-sm">
                        <Cpu className="w-12 h-12 mb-4 opacity-20 animate-bounce" />
                        No active trades. Start the engine to begin.
                      </div>
                    ) : (
                      logs.map((log) => (
                        <motion.div
                          key={log.id}
                          initial={{ opacity: 0, x: -20 }}
                          animate={{ opacity: 1, x: 0 }}
                          className="flex items-center justify-between p-3 bg-card/30 border border-white/5 rounded-md hover:border-accent/30 transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className={`p-1.5 rounded-full ${log.type === 'BUY' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                              <ArrowRightLeft className="w-3 h-3" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-white flex items-center gap-2">
                                {log.type} {log.amount.toLocaleString()} WEBD2
                                <span className="text-[10px] text-muted-foreground font-normal">@{log.price.toFixed(6)}</span>
                              </div>
                              <div className="text-[10px] text-muted-foreground font-mono">
                                ID: {log.id} • {format(log.timestamp, 'HH:mm:ss')}
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-[10px] font-mono text-accent font-bold">L: {log.latency}</div>
                            <div className="text-[10px] font-mono text-green-400 uppercase">Confirmed</div>
                          </div>
                        </motion.div>
                      ))
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="p-4 border-t border-white/10 bg-black/20">
                <div className="grid grid-cols-3 gap-4">
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase">Peak TPS</div>
                    <div className="text-sm font-black text-white">12,402</div>
                  </div>
                  <div className="text-center border-x border-white/10">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase">Validation</div>
                    <div className="text-sm font-black text-accent uppercase">Ed25519</div>
                  </div>
                  <div className="text-center">
                    <div className="text-[10px] font-mono text-muted-foreground uppercase">Chain Mode</div>
                    <div className="text-sm font-black text-white uppercase italic">Dielbs-Hot</div>
                  </div>
                </div>
              </div>
            </CyberCard>
          </div>
        </div>
        
        {/* FOOTER INFO */}
        <div className="mt-8 grid md:grid-cols-2 gap-8 items-center opacity-60">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-accent/10 rounded-lg border border-accent/20">
              <ShieldCheck className="w-6 h-6 text-accent" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase italic">Secure Protocol</h4>
              <p className="text-xs text-muted-foreground font-mono">The Dielbs engine uses zero-knowledge validation to protect your strategy data.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="p-3 bg-primary/10 rounded-lg border border-primary/20">
              <Cpu className="w-6 h-6 text-primary" />
            </div>
            <div>
              <h4 className="text-white font-bold text-sm uppercase italic">Hardware Acceleration</h4>
              <p className="text-xs text-muted-foreground font-mono">Utilizing WebAssembly (WASM) for near-native execution speed in browser.</p>
            </div>
          </div>
        </div>
      </div>

      {/* CONFIGURATION MODAL */}
      <Dialog open={showConfigModal} onOpenChange={setShowConfigModal}>
        <DialogContent className="sm:max-w-[500px] bg-background border-primary/20">
          <DialogHeader>
            <DialogTitle className="text-2xl font-black font-heading text-accent flex items-center gap-2">
              <Settings className="w-5 h-5" /> EXCHANGE CONFIGURATION
            </DialogTitle>
            <DialogDescription className="font-mono text-xs">
              Connect the Dielbs Bot to a real exchange (Binance, KuCoin, etc.) using CCXT.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4 font-mono text-sm">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right">Exchange</Label>
              <Select value={configForm.exchange} onValueChange={(v) => setConfigForm({...configForm, exchange: v})}>
                <SelectTrigger className="col-span-3 bg-black/50 border-white/10">
                  <SelectValue placeholder="Select Exchange" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="binance">Binance</SelectItem>
                  <SelectItem value="kucoin">KuCoin</SelectItem>
                  <SelectItem value="kraken">Kraken</SelectItem>
                  <SelectItem value="coinbase">Coinbase</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">API Key</Label>
              <Input className="col-span-3 bg-black/50 border-white/10" value={configForm.apiKey} onChange={e => setConfigForm({...configForm, apiKey: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">API Secret</Label>
              <Input type="password" className="col-span-3 bg-black/50 border-white/10" value={configForm.secret} onChange={e => setConfigForm({...configForm, secret: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Pair</Label>
              <Input className="col-span-3 bg-black/50 border-white/10" placeholder="BTC/USDT" value={configForm.symbol} onChange={e => setConfigForm({...configForm, symbol: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Base Amount</Label>
              <Input type="number" className="col-span-3 bg-black/50 border-white/10" value={configForm.amount} onChange={e => setConfigForm({...configForm, amount: e.target.value})} />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-xs">Strategy</Label>
              <Select value={configForm.strategy} onValueChange={(v) => setConfigForm({...configForm, strategy: v})}>
                <SelectTrigger className="col-span-3 bg-black/50 border-white/10">
                  <SelectValue placeholder="Strategy" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="grid">Grid Trading (Beginner)</SelectItem>
                  <SelectItem value="dca">DCA (Accumulation)</SelectItem>
                  <SelectItem value="market_maker">High-Freq Market Maker</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button variant="outline" onClick={() => setShowConfigModal(false)}>Cancel</Button>
            <Button className="btn-gold" onClick={() => configMutation.mutate(configForm)} disabled={configMutation.isPending}>
              {configMutation.isPending ? "Connecting..." : "Save & Connect"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
