import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { HelpChat } from "@/components/HelpChat";
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
import Crash from "@/pages/Crash";
import Faucet from "@/pages/Faucet";
import NotFound from "@/pages/not-found";

function Router() {
  const [location] = useLocation();

  // Render standalone 'ecosystem' apps without the main WebDollar 2 navbar/footer
  if (location === "/crash" || location === "/faucet") {
    return (
      <div className="min-h-screen bg-background text-foreground font-body">
        <Switch>
          <Route path="/crash" component={Crash} />
          <Route path="/faucet" component={Faucet} />
        </Switch>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-background text-foreground font-body">
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
          <Route component={NotFound} />
        </Switch>
      </main>
      <Footer />
    </div>
  );
}

function App() {
  const [isDuplicateTab, setIsDuplicateTab] = useState(false);

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
          Strict Security Mode Enabled.<br/>Please persistently close this duplicate tab and universally return to your original active tab to continue sending, mining, or interacting!
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
