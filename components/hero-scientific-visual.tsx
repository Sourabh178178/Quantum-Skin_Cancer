"use client";

import { motion, useReducedMotion } from "framer-motion";

const signals = [
  { label: "HR", raw: [82, 100], final: [152, 192] }, { label: "BP", raw: [181, 378], final: [232, 292] },
  { label: "ECG", raw: [254, 108], final: [300, 154] }, { label: "GLU", raw: [349, 336], final: [365, 250] },
  { label: "SpO₂", raw: [446, 96], final: [430, 150] }, { label: "BIO / 03", raw: [504, 330], final: [478, 314] },
  { label: "Q / STATE", raw: [562, 185], final: [523, 208] }, { label: "FEATURE", raw: [610, 365], final: [575, 334] },
] as const;

const travellingSignals = [
  { key: "hr", points: [[152, 192], [380, 232], [602, 330]], delay: 5, color: "var(--olive)" },
  { key: "glu", points: [[365, 250], [484, 276], [602, 330]], delay: 7.5, color: "var(--sage)" },
  { key: "bp", points: [[232, 292], [434, 290], [602, 330]], delay: 10.5, color: "var(--olive)" },
  { key: "spo2", points: [[430, 150], [518, 244], [602, 330]], delay: 13, color: "var(--sage)" },
  { key: "ecg", points: [[300, 154], [478, 248], [602, 330]], delay: 16, color: "var(--lavender)" },
] as const;

