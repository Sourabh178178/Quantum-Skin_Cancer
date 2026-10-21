from pathlib import Path
import json

out = Path(r"C:\Users\pavan\OneDrive\Documents\ChatGPT\SIH\01_classical_baseline_colab_ready.ipynb")
nb = {"nbformat": 4, "nbformat_minor": 5}
cells = []

def md(s): cells.append({"cell_type": "markdown", "metadata": {}, "source": s.strip()})
def code(s): cells.append({"cell_type": "code", "metadata": {}, "execution_count": None, "outputs": [], "source": s.strip()})

md('''# Classical baseline — ResNet18 (Colab-ready)

Seven-class HAM10000 validation experiment for comparison with the quantum models. This notebook preserves the agreed architecture, initialization, full-backbone training, no-augmentation preprocessing, and fixed hyperparameters. Scores are **validation metrics**, not independent test results.

For a fair comparison, every teammate must use the split manifests written by this notebook; they define the lesion-disjoint train/validation split.''')

md('''## 0. Colab setup and runtime checks

Run this cell first. It mounts Drive for persistent artifacts and uses Colab local disk for image extraction/training. It only inspects installed packages; do not reinstall PyTorch or CUDA.''')
code('''import os, sys, json, time, random, glob, shutil, subprocess, platform
from pathlib import Path
from importlib.util import find_spec

IN_COLAB = "google.colab" in sys.modules
if not IN_COLAB:
    raise RuntimeError("This notebook is prepared for Google Colab. Open it in Colab and select a GPU runtime.")

from google.colab import drive
drive.mount("/content/drive")

DRIVE_ROOT = Path("/content/drive/MyDrive/HAM10000_classical_baseline")
OUTPUT_DIR = DRIVE_ROOT / "outputs"
LOCAL_DATA_ROOT = Path("/content/ham10000_data")
for directory in (OUTPUT_DIR, LOCAL_DATA_ROOT): directory.mkdir(parents=True, exist_ok=True)

print("Python:", platform.python_version())
for package in ("torch", "torchvision", "numpy", "pandas", "sklearn", "PIL", "matplotlib", "kaggle"):
    print(f"{package:12s}", "installed" if find_spec(package) else "MISSING")
!nvidia-smi
print("Persistent outputs:", OUTPUT_DIR)
print("Local image runtime:", LOCAL_DATA_ROOT)''')

md('''## 1. Dataset setup

The cell first looks for an existing extracted dataset in Drive or the local runtime. If none is found, it downloads the Kaggle dataset to the local runtime. Kaggle authentication is intentionally interactive: upload `kaggle.json` only to the runtime when prompted; it is never saved to Drive or embedded in this notebook.''')
code('''# The dataset identifier comes from the original notebook.
KAGGLE_DATASET = "farjanakabirsamanta/skin-cancer-dataset"
DATASET_CANDIDATES = [
    DRIVE_ROOT / "dataset",              # preferred reusable extracted copy
    Path("/content/HAM10000"),
    LOCAL_DATA_ROOT,
]

def find_metadata(root):
    files = list(Path(root).rglob("HAM10000_metadata.csv"))
    return files[0] if len(files) == 1 else None

metadata_path = next((p for p in map(find_metadata, DATASET_CANDIDATES) if p), None)
if metadata_path is not None and str(metadata_path).startswith("/content/drive/"):
    # Drive is persistent but slow for many small image reads; stage its extracted dataset locally.
    staged_root = LOCAL_DATA_ROOT / "existing_drive_dataset"
    if find_metadata(staged_root) is None:
        print("Staging existing Drive dataset to Colab local disk for faster image reads...")
        shutil.copytree(metadata_path.parent, staged_root, dirs_exist_ok=True)
    metadata_path = find_metadata(staged_root)
    if metadata_path is None: raise FileNotFoundError("Could not stage the existing Drive dataset to local disk.")
if metadata_path is None:
    if find_spec("kaggle") is None:
        print("The Kaggle client is missing; installing only that client now.")
        %pip -q install kaggle
    from google.colab import files
    kaggle_json = Path("/content/kaggle.json")
    if not kaggle_json.exists():
        print("Upload your Kaggle API token file (kaggle.json). It stays only in this temporary runtime.")
        files.upload()
    if not kaggle_json.exists():
        raise FileNotFoundError("kaggle.json was not uploaded. Create one in Kaggle Settings and rerun this cell.")
    Path("/root/.kaggle").mkdir(exist_ok=True)
    shutil.copy2(kaggle_json, "/root/.kaggle/kaggle.json")
    os.chmod("/root/.kaggle/kaggle.json", 0o600)
    archive = Path("/content/ham10000_kaggle.zip")
    subprocess.run(["kaggle", "datasets", "download", "-d", KAGGLE_DATASET, "-p", "/content", "-o"], check=True)
    downloaded = Path("/content") / f"{KAGGLE_DATASET.split('/')[-1]}.zip"
    shutil.unpack_archive(downloaded, LOCAL_DATA_ROOT)
    metadata_path = find_metadata(LOCAL_DATA_ROOT)
    if metadata_path is None:
        raise FileNotFoundError("Download completed but HAM10000_metadata.csv was not found. Inspect the archive layout.")

DATA_ROOT = metadata_path.parent
CSV_PATH = metadata_path
print("Metadata:", CSV_PATH)
print("Data root:", DATA_ROOT)''')

