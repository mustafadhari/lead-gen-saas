import supabase from './src/db/client.js';
async function run() {
  const { data } = await supabase.from('call_logs').select('*').limit(5);
  console.log(JSON.stringify(data, null, 2));
}
run();
