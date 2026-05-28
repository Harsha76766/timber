'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useOnboarding } from '../OnboardingProvider';
import { UploadCloud, Plus, Download, Trash2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { CustomerData, customerSchema } from '../../../lib/onboarding';

const createEmptyCustomer = (): CustomerData & { id: string } => ({
  id: crypto.randomUUID(),
  name: '',
  phone: '',
  gstin: '',
  openingBalance: 0,
  balanceType: 'None',
  creditLimit: 0
});

export default function CustomersStep() {
  const { data, updateData, nextStep, setFooter } = useOnboarding();
  const [customers, setCustomers] = useState<(CustomerData & { id: string })[]>(
    data.customers?.length > 0 ? data.customers : [createEmptyCustomer()]
  );

  const handleAdd = () => setCustomers([...customers, createEmptyCustomer()]);
  const handleRemove = (id: string) => setCustomers(customers.filter(c => c.id !== id));

  const handleChange = (id: string, field: keyof CustomerData, value: any) => {
    setCustomers(customers.map(c => c.id === id ? { ...c, [field]: value } : c));
  };

  const handleExcelImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const bstr = evt.target?.result;
      const wb = XLSX.read(bstr, { type: 'binary' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const data = XLSX.utils.sheet_to_json(ws);
      
      const imported = data.map((row: any) => ({
        id: crypto.randomUUID(),
        name: row['Customer Name'] || row.Name || '',
        phone: String(row.Phone || ''),
        gstin: row.GSTIN || '',
        openingBalance: parseFloat(row['Opening Balance']) || 0,
        balanceType: row['Balance Type'] || 'None',
        creditLimit: parseFloat(row['Credit Limit']) || 0
      }));

      setCustomers(prev => [...prev, ...imported]);
    };
    reader.readAsBinaryString(file);
  };

  const onSubmit = async () => {
    const validCustomers = customers.filter(c => c.name);
    
    updateData('customers', validCustomers);

    await nextStep(async () => {
      try {
        const res = await fetch('/api/v1/onboarding/customers', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customers: validCustomers })
        });
        return res.ok;
      } catch (err) {
        console.error(err);
        return false;
      }
    });
  };

  const onContinue = useCallback(() => {
    onSubmit();
  }, []);

  useEffect(() => {
    setFooter({ onContinue });
    return () => setFooter(null);
  }, [onContinue, setFooter]);

  return (
    <div className="p-4 md:p-10 max-w-5xl mx-auto">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-black mb-2">Import Customers</h1>
          <p className="text-white/50 text-sm">Add your customers and their opening balances (Katha).</p>
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <input 
              type="file" 
              accept=".xlsx, .xls" 
              onChange={handleExcelImport}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <button className="h-10 px-4 bg-white/10 hover:bg-white/20 rounded-xl text-xs font-bold flex items-center gap-2 transition-colors">
              <UploadCloud size={16} /> Import Excel
            </button>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        {customers.map((c, index) => (
          <div key={c.id} className="bg-[#1a1a1a] border border-white/10 rounded-xl p-4 flex flex-col md:flex-row gap-4">
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Name</label>
                <input 
                  value={c.name}
                  onChange={(e) => handleChange(c.id, 'name', e.target.value)}
                  placeholder="Customer Name"
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Phone</label>
                <input 
                  value={c.phone}
                  onChange={(e) => handleChange(c.id, 'phone', e.target.value)}
                  placeholder="9999999999"
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">GSTIN (Optional)</label>
                <input 
                  value={c.gstin}
                  onChange={(e) => handleChange(c.id, 'gstin', e.target.value)}
                  placeholder="GSTIN"
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Balance</label>
                <input 
                  type="number"
                  value={c.openingBalance || ''}
                  onChange={(e) => handleChange(c.id, 'openingBalance', parseFloat(e.target.value) || 0)}
                  placeholder="0.00"
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-3 text-sm focus:border-emerald-500 focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-white/60 uppercase">Type</label>
                <select 
                  value={c.balanceType}
                  onChange={(e) => handleChange(c.id, 'balanceType', e.target.value)}
                  className="w-full bg-[#111] border border-white/5 rounded-lg h-10 px-2 text-sm focus:border-emerald-500 focus:outline-none"
                >
                  <option value="None">None</option>
                  <option value="Dr">To Receive (Dr)</option>
                  <option value="Cr">To Pay (Cr)</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end items-center pt-5 md:pt-0">
              <button 
                onClick={() => handleRemove(c.id)}
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
        <Plus size={18} /> Add another customer
      </button>

    </div>
  );
}
