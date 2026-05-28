const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || "https://uttbzppwpvtltwpwufel.supabase.co";
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY2Njc0MiwiZXhwIjoyMDkyMjQyNzQyfQ.MqO0VqepeNoZqW6IqLVYre3dHqZQruYr7eN2iCW2meE";

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function debugCustomers() {
  // 1. Get current admin user (simulating the one logged in)
  // Since I don't have the auth session here, I'll just look at all users.
  const { data: users } = await supabase.from('User').select('*');
  console.log('--- USERS ---');
  console.table(users.map(u => ({ id: u.id, email: u.email, orgId: u.orgId })));

  // 2. Look at all customers
  const { data: customers } = await supabase.from('Customer').select('*');
  console.log('\n--- CUSTOMERS ---');
  if (customers && customers.length > 0) {
    console.table(customers.map(c => ({ 
      id: c.id, 
      name: c.name, 
      userId: c.userId, 
      orgId: c.orgId, 
      ltv: c.lifetimeValue 
    })));
  } else {
    console.log('No customers found in database.');
  }
}

debugCustomers();
