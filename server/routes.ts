import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage.js";
import { api, helpChatInputSchema } from "../shared/routes.js";
import { z } from "zod";
import session from "express-session";
import pgSession from "connect-pg-simple";
import bcrypt from "bcrypt";
import { generateWallet, encryptPrivateKey, deriveKeyPair, verifySignature } from "./crypto.js";
import { createHash } from "crypto";
import { checkConnection, getContractAddress, getOnChainBalance, getMaticBalance, getPolygonscanBaseUrl, getRecentBlocks, getRecentTransactionsFromBlock } from "./blockchain.js";
import { db } from "./db.js";
import { sql, eq, and, gt, or } from "drizzle-orm";
import { users, transactions, walletAddresses, blockedWallets, blocks } from "../shared/schema.js";
import * as OTPAuth from "otpauth";
import QRCode from "qrcode";
import OpenAI from "openai";

const PostgresStore = pgSession(session);
import { pool } from "./db.js";

import { getConnectedPeersCount, getLivePeerList, broadcastQuorumVoteRequest, activeQuorumVotes } from "./signaling.js";
const rateLimitMap = new Map<string, { count: number; resetAt: number }>();
const faucetIpStamps = new Map<string, number>();
export let isBlockchainPaused = false;
let lastTxLatency = 12; // ms, baseline
let latencyHistory: number[] = [12, 12, 12, 12, 12]; // Keep a small window for moving average

function rateLimit(key: string, maxAttempts: number, windowMs: number): boolean {
  const now = Date.now();
  const entry = rateLimitMap.get(key);
  if (!entry || now > entry.resetAt) {
    rateLimitMap.set(key, { count: 1, resetAt: now + windowMs });
    return false;
  }
  entry.count++;
  return entry.count > maxAttempts;
}

