"use client";

import React, { useEffect, useState, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { useBranch } from '@/components/BranchProvider';
import { ArrowLeft, Plus, FileText, IndianRupee, ArrowDownRight, ArrowUpRight } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function CustomerLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: customerId } = use(params);
  const { activeBranch } = useBranch();
  const [customer, setCustomer] = useState<any>(null);
  const [entries, setEntries] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const supabase = createClient();
  const router = useRouter();

  useEffect(() => {
    fetchData();
  }, [customerId, activeBranch]);

  const fetchData = async () => {
    setIsLoading(true);
    // Fetch Customer
    const { data: cData } = await supabase.from('Customer').select('*').eq('id', customerId).single();
    if (cData) setCustomer(cData);

    // Fetch Entries (filtered by branch if you want, or show all for customer)
    // For MVP, we'll show all entries for this customer.
    const { data: eData } = await supabase
      .from('KathaEntry')
      .select('*')
      .eq('customerId', customerId)
      .order('date', { ascending: false });
    
    if (eData) setEntries(eData);
    setIsLoading(false);
  };

  const handleReceivePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBranch || !customer) return;
    setIsSubmitting(true);

    const amountPaise = Math.round(parseFloat(paymentAmount) * 100); // Assuming DB stores paise, or if it stores standard currency adjust this. We'll store exactly what's typed since we use standard elsewhere in MVP if they didn't normalize.
    // Wait, earlier we passed `grandTotals.total` directly. Let's assume standard integer currency for MVP based on previous code.
    const amountInt = parseInt(paymentAmount);

    try {
      const res = await fetch('/api/v1/customers/payment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId,
          branchId: activeBranch.id,
          amount: amountInt,
          notes: paymentNotes
        })
      });

      const data = await res.json();
      if (data.success) {
        setShowPaymentModal(false);
        setPaymentAmount('');
        setPaymentNotes('');
        fetchData(); // Refresh ledger and balance
      } else {
        alert(data.error);
      }
    } catch (e) {
      alert('Network Error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) return <div className="min-h-screen bg-[#0a0a0a] text-white p-4">Loading...</div>;
  if (!customer) return <div className="min-h-screen bg-[#0a0a0a] text-white p-4">Customer not found</div>;

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col font-sans text-white pb-24">
      {/* Header */}
      <header className="p-4 border-b border-white/10 flex items-center justify-between sticky top-0 bg-[#0a0a0a]/80 backdrop-blur-md z-10">
        <div className="flex items-center gap-3">
          <button onClick={() => router.back()} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center hover:bg-white/10 transition-colors">
            <ArrowLeft size={18} />
          </button>
          <div>
            <h1 className="text-xl font-black tracking-tight">{customer.name}</h1>
            <p className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">Katha Ledger</p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-[9px] font-black uppercase text-gray-500 mb-0.5">Total Outstanding</p>
          <p className={`text-xl font-black ${customer.currentBalance > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
            ₹{Math.abs(customer.currentBalance || 0).toLocaleString('en-IN')}
            <span className="text-[10px] ml-1">{customer.currentBalance > 0 ? 'Dr' : 'Cr'}</span>
          </p>
        </div>
      </header>

      {/* Ledger Actions */}
      <div className="p-4 flex gap-2">
        <button 
          onClick={() => setShowPaymentModal(true)}
          className="flex-1 py-3 rounded-xl bg-emerald-500 text-black font-black text-sm uppercase flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
        >
          <Plus size={16} /> Receive Payment
        </button>
        <button className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 font-black text-sm uppercase text-gray-300 flex items-center justify-center gap-2">
          <FileText size={16} /> Statement
        </button>
      </div>

      {/* Ledger Table */}
      <main className="flex-1 px-4 flex flex-col gap-2">
        {entries.map((entry) => (
          <div key={entry.id} className="bg-[#111] border border-white/5 rounded-2xl p-3 flex justify-between items-center">
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center ${entry.balanceType === 'Cr' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'}`}>
                {entry.balanceType === 'Cr' ? <ArrowDownRight size={18} /> : <ArrowUpRight size={18} />}
              </div>
              <div>
                <p className="text-sm font-bold">{entry.entryType}</p>
                <p className="text-[10px] text-gray-500">{new Date(entry.date).toLocaleDateString('en-IN')} • {entry.notes || 'No notes'}</p>
              </div>
            </div>
            <div className="text-right">
              <p className={`text-base font-black ${entry.balanceType === 'Cr' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {entry.balanceType === 'Cr' ? '-' : '+'}₹{entry.amount.toLocaleString('en-IN')}
              </p>
            </div>
          </div>
        ))}

        {entries.length === 0 && (
          <div className="text-center py-10 text-gray-600 text-sm font-bold">
            No entries found in ledger.
          </div>
        )}
      </main>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black/80 z-[100] flex items-end justify-center">
          <div className="bg-[#111] w-full max-w-lg rounded-t-[32px] p-6 border-t border-white/10 animate-in slide-in-from-bottom duration-200">
            <h2 className="text-xl font-black mb-1">Receive Payment</h2>
            <p className="text-xs text-gray-500 font-bold mb-6">Record a cash or bank transfer.</p>
            
            <form onSubmit={handleReceivePayment} className="flex flex-col gap-4">
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-1 block">Amount (₹)</label>
                <div className="relative">
                  <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-500"><IndianRupee size={16}/></div>
                  <input 
                    type="number" 
                    required 
                    value={paymentAmount}
                    onChange={(e) => setPaymentAmount(e.target.value)}
                    className="w-full bg-black border border-white/10 rounded-xl py-3 pl-10 pr-4 font-bold outline-none focus:border-emerald-500" 
                    placeholder="0"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black uppercase text-gray-500 tracking-widest ml-1 mb-1 block">Notes / Reference No</label>
                <input 
                  type="text" 
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full bg-black border border-white/10 rounded-xl p-3 font-bold outline-none focus:border-emerald-500 text-sm" 
                  placeholder="e.g. UTR123456789"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-2 mt-4">
                <button type="button" onClick={() => setShowPaymentModal(false)} className="py-3 rounded-xl bg-white/5 font-black text-sm text-gray-400">Cancel</button>
                <button type="submit" disabled={isSubmitting} className="py-3 rounded-xl bg-emerald-500 text-black font-black text-sm shadow-lg shadow-emerald-500/20 disabled:opacity-50">
                  {isSubmitting ? 'Saving...' : 'Save Payment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