md('''## 2. Imports and fixed experiment configuration''')
code('''import copy, gc
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from PIL import Image

import torch
import torch.nn as nn
import torch.nn.functional as F
from torch.utils.data import Dataset, DataLoader, WeightedRandomSampler
import torchvision.transforms as T
import torchvision.models as models
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score, roc_auc_score, confusion_matrix, classification_report

# Shared configuration — preserve for comparison with teammates.
N_QUBITS = 2
IMG_SIZE = 224
BATCH_SIZE = 32
NUM_WORKERS = 2
SEED = 42
FULL_EPOCHS = 20
LR = 5e-5
PATIENCE = 5
CLASS_NAMES = ["akiec", "bcc", "bkl", "df", "mel", "nv", "vasc"]
NUM_CLASSES = len(CLASS_NAMES)
LABEL_TO_IDX = {name: i for i, name in enumerate(CLASS_NAMES)}
DEVICE = torch.device("cuda" if torch.cuda.is_available() else "cpu")

if DEVICE.type != "cuda":
    raise RuntimeError("No GPU is available. In Colab select Runtime > Change runtime type > T4 GPU, then rerun.")
print("GPU:", torch.cuda.get_device_name(0))

def seed_everything(seed=SEED):
    random.seed(seed); np.random.seed(seed); torch.manual_seed(seed); torch.cuda.manual_seed_all(seed)

seed_everything()
CONFIG = {"architecture": "ResNet18 -> 2-value bottleneck -> dense 2-to-2 layer -> 7-way head", "pretrained": True,
          "freeze_backbone": False, "augmentation": "none", "seed": SEED, "full_epochs": FULL_EPOCHS,
          "lr": LR, "patience": PATIENCE, "img_size": IMG_SIZE, "batch_size": BATCH_SIZE,
          "class_names": CLASS_NAMES, "split": "lesion_id stratified 80/20 validation"}
with open(OUTPUT_DIR / "configuration.json", "w") as f: json.dump(CONFIG, f, indent=2)
print(json.dumps(CONFIG, indent=2))''')

