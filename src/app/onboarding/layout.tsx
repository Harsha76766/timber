import React from 'react';
import { OnboardingProvider } from './OnboardingProvider';
import { StepSidebar } from './components/StepSidebar';
import { ProgressBar } from './components/ProgressBar';

export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <OnboardingProvider>
      <div className="flex flex-col md:flex-row min-h-screen bg-[#0a0a0a] text-white font-sans">
        {/* Mobile top progress bar */}
        <div className="md:hidden sticky top-0 z-50 shrink-0">
          <ProgressBar />
        </div>

        {/* Desktop sidebar */}
        <div className="hidden md:flex flex-col w-[220px] shrink-0 border-r border-white/10 p-6 sticky top-0 h-svh">
          <div className="mb-10">
            <h1 className="text-xl font-black tracking-tight text-emerald-400">TimberFlow</h1>
            <p className="text-xs text-white/50 mt-1 uppercase tracking-widest font-bold">Business Setup</p>
          </div>
          <StepSidebar />
          <div className="mt-auto pt-6 border-t border-white/10">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                AD
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-white">Admin User</span>
                <span className="text-[10px] text-white/40 uppercase font-black">Owner</span>
              </div>
            </div>
          </div>
        </div>

        {/* Main content area */}
        <div className="flex-1 flex flex-col relative">
          {/* Desktop Topbar */}
          <div className="hidden md:flex justify-between items-center px-10 py-6 border-b border-white/10">
            <div>
              <h2 className="text-lg font-bold">Setting up your account</h2>
            </div>
            <div className="flex items-center gap-6">
              <ProgressBar desktop />
              <button className="text-sm font-bold text-white/40 hover:text-white transition-colors">
                Skip setup &rarr;
              </button>
            </div>
          </div>
          
          {/* Mobile Topbar */}
          <div className="md:hidden flex justify-between items-center px-4 py-4 border-b border-white/10 shrink-0">
            <h2 className="text-sm font-bold text-emerald-400">TimberFlow Setup</h2>
            <button className="text-xs font-bold text-white/40 hover:text-white transition-colors">
              Skip &rarr;
            </button>
          </div>

          <main className="flex-1 overflow-y-auto pb-28 md:pb-0" role="main" aria-label="Onboarding Step">
            {children}
          </main>
        </div>
      </div>
    </OnboardingProvider>
  );
}