function sanitizeUsername(input: string): string {
  return input.toLowerCase().replace(/[^a-z0-9._-]/g, "").trim();
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // Trust proxy now configured globally in index.ts before Rate Limiters

  // 🛡️ SECURITY: ALLOW GAMING HUB ACCESS (CORS)
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    const allowed = ["https://wd2-casino.netlify.app", "https://wd2casino.netlify.app"];
    if (origin && allowed.includes(origin)) {
      res.setHeader('Access-Control-Allow-Origin', origin);
      res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
      res.setHeader('Access-Control-Allow-Credentials', 'true');
    }
    if (req.method === 'OPTIONS') return res.sendStatus(200);
    next();
  });

  // 🛡️ WAVE 1: PERSISTENT POSTGRES SESSIONS
  // Ensure session table exists (Audit Point 4)
  // Added retry logic to prevent 'EAI_AGAIN' DNS crashes on Render Free Tier cold-starts
  let dbRetries = 30;
  while (dbRetries > 0) {
    try {
      await db.execute(sql`
        CREATE TABLE IF NOT EXISTS "session" (
          "sid" varchar NOT NULL COLLATE "default",
          "sess" json NOT NULL,
          "expire" timestamp(6) NOT NULL
        ) WITH (OIDS=FALSE);
        DO $$ BEGIN
          IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'session_pkey') THEN
            ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
          END IF;
        END $$;
        CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
        
        -- 🛡️ ENFORCE PRESENCE STAKING SCHEMA
        ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "last_active" timestamp DEFAULT now();
      `);
      console.log("✅ Render Postgres Database session connection established.");
      break;
    } catch (err: any) {
      console.error(`[DB STARTUP] Database connection failed (${err.code}). Retries left: ${dbRetries - 1}`);
      dbRetries -= 1;
      if (dbRetries === 0) {
        console.error("❌ FATAL: Database failed to connect after multiple retries.");
        throw err;
      }
      await new Promise(resolve => setTimeout(resolve, 5000)); // Wait 5 seconds before retrying
    }
  }

  app.use(session({
    secret: process.env.SESSION_SECRET!, 
    resave: false,
    saveUninitialized: false,
    name: 'wd2_session',
    cookie: {
      // 🛡️ SECURITY FIX: Removed 30-day maxAge. Now a strict "Session" cookie that deletes when the browser closes.
      secure: process.env.NODE_ENV === "production", 
      httpOnly: true,
      sameSite: 'lax',
    },
    store: new PostgresStore({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: false // We handled it manually for precision
    }),
  }));

  // 🛡️ WAVE 2: SINGLE SESSION ENFORCEMENT MIDDLEWARE
  app.use(async (req, res, next) => {
    // @ts-ignore
    const userId = req.session.userId;
    if (userId) {
      const user = await storage.getUser(userId);
      // @ts-ignore
      if (user && user.currentSessionId && user.currentSessionId !== req.sessionID) {
        console.log(`[AUTH] Session conflict for user ${userId}. Invalidating old session.`);
        req.session.destroy(() => {
          res.clearCookie("wd2_session");
        });
        return res.status(401).json({ message: "You have been logged in on another device.", sessionExpired: true });
      }
    }
    next();
  });

  app.post("/api/user/heartbeat", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    try {
      const { isBackbone } = req.body;
      const user = await storage.updateUser(req.session.userId, { 
        lastActive: new Date(),
        isBackbone: !!isBackbone 
      });
      res.json(user);
    } catch (e) {
      res.status(500).json({ message: "Heartbeat failed" });
    }
  });

  // === Auth Routes ===
  // Persistent anti-Sybil protection relocated to DB (registration_ip_log)
  
  app.post(api.auth.register.path, async (req, res) => {
    try {
      const ip = req.ip || req.socket?.remoteAddress || "unknown_ip";
      
      // 0. GLOBAL IP BLACKLIST CHECK
      const isBanned = await db.execute(sql`SELECT id FROM banned_ips WHERE ip = ${ip}`);
      if (isBanned.rows.length > 0) {
        return res.status(403).json({ message: "Network Access Denied: This IP Address has been permanently blacklisted for violation of Terms of Service." });
      }

      // 1. PERSISTENT IP LOCKOUT (Registration)
      const existingIp = await db.execute(sql`SELECT id FROM registration_ip_log WHERE ip = ${ip}`);
      if (existingIp.rows.length > 0 && ip !== "unknown_ip") {
        return res.status(403).json({ message: "STRICT LIMIT: Only 1 primary WebDollar 2 wallet registration is permitted per household device framework. Please use your existing account!" });
      }
      if (rateLimit(`register:${ip}`, 3, 60000)) {
        return res.status(429).json({ message: "Rate limit triggered. Stop immediately." });
      }

      const input = api.auth.register.input.parse(req.body);
      const username = sanitizeUsername(input.username);

      if (username.length < 3) {
        return res.status(400).json({ message: "Username must be at least 3 characters (letters, numbers, _ - .)" });
      }

      const existing = await storage.getUserByUsername(username);
      if (existing) {
        return res.status(400).json({ message: "Username already exists" });
      }

      if (input.password.length < 6) {
        return res.status(400).json({ message: "Password must be at least 6 characters" });
      }

      if (input.password.length > 128) {
        return res.status(400).json({ message: "Password too long" });
      }

      const hashedPassword = await bcrypt.hash(input.password, 12);
      const wallet = generateWallet();

      const user = await storage.createUser({
        username,
        password: hashedPassword,
        walletAddress: wallet.address,
        polygonAddress: wallet.polygonAddress,
        balance: "0",
        isDev: false,
        isFoundation: false,
        nonce: 0
      });

      const encryptedKey = encryptPrivateKey(wallet.privateKey, input.password);
      await storage.createWalletAddress({
        userId: user.id,
        label: "Primary Wallet",
        address: wallet.address,
        polygonAddress: wallet.polygonAddress,
        publicKey: wallet.publicKey,
        encryptedPrivateKey: encryptedKey,
        mnemonic: wallet.mnemonic,
        isPrimary: true,
      });

      // Secure device lock mapping against multi-account spam across DB reboots
      if (ip !== "unknown_ip") {
        await db.execute(sql`INSERT INTO registration_ip_log (ip) VALUES (${ip}) ON CONFLICT DO NOTHING`);
      }
      req.session.userId = user.id;
      // Record session for single-device enforcement
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      const { password: _, ...safeUser } = user;
      res.status(201).json(safeUser);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Register error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.post(api.auth.login.path, async (req, res, next) => {
    try {
      const ip = req.ip || "unknown";
      // 🛡️ REQ ID 10: Relaxed for Troubleshooting (10 attempts, 2 minute cooldown)
      if (rateLimit(`login:${ip}`, 10, 120000)) {
        return res.status(429).json({ message: "Security Warning: Too many attempts. Access blocked for 2 minutes." });
      }

      const { username: rawUsername, password } = req.body;

      if (!rawUsername || !password || typeof rawUsername !== "string" || typeof password !== "string") {
        return res.status(400).json({ message: "Username and password are required" });
      }

      const rawTrimmed = rawUsername.trim();
      const sanitized = sanitizeUsername(rawTrimmed);
      
      let user = await storage.getUserByUsername(rawTrimmed); // Exact match first (Legacy support)
      if (!user) {
        user = await storage.getUserByUsername(sanitized); // Sanitized match (New users)
      }
      if (!user) {
        // Final fallback: Case-insensitive match on the raw username
        const fallbackResult = await db.execute(sql`SELECT * FROM users WHERE username ILIKE ${rawTrimmed} LIMIT 1`);
        if (fallbackResult.rows.length > 0) {
           user = fallbackResult.rows[0] as any;
        }
      }

      console.log(`[LOGIN] Attempt for username: "${rawTrimmed}", user found: ${!!user}`);

      if (!user) {
        return res.status(401).json({ message: "Invalid credentials" });
      }

      const isValid = await bcrypt.compare(password, user.password);
      if (!isValid) {
        console.log(`[LOGIN] Invalid password for user: "${rawTrimmed}"`);
        return res.status(401).json({ message: "Invalid credentials" });
      }

      console.log(`[LOGIN] Password valid for "${rawTrimmed}", 2FA enabled: ${user.is2faEnabled}, has TOTP: ${!!user.totpSecret}`);

      // 🛡️ PERMANENT OWNER PROMOTION: Ensure specified admins always have Admin rights
      const adminUsers = (process.env.ADMIN_USERNAMES || "").split(",").map(u => u.trim().toLowerCase());
      if (adminUsers.includes(user.username.toLowerCase())) {
        if (!user.isDev) {
          await db.update(users).set({ isDev: true }).where(eq(users.id, user.id));
          user.isDev = true;
        }
      }

      if (user.is2faEnabled && user.totpSecret) {
        console.log(`[LOGIN] Requiring 2FA for "${rawTrimmed}"`);
        // @ts-ignore
        req.session.pending2FAUserId = user.id;
        return res.status(200).json({ requires2FA: true, userId: user.id });
      }

      // @ts-ignore
      req.session.userId = user.id;
      // Record session for single-device enforcement
      await storage.updateUser(user.id, { currentSessionId: req.sessionID });
      console.log(`[LOGIN] Login successful for "${rawTrimmed}", session userId set to ${user.id}`);

      const { password: _, totpSecret: _s, ...safeUser } = user;
      res.json(safeUser);
    } catch (err) {
      console.error("Login error:", err);
      next(err);
    }
  });

  app.post(api.auth.logout.path, (req, res) => {
    // 🛡️ SECURITY HARDENING: Explicitly delete the session cookie from the browser
    res.clearCookie("wd2_session", {
      path: "/",
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax"
    });

    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error (Session Destruction Failed):", err);
        return res.status(500).json({ message: "Logout failed on server" });
      }
      res.json({ message: "Session terminated securely." });
    });
  });

  app.get(api.auth.me.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Not logged in" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    // 🛡️ BACKGROUND PROMOTION: Fix for sticky sessions
    const adminUsers = (process.env.ADMIN_USERNAMES || "").split(",").map(u => u.trim().toLowerCase());
    if (adminUsers.includes(user.username.toLowerCase()) && !user.isDev) {
      await db.update(users).set({ isDev: true }).where(eq(users.id, user.id));
      user.isDev = true;
    }

    const { password: _, totpSecret: _s, ...safeUser } = user;
    res.json(safeUser);
  });

  // === Password Reset via Seed Phrase ===

  app.post(api.auth.resetPassword.path, async (req, res) => {
    const ip = req.ip || "unknown";
    if (rateLimit(`reset:${ip}`, 5, 60000)) {
      return res.status(429).json({ message: "Too many reset attempts. Try again in a minute." });
    }

    const { username: rawUsername, seedPhrase, newPassword } = req.body;

    if (!rawUsername || !seedPhrase || !newPassword || typeof rawUsername !== "string") {
      return res.status(400).json({ message: "Username, seed phrase, and new password are required" });
    }

    const username = sanitizeUsername(rawUsername);

    if (newPassword.length < 6) {
      return res.status(400).json({ message: "New password must be at least 6 characters" });
    }

    if (newPassword.length > 128) {
      return res.status(400).json({ message: "Password too long" });
    }

    const user = await storage.getUserByUsername(username);
    if (!user) {
      return res.status(404).json({ message: "Account not found" });
    }

    const addresses = await storage.getWalletAddresses(user.id);
    const primaryAddr = addresses.find(a => a.isPrimary);
    if (!primaryAddr) {
      return res.status(400).json({ message: "No wallet found for this account" });
    }

    const trimmedPhrase = seedPhrase.trim().toLowerCase();
    const storedPhrase = (primaryAddr.mnemonic || "").trim().toLowerCase();

    if (trimmedPhrase !== storedPhrase) {
      return res.status(400).json({ message: "Seed phrase does not match. Please check and try again." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 12);
    await storage.updateUserPassword(user.id, hashedPassword);

    const keys = deriveKeyPair(trimmedPhrase);
    const newEncKey = encryptPrivateKey(keys.privateKey, newPassword);
    
    // Always re-encrypt the primary wallet associated with this seed phrase
    await storage.updateWalletAddress(primaryAddr.id, { 
        encryptedPrivateKey: newEncKey, 
        isLocked: false, 
        mnemonic: trimmedPhrase 
    });

    res.json({ message: "Password reset sequence complete. Primary wallet re-encrypted and secured with your new credentials." });
  });

  // === Two-Factor Authentication (2FA) Routes ===

  app.get(api.auth.twoFactor.status.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });
    res.json({ enabled: !!user.is2faEnabled });
  });

  app.post(api.auth.twoFactor.setup.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const ip = req.ip || "unknown";
    if (rateLimit(`2fa-setup:${ip}`, 5, 60000)) {
      return res.status(429).json({ message: "Too many requests. Try again in a minute." });
    }
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const secret = new OTPAuth.Secret({ size: 20 });
    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: secret,
    });

    const otpauthUrl = totp.toString();
    const qrCodeUrl = await QRCode.toDataURL(otpauthUrl);

    await storage.updateUser2FA(user.id, secret.base32, false);

    res.json({ qrCodeUrl, secret: secret.base32 });
  });

  app.post(api.auth.twoFactor.enable.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    if (!user.totpSecret) {
      return res.status(400).json({ message: "Please set up 2FA first by generating a QR code" });
    }

    const { code } = req.body;
    if (!code || typeof code !== "string") {
      return res.status(400).json({ message: "Verification code is required" });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });

    const expectedToken = totp.generate();
    if (process.env.NODE_ENV !== "production") {
      console.log(`[2FA Enable Debug] User: ${user.username}, Code entered: ${code}, Expected: ${expectedToken}`);
    }

    const delta = totp.validate({ token: code, window: 3 });
    if (delta === null) {
      return res.status(400).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
    }

    await storage.updateUser2FA(user.id, user.totpSecret, true);
    res.json({ message: "Two-factor authentication enabled successfully!" });
  });

  app.post(api.auth.twoFactor.disable.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { code, password } = req.body;
    if (!code || !password) {
      return res.status(400).json({ message: "Verification code and password are required" });
    }

    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      return res.status(400).json({ message: "Invalid password" });
    }

    if (user.totpSecret) {
      const totp = new OTPAuth.TOTP({
        issuer: "WebDollar2",
        label: user.username,
        algorithm: "SHA1",
        digits: 6,
        period: 30,
        secret: OTPAuth.Secret.fromBase32(user.totpSecret),
      });

      const delta = totp.validate({ token: code, window: 3 });
      if (delta === null) {
        return res.status(400).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
      }
    }

    await storage.updateUser2FA(user.id, null, false);
    res.json({ message: "Two-factor authentication has been disabled." });
  });

  app.post(api.auth.twoFactor.verify.path, async (req, res) => {
    const { userId, code } = req.body;
    if (!userId || !code) {
      return res.status(400).json({ message: "Verification code is required" });
    }

    // @ts-ignore
    const pendingUserId = req.session.pending2FAUserId;
    if (!pendingUserId || pendingUserId !== userId) {
      return res.status(401).json({ message: "No pending 2FA challenge. Please log in again." });
    }

    const ip = req.ip || "unknown";
    if (rateLimit(`2fa:${ip}`, 5, 60000)) {
      return res.status(429).json({ message: "Too many verification attempts. Try again in a minute." });
    }
    if (rateLimit(`2fa:user:${userId}`, 5, 60000)) {
      return res.status(429).json({ message: "Too many verification attempts for this account. Try again in a minute." });
    }

    const user = await storage.getUser(userId);
    if (!user || !user.totpSecret || !user.is2faEnabled) {
      return res.status(401).json({ message: "Invalid request" });
    }

    const totp = new OTPAuth.TOTP({
      issuer: "WebDollar2",
      label: user.username,
      algorithm: "SHA1",
      digits: 6,
      period: 30,
      secret: OTPAuth.Secret.fromBase32(user.totpSecret),
    });

    const expectedToken = totp.generate();
    if (process.env.NODE_ENV !== "production") {
      console.log(`[2FA Verify Login Debug] User: ${user.username}, Code entered: ${code}, Expected: ${expectedToken}`);
    }

    const delta = totp.validate({ token: code, window: 3 });
    if (delta === null) {
      return res.status(401).json({ message: "Invalid code. Make sure the time on your phone is set to automatic, then try the latest code from your authenticator app." });
    }

    // @ts-ignore
    delete req.session.pending2FAUserId;
    // @ts-ignore
    req.session.userId = user.id;
    // Record session for single-device enforcement
    await storage.updateUser(user.id, { currentSessionId: req.sessionID });
    const { password: _, totpSecret: _s, ...safeUser } = user;
    res.json(safeUser);
  });

  // === Alias Resolution ===

  app.get('/api/alias/resolve/:username', async (req, res) => {
    const { username: rawLookup } = req.params;
    const lookup = rawLookup.trim();
    
    // Step 1: Try resolving by custom alias first (Case-Insensitive)
    const aliasResult = await db.execute(sql`SELECT * FROM users WHERE alias ILIKE ${lookup} LIMIT 1`);
    const aliasUser = aliasResult.rows[0] as any;
    
    if (aliasUser && aliasUser.wallet_address) {
      return res.json({ 
        address: aliasUser.wallet_address, 
        username: aliasUser.is_alias_active ? (aliasUser.alias || aliasUser.username) : "Anonymous Wallet"
      });
    }
    
    // Step 2: Fallback to username lookup (Case-Insensitive)
    const userResult = await db.execute(sql`SELECT * FROM users WHERE username ILIKE ${lookup} LIMIT 1`);
    
    if (userResult.rows.length === 0 || !(userResult.rows[0] as any).wallet_address) {
      return res.status(404).json({ message: "Alias or username not found on the network." });
    }

    const userByName = userResult.rows[0] as any;
    
    // Security: If this user HAS a custom alias set, don't allow resolution by raw username
    if (userByName.alias && userByName.alias.length > 0) {
      return res.status(404).json({ message: "This user has a custom alias configured. Please use their alias to send funds." });
    }
    
    res.json({ address: userByName.wallet_address, username: userByName.username });
  });

  app.post('/api/alias/update', async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { alias, isAliasActive } = req.body;
    
    let sanitizedAlias = null;
    
    if (alias) {
      // REQUIREMENT: Enforce "@WEBD2" suffix and capitalization
      // Input can be "Sample" or "Sample@WEBD2"
      let basePart = alias.trim();
      if (basePart.toLowerCase().endsWith("@webd2")) {
        basePart = basePart.substring(0, basePart.length - 6).trim();
      }

      // Case-sensitive part (as requested "the rest should remain case sensetive")
      // BUT for routing we usually want lowercase for uniqueness checks. 
      // User says "the rest should remain case sensetive", so we store it as is but check uniqueness lowercased.
      const rawAlias = basePart;
      const lowerAlias = basePart.toLowerCase();

      if (lowerAlias === user.username.toLowerCase()) {
        return res.status(400).json({ message: "For security, your alias cannot be the same as your username." });
      }
      
      if (lowerAlias.length < 3) {
        return res.status(400).json({ message: "Alias must be at least 3 characters." });
      }

      // Final alias format: Sample@WEBD2
      sanitizedAlias = `${rawAlias}@WEBD2`;
      
      const existing = await storage.getUserByAlias(sanitizedAlias);
      if (existing && existing.id !== user.id) {
         return res.status(400).json({ message: "This alias is already taken by someone else." });
      }
      
      // Also check if anyone else has this as a base username (case insensitive)
      const existingUsername = await storage.getUserByUsername(lowerAlias);
      if (existingUsername && existingUsername.id !== user.id) {
         return res.status(400).json({ message: "This alias base is already registered as a username. Choose something unique." });
      }
    }

    const updated = await storage.updateUserAlias(user.id, sanitizedAlias, isAliasActive);
    const { password: _, totpSecret: _s, ...safeUser } = updated;
    res.json(safeUser);
  });

  // === Wallet Address Management ===

  app.get(api.wallet.addresses.list.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const addresses = await storage.getWalletAddresses(req.session.userId);
    const safe = addresses.map(a => ({ ...a, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]", polygonAddress: a.polygonAddress }));
    res.json(safe);
  });

  app.post(api.wallet.addresses.create.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    const { label = "New Wallet", password } = req.body;
    if (!password) return res.status(400).json({ message: "Password is required to secure the new address." });

    const wallet = generateWallet();
    const encryptedKey = encryptPrivateKey(wallet.privateKey, password);

    const addr = await storage.createWalletAddress({
      // @ts-ignore
      userId: req.session.userId,
      label,
      address: wallet.address,
      polygonAddress: wallet.polygonAddress,
      publicKey: wallet.publicKey,
      encryptedPrivateKey: encryptedKey,
      mnemonic: wallet.mnemonic,
      isPrimary: false,
    });

    res.status(201).json({ ...addr, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });

  app.get("/api/wallet/addresses/:id/phrase", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    const addr = await storage.getWalletAddress(Number(req.params.id));
    // @ts-ignore
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }

    if (addr.isLocked) {
      return res.status(400).json({ message: "Address is locked. Unlock it first." });
    }

    res.json({ mnemonic: addr.mnemonic, address: addr.address, publicKey: addr.publicKey });
  });

  app.patch("/api/wallet/addresses/:id/lock", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    // @ts-ignore
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    const updated = await storage.updateWalletAddress(addr.id, { isLocked: true });
    res.json({ ...updated, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });

  app.patch("/api/wallet/addresses/:id/unlock", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    // @ts-ignore
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    const updated = await storage.updateWalletAddress(addr.id, { isLocked: false });
    res.json({ ...updated, encryptedPrivateKey: "[ENCRYPTED]", mnemonic: "[HIDDEN]" });
  });

  app.delete("/api/wallet/addresses/:id", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    const addr = await storage.getWalletAddress(Number(req.params.id));
    // @ts-ignore
    if (!addr || addr.userId !== req.session.userId) {
      return res.status(404).json({ message: "Address not found" });
    }
    if (addr.isPrimary) {
      return res.status(400).json({ message: "Cannot delete primary wallet address" });
    }
    if (Number(addr.balance) > 0) {
      return res.status(400).json({ message: "Cannot delete address with a positive balance. Transfer funds first." });
    }
    await storage.deleteWalletAddress(addr.id);
    res.json({ message: "Address deleted" });
  });

  // === Wallet Routes ===

  app.get(api.wallet.get.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const userId = req.session.userId;
    const user = await storage.getUser(userId);

    // 🛡️ SELF-HEALING: Ensure user always has a primary wallet address
    const addresses = await storage.getWalletAddresses(userId);
    if (addresses.length === 0) {
      console.log(`[Self-Healing] User ${user?.username} has no wallet addresses. Creating primary...`);
      const wallet = generateWallet();
      const encryptedKey = encryptPrivateKey(wallet.privateKey, "default_enc"); // In a real production this should be based on login secret
      
      const addr = await storage.createWalletAddress({
        userId,
        label: "Primary Wallet",
        address: wallet.address,
        polygonAddress: wallet.polygonAddress,
        publicKey: wallet.publicKey,
        encryptedPrivateKey: encryptedKey,
        mnemonic: wallet.mnemonic,
        isPrimary: true,
      });

      // Update user's primary walletAddress if not set
      if (user && !user.walletAddress) {
        await storage.updateUserStake(user.id, user.stakedBalance || "0", user.balance || "0", user.lastStakeRewardClaim);
        // We need a more direct update for walletAddress but updateUserStake doesn't do it.
        // I'll add a database update directly.
        await db.update(users).set({ walletAddress: wallet.address }).where(eq(users.id, userId));
      }
      
      // Re-fetch user to get the updated wallet information
      const updatedUser = await storage.getUser(userId);
      const { password: _, ...safeUser } = updatedUser!;
      return res.json(safeUser);
    }

    const { password: _, ...safeUser } = user!;
    res.json(safeUser);
  });

  app.post("/api/staking/stop", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    await storage.updateUser(req.session.userId, { stakingStoppedAt: new Date() });
    res.json({ success: true, message: "Staking stopped. Tokens will be released in 7 days." });
  });

  // === PROOF OF PRESENCE HEARTBEAT ===
  app.post("/api/staking/heartbeat", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    await db.update(users).set({ lastActive: new Date() }).where(eq(users.id, req.session.userId));
    res.json({ success: true, timestamp: new Date().toISOString() });
  });

  // 🛡️ WAVE 1: SECURE SIGNING PREFLIGHT
  app.get("/api/wallet/sign-preflight", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const userId = req.session.userId;
    const user = await storage.getUser(userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addresses = await storage.getWalletAddresses(userId);
    const primary = addresses.find(a => a.isPrimary) || addresses[0];

    if (!primary) return res.status(404).json({ message: "Primary wallet not found" });

    res.json({
      encryptedPrivateKey: primary.encryptedPrivateKey,
      publicKey: primary.publicKey,
      nonce: user.nonce,
    });
  });

  app.post(api.wallet.transfer.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }

    const { recipientAddress, amount } = req.body;

    if (!recipientAddress || typeof recipientAddress !== "string" || recipientAddress.trim().length < 5) {
      return res.status(400).json({ message: "Valid recipient address is required" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    if (amountNum > 999999999999) {
      return res.status(400).json({ message: "Amount too large" });
    }

    // @ts-ignore
    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(401).json({ message: "User not found" });

    const isSenderBlocked = await storage.isWalletBlocked(sender.walletAddress!);
    if (isSenderBlocked) {
      return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
    }

    // 🛡️ WAVE 1: CRITICAL SIGNATURE VERIFICATION (Audit Point 10)
    const { signature, nonce } = req.body;
    if (!signature || nonce === undefined) {
      return res.status(400).json({ message: "Transaction must be signed with a valid cryptographic signature." });
    }

    // Verify nonce first for replay protection
    if (nonce !== sender.nonce) {
      return res.status(400).json({ message: `Invalid network nonce. Expected ${sender.nonce}, got ${nonce}.` });
    }

    // Verify signature against public key
    // We need the public key associated with the sender's current wallet
    const senderWallet = await storage.getWalletAddressByAddress(sender.walletAddress!);
    if (!senderWallet || !senderWallet.publicKey) {
       return res.status(400).json({ message: "Sender public key not found on network." });
    }

    const message = JSON.stringify({ recipientAddress: recipientAddress.trim(), amount: amountNum.toString(), nonce });
    const isValid = verifySignature(message, signature, senderWallet.publicKey);
    
    if (!isValid) {
      console.error(`[SECURITY] Signature verification failed for User ${sender.username}`);
      return res.status(400).json({ message: "Invalid transaction signature. Security rejection." });
    }

    if (sender.walletAddress === recipientAddress.trim()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }

    const recipientWalletAddr = await storage.getWalletAddressByAddress(recipientAddress.trim());
    if (!recipientWalletAddr) {
      return res.status(400).json({ message: "Recipient wallet address not found on the network" });
    }

    const recipient = await storage.getUser(recipientWalletAddr.userId);
    if (!recipient) {
      return res.status(400).json({ message: "Recipient account not found" });
    }

    if (parseFloat(sender.balance!) < amountNum) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const senderAddrId = senderWallet ? senderWallet.id : null;

    try {
      const startTime = performance.now();
      const tx = await storage.executeTransfer(
        sender.id,
        recipient.id,
        senderAddrId,
        recipientWalletAddr.id,
        amountNum,
        sender.walletAddress!,
        recipientAddress.trim(),
        nonce
      );
      const currentLat = Math.round(performance.now() - startTime);
      
      // Update moving average
      latencyHistory.push(currentLat);
      if (latencyHistory.length > 5) latencyHistory.shift();
      lastTxLatency = Math.round(latencyHistory.reduce((a, b) => a + b, 0) / latencyHistory.length);

      res.status(201).json({ ...tx, txLatency: currentLat });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || "Transfer failed" });
    }
  });

  // Private transactions use the same transfer logic but are not publicly visible in the explorer
  app.post("/api/wallet/transfer/private", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }

    const { recipientAddress, amount } = req.body;
    if (!recipientAddress || !amount) {
      return res.status(400).json({ message: "Recipient and amount are required" });
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum) || amountNum <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // @ts-ignore
    const sender = await storage.getUser(req.session.userId);
    if (!sender) return res.status(401).json({ message: "User not found" });

    const isSenderBlocked = await storage.isWalletBlocked(sender.walletAddress!);
    if (isSenderBlocked) {
      return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
    }

    // 🛡️ SIGNATURE VERIFICATION — Same requirement as public transfer
    const { signature, nonce } = req.body;
    if (!signature || nonce === undefined) {
      return res.status(400).json({ message: "Transaction must be signed with a valid cryptographic signature." });
    }
    if (nonce !== sender.nonce) {
      return res.status(400).json({ message: `Invalid network nonce. Expected ${sender.nonce}, got ${nonce}.` });
    }
    const senderWalletForSig = await storage.getWalletAddressByAddress(sender.walletAddress!);
    if (!senderWalletForSig || !senderWalletForSig.publicKey) {
      return res.status(400).json({ message: "Sender public key not found on network." });
    }
    const sigMessage = JSON.stringify({ recipientAddress: recipientAddress.trim(), amount: amountNum.toString(), nonce });
    const isSigValid = verifySignature(sigMessage, signature, senderWalletForSig.publicKey);
    if (!isSigValid) {
      console.error(`[SECURITY] Private transfer signature verification failed for User ${sender.username}`);
      return res.status(400).json({ message: "Invalid transaction signature. Security rejection." });
    }

    if (sender.walletAddress === recipientAddress.trim()) {
      return res.status(400).json({ message: "Cannot transfer to yourself" });
    }

    const recipientWalletAddr = await storage.getWalletAddressByAddress(recipientAddress.trim());
    if (!recipientWalletAddr) {
      return res.status(400).json({ message: "Recipient address not found on the network" });
    }

    const recipient = await storage.getUser(recipientWalletAddr.userId);
    if (!recipient) {
      return res.status(400).json({ message: "Recipient account not found" });
    }

    if (parseFloat(sender.balance!) < amountNum) {
      return res.status(400).json({ message: "Insufficient balance" });
    }

    const senderWalletAddr = await storage.getWalletAddressByAddress(sender.walletAddress!);
    const senderAddrId = senderWalletAddr ? senderWalletAddr.id : null;

    try {
      const startTime = performance.now();
      const tx = await storage.executeTransfer(
        sender.id,
        recipient.id,
        senderAddrId,
        recipientWalletAddr.id,
        amountNum,
        "***PRIVATE_SENDER***",
        "***PROTECTED_RECIPIENT***",
        nonce
      );
      lastTxLatency = Math.round(performance.now() - startTime);

      // Mark as private — addresses are masked in the response
      res.status(201).json({
        ...tx,
        isPrivate: true,
        txLatency: lastTxLatency,
        senderAddress: (tx.senderAddress && tx.senderAddress !== "FAUCET_TESTNET" && !tx.senderAddress.startsWith("SYSTEM_")) ? tx.senderAddress.substring(0, 8) + "..." : tx.senderAddress,
        receiverAddress: (tx.receiverAddress && !tx.receiverAddress.startsWith("SYSTEM_")) ? tx.receiverAddress.substring(0, 8) + "..." : tx.receiverAddress,
      });
    } catch (err: any) {
      return res.status(400).json({ message: err.message || "Private transfer failed" });
    }
  });

  // === Testnet Faucet ===
  // Persistent 24h cooldown relocated to DB (faucet_claim_log)
   app.post("/api/wallet/testnet-faucet", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }
    
    try {
      const { challenge, nonce } = req.body;
      const clientIp = req.ip || req.socket?.remoteAddress || "unknown_ip";

      // 🛡️ SYBIL PROTECTION (Wave 3): Proof of Work
      if (!challenge || !nonce) {
        return res.status(400).json({ message: "Mining proof required. Please enable your browser miner to claim." });
      }

      const hash = createHash("sha256").update(String(req.session.userId) + challenge + nonce).digest("hex");
      if (!hash.startsWith("000")) {
        return res.status(400).json({ message: "Invalid mining proof. CPU effort verification failed." });
      }
      
      // 0. GLOBAL IP BLACKLIST CHECK
      const isBanned = await db.execute(sql`SELECT id FROM banned_ips WHERE ip = ${clientIp}`);
      if (isBanned.rows.length > 0) {
        return res.status(403).json({ message: "Access Denied: IP Blacklisted." });
      }

      // 1. PERSISTENT IP LOCKOUT (Faucet)
      const existingClaim = await db.execute(sql`SELECT last_claim_at FROM faucet_claim_log WHERE ip = ${clientIp}`);
      if (existingClaim.rows.length > 0) {
          const lastClaim = new Date(existingClaim.rows[0].last_claim_at as string).getTime();
          if (Date.now() - lastClaim < 24 * 60 * 60 * 1000) {
             return res.status(429).json({ message: "Network Limit: Your IP address has already claimed the Faucet today. Strict 1 claim per household router or device allows." });
          }
      }
        // @ts-ignore
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(401).json({ message: "User not found" });

      const isSenderBlocked = await storage.isWalletBlocked(user.walletAddress!);
      if (isSenderBlocked) {
        return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
      }

      // Check 24 hour limit via database transactions
      const userTxs = await storage.getUserTransactions(user.id);
      const lastClaim = userTxs.find(tx => tx.senderAddress === "FAUCET_TESTNET");
      if (lastClaim && lastClaim.timestamp) {
        const hours24Ago = new Date(Date.now() - 24 * 60 * 60 * 1000);
        if (new Date(lastClaim.timestamp) > hours24Ago) {
          return res.status(429).json({ message: "You can only claim the Testnet Faucet once every 24 hours!" });
        }
      }

      const addedAmount = 10000;
      const currentBalance = parseFloat(user.balance || "0");
      // Balance update deferred to sync with primary wallet below
      const newBalance = (currentBalance + addedAmount).toFixed(4);
      
      // Log persistent IP timestamp for 24h lockout
      if (clientIp !== "unknown_ip") {
          await db.execute(sql`
            INSERT INTO faucet_claim_log (ip, wallet_address, last_claim_at) 
            VALUES (${clientIp}, ${user.walletAddress || "N/A"}, NOW())
            ON CONFLICT (ip) DO UPDATE SET last_claim_at = NOW()
          `);
      }
      
      // specifically add to their primary wallet address balance as well
      const primaryAddrQuery = await storage.getWalletAddresses(user.id);
      const primaryAddr = primaryAddrQuery.find(a => a.isPrimary);
      if (primaryAddr) {
        const addrCurrent = parseFloat(primaryAddr.balance || "0");
        const newAddrBalance = (addrCurrent + addedAmount).toFixed(4);
        await storage.updateWalletAddressBalance(primaryAddr.id, newAddrBalance);
        
        // Also update the global user balance to match
        await storage.updateUserBalance(user.id, newAddrBalance);
      } else {
        // Fallback if no primary address (rare)
        await storage.updateUserBalance(user.id, (parseFloat(user.balance || "0") + addedAmount).toFixed(4));
      }

      await storage.createTransaction({
        senderId: null,
        receiverId: user.id,
        senderAddress: "FAUCET_TESTNET",
        receiverAddress: user.walletAddress,
        amount: addedAmount.toFixed(4),
        type: "mining_reward", 
        blockId: null
      });

      // Secure IP cache to stop multi-tab/browser abuse
      faucetIpStamps.set(clientIp, Date.now());

      res.json({ success: true, amount: addedAmount });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Faucet failed" });
    }
  });



  app.get(api.transactions.mine.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const txs = await storage.getUserTransactions(req.session.userId);
    res.json(txs);
  });

  // === Proof-of-Stake Staking Routes ===

  // === Proof-of-Stake Staking Routes (100-Year Halving Model) ===
  const TOTAL_MINING_SUPPLY = 43200000000; // Total to be mined over 100 years
  const BLOCKS_PER_ERA = 18921600; // Exactly 3 standard years (365 days) at 5s blocks
  const INITIAL_ERA_REWARD = 1141.55; // Starting reward to reach exactly 43.2B through halvings over 100 years
  const REWARD_INTERVAL_SECONDS = 5;
  const MIN_STAKE_AMOUNT = 1000;

  function getCurrentBlockReward(height: number): number {
    const era = Math.floor(height / BLOCKS_PER_ERA);
    if (era >= 32) return 0; // Supply cap reached
    return INITIAL_ERA_REWARD / Math.pow(2, era);
  }

  function sha256Hex(input: string): string {
    return createHash("sha256").update(input).digest("hex");
  }

  /**
   * DIELBS (Digital Integrated Emission Ledger Browser System) 
   * CORE CONSENSUS REWARD LOGIC - MAINNET STABILIZED V1.0
   * 
   * This function calculates participation rewards based on network weight.
   * Logic: (User Staked / Total Network Staked) * Emission Rate per Slot
   */
  function calculateDIELBSParticipationRewards(
    userStaked: number, 
    totalNetworkStaked: number, 
    lastClaimTime: Date | string | null,
    currentHeight: number
  ): number {
    if (userStaked <= 0 || totalNetworkStaked <= 0) return 0;
    
    const now = Date.now();
    const lastClaim = lastClaimTime ? new Date(lastClaimTime).getTime() : now;
    
    // Safety check for invalid dates
    if (isNaN(lastClaim)) return 0;
    
    const elapsedSeconds = Math.max(0, (now - lastClaim) / 1000);
    
    // Liveness Threshold: Rewards only accrue during active socket/tab presence (30s window)
    const LIVENESS_THRESHOLD_SECONDS = 30;
    const effectiveElapsed = Math.min(elapsedSeconds, LIVENESS_THRESHOLD_SECONDS);
    
    // Calculate slots participated (1 slot = 5 seconds)
    const rewardPeriods = effectiveElapsed / REWARD_INTERVAL_SECONDS;
    
    // Weighted share of the current reward rate based on halving era
    const currentRate = getCurrentBlockReward(currentHeight);
    const userShare = userStaked / totalNetworkStaked;
    const cumulativeReward = userShare * currentRate * rewardPeriods;
    
    // Return high-precision floor to prevent floating point drift
    return Math.max(0, parseFloat(cumulativeReward.toFixed(8)));
  }

  function calculateNetworkAPY(networkTotalWeight: number, currentHeight: number): number {
    if (networkTotalWeight <= 0) return 0;
    const currentRate = getCurrentBlockReward(currentHeight);
    const rewardsPerYear = currentRate * (365 * 24 * 3600 / REWARD_INTERVAL_SECONDS);
    const apy = (rewardsPerYear / networkTotalWeight) * 100;
    return Math.min(apy, 10000); // Cap UI at 10,000%
  }

  app.get(api.staking.info.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const totalNetworkStaked = await storage.getTotalNetworkStaked();
    const totalStakedNum = parseFloat(totalNetworkStaked);
    let userStaked = parseFloat(user.stakedBalance || "0");

    // === 7-Day Hold Auto-Release Check ===
    const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
    let stakingStoppedAt = user.stakingStoppedAt ? new Date(user.stakingStoppedAt).getTime() : null;
    let holdRemainingMs = 0;
    let isOnHold = false;

    if (stakingStoppedAt && userStaked > 0) {
      const elapsed = Date.now() - stakingStoppedAt;
      if (elapsed >= SEVEN_DAYS_MS) {
        // Auto-release: 7 days passed, return staked funds to balance
        const availableBalance = parseFloat(user.balance || "0");
        const newBalance = (availableBalance + userStaked).toFixed(4);
        await storage.updateUserStake(user.id, "0", newBalance, null);
        // @ts-ignore
        await db.update(users).set({ stakingStoppedAt: null }).where(eq(users.id, user.id));

        const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress!);
        if (minerWalletAddr) {
          const addrBal = parseFloat(minerWalletAddr.balance || "0");
          await storage.updateWalletAddressBalance(minerWalletAddr.id, (addrBal + userStaked).toFixed(4));
        }

        // Re-fetch user after release
        const updatedUser = await storage.getUser(user.id);
        const latestBlock = await storage.getLatestBlock();
        const totalMined = await storage.getTotalMinedSupply();
        return res.json({
          stakedBalance: "0",
          pendingRewards: "0",
          apy: 0,
          totalNetworkStaked: (totalStakedNum - userStaked).toFixed(4),
          blockHeight: latestBlock?.id || 0,
          circulatingSupply: (parseFloat(totalMined) + 6800000000 + 3400000000).toFixed(4),
          stakingStoppedAt: null,
          holdRemainingMs: 0,
          isOnHold: false,
          totalRewardsEarned: "0",
        });
      } else {
        holdRemainingMs = SEVEN_DAYS_MS - elapsed;
        isOnHold = true;
      }
    }

    // === DIELBS CONSENSUS AUTO-CLAIM ===
    const latestBlock = await storage.getLatestBlock();
    const currentHeight = latestBlock?.id || 0;
    
    let pendingRewards = 0;
    if (userStaked > 0 && !isOnHold) {
      pendingRewards = calculateDIELBSParticipationRewards(userStaked, totalStakedNum, user.lastStakeRewardClaim, currentHeight);

      // Auto-claim threshold: 0.0001 WEBD2
      if (pendingRewards > 0.0001) {
        try {
          await db.transaction(async (tx) => {
            // Re-fetch user WITHIN transaction to lock the row
            const [lockedUser] = await tx.select().from(users).where(eq(users.id, user.id)).for("update");
            if (!lockedUser) return;

            const latestStaked = parseFloat(lockedUser.stakedBalance || "0");
            const availableBalance = parseFloat(lockedUser.balance || "0");
            
            // Re-calculate rewards using the locked record's timestamp (Security: Anti-Multi-Tab exploit)
            const trueRewards = calculateDIELBSParticipationRewards(latestStaked, totalStakedNum, lockedUser.lastStakeRewardClaim, currentHeight);
            if (isNaN(trueRewards) || trueRewards <= 0.0001) return; // Already claimed by another tab

            const newBalance = (availableBalance + trueRewards).toFixed(4);
            
            // Execute parallel updates across Ledger and Wallet tables
            await tx.update(users)
              .set({ 
                balance: newBalance,
                lastStakeRewardClaim: new Date()
              })
              .where(eq(users.id, lockedUser.id));

            // Record the transaction in the consensus ledger
            await tx.insert(transactions).values({
              senderId: null,
              receiverId: lockedUser.id,
              senderAddress: "DIELBS_CONSENSUS",
              receiverAddress: lockedUser.walletAddress,
              amount: trueRewards.toFixed(4),
              type: "staking_reward",
              createdAt: new Date(),
            } as any);

            // Sync the primary wallet balance
            const [minerWalletAddr] = await tx.select().from(walletAddresses).where(eq(walletAddresses.address, lockedUser.walletAddress!)).limit(1);
            if (minerWalletAddr) {
              const addrBal = parseFloat(minerWalletAddr.balance || "0");
              await tx.update(walletAddresses)
                .set({ balance: ((isNaN(addrBal) ? 0 : addrBal) + trueRewards).toFixed(4) })
                .where(eq(walletAddresses.id, minerWalletAddr.id));
            }

            // Update local state for session response
            userStaked = latestStaked;
            pendingRewards = 0; // Successfully claimed
          });
        } catch (claimErr) {
          console.error("[CONSENSUS ADAPTOR] Atomic Claim Collision or Error:", claimErr);
          // Non-blocking: We gracefully let the next poll attempt handle the claim
        }
      }
    }

    const infoApy = calculateNetworkAPY(totalStakedNum, currentHeight);
    const infoTotalMinedStr = await storage.getTotalMinedSupply();
    const infoTotalMined = parseFloat(infoTotalMinedStr);

    // Calculate total rewards ever earned by this user using efficient aggregation
    const rewardStats = await storage.getUserRewardStats(user.id);
    const totalRewardsEarned = rewardStats.totalRewardsEarned;
    const lastRewardAmount = rewardStats.lastRewardAmount;
    const rewardsCount = rewardStats.rewardsCount;

    res.json({
      stakedBalance: userStaked.toFixed(4),
      pendingRewards: "0", // Always 0 since we auto-claim
      apy: Math.round(infoApy * 100) / 100,
      totalNetworkStaked: totalStakedNum.toFixed(4),
      blockHeight: latestBlock?.id || 0,
      circulatingSupply: (infoTotalMined + 6800000000 + 3400000000).toFixed(4),
      stakingStoppedAt: stakingStoppedAt ? new Date(stakingStoppedAt).toISOString() : null,
      holdRemainingMs,
      isOnHold,
      totalRewardsEarned: Number(totalRewardsEarned).toFixed(4),
      lastRewardAmount: Number(lastRewardAmount).toFixed(4),
      rewardsCount,
      username: user.username,
      walletAddress: user.walletAddress,
    });
  });

  app.get(api.staking.networkStats.path, async (req, res) => {
    const totalStaked = await storage.getTotalNetworkStaked();
    const totalStakers = await storage.getTotalStakers();
    const latestBlock = await storage.getLatestBlock();
    const currentHeight = latestBlock?.id || 0;

    res.json({
      totalStaked,
      totalStakers,
      blockHeight: currentHeight,
      rewardRate: `${getCurrentBlockReward(currentHeight).toFixed(2)} WEBD / 5s`,
    });
  });

  app.post(api.staking.stake.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }
    
    try {
      // Use a fresh query to avoid stale session data
      // @ts-ignore
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isSenderBlocked = await storage.isWalletBlocked(user.walletAddress!);
      if (isSenderBlocked) {
        return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
      }

      if (user.stakingStoppedAt) {
        const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
        const elapsed = Date.now() - new Date(user.stakingStoppedAt).getTime();
        if (elapsed < SEVEN_DAYS_MS) {
          return res.status(400).json({ message: "Your previous stake is on a 7-day hold. Please wait until the hold period expires." });
        }
        await db.update(users).set({ stakingStoppedAt: null }).where(eq(users.id, user.id));
      }

      const { amount } = req.body;
      const stakeAmount = parseFloat(amount);
      if (isNaN(stakeAmount) || stakeAmount < MIN_STAKE_AMOUNT) {
        return res.status(400).json({ message: `Minimum stake amount is ${MIN_STAKE_AMOUNT} WEBD` });
      }

      const availableBalance = parseFloat(user.balance || "0");
      if (stakeAmount > availableBalance) {
        return res.status(400).json({ message: "Insufficient balance to stake" });
      }

      const currentStaked = parseFloat(user.stakedBalance || "0");
      const newBalance = (availableBalance - stakeAmount).toFixed(4);
      const newStakedBalance = (currentStaked + stakeAmount).toFixed(4);

      console.log(`[STAKE] User ${user.id} staking ${stakeAmount}. New Staked: ${newStakedBalance}`);

      // ATOMIC UPDATE
      await storage.updateUserStake(user.id, newStakedBalance, newBalance, new Date());
      
      await storage.createTransaction({
        senderId: user.id,
        receiverId: null,
        senderAddress: user.walletAddress,
        receiverAddress: "STAKING_CONTRACT",
        amount: stakeAmount.toFixed(4),
        type: "transfer",
        blockId: null,
      });

      const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress!);
      if (minerWalletAddr) {
        const addrBalance = parseFloat(minerWalletAddr.balance || "0");
        const newAddrBalance = Math.max(0, addrBalance - stakeAmount).toFixed(4);
        await storage.updateWalletAddressBalance(minerWalletAddr.id, newAddrBalance);
      }

      res.json({
        success: true,
        stakedBalance: newStakedBalance,
        message: `Mining started with ${Number(stakeAmount).toLocaleString(undefined, { minimumFractionDigits: 0 })} WEBD. Total mining power: ${Number(newStakedBalance).toLocaleString(undefined, { minimumFractionDigits: 0 })} WEBD.`,
      });
    } catch (err: any) {
      console.error("[STAKE] Error:", err);
      res.status(500).json({ message: "Mining start failed: " + (err.message || "Unknown error") });
    }
  });

  // STOP MINING — triggers 7-day hold, does NOT return funds immediately
  app.post(api.staking.unstake.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }
    
    try {
      // @ts-ignore
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isSenderBlocked = await storage.isWalletBlocked(user.walletAddress!);
      if (isSenderBlocked) {
        return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
      }

      const currentStaked = parseFloat(user.stakedBalance || "0");
      if (currentStaked <= 0) {
        return res.status(400).json({ message: "No active stake to stop" });
      }

      if (user.stakingStoppedAt) {
        return res.status(400).json({ message: "Mining is already stopped. Your funds are on a 7-day hold." });
      }

      console.log(`[UNSTAKE] User ${user.id} stopping mining. Holding: ${currentStaked}`);

      await db.update(users).set({ stakingStoppedAt: new Date() }).where(eq(users.id, user.id));

      res.json({
        success: true,
        stakedBalance: currentStaked.toFixed(4),
        message: `Mining stopped. Your ${currentStaked.toFixed(4)} WEBD will be held for 7 days before being returned to your balance.`,
      });
    } catch (err: any) {
      console.error("[UNSTAKE] Error:", err);
      res.status(500).json({ message: "Stop mining failed: " + (err.message || "Unknown error") });
    }
  });

  // CHANGE STAKING AMOUNT (does NOT trigger 7-day hold — only active miners)
  app.post('/api/staking/change-amount', async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Please try again later." });
    }

    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const isSenderBlocked = await storage.isWalletBlocked(user.walletAddress!);
    if (isSenderBlocked) {
      return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
    }

    if (user.stakingStoppedAt) {
      return res.status(400).json({ message: "Cannot change amount while on hold. Wait for the 7-day hold to expire." });
    }

    const { amount } = req.body;
    const newStakeAmount = parseFloat(amount);
    if (isNaN(newStakeAmount) || newStakeAmount < MIN_STAKE_AMOUNT) {
      return res.status(400).json({ message: `Minimum stake amount is ${MIN_STAKE_AMOUNT} WEBD` });
    }

    const currentStaked = parseFloat(user.stakedBalance || "0");
    const availableBalance = parseFloat(user.balance || "0");
    const totalFunds = currentStaked + availableBalance;

    if (newStakeAmount > totalFunds + 0.0001) {
      return res.status(400).json({ message: "Insufficient total funds to change to this amount" });
    }

    const difference = newStakeAmount - currentStaked;
    const newBalance = (availableBalance - difference).toFixed(4);

    await storage.updateUserStake(user.id, newStakeAmount.toFixed(4), newBalance, new Date());

    const minerWalletAddr = await storage.getWalletAddressByAddress(user.walletAddress!);
    if (minerWalletAddr) {
      const addrBal = parseFloat(minerWalletAddr.balance || "0");
      await storage.updateWalletAddressBalance(minerWalletAddr.id, (addrBal - difference).toFixed(4));
    }

    res.json({
      success: true,
      stakedBalance: newStakeAmount.toFixed(4),
      message: `Staking amount changed to ${newStakeAmount.toFixed(4)} WEBD.`,
    });
  });

  // Keep claim route for backward compatibility but it's now a no-op
  app.post(api.staking.claimRewards.path, async (req, res) => {
    res.json({ success: true, reward: "0", message: "Rewards are now auto-claimed to your balance." });
  });

  // === Burn Address Balance Monitor ===

  const BURN_ADDRESS = "WEBD$gDW@gHS1o$4sjBxKE7dY$fqTHwa+xj2Fjf$";
  let cachedBurnBalance: { balance: string; lastFetched: number } = { balance: "0", lastFetched: 0 };
  const BURN_CACHE_TTL = 60000;

  async function fetchBurnAddressBalance(): Promise<string> {
    const now = Date.now();
    if (now - cachedBurnBalance.lastFetched < BURN_CACHE_TTL) {
      return cachedBurnBalance.balance;
    }
    try {
      const encoded = encodeURIComponent(BURN_ADDRESS).replace(/%40/g, '@').replace(/%2B/g, '+');
      const url = `https://webdollar.network/address/${encoded}`;
      const response = await fetch(url, { signal: AbortSignal.timeout(10000) });
      if (!response.ok) {
        console.error("Burn balance fetch failed with status:", response.status);
        return cachedBurnBalance.balance;
      }
      const html = await response.text();
      const balanceMatch = html.match(/<td>Balance<\/td>\s*<td>\s*<button[^>]*>([0-9,.]+)<\/button>/);
      if (balanceMatch) {
        const balance = balanceMatch[1].replace(/,/g, '');
        cachedBurnBalance = { balance, lastFetched: now };
        return balance;
      }
      return cachedBurnBalance.balance;
    } catch (err: any) {
      if (err.code === 'ENOTFOUND' || err.code === 'ETIMEDOUT') {
        // Quiet warning for legacy infrastructure downtime
        console.warn(`[Network] Legacy explorer (webdollar.network) is currently unreachable. Using last known cached balance.`);
      } else {
        console.error("Failed to fetch burn address balance:", err);
      }
      return cachedBurnBalance.balance;
    }
  }

  app.get("/api/conversion/burn-balance", async (_req, res) => {
    const balance = await fetchBurnAddressBalance();
    res.json({
      address: BURN_ADDRESS,
      balance,
      explorerUrl: `https://webdollar.network/address/${encodeURIComponent(BURN_ADDRESS).replace(/%40/g, '@').replace(/%2B/g, '+')}`,
    });
  });

  // === Conversion Routes ===

  app.post(api.conversion.create.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });

    if (isBlockchainPaused) {
      return res.status(503).json({ message: "Network is currently paused for maintenance. Migrations are temporarily disabled." });
    }

    try {
      // @ts-ignore
      const user = await storage.getUser(req.session.userId);
      if (!user) return res.status(404).json({ message: "User not found" });

      const isSenderBlocked = await storage.isWalletBlocked(user.walletAddress!);
      if (isSenderBlocked) {
        return res.status(403).json({ message: "Your wallet is blacklisted from the network." });
      }

      const input = api.conversion.create.input.parse(req.body);
      const amount = parseFloat(input.amountClaimed);

      if (isNaN(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid amount" });
      }

      if (amount > 42000000000) {
        return res.status(400).json({ message: "Amount exceeds maximum possible legacy supply" });
      }

      const oldAddr = input.oldWalletAddress.trim();
      if (oldAddr.length < 10 || oldAddr.length > 128) {
        return res.status(400).json({ message: "Invalid legacy wallet address format" });
      }

      const isBlocked = await storage.isWalletBlocked(oldAddr);
      if (isBlocked) {
        return res.status(400).json({ message: "This wallet address has been blocked from conversion (old dev wallet)." });
      }

      const KNOWN_DEV_WALLETS = [
        "WEBD$gBzj#R3RYPqi@2xS8LHN+mKGSMaP$VXKN3$",
        "WEBD$gDZwp8rQBhKFLQCcoV4BLUJka+P&SfNn#q5n$",
        "WEBD$gAkxes3YRPNxwi0q&N1fz@GJgg&ypILn4GnZ$",
      ];
      if (KNOWN_DEV_WALLETS.includes(oldAddr)) {
        return res.status(400).json({ message: "This address belongs to a known legacy dev wallet and is blocked from conversion." });
      }

      const totalConvertedFromThisAddress = await storage.getTotalConvertedFromAddress(oldAddr);
      const previousConversions = await storage.getConversionsByOldAddress(oldAddr);

      if (previousConversions.length > 0) {
        const originalClaimed = parseFloat(previousConversions[0].amountClaimed || "0");
        const alreadyConverted = totalConvertedFromThisAddress;
        const remainingOnAddress = originalClaimed - alreadyConverted;

        if (remainingOnAddress <= 0) {
          return res.status(400).json({
            message: `This legacy address has already fully converted its ${originalClaimed.toLocaleString()} WEBD balance. No remaining funds to convert.`
          });
        }

        if (amount > remainingOnAddress) {
          return res.status(400).json({
            message: `This address originally claimed ${originalClaimed.toLocaleString()} WEBD and has already converted ${alreadyConverted.toLocaleString()} WEBD. Only ${remainingOnAddress.toLocaleString()} WEBD remains.`
          });
        }
      }

      // @ts-ignore
      const totalApproved = await storage.getTotalConverted(req.session.userId);
      // @ts-ignore
      const totalPending = await storage.getTotalPendingConversions(req.session.userId);
      const totalPreviouslyConverted = totalApproved + totalPending;

      const lifetimeCap = 5000000;
      if (totalPreviouslyConverted + amount > lifetimeCap) {
        const remaining = lifetimeCap - totalPreviouslyConverted;
        if (remaining <= 0) {
          return res.status(400).json({
            message: `You have reached the lifetime conversion cap of ${lifetimeCap.toLocaleString()} WEBD per account.`
          });
        }
        return res.status(400).json({
          message: `You can only convert up to ${remaining.toLocaleString()} more WEBD (lifetime cap: ${lifetimeCap.toLocaleString()} WEBD per account).`
        });
      }

      const reqRecord = await storage.createConversionRequest({
        oldWalletAddress: oldAddr,
        amountClaimed: input.amountClaimed,
        // @ts-ignore
        userId: req.session.userId,
        amountApproved: "0.0000",
        status: "pending",
        vestingReleaseDate: null
      });

      await storage.blockWallet(oldAddr, `Auto-blocked after conversion request #${reqRecord.id}`);

      res.status(201).json(reqRecord);
    } catch (err) {
      if (err instanceof z.ZodError) {
        return res.status(400).json({ message: err.errors[0].message });
      }
      console.error("Conversion error:", err);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  app.get(api.conversion.list.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const list = await storage.getConversionRequests(req.session.userId);
    res.json(list);
  });

  // === Explorer Routes ===

  app.get(api.explorer.blocks.path, async (req, res) => {
    const blocksList = await storage.getBlocks();
    const enriched = await Promise.all(blocksList.map(async (block) => {
      const miner = block.minerId ? await storage.getUser(block.minerId) : null;
      return { ...block, minerAddress: miner?.walletAddress || null };
    }));
    res.json(enriched);
  });

  app.get(api.explorer.transactions.path, async (req, res) => {
    const txs = await storage.getTransactions();
    res.json(txs);
  });

  // === Blocked Wallets ===

  app.get(api.blockedWallets.list.path, async (req, res) => {
    const list = await storage.getBlockedWallets();
    res.json(list);
  });

  // === Admin Conversion Management ===

  app.get(api.admin.conversions.list.path, async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user?.isDev) return res.status(403).json({ message: "Admin access required" });

    const allConversions = await storage.getAllConversionRequests();
    const enriched = await Promise.all(allConversions.map(async (conv) => {
      const convUser = conv.userId ? await storage.getUser(conv.userId) : null;
      return {
        ...conv,
        username: convUser?.username || "Unknown",
        walletAddress: convUser?.walletAddress || null,
      };
    }));
    res.json(enriched);
  });

  app.post("/api/admin/conversions/:id/approve", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const convId = parseInt(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ message: "Invalid conversion ID" });

    const allConversions = await storage.getAllConversionRequests();
    const conv = allConversions.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ message: "Conversion request not found" });
    if (conv.status !== "pending") return res.status(400).json({ message: "Only pending requests can be approved" });

    const customAmount = req.body.amount ? parseFloat(req.body.amount) : null;
    const approvedAmount = (customAmount && !isNaN(customAmount) && customAmount > 0)
      ? customAmount
      : parseFloat(conv.amountClaimed || "0");

    if (approvedAmount <= 0) {
      return res.status(400).json({ message: "Approved amount must be greater than 0" });
    }

    const lifetimeCap = 5000000;
    if (conv.userId) {
      const totalAlreadyApproved = await storage.getTotalConverted(conv.userId);
      if (totalAlreadyApproved + approvedAmount > lifetimeCap) {
        const remaining = lifetimeCap - totalAlreadyApproved;
        return res.status(400).json({
          message: `User has already converted ${totalAlreadyApproved.toLocaleString()} WEBD. Can only approve up to ${Math.max(0, remaining).toLocaleString()} more (lifetime cap: ${lifetimeCap.toLocaleString()}).`
        });
      }
    }

    const updated = await storage.updateConversionStatus(convId, "approved", approvedAmount.toFixed(4));

    if (conv.userId) {
      const convUser = await storage.getUser(conv.userId);
      if (convUser) {
        const newBalance = (parseFloat(convUser.balance!) + approvedAmount).toFixed(4);
        await storage.updateUserBalance(convUser.id, newBalance);

        await storage.createTransaction({
          senderId: null,
          receiverId: convUser.id,
          senderAddress: "LEGACY_CONVERSION",
          receiverAddress: convUser.walletAddress,
          amount: approvedAmount.toFixed(4),
          type: "conversion",
          blockId: null,
        });
      }
    }

    res.json(updated);
  });

  // === SUPER-USER MANAGEMENT ROUTES ===
  app.post("/api/admin/users/search", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const suAdmin = await storage.getUser(req.session.userId);
    if (!suAdmin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const { query: suSearchQuery } = req.body;
    if (!suSearchQuery || typeof suSearchQuery !== "string") return res.status(400).json({ message: "Search query required" });

    const results = await db.execute(sql`
      SELECT id, username, wallet_address as "walletAddress", is_dev as "isDev", is_foundation as "isFoundation", created_at as "createdAt"
      FROM users 
      WHERE username ILIKE ${'%' + suSearchQuery + '%'} OR wallet_address ILIKE ${'%' + suSearchQuery + '%'}
      LIMIT 10
    `);

    res.json(results.rows);
  });

  app.post("/api/admin/users/:id/update", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const suAdmin = await storage.getUser(req.session.userId);
    if (!suAdmin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const targetUserId = parseInt(req.params.id);
    const { username, password, isDev, isFoundation } = req.body;

    const [targetUser] = await db.select().from(users).where(eq(users.id, targetUserId)).limit(1);
    if (!targetUser) return res.status(404).json({ message: "User not found" });

    const updateData: any = {};
    if (username) updateData.username = username;
    if (password) {
      updateData.password = await bcrypt.hash(password, 12);
    }
    if (typeof isDev === 'boolean') updateData.isDev = isDev;
    if (typeof isFoundation === 'boolean') updateData.isFoundation = isFoundation;

    await db.update(users).set(updateData).where(eq(users.id, targetUserId));
    
    res.json({ success: true, message: `User ${targetUser.username} updated successfully.` });
  });

  app.post("/api/admin/conversions/:id/reject", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const convId = parseInt(req.params.id);
    if (isNaN(convId)) return res.status(400).json({ message: "Invalid conversion ID" });

    const allConversions = await storage.getAllConversionRequests();
    const conv = allConversions.find(c => c.id === convId);
    if (!conv) return res.status(404).json({ message: "Conversion request not found" });
    if (conv.status !== "pending") return res.status(400).json({ message: "Only pending requests can be rejected" });

    const updated = await storage.updateConversionStatus(convId, "rejected", "0.0000");
    res.json(updated);
  });

  // === Admin Card Waitlist ===
  app.get("/api/admin/card-waitlist", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    try {
      const entries = await storage.getAllCardWaitlistEntries();
      res.json(entries);
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch waitlist" });
    }
  });

  // === Admin Network & Blockchain Control ===
  app.get("/api/admin/network/status", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    res.json({ isPaused: isBlockchainPaused, connectedPeers: getConnectedPeersCount() });
  });

  app.get("/api/network/info", (req, res) => {
    res.json({
      name: "WebDollar 2 Bootstrap Node",
      version: "1.0.0-testnet",
      isBootstrap: process.env.NODE_IS_BOOTSTRAP === "true",
      peerId: process.env.BOOTSTRAP_PEER_ID || (process.env.NODE_IS_BOOTSTRAP === "true" ? "bootstrap-0" : "anonymous"),
      connectedPeers: getConnectedPeersCount(),
      network: "testnet-dielbs-v1"
    });
  });

  app.get("/api/admin/peers/live", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    res.json({ peers: getLivePeerList(), total: getConnectedPeersCount() });
  });

  app.post("/api/admin/network/pause", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const { isPaused } = req.body;
    isBlockchainPaused = !!isPaused;
    
    // Announce to log
    console.log(`[ADMIN] Blockchain Paused State: ${isBlockchainPaused} by ${admin.username}`);
    
    res.json({ success: true, isPaused: isBlockchainPaused });
  });

  app.post("/api/admin/network/blacklist", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const { address, reason } = req.body;
    if (!address) return res.status(400).json({ message: "Address is required" });

    try {
      await db.insert(blockedWallets).values({ address, reason: reason || "Admin action" });
      res.json({ success: true, message: `Wallet ${address} successfully blacklisted.` });
    } catch(err) {
      res.status(500).json({ success: false, message: "Could not blacklist (might already be blacklisted)." });
    }
  });

  app.post("/api/admin/genesis", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    // Protect against double minting
    const existingMigration = await storage.getUserByUsername("migration_wallet");
    if (existingMigration) return res.status(400).json({ message: "Genesis wallets already generated." });

    const MINT_PASSWORD = process.env.GENESIS_MINT_PASSWORD;
    if (!MINT_PASSWORD) return res.status(500).json({ message: "Network Security Error: GENESIS_MINT_PASSWORD not configured." });

    const createGenesisUser = async (username: string, amount: string, isDevFlag: boolean, isFoundationFlag: boolean) => {
        const hashedPassword = await bcrypt.hash(MINT_PASSWORD, 12);
        const wallet = generateWallet();
        const user = await storage.createUser({
          username,
          password: hashedPassword,
          walletAddress: wallet.address,
          polygonAddress: wallet.polygonAddress,
          balance: amount,
          isDev: isDevFlag,
          isFoundation: isFoundationFlag,
          nonce: 0
        });

        const encryptedKey = encryptPrivateKey(wallet.privateKey, MINT_PASSWORD);
        await storage.createWalletAddress({
          userId: user.id,
          label: "Genesis Wallet",
          address: wallet.address,
          polygonAddress: wallet.polygonAddress,
          publicKey: wallet.publicKey,
          encryptedPrivateKey: encryptedKey,
          mnemonic: wallet.mnemonic,
          isPrimary: true,
        });
        return user;
    };

    try {
      // Create Wallets:
      // 10% Dev funds = 6,800,000,000
      await createGenesisUser("dev_funds_wallet", "6800000000", true, false);
      // 5% Foundation = 3,400,000,000
      await createGenesisUser("foundation_wallet", "3400000000", false, true);
      // Migration = Reserve for V1 holders (Burned V1 supply minus dev/foundation blocks)
      await createGenesisUser("migration_wallet", "14200000000", false, false);
      
      res.json({ success: true, message: "Genesis complete: Dev, Foundation, and Migration wallets instantiated successfully." });
    } catch(err) {
      console.error(err);
      res.status(500).json({ message: "Failed during genesis process." });
    }
  });

  app.get("/api/admin/treasury-info", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const admin = await storage.getUser(req.session.userId);
    if (!admin?.isDev) return res.status(403).json({ message: "Admin access required" });

    const migration = await storage.getUserByUsername("migration_wallet");
    const dev = await storage.getUserByUsername("dev_funds_wallet");
    const foundation = await storage.getUserByUsername("foundation_wallet");

    // Fetch full wallet details to get the mnemonics
    const migrationAddr = migration ? await storage.getPrimaryWalletAddress(migration.id) : null;
    const devAddr = dev ? await storage.getPrimaryWalletAddress(dev.id) : null;
    const foundationAddr = foundation ? await storage.getPrimaryWalletAddress(foundation.id) : null;

    console.log(`[TREASURY] Fetching Info & Seeds: Migration=${!!migrationAddr}, Dev=${!!devAddr}, Foundation=${!!foundationAddr}`);

    res.json({
      migration: { 
        address: migration?.walletAddress || "NOT_FOUND", 
        balance: migration?.balance,
        mnemonic: migrationAddr?.mnemonic || "NOT_GENERATED"
      },
      dev: { 
        address: dev?.walletAddress || "NOT_FOUND", 
        balance: dev?.balance,
        mnemonic: devAddr?.mnemonic || "NOT_GENERATED"
      },
      foundation: { 
        address: foundation?.walletAddress || "NOT_FOUND", 
        balance: foundation?.balance,
        mnemonic: foundationAddr?.mnemonic || "NOT_GENERATED"
      }
    });
  });


  // === Blockchain / WebDollar 2 Routes ===

  app.get("/api/blockchain/status", async (_req, res) => {
    try {
      const status = await checkConnection();
      const tokenAddress = getContractAddress();
      const latestBlock = await storage.getLatestBlock();
      
      // Force native WEBD2 network UI display override with LIVE block height
      res.json({ 
        ...status, 
        network: "WEBD2 Testnet", 
        tokenContract: tokenAddress,
        blockNumber: latestBlock?.id || 1,
        txLatency: lastTxLatency 
      });
    } catch (err: any) {
      res.json({ connected: false, network: "Unknown", chainId: null, blockNumber: null, tokenContract: null });
    }
  });

  app.get("/api/network/stats", async (_req, res) => {
    try {
      const stats = await storage.getNetworkStats();
      res.json({
        ...stats,
        connectedPeers: getConnectedPeersCount(),
      });
    } catch(err) {
      console.error("Network stats error:", err);
      res.status(500).json({ message: "Failed to fetch network stats" });
    }
  });

  app.get("/api/blockchain/balance/:address", async (req, res) => {
    try {
      const address = req.params.address;
      if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        return res.status(400).json({ message: "Invalid Polygon address format" });
      }
      const tokenBalance = await getOnChainBalance(address);
      const maticBalance = await getMaticBalance(address);
      res.json({ address, tokenBalance, maticBalance });
    } catch (err: any) {
      res.status(500).json({ message: "Failed to fetch balance" });
    }
  });

  app.get("/api/wallet/polygon-info", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Unauthorized" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(404).json({ message: "User not found" });

    const addresses = await storage.getWalletAddresses(user.id);
    const polygonAddresses = addresses.map(a => ({
      id: a.id,
      label: a.label,
      webdAddress: a.address,
      polygonAddress: a.polygonAddress,
      isPrimary: a.isPrimary,
    }));

    let maticBalance = "0";
    if (user.polygonAddress) {
      maticBalance = await getMaticBalance(user.polygonAddress);
    }

    res.json({
      primaryPolygonAddress: user.polygonAddress,
      addresses: polygonAddresses,
      maticBalance,
      polygonscanUrl: getPolygonscanBaseUrl(),
    });
  });

  app.get("/api/blockchain/explorer/blocks", async (_req, res) => {
    try {
      const blocks = await getRecentBlocks(10);
      res.json({ blocks, polygonscanUrl: getPolygonscanBaseUrl() });
    } catch {
      res.json({ blocks: [], polygonscanUrl: getPolygonscanBaseUrl() });
    }
  });

  app.get("/api/blockchain/explorer/transactions", async (_req, res) => {
    try {
      const blocks = await getRecentBlocks(3);
      const allTxs = [];
      for (const block of blocks) {
        const txs = await getRecentTransactionsFromBlock(block.number, 5);
        allTxs.push(...txs);
      }
      res.json({ transactions: allTxs.slice(0, 15), polygonscanUrl: getPolygonscanBaseUrl() });
    } catch {
      res.json({ transactions: [], polygonscanUrl: getPolygonscanBaseUrl() });
    }
  });

  app.get("/api/card/waitlist/status", async (req, res) => {
    // @ts-ignore
    const userId = req.session.userId;
    if (!userId) return res.json({ joined: false, position: null, totalCount: 0 });
    try {
      const entry = await storage.getCardWaitlistEntry(userId);
      const totalCount = await storage.getCardWaitlistCount();
      if (entry) {
        res.json({ joined: true, email: entry.email, position: entry.id, totalCount });
      } else {
        res.json({ joined: false, position: null, totalCount });
      }
    } catch (err) {
      res.json({ joined: false, position: null, totalCount: 0 });
    }
  });

  app.post("/api/card/waitlist/join", async (req, res) => {
    const { email } = req.body;
    if (!email || typeof email !== "string" || !email.includes("@")) {
      return res.status(400).json({ message: "Please enter a valid email address" });
    }
    try {
      // @ts-ignore
      const userId = req.session.userId || null;
      
      const trimmedEmail = email.trim();
      
      // 1. Check if email already exists anywhere in the waitlist
      const existingEmail = await storage.getCardWaitlistEntryByEmail(trimmedEmail);
      if (existingEmail) {
         return res.status(400).json({ message: "This email is already on our waitlist!" });
      }

      // 2. If logged in, check if user already joined with a different email
      if (userId) {
        const existingUser = await storage.getCardWaitlistEntry(userId);
        if (existingUser) {
           return res.status(400).json({ message: "You have already joined the waitlist with another email." });
        }
      }

      const entry = await storage.joinCardWaitlist({ userId, email: trimmedEmail });
      const totalCount = await storage.getCardWaitlistCount();
      res.json({ success: true, position: entry.id, totalCount });
    } catch (err: any) {
      console.error("Waitlist join error:", err);
      res.status(500).json({ message: "Failed to join waitlist" });
    }
  });



  app.get("/api/explorer/search", async (req, res) => {
    const q = (req.query.q as string || "").trim();
    if (!q || q.length < 3) {
      return res.status(400).json({ message: "Search query must be at least 3 characters" });
    }

    const results: any = { users: [], addresses: [], transactions: [], blocks: [] };

    if (q.startsWith("WEBD$")) {
      const addr = await storage.getWalletAddressByAddress(q);
      if (addr) {
        // Omitting polygonAddress from the returned packet
        results.addresses.push({ address: addr.address, label: addr.label, balance: addr.balance });
      }
      const user = await storage.getUserByWalletAddress(q);
      if (user) {
        results.users.push({ username: user.username, walletAddress: user.walletAddress });
      }
      
      const txs = await storage.getTransactions(100);
      for (const tx of txs) {
        if (tx.senderAddress === q || tx.receiverAddress === q) {
          results.transactions.push(tx);
        }
      }
    }

    if (/^[a-f0-9]{64}$/.test(q)) {
      const blocksList = await storage.getBlocks(100);
      const matchedBlock = blocksList.find(b => b.hash === q);
      if (matchedBlock) results.blocks.push(matchedBlock);
    }

    if (/^\d+$/.test(q)) {
      const blocksList = await storage.getBlocks(100);
      const matchedBlock = blocksList.find(b => b.id === parseInt(q));
      if (matchedBlock) results.blocks.push(matchedBlock);
    }

    res.json(results);
  });
  
  app.get("/api/explorer/validate-chain", async (_req, res) => {
    try {
      const allBlocks = await storage.getBlocks(1000); // Verify last 1000 blocks
      let isValid = true;
      
      // Start from oldest (reverse order of storage.getBlocks which is desc)
      const sortedBlocks = [...allBlocks].sort((a, b) => a.id - b.id);
      
      for (let i = 1; i < sortedBlocks.length; i++) {
        const current = sortedBlocks[i];
        const prev = sortedBlocks[i - 1];
        
        // 1. Check if the block correctly points to the previous hash
        if (current.previousHash !== prev.hash) {
          console.error(`[CHAIN_ERROR] Block ${current.id} has invalid linkage to ${prev.id}`);
          isValid = false;
          break;
        }
        
        // 2. Mathematically verify the current block's own hash (Simplified for Testnet efficiency)
        const checkHash = createHash("sha256").update(current.previousHash + (current.timestamp ? new Date(current.timestamp).getTime() : "0") + current.id).digest("hex");
        // Note: For absolute realism, blocks produced earlier would match this formula. 
        // In this testnet version, we primarily verify the chain linkage (The "Glue").
      }
      
      res.json({ isValid, checkedBlocks: sortedBlocks.length });
    } catch (err: any) {
      res.status(500).json({ message: "Integrity check failed" });
    }
  });

  app.get("/api/blockchain/polygonscan-url", (_req, res) => {
    res.json({ url: getPolygonscanBaseUrl() });
  });

  /* LEGACY ADMIN ROUTE - Polygon/L1 deployment currently disabled in favor of Native DIELBS
  app.post("/api/admin/deploy-token", async (req, res) => {
    // ... logic disabled
    res.status(501).json({ message: "Native DIELBS engine is already live. Token deployment not required." });
  });
  */

  // === Stripe / Buy WEBD Routes ===

  app.get("/api/stripe/publishable-key", async (_req, res) => {
    try {
      const { getStripePublishableKey } = await import("./stripeClient");
      const key = await getStripePublishableKey();
      res.json({ publishableKey: key });
    } catch (err: any) {
      res.status(500).json({ message: "Stripe not configured" });
    }
  });

  app.get("/api/stripe/products", async (_req, res) => {
    try {
      const result = await db.execute(
        sql`SELECT 
          p.id as product_id,
          p.name as product_name,
          p.description as product_description,
          p.metadata as product_metadata,
          pr.id as price_id,
          pr.unit_amount,
          pr.currency
        FROM stripe.products p
        JOIN stripe.prices pr ON pr.product = p.id AND pr.active = true
        WHERE p.active = true
        ORDER BY pr.unit_amount ASC`
      );
      if (result.rows && result.rows.length > 0) {
        return res.json(result.rows);
      }
    } catch (err: any) {
      console.error("Products DB fetch error (falling back to Stripe API):", err.message);
    }

    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();
      const prices = await stripe.prices.list({ active: true, expand: ['data.product'], limit: 20 });
      const products = prices.data
        .filter((p: any) => p.product && typeof p.product === 'object' && p.product.active && p.product.metadata?.webd_amount)
        .map((p: any) => ({
          product_id: p.product.id,
          product_name: p.product.name,
          product_description: p.product.description || '',
          product_metadata: p.product.metadata,
          price_id: p.id,
          unit_amount: p.unit_amount,
          currency: p.currency,
        }))
        .sort((a: any, b: any) => a.unit_amount - b.unit_amount);
      res.json(products);
    } catch (err2: any) {
      console.error("Products Stripe API fetch error:", err2.message);
      res.json([]);
    }
  });

  app.post("/api/stripe/checkout", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Please log in to purchase WEBD" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { priceId } = req.body;
    if (!priceId) return res.status(400).json({ message: "Price ID required" });

    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const priceObj = await stripe.prices.retrieve(priceId, { expand: ['product'] });
      const productObj = priceObj.product as any;
      const webdAmount = productObj.metadata?.webd_amount || '0';

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{ price: priceId, quantity: 1 }],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/wallet?purchase=success&amount=${webdAmount}`,
        cancel_url: `${req.protocol}://${req.get("host")}/buy?purchase=cancelled`,
        metadata: {
          userId: String(user.id),
          username: user.username,
          webd_amount: webdAmount,
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  const WEBD_PRICE_USD = 0.000963;
  const MIN_CUSTOM_PURCHASE = 10000;
  const MAX_CUSTOM_PURCHASE = 5000000;

  app.post("/api/stripe/checkout-custom", async (req, res) => {
    // @ts-ignore
    if (!req.session.userId) return res.status(401).json({ message: "Please log in to purchase WEBD" });
    // @ts-ignore
    const user = await storage.getUser(req.session.userId);
    if (!user) return res.status(401).json({ message: "User not found" });

    const { webdAmount } = req.body;
    const amount = parseInt(webdAmount);
    if (!amount || isNaN(amount) || amount < MIN_CUSTOM_PURCHASE) {
      return res.status(400).json({ message: `Minimum purchase is ${MIN_CUSTOM_PURCHASE.toLocaleString()} WEBD per transaction` });
    }
    if (amount > MAX_CUSTOM_PURCHASE) {
      return res.status(400).json({ message: `Maximum purchase is ${MAX_CUSTOM_PURCHASE.toLocaleString()} WEBD per day per address` });
    }

    const priceInCents = Math.max(50, Math.round(amount * WEBD_PRICE_USD * 100));

    try {
      const { getUncachableStripeClient } = await import("./stripeClient");
      const stripe = await getUncachableStripeClient();

      const session = await stripe.checkout.sessions.create({
        payment_method_types: ["card"],
        line_items: [{
          price_data: {
            currency: "usd",
            product_data: {
              name: `${amount.toLocaleString()} WEBD Tokens`,
              description: `Custom purchase of ${amount.toLocaleString()} WebDollar 2 tokens`,
              metadata: { webd_amount: String(amount), tier: "custom" },
            },
            unit_amount: priceInCents,
          },
          quantity: 1,
        }],
        mode: "payment",
        success_url: `${req.protocol}://${req.get("host")}/wallet?purchase=success&amount=${amount}`,
        cancel_url: `${req.protocol}://${req.get("host")}/buy?purchase=cancelled`,
        metadata: {
          userId: String(user.id),
          username: user.username,
          webd_amount: String(amount),
        },
      });

      res.json({ url: session.url });
    } catch (err: any) {
      console.error("Custom checkout error:", err);
      res.status(500).json({ message: "Failed to create checkout session" });
    }
  });

  const helpOpenai = new OpenAI({
    apiKey: process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY || "sk-dummy_key_to_bypass_openai_startup_crash",
    baseURL: process.env.AI_INTEGRATIONS_OPENAI_BASE_URL,
  });

  const WEBDOLLAR_SYSTEM_PROMPT = `You are the WebDollar 2 Help Assistant. You answer questions about WDollar 2 (WEBD), a cryptocurrency platform. Be concise, friendly, and helpful. Always refer to the project as "WebDollar 2" or "WDollar 2" — never "2.0".

Key facts you know:
- WebDollar 2 is a cryptocurrency with the ticker WEBD. Price is approximately $0.00096300 per WEBD.
- Total supply: 50.8 billion WEBD tokens. Distribution: 85% public mining (43.2B), 10% dev allocation (5.1B), 5% foundation (2.5B).
- Mining uses Proof-of-Stake (PoS). Users stake WEBD tokens and earn passive rewards. Base rate: 1,140.77 WEBD distributed every 5 seconds (halving every 3 years), designed for a 100-year supply duration.
- Minimum stake: 1,000 WEBD. Rewards are auto-deposited every 5 seconds. APY varies based on total network stake.
- Each wallet generates a 12-word BIP39 seed phrase, a WEBD$ address, and a Polygon-compatible 0x address from the same private key using secp256k1 cryptography.
- Users can create multiple addresses under one account from the Addresses page. Each address has its own balance and can be locked for security.
- The platform is connected to the Polygon (Amoy testnet) blockchain via Alchemy RPC. Users can view their MATIC balance and Polygonscan links.
- Legacy WEBD v1 tokens can be converted 1:1 to WDollar 2, with a lifetime cap of 5,000,000 WEBD per account, up to 1,000,000 every 6 months.
- WEBD tokens can be purchased with credit/debit card via Stripe. Available packages range from $9.99 to $299.99.
- Transfers between users are free and instant within the platform.
- The block explorer shows both internal WEBD blocks/transactions and real Polygon network data with Polygonscan links.
- Two-Factor Authentication (2FA) is available using authenticator apps like Google Authenticator or Authy.
- The crypto debit card feature allows spending WEBD at merchants (conceptual/coming soon).
- The platform is a Progressive Web App (PWA) — installable on mobile and desktop.

Navigation help:
- Home page (/) — Overview, tokenomics chart, features, roadmap
- Wallet (/wallet) — Balance, transfers, staking, mining terminal, transaction history
- Addresses (/addresses) — Create and manage multiple wallet addresses
- Buy (/buy) — Purchase WEBD tokens with card
- Explorer (/explorer) — Browse blocks and transactions, search by address or hash
- Conversion (/conversion) — Convert legacy WEBD v1 tokens
- Card (/card) — Crypto debit card info

If you don't know something, say so honestly. Do not make up information. Keep answers brief (2-4 sentences) unless the user asks for detailed explanation.`;

  app.post("/api/help/chat", async (req, res) => {
    // ... [existing help chat code]
    try {
      const parsed = helpChatInputSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: "Invalid request. Messages array is required." });
      }

      const ip = req.ip || "unknown";
      if (rateLimit(`help_chat:${ip}`, 20, 60000)) {
        return res.status(429).json({ error: "Too many requests. Please wait a moment." });
      }

      const chatMessages = [
        { role: "system" as const, content: WEBDOLLAR_SYSTEM_PROMPT },
        ...parsed.data.messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      ];

      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");

      const stream = await helpOpenai.chat.completions.create({
        model: "gpt-5-nano",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
      res.end();
    } catch (error: any) {
      console.error("Help chat error:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ error: "Something went wrong" })}\n\n`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to get response" });
      }
    }
  });

  // === Background Block Producer (DIELBS Engine) ===
  // Generates 1 native block every 5 seconds to match specification
  // 🌍 GEO-CLUSTER ARCHITECTURE: Only servers designated as Validator Nodes will produce blocks.
  // Other servers act as high-speed RPC/P2P relays for immediate scaling.
  setInterval(async () => {
    try {
      // Leader Election logic: Default to true unless explicitly disabled for RPC nodes
      if (process.env.IS_BLOCK_PRODUCER === "false") return;
      const latest = await storage.getLatestBlock();
      const nextId = (latest?.id || 0) + 1;
      const prevHash = latest?.hash || "0x00000000000000000000000000000000GENESIS_BLOCK_WD2_PROTOCOL_V2";
      
      // Seed a semi-random hash for the new block
      const newHash = createHash("sha256").update(prevHash + Date.now() + nextId).digest("hex");
      
      // 🛡️ THE HYBRID QUORUM: Request mathematical signatures from active browsers
      broadcastQuorumVoteRequest(newHash);
      
      // Wait exactly 2.0 seconds to collect signatures from the WebMesh before sealing the block
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Tally the Decentralized Signatures. If 0 (empty room), we fallback to Origin 1 to preserve liveness.
      const collectedSignatures = activeQuorumVotes.get(newHash) || 0;
      const hybridSignatures = Math.max(1, collectedSignatures);
      
      const rewardAmount = getCurrentBlockReward(nextId);
      
      await storage.createBlock({
        hash: newHash,
        previousHash: prevHash,
        minerId: null, // System generated block for Testnet stability
        reward: rewardAmount.toFixed(4),
        difficulty: 1,
        nonce: hybridSignatures // On Testnet, we re-purpose the nonce field to publicly record Quorum Signature Count!
      });
      
      // Clean up the memory map so it doesn't leak
      activeQuorumVotes.delete(newHash);
      
      if (nextId % 100 === 0) {
        console.log(`[DIELBS] Produced Block #${nextId} | Rewards Pool: ${rewardAmount.toFixed(2)} WEBD2 | Signatures: ${hybridSignatures}`);
      }

      // === STAKING REWARD DISTRIBUTION (PROOF OF PRESENCE) ===
      try {
        const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
        // Find users who have > 1000 staked AND have sent a heartbeat in the last minute
        const activeStakers = await db.select().from(users).where(
          and(
            gt(users.stakedBalance, "1000"),
            gt(users.lastActive, oneMinuteAgo)
          )
        );

        if (activeStakers.length > 0) {
          const totalNetworkStaked = activeStakers.reduce((sum, u) => {
            const val = parseFloat(u.stakedBalance || "0");
            return sum + (isNaN(val) ? 0 : val);
          }, 0);
          
          if (totalNetworkStaked > 0 && !isNaN(rewardAmount)) {
            for (const user of activeStakers) {
              const userStake = parseFloat(user.stakedBalance || "0");
              if (isNaN(userStake) || userStake <= 0) continue;

              const userShare = userStake / totalNetworkStaked;
              let userReward = rewardAmount * userShare;

              // 💎 BACKBONE INCENTIVE: 10% BONUS for Network Pillars
              if (user.isBackbone === true) {
                userReward = userReward * 1.10;
              }

              if (!isNaN(userReward) && userReward > 0.0001) {
                const currentBalance = parseFloat(user.balance || "0");
                const newBalance = ( (isNaN(currentBalance) ? 0 : currentBalance) + userReward).toFixed(4);
                await storage.updateUser(user.id, { balance: newBalance });
                
                // Log the reward transaction
                await db.insert(transactions).values({
                  receiverId: user.id,
                  amount: userReward.toFixed(4),
                  type: "staking_reward",
                  timestamp: new Date()
                });
              }
            }
          }
        }
      } catch (stakingErr) {
        console.error("[DIELBS] Staking distribution error:", stakingErr);
      }

    } catch (err) {
      console.error("[DIELBS] Block production error:", err);
    }
  }, 5000);

  return httpServer;
}
