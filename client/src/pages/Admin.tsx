// @ts-nocheck
import { useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { CheckCircle2, XCircle, Clock, Shield, Loader2, ExternalLink, Eye, CreditCard, Mail, Users, Search, UserCog, ShieldAlert, Rocket, Activity } from "lucide-react";

export default function Admin() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
   const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
   const [announcement, setAnnouncement] = useState(() => localStorage.getItem("webd2_announcement") || "");
   const [userSearch, setUserSearch] = useState("");
   const [searchResults, setSearchResults] = useState<any[]>([]);
   const [editingUser, setEditingUser] = useState<any>(null);
   const [editForm, setEditForm] = useState({ username: "", password: "", isDev: false, isFoundation: false });

   const handleSaveAnnouncement = () => {
     localStorage.setItem("webd2_announcement", announcement);
     toast({ 
       title: "ANNOUNCEMENT BROADCASTED", 
       description: "Global announcement banner updated.",
       className: "border-accent text-accent bg-black font-mono shadow-[0_0_20px_rgba(255,193,44,0.3)]"
     });
   };

  const { data: conversions, isLoading } = useQuery({
    queryKey: [api.admin.conversions.list.path],
    queryFn: async () => {
      const res = await fetch(api.admin.conversions.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch conversions");
      return await res.json();
    },
    enabled: !!user?.isDev,
  });

  const { data: burnData } = useQuery<{ balance: string; explorerUrl: string }>({
    queryKey: ["/api/conversion/burn-balance"],
    refetchInterval: 60000,
    enabled: !!user?.isDev,
  });

  const { data: waitlistEntries, isLoading: waitlistLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/card-waitlist"],
    enabled: !!user?.isDev,
  });

  const { data: sweepstakes, isLoading: sweepsLoading } = useQuery<any[]>({
    queryKey: ["/api/admin/casino-sweeps"],
    enabled: !!user?.isDev,
  });

  const { data: treasury, isLoading: treasuryLoading } = useQuery<any>({
    queryKey: ["/api/admin/treasury-info"],
    queryFn: async () => {
      const res = await fetch("/api/admin/treasury-info", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch treasury info");
      return await res.json();
    },
    enabled: !!user?.isDev,
  });

  const { data: livePeers } = useQuery<{ peers: any[]; total: number }>({
    queryKey: ["/api/admin/peers/live"],
    queryFn: async () => {
      const res = await fetch("/api/admin/peers/live", { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch peers");
      return await res.json();
    },
    enabled: !!user?.isDev,
    refetchInterval: 10000,
    placeholderData: (prev: any) => prev,
  });

  const approveMutation = useMutation({
    mutationFn: async ({ id, amount }: { id: number; amount?: string }) => {
      const body: any = {};
      if (amount && parseFloat(amount) > 0) {
        body.amount = amount;
      }
      const res = await fetch(`/api/admin/conversions/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to approve");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.conversions.list.path] });
      toast({
        title: "APPROVED",
        description: "Conversion approved. Tokens credited to user.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({ title: "ERROR", description: error.message, variant: "destructive" });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/admin/conversions/${id}/reject`, {
        method: "POST",
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Failed to reject");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.admin.conversions.list.path] });
      toast({
        title: "REJECTED",
        description: "Conversion rejected. No tokens credited.",
        className: "border-destructive text-destructive bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({ title: "ERROR", description: error.message, variant: "destructive" });
    },
  });

  const searchUsersMutation = useMutation({
    mutationFn: async (query: string) => {
      const res = await fetch("/api/admin/users/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Search failed");
      return await res.json();
    },
    onSuccess: (data) => setSearchResults(data),
  });

  const updateUserInfoMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: any }) => {
      const res = await fetch(`/api/admin/users/${id}/update`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Update failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      toast({ title: "USER UPDATED", description: "Account overrides applied successfully." });
      setEditingUser(null);
      searchUsersMutation.mutate(userSearch);
    },
    onError: (err: any) => toast({ title: "UPDATE FAILED", description: err.message, variant: "destructive" }),
  });

  if (!user) {
    setLocation("/auth");
    return null;
  }

  if (!user.isDev) {
    setLocation("/");
    return null;
  }

  const pendingCount = conversions?.filter((c: any) => c.status === "pending").length || 0;
  const approvedCount = conversions?.filter((c: any) => c.status === "approved").length || 0;
  const rejectedCount = conversions?.filter((c: any) => c.status === "rejected").length || 0;
  const totalApprovedAmount = conversions?.filter((c: any) => c.status === "approved").reduce((sum: number, c: any) => sum + parseFloat(c.amountApproved || "0"), 0) || 0;

  const [showSeeds, setShowSeeds] = useState<Record<string, boolean>>({});

  const toggleSeed = (key: string) => {
    setShowSeeds(prev => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-heading text-accent" data-testid="text-admin-title">ADMIN PANEL</h1>
        </div>
        <p className="font-mono text-muted-foreground">
          Review and manage legacy token conversion requests and monitor network treasury reserves.
        </p>

      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-black border border-accent/30 rounded-lg font-mono relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-accent text-xs uppercase">
              <Rocket className="w-4 h-4" /> MIGRATION VAULT
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-accent border border-accent/20 hover:bg-accent/10" onClick={() => toggleSeed('migration')}>
              <Eye className="w-4 h-4 mr-1" />
              <span className="text-[10px] font-bold">REVEAL</span>
            </Button>
          </div>
          <div className="text-xl text-white">14,200,000,000 <span className="text-[10px] text-muted-foreground">WEBD2</span></div>
          <div className="text-[9px] text-accent mt-2 break-all font-bold">ADDRESS: {treasury?.migration?.address || "FETCHING..."}</div>
          {showSeeds.migration && (
            <div className="mt-2 p-3 bg-accent/20 border border-accent/40 rounded text-[10px] text-white font-bold animate-in fade-in slide-in-from-top-1 shadow-[0_0_15px_rgba(255,193,44,0.2)]">
              SEED: {treasury?.migration?.mnemonic}
            </div>
          )}
          <div className="text-[8px] text-muted-foreground mt-1 uppercase">Target: ex-v1 community</div>
        </div>

        <div className="p-4 bg-black border border-primary/30 rounded-lg font-mono relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-primary text-xs uppercase font-bold">
              <ShieldAlert className="w-4 h-4" /> DEV TREASURY
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-primary border border-primary/20 hover:bg-primary/10" onClick={() => toggleSeed('dev')}>
              <Eye className="w-4 h-4 mr-1" />
              <span className="text-[10px] font-bold">REVEAL</span>
            </Button>
          </div>
          <div className="text-xl text-white">6,800,000,000 <span className="text-[10px] text-muted-foreground">WEBD2</span></div>
          <div className="text-[9px] text-primary mt-2 break-all font-bold">ADDRESS: {treasury?.dev?.address || "FETCHING..."}</div>
          {showSeeds.dev && (
            <div className="mt-2 p-3 bg-primary/20 border border-primary/40 rounded text-[10px] text-white font-bold animate-in fade-in slide-in-from-top-1 shadow-[0_0_15px_rgba(var(--primary),0.2)]">
              SEED: {treasury?.dev?.mnemonic}
            </div>
          )}
          <div className="text-[8px] text-muted-foreground mt-1 uppercase">10% Genesis Allocation</div>
        </div>

        <div className="p-4 bg-black border border-blue-500/30 rounded-lg font-mono relative overflow-hidden">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2 text-blue-400 text-xs uppercase font-bold">
              <Users className="w-4 h-4" /> FOUNDATION RESERVE
            </div>
            <Button variant="ghost" size="sm" className="h-7 px-2 text-blue-400 border border-blue-500/20 hover:bg-blue-400/10" onClick={() => toggleSeed('foundation')}>
              <Eye className="w-4 h-4 mr-1" />
              <span className="text-[10px] font-bold">REVEAL</span>
            </Button>
          </div>
          <div className="text-xl text-white">3,400,000,000 <span className="text-[10px] text-muted-foreground">WEBD2</span></div>
          <div className="text-[9px] text-blue-400 mt-2 break-all font-bold">ADDRESS: {treasury?.foundation?.address || "FETCHING..."}</div>
          {showSeeds.foundation && (
            <div className="mt-2 p-3 bg-blue-500/20 border border-blue-500/40 rounded text-[10px] text-white font-bold animate-in fade-in slide-in-from-top-1 shadow-[0_0_15px_rgba(59,130,246,0.2)]">
              SEED: {treasury?.foundation?.mnemonic}
            </div>
          )}
          <div className="text-[8px] text-muted-foreground mt-1 uppercase">5% Ecosystem Growth</div>
        </div>
      </div>

      {/* LIVE P2P MESH MONITOR */}
      <CyberCard title="LIVE P2P MESH MONITOR" className="mb-8 border-green-500/30">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
              <span className="font-mono text-green-400 font-black text-lg">{livePeers?.total || 0}</span>
              <span className="font-mono text-muted-foreground text-xs uppercase">active peers</span>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground bg-white/5 px-2 py-1 rounded">AUTO-REFRESH 10s</div>
          </div>

          {livePeers?.peers && livePeers.peers.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm text-left">
                <thead>
                  <tr className="border-b border-green-500/20 text-green-400/70 text-[10px] uppercase tracking-wider">
                    <th className="py-2 px-3">Peer ID</th>
                    <th className="py-2 px-3">Mesh Links</th>
                    <th className="py-2 px-3">Uptime</th>
                    <th className="py-2 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-green-500/10">
                  {livePeers.peers.map((p: any) => {
                    const mins = Math.floor(p.uptimeMs / 60000);
                    const hrs = Math.floor(mins / 60);
                    const uptime = hrs > 0 ? `${hrs}h ${mins % 60}m` : `${mins}m`;
                    return (
                      <tr key={p.id} className="hover:bg-green-500/5 transition-colors">
                        <td className="py-2.5 px-3">
                          <div className="flex items-center gap-2">
                            <Activity className="w-3 h-3 text-green-400" />
                            <span className="text-white font-bold">{p.id}</span>
                          </div>
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="text-primary">{p.meshLinks}</span>
                          <span className="text-muted-foreground text-[10px] ml-1">nodes</span>
                        </td>
                        <td className="py-2.5 px-3 text-muted-foreground">{uptime}</td>
                        <td className="py-2.5 px-3">
                          <span className="text-[10px] px-2 py-0.5 bg-green-500/20 text-green-400 border border-green-500/30 rounded-sm">CONNECTED</span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground font-mono text-sm">
              No peers currently connected to the mesh.
            </div>
          )}
        </div>
      </CyberCard>

      {(!treasury?.migration || treasury.migration.address === "NOT_FOUND") && (
        <CyberCard title="GENESIS INITIALIZATION" className="mb-8 border-yellow-500/50 shadow-[0_0_30px_rgba(255,193,44,0.1)]">
          <div className="p-4 space-y-4">
            <p className="text-xs font-mono text-muted-foreground italic">
              ⚠️ WARNING: This will instantiate the 3 master treasury wallets (Migration, Dev, Foundation) and mint the initial supply. This can only be performed once per network reset.
            </p>
            <Button 
              className="w-full btn-gold border-yellow-500/50 py-6 text-lg font-black"
              onClick={async () => {
                if (window.confirm("ARE YOU SURE? This will mint the genesis supply of 53.4 Billion WEBD2.")) {
                  try {
                    const res = await fetch("/api/admin/genesis", { method: "POST", credentials: "include" });
                    const data = await res.json();
                    if (res.ok) {
                      toast({ title: "GENESIS COMPLETE", description: data.message });
                    } else {
                      toast({ title: "GENESIS FAILED", description: data.message, variant: "destructive" });
                    }
                  } catch (e: any) {
                    toast({ title: "ERROR", description: e.message, variant: "destructive" });
                  }
                }
              }}
            >
              <Rocket className="w-6 h-6 mr-3" /> INITIALIZE GENESIS NETWORK
            </Button>
          </div>
        </CyberCard>
      )}

      <div className="mb-8 p-4 bg-card border border-accent/20 rounded-md font-mono text-sm">
        <div className="flex flex-wrap gap-6 justify-around">
          <div className="text-center">
            <div className="text-muted-foreground text-xs">PENDING</div>
            <div className="text-xl text-yellow-500" data-testid="text-pending-count">{pendingCount}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">APPROVED</div>
            <div className="text-xl text-accent" data-testid="text-approved-count">{approvedCount}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">REJECTED</div>
            <div className="text-xl text-destructive" data-testid="text-rejected-count">{rejectedCount}</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">TOTAL APPROVED</div>
            <div className="text-xl text-primary" data-testid="text-total-approved-amount">{totalApprovedAmount.toLocaleString()} WEBD</div>
          </div>
          <div className="text-center">
            <div className="text-muted-foreground text-xs">BURN WALLET (Old Chain)</div>
            <div className="text-xl text-accent" data-testid="text-burn-balance">
              {burnData?.balance ? `${Number(burnData.balance).toLocaleString()} WEBD` : "..."}
            </div>
            {burnData?.explorerUrl && (
              <a
                href={burnData.explorerUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:text-accent flex items-center justify-center gap-1 mt-1"
                data-testid="link-burn-explorer"
              >
                <Eye className="w-3 h-3" /> Explorer
              </a>
            )}
          </div>
        </div>
      </div>

      <CyberCard title="CONVERSION REQUESTS">
        {isLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!isLoading && (!conversions || conversions.length === 0) && (
          <div className="text-center py-12 text-muted-foreground font-mono">
            No conversion requests to review.
          </div>
        )}

        <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
          {conversions?.map((conv: any) => (
            <div
              key={conv.id}
              className="p-4 border border-primary/10 bg-background rounded-md"
              data-testid={`admin-conversion-${conv.id}`}
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-2">
                    <span className="font-mono text-lg text-foreground">
                      {Number(conv.amountClaimed).toLocaleString()} WEBD claimed
                    </span>
                    {conv.status === "approved" && conv.amountApproved && (
                      <span className="font-mono text-sm text-accent">
                        ({Number(conv.amountApproved).toLocaleString()} approved)
                      </span>
                    )}
                    <Badge
                      variant={conv.status === "approved" ? "default" : conv.status === "rejected" ? "destructive" : "secondary"}
                      className={conv.status === "pending" ? "bg-yellow-500/20 text-yellow-500 border-yellow-500/30" : conv.status === "approved" ? "bg-accent/20 text-accent border-accent/30" : ""}
                    >
                      {conv.status === "pending" && <Clock className="w-3 h-3 mr-1" />}
                      {conv.status === "approved" && <CheckCircle2 className="w-3 h-3 mr-1" />}
                      {conv.status === "rejected" && <XCircle className="w-3 h-3 mr-1" />}
                      {conv.status?.toUpperCase()}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground font-mono space-y-1">
                    <div>User: <span className="text-foreground">{conv.username}</span></div>
                    <div>Old Address: <span className="text-foreground break-all text-base">{conv.oldWalletAddress}</span></div>
                    <div>WDollar 2 Wallet: <span className="text-accent break-all text-base">{conv.walletAddress || "No wallet"}</span></div>
                    <div>Submitted: <span className="text-foreground">{conv.createdAt ? new Date(conv.createdAt).toLocaleString() : "N/A"}</span></div>
                  </div>
                </div>

                {conv.status === "pending" && (
                  <div className="space-y-2 shrink-0">
                    <div className="space-y-1">
                      <label className="text-xs font-mono text-muted-foreground">Verified amount (optional):</label>
                      <Input
                        type="number"
                        placeholder={Number(conv.amountClaimed).toString()}
                        value={customAmounts[conv.id] || ""}
                        onChange={(e) => setCustomAmounts(prev => ({ ...prev, [conv.id]: e.target.value }))}
                        className="bg-input border-primary/30 font-mono w-40"
                        data-testid={`input-custom-amount-${conv.id}`}
                      />
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        className="btn-gold"
                        onClick={() => approveMutation.mutate({ id: conv.id, amount: customAmounts[conv.id] })}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-approve-${conv.id}`}
                      >
                        {approveMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 mr-1" />}
                        Approve
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => rejectMutation.mutate(conv.id)}
                        disabled={approveMutation.isPending || rejectMutation.isPending}
                        data-testid={`button-reject-${conv.id}`}
                      >
                        {rejectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4 mr-1" />}
                        Reject
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CyberCard>

      <CyberCard title="CARD WAITLIST SIGNUPS" className="mt-8">
        {waitlistLoading && (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        )}

        {!waitlistLoading && (!waitlistEntries || waitlistEntries.length === 0) && (
          <div className="text-center py-12 text-muted-foreground font-mono">
            No card waitlist signups yet.
          </div>
        )}

        {!waitlistLoading && waitlistEntries && waitlistEntries.length > 0 && (
          <>
            <div className="mb-4 flex flex-col md:flex-row gap-4">
              <div className="flex-1 p-3 bg-card border border-primary/10 rounded-md font-mono text-sm flex items-center gap-3">
                <Users className="w-5 h-5 text-accent" />
                <span className="text-muted-foreground">Total signups:</span>
                <span className="text-accent text-lg font-bold" data-testid="text-waitlist-total">{waitlistEntries.length}</span>
              </div>
              <div className="flex-[2] p-3 bg-accent/5 border border-accent/20 rounded-md font-mono text-xs flex items-start gap-3">
                <Mail className="w-5 h-5 text-accent shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <div className="text-accent font-black uppercase tracking-widest">LAUNCH REWARD PROTOCOL</div>
                  <p className="text-muted-foreground opacity-90 leading-relaxed">
                    The first 1,000 users on this list are guaranteed <span className="text-accent font-bold">1,000 WEBD2</span> on mainnet launch. 
                    Official claim instructions must be manually dispatched to their registered email addresses.
                  </p>
                </div>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full font-mono text-sm text-left">
                <thead>
                  <tr className="border-b border-primary/30 text-primary/70">
                    <th className="py-3 px-2">#</th>
                    <th className="py-3 px-2">USERNAME</th>
                    <th className="py-3 px-2">EMAIL</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-primary/10">
                  {waitlistEntries.map((entry: any, idx: number) => (
                    <tr key={entry.id} className="hover:bg-primary/5 transition-colors" data-testid={`waitlist-entry-${entry.id}`}>
                      <td className="py-3 px-2 text-muted-foreground">{idx + 1}</td>
                      <td className="py-3 px-2 text-foreground">{entry.username || `User #${entry.userId}`}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <Mail className="w-4 h-4 text-accent" />
                          <span className="text-accent text-base" data-testid={`text-waitlist-email-${entry.id}`}>{entry.email}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
       </CyberCard>

      <CyberCard title="SUPER-USER CONSOLE (ACCOUNT OVERRIDES)" className="mt-8 border-red-500/30">
        <div className="space-y-6">
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input 
                placeholder="Search username or wallet address..."
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                className="pl-10 font-mono bg-background"
              />
            </div>
            <Button onClick={() => searchUsersMutation.mutate(userSearch)} className="btn-gold">
              {searchUsersMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "SEARCH"}
            </Button>
          </div>

          <div className="space-y-3">
            {searchResults.map(u => (
              <div key={u.id} className="p-4 border border-primary/20 bg-background/50 rounded-md flex items-center justify-between">
                <div className="font-mono">
                  <div className="flex items-center gap-2">
                    <span className="text-white font-bold">{u.username}</span>
                    {u.isDev && <Badge className="bg-red-500/20 text-red-500 border-red-500/30 text-[10px]">ADMIN</Badge>}
                  </div>
                  <div className="text-[10px] text-muted-foreground truncate max-w-[200px]">{u.walletAddress}</div>
                </div>
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={() => {
                    setEditingUser(u);
                    setEditForm({ username: u.username, password: "", isDev: u.isDev, isFoundation: u.isFoundation });
                  }}
                  className="font-mono text-xs"
                >
                  <UserCog className="w-3 h-3 mr-1" /> EDIT
                </Button>
              </div>
            ))}
          </div>

          {editingUser && (
            <div className="mt-8 p-6 border-2 border-accent/30 bg-accent/5 rounded-lg space-y-4 animate-in fade-in slide-in-from-top-4">
              <div className="flex items-center gap-2 text-accent mb-4">
                <ShieldAlert className="w-5 h-5" />
                <h3 className="font-black tracking-widest uppercase">Overriding: {editingUser.username}</h3>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Override Username</label>
                  <Input 
                    value={editForm.username}
                    onChange={e => setEditForm(prev => ({ ...prev, username: e.target.value }))}
                    className="bg-background font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-mono text-muted-foreground uppercase">Force New Password</label>
                  <Input 
                    type="password"
                    placeholder="Leave blank to keep current"
                    value={editForm.password}
                    onChange={e => setEditForm(prev => ({ ...prev, password: e.target.value }))}
                    className="bg-background font-mono"
                  />
                </div>
              </div>

              <div className="flex items-center gap-6 py-2">
                <div className="flex items-center gap-2">
                  <input 
                    type="checkbox" 
                    checked={editForm.isDev} 
                    onChange={e => setEditForm(prev => ({ ...prev, isDev: e.target.checked }))}
                    className="w-4 h-4 accent-red-500"
                  />
                  <label className="text-xs font-mono text-red-400 font-bold uppercase">Admin Privileges</label>
                </div>
              </div>

              <div className="flex gap-4 pt-4 border-t border-accent/20">
                <Button 
                  onClick={() => updateUserInfoMutation.mutate({ id: editingUser.id, data: editForm })}
                  disabled={updateUserInfoMutation.isPending}
                  className="btn-gold flex-1"
                >
                  {updateUserInfoMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "APPLY OVERRIDES"}
                </Button>
                <Button 
                  variant="ghost" 
                  onClick={() => setEditingUser(null)}
                  className="font-mono text-xs"
                >
                  CANCEL
                </Button>
              </div>
            </div>
          )}
        </div>
      </CyberCard>

      <CyberCard title="BROADCAST CENTER" className="mt-8 border-accent/30 shadow-[0_0_20px_rgba(255,193,44,0.05)]">
        <div className="space-y-4">
          <div>
            <label className="text-[10px] font-mono text-accent block mb-2 uppercase tracking-[0.2em] font-black">GLOBAL ANNOUNCEMENT BANNER</label>
            <div className="flex flex-col sm:flex-row gap-4">
              <Input 
                placeholder="Type global news or system alerts here..."
                value={announcement}
                onChange={e => setAnnouncement(e.target.value)}
                className="bg-background border-primary/20 text-white font-mono flex-1"
              />
              <Button 
                onClick={handleSaveAnnouncement}
                className="btn-gold whitespace-nowrap px-8"
              >
                BROADCAST
              </Button>
            </div>
          </div>
          <p className="text-[10px] font-mono text-muted-foreground italic border-l-2 border-accent/20 pl-4 bg-accent/5 p-2 rounded-sm">
            * BROADCAST MODE: This message will propagate across all synchronized network nodes on this browser instance. Use for critical stress-test alerts or migration updates.
          </p>
        </div>
      </CyberCard>
    </div>
  );
}
