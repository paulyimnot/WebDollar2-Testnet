import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface CyberCardProps {
  children: ReactNode;
  className?: string;
  title?: string;
}

export function CyberCard({ children, className, title }: CyberCardProps) {
  return (
    <div className={cn("cyber-container group transition-all duration-300", className)}>
      {title && (
        <div className="absolute -top-3 left-4 bg-background px-2 text-accent font-heading text-sm font-bold tracking-widest border border-accent/30 rounded-sm">
          {title}
        </div>
      )}
      {children}
    </div>
  );
}
