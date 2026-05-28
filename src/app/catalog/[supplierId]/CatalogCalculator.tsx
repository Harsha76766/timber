"use client";

import React, { useState, useEffect } from 'react';
import { Calculator, MessageCircle } from 'lucide-react';
import { CalculationService, InputUnit } from '@/lib/services/calculationService';

export default function CatalogCalculator({ products, supplierPhone }: { products: any[], supplierPhone: string | null }) {
  const [selectedWood, setSelectedWood] = useState(products[0]?.id || '');
  const [pricePerCftPaise, setPricePerCftPaise] = useState(products[0]?.pricePerCft || 0);
  
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [thickness, setThickness] = useState('');
  const [quantity, setQuantity] = useState('1');

  const [activeField, setActiveField] = useState<'length' | 'width' | 'thickness' | 'quantity' | null>(null);

  const [unitL, setUnitL] = useState<InputUnit>('ft');
  const [unitW, setUnitW] = useState<InputUnit>('in');
  const [unitT, setUnitT] = useState<InputUnit>('in');

  const [calcResult, setCalcResult] = useState<{ totalVolume: string, totalPrice: number, mathString: string } | null>(null);

  const handleWoodChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    setSelectedWood(val);
    const wood = products.find((w: any) => w.id === val);
    if (wood) {
      setPricePerCftPaise(wood.pricePerCft);
    }
  };

  useEffect(() => {
    const l = parseFloat(length);
    const w = parseFloat(width);
    const t = parseFloat(thickness);
    const q = parseInt(quantity);

    if (l > 0 && w > 0 && t > 0 && q > 0) {
      try {
        const { totalVolume } = CalculationService.calculateCFT({
          length: l, width: w, thickness: t, quantity: q,
          unitL, unitW, unitT
        });

        const totalPaise = CalculationService.calculateTotalPaise(totalVolume, pricePerCftPaise);
        const priceRupees = CalculationService.toRupees(totalPaise).toNumber();

        const mathString = `${l}${unitL} × ${w}${unitW} × ${t}${unitT} ${q > 1 ? `× ${q} pcs` : ''}`;

        setCalcResult({
          totalVolume: totalVolume.toFixed(4),
          totalPrice: priceRupees,
          mathString: mathString
        });
      } catch (err) {
        setCalcResult(null);
      }
    } else {
      setCalcResult(null);
    }
  }, [length, width, thickness, quantity, unitL, unitW, unitT, pricePerCftPaise]);

  const handleContactSupplier = () => {
    if (!calcResult) return;
    
    const woodName = products.find((w: any) => w.id === selectedWood)?.name || 'Timber';
    
    const text = `Hi! I found your catalog on TimberFlow and want to place an order:\n\n` +
      `*Product:* ${woodName}\n` +
      `*Size:* ${length}${unitL} x ${width}${unitW} x ${thickness}${unitT}\n` +
      `*Quantity:* ${quantity} Pieces\n` +
      `───────────────\n` +
      `*Total Volume:* ${calcResult.totalVolume} CFT\n` +
      `*Estimated Price:* ₹${calcResult.totalPrice.toLocaleString('en-IN')}\n` +
      `───────────────\n` +
      `Is this available?`;

    // Try to open to the supplier directly if they have a phone, else let them pick who to text
    let url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    if (supplierPhone) {
        const cleanlyFormatted = supplierPhone.replace(/\D/g, ''); // strip out non-numerics
        url = `https://wa.me/${cleanlyFormatted}?text=${encodeURIComponent(text)}`;
    }
    
    window.open(url, '_blank');
  };

  const handleKeyPress = (key: string) => {
    if (!activeField) return;
    
    let currentVal = '';
    let setter: React.Dispatch<React.SetStateAction<string>> | null = null;
    
    if (activeField === 'length') { currentVal = length; setter = setLength; }
    else if (activeField === 'width') { currentVal = width; setter = setWidth; }
    else if (activeField === 'thickness') { currentVal = thickness; setter = setThickness; }
    else if (activeField === 'quantity') { currentVal = quantity; setter = setQuantity; }
    
    if (!setter) return;

    let val = currentVal;
    if (key === 'backspace') {
      val = val.slice(0, -1);
    } else if (key === 'clear') {
      val = '';
    } else if (key === '.') {
      if (!val.includes('.')) {
        val = val ? val + '.' : '0.';
      }
    } else {
      if (val === '0') {
        val = key;
      } else {
        val = val + key;
      }
    }
    setter(val);
  };

  const handleNext = () => {
    if (activeField === 'length') setActiveField('width');
    else if (activeField === 'width') setActiveField('thickness');
    else if (activeField === 'thickness') setActiveField('quantity');
    else if (activeField === 'quantity') setActiveField('length');
  };

  return (
    <div 
      onClick={(e) => {
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('.custom-keyboard')) {
          setActiveField(null);
        }
      }}
      className={`flex flex-col gap-4 max-w-md mx-auto w-full transition-all duration-300 ${activeField ? 'pb-[400px]' : 'pb-10'}`}
    >
      <div className="bg-amber-50/50 p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-amber-100/50">
        <label className="block text-xs sm:text-sm font-semibold text-amber-900/70 mb-1.5 sm:mb-2 uppercase tracking-wider">Wood Type & Pricing</label>
        <select
          value={selectedWood}
          onChange={handleWoodChange}
          className="w-full bg-gray-50 border border-gray-200 rounded-xl p-4 text-base outline-none focus:border-emerald-500 font-medium"
        >
          {products.map((w: any) => (
            <option key={w.id} value={w.id}>
              {w.name} — ₹{CalculationService.toRupees(w.pricePerCft).toString()}/CFT
            </option>
          ))}
        </select>
      </div>

      <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl shadow-sm border border-gray-100 flex flex-col gap-3 sm:gap-4">
        <div className="flex flex-col gap-4">
          {[{ label: 'Length', id: 'length' as const, state: length, setter: setLength, unit: unitL, unitSetter: setUnitL },
            { label: 'Width', id: 'width' as const, state: width, setter: setWidth, unit: unitW, unitSetter: setUnitW },
            { label: 'Thickness', id: 'thickness' as const, state: thickness, setter: setThickness, unit: unitT, unitSetter: setUnitT }
          ].map(dim => (
            <div key={dim.label} className={`flex gap-1.5 sm:gap-2 items-center bg-gray-50 p-1.5 sm:p-2 rounded-xl sm:rounded-2xl border transition-all ${activeField === dim.id ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-gray-100'}`}>
              <span className="text-xs sm:text-sm font-semibold text-gray-500 w-16 sm:w-20 px-1 sm:px-2">{dim.label}</span>
              <input
                type="text"
                inputMode="none"
                value={dim.state}
                onFocus={() => setActiveField(dim.id)}
                onChange={(e) => dim.setter(e.target.value)}
                placeholder="0"
                className="flex-1 bg-transparent min-w-0 text-lg sm:text-xl font-bold text-gray-800 outline-none px-1 sm:px-2"
              />
              <select 
                value={dim.unit} 
                onChange={e => dim.unitSetter(e.target.value as InputUnit)}
                className="bg-white border border-gray-200 rounded-lg sm:rounded-xl p-1.5 sm:p-2 text-xs sm:text-sm font-bold text-gray-600 outline-none"
              >
                <option value="ft">ft</option>
                <option value="in">in</option>
                <option value="mm">mm</option>
              </select>
            </div>
          ))}
        </div>

        <div className="mt-2 sm:mt-4 pt-2 sm:pt-4 border-t border-gray-100 flex items-center justify-between px-1 sm:px-2">
          <span className="text-sm sm:text-base font-semibold text-gray-700">Quantity</span>
          <div className={`flex items-center gap-3 sm:gap-4 bg-gray-50 rounded-xl sm:rounded-2xl p-1 border transition-all ${activeField === 'quantity' ? 'border-emerald-500 ring-2 ring-emerald-500/20 bg-white' : 'border-gray-100'}`}>
            <button 
              onClick={() => setQuantity(String(Math.max(1, parseInt(quantity || '1') - 1)))}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-white shadow-sm flex items-center justify-center text-lg sm:text-xl font-medium active:scale-95 transition-transform"
            >-</button>
            <input
              type="text"
              inputMode="none"
              value={quantity}
              onFocus={() => setActiveField('quantity')}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-12 sm:w-16 bg-transparent p-0 text-xl sm:text-2xl font-bold text-center outline-none"
            />
            <button 
              onClick={() => setQuantity(String(parseInt(quantity || '0') + 1))}
              className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg sm:rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center text-xl sm:text-2xl font-medium active:scale-95 transition-transform"
            >+</button>
          </div>
        </div>
      </div>

      <div className={`mt-1 sm:mt-2 bg-emerald-900 p-4 sm:p-6 rounded-2xl sm:rounded-3xl shadow-lg text-white transition-opacity ${calcResult ? 'opacity-100' : 'opacity-40 pointer-events-none'}`}>
        <div className="flex justify-between items-end mb-4 sm:mb-5">
          <div>
            <p className="text-emerald-100/70 text-[10px] sm:text-sm font-medium uppercase tracking-wider">Total Volume</p>
            <p className="text-2xl sm:text-3xl font-bold">{calcResult ? calcResult.totalVolume : '0.00'} <span className="text-xs sm:text-sm font-normal text-emerald-100/70">CFT</span></p>
          </div>
          <div className="text-right">
            <p className="text-emerald-100/70 text-[10px] sm:text-sm font-medium uppercase tracking-wider">Estimated Total</p>
            <p className="text-2xl sm:text-3xl font-black text-emerald-400">₹{calcResult ? calcResult.totalPrice.toLocaleString('en-IN') : '0'}</p>
          </div>
        </div>

        <button 
          onClick={handleContactSupplier}
          className="w-full bg-[#25D366] hover:bg-[#1ebd5a] active:scale-95 transition-transform text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 shadow-lg"
        >
          <MessageCircle size={22} />
          Contact Supplier to Order
        </button>
      </div>

      {/* Custom Mobile Keyboard Overlay */}
      {activeField && (
        <div className="custom-keyboard fixed inset-x-0 bottom-0 z-50 bg-white/95 backdrop-blur-xl border-t border-gray-200 p-4 shadow-[0_-10px_40px_rgba(0,0,0,0.1)] block sm:hidden animate-in slide-in-from-bottom duration-200 pb-6">
          <div className="grid grid-cols-4 gap-2 max-w-md mx-auto">
            {['1', '2', '3'].map(digit => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl transition-all border border-gray-200/60 shadow-sm flex items-center justify-center active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('backspace')}
              className="h-12 bg-rose-50 hover:bg-rose-100 active:bg-rose-200 text-rose-600 font-bold text-sm rounded-xl transition-all border border-rose-100 shadow-sm flex items-center justify-center active:scale-95"
            >
              ⌫
            </button>

            {['4', '5', '6'].map(digit => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl transition-all border border-gray-200/60 shadow-sm flex items-center justify-center active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={() => handleKeyPress('clear')}
              className="h-12 bg-amber-50 hover:bg-amber-100 active:bg-amber-200 text-amber-700 font-bold text-xs uppercase tracking-wider rounded-xl transition-all border border-amber-100 shadow-sm flex items-center justify-center active:scale-95"
            >
              Clear
            </button>

            {['7', '8', '9'].map(digit => (
              <button
                key={digit}
                onClick={() => handleKeyPress(digit)}
                className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl transition-all border border-gray-200/60 shadow-sm flex items-center justify-center active:scale-95"
              >
                {digit}
              </button>
            ))}
            <button
              onClick={handleNext}
              className="h-26 row-span-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white font-black text-sm uppercase tracking-wider rounded-xl transition-all shadow-md flex flex-col items-center justify-center gap-1 active:scale-95 border border-emerald-500"
            >
              <span>Next</span>
              <span className="text-[10px] font-medium opacity-80">↵</span>
            </button>

            <button
              onClick={() => handleKeyPress('0')}
              className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl transition-all border border-gray-200/60 shadow-sm flex items-center justify-center active:scale-95 col-span-2"
            >
              0
            </button>
            <button
              onClick={() => handleKeyPress('.')}
              className="h-12 bg-gray-50 hover:bg-gray-100 active:bg-gray-200 text-gray-800 font-bold text-xl rounded-xl transition-all border border-gray-200/60 shadow-sm flex items-center justify-center active:scale-95"
            >
              .
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
