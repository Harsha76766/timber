"use client";

import React, { Suspense, useState, useEffect, useRef } from 'react';
import { Share2, Plus, Trash2, WifiOff, RefreshCw, FileText, User, Phone, ArrowLeft, Download, MessageSquareText, Receipt, X, Copy, ChevronDown, Check, Delete, LogOut } from 'lucide-react';
import { CalculationService, InputUnit } from '@/lib/services/calculationService';
import { createClient } from '@/utils/supabase/client';
import { Decimal } from 'decimal.js';
import { useSearchParams, useRouter } from 'next/navigation';
import { useBranch } from '@/components/BranchProvider';

type SizeRow = { id: string; length: string; width: string; thickness: string; quantity: string; unitL: InputUnit; unitW: InputUnit; unitT: InputUnit; calculatedVolume?: number };
type WoodGroup = { 
  id: string; 
  woodId: string; 
  pricePerCftPaise: number; 
  rows: SizeRow[];
  isGstEnabled: boolean;
  gstPercentage: number;
};

const createEmptyRow = (template?: Partial<SizeRow>): SizeRow => ({ 
  id: Math.random().toString(36).substring(2, 9), 
  length: template?.length || '', 
  width: template?.width || '', 
  thickness: template?.thickness || '', 
  quantity: template?.quantity || '', 
  unitL: template?.unitL || 'ft', 
  unitW: template?.unitW || 'in', 
  unitT: template?.unitT || 'in' 
});

const createEmptyGroup = (woodId: string, price: number): WoodGroup => ({ 
  id: Math.random().toString(36).substring(2, 9), 
  woodId, 
  pricePerCftPaise: price, 
  rows: [createEmptyRow()],
  isGstEnabled: false,
  gstPercentage: 18
});

export default function CalculatorPage() {
  return (
    <Suspense fallback={<div className="min-h-[100dvh] bg-[#0a0a0a]" />}>
      <CalculatorWorkspace />
    </Suspense>
  );
}

