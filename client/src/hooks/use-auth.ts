import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api, type LoginRequest, type RegisterRequest } from "@shared/routes";
import { useToast } from "./use-toast";
import { useState } from "react";

export function useAuth() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pending2FA, setPending2FA] = useState<{ userId: number } | null>(null);

  const { data: user, isLoading: isLoadingUser, error } = useQuery({
    queryKey: [api.auth.me.path],
    queryFn: async () => {
      const res = await fetch(api.auth.me.path, { credentials: "include" });
      if (res.status === 401) return null;
      if (!res.ok) throw new Error("Failed to fetch user");
      return await res.json();
    },
    refetchInterval: 5000,
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginRequest) => {
      const res = await fetch(api.auth.login.path, {
        method: api.auth.login.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Login failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      if (data.requires2FA) {
        setPending2FA({ userId: data.userId });
        toast({
          title: "2FA REQUIRED",
          description: "Enter the 6-digit code from your authenticator app.",
          className: "border-primary text-primary bg-black font-mono",
        });
        return;
      }
      queryClient.setQueryData([api.auth.me.path], data);
      toast({
        title: "ACCESS GRANTED",
        description: `Welcome back, ${data.username}. System initialized.`,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "ACCESS DENIED",
        description: error.message,
        variant: "destructive",
        className: "font-mono border-destructive bg-black text-destructive",
      });
    },
  });

  const verify2FAMutation = useMutation({
    mutationFn: async ({ userId, code }: { userId: number; code: string }) => {
      const res = await fetch(api.auth.twoFactor.verify.path, {
        method: api.auth.twoFactor.verify.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, code }),
        credentials: "include",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Verification failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setPending2FA(null);
      queryClient.setQueryData([api.auth.me.path], data);
      toast({
        title: "ACCESS GRANTED",
        description: `Welcome back, ${data.username}. 2FA verified.`,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "VERIFICATION FAILED",
        description: error.message,
        variant: "destructive",
        className: "font-mono border-destructive bg-black text-destructive",
      });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (credentials: RegisterRequest) => {
      const res = await fetch(api.auth.register.path, {
        method: api.auth.register.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(credentials),
        credentials: "include",
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.message || "Registration failed");
      }
      return await res.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData([api.auth.me.path], data);
      toast({
        title: "IDENTITY CREATED",
        description: "Wallet generated. Welcome to WebDollar 2.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({
        title: "CREATION FAILED",
        description: error.message,
        variant: "destructive",
        className: "font-mono border-destructive bg-black text-destructive",
      });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await fetch(api.auth.logout.path, { method: api.auth.logout.method, credentials: "include" });
    },
    onSuccess: () => {
      queryClient.setQueryData([api.auth.me.path], null);
      toast({
        title: "DISCONNECTED",
        description: "Session terminated securely.",
        className: "border-primary text-primary bg-black font-mono",
      });
    },
  });

  return {
    user,
    isLoadingUser,
    login: loginMutation.mutate,
    register: registerMutation.mutate,
    logout: logoutMutation.mutate,
    verify2FA: verify2FAMutation.mutate,
    isLoggingIn: loginMutation.isPending,
    isRegistering: registerMutation.isPending,
    isVerifying2FA: verify2FAMutation.isPending,
    pending2FA,
    cancelPending2FA: () => setPending2FA(null),
  };
}
