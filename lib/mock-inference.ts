import type { DiseaseType } from "./screening-config";
export type Result = { primary: string; probabilities?: { label: string; value: number }[]; signals?: { label: string; value: string }[] };
const score = (value: string) => [...value].reduce((sum, character) => sum + character.charCodeAt(0), 0);
const normalize = (items: string[], seed: number) => { const raw = items.map((_, index) => 10 + ((seed * (index + 7)) % 34)); const total = raw.reduce((a,b) => a+b,0); return raw.map((value,index) => ({ label: items[index], value: Math.round(value / total * 100) })); };
export async function mockInference(disease: DiseaseType, data: Record<string, string>): Promise<Result> {
  await new Promise(resolve => setTimeout(resolve, 1500));
  const seed = score(JSON.stringify(data));
  if (disease === "heart" || disease === "ckd") { const elevated = seed % 2 === 0; return { primary: elevated ? "Elevated risk indicators" : "Lower risk indicators", signals: disease === "heart" ? [{ label: "Resting Blood Pressure", value: elevated ? "Elevated" : "Within input range" }, { label: "Serum Cholesterol", value: elevated ? "Review indicated" : "Within input range" }, { label: "Exercise profile", value: "Recorded input" }] : [{ label: "Serum Creatinine", value: elevated ? "Review indicated" : "Within input range" }, { label: "Blood Urea", value: "Recorded input" }, { label: "Urine analysis", value: "Recorded input" }] }; }
  const labels = disease === "retinopathy" ? ["No_DR", "Mild", "Moderate", "Severe", "Proliferate_DR"] : ["AKIEC", "BCC", "BKL", "DF", "MEL", "NV", "VASC"];
  const probabilities = normalize(labels, seed); const highest = probabilities.reduce((a,b) => a.value > b.value ? a : b);
  return { primary: highest.label, probabilities };
}