md('''## 3. Metadata and image integrity validation

This deliberately fails rather than dropping rows when images are missing/unreadable or IDs are duplicated.''')
code('''df = pd.read_csv(CSV_PATH)
required_columns = {"image_id", "lesion_id", "dx"}
missing_columns = required_columns - set(df.columns)
if missing_columns: raise ValueError(f"Metadata missing required columns: {missing_columns}")
if df["image_id"].isna().any() or df["lesion_id"].isna().any() or df["dx"].isna().any(): raise ValueError("Metadata has null image_id, lesion_id, or dx values.")
if df["image_id"].duplicated().any(): raise ValueError("Duplicate image_id values in metadata: " + str(df.loc[df.image_id.duplicated(), "image_id"].head().tolist()))
unexpected = sorted(set(df.dx) - set(CLASS_NAMES))
if unexpected: raise ValueError(f"Unexpected diagnostic labels: {unexpected}")
df["label"] = df["dx"].map(LABEL_TO_IDX)

image_files = [p for ext in ("*.jpg", "*.jpeg", "*.png", "*.bmp") for p in DATA_ROOT.rglob(ext)]
path_groups = {}
for path in image_files: path_groups.setdefault(path.stem, []).append(path)
ambiguous = {k: v for k, v in path_groups.items() if len(v) > 1}
if ambiguous: raise ValueError("Duplicate image basenames found; cannot resolve safely: " + str(list(ambiguous)[:5]))
path_lookup = {key: str(paths[0]) for key, paths in path_groups.items()}
df["filepath"] = df["image_id"].map(path_lookup)
missing_images = df.loc[df.filepath.isna(), "image_id"].tolist()
if missing_images:
    pd.DataFrame({"missing_image_id": missing_images}).to_csv(OUTPUT_DIR / "missing_images.csv", index=False)
    raise FileNotFoundError(f"{len(missing_images)} metadata images are missing; report saved to Drive. No rows were dropped.")

unreadable = []
for image_id, filepath in zip(df.image_id, df.filepath):
    try:
        with Image.open(filepath) as image: image.verify()
    except Exception as exc:
        unreadable.append({"image_id": image_id, "filepath": filepath, "error": repr(exc)})
if unreadable:
    pd.DataFrame(unreadable).to_csv(OUTPUT_DIR / "unreadable_images.csv", index=False)
    raise ValueError(f"{len(unreadable)} unreadable images; report saved to Drive. No rows were dropped.")

inconsistent = df.groupby("lesion_id")["label"].nunique()
if (inconsistent > 1).any(): raise ValueError("Lesion IDs with inconsistent labels: " + str(inconsistent[inconsistent > 1].head().to_dict()))
counts = df.dx.value_counts().reindex(CLASS_NAMES, fill_value=0)
if (counts == 0).any(): raise ValueError("Classes missing from metadata: " + str(counts[counts == 0].to_dict()))
print(f"Validated {len(df)} images and {df.lesion_id.nunique()} unique lesions.")
print(counts)''')

md('''## 4. Reproducible lesion-level train/validation split

The manifests are the shared protocol. Do not substitute an image-level split when comparing team models.''')
code('''manifest_path = OUTPUT_DIR / "split_manifest.csv"
lesions = df.groupby("lesion_id", as_index=False).agg(label=("label", "first"), dx=("dx", "first"))
if manifest_path.exists():
    manifest = pd.read_csv(manifest_path)
    expected = {"image_id", "lesion_id", "label", "dx", "split"}
    if not expected.issubset(manifest.columns): raise ValueError("Existing split manifest has an incompatible schema.")
    if set(manifest.image_id) != set(df.image_id): raise ValueError("Existing split manifest does not match this metadata image set.")
    manifest = manifest.merge(df[["image_id", "filepath"]], on="image_id", how="left", validate="one_to_one")
    print("Reusing existing shared split manifest:", manifest_path)
else:
    train_lesions, val_lesions = train_test_split(lesions, test_size=0.20, stratify=lesions["label"], random_state=SEED)
    lesion_split = pd.concat([train_lesions.assign(split="train"), val_lesions.assign(split="val")], ignore_index=True)
    manifest = df[["image_id", "lesion_id", "label", "dx", "filepath"]].merge(lesion_split[["lesion_id", "split"]], on="lesion_id", how="left", validate="many_to_one")
    manifest[["image_id", "lesion_id", "label", "dx", "split"]].to_csv(manifest_path, index=False)
    manifest.loc[manifest.split.eq("train"), ["image_id", "lesion_id", "label", "dx", "split"]].to_csv(OUTPUT_DIR / "train_split_manifest.csv", index=False)
    manifest.loc[manifest.split.eq("val"), ["image_id", "lesion_id", "label", "dx", "split"]].to_csv(OUTPUT_DIR / "val_split_manifest.csv", index=False)
    print("Created shared split manifests:", manifest_path)

train_df = manifest.loc[manifest.split.eq("train")].copy().reset_index(drop=True)
val_df = manifest.loc[manifest.split.eq("val")].copy().reset_index(drop=True)
overlap = set(train_df.lesion_id) & set(val_df.lesion_id)
if overlap: raise AssertionError(f"Lesion leakage detected: {list(overlap)[:5]}")
for split_name, split_df in (("train", train_df), ("val", val_df)):
    coverage = split_df.label.value_counts().reindex(range(NUM_CLASSES), fill_value=0)
    if (coverage == 0).any(): raise ValueError(f"{split_name} lacks classes: {coverage[coverage == 0].to_dict()}")
    print(split_name, "images=", len(split_df), "lesions=", split_df.lesion_id.nunique(), "class counts=", coverage.to_dict())
print("Verified: no lesion IDs overlap; all seven classes occur in both validation splits.")''')

