/**
 * Wallet route helpers
 * 
 * Note: For financial operations with locking, use services/wallet.ts
 */

/**
 * Check if string contains only digits
 */
export function isNumeric(str: string): boolean {
  return /^\d+$/.test(str);
}

/**
 * Check if string is a valid UUID v4
 */
export function isUUID(str: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str);
}

/**
 * Validate amount string
 */
export function isValidAmount(str: string): boolean {
  const num = parseFloat(str);
  return !isNaN(num) && isFinite(num) && num > 0;
}

/**
 * Format amount for display
 */
export function formatAmount(amount: string, decimals: number = 2): string {
  const num = parseFloat(amount);
  if (isNaN(num)) return '0';
  return num.toFixed(decimals);
}
