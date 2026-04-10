import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Cpu, Activity, Zap, FileText, Shield, Network, Lock, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function Whitepaper() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 md:py-16 max-w-4xl relative">
        <Link href="/">
          <Button
            variant="outline"
            size="sm"
            className="mb-8 border-primary/20 text-muted-foreground hover:text-primary"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-12"
        >
          <div className="text-center space-y-6 mb-16 border-b-2 border-primary/20 pb-16">
            <div className="inline-flex items-center justify-center p-6 bg-primary/10 rounded-full mb-6 border-2 border-primary/20">
              <FileText className="w-16 h-16 text-primary" />
            </div>
            <h1 className="text-5xl md:text-7xl font-black font-heading text-white tracking-tight">
              WEBD2 <span className="text-accent">WHITEPAPER</span>
            </h1>
            <p className="font-mono text-primary font-bold uppercase text-lg tracking-[0.2em] bg-primary/5 py-2 rounded-md">
              A Scalably Inverted, Browser-Native Protocol
            </p>
            <div className="text-xs font-mono text-muted-foreground uppercase tracking-widest opacity-60">
              Protocol Version: 2.0.4-DIELBS | Technical Specification
            </div>
          </div>

          <div className="prose prose-invert prose-yellow max-w-none font-mono">
            {/* 1. ABSTRACT */}
            <section className="mb-16">
              <h2 className="text-3xl text-accent font-black mb-6 flex items-center border-l-8 border-accent pl-6 bg-accent/5 py-3 rounded-r-md uppercase tracking-tighter">
                Abstract
              </h2>
              <p className="text-white/90 text-lg leading-relaxed font-medium">
                The WEBD2ollar 2 (WEBD2) protocol introduces a structural inversion of traditional Layer-1 blockchain architectures. 
                Legacy networks rely on heavy, hardware-dependent verification which creates inevitable latency and fee-incentivized congestion. 
                WEBD2 replaces this bottleneck with a <strong>Browser-Native P2P Mesh</strong>. 
                By utilizing <strong>WebRTC</strong> for direct peer-to-peer signaling and <strong>WebAssembly (WASM)</strong> for near-native execution of cryptographic tasks, 
                WEBD2 operationalizes every end-user's device as a zero-trust consensus participant. 
                This paper explores the mechanics of <strong>Inverse Scalability</strong>, the proprietary logic of the <strong>DIELBS Execution Engine</strong>, 
                and the protocol-level solutions for security, double-spending, and financial privacy.
              </p>
            </section>

            {/* 2. TOPOGRAPHIC ROUTING */}
            <section className="mb-16">
              <h2 className="text-2xl text-accent font-bold mb-6 flex items-center border-l-4 border-accent pl-4 uppercase">
                1. The Browser-Native P2P Mesh
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Unlike traditional blockchains where users connect to centralized RPC nodes, every WEBD2 interface is a native network participant. 
                As soon as a user opens the dashboard, they initialize a <strong>Topographic Routing Node</strong> within their local environment.
              </p>
              
              <div className="grid md:grid-cols-2 gap-6 mb-8">
                <div className="bg-card/50 p-6 border border-primary/10 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-accent transition-colors"></div>
                  <h3 className="text-white font-bold mb-3 flex items-center uppercase tracking-wider text-sm">
                    <Globe className="w-5 h-5 mr-3 text-primary" /> WebRTC Signaling
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Browser nodes establish direct UDP-like streams using WebRTC. This allows for massive, decentralized broadcast of state increments without 
                    relying on any central server for data propagation. The network actually gets <strong>faster</strong> as more peers build new routing lanes.
                  </p>
                </div>
                <div className="bg-card/50 p-6 border border-primary/10 rounded-xl relative overflow-hidden group">
                  <div className="absolute top-0 left-0 w-1 h-full bg-primary/40 group-hover:bg-accent transition-colors"></div>
                  <h3 className="text-white font-bold mb-3 flex items-center uppercase tracking-wider text-sm">
                    <Shield className="w-5 h-5 mr-3 text-primary" /> WASM Verification
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Cryptographic signatures (secp256k1 & ed25519) are verified locally within a sandboxed WebAssembly execution environment. 
                    This ensures that the CPU overhead is offloaded to the edge, maintaining 100% security without slowing down the network's core.
                  </p>
                </div>
              </div>
            </section>

            {/* 3. DOUBLE SPEND PROTECTION */}
            <section className="mb-16">
              <h2 className="text-2xl text-accent font-bold mb-6 flex items-center border-l-4 border-accent pl-4 uppercase">
                2. Eliminating Double-Spending
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                In a decentralized system, preventing a user from sending the same coin to two different people simultaneously is critical. 
                WEBD2 solves this through a combination of <strong>Deterministic Timestamping</strong> and <strong>Asynchronous Batching</strong>.
              </p>
              <div className="bg-primary/5 p-6 rounded-lg border border-primary/10 space-y-4">
                <p className="text-sm text-white/80 leading-relaxed">
                  When a transaction is broadcasted, it is tagged with a high-resolution, peer-verified timestamp. 
                  If a user attempts to double-spend, the <strong>DIELBS Engine</strong> executes a <em>Trailing-Void Logic</em>:
                </p>
                <ul className="text-xs text-muted-foreground list-disc list-inside space-y-2 ml-4">
                  <li>DIELBS maintains an ephemeral memory buffer of all uncommitted state changes.</li>
                  <li>In the event of conflicting transactions, the engine instantly identifies the mathematical collision.</li>
                  <li>The transaction with the confirmed earlier timestamp is anchored, while the conflicting second attempt is eradicated from the buffer before it can ever be written to the ledger.</li>
                  <li>Because this happens in milliseconds, the "spending window" for an attacker is physically impossible to exploit.</li>
                </ul>
              </div>
            </section>

            {/* 4. ALIASES & PRIVATE TRANSACTIONS */}
            <section className="mb-16">
              <h2 className="text-2xl text-accent font-bold mb-6 flex items-center border-l-4 border-accent pl-4 uppercase">
                3. Privacy & Abstracted Identity
              </h2>
              <div className="space-y-6">
                <div className="p-6 bg-card/30 border border-primary/10 rounded-xl hover:border-accent/30 transition-colors">
                  <h3 className="text-xl text-white font-bold mb-3 flex items-center">
                    <Lock className="w-6 h-6 mr-3 text-accent" /> Secure Alias Resolution
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Aliases are managed via a <strong>One-Way Cryptographic Association</strong>. 
                    Your username/alias is not stored directly with your wallet balance in plain text. 
                    Instead, when someone sends funds to <code>user@webd2</code>, the network performs a secure lookup that resolves to your public address. 
                    This keeps the ledger human-readable for users while maintaining the underlying cryptographic entropy required for security.
                  </p>
                </div>
                
                <div className="p-6 bg-card/30 border border-primary/10 rounded-xl hover:border-accent/30 transition-colors">
                  <h3 className="text-xl text-white font-bold mb-3 flex items-center">
                    <Activity className="w-6 h-6 mr-3 text-primary" /> Private Transactions
                  </h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    Private transactions utilize a secure <strong>Payload Masking</strong> technique. 
                    When "Private Mode" is enabled, the DIELBS Engine processes the transaction using a blinded signature pathway. 
                    The total supply and validity are verified mathematically, but the specific sender and receiver identifiers are obfuscated 
                    within the block hash, making it impossible for external observers to trace the flow of individual coins on the public explorer.
                  </p>
                </div>
              </div>
            </section>

            {/* 5. MALICIOUS NODE HANDING */}
            <section className="mb-16">
              <h2 className="text-2xl text-accent font-bold mb-6 flex items-center border-l-4 border-accent pl-4 uppercase">
                4. Threat Mitigation: Malicious Nodes
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                WebDollar 2 is built with a <strong>Deterministically Hostile</strong> mindset. The protocol assumes every node could be malicious.
              </p>
              <div className="space-y-4">
                <div className="flex gap-4 items-start">
                  <div className="bg-red-500/10 p-2 rounded border border-red-500/20 text-red-400 font-black text-xs">REJECT</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Cryptographic Assertion:</strong> Every block and transaction must be signed. If a malicious node tries to inject a fake transaction, 
                    the EdDSA math instantly fails. Adjacent peers detect the signature mismatch and drop the payload before it ever reaches the DIELBS engine.
                  </p>
                </div>
                <div className="flex gap-4 items-start">
                  <div className="bg-red-500/10 p-2 rounded border border-red-500/20 text-red-400 font-black text-xs">ISOLATE</div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    <strong>Peer Quarantining:</strong> Nodes that repeatedly broadcast invalid data are automatically blacklisted by the P2P mesh. 
                    The network topologically "routes around" the problem, isolating the malicious node until it has zero peer connections, effectively cutting it off from the global ledger.
                  </p>
                </div>
              </div>
            </section>

            {/* 6. DIELBS ENGINE */}
            <section className="mb-16 bg-accent/5 border border-accent/20 rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full pointer-events-none"></div>
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center z-10 relative uppercase font-black">
                5. The DIELBS Engine: Proprietary Core
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6 relative z-10 italic">
                The absolute speed and stability of WEBD2 are driven by the DIELBS Engine—a proprietary execution module designed for extreme throughput.
              </p>
              <p className="text-sm text-white/80 leading-relaxed mb-4 relative z-10">
                While standard blockchains get bogged down by synchronous "waiting" (where every step must finish before the next begins), 
                DIELBS utilizes <strong>Massively Parallel State Caching</strong>. It effectively predicts and validates thousands of theoretical 
                network states every second, only committing the valid ones to the permanent record in ultra-fast 5-second batches.
              </p>
              <div className="bg-black/40 p-4 rounded border border-primary/20 text-[10px] sm:text-xs font-mono text-primary/70 leading-relaxed">
                <strong className="text-accent underline">SECURITY NOTICE:</strong> The specific algorithmic batching and memory-threading 
                logic of DIELBS remains closed-source to prevent adversarial reverse-engineering. It functions as a "black box" 
                execution layer that guarantees sub-millisecond local latency regardless of global network load.
              </div>
            </section>

             {/* 7. TOKENOMICS */}
             <section className="mb-16">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4 uppercase">
                6. TOKENOMICS & MIGRATION
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The monetary protocol maintains a fixed maximum constraint
                of <strong>68,000,000,000 WEBD2</strong>. 
                The distribution is strictly partitioned as follows:
              </p>
              <ul className="mt-4 space-y-2 text-xs text-muted-foreground">
                <li className="flex justify-between border-b border-primary/10 pb-2">
                  <span>V1 MIGRATION RESERVE (ACTIVE CLAIM ONLY)</span>
                  <span className="text-accent font-bold">14,200,000,000 WEBD2</span>
                </li>
                <li className="flex justify-between border-b border-primary/10 pb-2">
                  <span>PUBLIC BROWSER MINING CACHE (100 YEAR EMISSION)</span>
                  <span className="text-white font-bold">43,600,000,000 WEBD2</span>
                </li>
                <li className="flex justify-between border-b border-primary/10 pb-2">
                  <span>DEVELOPMENT & INFRASTRUCTURE RESERVE (10%)</span>
                  <span>6,800,000,000 WEBD2</span>
                </li>
                <li className="flex justify-between border-b border-primary/10 pb-2">
                  <span>FOUNDATION & ECOSYSTEM FUND (5%)</span>
                  <span>3,400,000,000 WEBD2</span>
                </li>
              </ul>
              <p className="text-[10px] text-muted-foreground mt-4 italic">
                Emission uses a 3-year halving cycle with a 5-second block time, ensuring sustained network incentive for a century of consensus participation.
              </p>
            </section>

            <div className="text-center pt-20 pb-12 border-t border-primary/20">
              <h2 className="text-4xl font-black text-white mb-8 tracking-tight">
                ARE YOU READY?
              </h2>
              <p className="text-white/70 text-2xl mb-12 max-w-2xl mx-auto font-bold leading-relaxed">
                The technology is live. The ledger is immutable. 
                Open your wallet and join the next generation of the financial web.
              </p>
              <Link href="/auth">
                <Button className="btn-neon text-2xl px-12 py-12 h-auto w-full sm:w-auto font-black tracking-widest shadow-2xl shadow-primary/30 border-2 border-primary/50">
                  GENERATE YOUR WALLET
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
