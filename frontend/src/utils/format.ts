export function formatNum(val: string | number): string {
  const num = typeof val === 'string' ? parseFloat(val) : val;
  if (isNaN(num)) return '0';
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 2 }).format(Math.abs(num));
}


