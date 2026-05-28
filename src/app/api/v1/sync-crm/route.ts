import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/**
 * ONE-TIME SYNC: Re-link all purchased quotes to correct CRM customers by phone number.
 * Also recalculates lifetimeValue and outstandingBalance for ALL customers.
 * 
 * Call via: POST /api/v1/sync-crm
 */
export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Auth failed' }, { status: 401 });

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const admin = createAdminClient(supabaseUrl, serviceRoleKey);

    const log: string[] = [];

    // 1. Fetch ALL purchased quotes for this user
    const { data: purchasedQuotes, error: qErr } = await admin
      .from('Quote')
      .select('*')
      .eq('userId', user.id)
      .eq('status', 'purchased');

    if (qErr) throw qErr;
    log.push(`Found ${purchasedQuotes?.length || 0} purchased quotes`);

    // 2. Get user's orgId
    const { data: userData } = await admin.from('User').select('orgId').eq('id', user.id).single();
    const orgId = userData?.orgId;

    // 3. For each purchased quote, resolve the correct customer by phone
    for (const q of purchasedQuotes || []) {
      let meta: any = {};
      try { meta = JSON.parse(q.notes || '{}'); } catch {}
      
      const phone = meta.customerPhone?.trim();
      const name = q.customerName?.trim() || 'Unknown';
      
      if (!phone) {
        log.push(`⏭ Quote ${q.id.substring(0,8)}: No phone, skipping`);
        continue;
      }

      // Find or create customer by phone
      let { data: cust } = await admin
        .from('Customer')
        .select('id, name')
        .eq('userId', user.id)
        .eq('phone', phone)
        .limit(1)
        .maybeSingle();

      if (!cust) {
        // Create new customer
        const { data: newCust } = await admin
          .from('Customer')
          .insert({
            userId: user.id,
            orgId,
            name: name,
            phone: phone,
            updatedAt: new Date().toISOString()
          })
          .select()
          .single();
        cust = newCust;
        log.push(`✅ Created customer "${name}" (${phone})`);
      } else {
        // Update name if it was Walk-In
        if (cust.name?.toUpperCase() === 'WALK-IN BUYER' && name.toUpperCase() !== 'WALK-IN BUYER') {
          await admin.from('Customer').update({ name }).eq('id', cust.id);
          log.push(`📝 Renamed "${cust.name}" → "${name}" (${phone})`);
        }
      }

      if (cust) {
        // Re-link the quote to the correct customer
        if (q.customerId !== cust.id) {
          await admin.from('Quote').update({ customerId: cust.id }).eq('id', q.id);
          log.push(`🔗 Linked quote ${q.id.substring(0,8)} ("${name}") → Customer ${cust.id.substring(0,8)}`);
        }
      }
    }

      // 4. Reset ALL customer financials and recalculate from scratch
      const { data: allCustomers } = await admin
        .from('Customer')
        .select('id')
        .eq('userId', user.id);

      for (const c of allCustomers || []) {
        // A. Sum up all purchased quotes for this customer (DEBITS)
        const { data: custQuotes } = await admin
          .from('Quote')
          .select('id, totalPrice, notes')
          .eq('customerId', c.id)
          .eq('status', 'purchased');

        let totalSales = 0;
        let totalAdvancesFromQuotes = 0;

        for (const cq of custQuotes || []) {
          let m: any = null;
          try { 
            if (cq.notes && cq.notes.trim().startsWith('{')) {
              m = JSON.parse(cq.notes);
            }
          } catch {}
          
          const salePrice = (m && typeof m.negotiatedPricePaise === 'number') 
            ? m.negotiatedPricePaise 
            : ((m && typeof m.finalPriceRupees === 'number') ? m.finalPriceRupees * 100 : cq.totalPrice);
          
          const advance = (m && typeof m.advanceRupees === 'number') ? m.advanceRupees * 100 : 0;
          
          // Find other payments linked to THIS specific quote
          const { data: linkedPayments } = await admin
            .from('Payment')
            .select('amount')
            .eq('quoteId', cq.id);
          
          const otherPayments = linkedPayments?.reduce((acc, p) => acc + p.amount, 0) || 0;
          const totalPaidOnQuote = advance + otherPayments;

          // Update Quote paidAmount for the per-deal ledger
          await admin.from('Quote').update({
             paidAmount: totalPaidOnQuote
          }).eq('id', cq.id);

          totalSales += salePrice;
          totalAdvancesFromQuotes += advance; // We only add advance here, other payments come from the Payment table sum below
        }

        // B. Sum up ALL payments for this customer (CREDITS)
        const { data: allPayments } = await admin
          .from('Payment')
          .select('amount')
          .eq('customerId', c.id);
        
        const totalPaymentsReceived = (allPayments?.reduce((acc, p) => acc + p.amount, 0) || 0) + totalAdvancesFromQuotes;
        const outstanding = totalSales - totalPaymentsReceived;

        await admin.from('Customer').update({
          lifetimeValue: totalSales,
          outstandingBalance: outstanding
        }).eq('id', c.id);

        if (totalSales > 0) {
          log.push(`💰 Customer ${c.id.substring(0,8)}: Sales=₹${Math.round(totalSales/100)}, Paid=₹${Math.round(totalPaymentsReceived/100)}, Outstanding=₹${Math.round(outstanding/100)}`);
        }
      }

    log.push(`\n✅ Sync complete! Per-deal balances initialized.`);

    return NextResponse.json({ success: true, log });
  } catch (error: any) {
    console.error('Sync CRM Error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
