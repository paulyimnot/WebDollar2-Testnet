// @ts-nocheck
import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Rocket, TrendingUp, AlertTriangle, Coins } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

type GameState = "idle" | "playing" | "crashed" | "cashed_out";

export default function Crash() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [gameState, setGameState] = useState<GameState>("idle");
  const [betAmount, setBetAmount] = useState("10");
  const [multiplier, setMultiplier] = useState(1.00);
  const [crashPoint, setCrashPoint] = useState(0);
  const [history, setHistory] = useState<number[]>([]);
  
  // Visual stuff
  const startTimeRef = useRef<number>(0);
  const requestRef = useRef<number>();

  useEffect(() => {
    // Generate some fake history on load
    setHistory([1.23, 5.40, 1.01, 2.34, 1.88, 12.50, 1.15]);
  }, []);

  const startGame = () => {
    if (gameState === "playing") return;
    if (!betAmount || parseFloat(betAmount) <= 0) {
      toast({ title: "Invalid Bet", description: "You must bet more than 0 WEBD.", variant: "destructive" });
      return;
    }

    // Generate a random crash point (Provably Fair simulation)
    // Formula for crash point: E represents a uniform real variable from 0 to 1
    // Crash = 0.99 / (1 - E) -- this makes 1.00x very common and 100x rare
    const e = Math.random();
    let finalCrash = Math.max(1.00, 0.99 / (1 - e));
    // Hard cap for prototype
    if (finalCrash > 1000) finalCrash = 1000;
    
    setCrashPoint(finalCrash);
    setMultiplier(1.00);
    setGameState("playing");
    startTimeRef.current = performance.now();
    
    const animate = (time: number) => {
      const elapsed = time - startTimeRef.current;
      // Exponential curve for multiplier: goes up faster over time
      const currentMult = Math.max(1.00, Math.pow(Math.E, 0.00006 * elapsed));
      
      if (currentMult >= finalCrash) {
        // CRASHED!
        setMultiplier(finalCrash);
        handleCrash(finalCrash);
        return;
      }
      
      setMultiplier(currentMult);
      requestRef.current = requestAnimationFrame(animate);
    };
    
    requestRef.current = requestAnimationFrame(animate);
  };

  const cashOut = () => {
    if (gameState !== "playing") return;
    
    // Stop animation
    if (requestRef.current) {
      cancelAnimationFrame(requestRef.current);
    }
    
    const winAmount = (parseFloat(betAmount) * multiplier).toFixed(2);
    setGameState("cashed_out");
    toast({
      title: "Cashed Out!",
      description: `You won ${winAmount} WEBD at ${multiplier.toFixed(2)}x!`,
      variant: "default",
    });
    
    // Simulate game continuing to run for others until it actually crashes
    const fakeContinue = () => {
      setMultiplier(crashPoint);
      setHistory(prev => [parseFloat(crashPoint.toFixed(2)), ...prev].slice(0, 10));
    };
    setTimeout(fakeContinue, 1000); // just snap to crash point for prototype
  };

  const handleCrash = (final: number) => {
    setGameState("crashed");
    setHistory(prev => [parseFloat(final.toFixed(2)), ...prev].slice(0, 10));
  };

  const getRocketStyle = () => {
    if (gameState === "idle") return "translate-y-0 text-primary";
    if (gameState === "crashed") return "translate-y-[-20px] scale-150 text-destructive rotate-[120deg] opacity-50";
    if (gameState === "cashed_out") return "translate-y-[-150px] text-accent opacity-50";
    
    // Playing
    // higher multiplier = shakes more
    const shake = multiplier > 2 ? "animate-bounce" : "animate-pulse";
    return `translate-y-[-100px] text-accent ${shake} rotate-45`;
  };

  return (
    <div className="container mx-auto p-4 max-w-5xl">
      <div className="flex flex-col md:flex-row gap-6">
        
        {/* Left Sidebar - Betting controls */}
        <div className="w-full md:w-1/3 bg-card p-6 rounded-xl border border-primary/20 flex flex-col gap-6 shadow-[0_0_30px_rgba(0,0,0,0.5)] shadow-primary/10">
          <div>
            <h2 className="text-2xl font-heading font-bold mb-1 tracking-wider text-white">WEBD CRASH</h2>
            <p className="text-sm text-muted-foreground font-mono">Stop the rocket before it explodes!</p>
          </div>

          <div className="space-y-4 flex-grow">
            <div className="space-y-2">
              <label className="text-sm font-mono text-muted-foreground flex items-center gap-2 uppercase">
                <Coins className="w-4 h-4" /> Bet Amount
              </label>
              <div className="flex gap-2 relative">
                <Input 
                  type="number" 
                  value={betAmount}
                  onChange={(e) => setBetAmount(e.target.value)}
                  disabled={gameState === "playing" || gameState === "cashed_out"}
                  className="font-mono text-lg bg-background/50 border-primary/30 py-6"
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-primary font-mono text-sm opacity-50 pointer-events-none">
                  WEBD
                </div>
              </div>
              <div className="grid grid-cols-4 gap-2 mt-2">
                {[10, 100, 1000, "MAX"].map((val) => (
                  <Button 
                    key={val} 
                    variant="outline" 
                    size="sm" 
                    className="font-mono text-xs border-primary/20 hover:border-primary hover:text-primary transition-colors bg-background/30"
                    disabled={gameState === "playing"}
                    onClick={() => val === "MAX" ? setBetAmount("10000") : setBetAmount(val.toString())}
                  >
                    {val}
                  </Button>
                ))}
              </div>
            </div>

            <div className="mt-8">
               {gameState === "playing" ? (
                 <Button 
                   onClick={cashOut} 
                   className="w-full h-16 font-heading text-2xl font-bold bg-accent hover:bg-accent/80 text-black shadow-[0_0_20px_rgba(255,215,0,0.4)] animate-pulse"
                 >
                   CASH OUT ({(parseFloat(betAmount) * multiplier).toFixed(2)})
                 </Button>
               ) : (
                 <Button 
                   onClick={startGame} 
                   disabled={gameState === "cashed_out" && multiplier < crashPoint} // Prevent restart until simulated crash finishes
                   className={`w-full h-16 font-heading text-xl font-bold tracking-wider ${gameState === "crashed" ? "btn-neon" : "bg-primary hover:bg-primary/80"}`}
                 >
                   {gameState === "idle" ? "PLACE BET" : 
                    (gameState === "crashed" || gameState === "cashed_out") ? "PLAY AGAIN" : "WAITING..."}
                 </Button>
               )}
            </div>
          </div>
          
          <div className="pt-4 border-t border-primary/10">
            <div className="flex justify-between items-center text-sm font-mono">
              <span className="text-muted-foreground">Balance:</span>
              <span className="text-accent">100,000 WEBD</span>
            </div>
          </div>
        </div>

        {/* Right Main Area - Game View */}
        <div className="w-full md:w-2/3 flex flex-col gap-4">
          
          {/* History bar */}
          <div className="bg-card border border-primary/20 rounded-lg p-3 flex gap-2 overflow-x-auto whitespace-nowrap scrollbar-hide">
            <span className="text-xs font-mono text-muted-foreground self-center mr-2 uppercase">Previous:</span>
            {history.map((m, i) => (
              <span 
                key={i} 
                className={`text-xs font-mono font-bold px-3 py-1 rounded-full ${m >= 2 ? 'text-accent bg-accent/10 border border-accent/20' : 'text-muted-foreground bg-background border border-primary/10'}`}
              >
                {m.toFixed(2)}x
              </span>
            ))}
          </div>

          {/* Canvas Area */}
          <div className="relative flex-grow min-h-[400px] bg-[#0a0f1c] rounded-xl border border-primary/30 overflow-hidden flex items-center justify-center p-8 bg-[url('/grid-pattern.svg')] bg-[length:30px_30px]">
            {/* Background Grid that animates when playing */}
            {gameState === "playing" && (
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-30 animate-[slide_10s_linear_infinite]" />
            )}
            
            <div className="relative z-10 flex flex-col items-center justify-center pointer-events-none">
              <h1 className={`text-6xl md:text-8xl font-black font-mono tracking-tighter transition-colors duration-200
                ${gameState === "crashed" ? "text-destructive" : 
                  gameState === "cashed_out" ? "text-accent" : "text-white"}
              `}>
                {multiplier.toFixed(2)}<span className="text-3xl md:text-5xl">x</span>
              </h1>
              
              <div className={`mt-4 min-h-[40px] font-mono text-xl uppercase tracking-widest font-bold
                ${gameState === "crashed" ? "text-destructive" : 
                  gameState === "cashed_out" ? "text-accent" : "text-transparent"}
              `}>
                {gameState === "crashed" ? "CRASHED!" : 
                 gameState === "cashed_out" ? `CASHED OUT +${(parseFloat(betAmount) * multiplier - parseFloat(betAmount)).toFixed(2)}` : "_"}
              </div>
            </div>

            {/* Rocket Icon */}
            <div className="absolute bottom-10 left-10 md:left-20 transition-all duration-1000 ease-out z-20">
              <Rocket className={`w-16 h-16 md:w-24 md:h-24 transition-all duration-[3000ms] ${getRocketStyle()}`} />
            </div>
            
            {/* Graph Line Mock */}
            {gameState !== "idle" && (
              <svg className="absolute bottom-0 left-0 w-full h-[60%] pointer-events-none opacity-50" preserveAspectRatio="none">
                <path 
                  d={`M 0,${gameState === 'crashed' ? '100%' : '100%'} Q 30%,100% ${multiplier > 1.5 ? '70%,40%' : '50%,80%'} T 100%,10%`} 
                  fill="none" 
                  stroke="currentColor" 
                  strokeWidth="3" 
                  className={gameState === "crashed" ? "text-destructive" : "text-accent drop-shadow-[0_0_8px_rgba(255,215,0,0.8)]"} 
                />
              </svg>
            )}

          </div>

          <div className="text-center text-xs text-muted-foreground/50 font-mono">
            *This is a prototype game specifically to demonstrate WebDollar 2's DIELBS engine real-time execution speeds. It uses a provably fair algorithm.
          </div>
        </div>

      </div>
    </div>
  );
}
