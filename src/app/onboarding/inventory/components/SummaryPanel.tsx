'use client';

import React from 'react';
import { InventoryItemData } from '../../../../lib/onboarding';
import { toRupees } from '../../../../lib/currency';

type SummaryPanelProps = {
  items: InventoryItemData[];
};

export function SummaryPanel({ items }: SummaryPanelProps) {
  const validItems = items.filter(i => i.name && i.costPrice > 0 && i.sellingPrice > 0);
  
  const totalValue = validItems.reduce((acc, item) => acc + (item.costPrice * (item.currentStock || 0)), 0);
  
  const potentialProfit = validItems.reduce((acc, item) => {
    const profitPerUnit = item.sellingPrice - item.costPrice;
    return acc + (profitPerUnit * (item.currentStock || 0));
  }, 0);

  const overallMargin = totalValue > 0 ? (potentialProfit / (totalValue + potentialProfit)) * 100 : 0;

  return (
    <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24">
      <h3 className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-6">Inventory Summary</h3>
      
      <div className="space-y-6">
        <div>
          <div className="text-3xl font-black text-white">
            {items.length}
          </div>
          <div className="text-xs font-bold text-white/60">Total Items Setup</div>
        </div>
        
        <div>
          <div className="text-xl font-bold text-emerald-400">
            ₹{toRupees(totalValue).toLocaleString('en-IN')}
          </div>
          <div className="text-xs font-bold text-white/60">Opening Stock Value (Cost)</div>
        </div>
        
        <div className="pt-6 border-t border-white/5">
          <div className="text-xl font-bold text-amber-500">
            ₹{toRupees(potentialProfit).toLocaleString('en-IN')}
          </div>
          <div className="text-xs font-bold text-white/60">Projected Profit on Sale</div>
          <div className="text-[10px] text-white/40 mt-1 uppercase font-bold tracking-wider">
            {overallMargin.toFixed(1)}% Blended Margin
          </div>
        </div>
      </div>
    </div>
  );
}
