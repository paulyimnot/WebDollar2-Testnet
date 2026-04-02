import { useState, useRef, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@shared/routes";
import { CyberCard } from "@/components/CyberCard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ShieldCheck, ShieldOff, Loader2, Copy, Check } from "lucide-react";

export function TwoFactorSettings() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [setupData, setSetupData] = useState<{ qrCodeUrl: string; secret: string } | null>(null);
  const [verifyCode, setVerifyCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disablePassword, setDisablePassword] = useState("");
  const [copiedSecret, setCopiedSecret] = useState(false);
  const codeInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (setupData && codeInputRef.current) {
      setTimeout(() => {
        codeInputRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
        codeInputRef.current?.focus();
      }, 300);
    }
  }, [setupData]);

  const { data: twoFAStatus, isLoading: isLoadingStatus } = useQuery({
    queryKey: [api.auth.twoFactor.status.path],
    queryFn: async () => {
      const res = await fetch(api.auth.twoFactor.status.path, { credentials: "include" });
      if (!res.ok) return { enabled: false };
      return await res.json();
    },
  });

  const setupMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(api.auth.twoFactor.setup.path, {
        method: api.auth.twoFactor.setup.method,
        headers: { "Content-Type": "application/json" },
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setSetupData(data);
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const enableMutation = useMutation({
    mutationFn: async (code: string) => {
      const res = await fetch(api.auth.twoFactor.enable.path, {
        method: api.auth.twoFactor.enable.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setSetupData(null);
      setVerifyCode("");
      queryClient.invalidateQueries({ queryKey: [api.auth.twoFactor.status.path] });
      toast({
        title: "2FA ENABLED",
        description: data.message,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Verification Failed", description: error.message, variant: "destructive" });
    },
  });

  const disableMutation = useMutation({
    mutationFn: async ({ code, password }: { code: string; password: string }) => {
      const res = await fetch(api.auth.twoFactor.disable.path, {
        method: api.auth.twoFactor.disable.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code, password }),
        credentials: "include",
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message);
      }
      return await res.json();
    },
    onSuccess: (data) => {
      setDisableCode("");
      setDisablePassword("");
      queryClient.invalidateQueries({ queryKey: [api.auth.twoFactor.status.path] });
      toast({
        title: "2FA DISABLED",
        description: data.message,
        className: "border-primary text-primary bg-black font-mono",
      });
    },
    onError: (error: Error) => {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    },
  });

  const handleCopySecret = () => {
    if (setupData?.secret) {
      navigator.clipboard.writeText(setupData.secret);
      setCopiedSecret(true);
      setTimeout(() => setCopiedSecret(false), 2000);
    }
  };

  const is2FAEnabled = twoFAStatus?.enabled;

  if (isLoadingStatus) {
    return (
      <CyberCard title="SECURITY" className="w-full">
        <div className="flex items-center justify-center py-6">
          <Loader2 className="animate-spin text-primary" />
        </div>
      </CyberCard>
    );
  }

  return (
    <CyberCard title="SECURITY" className="w-full">
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          {is2FAEnabled ? (
            <ShieldCheck className="w-6 h-6 text-accent" />
          ) : (
            <ShieldOff className="w-6 h-6 text-muted-foreground" />
          )}
          <div>
            <p className="font-mono text-sm font-bold">
              Two-Factor Authentication
            </p>
            <p className="text-xs text-muted-foreground font-mono">
              {is2FAEnabled
                ? "Enabled — your account is protected"
                : "Disabled — enable for extra security"}
            </p>
          </div>
        </div>

        {!is2FAEnabled && !setupData && (
          <Button
            onClick={() => setupMutation.mutate()}
            disabled={setupMutation.isPending}
            className="w-full btn-neon-filled"
            data-testid="button-2fa-setup"
          >
            {setupMutation.isPending ? <Loader2 className="animate-spin" /> : "Enable 2FA"}
          </Button>
        )}

        {setupData && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-xs font-mono text-primary/70">
              <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">1</span>
              Scan this QR code with your authenticator app:
            </div>
            <div className="flex justify-center p-4 bg-white rounded-md">
              <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" data-testid="img-2fa-qr" />
            </div>
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground font-mono">Or enter this secret manually:</p>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-input border border-primary/30 rounded-md px-3 py-2 text-xs font-mono break-all" data-testid="text-2fa-secret">
                  {setupData.secret}
                </code>
                <Button size="icon" variant="ghost" onClick={handleCopySecret} data-testid="button-copy-secret">
                  {copiedSecret ? <Check className="w-4 h-4 text-accent" /> : <Copy className="w-4 h-4" />}
                </Button>
              </div>
            </div>
            <div className="border-t border-primary/20 pt-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-mono text-primary/70">
                <span className="flex items-center justify-center w-5 h-5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold">2</span>
                Enter the 6-digit code from your app:
              </div>
              <Input
                ref={codeInputRef}
                value={verifyCode}
                onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="bg-input border-primary/30 font-mono focus-visible:ring-primary text-center text-xl tracking-[0.5em]"
                placeholder="000000"
                maxLength={6}
                data-testid="input-2fa-enable-code"
              />
            </div>
            <div className="flex gap-2">
              <Button
                onClick={() => {
                  setSetupData(null);
                  setVerifyCode("");
                }}
                variant="ghost"
                className="flex-1"
                data-testid="button-2fa-cancel-setup"
              >
                Cancel
              </Button>
              <Button
                onClick={() => enableMutation.mutate(verifyCode)}
                disabled={enableMutation.isPending || verifyCode.length !== 6}
                className="flex-1 btn-neon-filled"
                data-testid="button-2fa-enable-confirm"
              >
                {enableMutation.isPending ? <Loader2 className="animate-spin" /> : "Verify & Enable"}
              </Button>
            </div>
          </div>
        )}

        {is2FAEnabled && (
          <div className="space-y-3 border-t border-primary/20 pt-4">
            <p className="text-xs text-muted-foreground font-mono">
              To disable 2FA, enter your password and a code from your authenticator app:
            </p>
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70">PASSWORD</label>
              <Input
                type="password"
                value={disablePassword}
                onChange={(e) => setDisablePassword(e.target.value)}
                className="bg-input border-primary/30 font-mono focus-visible:ring-primary"
                placeholder="Your password..."
                data-testid="input-2fa-disable-password"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-mono text-primary/70">AUTHENTICATOR CODE</label>
              <Input
                value={disableCode}
                onChange={(e) => setDisableCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                className="bg-input border-primary/30 font-mono focus-visible:ring-primary text-center text-xl tracking-[0.5em]"
                placeholder="000000"
                maxLength={6}
                data-testid="input-2fa-disable-code"
              />
            </div>
            <Button
              onClick={() => disableMutation.mutate({ code: disableCode, password: disablePassword })}
              disabled={disableMutation.isPending || disableCode.length !== 6 || !disablePassword}
              variant="destructive"
              className="w-full"
              data-testid="button-2fa-disable"
            >
              {disableMutation.isPending ? <Loader2 className="animate-spin" /> : "Disable 2FA"}
            </Button>
          </div>
        )}
      </div>
    </CyberCard>
  );
}
