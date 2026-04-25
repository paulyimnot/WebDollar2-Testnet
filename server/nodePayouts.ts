import { db } from "./db.js";
import { transactions, networkNodes, users, walletAddresses } from "../shared/schema.js";
import { sql, eq, and, gte } from "drizzle-orm";

export function startDailyNodePayoutCron() {
  console.log("🕒 Starting Daily Node Payout Cron Job...");

  // Register this node immediately if an operator wallet is set
  registerActiveNode();

  // Heartbeat every 10 minutes to stay active in the registry
  setInterval(() => {
    registerActiveNode();
  }, 10 * 60 * 1000);

  // Run the payout check every 5 minutes
  setInterval(async () => {
    try {
      await processDailyNodePayouts();
    } catch (err) {
      console.error("[NODE PAYOUT ERROR]", err);
    }
  }, 5 * 60 * 1000);
}

async function registerActiveNode() {
  const operatorWallet = process.env.OPERATOR_WALLET_ADDRESS;
  if (!operatorWallet) return;

  try {
    await db.execute(sql`
      INSERT INTO network_nodes (wallet_address, last_seen_at) 
      VALUES (${operatorWallet}, NOW())
      ON CONFLICT (wallet_address) DO UPDATE SET last_seen_at = NOW()
    `);
  } catch (err) {
    console.error("Failed to register node heartbeat", err);
  }
}

async function processDailyNodePayouts() {
  const todayStart = new Date();
  todayStart.setUTCHours(0, 0, 0, 0);

  const [existingPayouts] = await db.execute(sql`
    SELECT COUNT(*) as count 
    FROM transactions 
    WHERE sender_address = 'NODE_TREASURY_POOL' 
    AND type = 'node_reward'
    AND timestamp >= ${todayStart.toISOString()}
  `);

  if (Number(existingPayouts.count) > 0) {
    return; // Already paid out today
  }

  await db.transaction(async (tx) => {
    const [lockResult] = await tx.execute(sql`SELECT pg_try_advisory_xact_lock(600613) as locked`);
    if (!lockResult.locked) {
       return;
    }

    const [checkAgain] = await tx.execute(sql`
      SELECT COUNT(*) as count 
      FROM transactions 
      WHERE sender_address = 'NODE_TREASURY_POOL' 
      AND type = 'node_reward'
      AND timestamp >= ${todayStart.toISOString()}
    `);
    
    if (Number(checkAgain.count) > 0) {
      return;
    }

    console.log("💰 [NODE PAYOUT] Initiating daily 6% global node treasury distribution...");

    const [inResult] = await tx.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total_in 
      FROM transactions 
      WHERE receiver_address = 'NODE_TREASURY_POOL'
    `);
    const [outResult] = await tx.execute(sql`
      SELECT COALESCE(SUM(amount::numeric), 0) as total_out 
      FROM transactions 
      WHERE sender_address = 'NODE_TREASURY_POOL'
    `);

    const totalTreasuryBalance = parseFloat(inResult.total_in) - parseFloat(outResult.total_out);

    if (totalTreasuryBalance <= 0.0001) {
      console.log("💰 [NODE PAYOUT] Treasury balance is empty. Skipping.");
      return;
    }

    const activeNodes = await tx.select({ walletAddress: networkNodes.walletAddress })
      .from(networkNodes)
      .where(gte(networkNodes.lastSeenAt, new Date(Date.now() - 24 * 60 * 60 * 1000)));

    if (activeNodes.length === 0) {
      console.log("💰 [NODE PAYOUT] No active nodes found in the last 24 hours. Rolling over treasury to tomorrow.");
      return;
    }

    const payoutPerNode = totalTreasuryBalance / activeNodes.length;
    console.log(`💰 [NODE PAYOUT] Distributing ${totalTreasuryBalance.toFixed(4)} WEBD among ${activeNodes.length} nodes (${payoutPerNode.toFixed(4)} WEBD each).`);

    for (const node of activeNodes) {
      await tx.insert(transactions).values({
        senderId: null,
        receiverId: null,
        senderAddress: "NODE_TREASURY_POOL",
        receiverAddress: node.walletAddress,
        amount: payoutPerNode.toFixed(4),
        type: "node_reward",
        createdAt: new Date(),
      } as any);

      const [walletRow] = await tx.select().from(walletAddresses).where(eq(walletAddresses.address, node.walletAddress)).limit(1);
      if (walletRow) {
        await tx.update(walletAddresses)
          .set({ balance: sql`balance::numeric + ${payoutPerNode.toFixed(4)}::numeric` })
          .where(eq(walletAddresses.id, walletRow.id));
        
        await tx.update(users)
          .set({ balance: sql`balance::numeric + ${payoutPerNode.toFixed(4)}::numeric` })
          .where(eq(users.id, walletRow.userId));
      }
    }

    console.log("✅ [NODE PAYOUT] Successfully completed daily distribution.");
  });
}
