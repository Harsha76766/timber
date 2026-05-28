import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { InventoryService } from '@/lib/services/inventoryService';
import { ArrowLeft, Package, TrendingUp, TrendingDown, Clock, User as UserIcon } from 'lucide-react';
import Link from 'next/link';

export default async function ProductLedgerPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient();
  const { id: productId } = await params;
  
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch Product Detail
  const { data: product, error: prodError } = await adminSupabase
    .from('Product')
    .select('*')
    .eq('id', productId)
    .single();

  if (prodError || !product) {
    console.error('Product fetch error:', prodError);
    return <div className="p-10 text-white">Product not found</div>;
  }

  // 2. Fetch History
  const history = await InventoryService.getHistory(supabase, productId);

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 pb-20 md:p-8">
      <div className="max-w-4xl mx-auto">
        {/* Back Button */}
        <Link href="/inventory" className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-6 text-sm font-medium">
          <ArrowLeft size={16} />
          Back to Stock List
        </Link>

        {/* Header Section */}
        <div className="bg-gradient-to-br from-emerald-500/20 to-transparent border border-emerald-500/10 p-8 rounded-[2.5rem] mb-8 relative overflow-hidden">
          <div className="relative z-10">
            <p className="text-[10px] font-black uppercase text-emerald-500 tracking-[0.2em] mb-2">Inventory Audit</p>
            <h1 className="text-3xl font-black tracking-tighter mb-1 uppercase">{product.name}</h1>
            <p className="text-slate-400 text-xs font-bold tracking-widest uppercase">{product.woodType} / HSN: {product.hsnCode || 'N/A'}</p>
            
            <div className="mt-8 grid grid-cols-2 gap-4">
              <div className="bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Current Stock</p>
                <div className="flex items-center gap-2">
                   <Package className="text-emerald-500" size={18} />
                   <p className="text-2xl font-black">{product.stock || 0} <span className="text-xs text-slate-500">CFT</span></p>
                </div>
              </div>
              <div className="bg-black/20 backdrop-blur-xl p-4 rounded-2xl border border-white/5">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Selling Price</p>
                <p className="text-2xl font-black">₹{(product.pricePerCft / 100).toLocaleString('en-IN')} <span className="text-xs text-slate-500">/ CFT</span></p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 p-8 opacity-5 pointer-events-none">
             <Package size={150} />
          </div>
        </div>

        {/* Timeline */}
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-[0.1em] mb-4 flex items-center gap-2">
          <Clock size={16} />
          Movement History
        </h3>
        
        <div className="space-y-4">
          {history && history.length > 0 ? (
            history.map((entry: any) => (
              <div key={entry.id} className="bg-[#141417] border border-white/5 rounded-3xl p-5 flex items-center justify-between group hover:border-white/10 transition-all">
                <div className="flex items-center gap-4">
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${
                    entry.quantity > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-rose-500/10 text-rose-500'
                  }`}>
                    {entry.quantity > 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm tracking-tight">{entry.transactionType}</p>
                      <span className="text-[10px] text-slate-600 font-bold uppercase bg-white/5 px-2 py-0.5 rounded-lg">
                        {new Date(entry.createdAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-1">
                       <span className="text-xs text-slate-400 font-medium">{entry.notes || 'No notes provided'}</span>
                       <span className="w-1 h-1 bg-slate-700 rounded-full"></span>
                       <span className="text-[10px] text-slate-500 flex items-center gap-1">
                          <UserIcon size={12} />
                          {entry.createdBy?.name || 'System'}
                       </span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className={`font-black text-lg ${entry.quantity > 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {entry.quantity > 0 ? '+' : ''}{entry.quantity}
                  </p>
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Balance: {entry.balanceAfter} CFT</p>
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center bg-[#141417] rounded-[2.5rem] border border-dashed border-white/5">
               <Package className="mx-auto text-slate-800 mb-4" size={48} />
               <p className="text-slate-500 font-bold uppercase text-xs">No movements recorded</p>
               <p className="text-slate-600 text-[10px] uppercase font-bold tracking-widest mt-2">Adjust stock to see activity</p>
            </div>
          )}
        </div>
      </div>
      <div className="h-20" />
    </div>
  );
}
