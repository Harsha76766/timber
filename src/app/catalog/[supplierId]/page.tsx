import { createClient } from '@/utils/supabase/server';
import { notFound } from 'next/navigation';
import CatalogCalculator from './CatalogCalculator';
import { Package } from 'lucide-react';

export default async function CatalogPage({ params }: { params: { supplierId: string } }) {
  const supabase = await createClient();
  
  // Try to resolve user
  const { data: supplier } = await supabase
    .from('User')
    .select('businessName, name, phone')
    .eq('id', params.supplierId)
    .single();

  if (!supplier) notFound();

  // Find their products
  const { data: products } = await supabase
    .from('Product')
    .select('*')
    .eq('userId', params.supplierId);

  if (!products) notFound();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans text-gray-900 pb-20">
      <div className="bg-emerald-900 text-white p-6 pt-12 pb-12 rounded-b-[2rem] shadow-sm">
        <h1 className="text-3xl font-bold tracking-tight">{supplier.businessName || supplier.name}'s Catalog</h1>
        <p className="text-emerald-100/80 font-medium mt-1">Live Timber Pricing & Estimation</p>
      </div>

      <div className="p-4 -mt-6">
        {products.length === 0 ? (
          <div className="bg-white rounded-3xl p-8 text-center shadow-sm border border-gray-100">
            <Package className="mx-auto text-gray-300 mb-3" size={32} />
            <p className="text-gray-500 font-semibold">This supplier hasn't added any wood yet.</p>
          </div>
        ) : (
          <CatalogCalculator products={products} supplierPhone={supplier.phone} />
        )}
      </div>
    </div>
  );
}
