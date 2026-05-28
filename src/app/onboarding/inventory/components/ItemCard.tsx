'use client';

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2 } from 'lucide-react';
import { InventoryItemData } from '../../../../lib/onboarding';
import { toRupees, toPaise } from '../../../../lib/currency';
import { MarginPill } from './MarginPill';

type ItemCardProps = {
  id: string;
  item: InventoryItemData;
  index: number;
  updateItem: (index: number, field: keyof InventoryItemData, value: any) => void;
  removeItem: (index: number) => void;
  errors?: any;
};

export function ItemCard({ id, item, index, updateItem, removeItem, errors }: ItemCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 1,
    opacity: isDragging ? 0.8 : 1,
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>, field: 'costPrice' | 'sellingPrice') => {
    const val = parseFloat(e.target.value);
    if (!isNaN(val)) {
      updateItem(index, field, toPaise(val));
    } else {
      updateItem(index, field, 0);
    }
  };

  return (
    <div 
      ref={setNodeRef} 
      style={style} 
      className={`bg-[#1a1a1a] border rounded-xl overflow-hidden shadow-sm transition-colors ${
        errors ? 'border-red-500/50' : 'border-white/10'
      }`}
    >
      <div className="flex flex-col md:flex-row md:items-start gap-4 p-4">
        
        {/* Drag Handle & Number */}
        <div className="flex items-center gap-2 md:pt-3">
          <button 
            {...attributes} 
            {...listeners}
            className="text-white/20 hover:text-white/60 cursor-grab active:cursor-grabbing transition-colors"
          >
            <GripVertical size={16} />
          </button>
          <span className="text-xs font-black text-white/20 uppercase w-4">{index + 1}.</span>
        </div>

        {/* Form Grid */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase">Species / Grade</label>
            <div className="flex gap-2">
              <input 
                value={item.name}
                onChange={(e) => updateItem(index, 'name', e.target.value)}
                placeholder="Teak"
                className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <input 
                value={item.grade}
                onChange={(e) => updateItem(index, 'grade', e.target.value)}
                placeholder="A1"
                className="w-16 bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            {errors?.name && <p className="text-red-400 text-[10px]">{errors.name.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase">Cost (₹) / Unit</label>
            <div className="flex gap-2">
              <input 
                type="number"
                value={item.costPrice ? toRupees(item.costPrice) : ''}
                onChange={(e) => handlePriceChange(e, 'costPrice')}
                placeholder="0"
                className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
              />
              <select 
                value={item.unit}
                onChange={(e) => updateItem(index, 'unit', e.target.value)}
                className="w-20 bg-[#111] border border-white/5 rounded-lg h-10 px-2 text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="cft">cft</option>
                <option value="sqft">sqft</option>
                <option value="rm">rm</option>
                <option value="pcs">pcs</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase">Selling (₹)</label>
            <input 
              type="number"
              value={item.sellingPrice ? toRupees(item.sellingPrice) : ''}
              onChange={(e) => handlePriceChange(e, 'sellingPrice')}
              placeholder="0"
              className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
            {errors?.sellingPrice && <p className="text-red-400 text-[10px]">{errors.sellingPrice.message}</p>}
          </div>

          <div className="space-y-1">
            <label className="text-[10px] font-bold text-white/60 uppercase">Opening Stock</label>
            <input 
              type="number"
              value={item.currentStock || ''}
              onChange={(e) => updateItem(index, 'currentStock', parseFloat(e.target.value) || 0)}
              placeholder="0.00"
              className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        {/* Delete */}
        <div className="flex md:items-center justify-end md:pt-3">
          <button 
            onClick={() => removeItem(index)}
            className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-colors"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Margin / Meta Footer */}
      <div className="bg-[#111] border-t border-white/5 px-4 py-2 flex items-center justify-between">
        <MarginPill costPrice={item.costPrice} sellingPrice={item.sellingPrice} />
        
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/40 uppercase">HSN</span>
            <input 
              value={item.hsnCode}
              onChange={(e) => updateItem(index, 'hsnCode', e.target.value)}
              className="w-16 bg-transparent border-b border-white/10 text-xs px-1 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold text-white/40 uppercase">GST %</span>
            <input 
              type="number"
              value={item.gstRate}
              onChange={(e) => updateItem(index, 'gstRate', parseFloat(e.target.value) || 0)}
              className="w-12 bg-transparent border-b border-white/10 text-xs px-1 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
