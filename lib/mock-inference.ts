import type { DiseaseType } from "./screening-config";

export type Result = {
  primary: string;
  probabilities?: {
    label: string;
    value: number;
    name?: string;
    category?: string;
    risk?: string;
  }[];
  signals?: { label: string; value: string }[];
  confidence?: number;
  model?: string;
  weights_loaded?: boolean;
  weights_message?: string;
  connected?: boolean;
  source?: "quantum_backend" | "fallback_simulation";
  // Stage 2: backend-augmented fields
  warnings?: string[];
  quantum_weights?: number[][];
  quantum_outputs?: number[];
};

const score = (value: string) =>
  [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0);

const normalize = (items: string[], seed: number) => {
  const raw = items.map((_, index) => 10 + ((seed * (index + 7)) % 34));
  const total = raw.reduce((a, b) => a + b, 0);
  return raw.map((value, index) => ({
    label: items[index],
    value: Math.round((value / total) * 100),
  }));
};

export async function runInference(
  disease: DiseaseType,
  data: Record<string, string>,
  file?: File | null
): Promise<Result> {
  if (disease === "skinCancer" && file) {
    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/predict", {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const json = await response.json();
        return {
          primary: json.primary,
          confidence: json.confidence,
          probabilities: json.probabilities,
          model: json.model || "HybridMobileNet (PennyLane Quantum Circuit)",
          weights_loaded: json.weights_loaded ?? false,
          weights_message: json.weights_message,
          connected: json.connected ?? false,
          source: json.source,
          warnings: json.warnings ?? [],
          quantum_weights: json.quantum_weights ?? null,
          quantum_outputs: json.quantum_outputs ?? null,
        };
      }
    } catch (err) {
      console.warn("Failed calling inference endpoint, falling back:", err);
    }
  }

  return mockInference(disease, data);
}

export async function mockInference(
  disease: DiseaseType,
  data: Record<string, string>
): Promise<Result> {
  await new Promise((resolve) => setTimeout(resolve, 1200));
  const seed = score(JSON.stringify(data));
  const labels = ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"];
  const probabilities = normalize(labels, seed);
  const highest = probabilities.reduce((a, b) =>
    a.value > b.value ? a : b
  );
  return {
    primary: highest.label,
    probabilities,
    connected: false,
    source: "fallback_simulation",
    model: "Simulated Demonstration",
    warnings: [],
  };
}
