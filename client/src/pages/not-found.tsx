import { Link } from "wouter";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-black p-4">
      <div className="border border-destructive/50 bg-destructive/5 p-12 rounded-lg text-center cyber-container">
        <AlertTriangle className="w-24 h-24 text-destructive mx-auto mb-6 animate-pulse" />
        <h1 className="text-6xl font-heading text-destructive mb-4">404</h1>
        <p className="font-mono text-destructive/80 mb-8 text-xl">
          SYSTEM ERROR: PAGE NOT FOUND
        </p>
        <Link href="/">
          <Button className="btn-neon border-destructive text-destructive hover:bg-destructive hover:text-white hover:shadow-[0_0_20px_rgba(255,0,0,0.4)]">
            RETURN TO ROOT
          </Button>
        </Link>
      </div>
    </div>
  );
}
