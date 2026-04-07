import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";

export function useWallet() {
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: wallet, isLoading: isLoadingWallet } = useQuery({
    queryKey: [api.wallet.get.path],
    queryFn: async () => {
      const res = await fetch(api.wallet.get.path, { credentials: "include" });
      if (!res.ok) throw new Error("Failed to fetch wallet");
      return await res.json();
    },
  });

  const transferMutation = useMutation({
    mutationFn: async (data: { recipientAddress: string; amount: string }) => {
      const res = await fetch(api.wallet.transfer.path, {
        method: api.wallet.transfer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
        credentials: "include",
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Transfer failed");
      }
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.explorer.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "TRANSACTION CONFIRMED",
        description: "Funds transferred successfully.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "TRANSACTION FAILED",
        description: error.message,
        variant: "destructive",
        className: "font-mono border-destructive bg-black text-destructive",
      });
    },
  });

  return {
    wallet,
    isLoadingWallet,
    transfer: transferMutation.mutate,
    isTransferring: transferMutation.isPending,
  };
}
