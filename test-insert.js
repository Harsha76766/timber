import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://uttbzppwpvtltwpwufel.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV0dGJ6cHB3cHZ0bHR3cHd1ZmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzY2NjY3NDIsImV4cCI6MjA5MjI0Mjc0Mn0.R7fabNjtjO_oyWFS6nmeOEwcZcr7tqBcAGkPdVOiYIs'
const supabase = createClient(supabaseUrl, supabaseKey)

async function test() {
  console.log("Fetching a user...");
  const { data: users, error: userError } = await supabase.from('User').select('*').limit(1);
  if (userError || !users || users.length === 0) {
    console.error("Failed to fetch user", userError);
    return;
  }
  const userId = users[0].id;
  
  console.log("Testing insert...");
  // Using regular Node crypto UUID
  const crypto = require('crypto');
  const { data, error } = await supabase.from('Product').insert({
    id: crypto.randomUUID(),
    userId: userId,
    name: 'TEST DB WOOD',
    woodType: 'TEAK',
    pricePerCft: 1000,
    stock: 0,
    hsnCode: '4407',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }).select();

  if (error) {
    console.error("INSERT ERROR:");
    console.dir(error, { depth: null });
  } else {
    console.log("SUCCESS:", data);
  }
}
test();
