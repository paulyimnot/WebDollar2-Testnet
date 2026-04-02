import { motion } from "framer-motion";
import { Link } from "wouter";
import { ArrowLeft, Cpu, Activity, Zap, FileText } from "lucide-react";
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
          </div>

          <div className="prose prose-invert prose-yellow max-w-none font-mono">
            <section className="mb-16">
              <h2 className="text-3xl text-accent font-black mb-6 flex items-center border-l-8 border-accent pl-6 bg-accent/5 py-3 rounded-r-md">
                Abstract
              </h2>
              <p className="text-white/90 text-xl leading-relaxed font-medium">
                Contemporary blockchain architectures suffer from an intrinsic
                topological bottleneck: as network participation increases, the
                necessity for robust hardware verification induces high latency,
                mempool congestion, and prohibitive gas fees.{" "}
                <strong>
                  WEBD2ollar 2 (WEBD2) structurally inverses this scalability
                  trilemma.
                </strong>{" "}
                By deploying a purely browser-native routing execution mesh
                built on WebRTC and WebSockets (WASM/TypeScript), WEBD2
                operationalizes every end-user as a zero-trust consensus
                participant. This paper models WEBD2's unique dual-verification
                mechanism and its dependency on the high-velocity, proprietary{" "}
                <strong className="text-white">DIELBS Engine</strong>,
                illustrating how the network mathematically benefits from
                adoption scaling rather than degrading under load.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                1. Topographic Routing & Inverse Scalability
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                Traditional Layer-1 protocols inherently disconnect end-users
                from the consensus mechanism, relegating them to "light clients"
                reliant on centralized RPC nodes. WEBD2 forces a return to true
                peer-to-peer (P2P) mechanics.
              </p>
              <ul className="space-y-4 mt-6">
                <li className="bg-card/50 p-4 border border-primary/10 rounded-md">
                  <strong className="text-white block mb-2">
                    <Activity className="inline w-5 h-5 mr-2 text-primary" />
                    Zero-Trust Routing Nodes
                  </strong>
                  The WEBD2 architecture converts the standard web browser into a
                  primary network stratum. These nodes operate entirely as
                  high-speed signaling pathways. They are not burdened with
                  storing complete historical ledger arrays.
                </li>
                <li className="bg-card/50 p-4 border border-primary/10 rounded-md">
                  <strong className="text-white block mb-2">
                    <Activity className="inline w-5 h-5 mr-2 text-primary" />
                    Inverse Bandwidth Scaling
                  </strong>
                  Because browsers rely entirely on localized signature
                  generation (client-side processing) and P2P broadcasting, the
                  available network bandwidth scales symmetrically with the user
                  base. WEBD2 becomes mathematically more resilient and rapid as
                  adoption surges.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                2. Decoupled Dual-Verification Consensus
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                To maintain zero-trust security while optimizing for node
                brevity, WEBD2 separates cryptographic verification into a
                two-phase decoupled algorithm.
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    Phase 1: Client-Side Cryptographic Assertion (The Routing
                    Tier)
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    All execution vectors initiated in WEBD2 demand deterministic
                    ownership authorization. Before a transaction interacts with
                    the broader network, the local browser environment computes
                    an <code>ed25519</code> signature (utilizing EdDSA). This
                    step provides indisputable, locally-verified cryptographic
                    proof of ownership, preventing the injection of invalid
                    payloads into the mempool.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    Phase 2: Asynchronous Block Settlement (The Consensus Tier)
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Once pre-authorized payloads saturate the P2P mempool, block
                    generators governed by the <strong>DIELBS Engine</strong>{" "}
                    take possession of the state vectors. At a strict 5-second
                    interval, these validator nodes mathematically reaffirm the
                    signatures and permanently anchor the mutated state
                    parameters into an immutable cryptographic chain.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                3. The DIELBS Engine: Sub-Millisecond Abstraction
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4">
                The secondary validation phase, historically the slowest
                component of legacy blockchains, has been fundamentally
                abstracted via the <strong>DIELBS Engine</strong>.
              </p>

              <div className="bg-primary/5 border-l-4 border-accent p-4 my-6 italic text-sm text-primary/80">
                <strong>Note on Intellectual Property Boundaries:</strong> The
                specific memory-threading allocations and database execution
                methodologies utilized internally by the DIELBS Engine are
                proprietary. The engine functions as an entirely independent
                computational module that can operate standalone.
              </div>

              <ul className="space-y-4">
                <li className="bg-card/50 p-4 border border-primary/10 rounded-md">
                  <strong className="text-white block mb-2">
                    <Zap className="inline w-5 h-5 mr-2 text-accent" />
                    Optimistic Concurrency Control
                  </strong>
                  DIELBS bypasses standard relational locking. It structures
                  transactions within temporary, localized RAM state
                  environments, validating theoretical output states in
                  microseconds.
                </li>
                <li className="bg-card/50 p-4 border border-primary/10 rounded-md">
                  <strong className="text-white block mb-2">
                    <Cpu className="inline w-5 h-5 mr-2 text-accent" />
                    Asynchronous Persistence Batching
                  </strong>
                  Valid state transitions are committed retroactively in
                  aggregated batches. This grants the DIELBS execution module
                  sub-millisecond reaction times, allowing the WEBD2 protocol's
                  UI to remain perfectly fluid while absolute cryptographic
                  finality forms securely in the background.
                </li>
              </ul>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                4. Anonymity and Routing Obfuscation
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                WEBD2 resolves the dichotomy between transparent generalized
                ledgers and necessary financial privacy via an internal
                zero-knowledge permutation toggle. Native alias resolution
                simplifies user interaction without compromising the underlying
                entropy. Furthermore, users can initiate obfuscated payload
                transfers wherein the routing nodes mask origin/destination
                integers, granting absolute privacy where required.
              </p>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                5. Network Resilience & Threat Mitigation
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                WEBD2 mathematically mitigates both localized topological threats
                (bad computational nodes) and vast macro-threats (global
                bandwidth exhaustion).
              </p>

              <div className="space-y-6">
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    5.1. Sybil Resistance Against Malicious Nodes
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Because all transactions mandate local Phase-1 verification
                    (via unforgeable <code>ed25519</code> hashes), any modified
                    or spoofed payload instantly triggers deterministic
                    cryptographic invalidity and is autonomously dropped by the
                    adjacent peer mesh. A compromised node possesses identically
                    zero capability to manipulate the ledger matrix.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    5.2. Asymptotic Bandwidth Conservation
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    An individual routing node synchronizes via dynamic routing
                    tables, sustaining only a minimalist subset of direct peer
                    relationships (e.g., $k=8$). Routing nodes only propagate
                    differential state parameters (byte-sized hashes), ensuring
                    per-node bandwidth consumption remains strictly
                    micro-fragmentary regardless of exponential macroscopic
                    scaling.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    5.3. Deterministic Elimination of Double-Spending
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    Even if a malicious participant propagates simultaneous
                    mathematical signatures globally, the DIELBS execution layer
                    deterministically voids trailing timestamps inside the
                    memory buffer before blocks are even serialized, eradicated
                    double-spending vectors cleanly.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl text-white font-bold mb-2">
                    5.4. Browser Execution Integrity Fallacy
                  </h3>
                  <p className="text-muted-foreground leading-relaxed">
                    The blockchain derives absolute trust strictly from
                    underlying mathematics, not browser software integrity. Even
                    if a browser instance is compromised by nefarious malware,
                    the attacker cannot forge an outbound transaction payload
                    without direct possession of the isolated private key
                    entropy. Cryptography guards the ledger.
                  </p>
                </div>
              </div>
            </section>

            <section className="mb-12">
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center border-l-4 border-accent pl-4">
                6. Algorithmic Tokenomics & V1 Migration
              </h2>
              <p className="text-muted-foreground leading-relaxed">
                The monetary protocol maintains a fixed constraint
                of 68,000,000,000 WEBD2. To honor the early legacy network,
                <strong>14,200,000,000 WEBD2</strong> is held in a strict Active Migration Reserve,
                effectively burning the unverified V1 developer funds.
                The protocol allocates <strong>6,800,000,000 WEBD2 (10%)</strong> to development,
                and <strong>3,400,000,000 WEBD2 (5%)</strong> to the Foundation Fund.
                The remaining maximum supply of <strong>43,600,000,000 WEBD2</strong> remains designated purely for
                public browser mining with a 5-second block time and an automated halving cycle every 3 years to ensure 100-year emission longevity.
              </p>
            </section>

            <section className="mb-12 bg-card border border-accent/20 rounded-lg p-8 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-accent/5 rounded-bl-full pointer-events-none"></div>
              <h2 className="text-2xl text-accent font-bold mb-4 flex items-center z-10 relative">
                7. The End-State: An Untamed Settlement Engine
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-4 relative z-10">
                WEBD2ollar 2 securely confirms that high-throughput
                decentralization does not conflict with consumer-grade hardware.
                However, the true disruptor of this protocol lies entirely
                encapsulated within the standalone{" "}
                <strong>DIELBS Engine</strong>.
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4 relative z-10">
                DIELBS is not inherently bound to the mechanics of browser-based
                PoS topologies—it is an untamed, standalone execution beast.
                Because it operates entirely by abandoning synchronous
                read/write deadlocks in favor of aggressive asynchronous state
                caching, it categorically guarantees a true{" "}
                <strong className="text-white">
                  0.5 millisecond (½ ms) maximum execution latency
                </strong>
                .
              </p>
              <p className="text-muted-foreground leading-relaxed mb-4 relative z-10">
                When deployed and scaled efficiently inside optimized
                high-density environments, the mathematical constraints of
                DIELBS dissolve. The potential transactional limits scale to{" "}
                <strong className="text-white">
                  millions of Transactions Per Second (TPS)
                </strong>
                , eclipsing global centralized financial routing infrastructures
                (such as Visa or MasterCard) by several orders of magnitude. It
                stands capable of validating immense, synchronous liquidity
                loads with blistering ferocity before finally anchoring them
                into cryptographical immutability.
              </p>
              <p className="text-accent/90 leading-relaxed font-bold mt-6 border-l-2 border-accent pl-4 relative z-10 bg-accent/5 p-4 rounded-r-md">
                WEBD2 presents a protocol where classical architectural bounds
                have been intentionally shattered. The sheer transactional
                velocity of the DIELBS engine is inherently intimidating; the
                protocol was not designed to be throttled or tamed, but to
                operate aggressively as the definitive backend execution engine
                for the modern financial web.
              </p>
            </section>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
