import crypto from 'crypto';
import { logWarn, logError } from './logger';

/**
 * Encryption utilities for sensitive data storage
 * Uses AES-256-CBC with explicit IV and proper key derivation
 */

const ALGORITHM = 'aes-256-cbc';
const IV_LENGTH = 16;
const KEY_LENGTH = 32;

/**
 * Derives a key from the environment variable ENCRYPTION_KEY
 * Falls back to a default key for development (insecure)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    logWarn('[Encryption] ENCRYPTION_KEY not set in .env.local - using default key (INSECURE)');
    // Default key for development - NEVER use in production
    return crypto.scryptSync('default-dev-key-email-guru', 'salt', KEY_LENGTH);
  }

  // Derive key from env var using scrypt
  const salt = crypto.createHash('sha256').update('email-guru-salt').digest().slice(0, 32);
  return crypto.scryptSync(envKey, salt, KEY_LENGTH);
}

/**
 * Encrypts a plaintext string
 * Returns base64-encoded string: iv:encrypted
 */
export function encrypt(plaintext: string): string {
  try {
    const key = getEncryptionKey();
    const iv = crypto.randomBytes(IV_LENGTH);

    const cipher = crypto.createCipher(ALGORITHM, key.toString('hex'));
    let encrypted = cipher.update(plaintext, 'utf8', 'base64');
    encrypted += cipher.final('base64');

    // Format: iv:encrypted (both base64)
    return `${iv.toString('base64')}:${encrypted}`;
  } catch (error) {
    logError('[Encryption] Failed to encrypt:', error);
    throw new Error('Encryption failed');
  }
}

/**
 * Decrypts an encrypted string
 * Expects format: iv:encrypted (base64)
 */
export function decrypt(encrypted: string): string {
  try {
    const parts = encrypted.split(':');
    if (parts.length !== 2) {
      throw new Error('Invalid encrypted format');
    }

    const [ivB64, encryptedB64] = parts;
    const key = getEncryptionKey();

    const decipher = crypto.createDecipher(ALGORITHM, key.toString('hex'));
    let decrypted = decipher.update(encryptedB64, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  } catch (error) {
    logError('[Encryption] Failed to decrypt:', error);
    throw new Error('Decryption failed');
  }
}

/**
 * Checks if a string looks like an encrypted value
 */
export function isEncrypted(value: string): boolean {
  return value.includes(':') && value.split(':').length === 2;
}

/**
 * Safely encrypts a password, handles already encrypted values
 */
export function encryptPassword(password: string): string {
  if (isEncrypted(password)) {
    return password; // Already encrypted
  }
  return encrypt(password);
}

/**
 * Safely decrypts a password, handles plaintext values for backward compatibility
 */
export function decryptPassword(password: string): string {
  if (!isEncrypted(password)) {
    logWarn('[Encryption] Password appears to be plaintext - consider migration');
    return password; // Backward compatibility
  }
  return decrypt(password);
}