/**
 * Crypto Service
 * Provides AES-256-GCM encryption/decryption for sensitive tokens
 */

import crypto from 'crypto';
import { config } from '../config/index.js';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const AUTH_TAG_LENGTH = 16;

/**
 * Get encryption key from config
 * If not configured, generates a warning and uses a fallback (not secure for production)
 */
function getEncryptionKey(): Buffer {
  const key = config.encryption.key;

  if (!key) {
    console.warn('WARNING: ENCRYPTION_KEY not set. Using insecure fallback. Set ENCRYPTION_KEY in production.');
    // Generate a deterministic fallback key (NOT SECURE - only for development)
    return crypto.scryptSync('insecure-dev-key', 'salt', 32);
  }

  // If key is provided, ensure it's 32 bytes for AES-256
  if (key.length === 32) {
    return Buffer.from(key);
  }

  // Derive a 32-byte key from the provided key using scrypt
  return crypto.scryptSync(key, 'infinia-salt', 32);
}

export const cryptoService = {
  /**
   * Encrypt a string using AES-256-GCM
   * Returns base64-encoded string containing: IV + AuthTag + Ciphertext
   */
  encrypt(text: string): string {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);

    let encrypted = cipher.update(text, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + AuthTag + Encrypted data
    const combined = Buffer.concat([
      iv,
      authTag,
      Buffer.from(encrypted, 'hex')
    ]);

    return combined.toString('base64');
  },

  /**
   * Decrypt a string encrypted with encrypt()
   * Expects base64-encoded string containing: IV + AuthTag + Ciphertext
   */
  decrypt(encryptedText: string): string {
    const key = getEncryptionKey();
    const combined = Buffer.from(encryptedText, 'base64');

    // Extract IV, AuthTag, and Ciphertext
    const iv = combined.subarray(0, IV_LENGTH);
    const authTag = combined.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
    const encrypted = combined.subarray(IV_LENGTH + AUTH_TAG_LENGTH);

    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted.toString('hex'), 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  },

  /**
   * Check if encryption is properly configured
   */
  isConfigured(): boolean {
    return !!config.encryption.key;
  },
};

export default cryptoService;
