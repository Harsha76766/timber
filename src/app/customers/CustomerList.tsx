"use client";

import { AlertCircle, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface Customer {
  id: string;
  name: string;
  phone: string;
  email?: string;
  lifetimeValue: number;
  outstandingBalance: number;
  orgId: string;
  _count: { quotes: number };
}

export default function CustomerList({ customers }: { customers: Customer[] }) {
  return (
    <div className="space-y-3 relative z-10">
      {customers.map((c, i) => (
        <Link 
          key={c.id}
          href={`/customers/ledger/${c.id}`}
          className="bg-[#0a0a0a]/40 backdrop-blur-xl border border-white/5 p-6 rounded-[2rem] flex items-center justify-between hover:border-emerald-500/30 hover:bg-[#0a0a0a]/60 transition-all duration-300 active:scale-[0.98] group"
        >
          <div className="flex items-center gap-6">
            <div className="w-16 h-16 bg-gradient-to-br from-emerald-500/20 to-blue-500/5 rounded-2xl flex items-center justify-center text-emerald-400 font-black text-xl border border-white/5 group-hover:scale-105 transition-transform">
              {c.name.substring(0, 2).toUpperCase()}
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <p className="font-black text-white text-xl uppercase tracking-tighter italic group-hover:text-emerald-400 transition-colors">
                  {c.name}
                </p>
                {c.outstandingBalance > 0 && (
                  <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/10 text-rose-500 border border-rose-500/20 animate-pulse">
                    <span className="text-[9px] font-black uppercase tracking-widest">Dues</span>
                  </div>
                )}
              </div>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-[0.2em]">
                {c.phone || 'NO PHONE RECORD'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-10">
            <div className="text-right hidden sm:block">
              <p className="text-[10px] font-black text-slate-600 uppercase tracking-widest mb-1">Account Balance</p>
              <p className={`text-2xl font-black tracking-tighter ${c.outstandingBalance > 0 ? 'text-rose-500' : 'text-emerald-400'}`}>
                ₹{Math.abs(Math.round(c.outstandingBalance / 100)).toLocaleString('en-IN')}
              </p>
            </div>
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center text-slate-500 group-hover:bg-white group-hover:text-black transition-all">
              <ArrowRight size={20} />
            </div>
          </div>
        </Link>
      ))}
      
      {customers.length === 0 && (
        <div className="py-24 text-center bg-[#0a0a0a]/40 backdrop-blur-xl rounded-[3rem] border border-dashed border-white/10">
           <p className="text-slate-600 font-black uppercase tracking-widest text-xs">No Active Clients Found</p>
        </div>
      )}
    </div>
  );
}
