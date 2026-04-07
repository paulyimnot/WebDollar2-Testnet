
import { engine } from "../server/dielbs_engine_pro.js";

async function runStressTest() {
    const NUM_ACCOUNTS = 1000;
    const TX_COUNT = 100000; // 100k transactions for this sprint
    const startTime = Date.now();

    console.log(`--- DIELBS PRO STRESS TEST ---`);
    console.log(`Initializing ${NUM_ACCOUNTS} accounts...`);

    // Setup accounts with 1B tokens each
    for (let i = 0; i < NUM_ACCOUNTS; i++) {
        const addr = `WEBD$TEST_ACCOUNT_${i}`;
        engine.setAccountState(addr, "1000000000", 0);
    }

    console.log(`Starting ${TX_COUNT} transactions...`);

    const promises = [];
    for (let i = 0; i < TX_COUNT; i++) {
        const senderIdx = Math.floor(Math.random() * NUM_ACCOUNTS);
        let recipientIdx = Math.floor(Math.random() * NUM_ACCOUNTS);
        while (recipientIdx === senderIdx) recipientIdx = Math.floor(Math.random() * NUM_ACCOUNTS);

        const sender = `WEBD$TEST_ACCOUNT_${senderIdx}`;
        const recipient = `WEBD$TEST_ACCOUNT_${recipientIdx}`;
        
        // We simulate the nonce logic
        // For 100k txs spread over 1k accounts, we'll just track nonces locally for the test
    }

    // Sequential burst to test Atomic Lock contention with Batching
    const BATCH_SIZE = 1000;
    const burstStart = Date.now();
    let completedCount = 0;
    
    for (let b = 0; b < TX_COUNT; b += BATCH_SIZE) {
        const batchPromises = [];
        for (let i = 0; i < BATCH_SIZE && (b + i) < TX_COUNT; i++) {
            const currentTx = b + i;
            const sIdx = currentTx % NUM_ACCOUNTS;
            const rIdx = (currentTx + 1) % NUM_ACCOUNTS;
            const nonce = Math.floor(currentTx / NUM_ACCOUNTS) + 1;

            batchPromises.push(engine.validateTransaction({
                sender: `WEBD$TEST_ACCOUNT_${sIdx}`,
                recipient: `WEBD$TEST_ACCOUNT_${rIdx}`,
                amount: "1",
                nonce: nonce,
                signature: "SIG_MOCK"
            }));
        }
        
        const batchResults = await Promise.all(batchPromises);
        const batchFailures = batchResults.filter(r => !r.success);
        if (batchFailures.length > 0) {
            console.error(`Batch at ${b} had ${batchFailures.length} failures.`);
        }
        completedCount += batchResults.length;
        if (completedCount % 10000 === 0) {
            console.log(`...processed ${completedCount.toLocaleString()} transactions`);
        }
    }

    const endTime = Date.now();
    const totalTime = (endTime - burstStart) / 1000;
    const tps = Math.floor(TX_COUNT / totalTime);

    console.log(`\nResults:`);
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Effective TPS: ${tps.toLocaleString()}`);
    console.log(`---------------------------------`);
}

runStressTest().catch(console.error);
