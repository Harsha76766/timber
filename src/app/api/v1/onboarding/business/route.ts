import { NextResponse } from 'next/server';
import { businessSchema } from '../../../../../lib/onboarding';
// Assume we have a createClient setup. The user said: "use supabase which we are using befor"
// Usually it's in src/utils/supabase/server.ts
import { createClient } from '../../../../../utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    
    // Auth check
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Since the database schema doesn't strictly have an orgId on the user in some setups,
    // we assume we fetch the user's organisation or the user themselves.
    // Based on the user's `User` and `Organisation` table setup from our check,
    // we'll update the Organisation table.
    const { data: userData } = await supabase.from('User').select('orgId').eq('id', session.user.id).single();

    const body = await request.json();
    const validatedData = businessSchema.parse(body);

    if (userData?.orgId) {
      // Update existing org
      await supabase.from('Organisation').update(validatedData).eq('id', userData.orgId);
    } else {
      // CREATE new org if missing
      const { data: newOrg, error: orgError } = await supabase
        .from('Organisation')
        .insert({
          ...validatedData,
          onboardingStep: 1,
          onboardingCompleted: false
        })
        .select()
        .single();

      if (orgError) throw orgError;

      // Link user to the new org
      await supabase
        .from('User')
        .update({ orgId: newOrg.id })
        .eq('id', session.user.id);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Business API Error:', error);
    return NextResponse.json({ error: 'Failed to save business data' }, { status: 500 });
  }
}
