"use client";

import React, { useState, useMemo } from "react";
import Link from "next/link";
import { 
  TrendingUp, 
  CreditCard, 
  AlertCircle, 
  ShoppingBag, 
  Calendar, 
  DollarSign, 
  FileText, 
  ChevronRight,
  Sparkles,
  Trees,
  User,
  X,
  Check,
  Building,
  MapPin,
  Settings,
  Mail,
  Phone
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";

type Invoice = {
  id: string;
  invoiceNumber: string;
  invoiceDate: string;
  createdAt: string;
  subtotal: number;
  grandTotal: number;
  paidAmount: number;
  totalGst: number;
  status: string;
};

type Organisation = {
  id: string;
  name: string;
  businessType?: string | null;
  yearEstablished?: number | null;
  city?: string | null;
  stateCode?: string | null;
  pinCode?: string | null;
  phone?: string | null;
  email?: string | null;
  invoicePrefix?: string | null;
  upiId?: string | null;
};

type BusinessHubClientProps = {
  initialInvoices: Invoice[];
  totalProducts: number;
  totalCustomers: number;
  activeQuotesCount: number;
  initialOrg: Organisation | null;
};

export default function BusinessHubClient({
  initialInvoices,
  totalProducts,
  totalCustomers,
  activeQuotesCount,
  initialOrg,
}: BusinessHubClientProps) {
  const supabase = createClient();
  const [org, setOrg] = useState<Organisation | null>(initialOrg);

  // Compute current month key (e.g., "2026-05") as the standard default focus
  const currentMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  }, []);

  // Set default values for all box selectors to "this month"
  const [revenueMonth, setRevenueMonth] = useState<string>(currentMonthKey);
  const [profitMonth, setProfitMonth] = useState<string>(currentMonthKey);
  const [receivablesMonth, setReceivablesMonth] = useState<string>(currentMonthKey);
  const [gstMonth, setGstMonth] = useState<string>(currentMonthKey);
  const [txMonth, setTxMonth] = useState<string>(currentMonthKey);

  // Profile Edit Modal State
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Local state variables for form editing
  const [formName, setFormName] = useState(org?.name || "");
  const [formBusinessType, setFormBusinessType] = useState(org?.businessType || "");
  const [formYearEstablished, setFormYearEstablished] = useState(org?.yearEstablished?.toString() || "");
  const [formCity, setFormCity] = useState(org?.city || "");
  const [formStateCode, setFormStateCode] = useState(org?.stateCode || "");
  const [formPinCode, setFormPinCode] = useState(org?.pinCode || "");
  const [formPhone, setFormPhone] = useState(org?.phone || "");
  const [formEmail, setFormEmail] = useState(org?.email || "");
  const [formInvoicePrefix, setFormInvoicePrefix] = useState(org?.invoicePrefix || "INV");
  const [formUpiId, setFormUpiId] = useState(org?.upiId || "");

  // 1. Parse dates and build month map dynamically
  const invoices = useMemo(() => {
    return initialInvoices.map(inv => {
      const date = new Date(inv.invoiceDate || inv.createdAt);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
      return {
        ...inv,
        monthKey,
      };
    });
  }, [initialInvoices]);

  // 2. Extract list of unique months represented in the invoices data
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    invoices.forEach(inv => set.add(inv.monthKey));
    return Array.from(set).sort().reverse(); // Newest first
  }, [invoices]);

  // 3. Format month keys to descriptive Indian locale labels
  const monthOptions = useMemo(() => {
    const opts = availableMonths.map(mKey => {
      const [year, month] = mKey.split("-").map(Number);
      const label = new Date(year, month - 1).toLocaleString("en-IN", {
        month: "short",
        year: "numeric",
      });
      return { key: mKey, label };
    });
    // Labeled "ALL" option as "Deep Analysis" per instruction
    return [{ key: "ALL", label: "Deep Analysis" }, ...opts];
  }, [availableMonths]);

  // 4. Calculate isolated Revenue metrics
  const revenue = useMemo(() => {
    const filtered = revenueMonth === "ALL" 
      ? invoices 
      : invoices.filter(inv => inv.monthKey === revenueMonth);
    return filtered.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) / 100;
  }, [invoices, revenueMonth]);

  // 5. Calculate isolated Net Profit metrics (Industry 24% Net Margin standard)
  const profitMarginPct = 24;
  const netProfit = useMemo(() => {
    const filtered = profitMonth === "ALL" 
      ? invoices 
      : invoices.filter(inv => inv.monthKey === profitMonth);
    const rev = filtered.reduce((sum, inv) => sum + (inv.subtotal || 0), 0) / 100;
    return rev * (profitMarginPct / 100);
  }, [invoices, profitMonth]);

  // 6. Calculate isolated Receivables
  const receivables = useMemo(() => {
    const filtered = receivablesMonth === "ALL" 
      ? invoices 
      : invoices.filter(inv => inv.monthKey === receivablesMonth);
    const rec = filtered.reduce((sum, inv) => sum + ((inv.grandTotal || 0) - (inv.paidAmount || 0)), 0) / 100;
    return Math.max(0, rec);
  }, [invoices, receivablesMonth]);

  // 7. Calculate isolated GST Liability
  const gstLiability = useMemo(() => {
    const filtered = gstMonth === "ALL" 
      ? invoices 
      : invoices.filter(inv => inv.monthKey === gstMonth);
    return filtered.reduce((sum, inv) => sum + (inv.totalGst || 0), 0) / 100;
  }, [invoices, gstMonth]);

  // 8. Calculate dynamic monthly aggregate bar chart sales (based on ALL invoices)
  const monthlyChartData = useMemo(() => {
    const revenueMap: Record<string, number> = {};
    invoices.forEach(inv => {
      revenueMap[inv.monthKey] = (revenueMap[inv.monthKey] || 0) + (inv.subtotal || 0);
    });

    const sortedKeys = Object.keys(revenueMap).sort();
    const maxVal = Math.max(...Object.values(revenueMap), 1);

    return sortedKeys.slice(-6).map(mKey => {
      const [year, month] = mKey.split("-").map(Number);
      const label = new Date(year, month - 1).toLocaleString("en-IN", { month: "short" });
      const rawVal = revenueMap[mKey];
      return {
        key: mKey,
        label,
        value: rawVal / 100,
        heightPct: (rawVal / maxVal) * 100,
      };
    });
  }, [invoices]);

  // 9. Filter transactions list invoices
  const filteredTxInvoices = useMemo(() => {
    if (txMonth === "ALL") return invoices;
    return invoices.filter(inv => inv.monthKey === txMonth);
  }, [invoices, txMonth]);

  // 10. Handle profile form submission & update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!org) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const { data, error } = await supabase
        .from("Organisation")
        .update({
          name: formName,
          businessType: formBusinessType || null,
          yearEstablished: parseInt(formYearEstablished) || null,
          city: formCity || null,
          stateCode: formStateCode || null,
          pinCode: formPinCode || null,
          phone: formPhone || null,
          email: formEmail || null,
          invoicePrefix: formInvoicePrefix || "INV",
          upiId: formUpiId || null,
        })
        .eq("id", org.id)
        .select()
        .single();

      if (error) throw error;
      
      setOrg(data);
      setSaveSuccess(true);
      setTimeout(() => {
        setSaveSuccess(false);
        setIsProfileOpen(false);
      }, 1500);
    } catch (err) {
      console.error("Failed to save organization data", err);
      alert("Failed to update organization details. Please try again.");
    } finally {
      setIsSaving(false);
    }
  };

  const orgInitials = useMemo(() => {
    if (!org?.name) return "TF";
    return org.name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
  }, [org]);

  return (
    <div className="min-h-screen bg-[#050507] text-white px-4 pb-28 pt-6">
      <div className="mx-auto max-w-3xl space-y-6">
        
        {/* Hub Header */}
        <header className="flex items-center justify-between border-b border-white/5 pb-4">
          <div>
            <div className="flex items-center gap-1.5 text-[9px] font-black uppercase tracking-[0.25em] text-emerald-400">
              <Sparkles size={10} className="animate-pulse" />
              Core Intelligence
            </div>
            <h1 className="mt-1.5 text-3xl font-black tracking-tight text-white/95">Business Hub</h1>
            <p className="text-xs text-slate-500 mt-0.5">Real-time ledger analytics & performance metrics.</p>
          </div>

          {/* Glowing Avatar/Profile Action Element */}
          <button 
            onClick={() => setIsProfileOpen(true)}
            className="group relative flex h-11 w-11 items-center justify-center rounded-2xl bg-white/[0.02] border border-white/10 hover:border-emerald-500/30 transition-all shadow-xl"
            title="Profile & Settings"
          >
            {/* Pulsing ring */}
            <span className="absolute -inset-px rounded-2xl border border-emerald-500/0 group-hover:border-emerald-500/30 group-hover:scale-105 transition-all duration-300"></span>
            <span className="absolute inset-0 bg-gradient-to-tr from-emerald-500/10 to-transparent opacity-0 group-hover:opacity-100 rounded-2xl transition-all"></span>
            
            <div className="relative text-xs font-black uppercase tracking-wider text-slate-200 group-hover:text-emerald-400 transition-colors">
              {orgInitials}
            </div>
          </button>
        </header>

        {/* Dynamic Metric Grid with independent Month Dropdowns inside each Box */}
        <section className="grid grid-cols-2 gap-3.5">
          
          {/* Box 1: Revenue */}
          <div className="relative overflow-hidden rounded-[24px] border border-emerald-500/10 bg-gradient-to-br from-emerald-500/[0.02] to-transparent p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start gap-1">
              <div className="w-9 h-9 bg-emerald-500/10 text-emerald-400 rounded-xl flex items-center justify-center shrink-0">
                <TrendingUp size={18} />
              </div>
              
              {/* Box Dropdown */}
              <select
                value={revenueMonth}
                onChange={(e) => setRevenueMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 outline-none cursor-pointer hover:bg-white/10 max-w-[100px]"
              >
                {monthOptions.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-[#0c0c0f] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Revenue</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-white">
                ₹{Math.round(revenue).toLocaleString("en-IN")}
              </h3>
            </div>
          </div>

          {/* Box 2: Net Profit */}
          <div className="relative overflow-hidden rounded-[24px] border border-violet-500/10 bg-gradient-to-br from-violet-500/[0.02] to-transparent p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start gap-1">
              <div className="w-9 h-9 bg-violet-500/10 text-violet-400 rounded-xl flex items-center justify-center shrink-0">
                <DollarSign size={18} />
              </div>
              
              {/* Box Dropdown */}
              <select
                value={profitMonth}
                onChange={(e) => setProfitMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider text-violet-400 outline-none cursor-pointer hover:bg-white/10 max-w-[100px]"
              >
                {monthOptions.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-[#0c0c0f] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Net Profit</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-white">
                ₹{Math.round(netProfit).toLocaleString("en-IN")}
              </h3>
            </div>
          </div>

          {/* Box 3: Receivables */}
          <div className="relative overflow-hidden rounded-[24px] border border-rose-500/10 bg-gradient-to-br from-rose-500/[0.02] to-transparent p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start gap-1">
              <div className="w-9 h-9 bg-rose-500/10 text-rose-400 rounded-xl flex items-center justify-center shrink-0">
                <CreditCard size={18} />
              </div>
              
              {/* Box Dropdown */}
              <select
                value={receivablesMonth}
                onChange={(e) => setReceivablesMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider text-rose-400 outline-none cursor-pointer hover:bg-white/10 max-w-[100px]"
              >
                {monthOptions.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-[#0c0c0f] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">Receivables</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-white">
                ₹{Math.round(receivables).toLocaleString("en-IN")}
              </h3>
            </div>
          </div>

          {/* Box 4: GST Liability */}
          <div className="relative overflow-hidden rounded-[24px] border border-amber-500/10 bg-gradient-to-br from-amber-500/[0.02] to-transparent p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between min-h-[145px]">
            <div className="flex justify-between items-start gap-1">
              <div className="w-9 h-9 bg-amber-500/10 text-amber-400 rounded-xl flex items-center justify-center shrink-0">
                <AlertCircle size={18} />
              </div>
              
              {/* Box Dropdown */}
              <select
                value={gstMonth}
                onChange={(e) => setGstMonth(e.target.value)}
                className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider text-amber-400 outline-none cursor-pointer hover:bg-white/10 max-w-[100px]"
              >
                {monthOptions.map(opt => (
                  <option key={opt.key} value={opt.key} className="bg-[#0c0c0f] text-white">
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <p className="mt-4 text-[9px] font-black uppercase tracking-[0.18em] text-slate-500">GST Liability</p>
              <h3 className="mt-1 text-xl font-extrabold tracking-tight text-white">
                ₹{Math.round(gstLiability).toLocaleString("en-IN")}
              </h3>
            </div>
          </div>
        </section>

        {/* Interactive Sales Chart Block */}
        {monthlyChartData.length > 1 && (
          <section className="rounded-[28px] border border-white/5 bg-white/[0.01] p-5 shadow-2xl backdrop-blur-md">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">Sales Analysis</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Monthly revenue trends based on all recorded transactions.</p>
              </div>
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Custom Interactive Bars container */}
            <div className="h-32 flex items-end justify-between gap-3 px-2 pt-4">
              {monthlyChartData.map(bar => (
                <div
                  key={bar.key}
                  className="flex-1 flex flex-col items-center gap-2 group"
                >
                  <div className="w-full relative flex flex-col justify-end h-20">
                    {/* Hover tooltip */}
                    <span className="absolute -top-6 left-1/2 -translate-x-1/2 scale-0 group-hover:scale-100 bg-emerald-500 text-[8px] font-black text-black px-1.5 py-0.5 rounded transition-all z-10 whitespace-nowrap shadow-xl">
                      ₹{Math.round(bar.value).toLocaleString("en-IN")}
                    </span>
                    {/* The bar */}
                    <div
                      style={{ height: `${Math.max(8, bar.heightPct)}%` }}
                      className="w-full rounded-t-lg transition-all duration-500 bg-white/10 group-hover:bg-white/20"
                    />
                  </div>
                  <span className="text-[9px] font-bold tracking-tight text-slate-500">
                    {bar.label}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Lower Content Grid */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* Recent Invoices block with its own Dropdown */}
          <div className="md:col-span-2 rounded-[28px] border border-white/5 bg-white/[0.01] p-5 shadow-2xl backdrop-blur-md flex flex-col gap-4">
            <div className="flex justify-between items-start gap-1">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-white">
                  Transactions
                </h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Showing invoice details for selection</p>
              </div>

              {/* Transactions Dropdown */}
              <div className="flex items-center gap-1.5">
                <select
                  value={txMonth}
                  onChange={(e) => setTxMonth(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-lg px-2 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-400 outline-none cursor-pointer hover:bg-white/10 max-w-[100px]"
                >
                  {monthOptions.map(opt => (
                    <option key={opt.key} value={opt.key} className="bg-[#0c0c0f] text-white">
                      {opt.label}
                    </option>
                  ))}
                </select>
                <Link
                  href="/invoices"
                  className="text-[9px] font-black uppercase tracking-wider text-emerald-400 bg-emerald-500/5 px-2.5 py-1 rounded-full border border-emerald-500/10 hover:bg-emerald-500/10 transition-all shrink-0"
                >
                  View All
                </Link>
              </div>
            </div>

            <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
              {filteredTxInvoices.length > 0 ? (
                filteredTxInvoices.slice(0, 5).map((inv) => (
                  <div
                    key={inv.id}
                    className="flex items-center justify-between p-3.5 bg-white/[0.02] hover:bg-white/[0.04] border border-white/5 rounded-2xl transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 bg-white/5 border border-white/10 rounded-xl flex items-center justify-center text-slate-400">
                        <FileText size={16} />
                      </div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-tight text-white/90">
                          {inv.invoiceNumber}
                        </p>
                        <p className="text-[9px] text-slate-500 font-bold uppercase tracking-widest mt-0.5">
                          {new Date(inv.invoiceDate || inv.createdAt).toLocaleDateString("en-IN")}
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-white/95">
                        ₹{Math.round(inv.grandTotal / 100).toLocaleString("en-IN")}
                      </p>
                      <span className={`inline-block mt-1 text-[8px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                        inv.status === "PAID"
                          ? "bg-emerald-500/10 text-emerald-400"
                          : "bg-amber-500/10 text-amber-400"
                      }`}>
                        {inv.status}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-12 text-center rounded-2xl border border-dashed border-white/5 bg-white/[0.01]">
                  <FileText className="mx-auto text-slate-700 mb-2" size={24} />
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">
                    No transactions
                  </p>
                  <p className="text-[9px] text-slate-600 mt-0.5">No invoices found for this month filter.</p>
                </div>
              )}
            </div>
          </div>

          {/* Quick Actions & Stock block */}
          <div className="flex flex-col gap-4">
            {/* Start Calculator Card */}
            <div className="rounded-[28px] border border-emerald-500/20 bg-emerald-500/10 p-5 shadow-2xl backdrop-blur-md flex flex-col justify-between">
              <div>
                <h4 className="text-xs font-black uppercase tracking-wider text-emerald-300">New Sale</h4>
                <p className="text-[10px] text-emerald-400/80 leading-relaxed mt-1.5">
                  Launch the interactive timber calculator to log sizes, compute volume and tax rates.
                </p>
              </div>
              <Link
                href="/"
                className="mt-6 flex items-center justify-between bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-black uppercase tracking-wider py-3 px-4 rounded-xl transition-all shadow-lg shadow-emerald-500/10"
              >
                Calculator
                <ChevronRight size={14} />
              </Link>
            </div>

            {/* Quick stock card */}
            <div className="rounded-[28px] border border-white/5 bg-white/[0.01] p-5 shadow-2xl backdrop-blur-md flex flex-col gap-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-white flex items-center gap-1.5">
                <Trees size={14} className="text-sky-400" />
                Inventory
              </h4>
              <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">Products</p>
                  <p className="text-lg font-black text-white">{totalProducts}</p>
                </div>
                <div className="bg-white/5 border border-white/5 p-3.5 rounded-2xl text-center">
                  <p className="text-[8px] font-black uppercase tracking-widest text-slate-500 mb-0.5">CRM Leads</p>
                  <p className="text-lg font-black text-white">{totalCustomers}</p>
                </div>
              </div>
            </div>
          </div>
        </section>

      </div>

      {/* Structured, Fully Editable Profile Sheet (Slide-out Overlay Card) */}
      {isProfileOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-end bg-black/60 backdrop-blur-md transition-all duration-300">
          <div 
            onClick={() => setIsProfileOpen(false)}
            className="absolute inset-0 cursor-pointer"
          />
          
          <div className="relative h-full w-full max-w-md bg-[#0b0b0e] border-l border-white/10 shadow-2xl p-6 overflow-y-auto flex flex-col justify-between">
            <div className="space-y-6">
              
              {/* Profile Header */}
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-black font-black text-base shadow-lg shadow-emerald-500/20">
                    {orgInitials}
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-white/95">Business Profile</h3>
                    <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold">Onboarding details</p>
                  </div>
                </div>
                
                <button 
                  onClick={() => setIsProfileOpen(false)}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors"
                >
                  <X size={15} />
                </button>
              </div>

              {/* Edit Form */}
              <form onSubmit={handleSaveProfile} className="space-y-4">
                
                {/* 1. Core Profile Details */}
                <div className="space-y-3.5 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                    <Building size={11} />
                    Company Identity
                  </h4>
                  
                  <div className="flex flex-col gap-1">
                    <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Business Name</label>
                    <input
                      type="text"
                      required
                      value={formName}
                      onChange={(e) => setFormName(e.target.value)}
                      placeholder="TimberFlow Enterprise"
                      className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Business Type</label>
                      <input
                        type="text"
                        value={formBusinessType}
                        onChange={(e) => setFormBusinessType(e.target.value)}
                        placeholder="e.g. Timber Merchant"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Est. Year</label>
                      <input
                        type="number"
                        value={formYearEstablished}
                        onChange={(e) => setFormYearEstablished(e.target.value)}
                        placeholder="e.g. 2012"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 2. Contact Coordinates */}
                <div className="space-y-3.5 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                    <Mail size={11} />
                    Communication Coordinates
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Phone</label>
                      <input
                        type="tel"
                        value={formPhone}
                        onChange={(e) => setFormPhone(e.target.value)}
                        placeholder="+91 9876543210"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Email</label>
                      <input
                        type="email"
                        value={formEmail}
                        onChange={(e) => setFormEmail(e.target.value)}
                        placeholder="contact@company.com"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">City</label>
                      <input
                        type="text"
                        value={formCity}
                        onChange={(e) => setFormCity(e.target.value)}
                        placeholder="Gandhidham"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">State Code</label>
                      <input
                        type="text"
                        value={formStateCode}
                        onChange={(e) => setFormStateCode(e.target.value)}
                        placeholder="GJ"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Pincode</label>
                      <input
                        type="text"
                        value={formPinCode}
                        onChange={(e) => setFormPinCode(e.target.value)}
                        placeholder="370201"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* 3. Invoices & Payments */}
                <div className="space-y-3.5 bg-white/[0.01] border border-white/5 rounded-2xl p-4">
                  <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-emerald-400 flex items-center gap-1.5">
                    <Settings size={11} />
                    Invoices & Ledger settings
                  </h4>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">Invoice Prefix</label>
                      <input
                        type="text"
                        required
                        value={formInvoicePrefix}
                        onChange={(e) => setFormInvoicePrefix(e.target.value)}
                        placeholder="e.g. INV"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-[9px] font-black uppercase tracking-wider text-slate-500">UPI ID Payments</label>
                      <input
                        type="text"
                        value={formUpiId}
                        onChange={(e) => setFormUpiId(e.target.value)}
                        placeholder="e.g. merchant@ybl"
                        className="bg-white/[0.02] border border-white/10 focus:border-emerald-500/40 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-600 outline-none transition-all"
                      />
                    </div>
                  </div>
                </div>

                {/* Submission Action bar */}
                <button
                  type="submit"
                  disabled={isSaving}
                  className="w-full mt-2 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-black text-xs font-black uppercase tracking-widest py-3.5 rounded-2xl shadow-xl shadow-emerald-500/10 hover:shadow-emerald-500/20 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? (
                    <div className="h-4 w-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : saveSuccess ? (
                    <>
                      <Check size={14} className="stroke-[3]" />
                      Saved Successfully
                    </>
                  ) : (
                    "Save Changes"
                  )}
                </button>

              </form>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
