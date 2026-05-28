'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '../OnboardingProvider';
import { CheckCircle2, ArrowRight } from 'lucide-react';

export default function CompleteStep() {
  const { data } = useOnboarding();
  const router = useRouter();

  const handleFinish = async () => {
    const res = await fetch('/api/v1/onboarding/progress', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ step: 6, completed: true })
    });

    if (!res.ok) {
      console.error('Failed to save onboarding progress');
      return;
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem('tf_show_welcome_tip', 'true');
    }

    router.push('/dashboard');
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] p-4 text-center max-w-2xl mx-auto">
      <div className="w-24 h-24 bg-emerald-500/20 rounded-full flex items-center justify-center mb-8">
        <CheckCircle2 size={48} className="text-emerald-400" />
      </div>

      <h1 className="text-4xl font-black mb-4">You're all set!</h1>
      <p className="text-white/50 text-lg mb-12">
        TimberFlow is tailored for <strong className="text-white">{data.business.name || 'your business'}</strong>. 
        You're ready to create your first quote.
      </p>

      <div className="w-full bg-[#111] border border-white/10 rounded-2xl p-6 text-left mb-12">
        <h3 className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">What's configured:</h3>
        <ul className="space-y-4">
          <li className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">GST profiles and tax calculation engine</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">Opening inventory ({data.inventory?.length || 0} items) with baseline margins</span>
          </li>
          <li className="flex items-center gap-3">
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
            <span className="text-sm font-medium">Customer Katha balances imported</span>
          </li>
        </ul>
      </div>

      <button 
        onClick={handleFinish}
        className="h-14 px-8 bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95 rounded-xl font-black flex items-center justify-center gap-3 transition-all w-full md:w-auto"
      >
        Go to Dashboard
        <ArrowRight size={20} />
      </button>
    </div>
  );
}
