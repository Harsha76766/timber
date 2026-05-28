import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { PaymentService, PaymentParams } from '@/lib/services/paymentService';

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    
    // We use admin client to ensure we can update multiple tables (Customer/Invoice/Payment)
    // while bypass RLS for this specific sensitive transaction logic.
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const adminSupabase = createAdminClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, serviceRoleKey);

    const paymentParams: PaymentParams = {
      orgId: body.orgId,
      customerId: body.customerId,
      invoiceId: body.invoiceId,
      quoteId: body.quoteId,
      amount: body.amount,
      paymentMethod: body.paymentMethod,
      notes: body.notes,
      userId: user.id
    };

    const payment = await PaymentService.recordPayment(adminSupabase, paymentParams);

    return NextResponse.json(payment);
  } catch (error: any) {
    console.error('Payment Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
