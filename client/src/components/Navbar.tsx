import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Cpu, RefreshCw, CreditCard, LogOut, Wallet, Menu, X, Coins, ShoppingCart, Shield, FileText, BookOpen, Rocket, Droplets, Radio } from "lucide-react";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "./ui/button";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);

  const { data: networkStats } = useQuery({
    queryKey: ["/api/network/stats"],
    queryFn: async () => {
      const res = await fetch("/api/network/stats");
      if (!res.ok) throw new Error("Stats fetch failed");
      return await res.json();
    },
    refetchInterval: 15000,
    staleTime: 30000,
    placeholderData: (prev: any) => prev,
  });

  const peerCount = networkStats?.connectedPeers || 0;

  const isActive = (path: string) => location === path;

  const NavItem = ({ href, children, icon: Icon }: any) => (
    <Link href={href} onClick={() => setIsOpen(false)} className={`
      flex items-center space-x-2 px-4 py-2 font-mono text-sm uppercase tracking-wider border-b-2 transition-all duration-300
      ${isActive(href)
        ? "border-accent text-accent text-gold-glow bg-accent/5"
        : "border-transparent text-muted-foreground hover:text-primary hover:border-primary/50"}
    `}>
      <Icon className="w-4 h-4" />
      <span>{children}</span>
    </Link>
  );

  return (
    <nav className="sticky top-0 z-50 w-full border-b border-primary/20 bg-background/90 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between gap-4">

        <Link href="/" className="flex items-center space-x-4 group shrink-0">
          <img src={logoImg} alt="WebDollar 2" className="w-16 h-16 rounded-full object-cover border-2 border-accent/20" />
          <span className="font-heading font-extrabold text-2xl tracking-tight text-white group-hover:text-accent transition-colors hidden sm:inline">
            <span className="text-accent">WebDollar</span> <span className="text-primary text-base">2</span>
          </span>
        </Link>

        {/* LIVE PEER INDICATOR */}
        <div className="hidden sm:flex items-center gap-1.5 bg-green-500/10 border border-green-500/20 rounded-full px-3 py-1 cursor-default" title={`${peerCount} active peers on the network`}>
          <div className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
          <Radio className="w-3 h-3 text-green-400/70" />
          <span className="text-[10px] font-mono font-black text-green-400 tracking-wider">{peerCount}</span>
          <span className="text-[9px] font-mono text-green-400/50 uppercase hidden md:inline">peers</span>
        </div>

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="hidden md:inline font-mono text-xs text-muted-foreground">
                {user.username}
              </span>
              {user.isDev && (
                <Link href="/admin">
                  <Button variant="ghost" size="sm" className="text-accent hover:text-accent/80">
                    <Shield className="w-4 h-4 mr-2" />
                    ADMIN
                  </Button>
                </Link>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => logout()}
                className="hidden md:flex border-destructive/50 text-destructive"
                data-testid="button-logout"
              >
                <LogOut className="w-4 h-4 mr-2" />
                EXIT
              </Button>
            </div>
          ) : (
            <Link href="/auth">
              <Button size="sm" className="btn-neon flex" data-testid="button-login">
                Connect Wallet
              </Button>
            </Link>
          )}

          {/* Show the hamburger menu ONLY when logged in */}
          {user && (
            <button
              className="text-accent p-3 border-2 border-accent/40 rounded-lg bg-accent/5 ml-4"
              onClick={() => setIsOpen(!isOpen)}
              data-testid="button-mobile-menu"
            >
              {isOpen ? <X className="w-8 h-8" /> : <Menu className="w-8 h-8" />}
            </button>
          )}
        </div>
      </div>

      {isOpen && (
        <div className="border-b border-primary/20 bg-background p-6 space-y-6">
          <div className="flex flex-col space-y-4">
            <div className="text-[10px] font-mono text-primary/30 uppercase tracking-[0.2em] mb-2 px-4">Navigation Network</div>
            <NavItem href="/" icon={Terminal} className="py-4 text-base">Home</NavItem>
            <NavItem href="/explorer" icon={Cpu} className="py-4 text-base">Explorer</NavItem>
            {user && (
              <>
                <NavItem href="/wallet" icon={Wallet} className="py-4 text-base">Wallet</NavItem>
                <NavItem href="/miner" icon={Coins} className="py-4 text-base">Miner</NavItem>
                <NavItem href="/conversion" icon={RefreshCw} className="py-4 text-base">Swap</NavItem>
                <NavItem href="/card" icon={CreditCard} className="py-4 text-base">Card</NavItem>
                <NavItem href="/buy" icon={ShoppingCart} className="py-4 text-base">Buy</NavItem>
                {user.isDev && <NavItem href="/admin" icon={Shield} className="py-4 text-base">Admin</NavItem>}
                <div className="border-t border-primary/20 my-4 pt-4">
                  <NavItem href="/blackpaper" icon={BookOpen} className="py-4 text-base">Black Paper</NavItem>
                  <NavItem href="/whitepaper" icon={FileText} className="py-4 text-base">White Paper</NavItem>
                </div>
                <Button
                  variant="destructive"
                  className="w-full max-w-sm mx-auto py-4 text-sm font-black uppercase shadow-md shadow-destructive/20 border border-destructive/50"
                  onClick={() => logout()}
                >
                  Terminate Session
                </Button>
              </>
            )}
            {!user && (
              <>
                <Link href="/auth">
                  <Button className="w-full py-5 text-lg font-black uppercase shadow-lg shadow-primary/20 btn-neon border border-primary/50">Connect Wallet</Button>
                </Link>
                <div className="border-t border-primary/20 pt-4 flex flex-col space-y-2">
                  <NavItem href="/blackpaper" icon={BookOpen} className="py-4 text-base">Black Paper</NavItem>
                  <NavItem href="/whitepaper" icon={FileText} className="py-4 text-base">White Paper</NavItem>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
}
