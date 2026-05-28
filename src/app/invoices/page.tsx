"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Clock, Download, FileText, Filter, Plus, Search } from "lucide-react";

type Invoice = {
  id: string;
  invoiceNumber?: string;
  customerName?: string;
  totalAmount?: number;
  status?: string;
  createdAt?: string;
};

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadInvoices() {
      try {
        const res = await fetch("/api/v1/invoices");
        const json = await res.json();
        setInvoices(Array.isArray(json.data) ? json.data : []);
      } catch (error) {
        console.error("Failed to load invoices", error);
      } finally {
        setLoading(false);
      }
    }

    loadInvoices();
  }, []);

  const totalValue = invoices.reduce((sum, invoice) => sum + (invoice.totalAmount || 0), 0);
  const paidCount = invoices.filter((invoice) => invoice.status === "paid").length;
  const pendingCount = invoices.filter((invoice) => invoice.status !== "paid").length;

  return (
    <main className="min-h-screen bg-[#0b0c0f] px-4 pb-28 pt-6 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">Billing</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">GST Invoices</h1>
            <p className="mt-1 text-sm text-slate-400">Real invoices from your account.</p>
          </div>
          <Link
            href="/"
            className="flex h-11 items-center gap-2 rounded-2xl bg-emerald-400 px-4 text-xs font-black uppercase tracking-widest text-black"
          >
            <Plus size={15} />
            New
          </Link>
        </header>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Total</p>
            <p className="mt-2 text-lg font-black">₹{Math.round(totalValue / 100).toLocaleString("en-IN")}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Paid</p>
            <p className="mt-2 text-lg font-black text-emerald-400">{paidCount}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Pending</p>
            <p className="mt-2 text-lg font-black text-amber-400">{pendingCount}</p>
          </div>
        </section>

        <div className="flex gap-2">
          <div className="flex flex-1 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-4">
            <Search size={16} className="text-slate-500" />
            <input
              className="h-12 w-full bg-transparent text-sm font-semibold outline-none placeholder:text-slate-600"
              placeholder="Search invoices"
            />
          </div>
          <button className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300">
            <Filter size={16} />
          </button>
        </div>

        <section className="space-y-3">
          {loading ? (
            <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-center text-sm font-bold text-slate-500">
              Loading invoices...
            </div>
          ) : invoices.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
              <FileText className="mx-auto text-slate-600" size={34} />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">No invoices yet</p>
              <p className="mt-1 text-xs text-slate-600">Confirm a sale from quotes to generate an invoice.</p>
            </div>
          ) : (
            invoices.map((invoice) => (
              <Link
                key={invoice.id}
                href={`/invoices/${invoice.id}`}
                className="block rounded-3xl border border-white/10 bg-white/[0.04] p-4 transition active:scale-[0.99]"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-500/10 text-blue-300">
                    <FileText size={20} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black">{invoice.customerName || "Customer"}</p>
                    <div className="mt-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      <Clock size={11} />
                      {invoice.invoiceNumber || "Invoice"}
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black">₹{Math.round((invoice.totalAmount || 0) / 100).toLocaleString("en-IN")}</p>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{invoice.status || "pending"}</p>
                  </div>
                  <ArrowRight size={16} className="text-slate-600" />
                </div>
              </Link>
            ))
          )}
        </section>

        <button className="flex w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] py-3 text-xs font-black uppercase tracking-widest text-slate-300">
          <Download size={15} />
          Export invoices
        </button>
      </div>
    </main>
  );
}
