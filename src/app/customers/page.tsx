import { redirect } from "next/navigation";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { Users } from "lucide-react";

import { createClient } from "@/utils/supabase/server";
import CustomerList from "./CustomerList";
import SyncCRMButton from "./SyncCRMButton";

type CustomerRow = {
  id: string;
  name: string;
  phone?: string | null;
  outstandingBalance?: number | null;
  lifetimeValue?: number | null;
  quotes?: { count: number }[];
};

export default async function CustomersCRM() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: customers, error } = await adminSupabase
    .from("Customer")
    .select("*, quotes:Quote(count)")
    .eq("userId", user.id)
    .order("lifetimeValue", { ascending: false });

  if (error) console.error("Error fetching customers:", error);

  const normalized = ((customers || []) as CustomerRow[]).map((customer) => ({
    ...customer,
    phone: customer.phone || "",
    lifetimeValue: customer.lifetimeValue || 0,
    outstandingBalance: customer.outstandingBalance || 0,
    orgId: user.id,
    _count: { quotes: customer.quotes?.[0]?.count || 0 },
  }));

  return (
    <main className="min-h-screen bg-[#0b0c0f] px-4 pb-28 pt-6 text-white">
      <div className="mx-auto max-w-3xl space-y-5">
        <header className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.22em] text-emerald-400">CRM</p>
            <h1 className="mt-1 text-3xl font-black tracking-tight">Client Directory</h1>
            <p className="mt-1 text-sm text-slate-400">Customers and balances from real sales data.</p>
          </div>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] text-emerald-300">
            <Users size={22} />
          </div>
        </header>

        <SyncCRMButton />
        <CustomerList customers={normalized} />
      </div>
    </main>
  );
}
