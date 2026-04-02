
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

    // Sequential burst to test Atomic Lock contention
    const burstStart = Date.now();
    for (let i = 0; i < TX_COUNT; i++) {
        // Use a rotating sender to avoid bad nonce errors in simple loop
        const sIdx = i % NUM_ACCOUNTS;
        const rIdx = (i + 1) % NUM_ACCOUNTS;
        const nonce = Math.floor(i / NUM_ACCOUNTS) + 1;

        promises.push(engine.validateTransaction({
            sender: `WEBD$TEST_ACCOUNT_${sIdx}`,
            recipient: `WEBD$TEST_ACCOUNT_${rIdx}`,
            amount: "1",
            nonce: nonce,
            signature: "SIG_MOCK"
        }));
    }

    const results = await Promise.all(promises);
    const endTime = Date.now();
    const totalTime = (endTime - burstStart) / 1000;
    const tps = Math.floor(TX_COUNT / totalTime);

    const failures = results.filter(r => !r.success);

    console.log(`\nResults:`);
    console.log(`Total Time: ${totalTime.toFixed(2)}s`);
    console.log(`Effective TPS: ${tps.toLocaleString()}`);
    console.log(`Failures: ${failures.length}`);
    
    if (failures.length > 0) {
        console.log(`Sample Failure: ${failures[0].error}`);
    }

    console.log(`\nGenerating Final State Root Hash...`);
    const hashStart = Date.now();
    const root = engine.getRootHash();
    const hashTime = Date.now() - hashStart;
    
    console.log(`Root Hash: ${root}`);
    console.log(`Hashing Time: ${hashTime}ms`);
    console.log(`---------------------------------`);
}

runStressTest().catch(console.error);
