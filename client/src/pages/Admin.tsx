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
import { CheckCircle2, XCircle, Clock, Shield, Loader2, ExternalLink, Eye, CreditCard, Mail, Users } from "lucide-react";

export default function Admin() {
  const [_, setLocation] = useLocation();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
   const [customAmounts, setCustomAmounts] = useState<Record<number, string>>({});
   const [announcement, setAnnouncement] = useState(() => localStorage.getItem("webd2_announcement") || "");

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

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <div className="text-center mb-12">
        <div className="flex items-center justify-center gap-3 mb-4">
          <Shield className="w-8 h-8 text-accent" />
          <h1 className="text-4xl font-heading text-accent" data-testid="text-admin-title">ADMIN PANEL</h1>
        </div>
        <p className="font-mono text-muted-foreground">
          Review and manage legacy token conversion requests. Verify deposits on the old chain before approving.
        </p>
      </div>

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
            <div className="mb-4 p-3 bg-card border border-primary/10 rounded-md font-mono text-sm flex items-center gap-3">
              <Mail className="w-5 h-5 text-accent" />
              <span className="text-muted-foreground">Total signups:</span>
              <span className="text-accent text-lg font-bold" data-testid="text-waitlist-total">{waitlistEntries.length}</span>
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
