"use client";

import { useState, useEffect } from 'react';
import { X, Wallet, CheckCircle2, Loader2, Info, ChevronDown } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface PaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  orgId: string;
  openDeals?: Array<{ id: string; title: string; balance: number }>;
  preSelectedQuoteId?: string;
  onSuccess?: () => void;
}

export default function PaymentModal({ isOpen, onClose, customerId, customerName, orgId, openDeals = [], preSelectedQuoteId, onSuccess }: PaymentModalProps) {
  const [amount, setAmount] = useState('');
  const [method, setMethod] = useState<'CASH' | 'UPI' | 'BANK_TRANSFER' | 'CHECK'>('CASH');
  const [selectedQuoteId, setSelectedQuoteId] = useState(preSelectedQuoteId || '');
  const [internalDeals, setInternalDeals] = useState<any[]>([]);
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function fetchDeals() {
      if (!isOpen || openDeals.length > 0) {
        setInternalDeals(openDeals);
        return;
      }
      try {
        const { data } = await supabase
          .from('Quote')
          .select('id, customerName, totalPrice, paidAmount, notes')
          .eq('customerId', customerId)
          .eq('status', 'purchased');
        
        if (data) {
          const list = data.map(q => {
             let meta: any = null; 
             try { if (q.notes?.trim().startsWith('{')) meta = JSON.parse(q.notes); } catch (e) {}
             const finalPrice = (meta && typeof meta.finalPriceRupees === 'number') ? meta.finalPriceRupees * 100 : q.totalPrice;
             return { id: q.id, title: `Deal ${q.id.substring(0,8).toUpperCase()}`, balance: finalPrice - (q.paidAmount || 0) };
          }).filter(d => d.balance > 0);
          setInternalDeals(list);
        }
      } catch (err) {}
    }
    
    if (isOpen) {
      fetchDeals();
      setSelectedQuoteId(preSelectedQuoteId || '');
      if (preSelectedQuoteId) {
        const deal = (openDeals.length > 0 ? openDeals : internalDeals).find(d => d.id === preSelectedQuoteId);
        if (deal) setAmount((deal.balance/100).toString());
      } else { setAmount(''); }
    }
  }, [isOpen, preSelectedQuoteId, customerId]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch('/api/v1/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId, orgId, quoteId: selectedQuoteId || null,
          amount: Math.round(parseFloat(amount) * 100),
          paymentMethod: method, notes
        })
      });

      if (!res.ok) throw new Error('Failed');
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
        if (onSuccess) onSuccess();
      }, 1800);
    } catch (err) {
      alert('Error recording payment.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      {/* Background Blur Overlay */}
      <div className="absolute inset-0 bg-[#050505]/60 backdrop-blur-2xl animate-in fade-in duration-500" onClick={onClose} />
      
      {/* Modal Shell */}
      <div className="relative w-full max-w-xl bg-[#0a0a0a]/80 border border-white/5 rounded-[40px] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.5)] backdrop-blur-3xl animate-in zoom-in-95 duration-300">
        
        {/* Subtle Ambient Glow inside Modal */}
        <div className="absolute -top-[20%] -right-[20%] w-[50%] h-[50%] bg-emerald-500/10 blur-[100px] rounded-full pointer-events-none" />

        {success ? (
          <div className="py-24 flex flex-col items-center justify-center text-center animate-in scale-in-95 duration-500">
            <div className="w-24 h-24 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mb-8 border border-emerald-500/20 shadow-[0_0_40px_rgba(16,185,129,0.2)]">
              <CheckCircle2 size={48} className="animate-in zoom-in-50 duration-500" />
            </div>
            <h3 className="text-4xl font-black text-white tracking-tighter italic uppercase">Payment Secured</h3>
            <p className="text-slate-500 text-[10px] font-black uppercase tracking-[0.3em] mt-3">Updating Statement & Ledgers</p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="p-10 relative z-10">
            <div className="flex justify-between items-start mb-10">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/10">
                    <Wallet size={16} className="text-emerald-500" />
                  </div>
                  <span className="text-[10px] font-black uppercase tracking-[0.4em] text-emerald-500/80">Transaction</span>
                </div>
                <h2 className="text-4xl font-black text-white tracking-tighter uppercase italic">Record Payment</h2>
                <p className="text-slate-500 text-[10px] font-black uppercase tracking-widest mt-2">{customerName} • Portfolio Item</p>
              </div>
              <button type="button" onClick={onClose} className="p-3 rounded-full bg-white/5 text-slate-500 hover:text-white transition-all hover:bg-white/10"><X size={24} /></button>
            </div>

            <div className="space-y-8">
              {/* Deal Linker */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 block">Destination Account / Deal</label>
                <div className="relative group">
                  <select 
                    value={selectedQuoteId}
                    onChange={(e) => setSelectedQuoteId(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-[20px] p-5 text-sm font-bold text-white focus:border-emerald-500/30 focus:outline-none transition-all appearance-none outline-none group-hover:border-white/10"
                  >
                    <option value="" className="bg-[#0a0a0a]">General Credit (Advance Payment)</option>
                    {internalDeals.map((deal) => (
                      <option key={deal.id} value={deal.id} className="bg-[#0a0a0a]">
                        {deal.title} (Bal: ₹{(deal.balance/100).toLocaleString('en-IN')})
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none group-hover:text-white transition-colors" size={20} />
                </div>
                {selectedQuoteId && (
                  <div className="mt-4 flex items-center gap-2 text-emerald-500 bg-emerald-500/5 px-4 py-2.5 rounded-xl border border-emerald-500/10 animate-in slide-in-from-top-2">
                    <Info size={14} />
                    <span className="text-[10px] font-black uppercase tracking-widest leading-none">Linking to targeted deal balance</span>
                  </div>
                )}
              </div>

              {/* Huge Amount Input */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 block">Collection Amount</label>
                <div className="relative group">
                  <span className="absolute left-6 top-1/2 -translate-y-1/2 text-4xl font-black text-slate-700 pointer-events-none group-focus-within:text-emerald-500 transition-colors">₹</span>
                  <input 
                    type="number" step="0.01" required placeholder="0.00" value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full bg-white/5 border border-white/5 rounded-[24px] py-8 pl-14 pr-6 text-5xl font-black text-white italic tracking-tighter placeholder:text-slate-800 focus:border-emerald-500/40 focus:outline-none transition-all focus:bg-emerald-500/[0.02] shadow-[inset_0_0_40px_rgba(0,0,0,0.2)]"
                  />
                </div>
              </div>

              {/* Payment Methods */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 block">Method of Receipt</label>
                <div className="grid grid-cols-2 gap-3">
                  {['CASH', 'UPI', 'BANK_TRANSFER', 'CHECK'].map((m) => (
                    <button
                      key={m} type="button" onClick={() => setMethod(m as any)}
                      className={`relative py-5 px-3 rounded-[20px] text-[10px] font-black tracking-widest transition-all border duration-300 ${
                        method === m 
                        ? 'bg-white text-black border-white shadow-[0_10px_30px_rgba(255,255,255,0.1)] scale-105 z-10' 
                        : 'bg-white/5 text-slate-500 border-white/5 hover:border-white/10 hover:bg-white/[0.08]'
                      }`}
                    >
                      {m.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>

              {/* Notes */}
              <div>
                <label className="text-[10px] font-black uppercase text-slate-600 tracking-[0.2em] mb-4 block">Transaction Meta</label>
                <textarea 
                  placeholder="Receipt nubmer, check reference, or specific notes..."
                  value={notes} onChange={(e) => setNotes(e.target.value)}
                  className="w-full bg-white/5 border border-white/5 rounded-[20px] p-5 text-sm font-medium text-white placeholder:text-slate-800 focus:border-emerald-500/30 focus:outline-none transition-all h-28 resize-none group-hover:border-white/10"
                />
              </div>
            </div>

            <button
              disabled={loading}
              className="w-full mt-12 bg-emerald-500 text-black font-black py-6 rounded-[24px] text-xs uppercase tracking-[0.2em] hover:bg-emerald-400 transition-all active:scale-95 flex items-center justify-center gap-3 relative overflow-hidden group shadow-[0_20px_40px_rgba(16,185,129,0.2)]"
            >
              {loading ? (
                <Loader2 className="animate-spin" size={20} />
              ) : (
                <>
                  <CheckCircle2 size={18} />
                  Complete Collection
                </>
              )}
              {/* Interactive glow effect on button hover */}
              <div className="absolute inset-0 bg-white/20 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700 skew-x-12" />
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
