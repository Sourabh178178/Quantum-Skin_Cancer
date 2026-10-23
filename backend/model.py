import os
from pathlib import Path
from typing import Tuple, Dict, Any, List
from PIL import Image

import torch
import torch.nn as nn
from torchvision import models, transforms
import pennylane as qml

# ── Quantum Architecture Configuration ──────────────────────────────────────────
n_qubits = 2
n_layers = 2
dev = qml.device("default.qubit", wires=n_qubits)

@qml.qnode(dev, interface="torch")
def quantum_circuit(inputs, weights):
    for i in range(n_qubits):
        qml.RY(inputs[i], wires=i)
    for l in range(n_layers):
        for i in range(n_qubits):
            qml.RX(weights[l, i], wires=i)
            qml.RZ(weights[l, i], wires=i)
        for i in range(n_qubits - 1):
            qml.CNOT(wires=[i, i+1])
        qml.CNOT(wires=[n_qubits-1, 0])
    return [qml.expval(qml.PauliZ(i)) for i in range(n_qubits)]


class QuantumLayer(nn.Module):
    def __init__(self):
        super().__init__()
        self.weights = nn.Parameter(torch.randn(n_layers, n_qubits))

    def forward(self, x):
        outputs = []
        for i in range(x.shape[0]):
            out = quantum_circuit(x[i], self.weights)
            outputs.append(torch.stack(out).float())
        return torch.stack(outputs)


class HybridMobileNet(nn.Module):
    def __init__(self, num_classes: int = 7):
        super().__init__()
        base = models.mobilenet_v2(weights=None)
        self.features = base.features

        freeze_layers = len(self.features) // 2
        for i in range(freeze_layers):
            for p in self.features[i].parameters():
                p.requires_grad = False

        self.q_branch = nn.Sequential(
            nn.Conv2d(160, 40, 1),
            nn.BatchNorm2d(40),
            nn.ReLU(),
            nn.Conv2d(40, 16, 3, padding=1, dilation=2),
            nn.BatchNorm2d(16),
            nn.SiLU(),
            nn.BatchNorm2d(16),
            nn.ReLU(),
            nn.AdaptiveAvgPool2d((1, 1))
        )

        self.q_fc = nn.Linear(16, n_qubits)
        self.quantum = QuantumLayer()

        self.extra = nn.Sequential(
            nn.Conv2d(1280, 128, 1),
            nn.BatchNorm2d(128),
            nn.ReLU(),
            nn.Conv2d(128, 64, 3, padding=1),
            nn.BatchNorm2d(64),
            nn.ReLU()
        )

        self.final_fc = nn.Linear(64 + n_qubits, num_classes)

    def forward(self, x):
        x = self.features[:17](x)

        q = self.q_branch(x)
        q = torch.flatten(q, 1)
        q = torch.tanh(self.q_fc(q))
        q = self.quantum(q)

        c = self.features[17:](x)
        c = self.extra(c)
        c = nn.functional.adaptive_avg_pool2d(c, (1, 1))
        c = torch.flatten(c, 1)

        return self.final_fc(torch.cat([c, q], dim=1))


# ── Classes & Metadata from QEMNet.ipynb ─────────────────────────────────────────
CLASSES: List[str] = ['akiec', 'bcc', 'bkl', 'df', 'mel', 'nv', 'vasc']

CLASS_METADATA: Dict[str, Dict[str, str]] = {
    "akiec": {
        "code": "AKIEC",
        "name": "Actinic Keratosis / Intraepithelial Carcinoma",
        "category": "Precancerous / Early malignancy",
        "risk": "Moderate to High",
    },
    "bcc": {
        "code": "BCC",
        "name": "Basal Cell Carcinoma",
        "category": "Malignant skin cancer (common)",
        "risk": "High",
    },
    "bkl": {
        "code": "BKL",
        "name": "Benign Keratosis-like Lesions",
        "category": "Benign (solar lentigines / seborrheic keratosis)",
        "risk": "Low",
    },
    "df": {
        "code": "DF",
        "name": "Dermatofibroma",
        "category": "Benign fibrous nodule",
        "risk": "Low",
    },
    "mel": {
        "code": "MEL",
        "name": "Melanoma",
        "category": "Malignant skin cancer (critical)",
        "risk": "Critical / Urgent",
    },
    "nv": {
        "code": "NV",
        "name": "Melanocytic Nevus (Mole)",
        "category": "Benign common mole",
        "risk": "Low",
    },
    "vasc": {
        "code": "VASC",
        "name": "Vascular Lesions",
        "category": "Benign vascular malformation",
        "risk": "Low",
    },
}

# Image Preprocessing matching QEMNet.ipynb base_transform
transform = transforms.Compose([
    transforms.Resize((224, 224)),
    transforms.ToTensor(),
])

def load_trained_model(weights_dir: str = None) -> Tuple[HybridMobileNet, bool, str]:
    """
    Looks for candidate .pth or .pt files in model_weight/, backend/models/,
    environment variables, or explicitly specified directory.
    Returns (model, is_weights_loaded, status_message).
    """
    model = HybridMobileNet(num_classes=len(CLASSES))
    model.eval()

    # Priority list of search directories
    search_dirs: List[Path] = []
    candidates: List[Path] = []
    
    if weights_dir:
        p = Path(weights_dir)
        if p.is_file():
            candidates.append(p)
        else:
            search_dirs.append(p)

    # Environment variable overrides
    if os.environ.get("MODEL_WEIGHTS_PATH"):
        candidates.append(Path(os.environ["MODEL_WEIGHTS_PATH"]))
    if os.environ.get("MODEL_WEIGHTS_DIR"):
        search_dirs.append(Path(os.environ["MODEL_WEIGHTS_DIR"]))

    backend_dir = Path(__file__).resolve().parent
    workspace_root = backend_dir.parent

    search_dirs.extend([
        workspace_root / "model_weight",
        backend_dir / "models",
        workspace_root / "models",
        backend_dir.parent / "model_weight",
        Path("model_weight"),
        Path("models"),
        Path("."),
    ])

    filenames = [
        "hybrid_model_epoch_25_final.pt",
        "qemnet_mobilenet_quantum_weights.pth",
        "hybrid_model_epoch_25_final.pth",
        "hybrid_model_epoch_15.pt",
        "hybrid_model.pth",
        "hybrid_model.pt",
    ]

    for d in search_dirs:
        for f in filenames:
            candidates.append(d / f)

    # De-duplicate while preserving order
    seen = set()
    deduped_candidates = []
    for c in candidates:
        norm = str(c.resolve()) if c.exists() else str(c)
        if norm not in seen:
            seen.add(norm)
            deduped_candidates.append(c)

    for path in deduped_candidates:
        if path.exists() and path.is_file() and path.stat().st_size > 1024:
            # Try weights_only=True first (safe), fall back to weights_only=False
            for weights_only in [True, False]:
                try:
                    state_dict = torch.load(str(path), map_location="cpu", weights_only=weights_only)
                    if isinstance(state_dict, dict) and "state_dict" in state_dict:
                        state_dict = state_dict["state_dict"]
                    elif isinstance(state_dict, dict) and "model_state_dict" in state_dict:
                        state_dict = state_dict["model_state_dict"]

                    model.load_state_dict(state_dict, strict=True)
                    return model, True, f"Successfully loaded weights from {path.name} ({path.resolve()})"
                except Exception as e:
                    if not weights_only:
                        print(f"Failed loading weights from {path}: {e}")

    return model, False, "No trained weights file found in model_weight/ or models/ directory. Running in initialization mode."

