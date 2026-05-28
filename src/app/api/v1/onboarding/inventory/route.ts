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
    const { items } = body;

    if (!Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    // Map onboarding inventory items to the new Item table
    const itemsToInsert = items.map((item: any) => ({
      orgId: userData.orgId, 
      name: item.name,
      grade: item.grade || null,
      hsnCode: item.hsnCode,
      gstRate: item.gstRate,
      unit: item.unit,
      costPrice: item.costPrice,
      sellingPrice: item.sellingPrice,
      currentStock: item.currentStock,
      minStockLevel: item.minStockLevel || 0,
      sortOrder: item.sortOrder || 0,
      isActive: true,
    }));

    const { error } = await supabase.from('Item').insert(itemsToInsert);

    if (error) {
      console.error('Insert error:', error);
      return NextResponse.json({ error: 'Failed to insert products', details: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Inventory API Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
