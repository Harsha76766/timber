import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    // 1. Fetch Invoice with Customer and Organisation
    const { data: invoice, error: invErr } = await adminSupabase
      .from('Invoice')
      .select(`
        *,
        Customer (*),
        Organisation (*)
      `)
      .eq('id', id)
      .single();

    if (invErr) throw new Error(`Invoice fetch failed: ${invErr.message}`);

    // 2. Fetch Quote Items (linked via quotationId)
    let items: any[] = [];
    if (invoice.quotationId) {
      const { data: quoteItems, error: itemErr } = await adminSupabase
        .from('QuoteItem')
        .select(`
          *,
          Product (name, woodType, hsnCode)
        `)
        .eq('quoteId', invoice.quotationId);

      if (!itemErr && quoteItems) {
        items = quoteItems;
      }
    }

    return NextResponse.json({
      success: true,
      data: {
        invoice,
        customer: invoice.Customer,
        org: invoice.Organisation,
        items
      }
    });
  } catch (error: any) {
    console.error('Invoice detail error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
