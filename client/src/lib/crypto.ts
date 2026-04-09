import { signAsync } from "@noble/secp256k1";

// Helper to convert hex to bytes safely
function hexToBytes(hex: string): Uint8Array {
  const cleanHex = hex.startsWith("0x") ? hex.slice(2) : hex;
  if (cleanHex.length % 2 !== 0) throw new Error("Invalid hex string length");
  const pairs = cleanHex.match(/.{1,2}/g);
  if (!pairs) return new Uint8Array(0);
  return new Uint8Array(pairs.map(byte => parseInt(byte, 16)));
}

// Helper to convert bytes to hex
function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

export async function signTransaction(message: string, privateKeyHex: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
  const msgHash = new Uint8Array(hashBuffer);
  
  const privKeyBytes = hexToBytes(privateKeyHex);
  const sigBytes = await signAsync(msgHash, privKeyBytes, { prehash: false });
  return bytesToHex(sigBytes);
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
    const keyBytesBuffer = await crypto.subtle.digest("SHA-256", passwordBytes);
    const keyBytes = new Uint8Array(keyBytesBuffer);

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

export async function calculatePoW(userId: number, challenge: string): Promise<string> {
  let nonce = 0;
  const prefix = "000";
  
  while (true) {
    const data = String(userId) + challenge + String(nonce);
    const msgBuffer = new TextEncoder().encode(data);
    const hashBuffer = await crypto.subtle.digest("SHA-256", msgBuffer);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
    
    if (hashHex.startsWith(prefix)) {
      return String(nonce);
    }
    nonce++;
    // Safety break
    if (nonce > 100000) return String(nonce);
  }
}
