"use client";

import { ArrowDown, ArrowUpRight, Menu, MoveRight, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { HeroScientificVisual } from "./hero-scientific-visual";
import { ModelPipeline } from "./model-pipeline";

const links = ["Overview", "Technology", "Screening", "Research", "About"];
const fade = { initial: { opacity: 0, y: 16 }, whileInView: { opacity: 1, y: 0 }, viewport: { once: true, amount: 0.25 }, transition: { duration: 0.7 } };

function SectionLabel({ children }: { children: React.ReactNode }) {
  return <p className="eyebrow"><span />{children}</p>;
}

export function LandingPage() {
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => { const onScroll = () => setScrolled(window.scrollY > 18); onScroll(); window.addEventListener("scroll", onScroll, { passive: true }); return () => window.removeEventListener("scroll", onScroll); }, []);
  return <main>
    <nav className={`nav-shell landing-nav ${scrolled ? "is-scrolled" : ""}`} aria-label="Primary navigation"><a href="#top" className="wordmark">MedQube<sup>®</sup></a><div className="nav-links">{links.filter(link => link !== "About").map(link => <a key={link} href={`#${link.toLowerCase()}`}>{link}</a>)}<a className="nav-cta" href="/screening">Start screening <ArrowUpRight size={15}/></a></div><button className="menu-button" onClick={() => setOpen(!open)} aria-label="Toggle navigation">{open ? <X /> : <Menu />}</button><AnimatePresence>{open && <motion.div className="mobile-menu" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}>{links.filter(link => link !== "About").map(link => <a key={link} onClick={() => setOpen(false)} href={`#${link.toLowerCase()}`}>{link}</a>)}<a href="/screening" className="button primary">Start screening <ArrowUpRight size={16}/></a></motion.div>}</AnimatePresence></nav>

    <section className="hero" id="top"><div className="hero-copy"><motion.p className="eyebrow" initial={{opacity:0}} animate={{opacity:1}}><span />Early detection / decision support</motion.p><motion.h1 initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .8, delay: .12 }}>Detect earlier.<br/><em>Understand deeper.</em></motion.h1><motion.div className="hero-bottom" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .7, delay: .32 }}><p>A quantum-assisted clinical screening platform designed to analyse health indicators and surface patterns associated with elevated disease risk.</p></motion.div></div><HeroScientificVisual /><div className="hero-action-row"><a href="#technology" className="text-link">Explore the technology <MoveRight size={18}/></a><a href="/screening" className="hero-cta">Start screening <ArrowUpRight size={18}/></a></div><div className="hero-rule"><span>Independent clinical decision support</span><span>Scroll to explore <ArrowDown size={15}/></span></div></section>

    <section className="statement section" id="overview"><motion.div {...fade}><SectionLabel>Why earlier matters</SectionLabel><h2>Disease progression<br/>doesn&apos;t wait <em>for diagnosis.</em></h2></motion.div><motion.div className="statement-side" {...fade}><p>Subtle changes can precede symptoms. Screening creates a thoughtful opportunity to examine health signals sooner—supporting conversations with clinicians, not replacing them.</p><a className="text-link" href="#research">Our research approach <ArrowUpRight size={17}/></a></motion.div></section>

    <section className="process-section section" id="technology"><motion.div {...fade}><SectionLabel>From signal to insight</SectionLabel><div className="process-heading"><h2>A measured path through complex information.</h2><p>Every stage is designed as a transparent part of a future clinical workflow. This interface is a product preview, not a diagnostic tool.</p></div></motion.div><motion.div {...fade}><ModelPipeline /></motion.div></section>

    <section className="screening section" id="screening"><motion.div className="screening-intro" {...fade}><SectionLabel>Screening interface / preview</SectionLabel><h2>A calmer view<br/>of the signals.</h2><p>A considered workspace for reviewing patient parameters and discussing possible next steps.</p></motion.div><motion.div className="app-preview" {...fade}><div className="app-top"><span>SCREENING WORKSPACE</span><span>DEMO DATA ONLY</span></div><div className="app-body"><div className="parameters"><h3>Patient parameters</h3>{[["Age range","45–54"],["Blood pressure","128 / 84"],["Glucose","98 mg/dL"]].map(([a,b])=><div className="parameter" key={a}><span>{a}</span><strong>{b}</strong></div>)}<button className="analysis-button">Run analysis <ArrowUpRight size={16}/></button></div><div className="risk-panel"><div><p>Pattern review</p><h3>Elevated risk<br/>indicators <em>detected.</em></h3></div><div className="risk-meter"><svg viewBox="0 0 180 100"><path d="M15 88A75 75 0 0 1 165 88" className="meter-bg"/><path d="M15 88A75 75 0 0 1 128 25" className="meter-fill"/></svg><strong>Review</strong><small>Further clinical evaluation may be recommended.</small></div></div></div></motion.div></section>

    <section className="closing" id="research"><div><SectionLabel>Research-led screening</SectionLabel><h2>Make space for<br/><em>earlier attention.</em></h2></div><a href="#top" className="closing-link">Explore the platform <ArrowUpRight size={24}/></a><footer id="about"><span>MedQube / SIH prototype</span><span>Early disease detection using quantum models</span><span>© 2026</span></footer></section>
  </main>;
}
