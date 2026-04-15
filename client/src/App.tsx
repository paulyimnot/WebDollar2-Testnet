import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HelpChat } from "@/components/HelpChat";
import { useAuth } from "@/hooks/use-auth";
import { useState, useEffect } from "react";

import Home from "@/pages/Home";
import Auth from "@/pages/Auth";
import Wallet from "@/pages/Wallet";
import Miner from "@/pages/Miner";
import Conversion from "@/pages/Conversion";
import Explorer from "@/pages/Explorer";
import CardPage from "@/pages/Card";
import Buy from "@/pages/Buy";
import Admin from "@/pages/Admin";
import Whitepaper from "@/pages/Whitepaper";
import Blackpaper from "@/pages/Blackpaper";
import Faucet from "@/pages/Faucet";
import HowItWorks from "@/pages/HowItWorks";
import Security from "@/pages/Security";
import NotFound from "@/pages/not-found";

function Router() {
  const { user } = useAuth();
  const [location] = useLocation();
  const [announcement, setAnnouncement] = useState(() => localStorage.getItem("webd2_announcement") || "");

  // Listen for storage changes to update the banner across tabs
  useEffect(() => {
    const handleStorage = () => {
      setAnnouncement(localStorage.getItem("webd2_announcement") || "");
    };
    window.addEventListener("storage", handleStorage);
    // Also poll slightly for local-tab updates
    const interval = setInterval(handleStorage, 2000);
    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  // Render standalone 'ecosystem' apps without the main WebDollar 2 navbar/footer
  if (location === "/faucet") {
    return (
      <div className="min-h-screen bg-background text-foreground font-body">
        {/* GLOBAL TESTNET DISCLAIMER BANNER */}
        <div className="bg-red-900/90 text-white py-1.5 px-4 text-center font-mono text-[10px] sm:text-xs font-bold tracking-wide border-b border-red-500/50 sticky top-0 z-[100] shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
          ⚠️ TESTNET NOTICE: Testnet coins have <strong>NO VALUE</strong>. The WebDollar Dev team reserves the right to stop, alter, reset, or change the Testnet at any time without notice. 
        </div>
        <Switch>
          <Route path="/faucet" component={Faucet} />
        </Switch>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
      {/* GLOBAL TESTNET DISCLAIMER BANNER */}
      <div className="bg-red-900/90 text-white py-1.5 px-4 text-center font-mono text-[10px] sm:text-xs font-bold tracking-wide border-b border-red-500/50 sticky top-0 z-[100] shadow-[0_4px_20px_rgba(220,38,38,0.3)]">
        ⚠️ TESTNET NOTICE: Testnet coins have <strong>NO VALUE</strong>. The WebDollar Dev team reserves the right to stop, alter, reset, or change the Testnet at any time without notice. 
      </div>

      {announcement && (
        <div className="bg-accent text-black py-2 px-4 text-center font-mono text-sm font-black tracking-widest relative z-[60] shadow-[0_4px_20px_rgba(255,193,44,0.3)] animate-pulse">
          <span className="mr-2">📢</span> OPERATOR ANNOUNCEMENT: {announcement.toUpperCase()}
          <button 
            onClick={() => {
              localStorage.removeItem("webd2_announcement");
              setAnnouncement("");
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 text-black/50 hover:text-black"
          >
            ×
          </button>
        </div>
      )}
      <Navbar />
      <main className="flex-grow">
        <Switch>
          <Route path="/" component={Home} />
          <Route path="/auth" component={Auth} />
          <Route path="/wallet" component={Wallet} />
          <Route path="/miner" component={Miner} />
          <Route path="/conversion" component={Conversion} />
          <Route path="/explorer" component={Explorer} />
          <Route path="/card" component={CardPage} />
          <Route path="/buy" component={Buy} />
          <Route path="/admin" component={Admin} />
          <Route path="/whitepaper" component={Whitepaper} />
          <Route path="/blackpaper" component={Blackpaper} />
          <Route path="/how-it-works" component={HowItWorks} />
          <Route path="/security" component={Security} />
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

import { useP2P } from "@/hooks/use-p2p";

function App() {
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);
  // 📡 Initialize P2P Mesh Networking
  const { peerId, isConnected, isBackbone } = useP2P();
  const { user } = useAuth();
  const [wakeLock, setWakeLock] = useState<any>(null);

  // 📡 Global Heartbeat for Mining Rewards & Backbone Status
  useEffect(() => {
    if (!user) return;
    
    const sendHeartbeat = async () => {
      try {
        await fetch("/api/user/heartbeat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ isBackbone }),
        });
      } catch (e) {
        console.warn("Heartbeat failed", e);
      }
    };
    
    sendHeartbeat(); // Immediate sync
    const interval = setInterval(sendHeartbeat, 30000);
    return () => clearInterval(interval);
  }, [user, isBackbone]);

  // 🔒 Global Wake Lock Logic for Backbone Mode
  useEffect(() => {
    const requestWakeLock = async () => {
      try {
        if (isBackbone && (navigator as any).wakeLock) {
          const lock = await (navigator as any).wakeLock.request('screen');
          setWakeLock(lock);
          console.log("🔒 Global Screen Wake Lock Active - BACKBONE MODE");
        } else if (!isBackbone && wakeLock) {
           wakeLock.release().then(() => setWakeLock(null));
        }
      } catch (err) {
        console.warn("Wake Lock failed:", err);
      }
    };
    requestWakeLock();
    return () => { if (wakeLock) wakeLock.release(); };
  }, [isBackbone]);

  useEffect(() => {
    try {
      const channel = new BroadcastChannel('webdollar2_tab_lock');
      
      // Ping network immediately to ask if any brother tab is currently handling processing
      channel.postMessage({ type: 'CHECK_ACTIVE_TABS' });
      
      channel.onmessage = (event) => {
        if (event.data.type === 'CHECK_ACTIVE_TABS') {
          // A new tab just opened! Shut it down by declaring supreme execution privilege
          if(!isDuplicateTab) channel.postMessage({ type: 'I_AM_ACTIVE' });
        } else if (event.data.type === 'I_AM_ACTIVE') {
          // If we receive the dominant beacon from a pre-existing tab, surrender and kill render loop
          setIsDuplicateTab(true);
        }
      };

      return () => channel.close();
    } catch (e) {
      console.warn("Broadcast channel inherently unvailable (Old browser), disregarding strict-tab policy.");
    }
  }, [isDuplicateTab]);

  if (isDuplicateTab) {
    return (
      <div className="min-h-screen bg-[#020817] text-red-500 font-mono flex flex-col items-center justify-center p-8 text-center border-4 sm:border-8 border-red-900/50 shadow-[inset_0_0_100px_rgba(220,38,38,0.2)]">
        <h1 className="text-4xl md:text-6xl font-black mb-6 tracking-widest font-heading drop-shadow-[0_0_15px_rgba(220,38,38,0.8)]">⚠️ TAB LOCKED</h1>
        <p className="text-lg md:text-2xl text-white max-w-2xl font-bold">Only <strong className="text-accent underline text-3xl">ONE</strong> active WebDollar 2 Wallet is permitted per device!</p>
        <p className="text-sm md:text-base mt-6 text-red-400 bg-red-900/20 px-6 py-4 rounded-lg border border-red-500/30">
          Strict Security Mode: This restriction prevents race conditions in the browser-native DIELBS consensus engine and ensures your cryptographic keys are isolated to a single execution context.<br/>
          <strong>Please close this tab and return to your original active session!</strong>
        </p>
      </div>
    );
  }

  return (
    <QueryClientProvider client={queryClient}>
      <Toaster />
      <Router />
      <HelpChat />
    </QueryClientProvider>
  );
}

export default App;
