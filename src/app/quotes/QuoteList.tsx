"use client";

import { useState } from 'react';
import { FileText, ChevronDown, Clock, CheckCircle2, Phone, Receipt, Loader2, ArrowRight, ShoppingCart, User, X, Wallet } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type QuoteItem = {
  id: string;
  woodType: string;
  length: number;
  width: number;
  thickness: number;
  quantity: number;
  volume: number;
  price: number;
};

type QuoteData = {
  id: string;
  customerName: string;
  totalPrice: number;
  status: string;
  notes: string | null;
  createdAt: string;
  items?: QuoteItem[];
  customer?: { outstandingBalance: number };
};

// --- Date Grouping Helper ---
function getDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterday = new Date(today); yesterday.setDate(today.getDate() - 1);
  const itemDate = new Date(d.getFullYear(), d.getMonth(), d.getDate());

  if (itemDate.getTime() === today.getTime()) return 'Today';
  if (itemDate.getTime() === yesterday.getTime()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function groupByDate(quotes: QuoteData[]): { label: string; items: QuoteData[] }[] {
  const map = new Map<string, QuoteData[]>();
  quotes.forEach(q => {
    const label = getDateLabel(q.createdAt);
    const arr = map.get(label) || [];
    arr.push(q);
    map.set(label, arr);
  });
  return Array.from(map.entries()).map(([label, items]) => ({ label, items }));
}

export default function QuoteList({ initialQuotes }: { initialQuotes: QuoteData[] }) {
  const [activeTab, setActiveTab] = useState<'ESTIMATE' | 'PURCHASED'>('ESTIMATE');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [convertingId, setConvertingId] = useState<string | null>(null);
  const [invoicingId, setInvoicingId] = useState<string | null>(null);
  const [quotes, setQuotes] = useState(initialQuotes);
  const router = useRouter();

  // Purchase Confirmation Modal State
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);
  const [purchaseQuoteId, setPurchaseQuoteId] = useState<string | null>(null);
  const [purchaseName, setPurchaseName] = useState('');
  const [purchasePhone, setPurchasePhone] = useState('');
  const [purchaseFinalPrice, setPurchaseFinalPrice] = useState('');
  const [purchaseAdvance, setPurchaseAdvance] = useState('');
  const [purchaseEstPrice, setPurchaseEstPrice] = useState(0);
  const [purchasePriorBalance, setPurchasePriorBalance] = useState(0);

  const filtered = quotes.filter(q => {
    const s = q.status?.toLowerCase() || '';
    if (activeTab === 'ESTIMATE') return s === 'estimate' || s === 'draft' || s === 'pending' || !s;
    return s === 'purchased' || s === 'accepted' || s === 'confirmed' || s === 'closed' || s === 'converted';
  });

  const dateGroups = groupByDate(filtered);

  const toggleExpand = (id: string) => {
    setExpandedId(prev => prev === id ? null : id);
  };

  // Open Purchase Confirmation Modal
  const openPurchaseModal = (quote: QuoteData) => {
    const metadata = (() => { try { return JSON.parse(quote.notes || '{}'); } catch { return {}; } })();
    setPurchaseQuoteId(quote.id);
    setPurchaseName(quote.customerName || '');
    setPurchasePhone(metadata.customerPhone || '');
    setPurchaseEstPrice(Math.round(quote.totalPrice / 100));
    setPurchaseFinalPrice(String(Math.round(quote.totalPrice / 100)));
    setPurchasePriorBalance(quote.customer?.outstandingBalance ? Math.round(quote.customer.outstandingBalance / 100) : 0);
    setPurchaseAdvance('');
    setShowPurchaseModal(true);
  };

  // Confirm Purchase with details
  const handleConfirmPurchase = async () => {
    if (!purchaseQuoteId || convertingId) return;
    setConvertingId(purchaseQuoteId);

    try {
      // Build updated notes with final price and advance
      const existingQuote = quotes.find(q => q.id === purchaseQuoteId);
      const existingMeta = (() => { try { return JSON.parse(existingQuote?.notes || '{}'); } catch { return {}; } })();
      
      const updatedNotes = JSON.stringify({
        ...existingMeta,
        customerPhone: purchasePhone,
        finalPriceRupees: parseFloat(purchaseFinalPrice) || 0,
        advanceRupees: parseFloat(purchaseAdvance) || 0,
        purchaseConfirmedAt: new Date().toISOString()
      });

      const res = await fetch(`/api/v1/quotes/${purchaseQuoteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          status: 'purchased',
          customerName: purchaseName,
          notes: updatedNotes
        })
      });
      const json = await res.json();

      if (!res.ok) {
        alert(`Error: ${json.error}`);
        return;
      }

      // Update locally
      setQuotes(prev => prev.map(q => q.id === purchaseQuoteId 
        ? { ...q, status: 'purchased', customerName: purchaseName || q.customerName, notes: updatedNotes } 
        : q
      ));
      setShowPurchaseModal(false);
      setExpandedId(null);
      setActiveTab('PURCHASED');
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setConvertingId(null);
    }
  };

  // Generate GST Invoice
  const handleGenerateInvoice = async (quoteId: string) => {
    if (invoicingId) return;
    setInvoicingId(quoteId);
    try {
      const res = await fetch(`/api/v1/quotes/${quoteId}/invoice`, { method: 'POST' });
      const json = await res.json();
      if (!res.ok) { alert(`Error: ${json.error}`); return; }
      setQuotes(prev => prev.map(q => q.id === quoteId ? { ...q, status: 'converted' } : q));
      if (json.data?.id) router.push(`/invoices/${json.data.id}`);
      else router.push('/invoices');
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setInvoicingId(null);
    }
  };

  // Navigate to the original calculator to edit
  const handleEdit = (quoteId: string) => {
    router.push(`/?edit=${quoteId}`);
  };

  return (
    <div className="app-page font-sans">
      {/* Header */}
      <div className="sticky top-0 z-10 border-b border-white/10 bg-[#08090b]/90 p-5 pt-8 backdrop-blur-md">
        <p className="eyebrow mb-2">Sales pipeline</p>
        <h1 className="text-3xl font-black tracking-tight text-white">Orders</h1>
        <p className="mt-1 text-sm text-slate-500">Turn estimates into purchases, then invoices.</p>
        
        {/* Tabs */}
        <div className="mt-5 flex rounded-lg border border-white/10 bg-white/[0.04] p-1">
          <button 
            onClick={() => { setActiveTab('ESTIMATE'); setExpandedId(null); }}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-bold ${
              activeTab === 'ESTIMATE' 
                ? 'bg-amber-400 text-black shadow-lg' 
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <Clock size={16} />
            Estimates
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${activeTab === 'ESTIMATE' ? 'bg-amber-500/20 text-amber-400' : 'bg-gray-800 text-gray-600'}`}>
              {quotes.filter(q => { const s = q.status?.toLowerCase() || ''; return s === 'estimate' || s === 'draft' || s === 'pending' || !s; }).length}
            </span>
          </button>
          <button 
            onClick={() => { setActiveTab('PURCHASED'); setExpandedId(null); }}
            className={`flex-1 py-3 rounded-xl flex items-center justify-center gap-2 transition-all text-sm font-bold ${
              activeTab === 'PURCHASED' 
                ? 'bg-emerald-400 text-black shadow-lg' 
                : 'text-gray-500 hover:text-gray-400'
            }`}
          >
            <CheckCircle2 size={16} />
            Purchases
            <span className={`text-[10px] px-2 py-0.5 rounded-md font-black ${activeTab === 'PURCHASED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-800 text-gray-600'}`}>
              {quotes.filter(q => { const s = q.status?.toLowerCase() || ''; return s === 'purchased' || s === 'accepted' || s === 'confirmed' || s === 'closed' || s === 'converted'; }).length}
            </span>
          </button>
        </div>
      </div>
      
      {/* List grouped by date */}
      <div className="p-4 space-y-6">
        {dateGroups.length === 0 ? (
          <div className="text-center py-20 bg-[#111111] rounded-[32px] border border-gray-800 border-dashed">
            <div className="w-20 h-20 bg-[#161616] rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-800 shadow-inner">
               {activeTab === 'ESTIMATE' ? <Clock className="text-gray-700" size={32} /> : <Receipt className="text-gray-700" size={32} />}
            </div>
            <p className="text-gray-400 font-bold uppercase text-xs tracking-[0.2em] mb-2">Archive is Empty</p>
            <p className="text-gray-600 text-[10px] uppercase font-bold tracking-widest max-w-[200px] mx-auto">
              No records found for {activeTab === 'ESTIMATE' ? 'estimates' : 'purchases'}
            </p>
          </div>
        ) : (
          dateGroups.map(group => (
            <div key={group.label}>
              {/* Date Header */}
              <div className="flex items-center gap-3 mb-3 px-1">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-[0.2em]">{group.label}</span>
                <div className="flex-1 h-px bg-gray-800/60" />
                <span className="text-[10px] font-black text-gray-700">{group.items.length}</span>
              </div>

              {/* Cards */}
              <div className="space-y-3">
                {group.items.map(quote => {
                  const status = quote.status?.toLowerCase() || '';
                  const isPurchased = ['purchased', 'accepted', 'confirmed', 'closed'].includes(status);
                  const isConverted = status === 'converted';
                  const isEstimate = !isPurchased && !isConverted;
                  const isExpanded = expandedId === quote.id;
                  const metadata = (() => { try { return JSON.parse(quote.notes || '{}'); } catch { return {}; } })();
                  const timeStr = new Date(quote.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
                  const items = quote.items || [];
                  
                  return (
                    <div 
                      key={quote.id} 
                      className={`surface overflow-hidden transition-all relative ${
                        isExpanded 
                          ? (isEstimate ? 'border-amber-500/30' : isConverted ? 'border-blue-500/30' : 'border-emerald-500/30')
                          : 'border-gray-800/60'
                      }`}
                    >
                      {/* Card Header */}
                      <button 
                        onClick={() => toggleExpand(quote.id)}
                        className="w-full p-4 flex items-center gap-4 text-left active:bg-white/[0.02] transition-colors"
                      >
                        <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border ${
                          isConverted ? 'bg-blue-500/10 border-blue-500/20' 
                            : isPurchased ? 'bg-emerald-500/10 border-emerald-500/20' 
                            : 'bg-amber-500/10 border-amber-500/20'
                        }`}>
                          {isConverted ? <FileText size={20} className="text-blue-400" />
                            : isPurchased ? <CheckCircle2 size={20} className="text-emerald-400" /> 
                            : <Clock size={20} className="text-amber-400" />}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h3 className="font-black text-sm text-white truncate uppercase tracking-tight">{quote.customerName || "WALK-IN"}</h3>
                          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                            <span className="text-[10px] text-gray-600 font-bold">{timeStr}</span>
                            {metadata.customerPhone && (
                              <span className="text-[10px] text-emerald-500/70 font-bold flex items-center gap-0.5">
                                <Phone size={9} /> {metadata.customerPhone}
                              </span>
                            )}
                            {isConverted && <span className="text-[8px] bg-blue-500/10 text-blue-400 px-1.5 py-0.5 rounded font-black uppercase">Invoiced</span>}
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-2 shrink-0">
                          <p className={`font-black text-lg tracking-tighter ${
                            isConverted ? 'text-blue-400' : isPurchased ? 'text-emerald-400' : 'text-white'
                          }`}>
                            ₹{Math.round(quote.totalPrice / 100).toLocaleString('en-IN')}
                          </p>
                          <ChevronDown size={16} className={`text-gray-600 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                      </button>
                      
                      {/* Expanded Panel */}
                      {isExpanded && (
                        <div className="border-t border-gray-800/40">
                          {/* Item Details */}
                          {items.length > 0 && (
                            <div className="px-4 py-3">
                              <p className="text-[9px] font-black text-gray-600 uppercase tracking-widest mb-2">Items ({items.length})</p>
                              <div className="space-y-1.5">
                                {items.map((item: QuoteItem) => (
                                  <div key={item.id} className="flex items-center justify-between bg-[#0a0a0a] rounded-xl px-3 py-2 border border-gray-800/40">
                                    <div>
                                      <p className="text-[11px] font-bold text-gray-300 uppercase">{item.woodType}</p>
                                      <p className="text-[9px] text-gray-600 font-medium">
                                        {item.width}" × {item.thickness}" × {item.length}' — {item.quantity} pcs
                                      </p>
                                    </div>
                                    <div className="text-right">
                                      <p className="text-[11px] font-black text-white">{item.volume.toFixed(3)} CFT</p>
                                      <p className="text-[9px] text-gray-600 font-bold">₹{Math.round(item.price / 100).toLocaleString('en-IN')}</p>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Purchase metadata */}
                          {isPurchased && metadata.finalPriceRupees && (
                            <div className="px-4 py-3 border-t border-gray-800/30 grid grid-cols-2 gap-3">
                              <div>
                                <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Final Price</p>
                                <p className="text-sm font-black text-emerald-400">₹{Number(metadata.finalPriceRupees).toLocaleString('en-IN')}</p>
                              </div>
                              {metadata.advanceRupees > 0 && (
                                <div>
                                  <p className="text-[9px] text-gray-600 font-black uppercase tracking-widest">Advance Paid</p>
                                  <p className="text-sm font-black text-emerald-400">₹{Number(metadata.advanceRupees).toLocaleString('en-IN')}</p>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Action Buttons */}
                          <div className="px-4 pb-4 pt-2 flex flex-col gap-2">
                            {/* Edit Button (all states) */}
                            {!isConverted && (
                              <button
                                onClick={() => handleEdit(quote.id)}
                                className="w-full flex items-center justify-center gap-2 py-3 bg-[#1a1a1d] border border-gray-800 rounded-2xl text-gray-300 text-[11px] font-black uppercase tracking-widest hover:bg-gray-800 transition-all active:scale-[0.98]"
                              >
                                Edit quote
                              </button>
                            )}

                            {/* ESTIMATE → Purchase */}
                            {isEstimate && (
                              <button
                                onClick={() => openPurchaseModal(quote)}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-emerald-500 text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-emerald-400 transition-all active:scale-[0.98] shadow-lg shadow-emerald-500/20"
                              >
                                <ShoppingCart size={14} />
                                Confirm sale
                              </button>
                            )}

                            {/* PURCHASED → Invoice */}
                            {isPurchased && (
                              <button
                                onClick={() => handleGenerateInvoice(quote.id)}
                                disabled={!!invoicingId}
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-white text-black rounded-2xl text-[11px] font-black uppercase tracking-widest hover:bg-gray-200 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg"
                              >
                                {invoicingId === quote.id ? (
                                  <><Loader2 size={14} className="animate-spin" /> Generating...</>
                                ) : (
                                  <><Receipt size={14} /> Generate invoice</>
                                )}
                              </button>
                            )}

                            {/* CONVERTED → View */}
                            {isConverted && (
                              <Link 
                                href="/invoices"
                                className="w-full flex items-center justify-center gap-2 py-3.5 bg-blue-500/10 border border-blue-500/20 rounded-2xl text-blue-400 text-[11px] font-black uppercase tracking-widest hover:bg-blue-500/20 transition-all"
                              >
                                <FileText size={14} /> View Invoice <ArrowRight size={14} />
                              </Link>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Accent */}
                      <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                        isConverted ? 'bg-blue-500' : isPurchased ? 'bg-emerald-500' : 'bg-amber-500'
                      } opacity-20`} />
                    </div>
                  );
                })}
              </div>
            </div>
          ))
        )}
      </div>

      {/* ============= PURCHASE CONFIRMATION MODAL ============= */}
      {showPurchaseModal && (
        <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setShowPurchaseModal(false)} />
          
          <div className="relative w-full max-w-md bg-[#111111] border border-gray-800 rounded-t-[32px] sm:rounded-[32px] p-6 z-10 animate-in slide-in-from-bottom duration-300">
            {/* Modal Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-black text-white tracking-tight">Confirm sale</h2>
                <p className="text-[10px] text-gray-500 font-bold uppercase tracking-widest">Finalize customer and payment</p>
              </div>
              <button onClick={() => setShowPurchaseModal(false)} className="w-8 h-8 rounded-full bg-gray-800 flex items-center justify-center hover:bg-gray-700 transition-colors">
                <X size={16} className="text-gray-400" />
              </button>
            </div>

            {/* Customer Details */}
            <div className="space-y-3 mb-5">
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Customer Name</label>
                <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 flex items-center px-3 focus-within:border-emerald-500/40 transition-colors">
                  <User size={14} className="text-gray-600 mr-2 shrink-0" />
                  <input 
                    type="text" 
                    value={purchaseName}
                    onChange={(e) => setPurchaseName(e.target.value)}
                    placeholder="Customer Name"
                    className="bg-transparent w-full py-3 text-sm font-bold text-white outline-none placeholder:text-gray-700"
                  />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-black text-gray-500 uppercase tracking-widest block mb-1.5">Phone Number</label>
                <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 flex items-center px-3 focus-within:border-emerald-500/40 transition-colors">
                  <Phone size={14} className="text-gray-600 mr-2 shrink-0" />
                  <input 
                    type="tel" 
                    value={purchasePhone}
                    onChange={(e) => setPurchasePhone(e.target.value)}
                    placeholder="9876543210"
                    className="bg-transparent w-full py-3 text-sm font-bold text-white outline-none placeholder:text-gray-700"
                  />
                </div>
              </div>
            </div>

            {/* Price & Advance */}
            <div className="mb-4 flex items-center justify-between px-1">
               <div className="flex flex-col">
                  <span className="text-[9px] text-gray-500 font-black uppercase tracking-widest">Base Estimate</span>
                  <span className="text-sm font-bold text-gray-300">₹{purchaseEstPrice.toLocaleString('en-IN')}</span>
               </div>
               {purchasePriorBalance > 0 && (
                 <div className="flex flex-col items-end">
                    <span className="text-[9px] text-rose-500/80 font-black uppercase tracking-widest">Prior Dues (CRM)</span>
                    <span className="text-sm font-bold text-rose-400">₹{purchasePriorBalance.toLocaleString('en-IN')}</span>
                 </div>
               )}
            </div>

            <div className="grid grid-cols-2 gap-3 mb-6">
              <div>
                <label className="text-[10px] font-black text-emerald-500 uppercase tracking-widest block mb-1.5 flex justify-between">
                  Final Price (₹)
                </label>
                <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 flex items-center px-3 focus-within:border-emerald-500/40 transition-colors">
                  <span className="text-gray-600 font-black mr-1">₹</span>
                  <input 
                    type="number"
                    value={purchaseFinalPrice}
                    onChange={(e) => setPurchaseFinalPrice(e.target.value)}
                    placeholder="0"
                    className="bg-transparent w-full py-3 text-sm font-black text-emerald-400 outline-none placeholder:text-gray-700 text-right"
                  />
                </div>
              </div>
              <div>
                <label className="text-[10px] font-black text-amber-500 uppercase tracking-widest block mb-1.5">Advance Paid (₹)</label>
                <div className="bg-[#0a0a0a] rounded-xl border border-gray-800 flex items-center px-3 focus-within:border-amber-500/40 transition-colors">
                  <Wallet size={14} className="text-gray-600 mr-2 shrink-0" />
                  <input 
                    type="number"
                    value={purchaseAdvance}
                    onChange={(e) => setPurchaseAdvance(e.target.value)}
                    placeholder="0"
                    className="bg-transparent w-full py-3 text-sm font-black text-amber-400 outline-none placeholder:text-gray-700 text-right"
                  />
                </div>
              </div>
            </div>

            {/* Balance Display */}
            {parseFloat(purchaseFinalPrice) > 0 && (
              <div className="bg-[#0a0a0a] rounded-2xl border border-gray-800 p-4 mb-6 flex justify-between items-center">
                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">Balance Due</span>
                <span className="text-xl font-black text-rose-400">
                  ₹{Math.max(0, (parseFloat(purchaseFinalPrice) || 0) - (parseFloat(purchaseAdvance) || 0)).toLocaleString('en-IN')}
                </span>
              </div>
            )}

            {/* Confirm Button */}
            <button
              onClick={handleConfirmPurchase}
              disabled={!!convertingId}
              className="w-full py-4 bg-emerald-500 text-black rounded-2xl font-black uppercase text-xs tracking-widest flex items-center justify-center gap-2 hover:bg-emerald-400 transition-all disabled:opacity-50 active:scale-[0.98] shadow-lg shadow-emerald-500/20"
            >
              {convertingId ? (
                <><Loader2 size={16} className="animate-spin" /> Processing...</>
              ) : (
                <><ShoppingCart size={16} /> Confirm sale</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
