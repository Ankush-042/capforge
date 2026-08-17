import { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowDownRight, ArrowUpRight, Check, Menu, Plus, X } from 'lucide-react';
import '@fontsource/geist-sans/400.css';
import '@fontsource/geist-sans/500.css';
import '@fontsource/geist-sans/600.css';
import '@fontsource/geist-sans/700.css';
import '@fontsource/geist-mono/400.css';
import '@fontsource/geist-mono/500.css';
import '../styles/landing.css';

/**
 * Landing page — ported from the provided reference design (teal/off-white
 * editorial system). This IS the locked visual bar going forward.
 */

const navItems = [
  ['Discover', '#discover'],
  ['How It Works', '#intelligence'],
  ['For Founders', '#founders'],
  ['For Contributors', '#contributors'],
  ['For Investors', '#investors'],
];

function Logo() {
  return <a href="#top" className="brand-mark" aria-label="CapForge home"><span className="brand-wordmark">C</span><span>CAPFORGE</span></a>;
}

function SectionLabel({ children }) {
  return <p className="eyebrow"><span className="eyebrow-dot" />{children}</p>;
}

function HeroDiagram() {
  return (
    <div className="hero-diagram" aria-label="CapForge team formation visualization">
      <div className="diagram-topline"><span>CAPFORGE INTELLIGENCE / 01</span><span>LIVE ANALYSIS</span></div>
      <div className="diagram-grid" />
      <svg className="diagram-lines" viewBox="0 0 720 500" aria-hidden="true">
        <path d="M360 247 C290 180 182 135 92 111" />
        <path d="M360 247 C443 175 548 139 632 112" />
        <path d="M360 247 C265 300 173 352 94 391" />
        <path d="M360 247 C453 306 548 357 634 391" />
        <circle cx="360" cy="247" r="6" /><circle cx="92" cy="111" r="3" /><circle cx="632" cy="112" r="3" /><circle cx="94" cy="391" r="3" /><circle cx="634" cy="391" r="3" />
      </svg>
      <div className="startup-core">
        <span className="tiny-label">STARTUP / PROFILE</span><strong>AgriVision</strong><span>AI · Agriculture</span><small>MVP stage</small>
        <div className="core-rule" /><span className="core-insight">Critical gap detected <ArrowUpRight size={13} /></span>
      </div>
      <div className="cap-node node-a"><span className="node-index">01</span><strong>ML Engineer</strong><small>model architecture</small></div>
      <div className="cap-node node-b"><span className="node-index">02</span><strong>Full-Stack Engineer</strong><small>product systems</small></div>
      <div className="cap-node node-c"><span className="node-index">03</span><strong>Agriculture Expert</strong><small>domain intelligence</small></div>
      <div className="cap-node node-d"><span className="node-index">04</span><strong>Product Designer</strong><small>human experience</small></div>
      <div className="match-pill"><span className="status-dot" />94% capability match</div>
      <div className="diagram-footer"><span>Best team composition</span><span>Strong founder compatibility</span></div>
    </div>
  );
}

function Readiness() {
  const rows = [['Problem clarity', '88'], ['Solution definition', '79'], ['Team completeness', '51'], ['Market clarity', '72'], ['Product readiness', '67']];
  return <div className="readiness-panel panel">
    <div className="panel-head"><span>STARTUP READINESS</span><span className="panel-id">CF / 004</span></div>
    <div className="readiness-score"><span>74</span><small>overall readiness</small></div>
    <div className="readiness-rows">{rows.map(([name, value]) => <div className="readiness-row" key={name}><span>{name}</span><div className="bar"><i style={{ width: `${value}%` }} /></div><b>{value}</b></div>)}</div>
    <div className="gap-callout"><span>BIGGEST GAP</span><strong>Technical product capability</strong><a href="#connect">Find the right people <ArrowUpRight size={14} /></a></div>
  </div>;
}

