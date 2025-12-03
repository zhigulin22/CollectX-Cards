/**
 * Cryptographic utilities for secure operations
 * CRITICAL: These functions are essential for banking security
 */

import crypto from 'crypto';

/**
 * Timing-safe string comparison
 * Prevents timing attacks by ensuring constant-time comparison
 */
export function secureCompare(a: string, b: string): boolean {
  // Return false immediately if either is empty
  if (!a || !b) return false;
  
  // Convert to buffers
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  
  // If lengths differ, still do comparison to avoid timing leak
  // but use the longer length and return false
  if (bufA.length !== bufB.length) {
    // Do a dummy comparison to maintain constant time
    crypto.timingSafeEqual(bufA, bufA);
    return false;
  }
  
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Verify HMAC signature with timing-safe comparison
 */
export function verifyHmacSignature(
  payload: string,
  signature: string,
  secret: string,
  algorithm: 'sha256' | 'sha512' = 'sha256'
): boolean {
  if (!signature || !secret) return false;
  
  const expected = crypto
    .createHmac(algorithm, secret)
    .update(payload)
    .digest('hex');
  
  return secureCompare(signature, expected);
}

/**
 * Generate secure random token
 */
export function generateSecureToken(length: number = 32): string {
  return crypto.randomBytes(length).toString('hex');
}

/**
 * Hash sensitive data (for logging)
 */
export function hashForLogging(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex').substring(0, 8);
}

