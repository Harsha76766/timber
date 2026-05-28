'use client';

import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { gstSchema, GstData } from '../../../lib/onboarding';
import { useOnboarding } from '../OnboardingProvider';
import { Info, CheckCircle2, XCircle, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';

export default function GstStep() {
  const { data, updateData, nextStep, isLoading } = useOnboarding();
  const [gstinStatus, setGstinStatus] = useState<'empty' | 'invalid' | 'valid' | 'partial'>('empty');
  
  const { register, handleSubmit, watch, setValue, formState: { errors, isValid } } = useForm<GstData>({
    resolver: zodResolver(gstSchema),
    defaultValues: {
      ...data.gst,
      invoicePrefix: data.gst.invoicePrefix || 'INV',
      invoiceDueDays: data.gst.invoiceDueDays || 30,
      financialYearStart: data.gst.financialYearStart || 'April',
    },
    mode: 'onChange'
  });

  const gstinVal = watch('gstin');
  const invoicePrefix = watch('invoicePrefix');

  useEffect(() => {
    if (!gstinVal) {
      setGstinStatus('empty');
      return;
    }
    
    // Force uppercase
    if (gstinVal !== gstinVal.toUpperCase()) {
      setValue('gstin', gstinVal.toUpperCase());
    }

    if (gstinVal.length < 15) {
      setGstinStatus('partial');
    } else {
      const regex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/i;
      if (regex.test(gstinVal)) {
        setGstinStatus('valid');
        // Auto-fill PAN from GSTIN (chars 3-12)
        setValue('pan', gstinVal.substring(2, 12));
      } else {
        setGstinStatus('invalid');
      }
    }
  }, [gstinVal, setValue]);

  const onSubmit = async (formData: GstData) => {
    updateData('gst', formData);
    await nextStep(async () => {
      try {
        const res = await fetch('/api/v1/onboarding/gst', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
        return res.ok;
      } catch (err) {
        console.error(err);
        return false;
      }
    });
  };

  const disableContinue = !isValid || gstinStatus === 'invalid' || gstinStatus === 'partial';

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 p-4 md:p-10 max-w-7xl mx-auto">
      <div className="flex-1 max-w-2xl space-y-8">
        <div>
          <h1 className="text-3xl font-black mb-2">GST & tax configuration</h1>
          <p className="text-white/50 text-sm">Required for correct CGST/SGST vs IGST on every invoice.</p>
        </div>

        <div className="bg-teal-500/10 border border-teal-500/20 rounded-2xl p-4 flex gap-3 text-teal-400">
          <Info className="shrink-0 mt-0.5" size={18} />
          <p className="text-sm font-medium leading-relaxed">
            TimberFlow auto-detects intra-state vs inter-state based on your state code and customer's state. CGST+SGST for same state, IGST for different state.
          </p>
        </div>

        <form id="gst-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2 relative">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">GSTIN Number</label>
              <input 
                {...register('gstin')}
                maxLength={15}
                className={clsx(
                  "w-full bg-[#1a1a1a] border rounded-xl h-12 px-4 font-mono uppercase focus:outline-none transition-colors",
                  gstinStatus === 'invalid' ? "border-red-500/50 focus:border-red-500" :
                  gstinStatus === 'valid' ? "border-emerald-500/50 focus:border-emerald-500" :
                  "border-white/10 focus:border-amber-500"
                )}
                placeholder="22AAAAA0000A1Z5"
              />
              
              {/* Live Validation Pill */}
              <div className="absolute right-3 top-[34px] flex items-center">
                {gstinStatus === 'partial' && (
                  <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    {gstinVal.length}/15 chars
                  </span>
                )}
                {gstinStatus === 'valid' && (
                  <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    <CheckCircle2 size={12} />
                    Valid — State: {gstinVal.substring(0, 2)}
                  </div>
                )}
                {gstinStatus === 'invalid' && (
                  <div className="flex items-center gap-1.5 bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-1 rounded-full">
                    <XCircle size={12} />
                    Invalid format
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">PAN Number</label>
              <input 
                {...register('pan')}
                maxLength={10}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="AAAAA0000A"
              />
              {errors.pan && <p className="text-red-400 text-xs">{errors.pan.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex justify-between">
                <span>Invoice Prefix</span>
                <span className="text-white/40 normal-case font-normal">Preview: {invoicePrefix || 'INV'}-2024-0001</span>
              </label>
              <input 
                {...register('invoicePrefix')}
                maxLength={5}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 font-mono uppercase focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {errors.invoicePrefix && <p className="text-red-400 text-xs">{errors.invoicePrefix.message}</p>}
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Default Payment Due (Days)</label>
              <input 
                type="number"
                {...register('invoiceDueDays', { valueAsNumber: true })}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {errors.invoiceDueDays && <p className="text-red-400 text-xs">{errors.invoiceDueDays.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Financial Year Start</label>
              <select 
                {...register('financialYearStart')}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors appearance-none"
              >
                <option value="April">April (Indian FY)</option>
                <option value="January">January</option>
              </select>
            </div>
            
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider flex justify-between">
                <span>UPI ID for Invoices</span>
                <span className="text-white/40 normal-case font-normal">(Optional)</span>
              </label>
              <input 
                {...register('upiId')}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="yourname@upi"
              />
              <p className="text-white/40 text-[10px]">Printed as QR code on every invoice for instant payments.</p>
            </div>
          </div>
        </form>

        <button
          onClick={() => handleSubmit(onSubmit)()}
          disabled={disableContinue || isLoading}
          className="w-full h-14 bg-emerald-500 text-black rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
        >
          {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
        </button>
      </div>

      {/* Pre-loaded HSN Codes Panel */}
      <div className="w-full lg:w-[400px] shrink-0 lg:mt-[76px]">
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24">
          <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-4">Default HSN Codes — Pre-configured</p>
          
          <div className="grid grid-cols-2 gap-3 mb-4">
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
              <div className="text-sm font-bold text-white/90 mb-1">Sawn timber</div>
              <div className="text-xs font-mono text-white/50">HSN 4407 &rarr; 12%</div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
              <div className="text-sm font-bold text-white/90 mb-1">Round wood</div>
              <div className="text-xs font-mono text-white/50">HSN 4403 &rarr; 0%</div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
              <div className="text-sm font-bold text-white/90 mb-1">Mouldings</div>
              <div className="text-xs font-mono text-white/50">HSN 4409 &rarr; 18%</div>
            </div>
            <div className="bg-[#1a1a1a] border border-white/5 rounded-xl p-4">
              <div className="text-sm font-bold text-white/90 mb-1">Doors / frames</div>
              <div className="text-xs font-mono text-white/50">HSN 4418 &rarr; 18%</div>
            </div>
          </div>
          
          <p className="text-xs text-white/40 italic">Note: You can edit HSN and GST rate per item in the next step.</p>
        </div>
      </div>
    </div>
  );
}
