import { CyberCard } from "@/components/CyberCard";
import { Zap, Cpu, Globe, Users, Blocks, ShieldCheck } from "lucide-react";

export default function HowItWorks() {
  return (
    <div className="container mx-auto px-4 py-24 max-w-4xl">
      <div className="text-center mb-16">
        <h1 className="text-5xl font-black font-heading text-primary mb-6 leading-none">HOW IT WORKS</h1>
        <p className="font-mono text-muted-foreground text-lg uppercase tracking-widest">THE DIELBS CONSENSUS ENGINE</p>
      </div>

      <div className="space-y-8">
        <div className="grid md:grid-cols-2 gap-8 mb-12">
            <CyberCard className="p-8">
                <Globe className="w-12 h-12 text-accent mb-6" />
                <h3 className="text-2xl font-black text-white mb-4">Browser-Native</h3>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    WebDollar 2 is a "Zero-Install" blockchain. The mining client is written in TypeScript and WebAssembly, 
                    executing directly in your browser's V8 engine. There is no central server "mining" for you—your device is a validator node.
                </p>
            </CyberCard>
            <CyberCard className="p-8">
                <Zap className="w-12 h-12 text-primary mb-6" />
                <h3 className="text-2xl font-black text-white mb-4">5s Finality</h3>
                <p className="font-mono text-sm text-muted-foreground leading-relaxed">
                    Our Digital Integrated Emission Ledger Browser System (DIELBS) achieves deterministic finality. 
                    Unlike traditional Proof-of-Work, transactions are validated and settled in 5-second block intervals.
                </p>
            </CyberCard>
        </div>

        <CyberCard title="THE MINING CYCLE">
          <div className="space-y-6 font-mono text-sm">
            <div className="flex gap-4 items-center border-l-4 border-accent pl-6 bg-accent/5 py-4">
                <span className="text-3xl font-black text-accent/50">01</span>
                <p className="text-white">Your browser initializes a secure session and decrypts your wallet metadata using your secret.</p>
            </div>
            <div className="flex gap-4 items-center border-l-4 border-primary pl-6 bg-primary/5 py-4">
                <span className="text-3xl font-black text-primary/50">02</span>
                <p className="text-white">The DIELBS engine synchronizes the latest network head and begins hashing block candidates locally.</p>
            </div>
            <div className="flex gap-4 items-center border-l-4 border-accent pl-6 bg-accent/5 py-4">
                <span className="text-3xl font-black text-accent/50">03</span>
                <p className="text-white">On block resolution, your address is validated by the network's Proof-of-Stake weight for reward eligibility.</p>
            </div>
          </div>
        </CyberCard>

        <div className="prose prose-invert max-w-none font-mono text-sm text-muted-foreground mt-12 space-y-4">
            <h4 className="text-white text-xl uppercase font-black tracking-widest">Technological Specification</h4>
            <p>
                The DIELBS protocol utilizes a hybrid Proof-of-Stake/Proof-of-Consensus model. 
                Network resilience is maintained through a peer-to-peer signaling mesh that propagates transaction broadcast packets 
                to all active browser nodes within 500ms. 
            </p>
            <p>
                Total Supply is hard-capped at 68 Billion WEBD2. The emission schedule is calculated via a geometric halving decay 
                every 3 years, ensuring the network remains incentivized for over 100 years.
            </p>
        </div>
      </div>
    </div>
  );
}
