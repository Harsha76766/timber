import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export async function GET() {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: products, error } = await adminSupabase
      .from('Product')
      .select('*')
      .eq('userId', user.id)
      .order('createdAt', { ascending: false });

    if (error) throw error;
    
    return NextResponse.json({ success: true, data: products });
  } catch (error: any) {
    console.error('Failed to fetch products', error);
    return NextResponse.json({ error: error?.message || 'Failed to fetch products' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    
    // Auth check uses the standard SSR client
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Auth failed' }, { status: 401 });
    }

    // Bypass RLS for insertion using the service_role key
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const adminSupabase = createAdminClient(supabaseUrl, serviceRoleKey);

    const { data: product, error } = await adminSupabase
      .from('Product')
      .insert({
        id: crypto.randomUUID(), // Generate ID since table lacks default
        userId: user.id,
        name: body.name,
        woodType: body.woodType,
        pricePerCft: body.pricePerCft,
        stock: body.stock || 0,
        hsnCode: body.hsnCode || '4407',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      .select();

    if (error) throw error;

    return NextResponse.json({ success: true, data: product });
  } catch (error: any) {
    console.error('Failed to create product', error);
    return NextResponse.json({ error: error?.message || 'Failed to create product', details: error }, { status: 500 });
  }
}
