"""
Launch script for the QEMNet FastAPI backend.
Run: python run_backend.py
"""
import sys
import uvicorn
from pathlib import Path

backend_dir = Path(__file__).parent / "backend"
sys.path.insert(0, str(backend_dir))

if __name__ == "__main__":
    print("Starting QEMNet Quantum Skin Cancer Inference Server at http://127.0.0.1:8000 ...")
    uvicorn.run(
        "main:app",
        host="127.0.0.1",
        port=8000,
        reload=True,
        reload_dirs=[str(backend_dir)],
        app_dir=str(backend_dir),
    )