function CalculatorWorkspace() {
  const { activeBranch } = useBranch();
  const [woods, setWoods] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [isOffline, setIsOffline] = useState(false);
  const [isConverting, setIsConverting] = useState(false);
  const [groups, setGroups] = useState<WoodGroup[]>([]);
  const [mounted, setMounted] = useState(false);
  const supabase = createClient();
  const searchParams = useSearchParams();
  const router = useRouter();
  
  const [currentUser, setCurrentUser] = useState<any>(null);

  const [activeInput, setActiveInput] = useState<{
    groupId: string;
    rowId?: string;
    field: 'width' | 'thickness' | 'length' | 'quantity' | 'price';
  } | null>(null);

  useEffect(() => {
    setMounted(true);
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setCurrentUser(user);
      
      const { data: userData } = await supabase.from('User').select('orgId').eq('id', user.id).single();
      if (userData?.orgId) {
        const { data: cData } = await supabase.from('Customer').select('id, name').eq('orgId', userData.orgId);
        if (cData && cData.length > 0) {
           setCustomers(cData);
           setSelectedCustomerId(cData[0].id);
        }
      }

      try {
        const res = await fetch('/api/v1/products');
        const json = await res.json();
        if (json.success) {
          setWoods(json.data);
          if (!searchParams.get('edit')) setGroups([createEmptyGroup(json.data[0].id, json.data[0].pricePerCft)]);
        }
      } catch (e) { setIsOffline(true); }
    };
    init();
  }, []);

  const getRowVolume = (r: SizeRow) => {
    const l = parseFloat(r.length), w = parseFloat(r.width), t = parseFloat(r.thickness), q = parseInt(r.quantity);
    if (l > 0 && w > 0 && t > 0 && q > 0) {
      try { 
        const vol = CalculationService.calculateCFT({ length: l, width: w, thickness: t, quantity: q, unitL: r.unitL, unitW: r.unitW, unitT: r.unitT }).totalVolume;
        r.calculatedVolume = vol.toNumber(); // Store for API
        return vol; 
      } catch(e) {}
    }
    return new Decimal(0);
  };

  const getGroupTotals = (group: WoodGroup) => {
    let vol = new Decimal(0);
    group.rows.forEach(r => { vol = vol.plus(getRowVolume(r)); });
    const p = CalculationService.calculateTotalPaise(vol, group.pricePerCftPaise);
    const base = CalculationService.toRupees(p).toNumber();
    const gst = group.isGstEnabled ? (base * (group.gstPercentage / 100)) : 0;
    return { volume: vol.toNumber(), basePrice: base, gstAmount: gst, total: base + gst };
  };

  const grandTotals = groups.reduce((acc, g) => {
    const t = getGroupTotals(g);
    return { volume: acc.volume + t.volume, total: acc.total + t.total };
  }, { volume: 0, total: 0 });

  const addGroup = () => { if (woods.length > 0) setGroups([...groups, createEmptyGroup(woods[0].id, woods[0].pricePerCft)]); };
  const updateGroupWood = (groupId: string, woodId: string) => {
    const wood = woods.find(w => w.id === woodId);
    setGroups(groups.map(g => g.id === groupId ? { ...g, woodId, pricePerCftPaise: wood?.pricePerCft || 0 } : g));
  };
  const updateGroupPrice = (groupId: string, p: string) => {
    const v = parseFloat(p);
    setGroups(groups.map(g => g.id === groupId ? { ...g, pricePerCftPaise: isNaN(v) ? 0 : Math.round(v * 100) } : g));
  };
  const updateRow = (groupId: string, rowId: string, f: keyof SizeRow, v: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, rows: g.rows.map(r => r.id === rowId ? { ...r, [f]: v } : r) } : g));
  };
  const addRow = (groupId: string) => { setGroups(groups.map(g => g.id === groupId ? { ...g, rows: [...g.rows, createEmptyRow()] } : g)); };
  const removeRow = (groupId: string, rowId: string) => {
    setGroups(groups.map(g => g.id === groupId ? { ...g, rows: g.rows.filter(r => r.id !== rowId).length > 0 ? g.rows.filter(r => r.id !== rowId) : [createEmptyRow()] } : g));
  };
  const duplicateRow = (groupId: string, row: SizeRow) => {
    setGroups(groups.map(g => {
      if (g.id !== groupId) return g;
      const idx = g.rows.findIndex(r => r.id === row.id);
      const nr = createEmptyRow({ width: row.width, thickness: row.thickness, unitW: row.unitW, unitT: row.unitT });
      const rows = [...g.rows]; rows.splice(idx + 1, 0, nr);
      setTimeout(() => setActiveInput({ groupId, rowId: nr.id, field: 'length' }), 50);
      return { ...g, rows };
    }));
  };

  const handleKeyPress = (key: string) => {
    if (!activeInput) return;
    const { groupId, rowId, field } = activeInput;
    
    if (field === 'price') {
      const g = groups.find(x => x.id === groupId);
      if (!g) return;
      let curVal = Math.round(CalculationService.toRupees(g.pricePerCftPaise).toNumber()).toString();
      if (curVal === '0') curVal = '';
      if (key === 'backspace') curVal = curVal.slice(0, -1);
      else if (key === '.') { if (!curVal.includes('.')) curVal = curVal ? curVal + '.' : '0.'; }
      else curVal = curVal + key;
      updateGroupPrice(groupId, curVal);
      return;
    }

    if (!rowId) return;
    const row = groups.find(g => g.id === groupId)?.rows.find(r => r.id === rowId);
    if (!row) return;
    let val = row[field as keyof SizeRow] as string;
    if (key === 'backspace') val = val.slice(0, -1);
    else if (key === '.') { if (!val.includes('.')) val = val ? val + '.' : '0.'; }
    else val = (val === '0') ? key : val + key;
    updateRow(groupId, rowId, field as keyof SizeRow, val);
  };

  const handleNext = () => {
    if (!activeInput) return;
    const { groupId, rowId, field } = activeInput;
    if (field === 'price') { setActiveInput(null); return; }
    if (!rowId) return;
    const g = groups.find(x => x.id === groupId); if (!g) return;
    const idx = g.rows.findIndex(r => r.id === rowId);
    if (field === 'width') setActiveInput({ groupId, rowId, field: 'thickness' });
    else if (field === 'thickness') setActiveInput({ groupId, rowId, field: 'length' });
    else if (field === 'length') setActiveInput({ groupId, rowId, field: 'quantity' });
    else if (idx < g.rows.length - 1) setActiveInput({ groupId, rowId: g.rows[idx+1].id, field: 'width' });
    else { const nr = createEmptyRow(); setGroups(groups.map(x => x.id === groupId ? { ...x, rows: [...x.rows, nr] } : x)); setActiveInput({ groupId, rowId: nr.id, field: 'width' }); }
  };

  const handleSaveDraft = async () => {
    if (groups.length === 0) return;
    setIsConverting(true);
    
    const customer = customers.find(c => c.id === selectedCustomerId);
    
    const items = groups.flatMap(group => {
      const wood = woods.find(w => w.id === group.woodId);
      return group.rows.map(row => ({
        woodType: wood?.woodType || wood?.name || 'Teak',
        productId: group.woodId,
        length: parseFloat(row.length) || 0,
        width: parseFloat(row.width) || 0,
        thickness: parseFloat(row.thickness) || 0,
        quantity: parseInt(row.quantity) || 0,
        unitL: row.unitL || 'ft',
        unitW: row.unitW || 'in',
        unitT: row.unitT || 'in',
        pricePerCftPaise: group.pricePerCftPaise,
        gstPercentage: group.isGstEnabled ? group.gstPercentage : 0
      }));
    });

    try {
      const res = await fetch('/api/v1/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || null,
          customerName: customer?.name || 'Walk-In Customer',
          customerPhone: customer?.phone || '',
          status: 'draft',
          items
        })
      });
      const data = await res.json();
      if (data.success) {
        alert('Draft Quote Saved Successfully!');
        if (woods.length > 0) setGroups([createEmptyGroup(woods[0].id, woods[0].pricePerCft)]);
      } else {
        alert(data.error || 'Failed to save draft');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsConverting(false);
    }
  };

  const handleConvertToInvoice = async () => {
    if (!selectedCustomerId || groups.length === 0) {
      alert('Please select a customer first');
      return;
    }
    setIsConverting(true);

    const customer = customers.find(c => c.id === selectedCustomerId);
    
    const items = groups.flatMap(group => {
      const wood = woods.find(w => w.id === group.woodId);
      return group.rows.map(row => ({
        woodType: wood?.woodType || wood?.name || 'Teak',
        productId: group.woodId,
        length: parseFloat(row.length) || 0,
        width: parseFloat(row.width) || 0,
        thickness: parseFloat(row.thickness) || 0,
        quantity: parseInt(row.quantity) || 0,
        unitL: row.unitL || 'ft',
        unitW: row.unitW || 'in',
        unitT: row.unitT || 'in',
        pricePerCftPaise: group.pricePerCftPaise,
        gstPercentage: group.isGstEnabled ? group.gstPercentage : 0
      }));
    });

    try {
      // 1. Save quote as draft first
      const saveRes = await fetch('/api/v1/quotes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId,
          customerName: customer?.name || 'Walk-In Customer',
          customerPhone: customer?.phone || '',
          status: 'draft',
          items
        })
      });
      const saveData = await saveRes.json();
      if (!saveData.success || !saveData.data?.id) {
        alert(saveData.error || 'Failed to initialize invoice generation');
        setIsConverting(false);
        return;
      }

      const quoteId = saveData.data.id;

      // 2. Call the convert endpoint
      const convertRes = await fetch(`/api/v1/quotes/${quoteId}/invoice`, {
        method: 'POST'
      });
      const convertData = await convertRes.json();
      if (convertData.success) {
        alert('Invoice Generated Successfully!');
        if (woods.length > 0) setGroups([createEmptyGroup(woods[0].id, woods[0].pricePerCft)]);
      } else {
        alert(convertData.error || 'Failed to convert to invoice');
      }
    } catch (e) {
      alert('Network error');
    } finally {
      setIsConverting(false);
    }
  };

  if (!mounted) return null;

  return (
    <div 
      className={`min-h-[100dvh] bg-[#0a0a0a] flex flex-col font-sans text-white transition-all duration-300 ${activeInput ? 'pb-[400px]' : 'pb-60'}`}
      onClick={(e) => {
        // If clicking outside an input or the keyboard, hide keyboard
        const target = e.target as HTMLElement;
        if (!target.closest('input') && !target.closest('.keyboard-container')) {
          setActiveInput(null);
        }
      }}
    >
      <header className="p-4 flex justify-between items-center border-b border-white/5 bg-black/40 backdrop-blur-md sticky top-0 z-50">
        <div>
          <p className="text-[9px] font-black uppercase tracking-[0.22em] text-emerald-400 mb-0.5">Quote Builder</p>
          <h1 className="text-xl font-black tracking-tight text-white">{activeBranch?.name || 'Loading...'}</h1>
          <div className="mt-1 flex items-center gap-1.5 text-[9px] font-bold tracking-wider text-gray-500 uppercase">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            Synced to cloud
          </div>
        </div>

        <div className="flex items-center gap-2">
          {customers.length > 0 && (
            <select 
              value={selectedCustomerId} 
              onChange={(e) => setSelectedCustomerId(e.target.value)}
              className="bg-white/5 text-xs font-extrabold text-white border border-white/10 rounded-xl px-3 py-2 outline-none cursor-pointer focus:border-emerald-500/40 hover:bg-white/10 transition-all"
            >
              {customers.map(c => <option key={c.id} value={c.id} className="bg-[#111]">{c.name}</option>)}
            </select>
          )}

          <button 
            onClick={() => window.location.reload()} 
            className="px-3.5 py-2 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 text-xs font-black uppercase tracking-wider transition-all"
          >
            New
          </button>
          
          <button 
            onClick={async () => {
              await supabase.auth.signOut();
              router.push('/login');
            }}
            className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 hover:border-rose-500/20 transition-all"
            title="Logout"
          >
            <LogOut size={16} />
          </button>
        </div>
      </header>

      <main className="flex-1 px-3 flex flex-col gap-3">
        {groups.map(group => {
          const { volume, basePrice, gstAmount, total } = getGroupTotals(group);
          return (
            <div key={group.id} className="bg-[#111] border border-white/5 rounded-[20px] overflow-hidden p-2 flex flex-col gap-2 shadow-2xl">
              <div className="px-2 py-0.5 flex justify-between items-center">
                <select value={group.woodId} onChange={(e) => updateGroupWood(group.id, e.target.value)} className="bg-transparent text-base font-bold outline-none text-white/90">
                  {woods.map(w => <option key={w.id} value={w.id} className="bg-black">{w.name}</option>)}
                </select>
                <button onClick={() => setGroups(groups.filter(g => g.id !== group.id))} className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-gray-600 hover:text-red-400"><Trash2 size={14}/></button>
              </div>

              {/* Table Column Headers */}
              <div className="grid grid-cols-[1fr_1fr_1.1fr_0.8fr_0.4fr_0.4fr] gap-1 px-1 py-1 text-[8px] font-black uppercase tracking-wider text-gray-600 text-center">
                <span>Width</span>
                <span>Thick</span>
                <span>Length</span>
                <span>Qty</span>
                <span></span>
                <span></span>
              </div>

              <div className="flex flex-col gap-1">
                {group.rows.map(row => (
                  <div key={row.id} className="grid grid-cols-[1fr_1fr_1.1fr_0.8fr_0.4fr_0.4fr] gap-1 items-center bg-white/5 p-1 rounded-xl border border-white/5 focus-within:border-emerald-500/40">
                    {['width', 'thickness', 'length', 'quantity'].map(f => (
                      <div key={f} className={`rounded-lg flex items-center px-1.5 py-1.5 transition-all ${activeInput?.rowId === row.id && activeInput?.field === f ? 'bg-black border border-emerald-500' : 'bg-black/40 border border-transparent'}`}>
                        <input readOnly inputMode="none" onFocus={() => setActiveInput({ groupId: group.id, rowId: row.id, field: f as any })} type="text" placeholder={f === 'quantity' ? 'Qty' : f[0].toUpperCase()} value={row[f as keyof SizeRow] as string} className="w-full bg-transparent text-xs font-bold outline-none text-center" />
                        {f !== 'quantity' && <span className="text-[8px] font-bold text-gray-600 ml-0.5 uppercase">{row[`unit${f[0].toUpperCase()}` as keyof SizeRow] as string}</span>}
                      </div>
                    ))}
                    <button onClick={() => duplicateRow(group.id, row)} className="w-7 h-7 flex items-center justify-center text-gray-700"><Copy size={13}/></button>
                    <button onClick={() => removeRow(group.id, row.id)} className="w-7 h-7 flex items-center justify-center text-gray-700"><X size={15}/></button>
                  </div>
                ))}
              </div>

              <button onClick={() => addRow(group.id)} className="mx-2 my-0.5 py-2.5 rounded-xl border border-dashed border-white/10 text-gray-600 text-[9px] font-black uppercase flex items-center justify-center gap-2">
                <Plus size={12} /> Add Size
              </button>

              <div className="mt-1 p-2.5 bg-white/5 rounded-[16px] flex flex-col gap-2">
                <div className="flex justify-between items-center">
                  <div className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border transition-all ${activeInput?.groupId === group.id && activeInput?.field === 'price' ? 'bg-black border-emerald-500' : 'bg-black/40 border-white/5'}`}>
                    <span className="text-emerald-400 font-bold text-xs">₹</span>
                    <input readOnly inputMode="none" onFocus={() => setActiveInput({ groupId: group.id, field: 'price' })} type="number" value={Math.round(CalculationService.toRupees(group.pricePerCftPaise).toNumber())} className="bg-transparent w-14 text-emerald-400 font-black text-sm outline-none" />
                    <span className="text-gray-600 text-[9px] font-bold">/CFT</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-1.5 cursor-pointer">
                      <input type="checkbox" className="hidden" checked={group.isGstEnabled} onChange={() => setGroups(groups.map(g => g.id === group.id ? { ...g, isGstEnabled: !g.isGstEnabled } : g))} />
                      <div className={`w-9 h-4.5 rounded-full p-0.5 transition-colors ${group.isGstEnabled ? 'bg-sky-500' : 'bg-white/10'}`}>
                        <div className={`w-3.5 h-3.5 rounded-full bg-white transition-transform ${group.isGstEnabled ? 'translate-x-4' : ''}`} />
                      </div>
                      <span className="text-[9px] font-black text-gray-600 uppercase">GST</span>
                    </label>
                    {group.isGstEnabled && (
                      <div className="flex items-center gap-3 ml-1">
                        <select 
                          value={group.gstPercentage} 
                          onChange={(e) => setGroups(groups.map(g => g.id === group.id ? { ...g, gstPercentage: parseInt(e.target.value) } : g))}
                          className="bg-transparent text-sky-400 font-black text-[10px] outline-none cursor-pointer"
                        >
                          <option value="5" className="bg-black">5%</option>
                          <option value="12" className="bg-black">12%</option>
                          <option value="18" className="bg-black">18%</option>
                          <option value="28" className="bg-black">28%</option>
                        </select>
                        <div className="flex items-center gap-2">
                          <div className="text-right">
                            <p className="text-[6px] font-black text-gray-600 uppercase">Base</p>
                            <p className="text-[10px] font-black text-white/70">₹{Math.round(basePrice).toLocaleString('en-IN')}</p>
                          </div>
                          <div className="w-[1px] h-3 bg-white/10" />
                          <div className="text-right">
                            <p className="text-[6px] font-black text-sky-600 uppercase">Tax</p>
                            <p className="text-[10px] font-black text-sky-500">₹{Math.round(gstAmount).toLocaleString('en-IN')}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex justify-between items-end border-t border-white/5 pt-2 mt-0.5">
                  <div>
                    <p className="text-[7px] font-black text-gray-600 uppercase mb-0.5">Volume</p>
                    <p className="text-lg font-black italic text-white">{volume.toFixed(3)} <span className="text-[9px] not-italic text-gray-700 font-bold uppercase tracking-widest">CFT</span></p>
                  </div>
                  <div className="text-right">
                    <p className="text-[7px] font-black text-gray-600 uppercase mb-0.5">Group Total</p>
                    <p className="text-xl font-black text-white">₹{Math.round(total).toLocaleString('en-IN')}</p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        <button onClick={addGroup} className="h-14 mb-10 rounded-[20px] border-2 border-dashed border-white/10 flex items-center justify-center gap-2 text-gray-600 hover:bg-white/5 transition-all">
          <Plus size={16} /> <span className="text-[9px] font-black uppercase tracking-widest">Add Wood Category</span>
        </button>
      </main>

      <div className={`fixed bottom-[80px] left-0 w-full bg-[#0a0a0a]/90 backdrop-blur-2xl border-t border-white/5 z-40 p-3 transition-all ${activeInput ? 'translate-y-full opacity-0' : ''}`}>
        <div className="max-w-xl mx-auto flex justify-between items-center px-1 mb-3">
          <div>
            <p className="text-[7px] font-black text-gray-600 uppercase">Grand Volume</p>
            <p className="text-base font-black text-white">{grandTotals.volume.toFixed(2)} CFT</p>
          </div>
          <div className="text-right">
            <p className="text-[7px] font-black text-gray-600 uppercase">Grand Total</p>
            <p className="text-xl font-black text-emerald-400">₹{Math.round(grandTotals.total).toLocaleString('en-IN')}</p>
          </div>
        </div>
        <div className="max-w-xl mx-auto grid grid-cols-2 gap-2">
          <button onClick={handleSaveDraft} disabled={isConverting} className="py-3.5 rounded-xl bg-white/5 border border-white/10 font-black text-[12px] uppercase disabled:opacity-50">
            {isConverting ? 'Saving...' : 'Save Draft'}
          </button>
          <button onClick={handleConvertToInvoice} disabled={isConverting || !selectedCustomerId} className="py-3.5 rounded-xl bg-emerald-500 text-black font-black text-[12px] uppercase shadow-lg shadow-emerald-500/20 disabled:opacity-50 disabled:bg-gray-500">
            {isConverting ? 'Converting...' : 'Convert to Invoice'}
          </button>
        </div>
      </div>

      {activeInput && (
        <div className="fixed bottom-0 left-0 w-full bg-[#0d0d0d] border-t border-white/10 z-[100] px-4 pt-3 pb-[calc(1rem+env(safe-area-inset-bottom))] flex flex-col gap-3 animate-in slide-in-from-bottom duration-200 keyboard-container">
          <div className="flex justify-between items-center px-1">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-gray-600 uppercase tracking-widest">Group Volume</span>
              <span className="text-xs font-black text-white/90">{getGroupTotals(groups.find(g => g.id === activeInput.groupId)!).volume.toFixed(3)} CFT</span>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-emerald-600 uppercase tracking-widest">Group Total</span>
              <span className="text-sm font-black text-emerald-400">₹{Math.round(getGroupTotals(groups.find(g => g.id === activeInput.groupId)!).total).toLocaleString('en-IN')}</span>
            </div>
          </div>
          <div className="grid grid-cols-4 gap-2.5 max-w-lg mx-auto w-full">
            {[1,2,3].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 bg-white/5 rounded-2xl text-xl font-bold active:bg-white/20 transition-all">{n}</button>)}
            <button onClick={() => handleKeyPress('backspace')} className="h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 active:bg-white/20"><Delete size={20}/></button>
            {[4,5,6].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 bg-white/5 rounded-2xl text-xl font-bold active:bg-white/20 transition-all">{n}</button>)}
            <button onClick={() => {
              const g = groups.find(x => x.id === activeInput.groupId);
              const r = g?.rows.find(x => x.id === (activeInput.rowId || ''));
              if (g && r) duplicateRow(g.id, r);
            }} className="h-14 bg-white/5 rounded-2xl flex items-center justify-center text-white/40 active:bg-white/20"><Copy size={20}/></button>
            {[7,8,9].map(n => <button key={n} onClick={() => handleKeyPress(n.toString())} className="h-14 bg-white/5 rounded-2xl text-xl font-bold active:bg-white/20 transition-all">{n}</button>)}
            <button onClick={handleNext} className="row-span-2 bg-emerald-500 text-black rounded-2xl flex flex-col items-center justify-center gap-1 active:scale-95 transition-all">
              <span className="text-[8px] font-black uppercase">Next</span>
              <ArrowLeft size={20} className="rotate-180" />
            </button>
            <div className="h-14"></div>
            <button onClick={() => handleKeyPress('0')} className="h-14 bg-white/5 rounded-2xl text-xl font-bold active:bg-white/20 transition-all">0</button>
            <button onClick={() => handleKeyPress('.')} className="h-14 bg-white/5 rounded-2xl text-xl font-bold active:bg-white/20 transition-all">.</button>
          </div>
        </div>
      )}
    </div>
  );
}
