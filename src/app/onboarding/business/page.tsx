'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { businessSchema, BusinessData } from '../../../lib/onboarding';
import { useOnboarding } from '../OnboardingProvider';
import { ArrowRight } from 'lucide-react';

const INDIAN_STATES = [
  { code: '29', name: 'Karnataka' },
  { code: '27', name: 'Maharashtra' },
  { code: '33', name: 'Tamil Nadu' },
  { code: '32', name: 'Kerala' },
  { code: '36', name: 'Telangana' },
  { code: '07', name: 'Delhi' },
  { code: '09', name: 'Uttar Pradesh' },
  { code: '06', name: 'Haryana' },
];

const BUSINESS_TYPES = [
  'Timber Trader / Dealer',
  'Sawmill & Trader',
  'Importer & Distributor',
  'Retailer',
  'Contractor / Builder'
];

export default function BusinessStep() {
  const { data, updateData, nextStep } = useOnboarding();
  
  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm<BusinessData>({
    resolver: zodResolver(businessSchema),
    defaultValues: data.business,
    mode: 'onChange'
  });

  const formValues = watch();

  const onSubmit = async (formData: BusinessData) => {
    updateData('business', formData);
    await nextStep(async () => {
      try {
        const res = await fetch('/api/v1/onboarding/business', {
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

  return (
    <div className="flex flex-col lg:flex-row gap-8 lg:gap-16 p-4 md:p-10 max-w-7xl mx-auto">
      <div className="flex-1 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-black mb-2">Tell us about your business</h1>
          <p className="text-white/50 text-sm">This appears on all invoices, quotations, and katha statements.</p>
        </div>

        <form id="business-form" onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business / Firm Name</label>
              <input 
                {...register('name')} 
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
                placeholder="e.g. Sharma Timber Mart"
              />
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Type</label>
              <select 
                {...register('businessType')}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors appearance-none"
              >
                <option value="">Select type...</option>
                {BUSINESS_TYPES.map(type => (
                  <option key={type} value={type}>{type}</option>
                ))}
              </select>
              {errors.businessType && <p className="text-red-400 text-xs">{errors.businessType.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Registered Address</label>
            <textarea 
              {...register('address')}
              rows={2}
              className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl p-4 focus:border-emerald-500 focus:outline-none transition-colors resize-none"
              placeholder="Full street address..."
            />
            {errors.address && <p className="text-red-400 text-xs">{errors.address.message}</p>}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">City</label>
              <input 
                {...register('city')}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {errors.city && <p className="text-red-400 text-xs">{errors.city.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">State</label>
              <select 
                {...register('state')}
                onChange={(e) => {
                  register('state').onChange(e);
                  const stateObj = INDIAN_STATES.find(s => s.name === e.target.value);
                  if (stateObj) {
                    // Hacky way to update stateCode when state changes in RHFs
                    const event = new Event('input', { bubbles: true });
                    const input = document.getElementById('stateCodeInput') as HTMLInputElement;
                    if(input) {
                      input.value = stateObj.code;
                      input.dispatchEvent(event);
                    }
                  }
                }}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors appearance-none"
              >
                <option value="">Select state...</option>
                {INDIAN_STATES.map(s => <option key={s.name} value={s.name}>{s.name}</option>)}
              </select>
              {errors.state && <p className="text-red-400 text-xs">{errors.state.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">State Code</label>
              <input 
                id="stateCodeInput"
                {...register('stateCode')}
                readOnly
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 text-white/50 focus:outline-none"
              />
              {errors.stateCode && <p className="text-red-400 text-xs">{errors.stateCode.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">PIN Code</label>
              <input 
                {...register('pinCode')}
                maxLength={6}
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {errors.pinCode && <p className="text-red-400 text-xs">{errors.pinCode.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Phone Number</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40">+91</span>
                <input 
                  {...register('phone')}
                  className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 pl-12 pr-4 focus:border-emerald-500 focus:outline-none transition-colors"
                />
              </div>
              {errors.phone && <p className="text-red-400 text-xs">{errors.phone.message}</p>}
            </div>
            <div className="space-y-2">
              <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Business Email</label>
              <input 
                {...register('email')}
                type="email"
                className="w-full bg-[#1a1a1a] border border-white/10 rounded-xl h-12 px-4 focus:border-emerald-500 focus:outline-none transition-colors"
              />
              {errors.email && <p className="text-red-400 text-xs">{errors.email.message}</p>}
            </div>
          </div>
        </form>
      </div>

      {/* Live Preview */}
      <div className="w-full lg:w-[400px] shrink-0 lg:mt-[76px] flex flex-col gap-4">
        <button
          onClick={handleSubmit(onSubmit)}
          disabled={!isValid}
          className="w-full h-12 bg-emerald-500 text-black rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
        >
          Continue <ArrowRight size={16} />
        </button>
        <div className="bg-[#111] border border-white/10 rounded-2xl p-6 sticky top-24">
          <p className="text-[10px] font-black uppercase tracking-widest text-white/40 mb-4">Invoice Header Preview</p>
          <div className="border border-white/5 bg-[#1a1a1a] rounded-xl p-5 font-mono text-sm">
            <div className="font-bold text-base mb-1 text-emerald-400">{formValues.name || '[Business Name]'}</div>
            <div className="text-white/60 mb-2">{formValues.city || '[City]'}, {formValues.state || '[State]'} - {formValues.pinCode || '[PIN]'}</div>
            <div className="text-white/40 text-xs mb-3">{formValues.businessType || '[Business Type]'}</div>
            <div className="text-white/60 text-xs pt-3 border-t border-white/5 flex flex-col gap-1">
              <div>Ph: +91 {formValues.phone || '[Phone]'}</div>
              <div>Email: {formValues.email || '[Email]'}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
