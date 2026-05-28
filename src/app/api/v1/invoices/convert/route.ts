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
    const { branchId, customerId, groups, grandTotals } = body;

    if (!branchId || !customerId || !groups || groups.length === 0) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Since this is a complex transaction, ideally we'd use a Supabase RPC (stored procedure).
    // For this MVP, we will simulate the transaction by doing it sequentially.
    // In production, move this to a Postgres function to ensure atomicity.

    // 1. Create Invoice
    const { data: invoice, error: invoiceError } = await supabase
      .from('Invoice')
      .insert({
        orgId: userData.orgId,
        branchId,
        customerId,
        totalAmount: grandTotals.total, // Ensure it's in paise or standard format (here we expect frontend to send the integer total)
        totalVolume: grandTotals.volume,
        status: 'Unpaid'
      })
      .select()
      .single();

    if (invoiceError) throw invoiceError;

    // 2. Loop through groups and rows to deduct stock and create items
    for (const group of groups) {
      for (const row of group.rows) {
        // Calculate volume for this row (ideally backend validates this, but trusting frontend for MVP)
        const rowVol = row.calculatedVolume || 0; // Front end needs to send this
        
        // A. Insert InvoiceItem
        await supabase.from('InvoiceItem').insert({
          invoiceId: invoice.id,
          itemId: group.woodId,
          length: parseFloat(row.length),
          width: parseFloat(row.width),
          thickness: parseFloat(row.thickness),
          quantity: parseInt(row.quantity),
          unitL: row.unitL,
          unitW: row.unitW,
          unitT: row.unitT,
          volume: rowVol
        });

        // B. Deduct BranchStock
        // Note: Supabase JS doesn't have an atomic decrement without RPC.
        // We fetch, subtract, and update.
        const { data: stock } = await supabase
          .from('BranchStock')
          .select('currentStock')
          .eq('branchId', branchId)
          .eq('itemId', group.woodId)
          .single();
        
        let newStock = (stock?.currentStock || 0) - parseInt(row.quantity); // Deduct quantity or volume? Usually quantity for items, or volume for timber. Assuming volume if we sell by volume, but timber is often sold by piece.
        // We will just subtract quantity.
        
        await supabase
          .from('BranchStock')
          .upsert({
            branchId,
            itemId: group.woodId,
            currentStock: newStock
          }, { onConflict: 'branchId,itemId' });

        // C. Write to StockLedger
        await supabase.from('StockLedger').insert({
          orgId: userData.orgId,
          itemId: group.woodId,
          type: 'OUT',
          quantity: parseInt(row.quantity),
          volume: rowVol,
          referenceId: invoice.id,
          notes: 'Invoice Sale'
        });
      }
    }

    // 3. Create KathaEntry (Debit - Customer owes us)
    const { error: kathaError } = await supabase.from('KathaEntry').insert({
      orgId: userData.orgId,
      branchId,
      customerId,
      entryType: 'Invoice',
      amount: grandTotals.total, // In paise or standard unit
      balanceType: 'Dr',
      notes: `Invoice ${invoice.id}`
    });

    if (kathaError) throw kathaError;

    // Trigger on KathaEntry will automatically update Customer.currentBalance!

    return NextResponse.json({ success: true, invoice });
  } catch (error) {
    console.error('Invoice conversion error:', error);
    return NextResponse.json({ error: 'Failed to convert to invoice' }, { status: 500 });
  }
}
