import { pgTable, text, serial, integer, boolean, timestamp, numeric } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  walletAddress: text("wallet_address").unique(),
  polygonAddress: text("polygon_address"),
  balance: numeric("balance", { precision: 20, scale: 4 }).default("0"),
  stakedBalance: numeric("staked_balance", { precision: 20, scale: 4 }).default("0"),
  lastStakeRewardClaim: timestamp("last_stake_reward_claim"),
  isDev: boolean("is_dev").default(false),
  isFoundation: boolean("is_foundation").default(false),
  totpSecret: text("totp_secret"),
  is2faEnabled: boolean("is_2fa_enabled").default(false),
  alias: text("alias").unique(),
  isAliasActive: boolean("is_alias_active").default(false),
  stakingStoppedAt: timestamp("staking_stopped_at"),
  lastActive: timestamp("last_active").defaultNow(),
  currentSessionId: text("current_session_id"),
  nonce: integer("nonce").default(0).notNull(),
  isBackbone: boolean("is_backbone").default(false),
  totalRewardsEarned: numeric("total_rewards_earned", { precision: 20, scale: 4 }).default("0"),
  lastRewardAmount: numeric("last_reward_amount", { precision: 20, scale: 4 }).default("0"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const walletAddresses = pgTable("wallet_addresses", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id).notNull(),
  label: text("label").notNull().default("Default"),
  address: text("address").notNull().unique(),
  polygonAddress: text("polygon_address"),
  publicKey: text("public_key").notNull(),
  encryptedPrivateKey: text("encrypted_private_key").notNull(),
  mnemonic: text("mnemonic").notNull(),
  balance: numeric("balance", { precision: 20, scale: 4 }).default("0"),
  isLocked: boolean("is_locked").default(false),
  isPrimary: boolean("is_primary").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const conversionRequests = pgTable("conversion_requests", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  oldWalletAddress: text("old_wallet_address").notNull(),
  amountClaimed: numeric("amount_claimed", { precision: 20, scale: 4 }).notNull(),
  amountApproved: numeric("amount_approved", { precision: 20, scale: 4 }),
  txProof: text("tx_proof"),
  status: text("status", { enum: ["pending", "approved", "rejected", "vesting"] }).default("pending"),
  vestingReleaseDate: timestamp("vesting_release_date"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blockedWallets = pgTable("blocked_wallets", {
  id: serial("id").primaryKey(),
  address: text("address").notNull().unique(),
  reason: text("reason").default("Old dev wallet - blocked"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const casinoSweepstakes = pgTable("casino_sweepstakes", {
  id: serial("id").primaryKey(),
  walletAddress: text("wallet_address").notNull(),
  game: text("game").notNull(),
  amountWon: numeric("amount_won", { precision: 20, scale: 4 }).notNull(),
  status: text("status", { enum: ["pending", "approved", "rejected"] }).default("pending"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const registrationIpLog = pgTable("registration_ip_log", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const faucetClaimLog = pgTable("faucet_claim_log", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  walletAddress: text("wallet_address").notNull(),
  lastClaimAt: timestamp("last_claim_at").defaultNow(),
});

export const bannedIps = pgTable("banned_ips", {
  id: serial("id").primaryKey(),
  ip: text("ip").notNull().unique(),
  reason: text("reason").default("Violation of Terms"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const blocks = pgTable("blocks", {
  id: serial("id").primaryKey(),
  hash: text("hash").notNull(),
  previousHash: text("previous_hash").notNull(),
  minerId: integer("miner_id").references(() => users.id),
  reward: numeric("reward", { precision: 20, scale: 4 }).notNull(),
  difficulty: integer("difficulty").default(1),
  nonce: integer("nonce").default(0),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  senderId: integer("sender_id").references(() => users.id),
  receiverId: integer("receiver_id").references(() => users.id),
  senderAddress: text("sender_address"),
  receiverAddress: text("receiver_address"),
  amount: numeric("amount", { precision: 20, scale: 4 }).notNull(),
  type: text("type", { enum: ["transfer", "mining_reward", "staking_reward", "conversion", "fee", "purchase", "faucet_reward"] }).notNull(),
  blockId: integer("block_id").references(() => blocks.id),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
  balance: true,
  walletAddress: true,
  stakedBalance: true,
  lastStakeRewardClaim: true,
});

export const insertConversionSchema = createInsertSchema(conversionRequests).omit({
  id: true,
  userId: true,
  amountApproved: true,
  status: true,
  vestingReleaseDate: true,
  createdAt: true
});

export const insertWalletAddressSchema = createInsertSchema(walletAddresses).omit({
  id: true,
  createdAt: true,
  balance: true,
  isLocked: true,
});

export const cardWaitlist = pgTable("card_waitlist", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  email: text("email").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertCardWaitlistSchema = createInsertSchema(cardWaitlist).omit({
  id: true,
});

export type CardWaitlistEntry = typeof cardWaitlist.$inferSelect;
export type InsertCardWaitlistEntry = z.infer<typeof insertCardWaitlistSchema>;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type ConversionRequest = typeof conversionRequests.$inferSelect;
export type InsertConversionRequest = z.infer<typeof insertConversionSchema>;
export type Block = typeof blocks.$inferSelect;
export type Transaction = typeof transactions.$inferSelect;
export type WalletAddress = typeof walletAddresses.$inferSelect;
export type InsertWalletAddress = z.infer<typeof insertWalletAddressSchema>;
export type BlockedWallet = typeof blockedWallets.$inferSelect;
export type CasinoSweepstake = typeof casinoSweepstakes.$inferSelect;

export * from "./models/chat";

export type LoginRequest = { username: string; password: string };
export type RegisterRequest = { username: string; password: string };
export type MiningSubmitRequest = { nonce: number; hash: string };
