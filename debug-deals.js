const { createClient } = require('@supabase/supabase-js');

async function debug() {
    const supabaseUrl = 'https://uttbzppwpvtltwpwufel.supabase.co';
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";
    const admin = createClient(supabaseUrl, serviceRoleKey);

    console.log('--- ALL CUSTOMERS NAMED HARSHA ---');
    const { data: customers } = await admin.from('Customer').select('*').ilike('name', 'HARSHA');
    console.log(customers);

    for (const h of customers || []) {
        console.log(`\n--- QUOTES FOR CUSTOMER ID: ${h.id} (${h.name} - ${h.phone}) ---`);
        const { data: quotes } = await admin.from('Quote').select('*').eq('customerId', h.id);
        console.log(quotes ? quotes.length : 0, 'quotes found');
    }
}

debug();
