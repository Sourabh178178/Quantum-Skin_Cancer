# QEMNet — Quantum Skin Cancer Screening

A hybrid quantum-classical deep learning system for dermoscopic skin lesion classification. Built as a B.E. Computer Science major project.

---

## Overview

QEMNet combines a MobileNetV2 classical backbone with a PennyLane variational quantum circuit to classify dermoscopic images into seven HAM10000 disease categories. The frontend is a Next.js screening workspace that communicates with a FastAPI inference server in real time.

**This is a research prototype. It is not a medical device and cannot be used for clinical diagnosis.**

---

## Architecture

```
MobileNetV2 features[0:16]
        │
        ├── Quantum branch → 2-qubit PennyLane circuit → 2 outputs
        │       RY angle embedding
        │       RX / RZ variational gates + CNOT entanglement
        │       ⟨Z⟩ expectation measurement
        │
        └── Classical branch → Conv(1280→128) → Conv(128→64) → 64 outputs
                                                                    │
                                              concat(64 + 2) ── FC → 7 classes
```

| Property | Value |
|---|---|
| Total parameters | 2,474,883 |
| Trainable parameters | 2,344,067 |
| Frozen (MobileNetV2 base) | 130,816 |
| Quantum circuit | 2 qubits, 2 variational layers |
| Training dataset | HAM10000 (10,015 images, 70/15/15 split) |
| Training epochs | 25 |
| Optimizer | Adam, lr = 5 × 10⁻⁵, batch = 6 |
| Test accuracy | **87.4%** |
| Val accuracy (epoch 25) | 89.7% |

### Per-class test F1 scores

| Class | Full name | F1 |
|---|---|---|
| AKIEC | Actinic Keratosis / Intraepithelial Carcinoma | 0.718 |
| BCC | Basal Cell Carcinoma | 0.811 |
| BKL | Benign Keratosis-like Lesion | 0.724 |
| DF | Dermatofibroma | 0.774 |
| MEL | Melanoma | 0.688 |
| NV | Melanocytic Nevus | 0.938 |
| VASC | Vascular Lesion | 0.894 |

---

## Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, React 19, TypeScript, Framer Motion |
| Backend | FastAPI, Uvicorn |
| ML | PyTorch, TorchVision, PennyLane |
| Image processing | Pillow, NumPy |
| Rate limiting | SlowAPI |

---

## Repository structure

```
├── app/                        Next.js app router pages + API route
│   ├── api/predict/route.ts    Proxy route → FastAPI /predict
│   ├── model-card/page.tsx     Model card page (/model-card)
│   ├── globals.css
│   └── layout.tsx
├── components/
│   ├── screening-experience.tsx  Main screening workspace UI
│   ├── landing-page.tsx
│   └── ...
├── lib/
│   ├── mock-inference.ts       Result type + fetch helper
│   └── screening-config.ts     Class metadata, ABCDE data
├── backend/
│   ├── main.py                 FastAPI server (port 8000)
│   ├── model.py                HybridMobileNet + QuantumLayer
│   ├── requirements.txt
│   └── models/                 Model weight files
├── model_weight/               Duplicate weight storage
├── QEMNet.ipynb                Training notebook
├── run_backend.py              Uvicorn launch script
├── start_all.bat               Starts both servers (Windows)
└── test_connection.py          End-to-end integration test
```

---

## Quick start

### Prerequisites

- Node.js 18+
- Python 3.10+
- pip

### 1. Install frontend dependencies

```bash
npm install
```

### 2. Install backend dependencies

```bash
pip install -r backend/requirements.txt
```

### 3. Start both servers

**Option A — single command (recommended):**
```bash
npm run dev:all
```

**Option B — two separate terminals:**
```bash
# Terminal 1
python run_backend.py

# Terminal 2
npm run dev
```

**Option C — Windows batch file:**
```bat
start_all.bat
```

### 4. Open the app

| URL | Page |
|---|---|
| http://localhost:3000 | Landing page |
| http://localhost:3000/screening | Screening workspace |
| http://localhost:3000/model-card | Model card |
| http://localhost:8000/health | Backend health check |
| http://localhost:8000/docs | FastAPI auto docs |

Upload a dermoscopic JPEG or PNG image in the screening workspace. The status indicator turns green when the live backend is detected; it falls back to a simulation if the backend is offline.

---

## API endpoints

### `GET /health`
Returns model status, loaded weights path, and class list.

### `POST /predict`
Accepts a multipart image upload (max 10 MB). Returns:

```json
{
  "primary": "MEL",
  "confidence": 74,
  "probabilities": [...],
  "warnings": ["Image appears blurry (sharpness score: 42)"],
  "quantum_outputs": [0.46, -0.42],
  "quantum_weights": [[-1.01, 0.31], [-1.77, 0.41]],
  "weights_loaded": true
}
```

Rate limit: 60 requests / minute per IP.

### `POST /reload-weights`
Hot-reloads model weights from disk without restarting the server.

---

## Model weights

Trained weights are included in `backend/models/` and `model_weight/`.  
The server loads `hybrid_model_epoch_25_final.pt` automatically on startup.

To retrain, open `QEMNet.ipynb` (Kaggle / Colab recommended) and place the output `.pt` file at:

```
backend/models/hybrid_model_epoch_25_final.pt
```

---

## Environment variables

Create `.env.local` in the project root:

```env
BACKEND_URL=http://127.0.0.1:8000
NEXT_PUBLIC_BACKEND_URL=http://127.0.0.1:8000
```

These are set to `127.0.0.1:8000` by default and only need changing if you run the backend on a different host or port.

---

## Limitations

- Trained only on HAM10000 — performance on out-of-distribution images (non-dermoscopic, smartphone photos) is untested.
- Quantum simulation runs on CPU via PennyLane `default.qubit`; inference takes 1–3 seconds per image on a standard laptop.
- MEL (melanoma) F1 is 0.688 — the model has a higher false-negative rate for melanoma than for benign classes.
- Not validated on any clinical dataset beyond the HAM10000 test split.

---

## Citation

If you reference this work:

```
QEMNet: Hybrid Quantum-Classical MobileNet for Dermoscopic Lesion Classification
B.E. Major Project, 2026
Dataset: HAM10000 — Tschandl P., Rosendahl C., Kittler H. (2018)
```

HAM10000 dataset:
> Tschandl, P., Rosendahl, C., & Kittler, H. (2018). The HAM10000 dataset, a large collection of multi-source dermatoscopic images of common pigmented skin lesions. *Scientific Data*, 5, 180161.

---

## License

Research and educational use only. Not licensed for clinical or commercial deployment.
