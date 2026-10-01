/**
 * Every component used in a file must be imported or defined in it.
 *
 * Vite builds an undefined identifier without complaint and the page crashes
 * on render, so the build passing says nothing about this. It has now shipped
 * three times: Bell in the shell, EmptyState and ConversationThread in the
 * inbox, and Wordmark in the auth shell, which took the sign-up page down
 * entirely. Each was found by a person opening the page.
 *
 * This reads every JSX file, collects what it uses and what it has, and fails
 * on the difference.
 *
 * Deliberately conservative about what counts as "has": destructured names,
 * map parameters and renamed imports are all legitimate, so anything it
 * cannot see a definition for but which appears as a local binding is
 * ignored. A checker that cries wolf gets ignored, and then it is worse than
 * nothing.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'frontend', 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.jsx$/.test(e.name)) files.push(p);
  }
})(SRC);

const problems = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');

  // Components used in JSX: <Thing ...> and <Thing.Sub ...>
  const used = new Set(
    [...src.matchAll(/<([A-Z][A-Za-z0-9]*)[\s/>.]/g)].map((m) => m[1])
  );
  if (used.size === 0) continue;

  // Anything the file could legitimately have: imports of every shape,
  // local declarations, destructured bindings and map parameters.
  const available = new Set();

  for (const m of src.matchAll(/import\s+([\s\S]*?)\s+from\s+['"][^'"]+['"]/g)) {
    for (const name of m[1].replace(/[{}]/g, ' ').split(/[\s,]+/)) {
      const clean = name.replace(/^\*$/, '').trim();
      if (clean && clean !== 'as') available.add(clean);
    }
    // `import X as Y` keeps the alias, which the split above already caught.
  }
  for (const m of src.matchAll(/(?:function|const|let|class)\s+([A-Za-z0-9_$]+)/g)) available.add(m[1]);
  // Destructured anywhere: const { Icon } = x, ({ icon: Icon }) => ...
  for (const m of src.matchAll(/[:{,]\s*([A-Z][A-Za-z0-9_$]*)\s*[,}=)]/g)) available.add(m[1]);
  // Map/callback parameters: ({ icon: Icon })
  for (const m of src.matchAll(/\b([A-Z][A-Za-z0-9_$]*)\s*=>/g)) available.add(m[1]);

  // React.Fragment shorthand and intrinsic motion namespaces are not components.
  const IGNORE = new Set(['React', 'Fragment']);

  for (const name of used) {
    if (IGNORE.has(name)) continue;
    if (!available.has(name)) {
      problems.push({ file: path.relative(SRC, file), name });
    }
  }
}

if (problems.length === 0) {
  console.log(`${files.length} files checked.\n\nPASS  every component used is imported or defined`);
  process.exit(0);
}

console.log(`${files.length} files checked.\n`);
console.log(`FAIL  ${problems.length} undefined component reference(s):`);
for (const p of problems) console.log(`        <${p.name}> in ${p.file}`);
console.log('\nThese build cleanly and crash the page on render.');
process.exit(1);
