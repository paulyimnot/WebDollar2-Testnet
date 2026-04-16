import { ShieldAlert, Cpu, Network, Zap, Lock, BookOpen, TerminalSquare, SearchCode } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Link } from "wouter";

export default function DeveloperHub() {
  return (
    <div className="container mx-auto px-4 py-8 space-y-12">
      {/* HEADER */}
      <div className="border-b border-primary/20 pb-8">
        <h1 className="text-4xl md:text-5xl font-heading font-black text-white flex items-center mb-4 leading-tight">
          <TerminalSquare className="mr-4 w-12 h-12 text-primary" />
          DEVELOPER & PROTOCOL HUB
        </h1>
        <p className="font-mono text-primary/80 lg:w-2/3">
          The definitive architectural guide and adversarial testing portal for the WebDollar 2 Network. 
          Auditors and third-party developers can utilize this hub to perform "Black-Box" execution tests, verify TPS, and mathematically confirm network security.
        </p>
      </div>

      {/* SECTION 1: CONSENSUS ARCHITECTURE */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-accent pl-4">
          <Cpu className="w-8 h-8 text-accent" />
          <h2 className="text-2xl font-bold font-heading tracking-widest text-white">PROPRIETARY CONSENSUS (DIELBS)</h2>
        </div>
        
        <Card className="bg-[#020817] border-primary/20 shadow-[0_0_20px_rgba(255,193,44,0.05)]">
          <CardContent className="p-6 md:p-8 space-y-6">
            <div>
              <h3 className="text-xl font-bold font-heading text-primary mb-2">Decoupled Instant Execution with Lazy Block Settlement</h3>
              <p className="text-white/80 font-mono text-sm leading-relaxed mb-4">
                The core engine of WebDollar 2 is powered by <strong>DIELBS</strong>. It is a next-generation consensus framework designed for massive Browser-Mesh scalability natively over WebRTC and secure WebSocket layers.
              </p>
              <div className="bg-black border border-white/10 p-4 rounded-md font-mono text-sm text-white/70 space-y-3">
                <p><span className="text-accent font-bold">Decoupled Instant Execution:</span> Transactions are mathematically validated, cryptographic nonces are verified, and account balances are strictly locked via Database State Machine isolated from the heavy block-creation pipeline. This yields immediate finalized outcomes.</p>
                <p><span className="text-green-500 font-bold">Lazy Block Settlement:</span> The global block builder casually sweeps the finalized state pool at standard intervals (e.g. 5 seconds) to physically write cryptographic hashes onto the absolute global chain, decoupled from the user-facing latency.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 bg-red-950/20 border border-red-900/50 p-4 rounded-md">
              <Lock className="w-6 h-6 text-red-500 shrink-0 mt-1" />
              <div>
                <h4 className="text-red-400 font-bold font-heading mb-1">CLOSED-SOURCE CORE</h4>
                <p className="text-white/60 font-mono text-sm">
                  To protect against immediate malicious cloning and maintain maximum ecosystem valuation, the absolute internal source code of the DIELBS engine evaluates as <strong>Proprietary / Closed-Source</strong>. 
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>

      {/* SECTION 2: BLACK-BOX AUDITING */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-green-500 pl-4">
          <SearchCode className="w-8 h-8 text-green-500" />
          <h2 className="text-2xl font-bold font-heading tracking-widest text-white">BLACK-BOX AUDITING STANDARDS</h2>
        </div>
        
        <div className="bg-[#020817] p-8 rounded-xl border border-green-500/20 space-y-4">
          <p className="font-mono text-white/80 leading-relaxed">
            While the DIELBS core remains proprietary, WebDollar 2 strictly adheres to the highest global standards of <strong>Minimum Proof Spec Credibility</strong>. We allow, and actively encourage, third-party technical reviewers to perform <em>Black-Box Execution and Measurement</em>. 
          </p>
          <p className="font-mono text-green-400/80 leading-relaxed">
            Auditors do not need to read the code to verify its integrity. You are provided native tools to generate massive load constraints and observe the mathematical Outputs (Latencies, TPS, Dropped Connections) in real-time.
          </p>
        </div>
      </section>

      {/* SECTION 3: ADVERSARIAL TESTING TOOLS */}
      <section className="space-y-6">
        <div className="flex items-center gap-3 border-l-4 border-red-500 pl-4">
          <ShieldAlert className="w-8 h-8 text-red-500" />
          <h2 className="text-2xl font-bold font-heading tracking-widest text-white">ADVERSARIAL TESTING TERMINALS</h2>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Card 1: Double Spend */}
          <Card className="bg-red-950/20 border-red-900 hover:border-red-500 transition-colors">
            <CardHeader>
              <CardTitle className="text-red-400 flex items-center font-mono">
                <Network className="mr-3 w-5 h-5" />
                Network Finality & Security
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-mono text-white/70">
                Auditor challenge measuring Reorg Defense and Double-Spend resistance. This visual UI will intentionally parallel-clone a cryptographic payload and attempt a severe Race Condition attack on the mesh.
              </p>
              <Link href="/debug-doublespend">
                <button className="w-full bg-red-900/50 hover:bg-red-600 border border-red-500 text-white font-black tracking-widest h-12 rounded transition-colors mt-4">
                  LAUNCH DOUBLE-SPEND ATTACK
                </button>
              </Link>
            </CardContent>
          </Card>

          {/* Card 2: Stress Tester */}
          <Card className="bg-primary/5 border-primary/20 hover:border-primary/50 transition-colors">
            <CardHeader>
              <CardTitle className="text-accent flex items-center font-mono">
                <Zap className="mr-3 w-5 h-5" />
                Sustained Throughput (TPS)
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm font-mono text-white/70">
                Independent Node.js testing script strictly measuring Sustained TPS, Median Latency, p95/p99 Network Overhead, and total dropped requests.
              </p>
              <div className="bg-black border border-white/10 p-3 rounded mt-4">
                <p className="text-xs text-white/40 mb-1 font-mono uppercase">Execution Script (Requires Node.js)</p>
                <code className="text-[10px] sm:text-xs text-green-400 break-all select-all block">
                  node --import tsx script/stress-test.ts &lt;user&gt; &lt;pass&gt; &lt;target_wallet&gt; 5000 50 https://wd2.net
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

    </div>
  );
}
