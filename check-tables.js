const { Client } = require('pg');

const client = new Client({
  connectionString: 'postgresql://postgres:ogWP9ow2nofnuhVo@db.uttbzppwpvtltwpwufel.supabase.co:5432/postgres'
});

async function run() {
  await client.connect();
  const res = await client.query(`
    SELECT table_name, column_name, data_type 
    FROM information_schema.columns 
    WHERE table_schema = 'public'
    ORDER BY table_name, ordinal_position;
  `);
  
  const tables = {};
  res.rows.forEach(r => {
    if (!tables[r.table_name]) tables[r.table_name] = [];
    tables[r.table_name].push(`${r.column_name} (${r.data_type})`);
  });
  
  for (const [table, columns] of Object.entries(tables)) {
    console.log(`Table: ${table}`);
    columns.forEach(c => console.log(`  - ${c}`));
    console.log('');
  }
  
  await client.end();
}

run().catch(console.error);