md('''## 5. Dataset, no-augmentation transforms, and unchanged sampling/loss choices''')
code('''IMAGENET_MEAN, IMAGENET_STD = [0.485, 0.456, 0.406], [0.229, 0.224, 0.225]
base_tf = T.Compose([T.Resize((IMG_SIZE, IMG_SIZE)), T.ToTensor(), T.Normalize(IMAGENET_MEAN, IMAGENET_STD)])

class SkinLesionDataset(Dataset):
    def __init__(self, dataframe, transform): self.df, self.transform = dataframe.reset_index(drop=True), transform
    def __len__(self): return len(self.df)
    def __getitem__(self, idx):
        row = self.df.iloc[idx]
        with Image.open(row.filepath) as image: image = image.convert("RGB")
        return self.transform(image), torch.tensor(row.label, dtype=torch.long), row.image_id

train_ds, val_ds = SkinLesionDataset(train_df, base_tf), SkinLesionDataset(val_df, base_tf)
class_counts = train_df.label.value_counts().reindex(range(NUM_CLASSES), fill_value=0)
sample_weights = train_df.label.map(lambda label: 1.0 / max(class_counts[label], 1)).to_numpy()
sampler = WeightedRandomSampler(sample_weights, num_samples=len(sample_weights), replacement=True)
train_loader = DataLoader(train_ds, batch_size=BATCH_SIZE, sampler=sampler, num_workers=NUM_WORKERS, pin_memory=True)
val_loader = DataLoader(val_ds, batch_size=BATCH_SIZE, shuffle=False, num_workers=NUM_WORKERS, pin_memory=True)

def compute_class_weights(frame, num_classes):
    counts = frame.label.value_counts().reindex(range(num_classes), fill_value=0)
    return torch.tensor((counts.sum() / (num_classes * counts.replace(0, 1))).values, dtype=torch.float32)
class_weights = compute_class_weights(train_df, NUM_CLASSES)
print("WeightedRandomSampler and weighted CrossEntropyLoss are preserved. Class weights:", class_weights.numpy())
print("Batches — train:", len(train_loader), "validation:", len(val_loader))''')

