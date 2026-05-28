'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';

export type OnboardingData = {
  business: any;
  gst: any;
  inventory: any[];
  customers: any[];
  team: any[];
};

export type FooterConfig = {
  onContinue: () => void;
  isContinuing?: boolean;
  hint?: string;
  disableContinue?: boolean;
};

type OnboardingContextType = {
  currentStep: number;
  completedSteps: number[];
  data: OnboardingData;
  updateData: (step: keyof OnboardingData, payload: any) => void;
  nextStep: (saveDataFunc?: () => Promise<boolean>) => Promise<void>;
  prevStep: () => void;
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  footer: FooterConfig | null;
  setFooter: (config: FooterConfig | null) => void;
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

export const STEPS = [
  { id: 1, title: 'Business Info', path: '/onboarding/business' },
  { id: 2, title: 'GST & Tax', path: '/onboarding/gst' },
  { id: 3, title: 'Inventory Setup', path: '/onboarding/inventory' },
  { id: 4, title: 'Customers', path: '/onboarding/customers' },
  { id: 5, title: 'Team & Roles', path: '/onboarding/team' },
  { id: 6, title: 'Ready!', path: '/onboarding/complete' },
];

export function OnboardingProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  
  const [footer, setFooter] = useState<FooterConfig | null>(null);
  
  const [data, setData] = useState<OnboardingData>({
    business: {},
    gst: {},
    inventory: [],
    customers: [],
    team: []
  });

  const currentStep = STEPS.find(s => s.path === pathname)?.id || 1;

  useEffect(() => {
    // Ideally fetch initial step & data from server here
    // For now we'll mock reading completed steps up to current
    const initialCompleted = Array.from({length: currentStep - 1}, (_, i) => i + 1);
    setCompletedSteps(initialCompleted);
  }, [currentStep]);

  const updateData = (stepKey: keyof OnboardingData, payload: any) => {
    setData(prev => ({ ...prev, [stepKey]: payload }));
  };

  const nextStep = async (saveDataFunc?: () => Promise<boolean>) => {
    setIsLoading(true);
    try {
      if (saveDataFunc) {
        const success = await saveDataFunc();
        if (!success) return;
      }
      
      // Update completion progress
      if (!completedSteps.includes(currentStep)) {
        setCompletedSteps(prev => [...prev, currentStep]);
      }
      
      // Save progress to DB
      await fetch('/api/v1/onboarding/progress', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ step: currentStep + 1 })
      });

      const next = STEPS.find(s => s.id === currentStep + 1);
      if (next) {
        router.push(next.path);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const prevStep = () => {
    const prev = STEPS.find(s => s.id === currentStep - 1);
    if (prev) {
      router.push(prev.path);
    }
  };

  return (
    <OnboardingContext.Provider value={{
      currentStep,
      completedSteps,
      data,
      updateData,
      nextStep,
      prevStep,
      isLoading,
      setIsLoading,
      footer,
      setFooter
    }}>
      {children}
    </OnboardingContext.Provider>
  );
}

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) throw new Error('useOnboarding must be used within OnboardingProvider');
  return context;
}
