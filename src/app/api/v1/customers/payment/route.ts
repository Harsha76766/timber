import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase.from('User').select('orgId').eq('id', session.user.id).single();
    if (!userData?.orgId) {
      return NextResponse.json({ error: 'No organization found' }, { status: 400 });
    }

    const body = await request.json();
    const { customerId, branchId, amount, notes } = body;

    if (!customerId || !branchId || !amount) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Insert a Credit entry in KathaEntry (Customer paying us)
    const { data, error } = await supabase
      .from('KathaEntry')
      .insert({
        orgId: userData.orgId,
        branchId,
        customerId,
        entryType: 'Payment Received',
        amount: amount,
        balanceType: 'Cr',
        notes: notes || 'Manual Payment'
      })
      .select()
      .single();

    if (error) throw error;

    // The Supabase trigger we added in Phase 1 will automatically update Customer.currentBalance!

    return NextResponse.json({ success: true, entry: data });
  } catch (error) {
    console.error('Payment API error:', error);
    return NextResponse.json({ error: 'Failed to record payment' }, { status: 500 });
  }
}
