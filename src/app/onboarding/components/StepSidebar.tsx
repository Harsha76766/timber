'use client';

import React from 'react';
import { useOnboarding, STEPS } from '../OnboardingProvider';
import { Check } from 'lucide-react';
import clsx from 'clsx';

export function StepSidebar() {
  const { currentStep, completedSteps } = useOnboarding();

  return (
    <div className="flex flex-col gap-6 relative">
      {/* Connector line */}
      <div className="absolute left-3 top-4 bottom-4 w-px bg-white/10 -z-10" />

      {STEPS.map((step, index) => {
        const isCurrent = step.id === currentStep;
        const isCompleted = completedSteps.includes(step.id) || step.id < currentStep;
        const isUpcoming = !isCurrent && !isCompleted;

        return (
          <div key={step.id} className="flex items-center gap-4 relative">
            <div className={clsx(
              "w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black transition-colors z-10",
              isCompleted ? "bg-emerald-500 text-black" : 
              isCurrent ? "bg-amber-500 text-black" : 
              "bg-[#1a1a1a] text-white/40 border border-white/10"
            )}>
              {isCompleted ? <Check size={12} strokeWidth={4} /> : step.id}
            </div>
            <span className={clsx(
              "text-xs font-bold transition-colors",
              isCurrent ? "text-amber-500" :
              isCompleted ? "text-white" :
              "text-white/40"
            )}>
              {step.title}
            </span>
          </div>
        );
      })}
    </div>
  );
}
