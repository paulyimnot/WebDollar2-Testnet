import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowRight, Coins, Globe, Lock, ShieldCheck, Zap, CreditCard, Link2, Users, Blocks, ArrowRightLeft, Activity, Mail, Loader2, CheckCircle } from "lucide-react";
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CyberCard } from "@/components/CyberCard";
import { PriceTicker } from "@/components/PriceTicker";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

const TOKENOMICS_DATA = [
  { name: 'V1 Migration Reserve', value: 14.6, color: '#FFD54F' },
  { name: 'Public Mining & Staking', value: 43.2, color: '#FFC107' },
  { name: 'Developer Funds', value: 6.8, color: '#FFA000' },
  { name: 'Foundation Fund', value: 3.4, color: '#D4AF37' },
];

const FEATURES = [
  { icon: Globe, title: "Browser Native", desc: "No installs. Powered natively in your browser by WebAssembly & TypeScript." },
  { icon: Zap, title: "Deterministic Speed", desc: "Transactions confirmed with 5-second finality via the DIELBS consensus layer." },
  { icon: ShieldCheck, title: "Verified Security", desc: "Hardened secp256k1 signing with persistent database session persistence." },
  { icon: CreditCard, title: "Payment Card", desc: "Spend WEBD2 as fiat anywhere with the WebDollar 2 Card." },
];

