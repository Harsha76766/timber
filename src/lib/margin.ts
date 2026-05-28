export function calcMargin(costPricePaise: number, sellingPricePaise: number): number {
  if (sellingPricePaise === 0) return 0;
  return ((sellingPricePaise - costPricePaise) / sellingPricePaise) * 100;
}

export type MarginColor = 'green' | 'amber' | 'red' | 'gray';

export function getMarginColor(marginPct: number, costPrice: number, sellingPrice: number): MarginColor {
  if (costPrice === 0 || sellingPrice === 0) return 'gray';
  if (costPrice > sellingPrice) return 'red';
  if (marginPct >= 25) return 'green';
  if (marginPct >= 10 && marginPct < 25) return 'amber';
  return 'red';
}
