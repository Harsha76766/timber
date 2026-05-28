import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const supabase = await createClient();
  
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    // 1. Get User's Org (in a real app this would be in the JWT/Session)
    const { data: userData } = await adminSupabase
      .from('User')
      .select('orgId')
      .eq('id', user.id)
      .single();

    if (!userData?.orgId) {
      return NextResponse.json({ data: [] });
    }

    // 2. Fetch Invoices for Org
    const { data, error } = await adminSupabase
      .from('Invoice')
      .select(`
        *,
        Customer(name, company)
      `)
      .eq('orgId', userData.orgId)
      .order('createdAt', { ascending: false });

    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    console.error('Invoice fetch error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
