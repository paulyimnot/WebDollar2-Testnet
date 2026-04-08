import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";

export function useAddresses() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: addresses, isLoading } = useQuery({
    queryKey: [api.wallet.addresses.list.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.addresses.list.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch addresses");
      return await res.json();
    },
    refetchInterval: 5000,
  });

  const createMutation = useMutation({
    mutationFn: async (label?: string) => {
      const res = await fetch(api.wallet.addresses.create.path, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ label: label || "New Wallet" }),
        credentials: "include",
      });
      if (!res.ok) throw new Error("Failed to create address");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      toast({
        title: "ADDRESS CREATED",
        description: "New wallet address generated with seed phrase.",
        className: "border-accent text-accent bg-card font-mono",
      });
    },
  });

  const getPhraseMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl(api.wallet.addresses.getPhrase.path, { id });
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to get phrase");
      }
      return await res.json();
    },
    onError: (error: Error) => {
      toast({
        title: "ERROR",
        description: error.message,
        variant: "destructive",
        className: "font-mono",
      });
    },
  });

  const lockMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/wallet/addresses/:id/lock", { id });
      const res = await fetch(url, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to lock");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      toast({ title: "LOCKED", description: "Address locked. Seed phrase hidden.", className: "border-primary text-primary bg-card font-mono" });
    },
  });

  const unlockMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/wallet/addresses/:id/unlock", { id });
      const res = await fetch(url, { method: "PATCH", credentials: "include" });
      if (!res.ok) throw new Error("Failed to unlock");
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      toast({ title: "UNLOCKED", description: "Address unlocked.", className: "border-accent text-accent bg-card font-mono" });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const url = buildUrl("/api/wallet/addresses/:id", { id });
      const res = await fetch(url, { method: "DELETE", credentials: "include" });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to delete");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      toast({ title: "DELETED", description: "Address removed.", className: "border-destructive text-destructive bg-card font-mono" });
    },
    onError: (error: Error) => {
      toast({ title: "ERROR", description: error.message, variant: "destructive", className: "font-mono" });
    },
  });

  return {
    addresses,
    isLoading,
    createAddress: createMutation.mutate,
    isCreating: createMutation.isPending,
    getPhrase: getPhraseMutation.mutateAsync,
    isGettingPhrase: getPhraseMutation.isPending,
    lockAddress: lockMutation.mutate,
    unlockAddress: unlockMutation.mutate,
    deleteAddress: deleteMutation.mutate,
  };
}
