import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useStaking } from "@/hooks/use-staking";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Coins, Loader2, ArrowUpRight, ArrowDownLeft, Gem, TrendingUp, Lock, Info, Timer, RefreshCw } from "lucide-react";
import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { formatDistanceToNow } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

export default function Miner() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const {
    stakingInfo, networkStats, isLoadingInfo,
    stake, unstake,
    isStaking, isUnstaking,
  } = useStaking();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Performance data for chart
  const { data: myTransactions } = useQuery({
    queryKey: [api.transactions.mine.path],
    queryFn: async () => {
      const res = await fetch(api.transactions.mine.path);
      if (!res.ok) return [];
      return await res.json();
    },
    refetchInterval: 10000,
  });

  const performanceData = (myTransactions || []).filter((tx: any) => tx.type === "staking_reward").slice(0, 7).reverse().map((tx: any, idx: number) => ({
    name: `Slot ${idx + 1}`,
    reward: parseFloat(tx.amount || "0"),
  }));

  if (performanceData.length === 0) {
    performanceData.push({ name: 'IDLE', reward: 0 });
  }

  const [stakeAmount, setStakeAmount] = useState("");
  const [changeAmount, setChangeAmount] = useState("");
  const [showChangeAmount, setShowChangeAmount] = useState(false);
  const [holdCountdown, setHoldCountdown] = useState("");

  useEffect(() => {
    if (!user) {
      setLocation("/auth");
    }
  }, [user, setLocation]);

  // 7-day hold countdown timer
  useEffect(() => {
    if (!stakingInfo?.isOnHold || !stakingInfo?.holdRemainingMs) {
      setHoldCountdown("");
      return;
    }

    const updateCountdown = () => {
      const remaining = Math.max(0, stakingInfo.holdRemainingMs - (Date.now() - Date.now()));
      // We recalculate based on the server-provided remaining time minus elapsed since last fetch
      const ms = stakingInfo.holdRemainingMs;
      if (ms <= 0) {
        setHoldCountdown("RELEASING...");
        return;
      }
      const days = Math.floor(ms / (1000 * 60 * 60 * 24));
      const hours = Math.floor((ms % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((ms % (1000 * 60)) / 1000);
      setHoldCountdown(`${days}d ${hours}h ${minutes}m ${seconds}s`);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [stakingInfo?.isOnHold, stakingInfo?.holdRemainingMs]);

  const handleStake = () => {
    if (!stakeAmount) return;
    stake(stakeAmount);
    setStakeAmount("");
  };

  const handleStop = () => {
    // Call unstake with no amount — backend handles full stop
    unstake("0");
  };

  const changeAmountMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await fetch("/api/staking/change-amount", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Change failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.staking.info.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      setChangeAmount("");
      setShowChangeAmount(false);
      toast({ title: "AMOUNT CHANGED", description: data.message, className: "border-primary text-primary bg-black font-mono" });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleChangeAmount = () => {
    if (!changeAmount) return;
    changeAmountMutation.mutate(changeAmount);
  };

  const stakedNum = parseFloat(stakingInfo?.stakedBalance || "0");
  const apyNum = stakingInfo?.apy || 0;
  const totalNetworkStakedNum = parseFloat(stakingInfo?.totalNetworkStaked || "0");
  const totalRewardsEarned = parseFloat(stakingInfo?.totalRewardsEarned || "0");
  const isOnHold = stakingInfo?.isOnHold || false;
  const isMiningActive = stakedNum > 0 && !isOnHold;

  return (
    <div className="container mx-auto px-4 py-8 space-y-8">

      <div className="border-b-2 border-primary/30 pb-8">
        <h1 className="text-4xl md:text-5xl font-heading text-white border-b border-accent/20 pb-2 w-fit mb-4" data-testid="text-miner-title">WD2 MINER</h1>
        <div className="flex flex-wrap items-center gap-3 mt-2">
          <p className="font-mono text-white/80 text-lg leading-relaxed">
            Stake your WEBD2 tokens to fuel the network and earn <strong className="text-accent underline decoration-accent/30 font-black">passive mining rewards</strong>.
            Rewards are automatically added to your balance.
          </p>
          <div className="bg-primary/10 border border-primary/20 rounded px-3 py-1 flex items-center gap-2">
            <span className="text-[10px] font-black text-primary/60 uppercase tracking-tighter">OPERATOR:</span>
            <span className="text-xs font-mono text-accent font-bold uppercase">{(stakingInfo as any)?.username || "GUEST"}</span>
            <div className="w-[1px] h-3 bg-primary/20" />
            <span className="text-[10px] font-mono text-primary/40">{(stakingInfo as any)?.walletAddress?.substring(0, 8)}...</span>
          </div>
        </div>
      </div>

      <CyberCard title="PoS MINING" className="flex flex-col">
        {/* === PERFORMANCE CHART === */}
        <div className="h-48 w-full mb-8 bg-black/20 rounded-lg border border-primary/10 p-4">
          <div className="text-[10px] tracking-widest text-primary/60 font-black uppercase mb-4 flex justify-between">
            <span>CONSENSUS PARTICIPATION PERFORMANCE</span>
            <span className="text-accent animate-pulse">LIVE FEED</span>
          </div>
          <ResponsiveContainer width="100%" height="80%">
            <AreaChart data={performanceData}>
              <defs>
                <linearGradient id="colorReward" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FFC107" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#FFC107" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,193,44,0.05)" vertical={false} />
              <Tooltip 
                contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid #FFC107', borderRadius: '4px', fontSize: '10px' }}
                itemStyle={{ color: '#FFC107' }}
              />
              <Area type="monotone" dataKey="reward" stroke="#FFC107" fillOpacity={1} fill="url(#colorReward)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
        {/* === STATS ROW === */}
        {/* === STATS GRID === */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <div className="bg-background/40 p-4 border border-primary/20 rounded-lg backdrop-blur-sm">
            <div className="text-[10px] tracking-widest text-primary/60 font-black uppercase mb-1">MINING STAKE</div>
            <div className="flex items-center gap-2 overflow-hidden">
              <div className="text-2xl font-mono text-white truncate" data-testid="text-staked-balance">
                {stakedNum > 0 ? stakedNum.toLocaleString(undefined, { maximumFractionDigits: 2 }) : "0"}
              </div>
              {isMiningActive && (
                <span className="text-[9px] bg-green-500/20 text-green-400 px-1.5 py-0.5 rounded border border-green-500/30 font-mono uppercase animate-pulse">ACTIVE</span>
              )}
              {isOnHold && (
                <span className="text-[9px] bg-red-500/20 text-red-400 px-1.5 py-0.5 rounded border border-red-500/30 font-mono uppercase">ON HOLD</span>
              )}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Staked WEBD2</div>
          </div>

          <div className="bg-background/40 p-4 border border-primary/20 rounded-lg backdrop-blur-sm">
            <div className="text-[10px] tracking-widest text-primary/60 font-black uppercase mb-1">TOTAL REWARDS</div>
            <div className="text-2xl font-mono text-accent truncate" data-testid="text-total-rewards">
              {totalRewardsEarned > 0 ? totalRewardsEarned.toLocaleString(undefined, { maximumFractionDigits: 4 }) : "0.0000"}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Lifetime Earned</div>
          </div>

          <div className="bg-background/40 p-4 border border-primary/20 rounded-lg backdrop-blur-sm">
            <div className="text-[10px] tracking-widest text-primary/60 font-black uppercase mb-1">BLOCKS VALIDATED</div>
            <div className="text-2xl font-mono text-white truncate">
              {(stakingInfo as any)?.rewardsCount || 0}
            </div>
            <div className="text-[10px] text-muted-foreground mt-1">Personal Blocks</div>
          </div>

          <div className="bg-accent/10 p-4 border border-accent/30 rounded-lg shadow-[0_0_15px_rgba(255,193,44,0.05)]">
            <div className="text-[10px] tracking-widest text-accent font-black uppercase mb-1">LATEST REWARD</div>
            <div className="text-2xl font-mono text-white animate-pulse truncate" data-testid="text-last-reward">
              +{parseFloat((stakingInfo as any)?.lastRewardAmount || "0").toLocaleString(undefined, { maximumFractionDigits: 4 })}
            </div>
            <div className="text-[10px] text-accent/60 mt-1 uppercase">Last Block Reward</div>
          </div>
        </div>

        {/* === SECONDARY STATS === */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
          <div className="bg-background/20 p-3 border border-primary/10 rounded-md">
            <div className="text-[10px] text-muted-foreground uppercase">EST. APY</div>
            <div className="text-lg font-mono text-green-400">
              {apyNum > 0 ? `${apyNum.toLocaleString(undefined, { maximumFractionDigits: 1 })}%` : "--"}
            </div>
          </div>
          <div className="bg-background/20 p-3 border border-primary/10 rounded-md">
            <div className="text-[10px] text-muted-foreground uppercase">NETWORK STAKED</div>
            <div className="text-lg font-mono text-white truncate">
              {totalNetworkStakedNum > 0 ? totalNetworkStakedNum.toLocaleString(undefined, { maximumFractionDigits: 0 }) : "0"}
            </div>
          </div>
          <div className="bg-background/20 p-3 border border-primary/10 rounded-md">
            <div className="text-[10px] text-muted-foreground uppercase">REWARD MODE</div>
            <div className="text-lg font-mono text-accent">AUTO</div>
          </div>
          <div className="bg-background/20 p-3 border border-primary/10 rounded-md">
            <div className="text-[10px] text-muted-foreground uppercase">NODE STATUS</div>
            <div className="text-lg font-mono text-green-400">ONLINE</div>
          </div>
        </div>

        {/* === MINING ACTIVITY BOX === */}
        {isMiningActive && (
          <div className="mb-3 p-2 border border-accent/20 rounded-md bg-accent/5">
            <div className="flex items-center gap-2 mb-1">
              <TrendingUp className="w-3 h-3 text-accent animate-pulse" />
              <span className="text-xs font-mono text-accent">MINING ACTIVE — REWARDS AUTO-DEPOSITED</span>
            </div>
            <div className="text-[10px] font-mono text-muted-foreground">
              Your {stakedNum.toLocaleString()} WEBD2 is mining rewards. Rewards accrue every 5 seconds and are automatically added to your available balance.
            </div>
          </div>
        )}

        {/* === 7-DAY HOLD WARNING === */}
        {isOnHold && (
          <div className="mb-3 p-3 border border-red-500/30 rounded-md bg-red-500/10">
            <div className="flex items-center gap-2 mb-1">
              <Timer className="w-4 h-4 text-red-400" />
              <span className="text-sm font-mono text-red-400 font-bold">7-DAY HOLD ACTIVE</span>
            </div>
            <div className="text-xs font-mono text-red-400/80 mb-2">
              Mining has been stopped. Your {stakedNum.toLocaleString()} WEBD2 is locked and will automatically be returned to your balance when the hold period expires.
            </div>
            <div className="flex items-center gap-2">
              <Timer className="w-3 h-3 text-red-400 animate-pulse" />
              <span className="text-lg font-mono text-red-400 font-black tracking-wider">{holdCountdown || "CALCULATING..."}</span>
              <span className="text-[10px] font-mono text-red-400/60">REMAINING</span>
            </div>
          </div>
        )}

        {/* === MINIMUM REQUIREMENT INFO === */}
        <div className="p-3 bg-card border border-primary/20 rounded-md mb-3 flex items-start gap-2" data-testid="notice-min-stake">
          <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="text-xs font-mono text-muted-foreground">
            <span className="text-foreground font-semibold">Minimum 1,000 WD2 required to mine.</span> Stake at least 1,000 WD2 to start earning rewards. Rewards are auto-deposited every 5 seconds proportionally among all miners.
          </span>
        </div>

        {/* === 7-DAY HOLD EXPLANATION === */}
        <div className="p-3 bg-card border border-primary/20 rounded-md mb-3 flex items-start gap-2">
          <Lock className="w-4 h-4 text-primary shrink-0 mt-0.5" />
          <span className="text-xs font-mono text-muted-foreground">
            <span className="text-foreground font-semibold">7-Day Hold Policy:</span> When you stop mining, your staked funds will be held for 7 days. After the hold period, funds are automatically returned to your available balance. Changing your staking amount does NOT trigger the hold.
          </span>
        </div>

        {/* === START MINING / STAKING TOGGLE === */}
        <div className="space-y-3">
          {!stakedNum && !isOnHold && (
            <div className="space-y-4">
              <label className="text-sm font-mono text-primary font-bold tracking-widest uppercase">START MINING (min 1,000 WD2)</label>
              <div className="flex flex-col sm:flex-row gap-4">
                <Input
                  type="number"
                  value={stakeAmount}
                  onChange={(e) => setStakeAmount(e.target.value)}
                  className="bg-input border-2 border-primary/30 font-mono flex-1 py-4 md:py-8 text-xl md:text-2xl text-accent font-black text-center sm:text-left h-auto min-h-[50px]"
                  placeholder="Amount to MINE"
                  data-testid="input-stake-amount"
                />
                <Button
                  onClick={handleStake}
                  disabled={isStaking || !stakeAmount || parseFloat(stakeAmount) < 1000}
                  className="py-4 px-6 md:py-8 md:px-12 text-lg md:text-xl font-black tracking-widest uppercase btn-neon shadow-lg shadow-primary/20 h-auto min-h-[50px]"
                  data-testid="button-stake"
                >
                  {isStaking ? <Loader2 className="w-5 h-5 md:w-6 md:h-6 animate-spin shrink-0" /> : <Lock className="mr-2 w-5 h-5 md:w-6 md:h-6 shrink-0" />}
                  START
                </Button>
              </div>
            </div>
          )}

          {/* ACTIVE MINING STATE — Show STAKING button that toggles to STOP */}
          {isMiningActive && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-mono text-accent font-bold tracking-widest uppercase">CURRENTLY MINING</label>
                  <div className="text-3xl font-mono text-accent font-black mt-1">
                    {stakedNum.toLocaleString(undefined, { maximumFractionDigits: 2 })} <span className="text-lg text-primary">WD2</span>
                  </div>
                </div>
                <Button
                  onClick={handleStop}
                  disabled={isUnstaking}
                  className="py-2 px-6 md:py-3 md:px-8 text-sm md:text-base font-black tracking-widest uppercase bg-red-600 hover:bg-red-700 text-white border-red-500 shadow-md shadow-red-500/20 h-auto"
                  data-testid="button-stop-mining"
                >
                  {isUnstaking ? <Loader2 className="w-4 h-4 animate-spin shrink-0" /> : <Timer className="mr-2 w-4 h-4 shrink-0" />}
                  STOP MINING
                </Button>
              </div>

              {/* CHANGE AMOUNT */}
              <div className="border-t border-primary/10 pt-3">
                {!showChangeAmount ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowChangeAmount(true)}
                    className="font-mono text-xs text-primary/70 border-primary/20 hover:text-accent hover:border-accent"
                  >
                    <RefreshCw className="w-3 h-3 mr-1" /> CHANGE STAKING AMOUNT
                  </Button>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <Input
                      type="number"
                      value={changeAmount}
                      onChange={(e) => setChangeAmount(e.target.value)}
                      className="bg-input border-primary/30 font-mono flex-1 h-10 text-base text-accent"
                      placeholder="New staking amount (min 1,000)"
                    />
                    <div className="flex gap-2">
                      <Button
                        onClick={handleChangeAmount}
                        disabled={changeAmountMutation.isPending || !changeAmount || parseFloat(changeAmount) < 1000}
                        className="h-10 btn-neon font-mono text-xs px-4"
                      >
                        {changeAmountMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLY"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => { setShowChangeAmount(false); setChangeAmount(""); }}
                        className="h-10 font-mono text-xs px-3"
                      >
                        CANCEL
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ON HOLD STATE */}
          {isOnHold && (
            <div className="text-center py-4">
              <div className="text-lg font-mono text-red-400 font-black">MINING STOPPED</div>
              <div className="text-sm font-mono text-muted-foreground mt-1">
                {stakedNum.toLocaleString()} WEBD2 will be returned to your balance after the 7-day hold.
              </div>
            </div>
          )}
        </div>

        {!stakedNum && !isOnHold && (
          <div className="mt-4 font-mono text-xs text-muted-foreground italic p-3 border border-primary/10 rounded-md">
            Lock your WEBD2 tokens to start mining and earn passive rewards. The more you put in, the bigger your share of the mining rewards pool.
          </div>
        )}
      </CyberCard>

      <CyberCard title="DIELBS CONSENSUS RADAR" className="mb-0 border-primary/20 bg-background/60 shadow-[0_0_20px_rgba(255,193,44,0.05)]">
        <div className="font-mono text-[10px] sm:text-xs text-primary/80 h-32 overflow-y-auto space-y-1 p-2 bg-black/40 rounded border border-primary/10 scrollbar-hide">
          <div className="flex gap-2">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-white">DIELBS v1.0 INITIALIZED...</span>
          </div>
          <div className="flex gap-2">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-accent">CONSENSUS STATE: STABLE</span>
          </div>
          <div className="flex gap-2">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-green-400">NETWORK WEIGHT: {Number(stakingInfo?.totalNetworkStaked || 0).toLocaleString()} WEBD2</span>
          </div>
          <div className="flex gap-2 animate-pulse">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-primary">VALIDATING BLOCK #{Number(stakingInfo?.blockHeight || 0).toLocaleString()}...</span>
          </div>
          <div className="flex gap-2">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span className="text-white">PARTICIPATION VERIFIED: {stakingInfo?.username}</span>
          </div>
          <div className="flex gap-2 text-primary/40">
            <span>&gt; HEARTBEAT SENT TO DIELBS_COORDINATOR</span>
          </div>
          <div className="flex gap-2 text-green-400">
            <span className="text-accent/50">[{new Date().toLocaleTimeString()}]</span>
            <span>LAST REWARD PROCESSED: {stakingInfo?.lastRewardAmount} WEBD2</span>
          </div>
          <div className="mt-2 pt-2 border-t border-primary/5 text-[9px] text-muted-foreground uppercase tracking-widest leading-relaxed">
            Note: As a browser-native proof-of-stake protocol, WebDollar 2 requires this tab to remain active. Rewards are calculated based on your contribution to network decentralization.
          </div>
        </div>
      </CyberCard>

      <CyberCard title="MINING ACTIVITY" className="mt-0">
        <div className="overflow-x-auto">
          <table className="w-full font-mono text-sm text-left">
            <thead>
              <tr className="border-b border-primary/30 text-primary/70">
                <th className="py-3 px-2">TYPE</th>
                <th className="py-3 px-2">DETAILS</th>
                <th className="py-3 px-2 text-right">AMOUNT</th>
                <th className="py-3 px-2 text-right hidden sm:table-cell">TIME</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-primary/10">
              {myTransactions?.map((tx: any) => {
                const isSender = tx.senderId === user?.id;
                const isStakingReward = tx.type === "staking_reward";
                const isMiningReward = tx.type === "mining_reward";
                const isReward = isStakingReward || isMiningReward;
                const isConversion = tx.type === "conversion";
                const isPurchase = tx.type === "purchase";

                return (
                  <tr key={tx.id} className="hover:bg-primary/5 transition-colors" data-testid={`my-tx-row-${tx.id}`}>
                    <td className="py-3 px-2">
                      <div className="flex items-center gap-2">
                        {isPurchase ? (
                          <Coins className="w-4 h-4 text-green-400" />
                        ) : isReward ? (
                          <Gem className="w-4 h-4 text-accent" />
                        ) : isSender ? (
                          <ArrowUpRight className="w-4 h-4 text-red-400" />
                        ) : (
                          <ArrowDownLeft className="w-4 h-4 text-green-400" />
                        )}
                        <span className={`text-xs uppercase ${
                          isPurchase ? 'text-green-400' :
                          isReward ? 'text-accent' :
                          isConversion ? 'text-yellow-400' :
                          isSender ? 'text-red-400' : 'text-green-400'
                        }`}>
                          {isPurchase ? 'PURCHASED' :
                           isStakingReward ? 'MINED' :
                           isMiningReward ? 'MINED' :
                           isConversion ? 'CONVERTED' :
                           isSender ? 'SENT' : 'RECEIVED'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-2 text-muted-foreground text-base truncate max-w-[200px] sm:max-w-[350px]">
                      {isPurchase ? 'Token purchase (Stripe)' :
                       isStakingReward ? 'Mining reward (auto-claimed)' :
                       isMiningReward ? 'Block reward' :
                       isConversion ? 'Legacy swap' :
                       isSender ? `To ${tx.receiverAddress ? tx.receiverAddress.substring(0, 22) + '...' : 'Unknown'}` :
                       `From ${tx.senderAddress ? tx.senderAddress.substring(0, 22) + '...' : 'System'}`}
                    </td>
                    <td className={`py-3 px-2 text-right font-bold ${isSender && !isReward && !isPurchase ? 'text-red-400' : 'text-accent'}`}>
                      {isSender && !isReward && !isPurchase ? '-' : '+'}
                      {Number(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 4 })} WEBD2
                    </td>
                    <td className="py-3 px-2 text-right text-muted-foreground text-xs hidden sm:table-cell">
                      {tx.timestamp ? formatDistanceToNow(new Date(tx.timestamp), { addSuffix: true }) : ''}
                    </td>
                  </tr>
                );
              })}
              {(!myTransactions || myTransactions.length === 0) && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-muted-foreground">
                    No transactions yet. Start mining or receive tokens to see activity here.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CyberCard>

    </div>
  );
}
