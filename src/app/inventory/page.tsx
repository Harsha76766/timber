import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Clock, Edit2, Package, Share2, Trees } from "lucide-react";

import NewProductButton from "@/components/NewProductButton";
import { createClient } from "@/utils/supabase/server";

type Product = {
  id: string;
  name: string;
  woodType?: string | null;
  category?: string | null;
  stock?: number | null;
  unit?: string | null;
  price?: number | null;
  length?: number | null;
  width?: number | null;
  thickness?: number | null;
  createdAt?: string | null;
};

export default async function InventoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: products, error } = await adminSupabase
    .from("Product")
    .select("*")
    .eq("userId", user.id)
    .order("createdAt", { ascending: false });

  if (error) console.error("Error fetching inventory:", error);

  const stock = (products || []) as Product[];
  const totalItems = stock.reduce((sum, item) => sum + Number(item.stock || 0), 0);
  const totalValue = stock.reduce((sum, item) => sum + Number(item.stock || 0) * Number(item.price || 0), 0);
  const catalogLink = `/catalog/${user.id}`;

  return (
    <main className="min-h-screen bg-[#0b0c0f] px-4 pb-28 pt-6 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">Stock register</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Inventory</h1>
            <p className="mt-1 text-sm text-slate-400">Real stock from your products table.</p>
          </div>
          <NewProductButton />
        </header>

        <section className="grid grid-cols-3 gap-3">
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Package className="text-emerald-400" size={18} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Products</p>
            <p className="mt-1 text-lg font-black">{stock.length}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Trees className="text-sky-400" size={18} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Stock</p>
            <p className="mt-1 text-lg font-black">{totalItems}</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
            <Clock className="text-amber-400" size={18} />
            <p className="mt-3 text-[10px] font-bold uppercase tracking-widest text-slate-500">Value</p>
            <p className="mt-1 text-lg font-black">₹{Math.round(totalValue / 100).toLocaleString("en-IN")}</p>
          </div>
        </section>

        <Link
          href={catalogLink}
          className="flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/20 bg-emerald-500/10 py-3 text-xs font-black uppercase tracking-widest text-emerald-300"
        >
          <Share2 size={15} />
          Share catalog
        </Link>

        <section className="space-y-3">
          {stock.length === 0 ? (
            <div className="rounded-3xl border border-dashed border-white/10 bg-white/[0.03] p-10 text-center">
              <Package className="mx-auto text-slate-600" size={34} />
              <p className="mt-4 text-sm font-black uppercase tracking-widest text-slate-400">No stock yet</p>
              <p className="mt-1 text-xs text-slate-600">Add products to start tracking inventory.</p>
            </div>
          ) : (
            stock.map((product) => (
              <div key={product.id} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-300">
                    <Trees size={22} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-black uppercase tracking-tight">{product.name}</p>
                    <p className="mt-1 text-[10px] font-bold uppercase tracking-widest text-slate-600">
                      {product.woodType || product.category || "Timber"} · {product.stock || 0} {product.unit || "pcs"}
                    </p>
                    {(product.length || product.width || product.thickness) && (
                      <p className="mt-2 text-xs font-semibold text-slate-400">
                        {product.width || 0}&quot; × {product.thickness || 0}&quot; × {product.length || 0}&apos;
                      </p>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="text-base font-black">₹{Math.round((product.price || 0) / 100).toLocaleString("en-IN")}</p>
                    <Link
                      href={`/inventory/${product.id}`}
                      className="mt-2 inline-flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-slate-500"
                    >
                      <Edit2 size={11} />
                      Edit
                    </Link>
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    </main>
  );
}
