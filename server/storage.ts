import { db, pool } from "./db.js";
import {
  users, conversionRequests, blocks, transactions, walletAddresses, blockedWallets, cardWaitlist, casinoSweepstakes,
  type User, type InsertUser,
  type ConversionRequest, type InsertConversionRequest,
  type Block, type Transaction, type WalletAddress, type BlockedWallet,
  type CardWaitlistEntry, type InsertCardWaitlistEntry, type CasinoSweepstake
} from "../shared/schema.js";
import { eq, desc, or, and, sql } from "drizzle-orm";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByAlias(alias: string): Promise<User | undefined>;
  createUser(user: any): Promise<User>;
  updateUserBalance(userId: number, newBalance: string): Promise<User>;
  updateUser(userId: number, data: Partial<User>): Promise<User>;
  updateUserAlias(userId: number, alias: string | null, isAliasActive: boolean): Promise<User>;

  createWalletAddress(data: any): Promise<WalletAddress>;
  getWalletAddresses(userId: number): Promise<WalletAddress[]>;
  getWalletAddress(id: number): Promise<WalletAddress | undefined>;
  updateWalletAddress(id: number, data: Partial<WalletAddress>): Promise<WalletAddress>;
  deleteWalletAddress(id: number): Promise<void>;

  createBlock(block: Omit<Block, "id" | "timestamp">): Promise<Block>;
  getLatestBlock(): Promise<Block | undefined>;
  getBlocks(limit?: number): Promise<Block[]>;

  createTransaction(tx: Omit<Transaction, "id" | "timestamp">): Promise<Transaction>;
  getTransactions(limit?: number): Promise<Transaction[]>;
  getUserTransactions(userId: number): Promise<Transaction[]>;

  createConversionRequest(request: any): Promise<ConversionRequest>;
  getConversionRequests(userId: number): Promise<ConversionRequest[]>;
  getTotalConverted(userId: number): Promise<number>;
  getConversionsByOldAddress(oldWalletAddress: string): Promise<ConversionRequest[]>;
  getTotalConvertedFromAddress(oldWalletAddress: string): Promise<number>;
  getLastVestingConversion(userId: number): Promise<ConversionRequest | undefined>;

  getUserByWalletAddress(address: string): Promise<User | undefined>;
  getWalletAddressByAddress(address: string): Promise<WalletAddress | undefined>;
  updateWalletAddressBalance(id: number, newBalance: string): Promise<WalletAddress>;
  executeTransfer(senderId: number, receiverId: number, senderAddrId: number | null, receiverAddrId: number, amount: number, senderAddress: string, receiverAddress: string): Promise<Transaction>;

  isWalletBlocked(address: string): Promise<boolean>;
  getBlockedWallets(): Promise<BlockedWallet[]>;
  blockWallet(address: string, reason: string): Promise<BlockedWallet>;
  getWalletBalance(address: string): Promise<string>;
  getWalletNonce(address: string): Promise<number>;
  updateWalletBalance(address: string, amountChange: bigint, newNonce?: number): Promise<void>;
  getNetworkStats(): Promise<{ totalUsers: number; totalBlocks: number; totalTransactions: number; circulatingSupply: string; latestBlockTime: Date | null }>;

  updateUserPassword(userId: number, hashedPassword: string): Promise<User>;
  updateUser2FA(userId: number, totpSecret: string | null, is2faEnabled: boolean): Promise<User>;
  updateUserStake(userId: number, stakedBalance: string, balance: string, lastClaim: Date | null): Promise<User>;
  getTotalNetworkStaked(): Promise<string>;
  getTotalStakers(): Promise<number>;

  getTotalPendingConversions(userId: number): Promise<number>;
  getAllConversionRequests(): Promise<ConversionRequest[]>;
  updateConversionStatus(id: number, status: string, amountApproved?: string): Promise<ConversionRequest>;

  joinCardWaitlist(entry: InsertCardWaitlistEntry): Promise<CardWaitlistEntry>;
  getCardWaitlistEntry(userId: number): Promise<CardWaitlistEntry | undefined>;
  getCardWaitlistCount(): Promise<number>;
  getAllCardWaitlistEntries(): Promise<any[]>;
  getUserRewardStats(userId: number): Promise<{ totalRewardsEarned: string; rewardsCount: number; lastRewardAmount: string }>;

}

