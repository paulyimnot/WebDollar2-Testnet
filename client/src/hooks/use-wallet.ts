import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl } from "@shared/routes";
import { useToast } from "./use-toast";
import { decryptPrivateKeyBrowser, signTransaction, calculatePoW } from "@/lib/crypto";

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
      const preRes = await fetch('/api/wallet/sign-preflight', { credentials: "include" });
      if (!preRes.ok) throw new Error("Failed to initialize secure transaction block.");
      const { encryptedPrivateKey, nonce } = await preRes.json();

      if (!encryptedPrivateKey) throw new Error("No primary wallet found for signing.");

      // 2. Decrypt key locally
      let privateKey: string | null = await decryptPrivateKeyBrowser(encryptedPrivateKey, password);

      // 3. Create and sign message - Measure local cryptographic overhead
      const message = JSON.stringify({ 
        recipientAddress: recipientAddress.trim(), 
        amount: parseFloat(amount).toString(), 
        nonce 
      });
      
      const signStart = performance.now();
      const signature = await signTransaction(message, privateKey);
      const overhead = performance.now() - signStart;
      
      // Cleanup sensitive data immediately
      privateKey = null;

      // 4. Send signed transaction
      const broadcastStart = performance.now();
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
      const broadcastTime = performance.now() - broadcastStart;

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Transfer failed");
      }
      return { ...(await res.json()), overhead, broadcastTime };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.explorer.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "TRANSACTION CONFIRMED",
        description: `Overhead: ${data.overhead.toFixed(4)}ms | Broadcast: ${data.broadcastTime.toFixed(2)}ms`,
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

  const privateTransferMutation = useMutation({
    mutationFn: async (data: { recipientAddress: string; amount: string; password?: string }) => {
      const { recipientAddress, amount, password } = data;
      
      if (!password) {
        throw new Error("Password required for transaction signing.");
      }

      const preRes = await fetch('/api/wallet/sign-preflight', { credentials: "include" });
      if (!preRes.ok) throw new Error("Failed to initialize secure transaction block.");
      const { encryptedPrivateKey, nonce } = await preRes.json();

      if (!encryptedPrivateKey) throw new Error("No primary wallet found for signing.");

      let privateKey: string | null = await decryptPrivateKeyBrowser(encryptedPrivateKey, password);

      const message = JSON.stringify({ 
        recipientAddress: recipientAddress.trim(), 
        amount: parseFloat(amount).toString(), 
        nonce 
      });
      
      const signStart = performance.now();
      const signature = await signTransaction(message, privateKey);
      const overhead = performance.now() - signStart;
      privateKey = null;

      const broadcastStart = performance.now();
      const res = await fetch("/api/wallet/transfer/private", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          recipientAddress, 
          amount, 
          signature, 
          nonce 
        }),
        credentials: "include",
      });
      const broadcastTime = performance.now() - broadcastStart;

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Private transfer failed");
      }
      return { ...(await res.json()), overhead, broadcastTime };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: [api.wallet.get.path] });
      queryClient.invalidateQueries({ queryKey: [api.wallet.addresses.list.path] });
      queryClient.invalidateQueries({ queryKey: [api.explorer.transactions.path] });
      queryClient.invalidateQueries({ queryKey: [api.transactions.mine.path] });
      toast({
        title: "PRIVATE TRANSFER CONFIRMED",
        description: `Privacy Shield: ${data.overhead.toFixed(4)}ms | Sync: ${data.broadcastTime.toFixed(2)}ms`,
        className: "border-accent text-accent bg-card font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "TRANSFER FAILED",
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
    privateTransfer: privateTransferMutation.mutate,
    isTransferring: transferMutation.isPending || privateTransferMutation.isPending,
  };
}
