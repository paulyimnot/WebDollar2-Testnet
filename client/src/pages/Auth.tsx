import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useLocation } from "wouter";
import { CyberCard } from "@/components/CyberCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { api } from "@shared/routes";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

export default function Auth() {
  const [_, setLocation] = useLocation();
  const { login, register, verify2FA, isLoggingIn, isRegistering, isVerifying2FA, user, pending2FA, cancelPending2FA } = useAuth();
  const { toast } = useToast();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");

  const [resetUsername, setResetUsername] = useState("");
  const [seedPhrase, setSeedPhrase] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isResetting, setIsResetting] = useState(false);

  useEffect(() => {
    if (!user) {
      setUsername("");
      setPassword("");
      setTotpCode("");
    }
  }, [user]);

  if (user) {
    setLocation("/wallet");
    return null;
  }

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    login({ username, password });
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    register({ username, password });
  };

  const handle2FAVerify = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending2FA) return;
    verify2FA({ userId: pending2FA.userId, code: totpCode });
    setTotpCode("");
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetUsername || !seedPhrase || !newPassword) return;
    if (newPassword.length < 6) {
      toast({ title: "Error", description: "New password must be at least 6 characters", variant: "destructive" });
      return;
    }
    setIsResetting(true);
    try {
      const res = await fetch(api.auth.resetPassword.path, {
        method: api.auth.resetPassword.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: resetUsername, seedPhrase, newPassword }),
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Reset Failed", description: data.message, variant: "destructive" });
      } else {
        toast({
          title: "PASSWORD RESET",
          description: data.message,
          className: "border-primary text-primary bg-black font-mono",
        });
        setResetUsername("");
        setSeedPhrase("");
        setNewPassword("");
      }
    } catch {
      toast({ title: "Error", description: "Something went wrong. Please try again.", variant: "destructive" });
    } finally {
      setIsResetting(false);
    }
  };

  if (pending2FA) {
    return (
      <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

        <div className="flex flex-col items-center z-10 w-full max-w-md">
          <img src={logoImg} alt="WDollar 2" className="w-28 h-28 rounded-full object-cover mb-6" />

          <CyberCard title="TWO-FACTOR AUTHENTICATION" className="w-full">
            <div className="flex flex-col items-center gap-4 mb-4">
              <ShieldCheck className="w-12 h-12 text-primary" />
              <p className="text-sm text-muted-foreground font-mono text-center">
                Enter the 6-digit code from your authenticator app to complete login.
              </p>
            </div>
            <form onSubmit={handle2FAVerify} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-mono text-primary/70">VERIFICATION CODE</label>
                <Input
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                  className="bg-input border-primary/30 font-mono focus-visible:ring-primary text-center text-2xl tracking-[0.5em]"
                  placeholder="000000"
                  maxLength={6}
                  autoFocus
                  data-testid="input-2fa-code"
                />
              </div>
              <Button
                type="submit"
                disabled={isVerifying2FA || totpCode.length !== 6}
                className="w-full btn-neon-filled mt-4"
                data-testid="button-2fa-verify"
              >
                {isVerifying2FA ? <Loader2 className="animate-spin" /> : "VERIFY"}
              </Button>
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  cancelPending2FA();
                  setTotpCode("");
                }}
                className="w-full text-muted-foreground"
                data-testid="button-2fa-cancel"
              >
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </form>
          </CyberCard>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[80vh] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-primary/10 via-background to-background"></div>

      <div className="flex flex-col items-center z-10 w-full max-w-md">
        <img src={logoImg} alt="WDollar 2" className="w-36 h-36 rounded-full object-cover mb-8 border-4 border-accent/20 shadow-[0_0_30px_rgba(255,215,0,0.2)]" />

        <CyberCard title="NETWORK ACCESS" className="w-full">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-transparent border-b border-primary/20 mb-6">
              <TabsTrigger
                value="login"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-heading uppercase text-xs sm:text-sm"
                data-testid="tab-login"
              >
                Login
              </TabsTrigger>
              <TabsTrigger
                value="register"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-heading uppercase text-xs sm:text-sm"
                data-testid="tab-register"
              >
                Register
              </TabsTrigger>
              <TabsTrigger
                value="reset"
                className="data-[state=active]:bg-primary/20 data-[state=active]:text-primary font-heading uppercase text-xs sm:text-sm"
                data-testid="tab-reset"
              >
                Reset
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-4">
                  <label className="text-sm font-mono text-primary font-bold tracking-widest uppercase">USERNAME</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-2 border-primary/30 font-mono py-8 text-xl text-white"
                    placeholder="Enter alias..."
                    data-testid="input-login-username"
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <label className="text-sm font-mono text-primary font-bold tracking-widest uppercase">PASSWORD</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-2 border-primary/30 font-mono py-8 text-xl text-white"
                    placeholder="Enter passphrase..."
                    data-testid="input-login-password"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase font-bold tracking-wider text-center mt-6">
                  ⚠️ Reminder: Login is case-sensitive, of course.
                </p>
                <div className="flex justify-center mt-6">
                  <Button type="submit" disabled={isLoggingIn} className="w-1/2 btn-neon-filled py-6 text-sm font-bold tracking-widest" data-testid="button-login-submit">
                    {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
                    AUTHENTICATE
                  </Button>
                </div>
              </form>
            </TabsContent>

            <TabsContent value="register">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="space-y-4">
                  <label className="text-sm font-mono text-primary font-bold tracking-widest uppercase">NEW USERNAME</label>
                  <Input
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="bg-input border-2 border-primary/30 font-mono py-8 text-xl text-white"
                    placeholder="Create alias..."
                    data-testid="input-register-username"
                  />
                </div>
                <div className="space-y-4 pt-2">
                  <label className="text-sm font-mono text-primary font-bold tracking-widest uppercase">NEW PASSWORD</label>
                  <Input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="bg-input border-2 border-primary/30 font-mono py-8 text-xl text-white"
                    placeholder="Min 6 characters..."
                    data-testid="input-register-password"
                  />
                </div>
                <p className="text-[10px] text-muted-foreground font-mono uppercase font-bold tracking-wider leading-relaxed bg-black/40 p-3 rounded border border-primary/10">
                  ⚡ SECURE: A unique cryptographic wallet with a 12-word seed phrase will be generated for your browser.
                </p>
                <Button type="submit" disabled={isRegistering} className="w-full btn-gold mt-8 py-10 text-2xl font-black tracking-widest" data-testid="button-register-submit">
                  {isRegistering ? <Loader2 className="w-6 h-6 animate-spin" /> : "GENERATE WALLET"}
                </Button>
              </form>
            </TabsContent>

            <TabsContent value="reset">
              <form onSubmit={handleResetPassword} className="space-y-4">
                <p className="text-xs text-muted-foreground font-mono mb-2">
                  Reset your password using your wallet's seed phrase.
                </p>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-primary/70">USERNAME</label>
                  <Input
                    value={resetUsername}
                    onChange={(e) => setResetUsername(e.target.value)}
                    className="bg-input border-primary/30 font-mono focus-visible:ring-primary"
                    placeholder="Your username..."
                    data-testid="input-reset-username"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-primary/70">SEED PHRASE</label>
                  <textarea
                    value={seedPhrase}
                    onChange={(e) => setSeedPhrase(e.target.value)}
                    className="w-full bg-input border border-primary/30 font-mono focus-visible:ring-primary rounded-md p-3 text-sm text-foreground placeholder:text-muted-foreground min-h-[80px] resize-none"
                    placeholder="Enter your 12-word seed phrase..."
                    data-testid="input-reset-seed"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-mono text-primary/70">NEW PASSWORD</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="bg-input border-primary/30 font-mono focus-visible:ring-primary"
                    placeholder="Min 6 characters..."
                    data-testid="input-reset-password"
                  />
                </div>
                <Button type="submit" disabled={isResetting || !resetUsername || !seedPhrase || !newPassword} className="w-full btn-neon-filled mt-4" data-testid="button-reset-submit">
                  {isResetting ? <Loader2 className="animate-spin" /> : "RESET PASSWORD"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CyberCard>
      </div>
    </div>
  );
}
