import io
import base64
import numpy as np
from pathlib import Path
from typing import List, Optional

from fastapi import FastAPI, UploadFile, File, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from PIL import Image
import torch

from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from model import (
    load_trained_model,
    transform,
    CLASSES,
    CLASS_METADATA,
    HybridMobileNet,
)

# ── Rate limiter ──────────────────────────────────────────────────────────────
limiter = Limiter(key_func=get_remote_address, default_limits=["120/minute"])

app = FastAPI(
    title="QEMNet Quantum Skin Cancer API",
    description="Inference server for Hybrid MobileNet + PennyLane Quantum Neural Network",
    version="2.0.0"
)

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Global model state ────────────────────────────────────────────────────────
WEIGHTS_DIR = Path(__file__).parent / "models"
WEIGHTS_DIR.mkdir(parents=True, exist_ok=True)

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

model: HybridMobileNet = None
weights_loaded: bool = False
weights_message: str = ""


def init_model():
    global model, weights_loaded, weights_message
    print("Initializing model and checking for weights...")
    model, weights_loaded, weights_message = load_trained_model()
    status = "[OK]" if weights_loaded else "[WARN]"
    print(f"{status} QEMNet ready | Weights: {'loaded' if weights_loaded else 'not found'} | Classes: {len(CLASSES)} | Device: CPU")
    print(f"  {weights_message}")


init_model()


# ── Helpers ───────────────────────────────────────────────────────────────────

def check_image_quality(pil_image: Image.Image) -> List[str]:
    """Return a list of quality warning strings (empty = all clear)."""
    warnings = []
    w, h = pil_image.size

    # Aspect ratio check
    ratio = max(w, h) / max(min(w, h), 1)
    if ratio > 2.0:
        warnings.append(
            f"Image aspect ratio is {ratio:.1f}:1 — heavily non-square images are resized to 224×224, "
            "which may distort lesion shape. Consider cropping to a square region centred on the lesion."
        )

    # Blur detection via Laplacian variance on grayscale thumbnail
    gray = np.array(pil_image.convert("L").resize((224, 224)), dtype=np.float32)
    lap = (
        gray[:-2, 1:-1] + gray[2:, 1:-1] + gray[1:-1, :-2] + gray[1:-1, 2:]
        - 4 * gray[1:-1, 1:-1]
    )
    variance = float(np.var(lap))
    if variance < 80.0:
        warnings.append(
            f"Image appears blurry (sharpness score: {variance:.0f}). "
            "Results may be unreliable — use a focused dermoscopic image for best accuracy."
        )

    # Low resolution
    if w < 100 or h < 100:
        warnings.append(
            f"Image resolution is very low ({w}×{h}px). "
            "Accuracy is significantly reduced below 100×100px."
        )

    return warnings


def compute_gradcam(pil_image: Image.Image, input_tensor: torch.Tensor, pred_idx: int) -> Optional[str]:
    """
    Manual GradCAM on model.extra[3] (classical branch Conv2d 128→64, 7×7 spatial).
    Pure PyTorch hooks + NumPy — no pytorch-grad-cam / sklearn / pandas needed.
    Returns base64-encoded PNG of heatmap overlaid on image, or None on failure.
    """
    try:
        activations: List[torch.Tensor] = []
        gradients: List[torch.Tensor] = []

        def _fwd_hook(module, inp, out):
            activations.append(out)

        def _bwd_hook(module, grad_in, grad_out):
            gradients.append(grad_out[0])

        target_layer = model.extra[3]
        fwd_h = target_layer.register_forward_hook(_fwd_hook)
        bwd_h = target_layer.register_full_backward_hook(_bwd_hook)

        try:
            inp = input_tensor.detach().requires_grad_(True)
            model.zero_grad()
            logits = model(inp)
            logits[0, pred_idx].backward()
        finally:
            fwd_h.remove()
            bwd_h.remove()

        if not activations or not gradients:
            return None

        act = activations[0].detach().cpu()   # [1, C, H, W]
        grad = gradients[0].detach().cpu()    # [1, C, H, W]

        # Global-average-pool gradients → per-channel weights
        weights = grad.mean(dim=(2, 3))[0]    # [C]

        # Weighted sum of activation maps + ReLU
        cam = (weights[:, None, None] * act[0]).sum(dim=0)  # [H, W]
        cam = torch.clamp(cam, min=0.0)

        # Normalise to [0, 1]
        cam_min, cam_max = cam.min(), cam.max()
        if (cam_max - cam_min) > 1e-8:
            cam = (cam - cam_min) / (cam_max - cam_min)
        else:
            cam = torch.zeros_like(cam)

        # Upsample to 224×224 via PIL bicubic
        cam_pil = Image.fromarray((cam.numpy() * 255).astype(np.uint8), mode="L")
        cam_pil = cam_pil.resize((224, 224), Image.BICUBIC)
        cam_np = np.array(cam_pil, dtype=np.float32) / 255.0  # [224, 224]

        # Jet-like colourmap via pure NumPy (no matplotlib)
        r = np.clip(1.5 - np.abs(4.0 * cam_np - 3.0), 0.0, 1.0)
        g = np.clip(1.5 - np.abs(4.0 * cam_np - 2.0), 0.0, 1.0)
        b = np.clip(1.5 - np.abs(4.0 * cam_np - 1.0), 0.0, 1.0)
        heatmap = np.stack([r, g, b], axis=-1)  # [224, 224, 3]

        # Blend 50/50 with original image
        rgb_orig = np.array(pil_image.resize((224, 224)), dtype=np.float32) / 255.0
        blended = np.clip((0.5 * rgb_orig + 0.5 * heatmap) * 255, 0, 255).astype(np.uint8)

        buf = io.BytesIO()
        Image.fromarray(blended).save(buf, format="PNG")
        buf.seek(0)
        return base64.b64encode(buf.read()).decode("utf-8")

    except Exception as e:
        print(f"GradCAM computation failed (non-fatal): {e}")
        return None


