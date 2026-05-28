'use client';

import React from 'react';
import { useOnboarding, STEPS } from '../OnboardingProvider';

export function ProgressBar({ desktop = false }: { desktop?: boolean }) {
  const { currentStep } = useOnboarding();
  const progressPct = Math.round((currentStep / STEPS.length) * 100);

  if (desktop) {
    return (
      <div className="flex items-center gap-4">
        <div className="w-32 h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div 
            className="h-full bg-amber-500 transition-all duration-500" 
            style={{ width: `${progressPct}%` }} 
          />
        </div>
        <span className="text-[10px] font-black text-white/40 uppercase tracking-widest">
          Step {currentStep} of {STEPS.length}
        </span>
      </div>
    );
  }

  return (
    <div className="w-full">
      <div className="h-1 w-full bg-white/10">
        <div 
          className="h-full bg-amber-500 transition-all duration-500" 
          style={{ width: `${progressPct}%` }} 
        />
      </div>
      <div className="bg-[#1a1a1a] px-4 py-2 border-b border-white/5 flex items-center justify-between">
        <span className="text-[10px] font-black text-amber-500 uppercase tracking-widest">
          Step {currentStep} of {STEPS.length}
        </span>
        <span className="text-xs font-bold text-white">
          {STEPS.find(s => s.id === currentStep)?.title}
        </span>
      </div>
    </div>
  );
}