md('''## 6. Model and disposable GPU smoke test

The test performs a genuine forward/loss/backward on one batch using a disposable model, then clears it and resets seeds before the actual model is created.''')
code('''def get_resnet18_backbone(pretrained=True):
    model = models.resnet18(weights=models.ResNet18_Weights.DEFAULT if pretrained else None)
    feat_dim = model.fc.in_features; model.fc = nn.Identity()
    return model, feat_dim

class ClassicalBaselineModel(nn.Module):
    def __init__(self, pretrained=True, freeze_backbone=False):
        super().__init__()
        self.backbone, feat_dim = get_resnet18_backbone(pretrained)
        if freeze_backbone:
            for p in self.backbone.parameters(): p.requires_grad = False
        self.bottleneck = nn.Sequential(nn.Linear(feat_dim, 64), nn.ReLU(), nn.Dropout(0.3), nn.Linear(64, N_QUBITS), nn.Tanh())
        self.classical_layer = nn.Sequential(nn.Linear(N_QUBITS, N_QUBITS), nn.Tanh())
        self.head = nn.Linear(N_QUBITS, NUM_CLASSES)
    def forward(self, x):
        return self.head(self.classical_layer(self.bottleneck(self.backbone(x)) * np.pi))

seed_everything()
check_images, check_labels, _ = next(iter(train_loader))
smoke_model = ClassicalBaselineModel(pretrained=True, freeze_backbone=False).to(DEVICE)
smoke_logits = smoke_model(check_images.to(DEVICE)); smoke_loss = nn.CrossEntropyLoss(weight=class_weights.to(DEVICE))(smoke_logits, check_labels.to(DEVICE))
assert check_images.device.type == "cpu" and next(smoke_model.parameters()).device.type == "cuda"
assert tuple(check_images.shape[1:]) == (3, IMG_SIZE, IMG_SIZE), check_images.shape
assert tuple(smoke_logits.shape) == (len(check_labels), NUM_CLASSES), smoke_logits.shape
assert torch.isfinite(smoke_loss), "Non-finite smoke-test loss"
smoke_loss.backward()
print(f"Smoke test passed: batch {tuple(check_images.shape)}, logits {tuple(smoke_logits.shape)}, finite loss {smoke_loss.item():.6f}; model and computation are on {DEVICE}.")
del smoke_model, smoke_logits, smoke_loss, check_images, check_labels; gc.collect(); torch.cuda.empty_cache()
seed_everything()  # actual experiment begins from the specified seed
classical_model = ClassicalBaselineModel(pretrained=True, freeze_backbone=False).to(DEVICE)''')