function Workspace() {
  return <div className="workspace panel">
    <div className="workspace-nav"><div><span className="workspace-logo">A</span><strong>AGRIVISION</strong></div><span className="workspace-status"><span className="status-dot" />Active workspace</span></div>
    <div className="workspace-body"><aside><span className="active">Overview</span><span>Team</span><span>Tasks</span><span>Milestones</span><span>Documents</span><span>Discussion</span></aside><div className="workspace-main"><div className="workspace-title"><div><span className="tiny-label">TUESDAY, 16 APRIL</span><h4>Good morning, team.</h4></div><button className="circle-button" aria-label="Add item"><Plus size={16} /></button></div><div className="workspace-cards"><div className="mini-card"><span>TEAM</span><strong>04 <small>members</small></strong><div className="avatar-stack"><i>AM</i><i>JP</i><i>RK</i><i>+</i></div></div><div className="mini-card"><span>MILESTONE</span><strong>Prototype <small>in progress</small></strong><div className="progress-line"><i /></div></div></div><div className="workspace-note"><span className="note-mark">↗</span><div><strong>Next up</strong><p>Validate first model with two partner farms.</p></div><span className="note-date">APR 22</span></div></div></div>
  </div>;
}

export default function Landing() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [activeCategory, setActiveCategory] = useState('AI');
  const categories = ['AI', 'FinTech', 'HealthTech', 'Climate', 'EdTech', 'SaaS', 'DeepTech'];
  const handlePointerMove = (event) => {
    const x = `${(event.clientX / window.innerWidth) * 100}%`;
    const y = `${(event.clientY / window.innerHeight) * 100}%`;
    event.currentTarget.style.setProperty('--pointer-x', x);
    event.currentTarget.style.setProperty('--pointer-y', y);
  };
  return <main id="top" onPointerMove={handlePointerMove}>
    <header className="site-header"><Logo /><div className="nav-shell"><span className="nav-status"><span className="status-dot" />AI ecosystem</span><nav className="desktop-nav" aria-label="Primary navigation">{navItems.map(([label, href], i) => <a href={href} className={i === 0 ? 'nav-active' : ''} key={label}><span>{label}</span>{i === 0 && <i />}</a>)}</nav></div><div className="header-actions"><Link className="sign-in" to="/sign-in">Sign In</Link><Link className="button button-dark small" to="/sign-up">Get Started <ArrowUpRight size={15} /></Link></div><button className="menu-toggle" onClick={() => setMenuOpen(!menuOpen)} aria-label={menuOpen ? 'Close menu' : 'Open menu'}>{menuOpen ? <X /> : <Menu />}</button></header>
    {menuOpen && <nav className="mobile-nav">{navItems.map(([label, href]) => <a href={href} key={label} onClick={() => setMenuOpen(false)}>{label}<ArrowUpRight size={15} /></a>)}<Link className="button button-dark" to="/sign-up">Get Started</Link></nav>}

    <section className="hero section-wrap"><div className="hero-copy"><SectionLabel>The intelligent startup ecosystem</SectionLabel><h1>Build the team your startup was <em>missing.</em></h1><p>CapForge uses AI to understand what your startup needs, identify what's missing, and connect you with the people who can help build it.</p><div className="hero-actions"><Link to="/sign-up" className="button button-dark">Build Your Startup <ArrowUpRight size={16} /></Link><a href="#discover" className="text-link">Explore Startups <ArrowDownRight size={16} /></a></div><span className="scroll-cue">Scroll to explore <ArrowDownRight size={14} /></span></div><HeroDiagram /></section>

    <section className="ecosystem section-wrap" id="discover"><SectionLabel>The CapForge ecosystem</SectionLabel><h2>Where ambitious startups meet the people who can build them.</h2><div className="category-row" role="tablist" aria-label="Startup categories">{categories.map((x) => <button type="button" role="tab" aria-selected={activeCategory === x} key={x} className={activeCategory === x ? 'category-active' : ''} onClick={() => setActiveCategory(x)}>{x}</button>)}</div><div className="category-signal"><span className="status-dot" />Showing live intelligence for <strong>{activeCategory}</strong><ArrowUpRight size={14} /></div></section>

    <section className="intelligence-strip section-wrap" aria-label="CapForge intelligence overview"><div className="intelligence-art"><img src="/capforge-intelligence.png" alt="Abstract CapForge startup intelligence profile with connected team and opportunity signals" /><div className="art-stamp">CF / SIGNAL MAP <span>LIVE</span></div><div className="art-cursor">AI</div></div><div className="signal-copy"><SectionLabel>One intelligence layer</SectionLabel><h2>See the gap. Find the fit. <em>Move forward.</em></h2><p>CapForge turns a startup into a living intelligence profile — then connects every missing capability to the people, opportunities, and capital that can change its trajectory.</p><div className="signal-points"><div><strong>01</strong><span>Team builder</span><small>Roles your startup actually needs</small></div><div><strong>02</strong><span>Opportunity match</span><small>Projects aligned to your strengths</small></div><div><strong>03</strong><span>Capital fit</span><small>Investors who understand your thesis</small></div></div></div></section>

    <section className="problem section-wrap"><div className="problem-heading"><SectionLabel>The missing connection</SectionLabel><h2>Great ideas are everywhere.<br /><em>The right people aren't always easy to find.</em></h2></div><div className="problem-copy"><p>Founders struggle to assemble the right team. Contributors struggle to discover startups where their skills genuinely matter. Investors struggle to discover promising ventures early.</p><p className="accent-copy">CapForge brings these relationships into one intelligent ecosystem.</p></div><div className="alignment-visual"><div className="fragment fragment-one">Idea</div><div className="fragment fragment-two">Skill</div><div className="fragment fragment-three">Timing</div><div className="alignment-line"><span>CAPFORGE</span></div><div className="aligned-word">alignment</div></div></section>

    <section className="intelligence section-wrap" id="intelligence"><div className="split-heading"><div><SectionLabel>01 / Understand</SectionLabel><h2>It starts by understanding the startup.</h2></div><p>Before making a connection, CapForge builds a living picture of what you're building, who it serves, and the capabilities it will take to make it real.</p></div><div className="intelligence-flow"><div className="input-list panel"><span className="tiny-label">STARTUP INPUT</span>{['What we\u2019re building', 'Who we\u2019re serving', 'Current team', 'Capabilities we have', 'Capabilities we need'].map((x, i) => <div key={x}><span>0{i + 1}</span>{x}<Check size={14} /></div>)}</div><div className="flow-bridge"><span>CapForge<br />intelligence</span><div className="flow-arrow">→</div></div><div className="output-list panel"><span className="tiny-label">INTELLIGENCE LAYER</span>{['Analyze', 'Identify gaps', 'Compose team', 'Evaluate compatibility', 'Recommend people'].map((x, i) => <div key={x}><i className={i === 1 ? 'teal-dot' : ''} />{x}<ArrowUpRight size={14} /></div>)}</div></div></section>

    <section className="readiness section-wrap"><div className="split-heading"><div><SectionLabel>02 / Diagnose</SectionLabel><h2>Know what's missing before you start building.</h2></div><p>Clarity is a competitive advantage. CapForge turns a founder's instinct into a precise view of the next capability that matters.</p></div><div className="readiness-layout"><Readiness /><div className="readiness-aside"><span className="big-number">51<span>%</span></span><p>Team completeness is the clearest opportunity in this startup's profile.</p><a href="#connect" className="text-link">Turn insight into action <ArrowUpRight size={15} /></a></div></div></section>

    <section className="team-builder section-wrap" id="founders"><div className="split-heading"><div><SectionLabel>03 / Compose</SectionLabel><h2>From one idea to the team that can build it.</h2></div><p>Not a directory. A thoughtful composition of the roles, perspectives, and energy your startup needs next.</p></div><div className="composition"><div className="quote-step"><span className="tiny-label">FOUNDER DESCRIBES THE STARTUP</span><blockquote>"We're building computer vision for early crop disease detection."</blockquote><span className="step-arrow">↓</span></div><div className="capabilities"><span className="tiny-label">CAPFORGE IDENTIFIES</span><div>{['Computer Vision', 'ML Engineering', 'Agriculture Knowledge', 'Product Design'].map(x => <span key={x}>{x} <Plus size={12} /></span>)}</div></div><div className="team-result"><div className="team-result-head"><span className="tiny-label">RECOMMENDED COMPOSITION</span><strong>92% <small>team fit</small></strong></div>{[['Amina Mensah', 'ML Engineer', 'Computer Vision · Python'], ['Jon Park', 'Product Designer', 'Research · Prototyping'], ['Ravi Kapoor', 'Agriculture Expert', 'Crop Science · Field Ops']].map(([name, role, skills], i) => <div className="candidate" key={name}><span className={`candidate-avatar av-${i}`}>{name.split(' ').map(n => n[0]).join('')}</span><div><strong>{name}</strong><small>{role}</small></div><span className="candidate-skills">{skills}</span><ArrowUpRight size={15} /></div>)}</div></div></section>

    <section className="compatibility section-wrap"><div className="compatibility-copy"><SectionLabel>04 / Connect</SectionLabel><h2>Because skills are only part of the equation.</h2><p>Good teams are built on shared ambition, clear expectations, and the way people work together. CapForge considers the human signal too.</p><div className="trait-list">{['Goals', 'Commitment', 'Working style', 'Role expectations', 'Experience', 'Interests'].map(x => <span key={x}>{x}</span>)}</div></div><div className="compatibility-card panel"><div className="compat-score"><span>Founder compatibility</span><strong>87<small>%</small></strong></div><div className="compat-orbit"><div className="orbit-center">AM + <br />AGV</div><span className="orbit-tag tag-1">shared ambition</span><span className="orbit-tag tag-2">complementary pace</span><span className="orbit-tag tag-3">aligned role</span></div><div className="why-works"><span>WHY THIS WORKS</span><p>Amina's product instinct complements AgriVision's technical ambition.</p></div></div></section>

    <section className="radar section-wrap" id="contributors"><div className="split-heading"><div><SectionLabel>05 / Discover</SectionLabel><h2>The right opportunity should find you too.</h2></div><p>CapForge stays alert to the signal around you — surfacing the work, people, and possibility that fits your direction.</p></div><div className="radar-layout"><div className="radar-orbit"><div className="radar-ring ring-one" /><div className="radar-ring ring-two" /><div className="radar-core">YOU</div><span className="radar-item radar-one">94% match<br /><small>AgriVision</small></span><span className="radar-item radar-two">89% match<br /><small>FinGuard</small></span><span className="radar-item radar-three">NEW<br /><small>Climate venture</small></span></div><div className="feed panel"><div className="panel-head"><span>OPPORTUNITY RADAR</span><span>YOUR SIGNAL / ON</span></div>{[['94% match', 'AgriVision is looking for an ML Engineer.', 'Today'], ['89% match', 'FinGuard needs an AI co-founder.', 'Yesterday'], ['New', 'A startup in your preferred domain just joined.', '2 days ago']].map(([match, text, time]) => <div className="feed-item" key={text}><div><b>{match}</b><p>{text}</p></div><span>{time}</span><ArrowUpRight size={15} /></div>)}<div className="founder-alert"><strong>3 new people match your open roles.</strong><a href="#start">Review matches <ArrowUpRight size={14} /></a></div></div></div></section>

    <section className="connection section-wrap" id="connect"><SectionLabel>The connection</SectionLabel><h2>Discovery is only<br /><em>the beginning.</em></h2><div className="sequence">{['Discover', 'Match', 'Connect', 'Form Team', 'Build'].map((x, i) => <div key={x}><span>0{i + 1}</span><strong>{x}</strong>{i < 4 && <ArrowUpRight size={15} />}</div>)}</div><Workspace /></section>

    <section className="ecosystem-sides section-wrap"><div className="sides-intro"><SectionLabel>A three-sided ecosystem</SectionLabel><h2>Different starting points.<br /><em>One shared direction.</em></h2></div><div className="sides-grid"><div id="founders" className="side-panel founders"><span>01 / FOUNDERS</span><h3>Find the people your startup needs.</h3><a href="#start">Build your team <ArrowUpRight size={15} /></a></div><div id="contributors" className="side-panel contributors"><span>02 / CONTRIBUTORS & CO-FOUNDERS</span><h3>Find startups worth building with.</h3><a href="#start">Find your next build <ArrowUpRight size={15} /></a></div><div id="investors" className="side-panel investors"><span>03 / INVESTORS</span><h3>Discover emerging ventures earlier.</h3><a href="#start">Explore the signal <ArrowUpRight size={15} /></a></div></div></section>

    <section className="discovery section-wrap"><div className="discovery-header"><div><SectionLabel>Startup discovery</SectionLabel><h2>A better way to look for what's next.</h2></div><div className="search-field"><span>⌕</span><input aria-label="Search startups" placeholder="Search startups, skills, industries, opportunities..." /><kbd>⌘ K</kbd></div></div><div className="filters"><span>Industry +</span><span>Stage +</span><span>Skills +</span><span>Location +</span></div><div className="startup-list">{[['AgriVision', 'Computer vision for early crop disease detection.', 'AI · Agriculture', 'Verified'], ['FinGuard', 'Making financial safety accessible to every small business.', 'FinTech · SaaS', 'Claimed'], ['Morrow Health', 'A more human operating system for preventative care.', 'HealthTech', 'Discoverable']].map(([name, desc, tags, status]) => <div className="startup-row" key={name}><div className="startup-symbol">{name[0]}</div><div className="startup-info"><strong>{name}</strong><p>{desc}</p><small>{tags}</small></div><span className={`trust-status ${status.toLowerCase()}`}><i />{status}</span><div className="startup-gap"><span>Open capability</span><b>{name === 'AgriVision' ? 'ML Engineer' : name === 'FinGuard' ? 'AI co-founder' : 'Product Designer'}</b></div><ArrowUpRight size={17} /></div>)}</div><div className="trust-model">{[['Discoverable', 'Found through the broader startup ecosystem.'], ['Claimed', 'Founder has taken control of the profile.'], ['Verified', 'Startup has completed CapForge verification.']].map(([title, text]) => <div key={title}><span className="trust-icon"><i /></span><div><strong>{title}</strong><p>{text}</p></div></div>)}</div></section>

    <section className="closing section-wrap" id="start"><div><SectionLabel>Start here</SectionLabel><h2>Build something worth building.<br /><em>With the right people.</em></h2><p>CapForge turns startup discovery into startup formation.</p></div><div className="closing-actions"><Link className="button button-dark" to="/sign-up">Get Started <ArrowUpRight size={16} /></Link><a className="text-link" href="#discover">Explore the ecosystem <ArrowDownRight size={16} /></a></div></section>

    <footer id="footer" className="site-footer section-wrap"><div className="footer-top"><Logo /><p>Intelligence for the people<br />building what's next.</p><a className="back-top" href="#top">Back to top <ArrowUpRight size={14} /></a></div><div className="footer-links"><div><span>Product</span><a href="#discover">Discover</a><a href="#intelligence">AI Matching</a><a href="#founders">Team Builder</a><a href="#connect">Workspace</a></div><div><span>Ecosystem</span><a href="#founders">Founders</a><a href="#contributors">Contributors</a><a href="#investors">Investors</a></div><div><span>Company</span><a href="#top">About</a><a href="#start">Contact</a><a href="#top">Privacy</a><a href="#top">Terms</a></div></div><div className="footer-bottom"><span>© 2026 CapForge</span><span>Built for ambitious teams</span><span>AI-powered. Human-led.</span></div></footer>
  </main>;
}
