import { NextResponse } from 'next/server';
import { gstSchema } from '../../../../../lib/onboarding';
import { createClient } from '../../../../../utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase.from('User').select('orgId').eq('id', session.user.id).single();

    const body = await request.json();
    const validatedData = gstSchema.parse(body);

    if (userData?.orgId) {
      await supabase.from('Organisation').update(validatedData).eq('id', userData.orgId);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('GST API Error:', error);
    return NextResponse.json({ error: 'Failed to save GST data' }, { status: 500 });
  }
}
