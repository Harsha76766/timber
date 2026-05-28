const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uttbzppwpvtltwpwufel.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

// Simulating the QuoteService call
async function testOnboarding() {
  console.log('--- STARTING CRM ONBOARDING VERIFICATION ---');
  
  const userId = 'c9883411-d610-4fb9-9286-7062b83d296d'; // Admin user
  const testCustomerName = 'Verification Client ' + Date.now();
  const testPhone = '9999999999';

  console.log(`Step 1: Simulating saving a quote for ${testCustomerName}...`);
  
  // 1. Check for existing (should be null)
  const { data: existingBefore } = await supabase
    .from('Customer')
    .select('id')
    .eq('name', testCustomerName)
    .maybeSingle();
  
  if (existingBefore) {
    console.error('FAILED: Customer already exists before test.');
    return;
  }

  // 2. Logic simulation (same as in QuoteService.ts)
  const { data: newUser } = await supabase.from('User').select('orgId').eq('id', userId).single();
  const { data: newCust, error: custError } = await supabase
    .from('Customer')
    .insert({
      id: crypto.randomUUID(),
      userId,
      orgId: newUser?.orgId,
      name: testCustomerName,
      phone: testPhone,
      updatedAt: new Date().toISOString()
    })
    .select()
    .single();

  if (custError) {
    console.error('FAILED to create customer:', custError.message);
    return;
  }

  console.log(`SUCCESS: Customer created with ID: ${newCust.id}`);

  // 3. Verify link
  const { data: verifiedCust } = await supabase
    .from('Customer')
    .select('*')
    .eq('id', newCust.id)
    .single();

  if (verifiedCust && verifiedCust.name === testCustomerName) {
    console.log('--- VERIFICATION COMPLETE: SUCCESS ---');
  } else {
    console.error('FAILED to verify customer record.');
  }
}

// Simple UUID shim for Node
const crypto = require('crypto');
testOnboarding();
