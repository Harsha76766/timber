"use client";

import { use, useState, useEffect } from 'react';
import { ArrowLeft, Printer, Share2, Receipt, FileText } from 'lucide-react';
import Link from 'next/link';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);

  async function fetchInvoiceData() {
    try {
      setLoading(true);
      
      const res = await fetch(`/api/v1/invoices/${id}`);
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || 'Failed to load invoice');

      setData(json.data);
    } catch (err: any) {
      console.error('Fetch Error:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (id) fetchInvoiceData();
  }, [id]);

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-emerald-500/20 border-t-emerald-500 rounded-full animate-spin" />
          <p className="text-slate-500 font-bold uppercase text-[10px] tracking-widest">Generating Tax Invoice...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0A0A0B] text-white p-10 text-center">
        <p className="text-rose-400 font-bold">Error loading invoice: {error}</p>
        <Link href="/invoices" className="mt-4 inline-block text-slate-500 underline text-sm">Back to Invoices</Link>
      </div>
    );
  }

  const { invoice, customer, org, items } = data;

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 pb-24 md:p-8">
      {/* Top Actions - Hidden on Print */}
      <div className="max-w-4xl mx-auto mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
        <Link href="/invoices" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Invoices
        </Link>
        <div className="flex gap-3">
          <button 
            onClick={handlePrint}
            className="flex-1 md:flex-none bg-white text-black px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-200"
          >
            <Printer size={16} />
            Print Invoice
          </button>
          <button className="flex-1 md:flex-none bg-[#141417] border border-white/5 text-white px-6 py-3 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-white/5">
            <Share2 size={16} />
            Share
          </button>
        </div>
      </div>

      {/* Main Invoice Document */}
      <div className="max-w-4xl mx-auto bg-white text-black p-8 md:p-12 shadow-2xl print:shadow-none print:p-0 min-h-[29.7cm]">
        
        {/* Invoice Header */}
        <div className="border-b-2 border-black pb-8 mb-8 flex flex-col md:flex-row justify-between gap-8">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-black flex items-center justify-center">
                <FileText className="text-white" size={28} />
              </div>
              <h1 className="text-3xl font-black uppercase tracking-tighter">Tax Invoice</h1>
            </div>
            <div className="space-y-1">
              <p className="font-extrabold text-lg">{org?.name}</p>
              <p className="text-xs text-slate-600 max-w-sm">{org?.address}</p>
              <p className="text-xs font-bold mt-2">GSTIN: <span className="font-black uppercase">{org?.gstin}</span></p>
              <p className="text-xs font-bold">State: {org?.state === 'KA' ? 'Karnataka' : org?.state} (Code: 29)</p>
            </div>
          </div>

          <div className="text-right flex flex-col justify-end">
            <div className="mb-4">
              <p className="text-[10px] font-black uppercase text-slate-500">Invoice Number</p>
              <p className="text-xl font-black tracking-tight">{invoice.invoiceNumber}</p>
            </div>
            <div>
              <p className="text-[10px] font-black uppercase text-slate-500">Date of Issue</p>
              <p className="text-sm font-bold">{new Date(invoice.invoiceDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' })}</p>
            </div>
          </div>
        </div>

        {/* Billing Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mb-12">
          <div>
            <p className="text-[10px] font-black uppercase text-slate-500 mb-3 border-b border-slate-200 pb-1">Bill To / Consignee</p>
            <p className="font-black text-lg uppercase">{customer?.company || customer?.name}</p>
            <p className="text-xs text-slate-600 mt-1">{customer?.phone}</p>
            {customer?.gstin && (
              <p className="text-xs font-bold mt-2">GSTIN: <span className="font-black uppercase">{customer.gstin}</span></p>
            )}
            <p className="text-xs font-bold">State: {customer?.state} (Place of Supply: {invoice.placeOfSupply})</p>
          </div>
          <div className="md:text-right">
            <p className="text-[10px] font-black uppercase text-slate-500 mb-3 border-b border-slate-200 pb-1">Shipment Info</p>
            <p className="text-xs font-bold">Dispatch Mode: Road Transport</p>
            <p className="text-xs font-bold">Reverse Charge: No</p>
            <p className="text-xs font-bold">Quotation Ref: {invoice.quotationId?.slice(0, 8)}</p>
          </div>
        </div>

        {/* Items Table */}
        <div className="mb-12 overflow-hidden border border-black">
          <table className="w-full border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-black">
                <th className="p-3 text-left text-[10px] font-black uppercase border-r border-black">Sl</th>
                <th className="p-3 text-left text-[10px] font-black uppercase border-r border-black">Description of Goods</th>
                <th className="p-3 text-center text-[10px] font-black uppercase border-r border-black">HSN</th>
                <th className="p-3 text-right text-[10px] font-black uppercase border-r border-black">Volume (CFT)</th>
                <th className="p-3 text-right text-[10px] font-black uppercase border-r border-black">Rate</th>
                <th className="p-3 text-right text-[10px] font-black uppercase">Amount</th>
              </tr>
            </thead>
            <tbody>
              {items?.map((item: any, idx: number) => (
                <tr key={item.id} className="border-b border-slate-200">
                  <td className="p-3 text-[11px] font-bold border-r border-black">{idx + 1}</td>
                  <td className="p-3 border-r border-black">
                    <p className="text-[11px] font-black uppercase">{item.woodType} - {item.Product?.name}</p>
                    <p className="text-[9px] text-slate-500 mt-0.5">
                      {item.length}' x {item.width}" x {item.thickness}" ({item.quantity} Nos)
                    </p>
                  </td>
                  <td className="p-3 text-center text-[11px] font-bold border-r border-black">4407</td>
                  <td className="p-3 text-right text-[11px] font-bold border-r border-black">{item.volume.toFixed(4)}</td>
                  <td className="p-3 text-right text-[11px] font-bold border-r border-black">₹{(item.price / 100).toLocaleString('en-IN')}</td>
                  <td className="p-3 text-right text-[11px] font-black italic">₹{((item.price * item.volume) / 100).toLocaleString('en-IN')}</td>
                </tr>
              ))}
              {/* Padding rows to fill space */}
              {[...Array(Math.max(0, 5 - (items?.length || 0)))].map((_, i) => (
                <tr key={`pad-${i}`} className="h-10 border-b border-slate-100">
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td className="border-r border-black"></td>
                  <td></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Totals & GST Summary */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          <div>
            <div className="p-4 bg-slate-50 border border-black mb-4">
              <p className="text-[10px] font-black uppercase mb-2">Declaration / Terms</p>
              <ul className="text-[9px] text-slate-600 space-y-1 list-disc pl-3">
                <li>Material once sold will not be taken back or exchanged.</li>
                <li>Subject to LOCAL JURISDICTION ONLY.</li>
                <li>We declare that this invoice shows the actual price of the goods described.</li>
              </ul>
            </div>
            <div className="text-[10px] font-bold italic">
               Total in Words: <span className="capitalize">{/* Coming soon: Number to words logic */} Indian Rupees Only</span>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between text-sm py-1 border-b border-dashed border-slate-300">
              <span className="font-bold text-slate-500 uppercase text-[10px]">Taxable Subtotal</span>
              <span className="font-black font-mono">₹{(invoice.subtotal / 100).toLocaleString('en-IN')}</span>
            </div>
            
            {!invoice.isInterState ? (
              <>
                <div className="flex justify-between text-sm py-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">CGST (9.0%)</span>
                  <span className="font-black font-mono">₹{(invoice.cgst / 100).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex justify-between text-sm py-1 border-b border-dashed border-slate-300">
                  <span className="font-bold text-slate-500 uppercase text-[10px]">SGST (9.0%)</span>
                  <span className="font-black font-mono">₹{(invoice.sgst / 100).toLocaleString('en-IN')}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm py-1 border-b border-dashed border-slate-300">
                <span className="font-bold text-slate-500 uppercase text-[10px]">IGST (18.0%)</span>
                <span className="font-black font-mono">₹{(invoice.igst / 100).toLocaleString('en-IN')}</span>
              </div>
            )}

            <div className="flex justify-between items-center py-4 bg-black text-white px-4 mt-4">
              <span className="font-black uppercase text-xs">Total Amount</span>
              <span className="text-2xl font-black">₹{(invoice.grandTotal / 100).toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Footer Signature */}
        <div className="mt-20 flex justify-between items-end">
          <div className="text-center w-48">
            <div className="border-b border-black mb-2"></div>
            <p className="text-[10px] font-black uppercase">Receiver's Signature</p>
          </div>
          <div className="text-center w-64">
            <p className="text-[9px] font-black uppercase mb-12">for {org?.name}</p>
            <div className="border-b border-black mb-2"></div>
            <p className="text-[10px] font-black uppercase">Authorised Signatory</p>
          </div>
        </div>
      </div>

      {/* CSS for print-perfect A4 */}
      <style jsx global>{`
        @media print {
          body { 
            background: white !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          .min-h-screen { background: white !important; }
          .max-w-4xl { max-width: 100% !important; margin: 0 !important; padding: 0 !important; }
          @page {
            size: A4;
            margin: 1cm;
          }
        }
      `}</style>
    </div>
  );
}
