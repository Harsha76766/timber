import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { redirect } from 'next/navigation';
import QuoteList from './QuoteList';

export default async function QuotesPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
  const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

  const { data: quotes, error } = await adminSupabase
    .from('Quote')
    .select('*, items:QuoteItem(*), customer:Customer(*)')
    .eq('userId', user.id)
    .order('createdAt', { ascending: false });

  if (error) {
    console.error('Error fetching quotes:', error);
  }

  return <QuoteList initialQuotes={quotes || []} />;
}
