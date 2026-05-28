'use client';

import React, { useState } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { Plus, Trash2, Shield, User as UserIcon, ArrowRight, Loader2 } from 'lucide-react';
import { TeamMemberData } from '../../../lib/onboarding';

export default function TeamStep() {
  const { data, updateData, nextStep, isLoading } = useOnboarding();
  const [team, setTeam] = useState<TeamMemberData[]>(
    data.team?.length > 0 ? data.team : [{ emailOrPhone: '', role: 'Staff' }]
  );

  const handleAdd = () => setTeam([...team, { emailOrPhone: '', role: 'Staff' }]);
  const handleRemove = (index: number) => setTeam(team.filter((_, i) => i !== index));

  const handleChange = (index: number, field: keyof TeamMemberData, value: string) => {
    const newTeam = [...team];
    newTeam[index] = { ...newTeam[index], [field]: value };
    setTeam(newTeam);
  };

  const onSubmit = async () => {
    const validTeam = team.filter(t => t.emailOrPhone);
    updateData('team', validTeam);

    await nextStep(async () => {
      try {
        // We will hit the team API, though in a real app this sends invites
        const res = await fetch('/api/v1/onboarding/team', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ team: validTeam })
        });
        return res.ok;
      } catch (err) {
        console.error(err);
        return false;
      }
    });
  };

  return (
    <div className="p-4 md:p-10 max-w-3xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-black mb-2">Invite your team</h1>
        <p className="text-white/50 text-sm">Add partners, accountants, or sales staff. You can also do this later.</p>
      </div>

      <div className="bg-[#111] border border-white/10 rounded-2xl p-6 mb-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="w-10 h-10 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
            YOU
          </div>
          <div>
            <div className="text-sm font-bold">Admin (Owner)</div>
            <div className="text-xs text-white/50">Full access to billing, settings, and all data.</div>
          </div>
          <div className="ml-auto">
            <Shield size={18} className="text-emerald-400" />
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {team.map((member, index) => (
          <div key={index} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Email or Phone</label>
                <input 
                  value={member.emailOrPhone}
                  onChange={(e) => handleChange(index, 'emailOrPhone', e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Role</label>
                <select 
                  value={member.role}
                  onChange={(e) => handleChange(index, 'role', e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="Admin">Admin (Full Access)</option>
                  <option value="Accountant">Accountant (No Edit Invoices)</option>
                  <option value="Staff">Sales Staff (Create only)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end items-center pt-5 md:pt-0">
              <button 
                onClick={() => handleRemove(index)}
                className="w-10 h-10 rounded-lg flex items-center justify-center text-red-500/50 hover:bg-red-500/10 hover:text-red-500 transition-colors"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <button 
        onClick={handleAdd}
        className="mt-6 w-full h-14 border-2 border-dashed border-white/10 rounded-xl text-white/40 font-bold hover:border-white/20 hover:text-white flex items-center justify-center gap-2 transition-colors"
      >
        <Plus size={18} /> Invite another member
      </button>

      <button
        onClick={onSubmit}
        disabled={isLoading}
        className="mt-6 w-full h-14 bg-emerald-500 text-black rounded-xl font-black text-sm flex items-center justify-center gap-2 transition-all disabled:bg-white/10 disabled:text-white/40 disabled:cursor-not-allowed"
      >
        {isLoading ? <Loader2 size={16} className="animate-spin" /> : <>Continue <ArrowRight size={16} /></>}
      </button>
    </div>
  );
}