export class DatabaseStorage implements IStorage {
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByAlias(alias: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.alias, alias));
    return user;
  }

  async createUser(insertUser: any): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async updateUserPassword(userId: number, hashedPassword: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ password: hashedPassword })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser2FA(userId: number, totpSecret: string | null, is2faEnabled: boolean): Promise<User> {
    const [user] = await db.update(users)
      .set({ totpSecret, is2faEnabled })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserAlias(userId: number, alias: string | null, isAliasActive: boolean): Promise<User> {
    const [user] = await db.update(users)
      .set({ alias, isAliasActive })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserBalance(userId: number, newBalance: string): Promise<User> {
    const [user] = await db.update(users)
      .set({ balance: newBalance })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUser(userId: number, data: Partial<User>): Promise<User> {
    const [user] = await db.update(users)
      .set(data)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async createWalletAddress(data: any): Promise<WalletAddress> {
    const [addr] = await db.insert(walletAddresses).values(data).returning();
    return addr;
  }

  async getWalletAddresses(userId: number): Promise<WalletAddress[]> {
    return await db.select().from(walletAddresses).where(eq(walletAddresses.userId, userId)).orderBy(desc(walletAddresses.isPrimary));
  }

  async getPrimaryWalletAddress(userId: number): Promise<WalletAddress | undefined> {
    const [addr] = await db.select().from(walletAddresses)
      .where(and(eq(walletAddresses.userId, userId), eq(walletAddresses.isPrimary, true)))
      .limit(1);
    return addr;
  }


  async getWalletAddress(id: number): Promise<WalletAddress | undefined> {
    const [addr] = await db.select().from(walletAddresses).where(eq(walletAddresses.id, id));
    return addr;
  }

  async updateWalletAddress(id: number, data: Partial<WalletAddress>): Promise<WalletAddress> {
    const [addr] = await db.update(walletAddresses)
      .set(data)
      .where(eq(walletAddresses.id, id))
      .returning();
    return addr;
  }

  async deleteWalletAddress(id: number): Promise<void> {
    await db.delete(walletAddresses).where(eq(walletAddresses.id, id));
  }

  async createBlock(block: Omit<Block, "id" | "timestamp">): Promise<Block> {
    const [newBlock] = await db.insert(blocks).values(block).returning();
    return newBlock;
  }

  async getLatestBlock(): Promise<Block | undefined> {
    const [block] = await db.select().from(blocks).orderBy(desc(blocks.id)).limit(1);
    return block;
  }

  async getBlocks(limit = 10): Promise<Block[]> {
    return await db.select().from(blocks).orderBy(desc(blocks.id)).limit(limit);
  }

  async createTransaction(tx: Omit<Transaction, "id" | "timestamp">): Promise<Transaction> {
    const [newTx] = await db.insert(transactions).values(tx).returning();
    return newTx;
  }

  async getTransactions(limit = 10): Promise<Transaction[]> {
    return await db.select().from(transactions).orderBy(desc(transactions.id)).limit(limit);
  }

  async getUserTransactions(userId: number): Promise<Transaction[]> {
    return await db.select().from(transactions)
      .where(or(eq(transactions.senderId, userId), eq(transactions.receiverId, userId)))
      .orderBy(desc(transactions.id)).limit(20);
  }

  async createConversionRequest(request: any): Promise<ConversionRequest> {
    const [req] = await db.insert(conversionRequests).values(request).returning();
    return req;
  }

  async getConversionRequests(userId: number): Promise<ConversionRequest[]> {
    return await db.select().from(conversionRequests).where(eq(conversionRequests.userId, userId));
  }

  async getTotalConverted(userId: number): Promise<number> {
    const requests = await db.select().from(conversionRequests)
      .where(and(eq(conversionRequests.userId, userId), eq(conversionRequests.status, "approved")));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountApproved || "0"), 0);
  }

  async getTotalPendingConversions(userId: number): Promise<number> {
    const requests = await db.select().from(conversionRequests)
      .where(and(eq(conversionRequests.userId, userId), eq(conversionRequests.status, "pending")));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountClaimed || "0"), 0);
  }

  async getConversionsByOldAddress(oldWalletAddress: string): Promise<ConversionRequest[]> {
    return await db.select().from(conversionRequests)
      .where(eq(conversionRequests.oldWalletAddress, oldWalletAddress));
  }

  async getTotalConvertedFromAddress(oldWalletAddress: string): Promise<number> {
    const requests = await db.select().from(conversionRequests)
      .where(eq(conversionRequests.oldWalletAddress, oldWalletAddress));
    return requests.reduce((sum, r) => sum + parseFloat(r.amountApproved || "0"), 0);
  }

  async getLastVestingConversion(userId: number): Promise<ConversionRequest | undefined> {
    const [req] = await db.select().from(conversionRequests)
      .where(and(eq(conversionRequests.userId, userId), eq(conversionRequests.status, "vesting")))
      .orderBy(desc(conversionRequests.createdAt))
      .limit(1);
    return req;
  }

  async getUserByWalletAddress(address: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.walletAddress, address));
    return user;
  }

  async getWalletAddressByAddress(address: string): Promise<WalletAddress | undefined> {
    const [addr] = await db.select().from(walletAddresses).where(eq(walletAddresses.address, address));
    return addr;
  }

  async updateWalletAddressBalance(id: number, newBalance: string): Promise<WalletAddress> {
    const [addr] = await db.update(walletAddresses)
      .set({ balance: newBalance })
      .where(eq(walletAddresses.id, id))
      .returning();
    return addr;
  }

  async executeTransfer(
    senderId: number,
    receiverId: number,
    senderAddrId: number | null,
    receiverAddrId: number,
    amount: number,
    senderAddress: string,
    receiverAddress: string
  ): Promise<Transaction> {
    const client = await pool.connect();
    try {
      console.log(`[TRANSFER] Initiating: ${senderAddress} -> ${receiverAddress} (${amount} WEBD)`);
      await client.query('BEGIN');

      // 0. LOCK SENDER ROW (Strict Serializability / Race Protection)
      // This prevents any concurrent transaction from modifying this user's balance
      // until this transaction commits or rolls back.
      const lockResult = await client.query(
        'SELECT id, balance::numeric, nonce FROM users WHERE id = $1 FOR UPDATE',
        [senderId]
      );

      if (lockResult.rowCount === 0) {
        await client.query('ROLLBACK');
        throw new Error('Locking failed: User not found');
      }

      const currentBalance = lockResult.rows[0].balance;
      if (parseFloat(currentBalance) < amount) {
        await client.query('ROLLBACK');
        throw new Error('Insufficient balance (Race Protection Active)');
      }

      // 1. Deduct from sender account
      // Note: We've already locked the row, so the deduction is now guaranteed to be safe
      const senderResult = await client.query(
        'UPDATE users SET balance = (balance::numeric - $1::numeric), nonce = nonce + 1 WHERE id = $2 RETURNING *',
        [amount.toFixed(4), senderId]
      );

      // 2. Add to receiver account
      await client.query(
        'UPDATE users SET balance = (balance::numeric + $1::numeric) WHERE id = $2',
        [amount.toFixed(4), receiverId]
      );

      // 3. Update specific wallet address balances for ledger consistency
      if (senderAddrId) {
        await client.query(
          'UPDATE wallet_addresses SET balance = GREATEST(0, balance::numeric - $1::numeric) WHERE id = $2',
          [amount.toFixed(4), senderAddrId]
        );
      }

      await client.query(
        'UPDATE wallet_addresses SET balance = (balance::numeric + $1::numeric) WHERE id = $2',
        [amount.toFixed(4), receiverAddrId]
      );

      // 4. Record transaction
      const txResult = await client.query(
        `INSERT INTO transactions (sender_id, receiver_id, sender_address, receiver_address, amount, type, block_id)
         VALUES ($1, $2, $3, $4, $5, 'transfer', NULL)
         RETURNING id, sender_id AS "senderId", receiver_id AS "receiverId",
                   sender_address AS "senderAddress", receiver_address AS "receiverAddress",
                   amount, type, block_id AS "blockId", timestamp`,
        [senderId, receiverId, senderAddress, receiverAddress, amount.toFixed(4)]
      );

      await client.query('COMMIT');
      console.log(`[TRANSFER] SUCCESS: TX ${txResult.rows[0].id} recorded.`);
      return txResult.rows[0] as Transaction;
    } catch (err) {
      await client.query('ROLLBACK');
      console.error(`[TRANSFER] EXCEPTION:`, err);
      throw err;
    } finally {
      client.release();
    }
  }

  async updateUserStake(userId: number, stakedBalance: string, balance: string, lastClaim: Date | null): Promise<User> {
    const updateData: any = { stakedBalance, balance };
    if (lastClaim) updateData.lastStakeRewardClaim = lastClaim;
    const [user] = await db.update(users)
      .set(updateData)
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async getTotalNetworkStaked(): Promise<string> {
    const [result] = await db.select({ total: sql<string>`COALESCE(SUM(staked_balance::numeric), 0)` }).from(users);
    return result?.total || "0";
  }

  async getTotalStakers(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(users).where(sql`staked_balance::numeric > 0`);
    return Number(result?.count || 0);
  }

  async isWalletBlocked(address: string): Promise<boolean> {
    const [blocked] = await db.select().from(blockedWallets).where(eq(blockedWallets.address, address));
    return !!blocked;
  }

  async getBlockedWallets(): Promise<BlockedWallet[]> {
    return await db.select().from(blockedWallets);
  }

  async blockWallet(address: string, reason: string): Promise<BlockedWallet> {
    const existing = await db.select().from(blockedWallets).where(eq(blockedWallets.address, address));
    if (existing.length > 0) return existing[0];
    const [blocked] = await db.insert(blockedWallets).values({ address, reason }).returning();
    return blocked;
  }

  async getAllConversionRequests(): Promise<ConversionRequest[]> {
    return await db.select().from(conversionRequests).orderBy(desc(conversionRequests.createdAt));
  }

  async getWalletBalance(address: string): Promise<string> {
    const [addr] = await db.select().from(walletAddresses).where(eq(walletAddresses.address, address));
    return addr?.balance || "0";
  }

  async getWalletNonce(address: string): Promise<number> {
    const [user] = await db.select({ nonce: users.nonce }).from(users).where(eq(users.walletAddress, address));
    return user?.nonce || 0;
  }

  async updateWalletBalance(address: string, amountChange: bigint, newNonce?: number): Promise<void> {
    const changeStr = (Number(amountChange) / 1_000_000).toFixed(4);
    const updateData: any = { 
      balance: sql`(balance::numeric + ${changeStr}::numeric)`
    };
    if (newNonce !== undefined) {
      updateData.nonce = newNonce;
    }

    await db.update(users).set(updateData).where(eq(users.walletAddress, address));
    await db.update(walletAddresses).set({
      balance: sql`(balance::numeric + ${changeStr}::numeric)`
    }).where(eq(walletAddresses.address, address));
  }

  async updateConversionStatus(id: number, status: string, amountApproved?: string): Promise<ConversionRequest> {
    const updateData: any = { status };
    if (amountApproved !== undefined) updateData.amountApproved = amountApproved;
    const [req] = await db.update(conversionRequests).set(updateData).where(eq(conversionRequests.id, id)).returning();
    return req;
  }

  async getNetworkStats(): Promise<{ totalUsers: number; totalBlocks: number; totalTransactions: number; circulatingSupply: string; latestBlockTime: Date | null }> {
    const [userCount] = await db.select({ count: sql<number>`count(*)` }).from(users);
    const [blockCount] = await db.select({ count: sql<number>`count(*)` }).from(blocks);
    const [txCount] = await db.select({ count: sql<number>`count(*)` }).from(transactions);
    const blocksList = await db.select().from(blocks).orderBy(desc(blocks.id)).limit(1000);
    const totalMined = blocksList.reduce((sum, b) => sum + parseFloat(b.reward || "0"), 0);
    const devAllocation = 6800000000;
    const foundationAllocation = 3400000000;
    const latestBlock = blocksList[0] || null;
    return {
      totalUsers: Number(userCount.count),
      totalBlocks: Number(blockCount.count),
      totalTransactions: Number(txCount.count),
      circulatingSupply: (totalMined + devAllocation + foundationAllocation).toFixed(4),
      latestBlockTime: latestBlock?.timestamp ? new Date(latestBlock.timestamp) : null,
    };
  }

  async joinCardWaitlist(entry: InsertCardWaitlistEntry): Promise<CardWaitlistEntry> {
    const [result] = await db.insert(cardWaitlist).values(entry).returning();
    return result;
  }

  async getCardWaitlistEntry(userId: number): Promise<CardWaitlistEntry | undefined> {
    const [entry] = await db.select().from(cardWaitlist).where(eq(cardWaitlist.userId, userId));
    return entry;
  }

  async getCardWaitlistCount(): Promise<number> {
    const [result] = await db.select({ count: sql<number>`count(*)` }).from(cardWaitlist);
    return Number(result.count);
  }

  async getAllCardWaitlistEntries(): Promise<any[]> {
    const entries = await db.select({
      id: cardWaitlist.id,
      email: cardWaitlist.email,
      userId: cardWaitlist.userId,
      username: users.username,
    }).from(cardWaitlist)
      .leftJoin(users, eq(cardWaitlist.userId, users.id))
      .orderBy(cardWaitlist.id);
    return entries;
  }

  async getUserRewardStats(userId: number): Promise<{ totalRewardsEarned: string; rewardsCount: number; lastRewardAmount: string }> {
    const [stats] = await db.select({
      total: sql<string>`COALESCE(SUM(amount::numeric), 0)`,
      count: sql<number>`count(*)`,
    }).from(transactions)
      .where(and(
        eq(transactions.receiverId, userId),
        or(eq(transactions.type, "staking_reward"), eq(transactions.type, "mining_reward"))
      ));
    
    const [lastTx] = await db.select().from(transactions)
      .where(and(
        eq(transactions.receiverId, userId),
        or(eq(transactions.type, "staking_reward"), eq(transactions.type, "mining_reward"))
      ))
      .orderBy(desc(transactions.id))
      .limit(1);

    return {
      totalRewardsEarned: stats?.total || "0.0000",
      rewardsCount: Number(stats?.count || 0),
      lastRewardAmount: lastTx?.amount || "0.0000"
    };
  }

}

export const storage = new DatabaseStorage();
