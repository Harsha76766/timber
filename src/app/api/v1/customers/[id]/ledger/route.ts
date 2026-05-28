import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { id: customerId } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    // Fetch all financial data for this customer securely
    const [
      { data: invoices },
      { data: quotes },
      { data: payments }
    ] = await Promise.all([
      admin.from('Invoice').select('*').eq('customerId', customerId).order('createdAt', { ascending: false }),
      admin.from('Quote').select('*').eq('customerId', customerId).eq('status', 'purchased').order('createdAt', { ascending: false }),
      admin.from('Payment').select('*').eq('customerId', customerId).order('createdAt', { ascending: false })
    ]);

    return NextResponse.json({
      invoices: invoices || [],
      quotes: quotes || [],
      payments: payments || []
    });
  } catch (error: any) {
    console.error('Error fetching ledger:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
