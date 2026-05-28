import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { id } = await params;
    const { data: quote, error: fetchError } = await supabase
      .from('Quote')
      .select('*')
      .eq('id', id)
      .eq('userId', user.id)
      .single();

    if (fetchError || !quote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });
    
    // Check if already converted (or accepted)
    if (quote.status === 'accepted' || quote.status === 'purchased') {
      return NextResponse.json({ error: 'Already converted' }, { status: 400 });
    }

    // 1. Update Quote Status
    const { data: updatedQuote, error: updateError } = await supabase
      .from('Quote')
      .update({ status: 'accepted', updatedAt: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    // 2. Create Order
    const { data: order, error: insertError } = await supabase
      .from('Order')
      .insert({
        quoteId: id,
        status: 'pending',
        paymentStatus: 'pending',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select()
      .single();

    if (insertError) throw insertError;

    return NextResponse.json({ success: true, data: { order, quote: updatedQuote } });
  } catch (error) {
    console.error('Failed to convert quote', error);
    return NextResponse.json({ error: 'Failed to convert quote' }, { status: 500 });
  }
}
