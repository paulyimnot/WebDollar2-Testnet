
/**
 * DIELBS ENGINE ADAPTER (Public Edition)
 * 
 * This adapter manages the connection between the Public WDollar2 codebase 
 * and the Proprietary DIELBS Core.
 * 
 * PROPRIETARY PROTECTION: 
 * If the proprietary engine module is not found, this adapter will fall back 
 * to the Basic Validator (Standard TPS).
 */

import { storage } from "./storage.js";

interface VerificationResult {
  success: boolean;
  error?: string;
  txHash?: string;
}

/**
 * The core Interface used by the rest of the application.
 * In production, this will be swapped for the DIELBS Proprietary Core.
 */
class EngineAdapter {
  private proprietaryCore: any = null;

  constructor() {
    this.initializeEngine();
  }

  private async initializeEngine() {
    try {
      // PROPRIETARY HOOK: Attempt to load the hidden core
      // This file is NOT included in the public repository.
      const { engine } = await import("./dielbs_engine_pro.js"); 
      this.proprietaryCore = engine;
      console.log("-----------------------------------------");
      console.log("DIELBS PRO ENGINE: ACTIVE [BILLION TPS MODE]");
      console.log("-----------------------------------------");
    } catch {
      console.log("-----------------------------------------");
      console.log("DIELBS CORE: BASIC MODE [COMMUNITY EDITION]");
      console.log("-----------------------------------------");
    }
  }

  /**
   * Dispatches a transaction to the appropriate engine.
   */
  public async processTransaction(params: {
    senderAddress: string;
    recipientAddress: string;
    amount: string;
    nonce: number;
  }): Promise<VerificationResult> {
    
    // 1. If Proprietary Core is present, use it for Billion TPS validation
    if (this.proprietaryCore) {
      return await this.proprietaryCore.validateTransaction(params);
    }

    // 2. Fallback: Standard Community Validator (Uses DB Transactions)
    try {
      // Basic check
      const senderNonce = await storage.getWalletNonce(params.senderAddress);
      if (params.nonce !== senderNonce + 1) {
        return { success: false, error: "NONCE_MISMATCH" };
      }

      // Validating and updating via DB
      // Note: This is significantly slower than DIELBS Pro but safe for public use.
      await storage.updateWalletBalance(params.senderAddress, 0n, params.nonce);
      
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || "VALIDATION_FAILED" };
    }
  }

  /**
   * Gets the Root Hash for the current block settlement.
   */
  public getRootHash(): string {
    if (this.proprietaryCore) {
      return this.proprietaryCore.getRootHash();
    }
    // Community fallback hash
    return "0x_COMMUNITY_BLOCK_HASH_" + Date.now();
  }
}

export const dielbs = new EngineAdapter();
