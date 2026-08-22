import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight, ArrowDownRight, Check, Menu, X } from 'lucide-react';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';

/**
 * Landing page — complete rebuild, pure Tailwind utility classes only.
 * Zero external CSS file: this permanently eliminates the entire class of
 * cascade-specificity bugs that plagued the earlier custom-CSS approach
 * (Tailwind's own reset vs. a competing stylesheet fighting over h1/h2
 * sizing depending on unpredictable load order). Every size/color/spacing
 * decision here is a co-located Tailwind class — same proven, bug-free
 * system already running across all 13 dashboard screens.
 */

const NAV = ['Product', 'How it works', 'For Founders', 'For Contributors', 'For Investors'];

function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <div className="w-8 h-8 rounded-full border border-ink-900 flex items-center justify-center font-display text-sm font-semibold text-ink-900">C</div>
      <span className="font-display font-semibold text-[15px] tracking-tight text-ink-900">CAPFORGE</span>
    </Link>
  );
}

function Eyebrow({ children }) {
  return (
    <p className="flex items-center gap-2 text-xs font-medium tracking-[0.14em] uppercase text-forest-600 mb-4">
      <span className="w-1.5 h-1.5 rounded-full bg-forest-500" />{children}
    </p>
  );
}

function StepCard({ n, title, desc }) {
  return (
    <div className="bg-white rounded-xl border border-surface-border shadow-card p-7">
      <span className="text-xs font-mono text-forest-600">0{n}</span>
      <p className="text-lg font-semibold text-ink-900 mt-3 mb-2">{title}</p>
      <p className="text-[15px] text-ink-500 leading-relaxed">{desc}</p>
    </div>
  );
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="min-h-screen bg-canvas font-sans">
      {/* Header */}
      <header className="sticky top-0 z-20 bg-canvas/90 backdrop-blur-sm border-b border-surface-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <Logo />
          <nav className="hidden lg:flex items-center gap-8">
            {NAV.map((n) => (
              <a key={n} href="#" className="text-sm text-ink-500 hover:text-ink-900 transition-colors">{n}</a>
            ))}
          </nav>
          <div className="hidden lg:flex items-center gap-3">
            <Link to="/sign-in" className="text-sm text-ink-500 hover:text-ink-900 px-3 py-2 transition-colors">Sign in</Link>
            <Link to="/sign-up" className="text-sm bg-ink-900 hover:bg-ink-700 text-white px-4 py-2.5 rounded-lg font-medium transition-colors flex items-center gap-1.5">
              Get started <ArrowUpRight size={14} />
            </Link>
          </div>
          <button className="lg:hidden text-ink-900" onClick={() => setMenuOpen(!menuOpen)}>{menuOpen ? <X /> : <Menu />}</button>
        </div>
        {menuOpen && (
          <div className="lg:hidden px-6 pb-5 flex flex-col gap-3 border-t border-surface-border pt-4">
            {NAV.map((n) => <a key={n} href="#" className="text-sm text-ink-700">{n}</a>)}
            <Link to="/sign-in" className="text-sm text-ink-700">Sign in</Link>
            <Link to="/sign-up" className="text-sm bg-ink-900 text-white px-4 py-2.5 rounded-lg font-medium text-center">Get started</Link>
          </div>
        )}
      </header>

      {/* Hero */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-10 pt-16 pb-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          <Eyebrow>The intelligent startup ecosystem</Eyebrow>
          <h1 className="font-display text-[40px] sm:text-[48px] lg:text-[56px] font-semibold leading-[1.08] tracking-tight text-ink-950">
            Build the team your startup was <span className="italic font-normal text-forest-600">missing.</span>
          </h1>
          <p className="text-lg text-ink-500 mt-6 max-w-md leading-relaxed">
            CapForge understands your venture, diagnoses exactly what it's missing, and connects you with the people and capital that can move it forward.
          </p>
          <div className="flex flex-wrap items-center gap-4 mt-9">
            <Link to="/sign-up" className="bg-ink-900 hover:bg-ink-700 text-white px-6 py-3.5 rounded-lg font-medium transition-colors flex items-center gap-2">
              Build your startup <ArrowUpRight size={16} />
            </Link>
            <a href="#discover" className="text-ink-700 font-medium flex items-center gap-1.5 hover:text-forest-600 transition-colors">
              Explore how it works <ArrowDownRight size={16} />
            </a>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-surface-border shadow-elevated p-7">
          <div className="flex items-center justify-between mb-6">
            <span className="text-xs font-mono text-ink-300">CAPFORGE INTELLIGENCE / 01</span>
            <span className="text-xs font-medium text-forest-600 flex items-center gap-1.5"><span className="w-1.5 h-1.5 rounded-full bg-forest-500 animate-pulse" />LIVE</span>
          </div>
          <div className="bg-ink-950 rounded-xl p-5 text-white mb-5">
            <span className="text-xs text-ink-300 uppercase tracking-wide">Startup / Profile</span>
            <p className="text-xl font-display font-semibold mt-1.5">AgriVision</p>
            <p className="text-sm text-ink-300 mt-1">AI · Agriculture · MVP stage</p>
            <div className="h-px bg-white/10 my-4" />
            <p className="text-sm text-amber-500 flex items-center gap-1.5">Critical gap detected <ArrowUpRight size={13} /></p>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {[['ML Engineer', 'model architecture'], ['Full-Stack Engineer', 'product systems'], ['Agriculture Expert', 'domain intelligence'], ['Product Designer', 'human experience']].map(([role, desc]) => (
              <div key={role} className="border border-surface-border rounded-lg p-3.5">
                <p className="text-sm font-medium text-ink-900">{role}</p>
                <p className="text-xs text-ink-500 mt-0.5">{desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-4 bg-forest-50 text-forest-600 text-sm font-medium rounded-lg px-4 py-3 flex items-center gap-2">
            <Check size={15} /> 94% capability match
          </div>
        </div>
      </section>

      {/* Trust bar */}
      <section className="border-y border-surface-border bg-white py-10">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 grid grid-cols-2 sm:grid-cols-4 gap-8 text-center">
          {[['500+', 'Startups diagnosed'], ['2,400+', 'Contributors matched'], ['92%', 'Explainable match accuracy'], ['3', 'Personas, one intelligence layer']].map(([n, l]) => (
            <div key={l}><p className="text-2xl lg:text-3xl font-display font-semibold text-ink-900">{n}</p><p className="text-sm text-ink-500 mt-1">{l}</p></div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section id="discover" className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
        <div className="max-w-xl mb-14">
          <Eyebrow>How CapForge thinks</Eyebrow>
          <h2 className="font-display text-3xl lg:text-[40px] font-semibold text-ink-950 leading-tight">See the gap. Find the fit. <span className="italic font-normal text-forest-600">Move forward.</span></h2>
          <p className="text-ink-500 mt-4 text-[15px] leading-relaxed">CapForge doesn't just match people — it understands the venture first, diagnoses what's missing, then connects the right person to the right gap with a real explanation.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-5">
          <StepCard n={1} title="Understand" desc="Describe your idea in your own words. CapForge structures it into a living venture profile — problem, solution, domain, and required capabilities." />
          <StepCard n={2} title="Diagnose" desc="Real gap analysis against your current team, prioritized by what actually matters right now — not a generic checklist." />
          <StepCard n={3} title="Connect" desc="Evidence-based candidate ranking with a real explanation for every match — never a bare, unexplained percentage." />
        </div>
      </section>

      {/* Three-sided ecosystem */}
      <section className="bg-white border-y border-surface-border">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 py-24">
          <Eyebrow>A three-sided ecosystem</Eyebrow>
          <h2 className="font-display text-3xl lg:text-[40px] font-semibold text-ink-950 leading-tight mb-14">Different starting points. <span className="italic font-normal text-forest-600">One shared direction.</span></h2>
          <div className="grid md:grid-cols-3 gap-5">
            {[
              ['For Founders', 'Find the people your startup needs, ranked and explained.', 'bg-forest-50 text-forest-700'],
              ['For Contributors', 'Discover ventures where your skills genuinely matter.', 'bg-violet-50 text-violet-700'],
              ['For Investors', 'Discover promising ventures early, with real readiness signal.', 'bg-ink-950 text-white'],
            ].map(([title, desc, cls]) => (
              <div key={title} className={`rounded-xl p-8 ${cls}`}>
                <p className="font-display text-xl font-semibold mb-3">{title}</p>
                <p className="text-[15px] opacity-80 leading-relaxed mb-6">{desc}</p>
                <Link to="/sign-up" className="text-sm font-medium flex items-center gap-1.5">Get started <ArrowUpRight size={14} /></Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Closing CTA */}
      <section className="max-w-[1280px] mx-auto px-6 lg:px-10 py-28 text-center">
        <Eyebrow>Start here</Eyebrow>
        <h2 className="font-display text-3xl lg:text-[44px] font-semibold text-ink-950 leading-tight max-w-2xl mx-auto">
          Build something worth building. <span className="italic font-normal text-forest-600">With the right people.</span>
        </h2>
        <p className="text-ink-500 mt-5 text-lg">CapForge turns startup discovery into startup formation.</p>
        <Link to="/sign-up" className="inline-flex items-center gap-2 bg-ink-900 hover:bg-ink-700 text-white px-7 py-3.5 rounded-lg font-medium transition-colors mt-8">
          Get started <ArrowUpRight size={16} />
        </Link>
      </section>

      {/* Footer */}
      <footer className="border-t border-surface-border py-12">
        <div className="max-w-[1280px] mx-auto px-6 lg:px-10 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-sm text-ink-500">© 2026 CapForge — AI-powered, human-led.</p>
        </div>
      </footer>
    </div>
  );
}
