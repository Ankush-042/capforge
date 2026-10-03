/**
 * Every Tailwind opacity modifier must be a step the framework actually has.
 *
 * Tailwind's opacity scale runs in multiples of 5. Anything else — /8, /22,
 * /92 — matches no generated class, so it compiles to NOTHING. That is
 * silent: the element simply keeps whatever it would otherwise have had, and
 * nothing in the build warns about it.
 *
 * This has now produced three user-visible bugs in this project, all of the
 * same shape and all found by a person rather than by a tool:
 *
 *   bg-white/8   on the circle-name input  -> no background, so the field kept
 *                the browser's white default while the text was white. What
 *                you typed was invisible.
 *   text-white/92 on the circle message box -> no colour, so the text fell
 *                back to black on a near-black surface. Invisible while
 *                typing, visible the moment it posted.
 *   text-white/22, /18, /12 -> silently rendered at full opacity.
 *
 * A build that passes proves nothing here, which is exactly why this exists.
 */
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'frontend', 'src');
const files = [];
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const p = path.join(d, e.name);
    if (e.isDirectory()) walk(p);
    else if (/\.(jsx|js|css)$/.test(e.name)) files.push(p);
  }
})(SRC);

const pattern = /(?:text|bg|border|ring|divide|from|via|to|placeholder|decoration|outline|shadow|fill|stroke)-[a-z]+(?:-\d+)?\/(\d+)/g;
const problems = [];

for (const file of files) {
  const src = fs.readFileSync(file, 'utf8');
  const lines = src.split('\n');
  lines.forEach((line, i) => {
    for (const m of line.matchAll(pattern)) {
      const value = Number(m[1]);
      // Tailwind ships 0-100 in steps of 5. Arbitrary values use /[0.08]
      // bracket syntax, which this pattern does not match, so they are safe.
      if (value % 5 !== 0 || value > 100) {
        problems.push({
          file: path.relative(SRC, file),
          line: i + 1,
          cls: m[0],
          suggest: `${m[0].split('/')[0]}/${Math.min(100, Math.round(value / 5) * 5)}`,
        });
      }
    }
  });
}

if (problems.length === 0) {
  console.log(`${files.length} files checked.\n\nPASS  every opacity modifier is a real Tailwind step`);
  process.exit(0);
}

console.log(`${files.length} files checked.\n`);
console.log(`FAIL  ${problems.length} opacity modifier(s) that compile to nothing:`);
for (const p of problems) {
  console.log(`        ${p.cls}  in ${p.file}:${p.line}   ->  ${p.suggest}`);
}
console.log('\nThese build cleanly and render as if the class were absent.');
console.log('Use a multiple of 5, or bracket syntax for an arbitrary value: text-white/[0.92]');
process.exit(1);
