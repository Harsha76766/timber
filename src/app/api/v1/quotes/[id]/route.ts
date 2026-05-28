import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: quote, error } = await adminSupabase
      .from('Quote')
      .select('*, items:QuoteItem(*), customer:Customer(*)')
      .eq('id', id)
      .eq('userId', user.id)
      .single();

    if (error || !quote) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch quote' }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json();
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const { id } = await params;

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    // Get original quote
    const { data: oldQuote } = await adminSupabase
        .from('Quote')
        .select('*')
        .eq('id', id)
        .eq('userId', user.id)
        .single();
        
    if (!oldQuote) return NextResponse.json({ error: 'Quote not found' }, { status: 404 });

    // ALWAYS re-resolve customer by phone when confirming a purchase
    let finalCustomerId = oldQuote.customerId;
    let metadata: any = {};
    try { metadata = JSON.parse(body.notes || oldQuote.notes || '{}'); } catch {}
    const phone = metadata.customerPhone?.trim();
    const customerName = body.customerName?.trim();

    // Run customer resolution whenever we have a real name + phone on a purchase
    if (body.status === 'purchased' && customerName && phone) {
        console.log('[CRM] Resolving customer by phone:', phone, 'name:', customerName);
        
        // 1. Search by PHONE number (primary key for CRM)
        const { data: existingCust } = await adminSupabase
          .from('Customer')
          .select('id, name')
          .eq('userId', user.id)
          .eq('phone', phone)
          .limit(1)
          .maybeSingle();

        if (existingCust) {
          console.log('[CRM] Found existing customer:', existingCust.id, existingCust.name);
          finalCustomerId = existingCust.id;
          // Update name if it was Walk-In Buyer before
          if (existingCust.name?.toUpperCase() === 'WALK-IN BUYER' && customerName.toUpperCase() !== 'WALK-IN BUYER') {
            await adminSupabase.from('Customer').update({ name: customerName }).eq('id', existingCust.id);
          }
        } else {
          // 2. Create new customer with this phone
          console.log('[CRM] Creating new customer:', customerName, phone);
          const { data: userData } = await adminSupabase.from('User').select('orgId').eq('id', user.id).single();
          const { data: newCust, error: newCustErr } = await adminSupabase
            .from('Customer')
            .insert({
              userId: user.id,
              orgId: userData?.orgId,
              name: customerName,
              phone: phone,
              updatedAt: new Date().toISOString()
            })
            .select()
            .single();
          
          if (newCust) {
            console.log('[CRM] Created customer:', newCust.id);
            finalCustomerId = newCust.id;
          } else {
            console.error('[CRM] Failed to create customer:', newCustErr);
          }
        }
    } else if (body.status === 'purchased' && customerName && !phone) {
        // Fallback: search by name if no phone provided
        console.log('[CRM] No phone, resolving by name:', customerName);
        const { data: existingCust } = await adminSupabase
          .from('Customer')
          .select('id')
          .eq('userId', user.id)
          .ilike('name', customerName)
          .limit(1)
          .maybeSingle();

        if (existingCust) {
          finalCustomerId = existingCust.id;
        } else {
          const { data: userData } = await adminSupabase.from('User').select('orgId').eq('id', user.id).single();
          const { data: newCust } = await adminSupabase
            .from('Customer')
            .insert({
              userId: user.id,
              orgId: userData?.orgId,
              name: customerName,
              phone: '',
              updatedAt: new Date().toISOString()
            })
            .select()
            .single();
          if (newCust) finalCustomerId = newCust.id;
        }
    }
    
    console.log('[CRM] Final customerId:', finalCustomerId, '(was:', oldQuote.customerId, ')');

    const { data: quote, error } = await adminSupabase
      .from('Quote')
      .update({
        status: body.status,
        customerName: body.customerName || oldQuote.customerName,
        customerId: finalCustomerId,
        validUntil: body.validUntil ? new Date(body.validUntil).toISOString() : undefined,
        notes: body.notes,
        updatedAt: new Date().toISOString()
      })
      .eq('id', id)
      .eq('userId', user.id)
      .select()
      .single();

    if (error) throw error;

    // Financial update if moving from non-purchased to purchased
    if (body.status === 'purchased' && oldQuote.status !== 'purchased' && quote.customerId) {
        let metadata: any = {};
        try { metadata = JSON.parse(body.notes || quote.notes || '{}'); } catch {}
        
        // Final price and advance in Paise
        const finalPrice = typeof metadata.finalPriceRupees === 'number' ? metadata.finalPriceRupees * 100 : quote.totalPrice;
        const advance = typeof metadata.advanceRupees === 'number' ? metadata.advanceRupees * 100 : 0;

        const { data: cust } = await adminSupabase.from('Customer').select('lifetimeValue, outstandingBalance, orgId').eq('id', quote.customerId).single();
        if (cust) {
           // Update Customer Balances
           await adminSupabase.from('Customer').update({
               lifetimeValue: (cust.lifetimeValue || 0) + finalPrice,
               outstandingBalance: (cust.outstandingBalance || 0) + (finalPrice - advance)
           }).eq('id', quote.customerId);
           
           // Update Quote Paid Amount
           await adminSupabase.from('Quote').update({
               paidAmount: advance
           }).eq('id', quote.id);
           
           if (advance > 0 && cust.orgId) {
               await adminSupabase.from('Payment').insert({
                   orgId: cust.orgId,
                   customerId: quote.customerId,
                   quoteId: quote.id, // LINK TO THIS DEAL
                   amount: advance,
                   paymentMethod: 'CASH',
                   notes: `Advance for Quote/Purchase ${quote.id}`,
                   createdBy: user.id
               });
           }
        }
    }

    return NextResponse.json({ success: true, data: quote });
  } catch (error) {
    console.error('Update Quote Error:', error);
    return NextResponse.json({ error: 'Failed to update quote' }, { status: 500 });
  }
}
