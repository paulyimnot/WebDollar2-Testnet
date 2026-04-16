import fs from 'fs';
import path from 'path';

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
    process.exit(1);
  }

  const [username, password, recipientAddress, totalTxsStr, threadsStr, targetUrlOpt] = args;
  const TOTAL_TXS = parseInt(totalTxsStr, 10);
  const THREADS = parseInt(threadsStr, 10);
  const BASE_URL = targetUrlOpt || "http://localhost:5000";

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
    process.exit(1);
  }

  console.log(`[2] Executing Benchmark...`);
  const startTime = Date.now();
  let completed = 0;
  let success = 0;
  let failed = 0;
  let latencies: number[] = [];

  const rawLogs: any[] = [];

  // Helper function to send a single transaction
  const sendTx = async (id: number) => {
    const txStart = Date.now();
    try {
      const res = await fetch(`${BASE_URL}/api/wallet/transfer`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Cookie': cookie 
        },
        body: JSON.stringify({
          recipientAddress,
          amount: "0.0001", // Micro-transaction for load testing
          password // Triggers backend signing mechanism
        })
      });
      
      const latency = Date.now() - txStart;
      latencies.push(latency);
      
      if (res.ok) {
        success++;
        rawLogs.push({ id, status: "SUCCESS", latency_ms: latency, timestamp: new Date().toISOString() });
      } else {
        failed++;
        const errorText = await res.text();
        rawLogs.push({ id, status: "FAILED", latency_ms: latency, error: errorText, timestamp: new Date().toISOString() });
      }
    } catch (e: any) {
       failed++;
       const latency = Date.now() - txStart;
       latencies.push(latency);
       rawLogs.push({ id, status: "ERROR", latency_ms: latency, error: e.message, timestamp: new Date().toISOString() });
    } finally {
      completed++;
      if (completed % 100 === 0) {
        process.stdout.write(`\rProgress: ${completed}/${TOTAL_TXS} (${((completed/TOTAL_TXS)*100).toFixed(1)}%) | Success: ${success} | Failed: ${failed}`);
      }
    }
  };

  // Process queue with controlled concurrency (THREADS)
  let currentIndex = 0;
  const workers = Array(THREADS).fill(null).map(async () => {
    while (currentIndex < TOTAL_TXS) {
      const id = currentIndex++;
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