export function HeroScientificVisual() {
  const reduce = useReducedMotion();
  const intro = reduce ? 0 : 1;
  const markerDelay = (index: number) => reduce ? 0 : .72 + index * .13;

  return <div className="intelligence-map" aria-label="Clinical signals organising into a screening insight">
    <svg viewBox="0 0 670 510" fill="none" xmlns="http://www.w3.org/2000/svg">
      <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: .9 * intro, duration: .8 * intro }}>
        <path className="map-grid" d="M44 74H627M44 150H627M44 226H627M44 302H627M44 378H627M92 42V434M198 42V434M304 42V434M410 42V434M516 42V434" />
      </motion.g>
      <motion.line x1="46" x2="46" y1="48" y2="438" stroke="var(--sage)" strokeWidth="1" initial={{ opacity: 0 }} animate={{ x1: reduce ? 46 : 627, x2: reduce ? 46 : 627, opacity: reduce ? 0 : [0, .7, 0] }} transition={{ delay: .48 * intro, duration: 1.75 * intro, ease: "easeInOut" }} />

      {signals.map((signal, index) => <g key={signal.label}>
        <motion.circle cx={signal.raw[0]} cy={signal.raw[1]} r={index === 6 ? 6 : 4} fill={index === 6 ? "var(--lavender)" : "var(--olive)"} initial={{ opacity: reduce ? 1 : .33 }} animate={{ cx: signal.final[0], cy: signal.final[1], opacity: 1 }} transition={{ delay: markerDelay(index), duration: 2.25 * intro, ease: "easeInOut" }} />
        <motion.text x={signal.raw[0] + 9} y={signal.raw[1] - 9} fill="rgba(32,34,29,.65)" fontSize="9" fontFamily="DM Mono, monospace" letterSpacing=".4" initial={{ opacity: reduce ? 1 : 0 }} animate={{ x: signal.final[0] + 9, y: signal.final[1] - 9, opacity: 1 }} transition={{ delay: markerDelay(index) + .2 * intro, duration: 2.25 * intro, ease: "easeInOut" }}>{signal.label}</motion.text>
        {index < 5 && <motion.circle cx={signal.final[0]} cy={signal.final[1]} r="4" fill="none" stroke="var(--olive)" strokeWidth=".7" animate={reduce ? {} : { r: [4, 4.35, 4], opacity: [0, .56, 0] }} transition={{ delay: 4.4 + index * 1.15, duration: 1.2, repeat: Infinity, repeatDelay: 10.4, ease: "easeInOut" }} />}
      </g>)}

      <motion.g animate={reduce ? {} : { y: [0, -3, 1, 0], scaleY: [1, 1.015, .99, 1] }} transition={{ delay: 4, duration: 8, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} style={{ transformOrigin: "292px 250px" }}>
        <motion.path d="M95 312C161 252 200 332 259 261C319 189 333 235 381 213C428 192 447 252 489 250" stroke="var(--olive)" strokeWidth="1.35" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? 1 : 0 }} animate={{ pathLength: 1, opacity: 1 }} transition={{ delay: 1.28 * intro, duration: 1.7 * intro, ease: "easeInOut" }} />
      </motion.g>
      <motion.g animate={reduce ? {} : { y: [0, 2.5, -1, 0], x: [0, .8, 0] }} transition={{ delay: 4.3, duration: 11, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} style={{ transformOrigin: "325px 190px" }}>
        <motion.path d="M118 207C196 139 245 197 303 171C358 147 390 107 446 150C481 178 490 225 529 208" stroke="var(--sage)" strokeWidth="1" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? .8 : 0 }} animate={{ pathLength: 1, opacity: .8 }} transition={{ delay: 1.43 * intro, duration: 1.55 * intro, ease: "easeInOut" }} />
      </motion.g>

      <motion.g initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.25 * intro, duration: .7 * intro }}>
        <motion.path d="M474 152C536 113 589 154 581 213C574 266 488 274 472 218C455 164 544 135 607 179" stroke="var(--lavender)" strokeWidth="1" animate={reduce ? {} : { rotate: 360 }} transition={{ delay: 3.5, duration: 14, repeat: Infinity, ease: "linear" }} style={{ transformOrigin: "540px 210px" }} />
        <motion.circle cx="523" cy="208" r="14" stroke="var(--lavender)" strokeWidth=".8" animate={reduce ? {} : { r: [14, 14.7, 14], opacity: [.72, 1, .72] }} transition={{ delay: 4.5, duration: 12, repeat: Infinity, repeatType: "mirror", ease: "easeInOut" }} />
      </motion.g>

      <motion.path d="M490 250C533 262 553 301 602 330M489 250C542 235 573 278 602 330M529 208C557 243 577 289 602 330" stroke="var(--terracotta)" strokeWidth=".85" initial={{ pathLength: reduce ? 1 : 0, opacity: reduce ? .7 : 0 }} animate={{ pathLength: 1, opacity: .7 }} transition={{ delay: 2.85 * intro, duration: .85 * intro, ease: "easeInOut" }} />
      <motion.circle cx="602" cy="330" r="6" fill="var(--terracotta)" initial={{ opacity: reduce ? 1 : 0, scale: .5 }} animate={{ opacity: 1, scale: [0.5, 1, 1] }} transition={{ delay: 3.55 * intro, duration: .45 * intro, ease: "easeOut" }} />
      <motion.circle cx="602" cy="330" r="6" stroke="var(--terracotta)" strokeWidth=".8" initial={{ opacity: 0, scale: 1 }} animate={reduce ? {} : { opacity: [0, .6, 0], scale: [1, 3.1, 3.1] }} transition={{ delay: 3.65, duration: .8, ease: "easeOut" }} />
      <motion.text x="550" y="363" fill="var(--terracotta)" fontSize="9" fontFamily="DM Mono, monospace" letterSpacing=".5" initial={{ opacity: reduce ? 1 : 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.55 * intro, duration: .4 * intro }}>RISK / SIGNAL</motion.text>

      {travellingSignals.map(({ key, points, delay, color }) => <motion.circle key={key} r="3" fill={color} initial={{ opacity: 0 }} animate={reduce ? {} : { cx: points.map(point => point[0]), cy: points.map(point => point[1]), opacity: [0, .9, 0] }} transition={{ delay, duration: 1.55, repeat: Infinity, repeatDelay: 19.5, ease: "easeInOut" }} />)}
      {travellingSignals.map(({ key, delay }) => <motion.circle key={`response-${key}`} cx="602" cy="330" r="7" fill="none" stroke="var(--terracotta)" strokeWidth=".7" initial={{ opacity: 0 }} animate={reduce ? {} : { opacity: [0, .38, 0], scale: [1, 2.3, 2.3] }} transition={{ delay: delay + 1.35, duration: .65, repeat: Infinity, repeatDelay: 19.5, ease: "easeOut" }} />)}
    </svg>
    <span className="map-caption c-one">RAW / SIGNAL</span><span className="map-caption c-two">FEATURE / SPACE</span><span className="map-caption c-three">SCREENING / INSIGHT</span>
  </div>;
}
