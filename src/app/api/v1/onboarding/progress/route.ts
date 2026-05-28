import { NextResponse } from 'next/server';
import { createClient } from '../../../../../utils/supabase/server';

export async function PATCH(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { data: userData } = await supabase.from('User').select('orgId').eq('id', session.user.id).single();

    const body = await request.json();
    const { step, completed } = body;
    
    if (!userData?.orgId) {
      return NextResponse.json({ error: 'Organisation not found' }, { status: 400 });
    }

    const { error: updateError } = await supabase.from('Organisation').update({
      onboardingStep: step,
      onboardingCompleted: completed || step >= 6
    }).eq('id', userData.orgId);

    if (updateError) {
      return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
    }

    return NextResponse.json({ success: true, step });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update progress' }, { status: 500 });
  }
}
