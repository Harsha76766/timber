import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { AlertCircle, CreditCard, FileText, Package, ShoppingBag, TrendingUp, Users } from 'lucide-react';

export default async function DashboardPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  const [
    { data: invoices },
    { count: totalProducts },
    { count: totalCustomers },
    { data: quotes }
  ] = await Promise.all([
    adminSupabase.from('Invoice').select('*').limit(100),
    adminSupabase.from('Product').select('id', { count: 'exact', head: true }),
    adminSupabase.from('Customer').select('id', { count: 'exact', head: true }),
    adminSupabase.from('Quote').select('status', { count: 'exact' })
  ]);

  const totalRevenue = (invoices?.reduce((acc, inv) => acc + (inv.subtotal || 0), 0) || 0) / 100;
  const totalReceivables = (invoices?.reduce((acc, inv) => acc + ((inv.grandTotal || 0) - (inv.paidAmount || 0)), 0) || 0) / 100;
  const gstLiability = (invoices?.reduce((acc, inv) => acc + (inv.totalGst || 0), 0) || 0) / 100;
  const activeQuotes = quotes?.filter(q => q.status === 'sent' || q.status === 'draft').length || 0;

  const stats = [
    { name: 'Total Revenue', value: `₹${totalRevenue.toLocaleString('en-IN')}`, icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { name: 'Receivables', value: `₹${totalReceivables.toLocaleString('en-IN')}`, icon: CreditCard, color: 'text-rose-400', bg: 'bg-rose-400/10' },
    { name: 'GST Liability', value: `₹${gstLiability.toLocaleString('en-IN')}`, icon: AlertCircle, color: 'text-amber-500', bg: 'bg-amber-500/10' },
    { name: 'Active Quotes', value: activeQuotes, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-400/10' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white p-4 pb-28 md:p-8">
      <div className="flex justify-between items-start mb-8">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Business Hub</h1>
          <p className="text-slate-500 text-sm">Real-time performance overview</p>
        </div>
        <div className="bg-[#141417] border border-white/5 p-2 px-4 rounded-xl text-xs font-semibold text-slate-400">
          FY 2024-25
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {stats.map((stat) => (
          <div key={stat.name} className="bg-[#141417] border border-white/5 p-5 rounded-3xl">
            <div className={`w-10 h-10 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center mb-4`}>
              <stat.icon size={20} />
            </div>
            <p className="text-[10px] uppercase tracking-widest text-slate-500 font-bold mb-1">{stat.name}</p>
            <h3 className="text-xl font-extrabold tracking-tight">{stat.value}</h3>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 bg-[#141417] border border-white/5 rounded-[2rem] p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-bold">Recent Invoices</h3>
            <Link href="/invoices" className="text-emerald-500 text-xs font-semibold hover:underline">View All</Link>
          </div>
          <div className="space-y-4">
            {invoices && invoices.length > 0 ? invoices.slice(0, 5).map((inv) => (
              <div key={inv.id} className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/[0.03]">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 bg-slate-800 rounded-xl flex items-center justify-center text-slate-400">
                    <FileText size={18} />
                  </div>
                  <div>
                    <p className="text-sm font-bold">{inv.invoiceNumber}</p>
                    <p className="text-[10px] text-slate-500 font-medium uppercase">{new Date(inv.invoiceDate).toLocaleDateString('en-IN')}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold">₹{(inv.grandTotal / 100).toLocaleString('en-IN')}</p>
                  <p className={`text-[10px] font-bold ${inv.status === 'PAID' ? 'text-emerald-500' : 'text-amber-500'}`}>{inv.status}</p>
                </div>
              </div>
            )) : (
              <div className="py-10 text-center text-slate-600 italic text-sm">No recent transactions</div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="bg-emerald-600 rounded-[2rem] p-6 text-white shadow-xl shadow-emerald-900/20">
            <h3 className="text-lg font-bold mb-2">New Sale?</h3>
            <p className="text-emerald-100 text-xs mb-6 leading-relaxed">Create a quotation and convert it to a GST invoice.</p>
            <Link href="/" className="bg-white text-emerald-600 w-full py-3 rounded-2xl font-bold text-sm block text-center hover:bg-emerald-50 transition-colors">
              Start Calculator
            </Link>
          </div>

          <div className="bg-[#141417] border border-white/5 rounded-[2rem] p-6">
            <h3 className="text-lg font-bold mb-4 flex items-center gap-2">
              <Package size={20} className="text-blue-400" />
              Stock Overview
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Items</p>
                <p className="text-xl font-bold">{totalProducts || 0}</p>
              </div>
              <div className="bg-white/5 p-4 rounded-2xl">
                <p className="text-[10px] text-slate-500 font-bold uppercase mb-1">Customers</p>
                <p className="text-xl font-bold">{totalCustomers || 0}</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
