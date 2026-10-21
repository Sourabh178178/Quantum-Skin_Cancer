"use client";

import { motion, useReducedMotion } from "framer-motion";
import { useState } from "react";

const stages = [
  { number: "01", name: "Clinical Data", detail: "Biomarker values, clinical observations and image inputs are gathered as structured signals.", tone: "olive" },
  { number: "02", name: "Feature Processing", detail: "Raw inputs are organised into a model-ready representation for further research analysis.", tone: "sage" },
  { number: "03", name: "Quantum Model", detail: "An emerging research layer for examining complex health-indicator relationships—without claims of advantage or certainty.", tone: "lavender" },
  { number: "04", name: "Risk Analysis", detail: "The resulting pattern is presented for screening and thoughtful clinical follow-up.", tone: "terracotta" },
  { number: "05", name: "Screening Insight", detail: "A clear, interpretable starting point for further clinical evaluation where appropriate.", tone: "forest" },
];

export function ModelPipeline() {
  const [active, setActive] = useState(0); const reduce = useReducedMotion();
  return <div className="model-pipeline"> <div className="pipeline-rail" aria-hidden="true"><motion.i animate={reduce ? {} : { top: ["1%", "98%"] }} transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}/></div><div className="pipeline-stages">{stages.map((stage,index) => <button key={stage.number} className={`pipeline-stage ${stage.tone} ${active === index ? "active" : ""}`} onMouseEnter={() => setActive(index)} onFocus={() => setActive(index)} onClick={() => setActive(index)}><span>{stage.number}</span><strong>{stage.name}</strong><i aria-hidden="true">{index < 4 ? "↓" : "↗"}</i></button>)}</div><motion.div className={`pipeline-detail ${stages[active].tone}`} key={active} initial={{ opacity: 0, y: 9 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: .3 }}><span>ACTIVE STAGE / {stages[active].number}</span><h3>{stages[active].name}</h3><p>{stages[active].detail}</p><div className="stage-glyph" aria-hidden="true"><i/><i/><i/><i/></div></motion.div></div>;
}
