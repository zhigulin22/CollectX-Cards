import { db } from '../db.js';

// Default values (fallback если нет в БД)
const DEFAULTS = {
  swap_fee_percent: '2',
  usdt_to_x_rate: '100',
  min_swap_usdt: '0.1',
  min_send_x: '1',
  send_fee_x: '0.5',           // Комиссия за перевод $X (0.5 $X ~ 0.5 цента)
  min_withdraw_usdt: '5',
  max_withdraw_usdt: '10000',
  withdraw_fee_usdt: '1',
} as const;

type SettingKey = keyof typeof DEFAULTS;

// Cache для settings (обновляется каждые 5 минут)
let cache: Map<string, string> = new Map();
let cacheExpiry = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

class SettingsService {
  /**
   * Получить значение настройки
   */
  async get(key: SettingKey): Promise<string> {
    await this.ensureCache();
    return cache.get(key) ?? DEFAULTS[key];
  }

  /**
   * Получить числовое значение
   */
  async getNumber(key: SettingKey): Promise<number> {
    const value = await this.get(key);
    return parseFloat(value);
  }

  /**
   * Получить все настройки
   */
  async getAll(): Promise<Record<string, string>> {
    await this.ensureCache();
    const result: Record<string, string> = { ...DEFAULTS };
    for (const [key, value] of cache.entries()) {
      result[key] = value;
    }
    return result;
  }

  /**
   * Установить значение настройки
   */
  async set(key: string, value: string): Promise<void> {
    await db.settings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });
    // Invalidate cache
    this.invalidateCache();
  }

  /**
   * Получить настройки для swap
   */
  async getSwapConfig() {
    return {
      feePercent: await this.getNumber('swap_fee_percent'),
      rate: await this.getNumber('usdt_to_x_rate'),
      minSwapUsdt: await this.getNumber('min_swap_usdt'),
    };
  }

  /**
   * Получить настройки для withdraw
   */
  async getWithdrawConfig() {
    return {
      minAmount: await this.getNumber('min_withdraw_usdt'),
      maxAmount: await this.getNumber('max_withdraw_usdt'),
      fee: await this.getNumber('withdraw_fee_usdt'),
    };
  }

  /**
   * Получить настройки для send
   */
  async getSendConfig() {
    return {
      minAmount: await this.getNumber('min_send_x'),
      fee: await this.getNumber('send_fee_x'),
    };
  }

  /**
   * Обновить кэш если истёк
   */
  private async ensureCache(): Promise<void> {
    if (Date.now() < cacheExpiry && cache.size > 0) {
      return;
    }
    await this.refreshCache();
  }

  /**
   * Принудительно обновить кэш
   */
  async refreshCache(): Promise<void> {
    try {
      const settings = await db.settings.findMany();
      cache = new Map(settings.map((s) => [s.key, s.value]));
      cacheExpiry = Date.now() + CACHE_TTL;
    } catch (error) {
      // Если БД недоступна, используем defaults
      // Используем console.error здесь т.к. логгер может быть не инициализирован
      console.error('[Settings] Failed to load from DB, using defaults:', error);
    }
  }

  /**
   * Сбросить кэш
   */
  invalidateCache(): void {
    cacheExpiry = 0;
  }
}

export const settingsService = new SettingsService();