md('''## 7. Training with distinct best/latest checkpoints and resume support

Rerun this cell after an interruption. It resumes from the latest checkpoint and preserves the original 20-epoch budget and early-stopping counter.''')
code('''BEST_WEIGHTS_PATH = OUTPUT_DIR / "classical_baseline_resnet18.pt"
BEST_CHECKPOINT_PATH = OUTPUT_DIR / "classical_baseline_best_checkpoint.pt"
LATEST_CHECKPOINT_PATH = OUTPUT_DIR / "classical_baseline_latest_checkpoint.pt"
HISTORY_PATH = OUTPUT_DIR / "training_history.csv"

def rng_state():
    return {"python": random.getstate(), "numpy": np.random.get_state(), "torch": torch.get_rng_state(), "cuda": torch.cuda.get_rng_state_all()}
def restore_rng(state):
    random.setstate(state["python"]); np.random.set_state(state["numpy"]); torch.set_rng_state(state["torch"]); torch.cuda.set_rng_state_all(state["cuda"])

def train_one_epoch(model, loader, optimizer, criterion):
    model.train(); total = 0.0
    for images, labels, _ in loader:
        images, labels = images.to(DEVICE, non_blocking=True), labels.to(DEVICE, non_blocking=True)
        optimizer.zero_grad(); loss = criterion(model(images), labels); loss.backward(); optimizer.step(); total += loss.item() * images.size(0)
    return total / len(loader.dataset)

@torch.no_grad()
def evaluate(model, loader, criterion):
    model.eval(); total, probs_all, labels_all, ids_all = 0.0, [], [], []
    for images, labels, image_ids in loader:
        logits = model(images.to(DEVICE, non_blocking=True)); loss = criterion(logits, labels.to(DEVICE, non_blocking=True))
        total += loss.item() * images.size(0); probs_all.append(F.softmax(logits, 1).cpu().numpy()); labels_all.extend(labels.numpy()); ids_all.extend(image_ids)
    probabilities, labels = np.concatenate(probs_all), np.asarray(labels_all); predictions = probabilities.argmax(1)
    try: auc = roc_auc_score(labels, probabilities, multi_class="ovr", average="macro")
    except ValueError: auc = float("nan")
    metrics = {"loss": total / len(loader.dataset), "accuracy": accuracy_score(labels, predictions),
               "precision_macro": precision_score(labels, predictions, average="macro", zero_division=0), "recall_macro": recall_score(labels, predictions, average="macro", zero_division=0),
               "f1_macro": f1_score(labels, predictions, average="macro", zero_division=0), "auc_macro_ovr": auc}
    return metrics, probabilities, labels, predictions, ids_all

criterion = nn.CrossEntropyLoss(weight=class_weights.to(DEVICE))
optimizer = torch.optim.Adam(filter(lambda p: p.requires_grad, classical_model.parameters()), lr=LR)
history = []; start_epoch = 0; best_score = -float("inf"); best_epoch = 0; no_improve = 0
if LATEST_CHECKPOINT_PATH.exists():
    checkpoint = torch.load(LATEST_CHECKPOINT_PATH, map_location=DEVICE, weights_only=False)
    if checkpoint["config"] != CONFIG: raise ValueError("Latest checkpoint configuration does not match this experiment.")
    classical_model.load_state_dict(checkpoint["model_state"]); optimizer.load_state_dict(checkpoint["optimizer_state"])
    start_epoch, best_score, best_epoch, no_improve, history = checkpoint["completed_epoch"], checkpoint["best_score"], checkpoint["best_epoch"], checkpoint["early_stopping_counter"], checkpoint["history"]
    restore_rng(checkpoint["rng_state"])
    print(f"Resuming after epoch {start_epoch}; best validation macro-F1={best_score:.8f} at epoch {best_epoch}; patience counter={no_improve}.")

epoch_times = []
for epoch in range(start_epoch, FULL_EPOCHS):
    started = time.time(); train_loss = train_one_epoch(classical_model, train_loader, optimizer, criterion)
    val_metrics, _, _, _, _ = evaluate(classical_model, val_loader, criterion); elapsed = time.time() - started; epoch_times.append(elapsed)
    row = {"epoch": epoch + 1, "train_loss": train_loss, "elapsed_seconds": elapsed, **{f"val_{key}": value for key, value in val_metrics.items()}}
    history.append(row); current = val_metrics["f1_macro"]; improved = current > best_score + 1e-4
    if improved:
        best_score, best_epoch, no_improve = current, epoch + 1, 0
        best_payload = {"model_state": classical_model.state_dict(), "epoch": best_epoch, "best_score": best_score, "config": CONFIG}
        torch.save(best_payload, BEST_CHECKPOINT_PATH); torch.save(classical_model.state_dict(), BEST_WEIGHTS_PATH)
    else: no_improve += 1
    latest = {"model_state": classical_model.state_dict(), "optimizer_state": optimizer.state_dict(), "completed_epoch": epoch + 1, "best_score": best_score,
              "best_epoch": best_epoch, "early_stopping_counter": no_improve, "history": history, "config": CONFIG, "rng_state": rng_state()}
    torch.save(latest, LATEST_CHECKPOINT_PATH); pd.DataFrame(history).to_csv(HISTORY_PATH, index=False)
    mean_time = float(np.mean(epoch_times)); remaining = max(0, FULL_EPOCHS - (epoch + 1)) * mean_time
    tag = " <- best checkpoint saved" if improved else ""
    print(f"Epoch {epoch+1}/{FULL_EPOCHS} | train_loss={train_loss:.6f} | val_loss={val_metrics['loss']:.6f} | val_acc={val_metrics['accuracy']:.6f} | val_auc={val_metrics['auc_macro_ovr']:.6f} | val_f1={current:.6f} | {elapsed:.1f}s | estimated remaining {remaining/60:.1f} min{tag}")
    if no_improve >= PATIENCE:
        print(f"Early stopping: no macro-F1 improvement for {PATIENCE} epochs. Best epoch: {best_epoch}."); break

if not BEST_CHECKPOINT_PATH.exists(): raise RuntimeError("No best checkpoint was created.")
best_checkpoint = torch.load(BEST_CHECKPOINT_PATH, map_location=DEVICE, weights_only=False)
classical_model.load_state_dict(best_checkpoint["model_state"])
print(f"Restored best model from epoch {best_checkpoint['epoch']} (validation macro-F1={best_checkpoint['best_score']:.8f}).")''')

