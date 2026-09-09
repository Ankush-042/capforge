/**
 * Schema guard.
 *
 * Every single runtime failure shipped today was the same mistake: assuming
 * a column or table name instead of checking it.
 *
 *   readiness_assessments.created_at    (real: generated_at)
 *   readiness_assessments.dimension_justifications  (not a column at all)
 *   conversations.participant_a         (real: participant_a_id)
 *   startups.problem_statement          (real: problem)
 *
 * Reading code and "being careful" clearly is not enough, because I was
 * being careful each time. This checks it mechanically instead.
 *
 * It parses every table and column the migrations actually define, then
 * scans backend SQL for table.column references that do not exist.
 *
 * HONEST LIMITATION, verified by deliberately reintroducing three of today's
 * real bugs: it caught 1 of 3. It reliably catches QUALIFIED references
 * (readiness_assessments.dimension_justifications), but NOT bare column
 * names in a single-table query (ORDER BY created_at), because without a
 * qualifier there is nothing to tie the column to a table without a real
 * SQL parser.
 *
 * So this is a net, not a guarantee. The discipline still matters: grep the
 * migrations for a column before using it. This just catches the subset it
 * can catch mechanically, which is better than catching none.
 *
 * Run before committing any backend change:  node scripts/verify-schema.js
 */
const fs = require('fs');
const path = require('path');

const MIGRATIONS = path.join(__dirname, '..', 'database', 'migrations');
const BACKEND = path.join(__dirname, '..', 'backend');

// ---- 1. Build the real schema from the migrations ----
const schema = {};     // table -> Set(columns)
const tables = new Set();

function addColumn(table, col) {
  if (!schema[table]) schema[table] = new Set();
  schema[table].add(col);
}

const files = fs.readdirSync(MIGRATIONS).filter(f => f.endsWith('.sql')).sort();
for (const file of files) {
  const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');

  // CREATE TABLE blocks
  const createRe = /CREATE TABLE\s+(?:IF NOT EXISTS\s+)?(\w+)\s*\(([\s\S]*?)\n\);/gi;
  let m;
  while ((m = createRe.exec(sql)) !== null) {
    const table = m[1];
    tables.add(table);
    for (const rawLine of m[2].split('\n')) {
      const line = rawLine.trim();
      if (!line || line.startsWith('--')) continue;
      if (/^(PRIMARY|FOREIGN|UNIQUE|CHECK|CONSTRAINT)\b/i.test(line)) continue;
      const colMatch = line.match(/^(\w+)\s+/);
      if (colMatch) addColumn(table, colMatch[1]);
    }
  }

  // ALTER TABLE ... ADD COLUMN
  const alterRe = /ALTER TABLE\s+(\w+)\s+ADD COLUMN\s+(?:IF NOT EXISTS\s+)?(\w+)/gi;
  while ((m = alterRe.exec(sql)) !== null) {
    tables.add(m[1]);
    addColumn(m[1], m[2]);
  }
}

// ---- 2. Scan backend queries for references that do not exist ----
function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else if (entry.name.endsWith('.js')) out.push(full);
  }
  return out;
}

const problems = [];

/**
 * Only scan inside real SQL template literals. The first version of this
 * scanned whole files and produced 63 findings, nearly all of them English
 * words in comments ('the', 'a', 'what') and JavaScript property access
 * (result.rows). A tool that cries wolf is worse than no tool, because it
 * gets ignored. This only looks at backtick strings that actually contain
 * SQL keywords.
 */
function extractSqlStrings(src) {
  const out = [];
  const re = /`([^`]*)`/g;
  let m;
  while ((m = re.exec(src)) !== null) {
    const body = m[1];
    if (/\b(SELECT|INSERT INTO|UPDATE|DELETE FROM)\b/i.test(body)) out.push(body);
  }
  return out;
}

for (const file of walk(BACKEND)) {
  const src = fs.readFileSync(file, 'utf8');
  const rel = path.relative(BACKEND, file);

  for (const sql of extractSqlStrings(src)) {
    // Collect aliases so we do not flag them as unknown tables/columns.
    const aliases = new Set();
    const aliasRe = /\b(?:FROM|JOIN)\s+(\w+)\s+(?:AS\s+)?(\w+)\b/gi;
    let a;
    while ((a = aliasRe.exec(sql)) !== null) {
      if (!['ON','WHERE','SET','USING','AND','OR','LEFT','RIGHT','INNER','OUTER','JOIN'].includes(a[2].toUpperCase())) {
        aliases.add(a[2]);
      }
    }

    // Unknown tables
    const tableRe = /\b(?:FROM|JOIN|INSERT INTO|UPDATE)\s+(\w+)/gi;
    let m;
    while ((m = tableRe.exec(sql)) !== null) {
      const t = m[1];
      if (tables.has(t) || aliases.has(t)) continue;
      if (/^\$/.test(t)) continue;
      // UPDATE <t> SET: 'SET' is a keyword, not a table. Postgres functions too.
      if (['SET','unnest','generate_series','jsonb_array_elements'].includes(t)) continue;
      problems.push({ file: rel, kind: 'UNKNOWN TABLE', detail: t });
    }

    // Unknown columns, only where the qualifier is a REAL table name
    const colRe = /\b([a-z_]{3,})\.([a-z_]{2,})\b/g;
    while ((m = colRe.exec(sql)) !== null) {
      const [full, tbl, col] = m;
      if (!schema[tbl]) continue;
      if (schema[tbl].has(col)) continue;
      problems.push({ file: rel, kind: 'UNKNOWN COLUMN', detail: full });
    }
  }
}

// ---- 3. Report ----
console.log(`Tables defined by migrations: ${tables.size}`);
console.log(`Backend files scanned: ${walk(BACKEND).length}\n`);

if (problems.length === 0) {
  console.log('No unknown tables or columns found.');
  process.exit(0);
}

const seen = new Set();
const unique = problems.filter(p => {
  const key = `${p.file}|${p.detail}`;
  if (seen.has(key)) return false;
  seen.add(key);
  return true;
});

console.log(`${unique.length} potential problem(s):\n`);
for (const p of unique) {
  console.log(`  ${p.kind}: ${p.detail}`);
  console.log(`    in ${p.file}`);
}
console.log('\nNote: some may be false positives (SQL aliases, or dynamic names).');
console.log('Verify each against the migrations before assuming it is real.');
process.exit(1);
