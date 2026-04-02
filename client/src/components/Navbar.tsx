import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { Terminal, Cpu, RefreshCw, CreditCard, LogOut, Wallet, Menu, X, Coins, ShoppingCart, Shield, FileText, BookOpen, Rocket, Droplets } from "lucide-react";
import { useState } from "react";
import { Button } from "./ui/button";
import logoImg from "@assets/1771108919092_1771109065229.jpg";

export function Navbar() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [logoClicks, setLogoClicks] = useState(0);

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

        <Link href="/" onClick={(e) => {
          setLogoClicks(prev => {
            if (prev + 1 >= 5) {
              setLocation("/admin");
              return 0;
            }
            return prev + 1;
          });
        }} className="flex items-center space-x-4 group shrink-0">
          <img src={logoImg} alt="WebDollar 2" className="w-16 h-16 rounded-full object-cover border-2 border-accent/20" />
          <span className="font-heading font-extrabold text-2xl tracking-tight text-white group-hover:text-accent transition-colors hidden sm:inline">
            <span className="text-accent">WebDollar</span> <span className="text-primary text-base">2</span>
          </span>
        </Link>

        {/* The inline navigation block is completely removed to favor the hamburger menu */}

        <div className="flex items-center space-x-4">
          {user ? (
            <div className="flex items-center space-x-4">
              <span className="hidden md:inline font-mono text-xs text-muted-foreground">
                {user.username}
              </span>
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
                  className="w-full py-8 text-lg font-black uppercase shadow-lg shadow-destructive/20 border-2 border-destructive/50"
                  onClick={() => logout()}
                >
                  Terminate Session
                </Button>
              </>
            )}
            {!user && (
              <>
                <Link href="/auth">
                  <Button className="w-full py-8 text-xl font-black uppercase shadow-lg shadow-primary/20 btn-neon border-2 border-primary/50">Connect Wallet</Button>
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
