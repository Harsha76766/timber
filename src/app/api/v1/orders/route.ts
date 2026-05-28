import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    let query = supabase
      .from('Order')
      .select('*, quote:Quote!inner(*, customer:Customer(*), items:QuoteItem(*))')
      .eq('quote.userId', user.id)
      .order('createdAt', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data: orders, error } = await query;

    if (error) throw error;

    return NextResponse.json({ success: true, data: orders });
  } catch (error) {
    console.error('Failed to get orders', error);
    return NextResponse.json({ error: 'Failed to get orders' }, { status: 500 });
  }
}
