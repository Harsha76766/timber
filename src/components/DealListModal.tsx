"use client";

import { useState, useEffect } from 'react';
import { X, Receipt, Wallet, Calendar, ArrowRight, CheckCircle2, AlertCircle } from 'lucide-react';
import { createClient } from '@/utils/supabase/client';

interface DealListModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  onPayDeal: (quoteId: string) => void;
}

interface Deal {
  id: string;
  totalPrice: number;
  paidAmount: number;
  createdAt: string;
  status: string;
  notes?: string;
}

export default function DealListModal({ isOpen, onClose, customerId, customerName, onPayDeal }: DealListModalProps) {
  const [deals, setDeals] = useState<Deal[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    if (!isOpen) return;

    async function fetchDeals() {
      console.log('Fetching deals for:', customerId);
      setLoading(true);
      try {
        const res = await fetch(`/api/v1/customers/${customerId}/deals`);
        if (!res.ok) throw new Error('Failed to fetch');
        const data = await res.json();
        setDeals(data);
      } catch (err) {
        console.error('Failed to fetch deals:', err);
      } finally {
        setLoading(false);
      }
    }

    fetchDeals();
  }, [isOpen, customerId]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/90 backdrop-blur-xl" onClick={onClose} />
      
      <div className="relative w-full max-w-2xl bg-[#0A0A0B] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-8 border-b border-white/5 flex justify-between items-center bg-[#141417]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Receipt size={14} className="text-blue-400" />
              <span className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-400/80">Purchase Book</span>
            </div>
            <h2 className="text-2xl font-black text-white tracking-tighter uppercase">{customerName}'s Deals</h2>
          </div>
          <button 
            onClick={onClose}
            className="p-3 rounded-2xl bg-white/5 text-slate-500 hover:text-white transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-3 custom-scrollbar">
          {loading ? (
            <div className="py-20 flex justify-center">
              <div className="w-8 h-8 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
            </div>
          ) : deals.length === 0 ? (
            <div className="py-20 text-center">
              <p className="text-slate-500 font-bold uppercase tracking-widest text-xs italic">No purchase records found</p>
            </div>
          ) : (
            deals.map((deal) => {
              let m: any = null;
              try { if (deal.notes && deal.notes.trim().startsWith('{')) m = JSON.parse(deal.notes); } catch {}
              
              const price = (m && m.finalPriceRupees) ? m.finalPriceRupees * 100 : deal.totalPrice;
              const balance = price - (deal.paidAmount || 0);
              const isFullyPaid = balance <= 0 && deal.status === 'purchased';
              const isDraft = deal.status !== 'purchased';

              return (
                <div 
                  key={deal.id} 
                  className={`p-5 rounded-[2rem] border transition-all flex items-center justify-between group ${
                    isDraft ? 'bg-rose-500/5 border-rose-500/10' :
                    isFullyPaid ? 'bg-white/[0.02] border-white/5 opacity-60' : 'bg-[#141417] border-white/10 hover:border-blue-500/30'
                  }`}
                >
                  <div className="flex items-center gap-5">
                    <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                      isDraft ? 'bg-rose-500/10 text-rose-500' :
                      isFullyPaid ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'
                    }`}>
                      {isDraft ? <AlertCircle size={24} /> : isFullyPaid ? <CheckCircle2 size={24} /> : <Receipt size={24} />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-black text-white uppercase tracking-tight">Deal {deal.id.substring(0,8)}</p>
                        {isFullyPaid && <span className="text-[8px] font-black bg-emerald-500 text-black px-1.5 py-0.5 rounded uppercase">Cleared</span>}
                        {isDraft && <span className="text-[8px] font-black bg-rose-500 text-white px-1.5 py-0.5 rounded uppercase">{deal.status}</span>}
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-slate-500">
                        <div className="flex items-center gap-1">
                          <Calendar size={10} />
                          <span className="text-[9px] font-bold uppercase">{new Date(deal.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <p className="text-xs text-slate-500 font-bold uppercase tracking-widest mb-0.5">Bill Amount</p>
                      <p className="text-lg font-black text-white">₹{Math.round(price/100).toLocaleString('en-IN')}</p>
                    </div>

                    {!isFullyPaid ? (
                      <div className="flex items-center gap-4 border-l border-white/10 pl-6">
                        <div className="text-right">
                          <p className="text-xs text-rose-400 font-bold uppercase tracking-widest mb-0.5">Due</p>
                          <p className="text-lg font-black text-rose-400">₹{Math.round(balance/100).toLocaleString('en-IN')}</p>
                        </div>
                        <button 
                          onClick={() => onPayDeal(deal.id)}
                          className="bg-blue-500 text-white w-10 h-10 flex items-center justify-center rounded-xl hover:scale-110 active:scale-95 transition-all shadow-lg shadow-blue-500/20"
                        >
                          <Wallet size={18} />
                        </button>
                      </div>
                    ) : (
                      <div className="border-l border-white/10 pl-6 text-emerald-500 opacity-50">
                        <CheckCircle2 size={24} />
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-6 bg-white/[0.02] border-t border-white/5 flex justify-center">
            <p className="text-[9px] text-slate-600 font-bold uppercase tracking-[0.3em]">Purchase Summary Index</p>
        </div>
      </div>
    </div>
  );
}
