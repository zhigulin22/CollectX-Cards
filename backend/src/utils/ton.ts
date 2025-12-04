/**
 * TON Address Validation Utilities
 * Validates TON addresses including checksum verification
 */

import crypto from 'crypto';

// Base64url alphabet
const BASE64_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * CRC16-CCITT implementation for TON address checksum
 */
function crc16(data: Buffer): number {
  let crc = 0;
  const polynomial = 0x1021;

  for (let i = 0; i < data.length; i++) {
    crc ^= data[i] << 8;
    for (let j = 0; j < 8; j++) {
      if (crc & 0x8000) {
        crc = ((crc << 1) ^ polynomial) & 0xffff;
      } else {
        crc = (crc << 1) & 0xffff;
      }
    }
  }

  return crc;
}

/**
 * Decode base64url string to buffer
 */
function base64UrlDecode(str: string): Buffer | null {
  try {
    // Replace base64url chars with standard base64
    const base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    // Add padding if needed
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    return Buffer.from(padded, 'base64');
  } catch {
    return null;
  }
}

/**
 * Parse user-friendly TON address (EQ... or UQ...)
 */
function parseUserFriendlyAddress(address: string): {
  workchain: number;
  hash: Buffer;
  isBounceable: boolean;
  isTestOnly: boolean;
} | null {
  // Must be 48 chars for base64url encoded address
  if (address.length !== 48) return null;

  const decoded = base64UrlDecode(address);
  if (!decoded || decoded.length !== 36) return null;

  // Extract components
  const tag = decoded[0];
  const workchain = decoded[1];
  const hash = decoded.slice(2, 34);
  const checksum = decoded.readUInt16BE(34);

  // Verify checksum
  const dataToCheck = decoded.slice(0, 34);
  const calculatedChecksum = crc16(dataToCheck);
  
  if (checksum !== calculatedChecksum) {
    return null;
  }

  // Parse tag
  // 0x11 = bounceable, mainnet
  // 0x51 = non-bounceable, mainnet  
  // 0x91 = bounceable, testnet
  // 0xD1 = non-bounceable, testnet
  const isBounceable = (tag & 0x40) === 0;
  const isTestOnly = (tag & 0x80) !== 0;

  return {
    workchain: workchain > 127 ? workchain - 256 : workchain, // signed byte
    hash,
    isBounceable,
    isTestOnly,
  };
}

/**
 * Parse raw TON address (0:abc123...)
 */
function parseRawAddress(address: string): {
  workchain: number;
  hash: Buffer;
} | null {
  const match = address.match(/^(-?\d+):([a-fA-F0-9]{64})$/);
  if (!match) return null;

  const workchain = parseInt(match[1], 10);
  const hash = Buffer.from(match[2], 'hex');

  // Validate workchain (-1 for masterchain, 0 for basechain)
  if (workchain !== 0 && workchain !== -1) {
    return null;
  }

  return { workchain, hash };
}

/**
 * Validate TON address with checksum verification
 * Supports both user-friendly (EQ.../UQ...) and raw (0:...) formats
 * 
 * @param address - TON address to validate
 * @param options - Validation options
 * @returns true if address is valid
 */
export function isValidTonAddress(
  address: string,
  options: {
    allowTestnet?: boolean;
    requireBounceable?: boolean;
  } = {}
): boolean {
  const { allowTestnet = false, requireBounceable = false } = options;

  if (!address || typeof address !== 'string') {
    return false;
  }

  const trimmed = address.trim();

  // Try user-friendly format first (EQ... or UQ...)
  if (trimmed.startsWith('EQ') || trimmed.startsWith('UQ')) {
    const parsed = parseUserFriendlyAddress(trimmed);
    
    if (!parsed) return false;
    
    // Check testnet restriction
    if (parsed.isTestOnly && !allowTestnet) {
      return false;
    }

    // Check bounceable requirement
    if (requireBounceable && !parsed.isBounceable) {
      return false;
    }

    return true;
  }

  // Try raw format (0:... or -1:...)
  if (trimmed.includes(':')) {
    const parsed = parseRawAddress(trimmed);
    return parsed !== null;
  }

  return false;
}

/**
 * Get address info for display/debugging
 */
export function getTonAddressInfo(address: string): {
  valid: boolean;
  format: 'user-friendly' | 'raw' | 'invalid';
  workchain?: number;
  isBounceable?: boolean;
  isTestOnly?: boolean;
} {
  if (!address) {
    return { valid: false, format: 'invalid' };
  }

  const trimmed = address.trim();

  if (trimmed.startsWith('EQ') || trimmed.startsWith('UQ')) {
    const parsed = parseUserFriendlyAddress(trimmed);
    if (parsed) {
      return {
        valid: true,
        format: 'user-friendly',
        workchain: parsed.workchain,
        isBounceable: parsed.isBounceable,
        isTestOnly: parsed.isTestOnly,
      };
    }
  }

  if (trimmed.includes(':')) {
    const parsed = parseRawAddress(trimmed);
    if (parsed) {
      return {
        valid: true,
        format: 'raw',
        workchain: parsed.workchain,
      };
    }
  }

  return { valid: false, format: 'invalid' };
}

