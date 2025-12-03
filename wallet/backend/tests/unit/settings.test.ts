import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock db before importing settings service
vi.mock('../../src/db.js', () => ({
  db: {
    settings: {
      findMany: vi.fn(),
      upsert: vi.fn(),
    },
  },
}));

// Import after mocking
import { settingsService } from '../../src/services/settings.js';
import { db } from '../../src/db.js';

describe('SettingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.invalidateCache();
  });

  describe('get', () => {
    it('should return default value when no settings in DB', async () => {
      vi.mocked(db.settings.findMany).mockResolvedValue([]);
      
      const value = await settingsService.get('swap_fee_percent');
      
      expect(value).toBe('2');
    });

    it('should return DB value when available', async () => {
      vi.mocked(db.settings.findMany).mockResolvedValue([
        { key: 'swap_fee_percent', value: '3', updatedAt: new Date() },
      ]);
      
      const value = await settingsService.get('swap_fee_percent');
      
      expect(value).toBe('3');
    });
  });

  describe('getNumber', () => {
    it('should return numeric value', async () => {
      vi.mocked(db.settings.findMany).mockResolvedValue([
        { key: 'usdt_to_x_rate', value: '150', updatedAt: new Date() },
      ]);
      
      const value = await settingsService.getNumber('usdt_to_x_rate');
      
      expect(value).toBe(150);
    });
  });

  describe('getSwapConfig', () => {
    it('should return swap configuration', async () => {
      vi.mocked(db.settings.findMany).mockResolvedValue([
        { key: 'swap_fee_percent', value: '2.5', updatedAt: new Date() },
        { key: 'usdt_to_x_rate', value: '100', updatedAt: new Date() },
        { key: 'min_swap_usdt', value: '0.5', updatedAt: new Date() },
      ]);
      
      const config = await settingsService.getSwapConfig();
      
      expect(config).toEqual({
        feePercent: 2.5,
        rate: 100,
        minSwapUsdt: 0.5,
      });
    });
  });

  describe('getWithdrawConfig', () => {
    it('should return withdraw configuration', async () => {
      vi.mocked(db.settings.findMany).mockResolvedValue([
        { key: 'min_withdraw_usdt', value: '10', updatedAt: new Date() },
        { key: 'max_withdraw_usdt', value: '5000', updatedAt: new Date() },
        { key: 'withdraw_fee_usdt', value: '2', updatedAt: new Date() },
      ]);
      
      const config = await settingsService.getWithdrawConfig();
      
      expect(config).toEqual({
        minAmount: 10,
        maxAmount: 5000,
        fee: 2,
      });
    });
  });

  describe('set', () => {
    it('should upsert setting and invalidate cache', async () => {
      vi.mocked(db.settings.upsert).mockResolvedValue({
        key: 'test_key',
        value: 'test_value',
        updatedAt: new Date(),
      });
      
      await settingsService.set('test_key', 'test_value');
      
      expect(db.settings.upsert).toHaveBeenCalledWith({
        where: { key: 'test_key' },
        update: { value: 'test_value' },
        create: { key: 'test_key', value: 'test_value' },
      });
    });
  });
});

