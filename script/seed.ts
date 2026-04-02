
import { db } from "../server/db";
import { users, blocks, transactions } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcrypt";

async function seed() {
  console.log("Seeding database...");
  
  // 1. Create Dev Wallet
  let devUser = await db.query.users.findFirst({
    where: eq(users.username, "WebDollarDev")
  });
  
  if (!devUser) {
    console.log("Creating Dev Wallet...");
    const hashedDevPw = await bcrypt.hash("potaspa275cm$$", 12);
    const [user] = await db.insert(users).values({
      username: "WebDollarDev",
      password: hashedDevPw,
      walletAddress: "WEBD_DEV_GENESIS_WALLET_001",
      balance: "6800000000.0000",
      isDev: true,
      isFoundation: false
    }).returning();
    devUser = user;
  }
  
  // 2. Create Foundation Wallet
  let foundationUser = await db.query.users.findFirst({
    where: eq(users.username, "WebDollarFoundation")
  });
  
  if (!foundationUser) {
    console.log("Creating Foundation Wallet...");
    const hashedFoundationPw = await bcrypt.hash("wdlbbzzjj43b$$", 12);
    const [user] = await db.insert(users).values({
      username: "WebDollarFoundation",
      password: hashedFoundationPw,
      walletAddress: "WEBD_FOUNDATION_GENESIS_WALLET_001",
      balance: "3400000000.0000",
      isDev: false,
      isFoundation: true
    }).returning();
    foundationUser = user;
  }
  
  // 3. Create Genesis Block
  const existingBlock = await db.query.blocks.findFirst({
    where: eq(blocks.id, 1)
  });
  
  if (!existingBlock) {
    console.log("Creating Genesis Block...");
    const [block] = await db.insert(blocks).values({
      hash: "000000000019d6689c085ae165831e934ff763ae46a2a6c172b3f1b60a8ce26f", // Bitcoin genesis hash homage or similar
      previousHash: "0000000000000000000000000000000000000000000000000000000000000000",
      minerId: devUser!.id,
      reward: "0.0000",
      difficulty: 1,
      nonce: 0
    }).returning();
    
    // Initial Distribution Transactions
    await db.insert(transactions).values([
      {
        senderId: null, // Protocol
        receiverId: devUser!.id,
        amount: "6800000000.0000",
        type: "mining_reward", // Technically premine/allocation
        blockId: block.id
      },
      {
        senderId: null,
        receiverId: foundationUser!.id,
        amount: "3400000000.0000",
        type: "mining_reward",
        blockId: block.id
      }
    ]);
  }
  
  console.log("Seeding complete!");
  process.exit(0);
}

seed().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
