import { redirect } from 'next/navigation';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import BusinessHubClient from './BusinessHubClient';

export default async function StatsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  // 1. Fetch user's orgId
  const { data: userData } = await adminSupabase
    .from('User')
    .select('orgId')
    .eq('id', user.id)
    .single();

  const userOrgId = userData?.orgId || '';

  // 2. Fetch invoices (using orgId) and catalog metrics (using userId/orgId)
  const [
    { data: invoices },
    { count: totalProducts },
    { count: totalCustomers },
    { data: quotes },
    { data: orgData }
  ] = await Promise.all([
    adminSupabase
      .from('Invoice')
      .select('*')
      .eq('orgId', userOrgId)
      .order('createdAt', { ascending: false }),
    adminSupabase.from('Product').select('id', { count: 'exact', head: true }).eq('userId', user.id),
    adminSupabase.from('Customer').select('id', { count: 'exact', head: true }).eq('userId', user.id),
    adminSupabase.from('Quote').select('status').eq('userId', user.id),
    adminSupabase.from('Organisation').select('*').eq('id', userOrgId).single()
  ]);

  const activeQuotesCount = quotes?.filter(q => q.status === 'sent' || q.status === 'draft').length || 0;

  return (
    <BusinessHubClient
      initialInvoices={(invoices || []) as any[]}
      totalProducts={totalProducts || 0}
      totalCustomers={totalCustomers || 0}
      activeQuotesCount={activeQuotesCount}
      initialOrg={orgData || null}
    />
  );
}
