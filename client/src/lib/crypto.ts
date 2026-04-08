import * as secp256k1 from "@noble/secp256k1";
import { sha256 } from "@noble/hashes/sha256";

// Helper to convert hex to bytes
function hexToBytes(hex: string): Uint8Array {
  return new Uint8Array(hex.match(/.{1,2}/g)!.map(byte => parseInt(byte, 16)));
}

// Helper to convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signTransaction(message: string, privateKeyHex: string): Promise<string> {
  const msgHash = sha256(message);
  const sig = await secp256k1.sign(msgHash, privateKeyHex);
  return bytesToHex(sig);
}

// Decryption in browser using Web Crypto API or ethers
// For the stress test, we keep it simple - matching the server's AES-256-CBC
// Note: This requires the IV and the key derived from the password
export async function decryptPrivateKeyBrowser(encryptedKey: string, password: string): Promise<string> {
  try {
    const [ivHex, encryptedHex] = encryptedKey.split(":");
    const iv = hexToBytes(ivHex);
    const encrypted = hexToBytes(encryptedHex);
    
    // Hash password to get 32-byte key (SHA256)
    const passwordBytes = new TextEncoder().encode(password);
    const keyBytes = sha256(passwordBytes);

    const key = await crypto.subtle.importKey(
      "raw",
      keyBytes,
      { name: "AES-CBC" },
      false,
      ["decrypt"]
    );

    const decrypted = await crypto.subtle.decrypt(
      { name: "AES-CBC", iv },
      key,
      encrypted
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    throw new Error("Failed to decrypt private key. Incorrect password?");
  }
}
