"use client";
import { ArrowLeft, ArrowUpRight, FileImage, RotateCcw, Upload, X, Clock, ChevronDown, ChevronUp } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { ChangeEvent, DragEvent, useEffect, useRef, useState } from "react";
import { diseaseConfig, diseaseList, type DiseaseType, type Field, classInfo } from "@/lib/screening-config";
import { runInference, type Result } from "@/lib/mock-inference";

type Stage = "select" | "input" | "analyzing" | "result";
const reveal = { initial: { opacity: 0, y: 12 }, animate: { opacity: 1, y: 0 }, exit: { opacity: 0, y: -8 }, transition: { duration: .35 } };

// ─── localStorage history ────────────────────────────────────────────────────

type HistoryEntry = {
  id: string;
  timestamp: string;
  primary: string;
  confidence?: number;
  connected: boolean;
  weights_loaded: boolean;
  image_name?: string;
};

function saveHistory(result: Result, data: Record<string, string>) {
  try {
    const entry: HistoryEntry = {
      id: Date.now().toString(),
      timestamp: new Date().toISOString(),
      primary: result.primary,
      confidence: result.confidence,
      connected: result.connected ?? false,
      weights_loaded: result.weights_loaded ?? false,
      image_name: data.image,
    };
    const existing: HistoryEntry[] = JSON.parse(localStorage.getItem("medqube_history") || "[]");
    const next = [entry, ...existing].slice(0, 10);
    localStorage.setItem("medqube_history", JSON.stringify(next));
  } catch {}
}

function loadHistory(): HistoryEntry[] {
  try {
    return JSON.parse(localStorage.getItem("medqube_history") || "[]");
  } catch {
    return [];
  }
}

const readable: Record<string, string> = {
  AKIEC: "Actinic keratoses / intraepithelial carcinoma",
  BCC: "Basal cell carcinoma",
  BKL: "Benign keratosis-like lesions",
  DF: "Dermatofibroma",
  MEL: "Melanoma",
  NV: "Melanocytic nevi",
  VASC: "Vascular lesions",
};

// ─── Sub-components ──────────────────────────────────────────────────────────

function Topbar({ backendOnline, weightsLoaded }: { backendOnline?: boolean; weightsLoaded?: boolean }) {
  return (
    <nav className="nav-shell">
      <a href="/" className="wordmark">MedQube<sup>®</sup></a>
      <div className="screening-nav-label flex items-center gap-3">
        <span>Major project / screening workspace</span>
        {backendOnline ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/40">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
            QEMNet Live Backend {weightsLoaded ? "• Weights Active" : "• Architecture Ready"}
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-zinc-800/80 text-zinc-400 border border-zinc-700/50">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
            Simulation Mode (Start backend for Live QNN)
          </span>
        )}
      </div>
      <a className="text-link" href="/">Return home <ArrowUpRight size={15}/></a>
    </nav>
  );
}

function ConfidenceBadge({ confidence, weightsLoaded, connected }: { confidence?: number; weightsLoaded?: boolean; connected?: boolean }) {
  if (!connected || !weightsLoaded) {
    return <span className="conf-badge conf-sim">Simulated result</span>;
  }
  if (!confidence) return null;
  if (confidence >= 75) return <span className="conf-badge conf-high">High confidence · {confidence}%</span>;
  if (confidence >= 50) return <span className="conf-badge conf-moderate">Moderate confidence · {confidence}%</span>;
  return <span className="conf-badge conf-low">Low confidence · {confidence}% — treat with caution</span>;
}

function WarningsPanel({ warnings }: { warnings?: string[] }) {
  if (!warnings?.length) return null;
  return (
    <div className="warnings-panel">
      {warnings.map((w, i) => (
        <p key={i}>⚠ {w}</p>
      ))}
    </div>
  );
}

