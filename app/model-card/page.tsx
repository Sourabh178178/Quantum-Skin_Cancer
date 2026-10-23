import { ArrowUpRight } from "lucide-react";
import { perClassMetrics } from "@/lib/screening-config";

export default function ModelCardPage() {
  const classes = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"];
  const classLabels: Record<string, string> = {
    akiec: "AKIEC — Actinic Keratosis",
    bcc:   "BCC — Basal Cell Carcinoma",
    bkl:   "BKL — Benign Keratosis",
    df:    "DF — Dermatofibroma",
    mel:   "MEL — Melanoma",
    nv:    "NV — Melanocytic Nevus",
    vasc:  "VASC — Vascular Lesion",
  };
  const classDistribution: Record<string, number> = {
    akiec: 327, bcc: 514, bkl: 1099, df: 115, mel: 1113, nv: 6705, vasc: 142,
  };
  const totalImages = Object.values(classDistribution).reduce((a, b) => a + b, 0);

  return (
    <main style={{ background: "var(--paper)", minHeight: "100vh" }}>
      <nav className="nav-shell landing-nav">
        <a href="/" className="wordmark">MedQube<sup>®</sup></a>
        <div style={{ display: "flex", gap: 24 }}>
          <a href="/screening" className="text-link" style={{ fontSize: 11 }}>Screening workspace <ArrowUpRight size={13}/></a>
          <a href="/" className="text-link" style={{ fontSize: 11 }}>Return home <ArrowUpRight size={13}/></a>
        </div>
      </nav>

      <div className="model-card-shell">
        {/* Header */}
        <div className="mc-header">
          <p className="eyebrow"><span />Model documentation</p>
          <h1 className="screen-title">QEMNet Model Card</h1>
          <p className="screen-lead">Transparency documentation for the Quantum-Enhanced Medical Network (QEMNet) skin lesion classifier, following responsible AI practice.</p>
          <div className="mc-meta-row">
            <span>Architecture: HybridMobileNet + PennyLane QNN</span>
            <span>Dataset: HAM10000</span>
            <span>Version: epoch-25-final</span>
            <span>Date: October 2026</span>
          </div>
        </div>

        {/* Intended Use */}
        <section className="mc-section">
          <h2>Intended Use</h2>
          <p>QEMNet is a <strong>research prototype</strong> designed to classify dermoscopic skin-lesion images across seven HAM10000 categories. It is intended for academic demonstration, educational purposes, and evaluation of quantum-classical hybrid machine learning architectures.</p>
          <div className="mc-warning">
            <strong>This model is not a medical device.</strong> Results must not be used for clinical diagnosis, treatment decisions, or patient management without review by a qualified dermatologist or clinician.
          </div>
        </section>

        {/* Architecture */}
        <section className="mc-section">
          <h2>Architecture</h2>
          <div className="mc-arch-grid">
            {[
              { label: "Backbone", value: "MobileNetV2 (PyTorch torchvision)" },
              { label: "Feature layers", value: "18 inverted residual blocks; first 9 frozen" },
              { label: "Classical branch", value: "2 extra Conv2d layers → 64-dim feature vector" },
              { label: "Quantum branch", value: "PennyLane — 2 qubits, 2 variational layers" },
              { label: "Quantum gates", value: "RY (input encoding), RX + RZ (variational), CNOT (entangling)" },
              { label: "Quantum device", value: "default.qubit (CPU simulation)" },
              { label: "Fusion", value: "Concatenate 64-dim classical + 2-dim quantum → Linear(66, 7)" },
              { label: "Total parameters", value: "2,474,883" },
              { label: "Trainable", value: "2,344,067" },
              { label: "Frozen", value: "130,816" },
              { label: "Input", value: "224 × 224 RGB, ToTensor (no normalisation)" },
              { label: "Output", value: "7-class softmax probabilities" },
            ].map(row => (
              <div key={row.label} className="mc-arch-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Training */}
        <section className="mc-section">
          <h2>Training Details</h2>
          <div className="mc-arch-grid">
            {[
              { label: "Dataset", value: "HAM10000 (Human Against Machine with 10,000 training images)" },
              { label: "Total images", value: "10,015" },
              { label: "Split", value: "70% train / 15% val / 15% test (stratified by class)" },
              { label: "Train images", value: "7,010 originals → 15,558 after augmentation" },
              { label: "Val images", value: "1,502 (no augmentation)" },
              { label: "Test images", value: "1,503 (no augmentation)" },
              { label: "Minority augmentation", value: "akiec, bcc, df, vasc → ×4 (original + rotation + zoom + brightness)" },
              { label: "Majority augmentation", value: "bkl, mel, nv → ×2 (original + rotation)" },
              { label: "Optimiser", value: "Adam, lr = 5×10⁻⁵" },
              { label: "Loss", value: "CrossEntropyLoss" },
              { label: "Batch size", value: "6" },
              { label: "Epochs", value: "25" },
              { label: "Hardware", value: "CUDA GPU (Kaggle)" },
              { label: "Framework", value: "PyTorch 2.x + PennyLane 0.44" },
            ].map(row => (
              <div key={row.label} className="mc-arch-row">
                <span>{row.label}</span>
                <strong>{row.value}</strong>
              </div>
            ))}
          </div>
        </section>

        {/* Performance */}
        <section className="mc-section">
          <h2>Performance — Test Set (1,503 images)</h2>
          <div className="mc-summary-metrics">
            {[
              { label: "Overall accuracy", value: "87.4%" },
              { label: "Macro F1", value: "0.793" },
              { label: "Weighted F1", value: "0.871" },
              { label: "Val accuracy (epoch 25)", value: "89.7%" },
            ].map(m => (
              <div key={m.label} className="mc-metric-card">
                <span>{m.label}</span>
                <strong>{m.value}</strong>
              </div>
            ))}
          </div>

          <p className="mc-subsection-label">Per-class test metrics</p>
          <div className="mc-table">
            <div className="mc-table-head">
              <span>Class</span><span>Precision</span><span>Recall</span><span>F1</span><span>Support</span>
            </div>
            {classes.map(cls => {
              const m = perClassMetrics[cls];
              return (
                <div key={cls} className="mc-table-row">
                  <span>{classLabels[cls]}</span>
                  <span>{(m.precision * 100).toFixed(1)}%</span>
                  <span>{(m.recall * 100).toFixed(1)}%</span>
                  <span className={m.f1 < 0.75 ? "mc-warn" : ""}>{(m.f1 * 100).toFixed(1)}%</span>
                  <span>{m.support}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Dataset distribution */}
        <section className="mc-section">
          <h2>Dataset Distribution</h2>
          <p className="mc-note">HAM10000 is heavily class-imbalanced. NV (moles) comprises 66.9% of images. Augmentation was applied specifically to address minority class underrepresentation.</p>
          <div className="mc-dist-bars">
            {classes.map(cls => {
              const count = classDistribution[cls];
              const pct = Math.round((count / totalImages) * 100);
              return (
                <div key={cls} className="mc-dist-row">
                  <span>{cls.toUpperCase()}</span>
                  <div className="mc-dist-track">
                    <div className="mc-dist-fill" style={{ width: `${Math.max(pct, 1)}%` }} />
                  </div>
                  <span>{count.toLocaleString()} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* Known limitations */}
        <section className="mc-section">
          <h2>Known Limitations</h2>
          <ul className="mc-limitations">
            <li><strong>Class imbalance bias:</strong> NV is the dominant class (66.9%). The model may over-predict NV for ambiguous lesions, particularly on images dissimilar to the training distribution.</li>
            <li><strong>Low minority-class performance:</strong> MEL (F1: 68.8%) and AKIEC (F1: 71.8%) have lower performance than NV (F1: 93.8%). MEL — the most critical class — has highest real-world consequence if missed.</li>
            <li><strong>No image normalisation:</strong> Training used ToTensor only (no ImageNet mean/std normalisation). Performance may degrade on images with different brightness or colour calibration.</li>
            <li><strong>Quantum simulation overhead:</strong> The PennyLane quantum circuit runs as a CPU simulation. The quantum contribution is exploratory; no quantum advantage over a purely classical model has been established.</li>
            <li><strong>Dermoscopy only:</strong> The model was trained exclusively on dermoscopic images. Clinical photographs, smartphone images, or photographs with hair or artefacts will produce unreliable results.</li>
            <li><strong>Dataset scope:</strong> HAM10000 was collected primarily from Austrian and Australian clinical populations. Performance may vary on other demographic groups.</li>
          </ul>
        </section>

        {/* Citation */}
        <section className="mc-section">
          <h2>Dataset & Citation</h2>
          <p>Training data: Tschandl, P., Rosendahl, C. & Kittler, H. <em>The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions.</em> Sci. Data 5, 180161 (2018).</p>
          <p>Quantum framework: Bergholm et al., <em>PennyLane: Automatic differentiation of hybrid quantum-classical computations.</em> arXiv:1811.04968 (2022).</p>
        </section>

        <div className="mc-footer">
          <a href="/screening" className="button primary">Open screening workspace <ArrowUpRight size={16}/></a>
          <p>QEMNet · B.E. Major Project · Not for clinical use</p>
        </div>
      </div>
    </main>
  );
}
