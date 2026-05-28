"use client";

import { useState } from 'react';
import { Plus, X } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function NewProductButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleAdd = async (e: any) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.target);
    const priceRupees = parseFloat(formData.get('price') as string);

    try {
      const res = await fetch('/api/v1/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.get('name'),
          woodType: formData.get('type'),
          pricePerCft: Math.round(priceRupees * 100)
        })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert('Failed to save wood: ' + (errorData.error || 'Unknown error') + '\nDetails: ' + JSON.stringify(errorData.details || {}));
        setLoading(false);
        return;
      }

      setLoading(false);
      setIsOpen(false);
      router.refresh();
    } catch (err: any) {
      alert('Network error: ' + err.message);
      setLoading(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)}
        className="w-12 h-12 bg-gray-900 text-white rounded-2xl flex items-center justify-center shadow-lg hover:bg-gray-800 transition-transform active:scale-95"
      >
        <Plus size={24} />
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-gray-900/40 z-[60] flex items-end justify-center sm:items-center">
          <div className="bg-white w-full max-w-md rounded-t-[2rem] sm:rounded-3xl p-6 pb-12 sm:pb-6 animate-in slide-in-from-bottom-5 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold text-gray-900">Add Wood Profile</h2>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 bg-gray-100 p-2 rounded-full hover:bg-gray-200">
                <X size={20}/>
              </button>
            </div>
            
            <form onSubmit={handleAdd} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Wood Name / Grade</label>
                <input required name="name" placeholder="e.g. Premium Teak Wood A-Grade" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-emerald-500 transition-colors" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Category</label>
                <select required name="type" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-emerald-500 transition-colors">
                  <option value="TEAK">Teak Wood</option>
                  <option value="PINE">Pine Wood</option>
                  <option value="SAL">Sal Wood</option>
                  <option value="ROSEWOOD">Rosewood</option>
                  <option value="PLYWOOD">Plywood / Boards</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-700 mb-1.5 block">Price per CFT (₹)</label>
                <input required type="number" step="0.01" name="price" placeholder="850.00" className="w-full border border-gray-200 p-3.5 rounded-xl bg-gray-50 outline-none focus:border-emerald-500 font-bold text-lg transition-colors" />
              </div>
              <button disabled={loading} className="w-full bg-emerald-600 text-white font-bold py-4 rounded-xl mt-4 active:scale-[0.98] transition-transform disabled:opacity-50 hover:bg-emerald-700">
                {loading ? 'Saving...' : 'Save Product'}
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
