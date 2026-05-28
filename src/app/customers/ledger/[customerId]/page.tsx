"use client";

import { useState, useEffect, use } from 'react';
import { createClient } from '@/utils/supabase/client';
import { ArrowLeft, Wallet, Receipt, Calendar, FileText, MessageCircle, ArrowDownLeft, Loader2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import PaymentModal from '@/components/PaymentModal';

export default function CustomerLedgerPage({ params }: { params: Promise<{ customerId: string }> }) {
  const unwrappedParams = use(params);
  const customerId = unwrappedParams.customerId;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [timeline, setTimeline] = useState<any[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preSelectedDeal, setPreSelectedDeal] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<'DEALS' | 'TRANSACTIONS'>('DEALS');
  const [expandedDeal, setExpandedDeal] = useState<string | null>(null);
  const supabase = createClient();
  
  const shareOnWhatsApp = (item: any) => {
    if (!customer?.phone) {
      alert("No phone number found for this customer.");
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const amountStr = `₹${Math.round(item.amount / 100).toLocaleString('en-IN')}`;
    const dateStr = new Date(item.date).toLocaleDateString('en-IN');
    const message = `Hello *${customer.name}*,\n\nWe have received your payment of *${amountStr}* via *${item.title.replace('Payment via ', '')}* on ${dateStr}.\n\nYou can view and download your receipt here:\n${window.location.origin}/api/v1/payments/${item.id}/pdf\n\nThank you,\n*TimberFlow*`;
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  const shareDealStatement = (item: any) => {
    if (!customer?.phone) {
      alert("No phone number found for this customer.");
      return;
    }
    const cleanPhone = customer.phone.replace(/\D/g, '');
    const amountStr = `₹${Math.round(item.amount / 100).toLocaleString('en-IN')}`;
    const paidStr = `₹${Math.round((item.paid || 0) / 100).toLocaleString('en-IN')}`;
    const balStr = `₹${Math.round((item.amount - (item.paid || 0)) / 100).toLocaleString('en-IN')}`;
    const message = `Hello *${customer.name}*,\n\nHere is the *Full Statement* for your purchase dated ${new Date(item.date).toLocaleDateString('en-IN')}.\n\n*Total Deal Value:* ${amountStr}\n*Total Amount Paid:* ${paidStr}\n*Balance Remaining:* ${balStr}\n\nDownload itemized statement & payment ledger here:\n${window.location.origin}/api/v1/quotes/${item.id}/statement/pdf\n\nThank you,\n*TimberFlow*`;
    const waUrl = `https://wa.me/91${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(waUrl, '_blank');
  };

  async function fetchData() {
    setLoading(true);
    setError(null);
    try {
      const { data: cust, error: custErr } = await supabase.from('Customer').select('*').eq('id', customerId).single();
      if (custErr || !cust) throw new Error('Customer not found');
      setCustomer(cust);

      const res = await fetch(`/api/v1/customers/${customerId}/ledger`);
      if (!res.ok) throw new Error('Failed to fetch ledger');
      const data = await res.json();
      
      const items = [
        ...(data.invoices || []).map((inv: any) => ({
          id: inv.id, date: inv.invoiceDate || inv.createdAt, type: 'INVOICE',
          amount: inv.grandTotal, paid: inv.paidAmount || 0, title: `Invoice #${inv.invoiceNumber}`,
          status: inv.status, icon: Receipt
        })),
        ...(data.quotes || []).map((q: any) => ({
          id: q.id, date: q.createdAt, type: 'PURCHASE',
          amount: q.totalPrice, paid: q.paidAmount || 0, title: `Deal #${q.id.substring(0,8).toUpperCase()}`,
          status: 'PURCHASED', icon: Receipt
        })),
        ...(data.payments || []).map((pay: any) => ({
          id: pay.id, date: pay.transactionDate || pay.createdAt, type: 'PAYMENT',
          quoteId: pay.quoteId, invoiceId: pay.invoiceId, amount: pay.amount,
          title: `Payment via ${pay.paymentMethod}`, status: 'RECEIVED', icon: Wallet
        }))
      ];

      items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
      setTimeline(items);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchData(); }, [customerId]);

  if (loading) return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center">
      <Loader2 className="w-10 h-10 text-emerald-500 animate-spin opacity-50" />
    </div>
  );

  if (error || !customer) return (
    <div className="min-h-screen bg-[#050505] text-white flex flex-col items-center justify-center p-8">
      <AlertCircle size={48} className="text-rose-500 mb-4 opacity-50" />
      <p className="text-slate-400 mb-6">{error || 'Customer not found'}</p>
      <Link href="/customers" className="bg-white text-black px-8 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest">Go Back</Link>
    </div>
  );

  const totalBilled = Math.round((customer.lifetimeValue || 0) / 100);
  const totalOutstanding = Math.round((customer.outstandingBalance || 0) / 100);
  const totalPaid = totalBilled - totalOutstanding;

  return (
    <div className="min-h-screen bg-[#050505] text-slate-200 font-sans selection:bg-emerald-500/30">
      {/* Background Ambient Glows */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] bg-emerald-500/10 blur-[120px] rounded-full" />
        <div className="absolute top-[20%] -right-[10%] w-[30%] h-[50%] bg-blue-500/5 blur-[120px] rounded-full" />
      </div>

      <div className="max-w-5xl mx-auto px-6 py-12 relative z-10">
        {/* Header Section */}
        <div className="flex items-center justify-between mb-12">
          <Link href="/customers" className="group flex items-center gap-2 text-slate-500 hover:text-white transition-all text-xs font-bold uppercase tracking-widest">
            <div className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-all"><ArrowLeft size={14} /></div>
            Back to Directory
          </Link>
          <button onClick={() => setIsModalOpen(true)} className="bg-emerald-500 hover:bg-emerald-400 text-black px-8 py-3 rounded-full font-black text-xs uppercase tracking-widest transition-all shadow-[0_0_20px_rgba(16,185,129,0.3)] active:scale-95">Record Payment</button>
        </div>

        {/* Profile Command Center */}
        <div className="relative mb-12 group">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-emerald-500/20 to-blue-500/20 rounded-[32px] blur opacity-75 group-hover:opacity-100 transition duration-1000 group-hover:duration-200"></div>
          <div className="relative bg-[#0a0a0a] border border-white/5 rounded-[32px] p-8 md:p-12 backdrop-blur-xl">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8">
              <div>
                <p className="text-[10px] font-black uppercase tracking-[0.3em] text-emerald-500 mb-2">Statement of Account</p>
                <h1 className="text-5xl md:text-7xl font-black text-white tracking-tighter mb-4 italic">{customer.name}</h1>
                <div className="flex items-center gap-4 text-slate-400 text-sm font-medium">
                  <span className="bg-white/5 px-3 py-1 rounded-full border border-white/5">Retail Customer</span>
                  <span className="opacity-40">•</span>
                  <span>+91 {customer.phone}</span>
                </div>
              </div>

              <div className="flex flex-col items-end">
                <p className="text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1">Total Outstanding</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl md:text-6xl font-black text-white tracking-tighter">₹{totalOutstanding.toLocaleString('en-IN')}</span>
                </div>
                {totalOutstanding > 0 ? (
                  <span className="text-[10px] font-bold text-rose-500 bg-rose-500/10 px-3 py-1 rounded-full mt-2 uppercase tracking-widest">Balance Due</span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-3 py-1 rounded-full mt-2 uppercase tracking-widest">Account Settled</span>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-12 pt-12 border-t border-white/5">
                <div>
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Billed</p>
                  <p className="text-2xl font-black text-white">₹{totalBilled.toLocaleString('en-IN')}</p>
                </div>
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Received</p>
                  <p className="text-2xl font-black text-emerald-400">₹{totalPaid.toLocaleString('en-IN')}</p>
                </div>
            </div>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-full w-fit mb-12 border border-white/5 backdrop-blur-md">
          <button onClick={() => setActiveTab('DEALS')} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'DEALS' ? 'bg-white text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}>Orders & Deals</button>
          <button onClick={() => setActiveTab('TRANSACTIONS')} className={`px-8 py-2.5 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'TRANSACTIONS' ? 'bg-white text-black shadow-xl scale-105' : 'text-slate-500 hover:text-white'}`}>Full Ledger</button>
        </div>

        {/* Content Container */}
        <div className="space-y-6">
          {activeTab === 'DEALS' ? (
            timeline.filter(t => t.type !== 'PAYMENT').map((entry) => (
              <div key={entry.id} className="relative group">
                <div className={`relative bg-[#0a0a0a]/40 border rounded-3xl transition-all duration-300 ${expandedDeal === entry.id ? 'border-white/20 bg-[#0a0a0a]/80' : 'border-white/5 hover:border-white/10'}`}>
                  <div className="p-6 md:p-8 cursor-pointer flex items-center justify-between gap-6" onClick={() => setExpandedDeal(expandedDeal === entry.id ? null : entry.id)}>
                    <div className="flex items-center gap-6">
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all bg-blue-500/10 text-blue-500"><FileText size={24} /></div>
                      <div>
                        <div className="flex items-center gap-3">
                          <h3 className="text-xl font-black text-white italic tracking-tight">{entry.title}</h3>
                          <span className="text-[9px] font-black px-2 py-0.5 bg-white/5 rounded-md border border-white/5 text-slate-500">{new Date(entry.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</span>
                        </div>
                        <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 mt-1">
                          {entry.status} • Bal: <span className={Number(entry.amount - (entry.paid || 0)) > 0 ? 'text-rose-500' : 'text-emerald-500'}>₹{Math.round((entry.amount - (entry.paid || 0))/100).toLocaleString('en-IN')}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-8 text-right">
                       <div>
                          <p className="text-2xl font-black tracking-tighter text-white">₹{Math.round(entry.amount / 100).toLocaleString('en-IN')}</p>
                          <p className="text-[9px] font-black uppercase text-slate-500 tracking-[0.2em]">Invoice Value</p>
                       </div>
                       <button onClick={(e) => { e.stopPropagation(); shareDealStatement(entry); }} className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center text-slate-400 hover:bg-emerald-500 hover:text-black transition-all border border-white/5"><MessageCircle size={18} /></button>
                    </div>
                  </div>
                  {expandedDeal === entry.id && (
                    <div className="px-8 pb-8 pt-4 border-t border-white/5 animate-in slide-in-from-top-2 duration-300">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="space-y-4">
                           <p className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 mb-4">Payment Timeline</p>
                           <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-[1px] before:bg-white/10">
                              {timeline.filter(p => p.type === 'PAYMENT' && (p.quoteId === entry.id || p.invoiceId === entry.id)).map((p) => (
                                <div key={p.id} className="relative group/pay">
                                  <div className="absolute -left-[21px] top-1.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-black" />
                                  <div className="flex items-center justify-between">
                                    <div><p className="text-sm font-bold text-white tracking-tight">{p.title}</p><p className="text-[9px] font-black text-slate-500 uppercase tracking-widest">{new Date(p.date).toLocaleDateString('en-IN')}</p></div>
                                    <p className="text-lg font-black text-emerald-400 tracking-tighter">₹{Math.round(p.amount/100).toLocaleString('en-IN')}</p>
                                  </div>
                                </div>
                              ))}
                              {entry.paid === 0 && <p className="text-slate-500 text-[10px] font-bold italic py-4">No payments recorded yet.</p>}
                           </div>
                        </div>
                        <div className="bg-white/5 rounded-2xl p-6 border border-white/5">
                           <div className="flex justify-between items-end mb-6">
                              <div><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Remaining Balance</p><p className="text-3xl font-black text-rose-500 tracking-tighter">₹{Math.round((entry.amount - (entry.paid || 0))/100).toLocaleString('en-IN')}</p></div>
                              <div className="text-right"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Total Paid</p><p className="text-xl font-black text-emerald-400 tracking-tighter">₹{Math.round((entry.paid || 0)/100).toLocaleString('en-IN')}</p></div>
                           </div>
                           <div className="grid grid-cols-2 gap-3">
                              <button onClick={() => { setPreSelectedDeal(entry.id); setIsModalOpen(true); }} className="bg-emerald-500 text-black py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-95">Add Payment</button>
                              <a href={`/api/v1/quotes/${entry.id}/statement/pdf`} target="_blank" rel="noopener noreferrer" className="bg-white text-black py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-200 transition-all text-center">View Receipt</a>
                           </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))
          ) : (
            <div className="bg-[#0a0a0a] border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-xl">
              <table className="w-full text-left text-sm border-collapse">
                <thead className="bg-white/5 text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                  <tr><th className="px-8 py-6">Date</th><th className="px-4 py-6">Reference</th><th className="px-4 py-6">Description</th><th className="px-4 py-6 text-right">Debit</th><th className="px-4 py-6 text-right">Credit</th></tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-slate-400">
                  {timeline.map((le, idx) => (
                    <tr key={idx} className="hover:bg-white/5 transition-all group">
                      <td className="px-8 py-4 font-bold">{new Date(le.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' })}</td>
                      <td className="px-4 py-4 text-[10px] font-black text-indigo-400 uppercase tracking-widest">{le.id.substring(0,8)}</td>
                      <td className="px-4 py-4 font-medium text-slate-300">{le.title}</td>
                      <td className="px-4 py-4 text-right">{le.type !== 'PAYMENT' ? <span className="text-white font-black">₹{Math.round(le.amount/100).toLocaleString('en-IN')}</span> : '-'}</td>
                      <td className="px-4 py-4 text-right">{le.type === 'PAYMENT' ? <span className="text-emerald-400 font-black">₹{Math.round(le.amount/100).toLocaleString('en-IN')}</span> : '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      <PaymentModal 
        isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setPreSelectedDeal(undefined); }} 
        customerId={customerId} customerName={customer.name} orgId={customer.orgId || ''} 
        preSelectedQuoteId={preSelectedDeal} onSuccess={() => { fetchData(); setIsModalOpen(false); }}
        openDeals={timeline.filter(t => t.type !== 'PAYMENT' && (t.amount - (t.paid || 0)) > 0).map(t => ({ id: t.id, title: t.title, balance: t.amount - (t.paid || 0) }))}
      />
    </div>
  );
}
