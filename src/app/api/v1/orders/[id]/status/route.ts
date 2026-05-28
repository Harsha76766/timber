import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { id } = await params;
    const { data: order, error: fetchError } = await supabase
      .from('Order')
      .select('*, quote:Quote(*)')
      .eq('id', id)
      .single();

    if (fetchError || !order || (order.quote as any).userId !== user.id) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    const { data: updated, error: updateError } = await supabase
      .from('Order')
      .update({
        status: body.status,
        dispatchedAt: body.status === 'dispatched' ? new Date().toISOString() : undefined,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
  }
}
