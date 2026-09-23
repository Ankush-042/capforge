/**
 * Every route a page can send someone to must exist, and every route must be
 * reachable. Run before and after any change that touches navigation.
 *
 * The ad-hoc grep used previously caught only `to="/app/x"` and missed
 * template literals, navigate() calls and nav definitions, so it reported
 * seven links on a product with fifty routes. This reads them all.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'frontend', 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx|js)$/.test(e.name)) files.push(p);
  }
})(SRC);

const main = fs.readFileSync(path.join(SRC, 'main.jsx'), 'utf8');
const routes = new Set();
for (const m of main.matchAll(/path="([^"]+)"/g)) routes.add(m[1]);

/** A concrete link matches a route, allowing for :params. */
function resolves(link) {
  const clean = link.split('?')[0].replace(/\/+$/, '') || '/';
  for (const r of routes) {
    const rp = r.split('/').filter(Boolean);
    const lp = clean.split('/').filter(Boolean);
    if (rp.length !== lp.length) continue;
    if (rp.every((seg, i) => seg.startsWith(':') || seg === lp[i])) return true;
  }
  return false;
}

const links = new Map(); // link -> files
function record(link, file) {
  if (!link.startsWith('/')) return;                 // relative or external
  if (link.startsWith('/api')) return;               // not a route
  const key = link
    .replace(/\$\{[^}]*\}/g, ':param')               // template literal holes
    .replace(/\/+$/, '') || '/';
  if (!links.has(key)) links.set(key, new Set());
  links.get(key).add(path.relative(SRC, file));
}

for (const f of files) {
  if (f.endsWith('main.jsx')) continue;
  const src = fs.readFileSync(f, 'utf8');
  for (const m of src.matchAll(/\bto=\{?["'`]([^"'`]+)["'`]\}?/g)) record(m[1], f);
  for (const m of src.matchAll(/\bto=\{`([^`]+)`\}/g)) record(m[1], f);
  for (const m of src.matchAll(/navigate\(\s*["'`]([^"'`]+)["'`]/g)) record(m[1], f);
  for (const m of src.matchAll(/navigate\(\s*`([^`]+)`/g)) record(m[1], f);
  for (const m of src.matchAll(/\bpath:\s*["'`]([^"'`]+)["'`]/g)) record(m[1], f);
}

const dead = [];
for (const [link, where] of links) {
  if (!resolves(link)) dead.push({ link, where: [...where].join(', ') });
}

// A route nothing links to is not broken, but it is worth seeing.
const linked = new Set();
for (const [link] of links) {
  // Strip the query string, exactly as resolves() does. Without this a link
  // like /app/gaps/:param/compare?gap=... never matches its own route and the
  // page is falsely reported as unreachable.
  const bare = link.split('?')[0];
  for (const r of routes) {
    const rp = r.split('/').filter(Boolean), lp = bare.split('/').filter(Boolean);
    if (rp.length === lp.length && rp.every((s, i) => s.startsWith(':') || s === lp[i])) linked.add(r);
  }
}
const orphans = [...routes].filter((r) => !linked.has(r) && r !== '/' && !r.includes('*'));

console.log(`${links.size} distinct link target(s) across ${files.length} files, ${routes.size} route(s)\n`);
if (dead.length === 0) console.log('PASS  every link resolves to a real route');
else {
  console.log(`FAIL  ${dead.length} link(s) go nowhere:`);
  for (const d of dead) console.log(`        ${d.link}   (in ${d.where})`);
}
if (orphans.length) {
  console.log(`\nNote: ${orphans.length} route(s) nothing links to (may be intentional):`);
  for (const o of orphans) console.log(`        ${o}`);
}
process.exit(dead.length === 0 ? 0 : 1);
