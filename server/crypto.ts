import * as bip39 from "bip39";
import * as secp256k1 from "@noble/secp256k1";
import { createHash, randomBytes, createCipheriv, createDecipheriv } from "crypto";
import { ethers } from "ethers";

function sha256Hex(data: Buffer | Uint8Array | string): string {
  return createHash("sha256").update(data).digest("hex");
}

export function generateMnemonic(): string {
  return bip39.generateMnemonic();
}

export function mnemonicToSeed(mnemonic: string): Buffer {
  return bip39.mnemonicToSeedSync(mnemonic);
}

export function deriveKeyPair(mnemonic: string): { privateKey: string; publicKey: string; address: string; polygonAddress: string } {
  const seed = mnemonicToSeed(mnemonic);
  const privateKeyHex = sha256Hex(seed.slice(0, 32));

  const privateKeyBytes = Buffer.from(privateKeyHex, "hex");
  const publicKeyBytes = secp256k1.getPublicKey(privateKeyBytes, true);
  const publicKeyHex = Buffer.from(publicKeyBytes).toString("hex");

  const addressHash = sha256Hex(Buffer.from(publicKeyHex, "hex"));
  const address = "WEBD$" + addressHash.substring(0, 40).toUpperCase() + "$";

  const polygonAddress = new ethers.Wallet(privateKeyHex).address;

  return {
    privateKey: privateKeyHex,
    publicKey: publicKeyHex,
    address,
    polygonAddress,
  };
}

export function generateWallet(): { mnemonic: string; privateKey: string; publicKey: string; address: string; polygonAddress: string } {
  const mnemonic = generateMnemonic();
  const keys = deriveKeyPair(mnemonic);
  return { mnemonic, ...keys };
}

export function encryptPrivateKey(privateKey: string, password: string): string {
  const key = createHash("sha256").update(password).digest();
  const iv = randomBytes(16);
  const cipher = createCipheriv("aes-256-cbc", key, iv);
  let encrypted = cipher.update(privateKey, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptPrivateKey(encryptedKey: string, password: string): string {
  const [ivHex, encrypted] = encryptedKey.split(":");
  const key = createHash("sha256").update(password).digest();
  const iv = Buffer.from(ivHex, "hex");
  const decipher = createDecipheriv("aes-256-cbc", key, iv);
  let decrypted = decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}

export function hashBlock(input: string, _timestamp?: number, _data?: string, _nonce?: number): string {
  return sha256Hex(input);
}
