# DIELBS Core Engine

**DIELBS** (Decoupled Instant Execution with Lazy Block Settlement) is a high-performance, purely Javascript-native consensus and execution engine designed for extreme transaction throughput.

## Core Value Proposition
Traditional blockchains couple the validation and execution of a transaction directly with the block settlement process. This creates massive latency bottlenecks. 

DIELBS decouples this process into a "Hot State" and a "Cold State".
- **HotStateEngine (In-Memory Promises):** Transactions are validated using Ed25519 cryptography and `BigInt` precisions, then instantaneously locked via a distributed memory map (`Promises`). This provides sub-millisecond local execution and eliminates double-spends instantly via P2P `PRE_ACCEPT` routing.
- **Cold State Settlement:** Validators lazily sweep the locked transactions from the Hot State into cryptographic blocks, maintaining consensus without slowing down the user experience.

## Performance Validation
This repository contains the standalone DIELBS execution environment, completely stripped of any consumer-facing Wallet UX, to strictly demonstrate the raw power of the engine.

The included **Benchmark WebWorker** creates thousands of randomized `Ed25519` key pairs, constructs transactions, signs them, and routes them through the `HotStateEngine` concurrently. 

**Verified Benchmarks on Consumer Hardware:**
- **Throughput:** ~10,000+ TPS (Transactions Per Second)
- **Lock Latency:** 0.05ms - 0.5ms per transaction

## Running the Benchmark
1. Install dependencies: `npm install`
2. Start the local server: `npm run dev`
3. Navigate to `http://127.0.0.1:5173`
4. Click **EXECUTE 10k TPS** to witness the engine routing payloads in real-time.

---
*Confidential IP. Not for public redistribution without licensing agreement.*
