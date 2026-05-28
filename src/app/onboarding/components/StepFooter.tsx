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
    <div className="fixed md:absolute bottom-0 left-0 w-full bg-[#0d0d0d]/90 backdrop-blur-md border-t border-white/10 p-4 md:px-10 md:py-6 flex flex-col md:flex-row md:items-center justify-between gap-4 z-40">
      <div className="flex items-center gap-4 order-2 md:order-1">
        {currentStep > 1 && (
          <button 
            onClick={prevStep}
            disabled={loading}
            className="h-12 px-4 rounded-xl font-bold text-white/60 hover:text-white hover:bg-white/5 transition-all flex items-center gap-2"
          >
            <ArrowLeft size={16} />
            Back
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
          "h-12 px-8 rounded-xl font-black flex items-center justify-center gap-2 transition-all order-1 md:order-2 w-full md:w-auto",
          (disableContinue || loading) 
            ? "bg-white/5 text-white/20 cursor-not-allowed" 
            : "bg-emerald-500 text-black hover:bg-emerald-400 active:scale-95"
        )}
      >
        {loading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            {currentStep === 6 ? 'Complete Setup' : 'Continue'}
            {currentStep < 6 && <ArrowRight size={18} />}
          </>
        )}
      </button>
    </div>
  );
}
