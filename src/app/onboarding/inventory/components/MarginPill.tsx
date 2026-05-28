'use client';

import React from 'react';
import { calcMargin, getMarginColor, MarginColor } from '../../../../lib/margin';
import { toRupees } from '../../../../lib/currency';
import clsx from 'clsx';
import { AlertTriangle } from 'lucide-react';

type MarginPillProps = {
  costPrice: number; // in paise
  sellingPrice: number; // in paise
  className?: string;
};

export function MarginPill({ costPrice, sellingPrice, className }: MarginPillProps) {
  const marginPct = calcMargin(costPrice, sellingPrice);
  const color = getMarginColor(marginPct, costPrice, sellingPrice);
  const profit = sellingPrice - costPrice;

  let content = null;

  if (color === 'gray') {
    content = <span>Enter selling price</span>;
  } else if (color === 'red' && costPrice > sellingPrice) {
    content = <span>Loss — ₹{toRupees(costPrice - sellingPrice).toLocaleString('en-IN')} below cost</span>;
  } else if (costPrice === sellingPrice) {
    content = <span>Zero margin</span>;
  } else {
    content = <span>₹{toRupees(profit).toLocaleString('en-IN')} profit &middot; {marginPct.toFixed(1)}% margin</span>;
  }

  const bgStyles: Record<MarginColor, string> = {
    green: 'bg-[#EAF3DE] text-[#27500A]',
    amber: 'bg-[#FAEEDA] text-[#633806]',
    red: 'bg-[#FCEBEB] text-[#791F1F]',
    gray: 'bg-white/10 text-white/50'
  };

  return (
    <div className={clsx(
      "px-3 py-1.5 rounded-md text-[10px] font-black uppercase tracking-wider inline-flex items-center gap-1.5",
      bgStyles[color],
      className
    )}>
      {color === 'red' && <AlertTriangle size={12} />}
      {content}
    </div>
  );
}
