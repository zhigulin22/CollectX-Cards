import { describe, it, expect } from 'vitest';
import { isNumeric, isUUID } from '../../src/routes/wallet/helpers.js';

describe('Wallet Helpers', () => {
  describe('isNumeric', () => {
    it('should return true for numeric strings', () => {
      expect(isNumeric('123')).toBe(true);
      expect(isNumeric('0')).toBe(true);
      expect(isNumeric('999999999')).toBe(true);
    });

    it('should return false for non-numeric strings', () => {
      expect(isNumeric('abc')).toBe(false);
      expect(isNumeric('123abc')).toBe(false);
      expect(isNumeric('')).toBe(false);
      expect(isNumeric(' ')).toBe(false);
    });

    it('should return false for floats', () => {
      expect(isNumeric('12.34')).toBe(false);
    });
  });

  describe('isUUID', () => {
    it('should return true for valid UUIDs', () => {
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('a1b2c3d4-e5f6-7890-abcd-ef1234567890')).toBe(true);
    });

    it('should return false for invalid UUIDs', () => {
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('550e8400-e29b-41d4-a716')).toBe(false);
      expect(isUUID('')).toBe(false);
      expect(isUUID('550e8400e29b41d4a716446655440000')).toBe(false); // No dashes
    });
  });
});

