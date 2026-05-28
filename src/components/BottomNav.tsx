"use client";

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { Calculator, LayoutDashboard, FileText, Package, Users, Plus } from 'lucide-react';

export default function BottomNav() {
  const pathname = usePathname();

  // Hide BottomNav on login page
  if (pathname === '/login') return null;

  return (
    <nav className="fixed bottom-0 inset-x-0 bg-[#0d0d0d]/80 backdrop-blur-xl border-t border-white/5 px-6 py-4 flex justify-between items-center z-50">
      <Link href="/stats" className="flex flex-col items-center gap-1.5 group">
        <div className={`p-2 rounded-2xl transition-all ${pathname === '/stats' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'text-gray-600 group-hover:text-emerald-400'}`}>
          <LayoutDashboard size={20} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/stats' ? 'text-emerald-400' : 'text-gray-700'}`}>Stats</span>
      </Link>

      <Link href="/quotes" className="flex flex-col items-center gap-1.5 group">
        <div className={`p-2 rounded-2xl transition-all ${pathname === '/quotes' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'text-gray-600 group-hover:text-emerald-400'}`}>
          <FileText size={20} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/quotes' ? 'text-emerald-400' : 'text-gray-700'}`}>History</span>
      </Link>

      {/* Floating Action Button for Calculator */}
      <div className="relative -mt-12">
        <Link href="/" className="flex flex-col items-center group">
          <div className={`w-16 h-16 rounded-[24px] shadow-2xl flex items-center justify-center transition-all active:scale-90 border-4 border-[#0a0a0a] ${
            pathname === '/' 
            ? 'bg-gradient-to-br from-emerald-400 to-teal-600 text-black shadow-emerald-500/20 rotate-45' 
            : 'bg-[#1a1a1a] text-emerald-400 group-hover:bg-emerald-500 group-hover:text-black shadow-black/40'
          }`}>
            <Plus size={28} strokeWidth={3} className={pathname === '/' ? '-rotate-45' : ''} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500 mt-2">Calculator</span>
        </Link>
      </div>

      <Link href="/inventory" className="flex flex-col items-center gap-1.5 group">
        <div className={`p-2 rounded-2xl transition-all ${pathname === '/inventory' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'text-gray-600 group-hover:text-emerald-400'}`}>
          <Package size={20} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/inventory' ? 'text-emerald-400' : 'text-gray-700'}`}>Stock</span>
      </Link>

      <Link href="/customers" className="flex flex-col items-center gap-1.5 group">
        <div className={`p-2 rounded-2xl transition-all ${pathname === '/customers' ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/25' : 'text-gray-600 group-hover:text-emerald-400'}`}>
          <Users size={20} />
        </div>
        <span className={`text-[9px] font-black uppercase tracking-widest ${pathname === '/customers' ? 'text-emerald-400' : 'text-gray-700'}`}>CRM</span>
      </Link>
    </nav>
  );
}
