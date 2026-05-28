'use client';

import React from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import clsx from 'clsx';

type StepFooterProps = {
  onContinue: () => void;
  isContinuing?: boolean;
  hint?: string;
  disableContinue?: boolean;
};

export function StepFooter({ onContinue, isContinuing, hint, disableContinue }: StepFooterProps) {
  const { currentStep, prevStep } = useOnboarding();
  const loading = isContinuing;

  return (
    <div className="fixed bottom-0 left-0 w-full bg-[#0d0d0d]/90 backdrop-blur-md border-t border-white/10 px-4 py-3 md:px-10 md:py-6 flex items-center justify-between gap-3 z-40">
      <div className="flex items-center gap-3">
        {currentStep > 1 && (
          <button 
            onClick={prevStep}
            disabled={loading}
            className="h-10 md:h-12 px-3 md:px-4 rounded-xl font-bold text-xs md:text-sm text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-1.5"
          >
            <ArrowLeft size={14} />
            <span className="hidden sm:inline">Back</span>
          </button>
        )}
        {hint && (
          <span className="hidden md:inline text-xs text-white/40">{hint}</span>
        )}
      </div>

      <button 
        onClick={onContinue}
        disabled={disableContinue || loading}
        aria-disabled={disableContinue || loading}
        className={clsx(
          "h-10 md:h-12 px-5 md:px-8 rounded-xl font-black text-xs md:text-sm flex items-center justify-center gap-2 transition-all whitespace-nowrap",
          (disableContinue || loading) 
            ? "bg-white/10 text-white/40 cursor-not-allowed border border-white/10" 
            : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95"
        )}
      >
        {loading ? (
          <Loader2 size={16} className="animate-spin" />
        ) : (
          <>
            {currentStep === 6 ? 'Complete Setup' : 'Continue'}
            {currentStep < 6 && <ArrowRight size={16} />}
          </>
        )}
      </button>
    </div>
  );
}
