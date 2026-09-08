require('dotenv').config();
const BASE = 'http://localhost:3000/api';
const PASSWORD = 'SeedPass123!';

const PROFILES = [
  { email: 'i.frontier@seed.test', headline: 'Seed-stage enterprise infra investor', bio: 'Frontier Capital backs early founders building cybersecurity, HR tech, and legal tech platforms that solve real compliance and operational pain for mid-market companies.' },
  { email: 'i.helix@seed.test', headline: 'Deep-tech & vertical platforms investor', bio: 'Helix Ventures invests pre-seed to seed in biotech lab automation, proptech, and creator economy infrastructure — looking for genuine technical differentiation, not just a good pitch.' },
];

async function run() {
  for (const p of PROFILES) {
    const login = await fetch(`${BASE}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ email: p.email, password: PASSWORD }) }).then(r => r.json());
    const token = login.token;
    const res = await fetch(`${BASE}/profiles/me`, { method: 'PATCH', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ headline: p.headline, bio: p.bio }) });
    const data = await res.json();
    console.log(data.success ? `  ✓ ${p.email}: profile filled in` : `  ✗ ${p.email}: ${data.error}`);
  }
}
run();
