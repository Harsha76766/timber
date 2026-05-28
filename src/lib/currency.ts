export function toPaise(rupees: number | string): number {
  const value = typeof rupees === 'string' ? parseFloat(rupees) : rupees;
  if (isNaN(value)) return 0;
  return Math.round(value * 100);
}

export function toRupees(paise: number): number {
  if (isNaN(paise)) return 0;
  return paise / 100;
}

export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}
