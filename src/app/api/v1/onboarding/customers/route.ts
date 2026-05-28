import { NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase.from('User').select('orgId').eq('id', session.user.id).single();
    
    if (!userData?.orgId) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 400 });
    }
    
    const body = await request.json();
    const { customers } = body;

    if (!Array.isArray(customers)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // First insert customers
    const customersToInsert = customers.map((c: any) => ({
      userId: session.user.id,
      name: c.name,
      phone: c.phone,
      gstin: c.gstin,
      company: c.name, 
    }));

    const { data: insertedCustomers, error: custError } = await supabase
      .from('Customer')
      .insert(customersToInsert)
      .select('id, name');

    if (custError) {
      console.error('Customer insert error:', custError);
      return NextResponse.json({ error: 'Failed to insert customers', details: custError.message }, { status: 500 });
    }

    // Now create KathaEntry for any customer with an opening balance
    const kathaEntries = [];
    if (insertedCustomers && insertedCustomers.length > 0) {
      for (const c of customers) {
        if (c.openingBalance > 0) {
          const inserted = insertedCustomers.find((ic: any) => ic.name === c.name);
          if (inserted) {
            kathaEntries.push({
              orgId: userData.orgId,
              customerId: inserted.id,
              entryType: 'OPENING_BALANCE',
              amount: c.openingBalance,
              balanceType: c.balanceType,
              notes: 'Opening Balance from Onboarding'
            });
          }
        }
      }

      if (kathaEntries.length > 0) {
        const { error: kathaError } = await supabase.from('KathaEntry').insert(kathaEntries);
        if (kathaError) {
          console.error('Katha insert error:', kathaError);
        }
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Customers API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