export default function Home() {
  const { data: blockchainStatus } = useQuery({
    queryKey: ["/api/blockchain/status"],
    queryFn: async () => {
      const res = await fetch("/api/blockchain/status");
      if (!res.ok) return null;
      return await res.json();
    },
    refetchInterval: 60000,
  });

  const { data: networkStats } = useQuery({
    queryKey: ["/api/network/stats"],
    queryFn: async () => {
      const res = await fetch("/api/network/stats");
      if (!res.ok) return null;
      return await res.json();
    },
    refetchInterval: 30000,
  });

  const { toast } = useToast();
  const [email, setEmail] = useState("");

  const { data: waitlistStatus } = useQuery<{ joined: boolean; email?: string; position: number | null; totalCount: number }>({
    queryKey: ["/api/card/waitlist/status"],
  });

  const joinMutation = useMutation({
    mutationFn: async (email: string) => {
      const res = await apiRequest("POST", "/api/card/waitlist/join", { email });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/card/waitlist/status"] });
      toast({ title: "You're on the list!", description: "1,000 WEBD2 reward locked for launch day. We'll email you instructions!" });
      setEmail("");
    },
    onError: (err: any) => {
      toast({ title: "Error", description: err.message || "Failed to join waitlist", variant: "destructive" });
    },
  });

  return (
    <div className="flex flex-col min-h-screen">

      {/* HERO SECTION */}
      <section className="relative h-screen flex items-center justify-center overflow-hidden border-b border-primary/20">
        <div className="scanline"></div>
        <div className="absolute inset-0 bg-[linear-gradient(rgba(255,193,44,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,193,44,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-background"></div>

        <div className="container relative z-10 px-4 text-center pt-24 md:pt-32">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="flex flex-col items-center"
          >
            <img src={logoImg} alt="WDollar 2" className="w-56 h-56 sm:w-64 sm:h-64 md:w-64 md:h-64 lg:w-80 lg:h-80 rounded-full object-cover mb-8 animate-float drop-shadow-[0_0_60px_rgba(255,193,44,0.5)]" />

            <h1 className="text-4xl sm:text-7xl md:text-8xl font-black font-heading tracking-tight mb-8 leading-[0.9] text-center w-full px-2" data-testid="text-home-title">
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-accent via-yellow-400 to-accent/60 drop-shadow-[0_0:15px_rgba(255,193,44,0.5)]">W</span>
              <span className="text-transparent bg-clip-text bg-gradient-to-b from-white to-white/60">DOLLAR</span>
              <span className="text-primary text-4xl sm:text-5xl md:text-5xl ml-2">2</span>
            </h1>
            <p className="text-lg sm:text-xl md:text-2xl font-mono text-primary/90 mb-6 max-w-4xl mx-auto px-6 font-bold uppercase tracking-tighter" data-testid="text-tagline">
              CURRENCY OF THE INTERNET
            </p>

            {/* EARLY ACCESS CARD PROMO */}
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mb-12 w-full max-w-2xl mx-auto group"
            >
              <div className="relative p-[2px] rounded-xl bg-gradient-to-r from-accent via-yellow-400 to-accent animate-gradient shadow-[0_0_30px_rgba(255,193,44,0.2)]">
                <div className="bg-background/95 backdrop-blur-xl rounded-xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="flex-1 text-left">
                    <div className="flex items-center gap-2 mb-2">
                      <CreditCard className="w-6 h-6 text-accent animate-pulse" />
                      <span className="text-xs font-heading text-accent font-black tracking-widest uppercase">EARLY ACCESS CARD</span>
                    </div>
                    <h3 className="text-2xl font-black text-white italic tracking-tighter mb-1">BE ONE OF THE FIRST 1,000</h3>
                    <p className="text-sm font-mono text-primary/70">Receive <span className="text-accent font-bold">1,000 WEBD2</span> on Mainnet Launch day. Instructions will be emailed to you.</p>
                  </div>
                  
                  <div className="flex-1 w-full max-w-sm">
                    {waitlistStatus?.joined ? (
                      <div className="flex items-center gap-3 bg-green-500/10 border border-green-500/30 px-6 py-4 rounded-lg w-full">
                        <CheckCircle className="w-5 h-5 text-green-400 shrink-0" />
                        <div className="flex flex-col">
                           <span className="text-[10px] font-heading text-green-400 uppercase tracking-widest font-black">REWARD SECURED</span>
                           <span className="text-xs font-mono text-white/70">Waitlist Position: #{waitlistStatus.position?.toLocaleString()}</span>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col sm:flex-row gap-2">
                        <div className="relative flex-1">
                          <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                          <Input
                            type="email"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            placeholder="Email address..."
                            className="h-14 pl-10 bg-black/40 border-primary/20 font-mono text-sm focus:border-accent/50"
                          />
                        </div>
                        <Button 
                          onClick={() => joinMutation.mutate(email)}
                          disabled={joinMutation.isPending || !email.includes("@")}
                          className="h-14 btn-gold px-6 font-black uppercase tracking-widest text-[10px] shrink-0"
                        >
                          {joinMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "SECURE REWARD"}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>

            <p className="text-sm sm:text-lg md:text-lg text-muted-foreground mb-12 max-w-4xl mx-auto px-6 font-normal opacity-80 leading-relaxed">
                First-of-its-kind, browser-native blockchain utilizing the high-throughput DIELBS consensus engine. 
                Secured by ed25519/secp256k1 signatures with 5-second deterministic finality and native WebAssembly validation. 
                Mass adoption through absolute decentralization and zero-installation infrastructure.
            </p>

            <div className="flex flex-col items-center gap-4 mt-8">
              {blockchainStatus?.connected && (
                <div className="flex items-center justify-center gap-4 bg-card/50 border border-green-500/20 rounded-md px-6 py-3 mx-auto w-fit shadow-[0_0_20px_rgba(34,197,94,0.1)]" data-testid="text-home-blockchain-status">
                  <div className="w-3 h-3 rounded-full bg-green-400 animate-pulse" />
                  <span className="text-sm font-mono text-green-400/80 uppercase tracking-widest font-bold">DIELBS ACTIVE</span>
                  <span className="text-sm font-mono text-muted-foreground font-black">Block #{blockchainStatus.blockNumber?.toLocaleString()}</span>
                </div>
              )}

              <div className="flex items-center justify-center gap-4 bg-red-900/20 border border-red-500/30 rounded-full px-8 py-3 mx-auto w-fit backdrop-blur-sm animate-pulse mt-4">
                <ShieldCheck className="w-5 h-5 text-red-500" />
                <span className="text-sm font-mono text-red-400 font-black uppercase tracking-[0.2em]">Public Stress Testnet 1.0 - LIVE</span>
              </div>
            </div>

            <div className="mb-6 bg-card/30 border border-primary/10 rounded-md px-4 py-1.5 mx-auto w-fit">
              <PriceTicker />
            </div>

          </motion.div>
        </div>
      </section>

      {/* NETWORK STATS */}
      {networkStats && (
        <section className="py-12 border-b border-primary/10">
          <div className="container mx-auto px-4">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="grid grid-cols-2 md:grid-cols-5 gap-3 md:gap-8"
            >
              <div className="bg-card/50 border border-primary/10 rounded-md p-6 text-center" data-testid="stat-connected">
                <Globe className="w-8 h-8 text-green-400 mx-auto mb-3 animate-pulse" />
                <div className="text-xl md:text-3xl font-mono text-white font-black leading-tight">{networkStats.connectedPeers || 0}</div>
                <div className="text-xs font-mono text-green-400/80 mt-2 font-bold uppercase tracking-widest">PEERS CONNECTED</div>
              </div>
              <div className="bg-card/50 border border-primary/10 rounded-md p-6 text-center" data-testid="stat-wallets">
                <Users className="w-8 h-8 text-accent mx-auto mb-3" />
                <div className="text-xl md:text-3xl font-mono text-white font-black leading-tight">{networkStats.totalUsers.toLocaleString()}</div>
                <div className="text-xs font-mono text-muted-foreground mt-2 font-bold uppercase tracking-widest">ACTIVE WALLETS</div>
              </div>
              <div className="bg-card/50 border border-primary/10 rounded-md p-6 text-center" data-testid="stat-blocks">
                <Blocks className="w-8 h-8 text-primary mx-auto mb-3" />
                <div className="text-xl md:text-3xl font-mono text-white font-black leading-tight">{networkStats.totalBlocks.toLocaleString()}</div>
                <div className="text-xs font-mono text-muted-foreground mt-2 font-bold uppercase tracking-widest">BLOCKS MINED</div>
              </div>
              <div className="bg-card/50 border border-primary/10 rounded-md p-4 text-center" data-testid="stat-transactions">
                <ArrowRightLeft className="w-6 h-6 text-accent mx-auto mb-2" />
                <div className="text-lg md:text-3xl font-mono text-white font-bold">{networkStats.totalTransactions.toLocaleString()}</div>
                <div className="text-xs font-mono text-muted-foreground mt-1">TRANSACTIONS</div>
              </div>
              <div className="bg-card/50 border border-primary/10 rounded-md p-4 text-center" data-testid="stat-supply">
                <Activity className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-lg md:text-xl font-mono text-accent font-bold">
                  {(parseFloat(networkStats.circulatingSupply) / 1e9).toFixed(1)}B
                </div>
                <div className="text-xs font-mono text-muted-foreground mt-1">CIRCULATING WEBD2</div>
                {networkStats.latestBlockTime && (
                  <div className="text-[10px] font-mono text-primary/50 mt-1">
                    Last block {formatDistanceToNow(new Date(networkStats.latestBlockTime), { addSuffix: true })}
                  </div>
                )}
              </div>
            </motion.div>
          </div>
        </section>
      )}

      {/* TOKENOMICS SECTION */}
      <section className="py-24 bg-card/50">
        <div className="container mx-auto px-4">
          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <motion.div
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
              className="space-y-6"
            >
              <h2 className="text-4xl font-heading text-accent mb-4">TOKENOMICS</h2>
              <p className="font-mono text-muted-foreground leading-relaxed">
                WDollar 2 introduces a total capped supply of 68 Billion WEBD2, designed to sustain public mining emissions for 100 years.
                The Migration Reserve is strictly allocated for active claims, effectively burning unverified V1 developer funds.
              </p>

              <div className="space-y-4 font-mono text-sm">
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>TOTAL SUPPLY</span>
                  <span className="text-accent font-bold">68,000,000,000 WEBD2</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>V1 MIGRATION RESERVE</span>
                  <span className="text-primary font-bold">14,600,000,000 WEBD2</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>PUBLIC MINING CACHE</span>
                  <span className="text-accent font-bold">43,200,000,000 WEBD2</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>DEVELOPER RESERVE (10%)</span>
                  <span className="text-primary/70">6,800,000,000 WEBD2</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>FOUNDATION FUND (5%)</span>
                  <span className="text-primary/70">3,400,000,000 WEBD2</span>
                </div>
                <div className="flex justify-between flex-wrap gap-1 border-b border-primary/20 py-2">
                  <span>OLD DEV FUNDS (BLOCKED)</span>
                  <span className="text-red-400">BURNED</span>
                </div>
                <div className="mt-4 pt-2 text-xs text-muted-foreground italic border-l-2 border-primary/50 pl-4 bg-primary/5 p-2 rounded-sm">
                  * Note: Emission halving occurs every 3 years. Initial block reward is 1,150 WEBD2 with an execution block time of 5 seconds. V1 migration has a strict active-claim deadline.
                </div>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="h-[400px] cyber-container flex items-center justify-center"
            >
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={TOKENOMICS_DATA}
                    cx="50%"
                    cy="50%"
                    innerRadius={80}
                    outerRadius={140}
                    paddingAngle={5}
                    dataKey="value"
                    stroke="none"
                  >
                    {TOKENOMICS_DATA.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(214, 50%, 9%)', borderColor: '#ffc12c', fontFamily: 'Fira Code', borderRadius: '6px' }}
                    itemStyle={{ color: '#fcd26c' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </motion.div>
          </div>
        </div>
      </section>

      {/* FEATURES GRID */}
      <section className="py-24 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-1/3 h-full bg-primary/5 -skew-x-12 z-0 pointer-events-none"></div>
        <div className="container mx-auto px-4 relative z-10">
          <h2 className="text-4xl font-heading text-center mb-16 text-glow">CORE FEATURES</h2>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {FEATURES.map((feature, idx) => (
              <CyberCard key={idx} className="hover:-translate-y-2 transition-transform p-8">
                <feature.icon className="w-16 h-16 text-accent mb-6" />
                <h3 className="text-2xl font-black mb-3 text-white">{feature.title}</h3>
                <p className="text-base font-mono text-muted-foreground leading-relaxed">{feature.desc}</p>
              </CyberCard>
            ))}
          </div>
        </div>
      </section>

      {/* ROADMAP */}
      <section className="py-24 bg-card/50 border-t border-primary/20">
        <div className="container mx-auto px-4">
          <h2 className="text-4xl font-heading mb-12 text-accent">ROADMAP</h2>

          <div className="grid md:grid-cols-3 gap-8">
            <CyberCard title="PHASE 01">
              <h3 className="text-xl font-bold text-white mb-2 italic">STRESS TEST</h3>
              <ul className="list-disc list-inside font-mono text-sm space-y-2 text-primary/80">
                <li>WebDollar 2 Testnet Stress-test</li>
                <li>Ecosystem App Interface</li>
                <li>P2P Transaction Sprints</li>
                <li>Economic Vulnerability Sweep</li>
              </ul>
            </CyberCard>

            <CyberCard title="PHASE 02" className="opacity-80">
              <h3 className="text-xl font-bold text-white mb-2">MIGRATION</h3>
              <ul className="list-disc list-inside font-mono text-sm space-y-2 text-muted-foreground">
                <li>1:1 Token Swap (1M Cap)</li>
                <li>500K/6mo Vesting</li>
                <li>Old Dev Wallet Blocking</li>
                <li>Exchange Listing</li>
              </ul>
            </CyberCard>

            <CyberCard title="PHASE 03" className="opacity-60">
              <h3 className="text-xl font-bold text-white mb-2">EXPANSION</h3>
              <ul className="list-disc list-inside font-mono text-sm space-y-2 text-muted-foreground">
                <li>Payment Card (Crypto to Fiat)</li>
                <li>Mobile Apps</li>
                <li>Merchant API</li>
                <li>Smart Contracts</li>
              </ul>
            </CyberCard>
          </div>
        </div>
      </section>

    </div>
  );
}
