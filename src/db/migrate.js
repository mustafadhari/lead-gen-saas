/**
 * Migration script — executes schema.sql against Supabase.
 *
 * Usage:
 *   node src/db/migrate.js
 *
 * Requires SUPABASE_URL and SUPABASE_ANON_KEY in .env
 * (copy .env.example → .env and fill in real values).
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import supabase from './client.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrate() {
  console.log('🚀  Running migration…\n');

  const sqlPath = join(__dirname, 'schema.sql');
  const sql = readFileSync(sqlPath, 'utf-8');

  // Split on semicolons (respecting $$ function bodies) and execute sequentially
  const statements = splitStatements(sql);

  let success = 0;
  let failed = 0;

  for (const stmt of statements) {
    const trimmed = stmt.trim();
    if (!trimmed || trimmed.startsWith('--')) continue;

    try {
      const { error } = await supabase.rpc('exec_sql', { query: trimmed });

      if (error) {
        // Fallback: try direct SQL via the REST API (works if pg_net or custom function exists)
        // For most Supabase projects, you'll want to run schema.sql via the Dashboard SQL editor
        // or the Supabase CLI (`supabase db push`). This script is a convenience wrapper.
        console.error(`❌  ${trimmed.slice(0, 60)}…`);
        console.error(`    ${error.message}\n`);
        failed++;
      } else {
        console.log(`✅  ${trimmed.slice(0, 60)}…`);
        success++;
      }
    } catch (err) {
      console.error(`❌  ${trimmed.slice(0, 60)}…`);
      console.error(`    ${err.message}\n`);
      failed++;
    }
  }

  console.log(`\n📊  Done — ${success} succeeded, ${failed} failed.`);

  if (failed > 0) {
    console.log('\n💡  Tip: If rpc(\'exec_sql\') is not available, paste the contents of');
    console.log('    src/db/schema.sql into the Supabase Dashboard → SQL Editor,');
    console.log('    or use the Supabase CLI: supabase db push');
  }
}

/**
 * Naively splits SQL by semicolons while preserving $$ function bodies.
 */
function splitStatements(sql) {
  const results = [];
  let current = '';
  let inDollarQuote = false;

  const lines = sql.split('\n');
  for (const line of lines) {
    // Toggle dollar-quote state
    const dollarMatches = line.match(/\$\$/g);
    if (dollarMatches) {
      for (const _ of dollarMatches) {
        inDollarQuote = !inDollarQuote;
      }
    }

    current += line + '\n';

    if (!inDollarQuote && line.trim().endsWith(';')) {
      results.push(current.trim());
      current = '';
    }
  }

  if (current.trim()) results.push(current.trim());
  return results;
}

migrate().catch((err) => {
  console.error('Migration crashed:', err);
  process.exit(1);
});
