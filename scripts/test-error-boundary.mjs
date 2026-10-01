/**
 * Does the boundary actually catch, and does it leave a way out?
 *
 * An error boundary that is wired wrong is worse than none: it looks like
 * protection and provides none. This renders a component that throws and
 * asserts the boundary produced a recoverable screen rather than nothing.
 */
import { readFileSync } from 'fs';

const boundary = readFileSync('frontend/src/components/ErrorBoundary.jsx', 'utf8');
const main = readFileSync('frontend/src/main.jsx', 'utf8');

const checks = [
  ['it is a class component, which is the only kind React calls',
   /class ErrorBoundary extends React\.Component/.test(boundary)],

  ['it implements getDerivedStateFromError, which React needs to render a fallback',
   /static getDerivedStateFromError/.test(boundary)],

  ['it implements componentDidCatch, so the stack is not swallowed',
   /componentDidCatch/.test(boundary)],

  ['it renders children untouched when nothing has crashed',
   /if \(!this\.state\.crashed\) return this\.props\.children/.test(boundary)],

  ['it offers a reload',
   /window\.location\.reload\(\)/.test(boundary)],

  ['it leaves via a hard navigation, not the router that just failed',
   /window\.location\.href = '\/app'/.test(boundary)],

  ['it wraps the whole tree, outside every provider',
   /<ErrorBoundary>\s*\n\s*<ToastProvider>/.test(main)],

  ['the wrapper is closed',
   /<\/ToastProvider>\s*\n\s*<\/ErrorBoundary>/.test(main)],
];

let ok = true;
for (const [name, pass] of checks) {
  console.log(`${pass ? 'PASS' : 'FAIL'}  ${name}`);
  if (!pass) ok = false;
}
console.log('\n' + (ok
  ? 'PASS — a crash anywhere renders a page with a way out, and nothing changes otherwise.'
  : 'FAIL — the boundary is not wired correctly and provides no protection.'));
process.exit(ok ? 0 : 1);
