"""
Verification and Test Script for QEMNet Backend and Frontend Connection
Run: python test_connection.py
"""
import sys
from pathlib import Path
import requests

if hasattr(sys.stdout, "reconfigure"):
    try:
        sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

BACKEND_URL = "http://127.0.0.1:8000"
FRONTEND_URL = "http://localhost:3000"
SAMPLE_IMAGE = Path(__file__).parent / "test_samples" / "sample_lesion_1.jpg"

def banner(title: str):
    print("\n" + "=" * 65)
    print(f"  {title}")
    print("=" * 65)

def test_backend_direct():
    banner("1. Testing FastAPI Backend Directly (Port 8000)")
    
    # Health check
    try:
        res = requests.get(f"{BACKEND_URL}/health", timeout=5)
        if res.status_code == 200:
            data = res.json()
            print("[OK] Backend is ONLINE (HTTP 200)")
            print(f"    Architecture: {data.get('architecture')}")
            print(f"    Weights Loaded: {data.get('weights_loaded')}")
            print(f"    Weights Info:   {data.get('weights_message')}")
        else:
            print(f"[FAIL] Backend returned HTTP {res.status_code}: {res.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Could not connect to FastAPI backend at {BACKEND_URL}: {e}")
        print("    Tip: Start backend with: python run_backend.py")
        return False

    # Inference check
    if not SAMPLE_IMAGE.exists():
        print(f"[!] Sample image not found at {SAMPLE_IMAGE}")
        return True

    try:
        print(f"\n[*] Sending test lesion ({SAMPLE_IMAGE.name}) to {BACKEND_URL}/predict ...")
        with open(SAMPLE_IMAGE, "rb") as f:
            files = {"file": (SAMPLE_IMAGE.name, f, "image/jpeg")}
            pred_res = requests.post(f"{BACKEND_URL}/predict", files=files, timeout=30)
        
        if pred_res.status_code == 200:
            pdata = pred_res.json()
            print("[OK] Backend Inference Succeeded (HTTP 200)")
            print(f"    Primary Classification: {pdata.get('primary')} (Confidence: {pdata.get('confidence')}%)")
            print(f"    Top Diagnosis:          {pdata.get('top_prediction', {}).get('name')}")
            print(f"    Risk Profile:           {pdata.get('top_prediction', {}).get('risk')}")
            print("\n    Class Probabilities:")
            for prob in pdata.get("probabilities", []):
                bar = "#" * int(round(prob['value'] / 5))
                print(f"      {prob['label']:<6} {prob['value']:>3}% {bar}  ({prob.get('name')})")
            return True
        else:
            print(f"[FAIL] Predict returned HTTP {pred_res.status_code}: {pred_res.text}")
            return False
    except Exception as e:
        print(f"[FAIL] Error during backend inference: {e}")
        return False

def test_frontend_bridge():
    banner("2. Testing Next.js Frontend Bridge (Port 3000 -> Port 8000)")
    
    # Next.js API GET health check
    try:
        res = requests.get(f"{FRONTEND_URL}/api/predict", timeout=5)
        if res.status_code == 200:
            data = res.json()
            if data.get("online"):
                print("[✓] Next.js API Bridge is ONLINE and connected to FastAPI")
                print(f"    Target Backend: {data.get('backendUrl')}")
                print(f"    Weights Loaded: {data.get('weights_loaded')}")
            else:
                print(f"[!] Next.js responded but backend reported offline: {data}")
                return False
        else:
            print(f"[✗] Frontend bridge returned HTTP {res.status_code}")
            return False
    except Exception as e:
        print(f"[✗] Could not connect to Next.js frontend at {FRONTEND_URL}: {e}")
        print("    Tip: Start frontend with: npm run dev")
        return False

    # Next.js API POST inference
    if not SAMPLE_IMAGE.exists():
        return True

    try:
        print(f"\n[*] Forwarding lesion image through Next.js /api/predict ...")
        with open(SAMPLE_IMAGE, "rb") as f:
            files = {"file": (SAMPLE_IMAGE.name, f, "image/jpeg")}
            pred_res = requests.post(f"{FRONTEND_URL}/api/predict", files=files, timeout=30)
        
        if pred_res.status_code == 200:
            pdata = pred_res.json()
            source = pdata.get("source")
            connected = pdata.get("connected")
            print(f"[✓] End-to-End Inference Succeeded (HTTP 200)")
            print(f"    Execution Source:       {source} (Connected: {connected})")
            print(f"    Primary Classification: {pdata.get('primary')} (Confidence: {pdata.get('confidence')}%)")
            print(f"    Weights Active:         {pdata.get('weights_loaded')}")
            return True
        else:
            print(f"[✗] Frontend bridge returned HTTP {pred_res.status_code}: {pred_res.text}")
            return False
    except Exception as e:
        print(f"[✗] Error during frontend bridge inference: {e}")
        return False

if __name__ == "__main__":
    banner("QEMNet End-to-End System Integration Test")
    b_ok = test_backend_direct()
    f_ok = test_frontend_bridge()
    
    banner("Integration Summary")
    print(f"  FastAPI Backend (8000):   {'[ PASS ]' if b_ok else '[ FAIL ]'}")
    print(f"  Next.js Frontend (3000):  {'[ PASS ]' if f_ok else '[ FAIL ]'}")
    if b_ok and f_ok:
        print("\n  ALL SYSTEMS READY! Quantum-classical hybrid inference is live.")
    print("=" * 65 + "\n")
