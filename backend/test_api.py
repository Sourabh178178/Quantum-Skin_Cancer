import io
from PIL import Image
from fastapi.testclient import TestClient
from main import app

client = TestClient(app)

def test_health():
    res = client.get("/health")
    print("Health response:", res.status_code, res.json())
    assert res.status_code == 200

def test_predict():
    # Create a dummy RGB image
    img = Image.new("RGB", (224, 224), color=(200, 100, 100))
    buf = io.BytesIO()
    img.save(buf, format="JPEG")
    buf.seek(0)

    files = {"file": ("test_lesion.jpg", buf, "image/jpeg")}
    res = client.post("/predict", files=files)
    print("Predict response status:", res.status_code)
    data = res.json()
    print("Primary prediction:", data.get("primary"))
    print("Confidence:", data.get("confidence"))
    print("Weights loaded:", data.get("weights_loaded"))
    print("Probabilities:")
    for p in data.get("probabilities", []):
        print(f"  {p['label']} ({p['name']}): {p['value']}%")
    assert res.status_code == 200
    assert "primary" in data
    assert len(data["probabilities"]) == 7

if __name__ == "__main__":
    print("Running tests...")
    test_health()
    test_predict()
    print("All tests passed successfully!")
