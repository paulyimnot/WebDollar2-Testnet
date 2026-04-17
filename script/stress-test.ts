import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { signAsync } from '@noble/secp256k1';

/**
 * WEBDOLLAR 2 - OFFICIAL STRESS TEST & TPS BENCHMARK TOOL
 * 
 * Objective: Generate reproducible load to verify TPS, Latency, and Network Integrity.
 * 
 * Usage: 
 * node --import tsx script/stress-test.ts <USERNAME> <PASSWORD> <RECIPIENT_ADDRESS> <TOTAL_TXS> <THREADS> [TARGET_URL]
 * 
 * Example:
 * node --import tsx script/stress-test.ts mytest_user mypass WEBD$123... 1000 50 http://localhost:5000
 */

async function run() {
  const args = process.argv.slice(2);
  if (args.length < 5) {
    console.log("❌ Missing Arguments!");
    console.log("Usage: node --import tsx script/stress-test.ts <USERNAME> <PASSWORD> <RECIPIENT_ADDRESS> <TOTAL_TXS> <THREADS> [TARGET_URL]");
    process.exitCode = 1; return;
  }

  const [username, password, rawRecipient, totalTxsStr, threadsStr, targetUrlOpt] = args;
  const TOTAL_TXS = parseInt(totalTxsStr, 10);
  const THREADS = parseInt(threadsStr, 10);
  const BASE_URL = targetUrlOpt || "http://localhost:5000";

  let recipientAddress = rawRecipient;
  if (!recipientAddress.startsWith("WEBD$")) {
     console.log(`[0] Resolving Alias '${rawRecipient}' to Wallet Address...`);
     try {
       const resolveRes = await fetch(`${BASE_URL}/api/alias/resolve/${rawRecipient}`);
       if (resolveRes.ok) {
          const data = await resolveRes.json();
          recipientAddress = data.address;
          console.log(`    Resolved to: ${recipientAddress}`);
       } else {
          console.error(`❌ Alias resolution failed! Ensure '${rawRecipient}' is a valid user.`);
          process.exitCode = 1; return;
       }
     } catch (e) {
       console.error("❌ Network error resolving Alias.");
       process.exitCode = 1; return;
     }
  }

  console.log(`\n🚀 INITIATING WEBDOLLAR 2 PERFORMANCE STRESS TEST`);
  console.log(`====================================================`);
  console.log(`Targeting: ${BASE_URL}`);
  console.log(`Load Size: ${TOTAL_TXS} Transactions`);
  console.log(`Concurrency: ${THREADS} active threads`);
  console.log(`====================================================\n`);

  // 1. Authenticate & Obtain Session Cookie
  console.log(`[1] Authenticating user '${username}'...`);
  
  let cookie = "";
  try {
    const loginRes = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password })
    });

    if (!loginRes.ok) {
       const err = await loginRes.text();
       throw new Error(`Login failed with status ${loginRes.status}: ${err}`);
    }
    
    // Extract Set-Cookie header
    const setCookie = loginRes.headers.get("set-cookie");
    if (setCookie) {
      // Very basic extraction, just get wd2_session parts
      cookie = setCookie.split(';')[0];
    } else {
        throw new Error("No session cookie returned.");
    }
    console.log("✅ Authentication Successful. Session secured.\n");

  } catch (error) {
    console.error("❌ Authentication Error:", error);
    process.exitCode = 1; return;
  }

  // 2. Fetch Pre-flight Crypto Material
  console.log(`[2] Extracting Private Key & Nonce Syncer...`);
  let encryptedKey = "";
  let currentNonce = 0;
  try {
    const preRes = await fetch(`${BASE_URL}/api/wallet/sign-preflight`, {
      method: "GET",
      headers: { "Cookie": cookie }
    });
    if (!preRes.ok) throw new Error("Failed to get preflight data");
    const preData = await preRes.json();
    encryptedKey = preData.encryptedPrivateKey;
    currentNonce = preData.nonce;
  } catch (err) {
    console.error("❌ Preflight sync failed. Is your wallet setup?", err);
    process.exit(1);
  }

  // 3. Decrypt Key Natively
  let privateKeyBytes: Uint8Array;
  let privateKeyHex: string;
  try {
     const [ivHex, encHex] = encryptedKey.split(":");
     const keySync = crypto.createHash('sha256').update(password).digest();
     const decipher = crypto.createDecipheriv('aes-256-cbc', keySync, Buffer.from(ivHex, "hex"));
     let decrypted = decipher.update(encHex, 'hex', 'utf8');
     decrypted += decipher.final('utf8');
     privateKeyHex = decrypted;
     privateKeyBytes = Buffer.from(privateKeyHex, "hex");
  } catch (err) {
     console.error("❌ Decryption failed! Bad password?", err);
     process.exitCode = 1; return;
  }

  console.log(`[4] Executing Cryptographic Benchmark...`);
  const startTime = Date.now();
  let completed = 0;
  let success = 0;
  let failed = 0;
  let latencies: number[] = [];
  const rawLogs: any[] = [];

  // Sharing a synchronized nonce state across threads
  let syncedNonce = currentNonce;

  const sendTx = async (id: number) => {
    let retries = 0;
    const MAX_RETRIES = 3;

    while (retries < MAX_RETRIES) {
      const txNonce = syncedNonce++; 
      const txStart = Date.now();
      
      try {
        const amount = "0.0001";
        const messageStr = JSON.stringify({ recipientAddress, amount, nonce: txNonce });
        const hashBuffer = crypto.createHash("sha256").update(messageStr).digest();
        const sigBytes = await signAsync(new Uint8Array(hashBuffer), privateKeyBytes, { prehash: false });
        const signature = Array.from(sigBytes).map(b => b.toString(16).padStart(2, '0')).join('');

        const res = await fetch(`${BASE_URL}/api/wallet/transfer`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Cookie': cookie 
          },
          body: JSON.stringify({
            recipientAddress,
            amount,
            signature,
            nonce: txNonce
          })
        });

        const latency = Date.now() - txStart;
        
        if (res.ok) {
          latencies.push(latency);
          success++;
          rawLogs.push({ id, status: "SUCCESS", latency_ms: latency, timestamp: new Date().toISOString() });
          return; // Success!
        } else {
          const errorText = await res.text();
          
          // If it's a nonce error, we resync and retry
          if (errorText.includes("Invalid network nonce") || errorText.includes("Consensus Override")) {
              const match = errorText.match(/Expected (\d+)/);
              if (match) {
                 syncedNonce = parseInt(match[1], 10);
                 retries++;
                 continue; // Retry with the correct nonce
              }
          }
          
          // If it's a different error or we ran out of retries
          latencies.push(latency);
          failed++;
          rawLogs.push({ id, status: "FAILED", latency_ms: latency, error: errorText, timestamp: new Date().toISOString() });
          return;
        }
      } catch (e: any) {
         const latency = Date.now() - txStart;
         latencies.push(latency);
         failed++;
         rawLogs.push({ id, status: "ERROR", latency_ms: latency, error: e.message, timestamp: new Date().toISOString() });
         return;
      } finally {
        completed++;
        if (completed % 10 === 0 || completed === TOTAL_TXS) {
          const progressPercent = ((completed/TOTAL_TXS)*100).toFixed(1);
          const successStatus = success;
          process.stdout.write(`\rProgress: ${completed}/${TOTAL_TXS} (${progressPercent}%) | Success: ${successStatus} | Failed: ${failed}    `);
        }
      }
    }
  };

  let currentIndex = 0;
  // If use same wallet, the server row lock force sequential execution per ID.
  // We use parallel workers to fill the pipe, but keep nonce order.
  const workers = Array(THREADS).fill(null).map(async () => {
    while (currentIndex < TOTAL_TXS) {
      const id = ++currentIndex;
      await sendTx(id);
    }
  });

  await Promise.all(workers);

  const endTime = Date.now();
  const durationSec = (endTime - startTime) / 1000;
  const tps = TOTAL_TXS / durationSec;

  // Calculate Latency Stats
  latencies.sort((a, b) => a - b);
  const avgLatency = latencies.reduce((a, b) => a + b, 0) / latencies.length || 0;
  const medianLatency = latencies[Math.floor(latencies.length / 2)] || 0;
  const p95Latency = latencies[Math.floor(latencies.length * 0.95)] || 0;
  const p99Latency = latencies[Math.floor(latencies.length * 0.99)] || 0;
  const maxLatency = latencies[latencies.length - 1] || 0;

  console.log(`\n\n🎯 BENCHMARK COMPLETE`);
  console.log(`====================================================`);
  console.log(`Total Transactions:  ${TOTAL_TXS}`);
  console.log(`Successful:          ${success}`);
  console.log(`Failed/Dropped:      ${failed}`);
  console.log(`Duration:            ${durationSec.toFixed(2)} seconds`);
  console.log(`Sustained TPS:       ${tps.toFixed(2)} tx/s\n`);
  
  console.log(`LATENCY METRICS (Measured Under Load):`);
  console.log(`  Average:           ${avgLatency.toFixed(2)} ms`);
  console.log(`  Median:            ${medianLatency} ms`);
  console.log(`  p95:               ${p95Latency} ms`);
  console.log(`  p99:               ${p99Latency} ms`);
  console.log(`  Max (Worst-Case):  ${maxLatency} ms`);
  console.log(`====================================================`);

  // Write Raw Logs to file for verifiable proof
  const logDir = path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(logDir)) fs.mkdirSync(logDir);
  const reportPath = path.resolve(logDir, `stress_test_report_${Date.now()}.json`);
  
  fs.writeFileSync(reportPath, JSON.stringify({
    config: { TOTAL_TXS, THREADS, TARGET: BASE_URL },
    metrics: { durationSec, tps, success, failed, latencies: { avg: avgLatency, median: medianLatency, p95: p95Latency, p99: p99Latency, max: maxLatency } },
    raw_logs: rawLogs
  }, null, 2));

  console.log(`\n📄 Verifiable Raw Logs exported to: ${reportPath}`);
}

run().catch(console.error);
