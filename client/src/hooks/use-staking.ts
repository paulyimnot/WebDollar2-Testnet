import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { useToast } from "./use-toast";

export function useStaking() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: stakingInfo, isLoading: isLoadingInfo } = useQuery({
    queryKey: [api.staking.info.path],
    queryFn: async () => {
      const res = await fetch(api.staking.info.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch staking info");
      return await res.json();
    },
    refetchInterval: 5000,
  });

  const { data: networkStats } = useQuery({
    queryKey: [api.staking.networkStats.path],
    queryFn: async () => {
      const res = await fetch(api.staking.networkStats.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch network stats");
      return await res.json();
    },
    refetchInterval: 10000,
  });

  const stakeMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await fetch(api.staking.stake.path, {
        method: api.staking.stake.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Staking failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.staking.info.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "MINING STARTED",
        description: data.message,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Mining Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const unstakeMutation = useMutation({
    mutationFn: async (amount: string) => {
      const res = await fetch(api.staking.unstake.path, {
        method: api.staking.unstake.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amount }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Unstaking failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.staking.info.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "MINING STOPPED",
        description: data.message,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Withdraw Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.staking.claimRewards.path, {
        method: api.staking.claimRewards.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Claiming rewards failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.staking.info.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "MINING REWARDS CLAIMED!",
        description: data.message,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "Claim Error",
        description: error.message,
        variant: "destructive",
      });
    },
  });

  return {
    stakingInfo,
    networkStats,
    isLoadingInfo,
    stake: (amount: string) => stakeMutation.mutate(amount),
    unstake: (amount: string) => unstakeMutation.mutate(amount),
    claimRewards: () => claimMutation.mutate(),
    isStaking: stakeMutation.isPending,
    isUnstaking: unstakeMutation.isPending,
    isClaiming: claimMutation.isPending,
  };
}
