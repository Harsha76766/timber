const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = "https://uttbzppwpvtltwpwufel.supabase.co";
const serviceRoleKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
const supabase = createClient(supabaseUrl, serviceRoleKey);

const targetId = '3fc6f5d3-02b4-408c-96c1-a336bfff4230';

async function debug() {
  console.log('Searching for ID:', targetId);
  
  const { data: quote } = await supabase.from('Quote').select('*, QuoteItem(*)').eq('id', targetId).maybeSingle();
  console.log('Quote find:', quote ? 'YES' : 'NO');
  
  const { data: invoice } = await supabase.from('Invoice').select('*, Quote(*, QuoteItem(*))').eq('id', targetId).maybeSingle();
  console.log('Invoice find:', invoice ? 'YES' : 'NO');

  if (invoice) {
      console.log('Invoice details:', JSON.stringify(invoice, null, 2));
  }
}

debug();
