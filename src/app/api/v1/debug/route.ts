import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
// Using anon key, we can try to get the column info using rest call

export async function GET() {
  try {
    const res = await fetch(`${supabaseUrl}/rest/v1/Product?limit=1`, {
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });

    // To get schema, we can do an OPTIONS request!
    const optionsRes = await fetch(`${supabaseUrl}/rest/v1/Product`, {
      method: 'OPTIONS',
      headers: {
        'apikey': supabaseKey,
        'Authorization': `Bearer ${supabaseKey}`
      }
    });
    
    // Or we can just insert and catch the error
    // Let's also do a dummy insert with a fake user id
    const { createClient } = require('@supabase/supabase-js');
    const db = createClient(supabaseUrl, supabaseKey);
    const { error } = await db.from('Product').insert({
      id: "123e4567-e89b-12d3-a456-426614174000",
      userId: "123e4567-e89b-12d3-a456-426614174000",
      name: "Test",
      woodType: "TEAK",
      pricePerCft: 100,
      stock: 0,
    });

    return NextResponse.json({
      insertError: error,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message, stack: error.stack }, { status: 500 });
  }
}
