const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uttbzppwpvtltwpwufel.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

const customerId = "06de29ca-02cb-4600-973e-4122a83ce046";

async function debugLedger() {
  console.log(`--- DEBUGGING LEDGER FOR ${customerId} ---`);

  // 1. Check Customer
  const { data: customer, error: cErr } = await supabase.from('Customer').select('*').eq('id', customerId).single();
  console.log('Customer Data:', customer || cErr);

  // 2. Check Invoices
  const { data: invoices, error: iErr } = await supabase.from('Invoice').select('*').eq('customerId', customerId);
  console.log(`Invoices Found: ${invoices?.length || 0}`, iErr || '');

  // 3. Check Payments
  const { data: payments, error: pErr } = await supabase.from('Payment').select('*').eq('customerId', customerId);
  console.log(`Payments Found: ${payments?.length || 0}`, pErr || '');

  if (customer) {
    console.log('Outstanding Balance (paise):', customer.outstandingBalance);
    console.log('Lifetime Value (paise):', customer.lifetimeValue);
  }
}

debugLedger();
