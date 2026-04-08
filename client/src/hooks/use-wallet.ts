import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";
import { decryptPrivateKeyBrowser, signTransaction } from "@/lib/crypto";

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
    mutationFn: async (data: { recipientAddress: string; amount: string; password?: string }) => {
      const { recipientAddress, amount, password } = data;
      
      if (!password) {
        throw new Error("Password required for transaction signing.");
      }

      // 1. Fetch encrypted private key and network nonce
      // We'll use a specialized internal route for this
      const preRes = await fetch('/api/wallet/sign-preflight', { credentials: "include" });
      if (!preRes.ok) throw new Error("Failed to initialize secure transaction block.");
      const { encryptedPrivateKey, nonce, publicKey } = await preRes.ok ? await preRes.json() : { encryptedPrivateKey: null, nonce: null, publicKey: null };

      if (!encryptedPrivateKey) throw new Error("No primary wallet found for signing.");

      // 2. Decrypt key locally
      const privateKey = await decryptPrivateKeyBrowser(encryptedPrivateKey, password);

      // 3. Create and sign message
      // Note: Must match the server's message format exactly
      const message = JSON.stringify({ 
        recipientAddress: recipientAddress.trim(), 
        amount: parseFloat(amount).toString(), 
        nonce 
      });
      
      const signature = await signTransaction(message, privateKey);

      // 4. Send signed transaction
      const res = await fetch(api.wallet.transfer.path, {
        method: api.wallet.transfer.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          recipientAddress, 
          amount, 
          signature, 
          nonce 
        }),
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
