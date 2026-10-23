import { NextRequest, NextResponse } from "next/server";

const BACKEND_URL = process.env.BACKEND_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/health`, {
      method: "GET",
      cache: "no-store",
    });
    if (!res.ok) {
      return NextResponse.json({
        online: false,
        status: `Backend returned HTTP ${res.status}`,
      });
    }
    const data = await res.json();
    return NextResponse.json({
      online: true,
      backendUrl: BACKEND_URL,
      ...data,
    });
  } catch (error: any) {
    return NextResponse.json({
      online: false,
      message: "Python backend is offline. Run 'python run_backend.py' to enable real inference.",
      error: error.message,
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json(
        { error: "No image file provided in form data" },
        { status: 400 }
      );
    }

    // Try forwarding to FastAPI backend
    try {
      const arrayBuffer = await file.arrayBuffer();
      const blob = new Blob([arrayBuffer], { type: file.type || "image/jpeg" });
      const backendFormData = new FormData();
      backendFormData.append("file", blob, file.name || "lesion.jpg");

      const backendResponse = await fetch(`${BACKEND_URL}/predict`, {
        method: "POST",
        body: backendFormData,
      });

      if (backendResponse.ok) {
        const result = await backendResponse.json();
        return NextResponse.json({
          source: "quantum_backend",
          connected: true,
          ...result,
        });
      } else {
        const errorText = await backendResponse.text();
        console.warn("Backend error response:", errorText);
      }
    } catch (backendError: any) {
      console.warn("Backend unavailable, using fallback:", backendError.message);
    }

    // Fallback: If backend is offline, return simulated response with clear status
    const seed = [...file.name].reduce((acc, c) => acc + c.charCodeAt(0), 42);
    const labels = [
      { code: "AKIEC", name: "Actinic Keratosis / Intraepithelial Carcinoma" },
      { code: "BCC", name: "Basal Cell Carcinoma" },
      { code: "BKL", name: "Benign Keratosis-like Lesions" },
      { code: "DF", name: "Dermatofibroma" },
      { code: "MEL", name: "Melanoma" },
      { code: "NV", name: "Melanocytic Nevus (Mole)" },
      { code: "VASC", name: "Vascular Lesions" },
    ];

    const raw = labels.map((_, i) => 10 + ((seed * (i + 7)) % 37));
    const total = raw.reduce((a, b) => a + b, 0);
    const probabilities = labels.map((item, i) => ({
      label: item.code,
      name: item.name,
      value: Math.round((raw[i] / total) * 100),
    }));
    const top = probabilities.reduce((a, b) => (a.value > b.value ? a : b));

    return NextResponse.json({
      source: "fallback_simulation",
      connected: false,
      notice: "Backend offline. To run live quantum inference, run: python run_backend.py",
      primary: top.label,
      confidence: top.value,
      probabilities,
      image_filename: file.name,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message || "Failed to process image" },
      { status: 500 }
    );
  }
}
