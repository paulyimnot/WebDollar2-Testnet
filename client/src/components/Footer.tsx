import logoImg from "@assets/1771108919092_1771109065229.jpg";
import { Link } from "wouter";

export function Footer() {
  return (
    <footer className="border-t border-primary/10 bg-background py-8 mt-auto">
      <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-xs font-mono text-muted-foreground">
        <div className="flex items-center gap-3">
          <img src={logoImg} alt="WDollar 2" className="w-20 h-20 rounded-full object-cover" />
          <span className="text-accent">NETWORK STATUS:</span> OPERATIONAL
        </div>

        <div className="flex flex-wrap gap-6 justify-center">
          <Link href="/protocol"><a className="hover:text-primary transition-colors cursor-pointer" data-testid="link-protocol">PROTOCOL HUB</a></Link>
          <Link href="/whitepaper"><a className="hover:text-primary transition-colors cursor-pointer" data-testid="link-whitepaper">WHITEPAPER</a></Link>
          <Link href="/blackpaper"><a className="hover:text-primary transition-colors cursor-pointer" data-testid="link-blackpaper">BLACKPAPER</a></Link>
          <a href="https://github.com/WebDollar/Node-WebDollar" target="_blank" className="hover:text-primary transition-colors" data-testid="link-github">GITHUB</a>
        </div>

        <div className="flex flex-col items-end gap-1">
          &copy; 2026 WDOLLAR 2 FOUNDATION
          <span className="text-[10px] opacity-50">v.2026.03.22.LATEST</span>
        </div>
      </div>
    </footer>
  );
}