function DifferentialsPanel({ probabilities, primary }: { probabilities: Result["probabilities"]; primary: string }) {
  if (!probabilities || probabilities.length < 2) return null;
  const sorted = [...probabilities].sort((a, b) => b.value - a.value);
  const top3 = sorted.slice(0, 3);

  return (
    <div className="differentials-panel">
      <span className="result-panel-label">Differential ranking</span>
      <div className="differentials-list">
        {top3.map((item, i) => {
          const info = classInfo[item.label];
          return (
            <div key={item.label} className={`differential-row ${i === 0 ? "top" : ""}`}>
              <span className="diff-rank">0{i + 1}</span>
              <div className="diff-body">
                <strong>{item.label}</strong>
                <small>{info?.fullName || item.name || readable[item.label] || item.label}</small>
                {info && <p className="diff-note">{info.differentialNote}</p>}
              </div>
              <span className="diff-pct">{item.value}%</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function ABCDEPanel({ primary }: { primary: string }) {
  const info = classInfo[primary];
  const [open, setOpen] = useState(false);
  if (!info) return null;

  const relevantCount = info.abcde.filter(a => a.relevant).length;

  return (
    <div className="abcde-panel">
      <button className="abcde-toggle" onClick={() => setOpen(o => !o)}>
        <span className="result-panel-label" style={{ margin: 0 }}>ABCDE Clinical Criteria</span>
        <span className="abcde-summary">
          {relevantCount > 0
            ? `${relevantCount} criterion${relevantCount > 1 ? "a" : ""} relevant for ${primary}`
            : `No prominent ABCDE flags for ${primary}`}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="abcde-grid" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.25 }}>
            {info.abcde.map(item => (
              <div key={item.letter} className={`abcde-item ${item.relevant ? "flagged" : ""}`}>
                <span className="abcde-letter">{item.letter}</span>
                <div>
                  <strong>{item.criterion}</strong>
                  <p>{item.note}</p>
                </div>
                <span className={`abcde-dot ${item.relevant ? "on" : "off"}`} />
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function QuantumPanel({ weights, outputs }: { weights?: number[][] | null; outputs?: number[] | null }) {
  if (!weights || !outputs) return null;

  const allWeights = weights.flat();
  const max = Math.max(...allWeights.map(Math.abs), 0.01);

  return (
    <div className="quantum-panel">
      <span className="result-panel-label">Quantum layer — 2-qubit variational circuit</span>
      <div className="quantum-panel-body">
        {/* Static circuit diagram */}
        <div className="circuit-diagram" aria-label="2-qubit PennyLane variational circuit">
          <svg viewBox="0 0 320 100" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* qubit lines */}
            <line x1="12" y1="30" x2="308" y2="30" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="12" y1="70" x2="308" y2="70" stroke="var(--lavender)" strokeWidth="1"/>
            {/* qubit labels */}
            <text x="2" y="33" fill="var(--lavender)" fontSize="7" fontFamily="DM Mono, monospace">q₀</text>
            <text x="2" y="73" fill="var(--lavender)" fontSize="7" fontFamily="DM Mono, monospace">q₁</text>
            {/* RY input gates */}
            {[{cx:38,cy:30},{cx:38,cy:70}].map((g,i)=>(
              <g key={i}>
                <rect x={g.cx-10} y={g.cy-9} width="20" height="18" rx="2" fill="#1a1529" stroke="var(--lavender)" strokeWidth="0.8"/>
                <text x={g.cx} y={g.cy+3} textAnchor="middle" fill="var(--lavender)" fontSize="6" fontFamily="DM Mono, monospace">RY</text>
              </g>
            ))}
            {/* Layer 1 */}
            {[{cx:90,cy:30},{cx:90,cy:70},{cx:118,cy:30},{cx:118,cy:70}].map((g,i)=>(
              <g key={i}>
                <rect x={g.cx-10} y={g.cy-9} width="22" height="18" rx="2" fill="#1a1529" stroke="rgba(169,159,197,0.6)" strokeWidth="0.7"/>
                <text x={g.cx+1} y={g.cy+3} textAnchor="middle" fill="rgba(169,159,197,0.9)" fontSize="5.5" fontFamily="DM Mono, monospace">{i<2?"RX":"RZ"}</text>
              </g>
            ))}
            {/* CNOT layer 1 */}
            <line x1="148" y1="30" x2="148" y2="70" stroke="rgba(169,159,197,0.7)" strokeWidth="0.8"/>
            <circle cx="148" cy="30" r="3" fill="var(--lavender)"/>
            <circle cx="148" cy="70" r="5" fill="none" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="148" y1="65" x2="148" y2="75" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="143" y1="70" x2="153" y2="70" stroke="var(--lavender)" strokeWidth="1"/>
            {/* CNOT reverse */}
            <line x1="168" y1="30" x2="168" y2="70" stroke="rgba(169,159,197,0.7)" strokeWidth="0.8"/>
            <circle cx="168" cy="70" r="3" fill="var(--lavender)"/>
            <circle cx="168" cy="30" r="5" fill="none" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="168" y1="25" x2="168" y2="35" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="163" y1="30" x2="173" y2="30" stroke="var(--lavender)" strokeWidth="1"/>
            {/* Layer 2 */}
            {[{cx:198,cy:30},{cx:198,cy:70},{cx:226,cy:30},{cx:226,cy:70}].map((g,i)=>(
              <g key={i}>
                <rect x={g.cx-10} y={g.cy-9} width="22" height="18" rx="2" fill="#1a1529" stroke="rgba(169,159,197,0.6)" strokeWidth="0.7"/>
                <text x={g.cx+1} y={g.cy+3} textAnchor="middle" fill="rgba(169,159,197,0.9)" fontSize="5.5" fontFamily="DM Mono, monospace">{i<2?"RX":"RZ"}</text>
              </g>
            ))}
            {/* CNOT layer 2 */}
            <line x1="255" y1="30" x2="255" y2="70" stroke="rgba(169,159,197,0.7)" strokeWidth="0.8"/>
            <circle cx="255" cy="30" r="3" fill="var(--lavender)"/>
            <circle cx="255" cy="70" r="5" fill="none" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="255" y1="65" x2="255" y2="75" stroke="var(--lavender)" strokeWidth="1"/>
            <line x1="250" y1="70" x2="260" y2="70" stroke="var(--lavender)" strokeWidth="1"/>
            {/* Measurement boxes */}
            {[{cx:290,cy:30},{cx:290,cy:70}].map((g,i)=>(
              <g key={i}>
                <rect x={g.cx-10} y={g.cy-9} width="20" height="18" rx="2" fill="#1a1529" stroke="rgba(199,123,93,0.8)" strokeWidth="0.8"/>
                <text x={g.cx} y={g.cy+3} textAnchor="middle" fill="rgba(199,123,93,0.9)" fontSize="5.5" fontFamily="DM Mono, monospace">⟨Z⟩</text>
              </g>
            ))}
          </svg>
        </div>

        {/* Learned weights */}
        <div className="quantum-weights">
          <p className="quantum-sublabel">Learned variational weights (radians)</p>
          <div className="weight-bars">
            {weights.map((layer, li) =>
              layer.map((w, qi) => {
                const pct = Math.round((Math.abs(w) / max) * 100);
                return (
                  <div key={`${li}-${qi}`} className="weight-bar-row">
                    <span>L{li+1}/q{qi}</span>
                    <div className="weight-track">
                      <div className="weight-fill" style={{ width: `${pct}%` }} />
                    </div>
                    <span>{w.toFixed(3)}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Expectation values */}
        <div className="quantum-outputs">
          <p className="quantum-sublabel">PauliZ expectation values</p>
          {outputs.map((v, i) => (
            <div key={i} className="expval-row">
              <span>⟨Z⟩q{i}</span>
              <span className="expval-val">{v.toFixed(4)}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}


function HistoryPanel({ history, onReselect }: { history: HistoryEntry[]; onReselect: (id: DiseaseType) => void }) {
  const [open, setOpen] = useState(false);
  if (history.length === 0) return null;

  return (
    <div className="history-panel">
      <button className="history-toggle" onClick={() => setOpen(o => !o)}>
        <Clock size={12} />
        <span>Recent screenings ({history.length})</span>
        {open ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="history-list" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} transition={{ duration: 0.22 }}>
            {history.map(entry => (
              <div key={entry.id} className="history-row">
                <div>
                  <strong>{readable[entry.primary] || entry.primary}</strong>
                  <small>{entry.image_name && `${entry.image_name} · `}{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  {entry.confidence !== undefined && <span className="history-conf">{entry.confidence}%</span>}
                  <span className={`history-source ${entry.connected ? "live" : "sim"}`}>{entry.connected ? "Live" : "Sim"}</span>
                  <button onClick={() => onReselect("skinCancer")}>Rescreen <ArrowUpRight size={11}/></button>
                </div>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Selector ────────────────────────────────────────────────────────────────

function Selector({ select }: { select: (id: DiseaseType) => void }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  useEffect(() => { setHistory(loadHistory()); }, []);

  return (
    <motion.section {...reveal} className="screen-shell">
      <p className="eyebrow"><span />Screening pathways</p>
      <h1 className="screen-title">Choose a screening<br/><em>pathway.</em></h1>
      <p className="screen-lead">Select the kind of input you would like to review. Dermoscopic image screening connects directly to the QEMNet Quantum Neural Network backend.</p>
      <HistoryPanel history={history} onReselect={select} />
      <div className="disease-grid">
        {diseaseList.map((disease, index) => (
          <article className="disease-card" key={disease.id}>
            <div>
              <span className="card-index">0{index + 1}</span>
              <p className="card-category">{disease.category}</p>
            </div>
            <h2>{disease.title}</h2>
            <p>{disease.description}</p>
            <div className="card-foot">
              <span>{disease.input}</span>
              <button onClick={() => select(disease.id)}>
                {disease.inputType === "image" ? "Upload Image" : "Begin Screening"}
                <ArrowUpRight size={16}/>
              </button>
            </div>
          </article>
        ))}
      </div>
    </motion.section>
  );
}

// ─── Form components ─────────────────────────────────────────────────────────

function FormField({ field, value, error, update }: { field: Field; value: string; error?: string; update: (value: string) => void }) {
  const id = `field-${field.key}`;
  return (
    <div className={`form-field ${error ? "has-error" : ""}`}>
      <label htmlFor={id}>{field.label}</label>
      {field.type === "select" ? (
        <select id={id} value={value} onChange={e => update(e.target.value)} aria-invalid={!!error}>
          <option value="">Select an option</option>
          {field.options?.map(option => <option value={option.value} key={option.value}>{option.label}</option>)}
        </select>
      ) : (
        <div className="number-control">
          <input id={id} type="number" step={field.step ?? "1"} value={value} onChange={e => update(e.target.value)} aria-invalid={!!error}/>
          {field.unit && <span>{field.unit}</span>}
        </div>
      )}
      {error && <small role="alert">{error}</small>}
    </div>
  );
}

function TabularForm({ disease, submit, initialValues }: { disease: DiseaseType; submit: (data: Record<string,string>) => void; initialValues?: Record<string,string> }) {
  const config = diseaseConfig[disease];
  const [values, setValues] = useState<Record<string,string>>(initialValues ?? {});
  const [errors, setErrors] = useState<Record<string,string>>({});
  const validate = () => {
    const next: Record<string,string> = {};
    config.sections?.flatMap(section => section.fields).forEach(field => {
      const value = values[field.key]?.trim();
      if (!value) next[field.key] = `${field.label} is required.`;
      else if (field.type === "number" && !Number.isFinite(Number(value))) next[field.key] = `Enter a valid ${field.label.toLowerCase()}.`;
    });
    setErrors(next);
    return Object.keys(next).length === 0;
  };
  return (
    <form onSubmit={event => { event.preventDefault(); if (validate()) submit(values); }} noValidate>
      {config.sections?.map(section => (
        <section className="form-section" key={section.title}>
          <div className="form-section-head">
            <span>{section.title}</span>
            <small>Required clinical input</small>
          </div>
          <div className="field-grid">
            {section.fields.map(field => (
              <FormField key={field.key} field={field} value={values[field.key] ?? ""} error={errors[field.key]} update={value => setValues(current => ({...current, [field.key]: value}))}/>
            ))}
          </div>
        </section>
      ))}
      <button className="button primary form-submit" type="submit">Run screening <ArrowUpRight size={17}/></button>
    </form>
  );
}

function ImageUpload({
  label, submit, initialValues, fileObj, setFileObj, backendOnline,
}: {
  label: string;
  submit: (data: Record<string,string>, file?: File | null) => void;
  initialValues?: Record<string,string>;
  fileObj: File | null;
  setFileObj: (f: File | null) => void;
  backendOnline?: boolean;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState(initialValues?.preview ?? "");
  const [error, setError] = useState("");

  const apply = (candidate?: File) => {
    if (!candidate) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(candidate.type)) {
      setError("Please upload a JPG, JPEG, or PNG image.");
      return;
    }
    if (preview) URL.revokeObjectURL(preview);
    setFileObj(candidate);
    setPreview(URL.createObjectURL(candidate));
    setError("");
  };

  const choose = (event: ChangeEvent<HTMLInputElement>) => apply(event.target.files?.[0]);
  const drop = (event: DragEvent<HTMLDivElement>) => { event.preventDefault(); apply(event.dataTransfer.files?.[0]); };

  return (
    <div>
      {preview ? (
        <div className="image-preview">
          <img src={preview} alt={`Selected ${label}`} />
          <div>
            <p>{fileObj?.name ?? initialValues?.image}</p>
            <small>{backendOnline ? "Ready for QEMNet live quantum inference" : "Ready for screening (simulation mode)"}</small>
            <div className="preview-actions">
              <button type="button" onClick={() => input.current?.click()}>Replace image</button>
              <button type="button" onClick={() => { if(preview) URL.revokeObjectURL(preview); setPreview(""); setFileObj(null); }}>Remove <X size={14}/></button>
            </div>
          </div>
        </div>
      ) : (
        <div className="upload-zone" onDragOver={event => event.preventDefault()} onDrop={drop}>
          <FileImage size={29}/>
          <p>Drop a {label} here</p>
          <small>JPG, JPEG or PNG · HAM10000 compatible dermoscopic lesion</small>
          <button type="button" onClick={() => input.current?.click()}>Choose image <Upload size={15}/></button>
        </div>
      )}
      <input ref={input} className="visually-hidden" type="file" accept="image/jpeg,image/png,image/webp" onChange={choose}/>
      {error && <p className="upload-error" role="alert">{error}</p>}

      {!backendOnline && (
        <div className="mt-3 text-xs text-amber-300 bg-amber-950/40 border border-amber-800/50 p-3 rounded-lg">
          ⚠️ <strong>Backend offline:</strong> Real-time QEMNet quantum inference requires the Python server. Run <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">python run_backend.py</code> or <code className="bg-black/40 px-1 py-0.5 rounded text-amber-200">npm run dev:all</code> in your terminal.
        </div>
      )}
      {backendOnline && (
        <div className="mt-3 text-xs text-emerald-300 bg-emerald-950/40 border border-emerald-800/50 p-2.5 rounded-lg flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span><strong>Quantum backend online:</strong> Live MobileNetV2 + PennyLane QNN forward pass ready.</span>
        </div>
      )}

      <button
        className="button primary form-submit"
        onClick={() => {
          if (preview) {
            submit({
              image: fileObj?.name ?? initialValues?.image ?? "uploaded_lesion.jpg",
              size: String(fileObj?.size ?? initialValues?.size ?? ""),
              preview,
              type: fileObj?.type ?? initialValues?.type ?? "image/jpeg"
            }, fileObj);
          } else {
            setError(`Please upload a ${label} before screening.`);
          }
        }}
      >
        Run screening <ArrowUpRight size={17}/>
      </button>
    </div>
  );
}

// ─── Analysis view ────────────────────────────────────────────────────────────

function Analysis({ disease, backendOnline }: { disease: DiseaseType; backendOnline?: boolean }) {
  const steps = [
    "Dermoscopic image validated",
    "Resize (224×224) & RGB tensor normalization",
    "MobileNetV2 feature extractor (17 stages)",
    "PennyLane 2-Qubit Variational Quantum Layer",
    "HAM10000 7-class probability convergence"
  ];
  return (
    <motion.section {...reveal} className="screen-shell analysis-view">
      <p className="eyebrow"><span />{backendOnline ? "QEMNet live pipeline" : "Simulated inference"}</p>
      <h1 className="screen-title">Reviewing the<br/><em>input.</em></h1>
      <div className="analysis-steps">
        {steps.map((step, index) => (
          <motion.div key={step} initial={{ opacity: .25 }} animate={{ opacity: 1 }} transition={{ delay: index * .25 }}>
            <span>0{index + 1}</span>
            <strong>{step}</strong>
            {index < 4 && <i>↓</i>}
          </motion.div>
        ))}
      </div>
      <p>
        {backendOnline
          ? "Computing classical-quantum hybrid forward pass across 2 qubits and variational rotational gates."
          : "Preparing demonstration screening result. Run 'python run_backend.py' to enable real-time PyTorch + PennyLane execution."}
      </p>
    </motion.section>
  );
}

// ─── Result view ──────────────────────────────────────────────────────────────

function ResultView({
  disease, result, data, restart, back,
}: {
  disease: DiseaseType;
  result: Result;
  data: Record<string,string>;
  restart: () => void;
  back: () => void;
}) {
  const config = diseaseConfig[disease];
  const isLive = result.connected ?? false;
  const weightsLoaded = result.weights_loaded ?? false;

  return (
    <motion.section {...reveal} className="screen-shell result-view">
      {/* Header row */}
      <div className="result-kicker">
        <p className="eyebrow"><span />Screening result</p>
        <span className={`simulation-tag ${isLive ? "border-emerald-600/50 text-emerald-400 bg-emerald-950/40" : ""}`}>
          {isLive ? (weightsLoaded ? "⚡ Live QEMNet Model (Trained)" : "⚡ Live QEMNet (Architecture Mode)") : "Simulated screening"}
        </span>
      </div>

      {/* Warnings from backend */}
      <WarningsPanel warnings={result.warnings} />

      {/* Summary */}
      <div className="result-summary">
        <div>
          <p className="result-context">{config.title} screening</p>
          <h1>Skin Cancer Screening</h1>
          <ConfidenceBadge confidence={result.confidence} weightsLoaded={weightsLoaded} connected={isLive} />
        </div>
      </div>

      {/* Primary classification */}
      <div className="classification-result">
        <span>Screening classification</span>
        <strong>{readable[result.primary] ?? result.primary}</strong>
        {result.probabilities?.find(p => p.label === result.primary)?.risk && (
          <small className="block mt-1 text-xs opacity-75">
            Risk Profile: {result.probabilities?.find(p => p.label === result.primary)?.risk}
          </small>
        )}
      </div>

      {/* Probability bars */}
      {result.probabilities ? (
        <div className="probability-panel">
          <div className="result-panel-label">
            {isLive ? "QEMNet Hybrid Quantum-Classical Probabilities" : "Class probabilities"}
          </div>
          {result.probabilities.map(item => {
            const info = classInfo[item.label];
            return (
              <div className={`probability ${item.label === result.primary ? "top" : ""}`} key={item.label}>
                <span title={info?.plainDescription}>
                  {item.label} <small className="opacity-60 font-normal">({info?.fullName || item.name || readable[item.label] || item.label})</small>
                </span>
                <div><i style={{ width: `${item.value}%` }}/></div>
                <strong>{item.value}%</strong>
              </div>
            );
          })}
        </div>
      ) : null}

      {/* Differentials panel (ID 9) */}
      <DifferentialsPanel probabilities={result.probabilities} primary={result.primary} />

      {/* ABCDE panel (ID 5) */}
      <ABCDEPanel primary={result.primary} />

      {/* Quantum circuit panel (ID 13) */}
      <QuantumPanel weights={result.quantum_weights} outputs={result.quantum_outputs} />

      {/* Image and metadata */}
      <div className="image-result">
        <div>
          <span className="result-panel-label">Submitted image</span>
          <div className="image-submitted">
            {data.preview ? <img src={data.preview} alt="Submitted skin lesion" /> : <FileImage size={23}/>}
          </div>
        </div>
        <div className="image-metadata">
          <span className="result-panel-label">Screening input</span>
          <p><b>File</b>{data.image}</p>
          <p><b>Type</b>{data.type?.replace("image/", "").toUpperCase()}</p>
          <p><b>Model</b>{result.model || (isLive ? "HybridMobileNet (2 Qubits)" : "Simulated")}</p>
          <p><b>Inference</b>{isLive ? (weightsLoaded ? "Trained weights active" : "Live forward pass (init weights)") : "Demo simulation"}</p>
          {isLive && <p><b>Weights</b>{result.weights_message?.split("(")[0].trim()}</p>}
        </div>
      </div>

      {/* Pipeline summary */}
      <div className="pipeline result-pipeline">
        <span>Model pipeline / {isLive ? "Live execution" : "Simulated inference"}</span>
        <div>
          <p><b>01 INPUT</b>224×224 Lesion</p>
          <i>→</i>
          <p><b>02 CNN</b>MobileNetV2</p>
          <i>→</i>
          <p className="quantum-step"><b>03 QUANTUM</b>PennyLane 2-Qubit QNN</p>
          <i>→</i>
          <p><b>04 OUTPUT</b>{readable[result.primary] || result.primary}</p>
        </div>
      </div>

      <p className="disclaimer">Screening research prototype based on QEMNet. This result is not a medical diagnosis. <a href="/model-card" style={{ textDecoration: "underline", opacity: 0.7 }}>View model card →</a></p>

      <div className="result-actions">
        <button className="button primary" onClick={restart}>New screening <RotateCcw size={16}/></button>
        <button className="text-link" onClick={back}>Back to input <ArrowLeft size={16}/></button>
      </div>
    </motion.section>
  );
}

// ─── Input view ───────────────────────────────────────────────────────────────

function InputView({
  disease, data, fileObj, setFileObj, backendOnline, reset, run,
}: {
  disease: DiseaseType;
  data: Record<string, string>;
  fileObj: File | null;
  setFileObj: (f: File | null) => void;
  backendOnline?: boolean;
  reset: () => void;
  run: (payload: Record<string, string>, file?: File | null) => void;
}) {
  const config = diseaseConfig[disease];
  return (
    <motion.section {...reveal} className="screen-shell input-view">
      <button className="back-button" onClick={reset}>
        <ArrowLeft size={16} /> Back to disease selection
      </button>
      <p className="eyebrow"><span />{config.category}</p>
      <div className="workspace-heading">
        <div>
          <h1>{config.title}</h1>
          <p>Clinical screening</p>
        </div>
        <span>{config.input}</span>
      </div>
      <p className="screen-lead">
        Upload a dermoscopic lesion image to analyze. The image is passed through the MobileNetV2 backbone and PennyLane quantum circuit to classify across 7 HAM10000 lesion categories.
      </p>
      {config.inputType === "tabular" ? (
        <TabularForm disease={disease} submit={run} initialValues={data} />
      ) : (
        <ImageUpload
          label={config.uploadLabel || "dermoscopic skin-lesion image"}
          submit={run}
          initialValues={data}
          fileObj={fileObj}
          setFileObj={setFileObj}
          backendOnline={backendOnline}
        />
      )}
    </motion.section>
  );
}

// ─── Root component ───────────────────────────────────────────────────────────

export function ScreeningExperience() {
  const [stage, setStage] = useState<Stage>("select");
  const [disease, setDisease] = useState<DiseaseType | null>(null);
  const [result, setResult] = useState<Result | null>(null);
  const [data, setData] = useState<Record<string, string>>({});
  const [fileObj, setFileObj] = useState<File | null>(null);
  const [backendStatus, setBackendStatus] = useState<{ online: boolean; weights_loaded?: boolean } | null>(null);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "auto" });
  }, [stage]);

  useEffect(() => {
    let active = true;
    const checkHealth = () => {
      fetch("/api/predict")
        .then(res => res.json())
        .then(info => {
          if (active) setBackendStatus({ online: info.online ?? false, weights_loaded: info.weights_loaded ?? false });
        })
        .catch(() => { if (active) setBackendStatus({ online: false }); });
    };
    checkHealth();
    const timer = setInterval(checkHealth, 4000);
    return () => { active = false; clearInterval(timer); };
  }, []);

  const select = (id: DiseaseType) => {
    setDisease(id);
    setData({});
    setFileObj(null);
    setStage("input");
  };

  const run = async (payload: Record<string, string>, file?: File | null) => {
    if (!disease) return;
    setData(payload);
    const activeFile = file ?? fileObj;
    setStage("analyzing");
    const res = await runInference(disease, payload, activeFile);
    setResult(res);
    saveHistory(res, payload);
    setStage("result");
  };

  const reset = () => {
    setDisease(null);
    setResult(null);
    setData({});
    setFileObj(null);
    setStage("select");
  };

  const back = () => {
    setResult(null);
    setStage("input");
  };

  return (
    <main className="screening-page">
      <Topbar backendOnline={backendStatus?.online} weightsLoaded={backendStatus?.weights_loaded} />
      <AnimatePresence mode="wait">
        {stage === "select" ? (
          <Selector key="select" select={select} />
        ) : stage === "input" && disease ? (
          <InputView key="input" disease={disease} data={data} fileObj={fileObj} setFileObj={setFileObj} backendOnline={backendStatus?.online} reset={reset} run={run} />
        ) : stage === "analyzing" && disease ? (
          <Analysis key="analysis" disease={disease} backendOnline={backendStatus?.online} />
        ) : stage === "result" && disease && result ? (
          <ResultView key="result" disease={disease} result={result} data={data} restart={reset} back={back} />
        ) : null}
      </AnimatePresence>
    </main>
  );
}
