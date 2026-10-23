# QEMNet Backend & Frontend Integration

This repository connects the **QEMNet Quantum-Classical Hybrid Model** (MobileNetV2 + PennyLane Variational Quantum Circuit) to the Next.js clinical screening frontend.

---

## 1. Quick Start

### Step 1: Start the Quantum Backend
Run the backend server using Python:
```bash
python run_backend.py
```
This launches the FastAPI inference server at `http://127.0.0.1:8000`.
- It loads `HybridMobileNet` with 2 qubits, 2 variational layers, and 7 HAM10000 classes.
- If weights are found in `backend/models/`, it loads the trained model.
- If weights are not yet downloaded, it runs with initialized architecture so the frontend and API work immediately for testing.

### Step 2: Start the Next.js Frontend
In a second terminal, start the Next.js dev server:
```bash
npm run dev
```
Open [http://localhost:3000/screening](http://localhost:3000/screening) in your browser.
- The UI will automatically detect the backend and display **"QEMNet Live Backend"** with a green status indicator.
- Upload any dermoscopic lesion image (JPEG/PNG) and click **"Run screening"**.
- The frontend forwards the image to the FastAPI backend, evaluates the hybrid neural net, and presents the probabilities.

---

## 2. Model Weights Setup

### Where to place the downloaded `.pt` / `.pth` file:
Place the file into:
```
D:\Quantum-Skin_Cancer-\backend\models\hybrid_model_epoch_25_final.pt
```
*(Or name it `hybrid_model.pth` / `hybrid_model.pt`)*

### How to download from Kaggle / Colab:
- **Kaggle**: In the right sidebar under **Notebook Output** (`/kaggle/working`), click `...` next to `hybrid_model_epoch_25_final.pt` -> **Download**.
  Or run the final cell added to `QEMNet.ipynb` to get an interactive `FileLink`.
- **Google Colab**: Run the final cell in `QEMNet.ipynb` to trigger an automatic browser download.

---

## 3. Architecture Summary

| Component | Specification |
|---|---|
| **Classical Backbone** | PyTorch MobileNetV2 feature extractor |
| **Quantum Layer** | PennyLane 2-qubit circuit (`default.qubit`), RY angle embedding, variational RX/RZ + CNOT entangling gates |
| **Output** | 7 classes (HAM10000): AKIEC, BCC, BKL, DF, MEL, NV, VASC |
| **Input Transform** | 224×224 RGB normalization matching `base_transform` |
| **Backend API** | FastAPI + Uvicorn (`/predict`, `/health`, `/reload-weights`) |
| **Frontend** | Next.js 15 + React 19 + Framer Motion |