md('''## 8. Best-validation evaluation and artifacts''')
code('''metrics, probabilities, labels, predictions, image_ids = evaluate(classical_model, val_loader, criterion)
metrics_record = {"model": "Classical baseline ResNet18", "split": "validation", "best_epoch": best_checkpoint["epoch"], **metrics}
pd.DataFrame([metrics_record]).to_csv(OUTPUT_DIR / "classical_baseline_metrics.csv", index=False)
report = classification_report(labels, predictions, labels=range(NUM_CLASSES), target_names=CLASS_NAMES, output_dict=True, zero_division=0)
pd.DataFrame(report).transpose().to_csv(OUTPUT_DIR / "classification_report.csv")
prediction_frame = pd.DataFrame({"image_id": image_ids, "true_label": labels, "true_class": [CLASS_NAMES[x] for x in labels], "predicted_label": predictions, "predicted_class": [CLASS_NAMES[x] for x in predictions]})
for idx, name in enumerate(CLASS_NAMES): prediction_frame[f"prob_{name}"] = probabilities[:, idx]
prediction_frame.to_csv(OUTPUT_DIR / "validation_predictions.csv", index=False)

history_frame = pd.DataFrame(history); history_frame.to_csv(HISTORY_PATH, index=False)
fig, axes = plt.subplots(1, 3, figsize=(16, 4))
axes[0].plot(history_frame.epoch, history_frame.val_f1_macro, marker="o"); axes[0].set(title="Validation macro-F1", xlabel="Epoch")
axes[1].plot(history_frame.epoch, history_frame.train_loss, label="train"); axes[1].plot(history_frame.epoch, history_frame.val_loss, label="validation"); axes[1].set(title="Loss", xlabel="Epoch"); axes[1].legend()
cm = confusion_matrix(labels, predictions, labels=range(NUM_CLASSES)); im = axes[2].imshow(cm, cmap="Blues"); axes[2].set(title="Validation confusion matrix", xlabel="Predicted", ylabel="True", xticks=range(NUM_CLASSES), yticks=range(NUM_CLASSES), xticklabels=CLASS_NAMES, yticklabels=CLASS_NAMES)
plt.setp(axes[2].get_xticklabels(), rotation=45, ha="right")
for i in range(NUM_CLASSES):
    for j in range(NUM_CLASSES): axes[2].text(j, i, cm[i, j], ha="center", va="center", fontsize=8, color="white" if cm[i,j] > cm.max()/2 else "black")
fig.colorbar(im, ax=axes[2]); plt.tight_layout(); fig.savefig(OUTPUT_DIR / "training_curves_and_confusion_matrix.png", dpi=180, bbox_inches="tight"); plt.show()
print("Validation metrics (full precision in CSV):", metrics)
print(classification_report(labels, predictions, labels=range(NUM_CLASSES), target_names=CLASS_NAMES, digits=3, zero_division=0))
print("Saved all requested artifacts to:", OUTPUT_DIR)''')

md('''## Method note

The weighted sampler and weighted cross-entropy loss are intentionally retained from the original experiment. Together they may over-emphasize minority classes, so record them consistently across baselines. The validation set is lesion-disjoint but is still a validation set; it must not be described as independent test performance.''')

nb["cells"] = cells
nb["metadata"] = {"kernelspec": {"display_name": "Python 3", "language": "python", "name": "python3"}, "language_info": {"name": "python", "version": "3.x"}, "colab": {"provenance": []}}
for index, cell in enumerate(cells):
    if cell["cell_type"] == "code":
        source = "\n".join("# " + line if line.lstrip().startswith(("!", "%")) else line for line in cell["source"].splitlines())
        compile(source, f"notebook cell {index}", "exec")
out.write_text(json.dumps(nb, indent=1), encoding="utf-8")
print(out)