# ── Routes ────────────────────────────────────────────────────────────────────

@app.get("/")
def root():
    return {
        "service": "QEMNet Quantum Skin Cancer Classifier API",
        "status": "online",
        "weights_loaded": weights_loaded,
        "weights_message": weights_message,
        "endpoints": ["/health", "/predict", "/reload-weights"]
    }


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "architecture": "HybridMobileNet + PennyLane Quantum Variational Circuit (2 qubits, 2 layers)",
        "weights_loaded": weights_loaded,
        "weights_message": weights_message,
        "classes": [CLASS_METADATA[c]["code"] for c in CLASSES]
    }


@app.post("/reload-weights")
def reload_weights():
    global model, weights_loaded, weights_message
    model, weights_loaded, weights_message = load_trained_model()
    return {"success": True, "weights_loaded": weights_loaded, "message": weights_message}


@app.post("/predict")
@limiter.limit("60/minute")
async def predict_image(request: Request, file: UploadFile = File(...)):
    # Validate content type
    is_image_type = bool(file.content_type and file.content_type.startswith("image/"))
    is_octet = file.content_type in ("application/octet-stream", None, "")
    has_image_ext = bool(file.filename and any(
        file.filename.lower().endswith(ext) for ext in [".jpg", ".jpeg", ".png", ".webp", ".bmp"]
    ))
    if not (is_image_type or (is_octet and has_image_ext)):
        raise HTTPException(status_code=400, detail="Uploaded file must be an image (JPEG, PNG, WEBP, etc.)")

    # Read + size check
    contents = await file.read()
    if len(contents) > MAX_FILE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({len(contents) / 1024 / 1024:.1f} MB). Maximum allowed is 10 MB."
        )

    # Decode image
    try:
        pil_image = Image.open(io.BytesIO(contents)).convert("RGB")
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to decode image: {str(e)}")

    # Quality warnings
    warnings = check_image_quality(pil_image)

    # Preprocess
    input_tensor = transform(pil_image).unsqueeze(0)

    # ── Forward pass with quantum output capture ──────────────────────────────
    quantum_outputs_captured: Optional[List[float]] = None
    quantum_weights_captured: Optional[List[List[float]]] = None

    with torch.no_grad():
        # Capture quantum branch outputs via a forward hook
        q_out_holder: List[torch.Tensor] = []

        def _q_hook(module, inp, out):
            q_out_holder.append(out.detach().cpu())

        hook = model.quantum.register_forward_hook(_q_hook)
        try:
            logits = model(input_tensor)
        finally:
            hook.remove()

        probs = torch.softmax(logits, dim=1)[0].cpu().tolist()

        if q_out_holder:
            quantum_outputs_captured = q_out_holder[0][0].tolist()

        try:
            quantum_weights_captured = model.quantum.weights.detach().cpu().tolist()
        except Exception:
            pass

    # Build probability pairs
    prob_pairs = []
    for cls_name, prob in zip(CLASSES, probs):
        meta = CLASS_METADATA[cls_name]
        pct = round(prob * 100, 1)
        prob_pairs.append({
            "label": meta["code"],
            "value": pct,
            "name": meta["name"],
            "category": meta["category"],
            "risk": meta["risk"]
        })

    top = max(prob_pairs, key=lambda x: x["value"])
    pred_idx = CLASSES.index(top["label"].lower())

    clean_probs = [
        {"label": p["label"], "value": int(round(p["value"])), "name": p["name"],
         "category": p["category"], "risk": p["risk"]}
        for p in prob_pairs
    ]

    # ── GradCAM (Stage 3) ─────────────────────────────────────────────────────
    heatmap_b64 = compute_gradcam(pil_image, input_tensor, pred_idx)

    return {
        "primary": top["label"],
        "confidence": int(round(top["value"])),
        "model": "HybridMobileNet (PennyLane Quantum Circuit)",
        "weights_loaded": weights_loaded,
        "weights_message": weights_message,
        "top_prediction": top,
        "probabilities": clean_probs,
        "image_filename": file.filename,
        # Stage 2 additions
        "warnings": warnings,
        "quantum_weights": quantum_weights_captured,
        "quantum_outputs": quantum_outputs_captured,
        # Stage 3
        "heatmap_b64": heatmap_b64,
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
