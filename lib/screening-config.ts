export type DiseaseType = "skinCancer";
export type InputType = "tabular" | "image";

export type Field = {
  key: string;
  label: string;
  type: "number" | "select";
  unit?: string;
  step?: string;
  options?: { label: string; value: string }[];
};

export type FormSection = {
  title: string;
  fields: Field[];
};

export type DiseaseConfig = {
  id: DiseaseType;
  title: string;
  category: string;
  description: string;
  input: string;
  inputType: InputType;
  uploadLabel?: string;
  sections?: FormSection[];
};

export const diseaseConfig: Record<DiseaseType, DiseaseConfig> = {
  skinCancer: {
    id: "skinCancer",
    title: "Skin Cancer",
    category: "Dermoscopic image",
    description:
      "Screen a dermoscopic skin-lesion image across seven skin-lesion categories.",
    input: "Dermoscopic skin-lesion image",
    inputType: "image",
    uploadLabel: "dermoscopic skin-lesion image",
  },
};

export const diseaseList = Object.values(diseaseConfig);

// ─── Per-class educational data ─────────────────────────────────────────────

export type ABCDEItem = {
  letter: string;
  criterion: string;
  relevant: boolean;
  note: string;
};

export type ClassInfo = {
  code: string;
  fullName: string;
  plainDescription: string;
  riskLabel: string;
  abcde: ABCDEItem[];
  differentialNote: string;
};

export const classInfo: Record<string, ClassInfo> = {
  AKIEC: {
    code: "AKIEC",
    fullName: "Actinic Keratosis / Intraepithelial Carcinoma",
    plainDescription:
      "A rough, scaly patch caused by years of sun exposure. Can progress to squamous cell carcinoma if untreated.",
    riskLabel: "Moderate–High",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: true,  note: "Often asymmetric in shape" },
      { letter: "B", criterion: "Border",     relevant: true,  note: "Irregular, poorly defined edges" },
      { letter: "C", criterion: "Colour",     relevant: true,  note: "Reddish, scaly surface; can be pink or brown" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Variable; size alone is not diagnostic" },
      { letter: "E", criterion: "Evolution",  relevant: true,  note: "Gradual thickening or crusting over time" },
    ],
    differentialNote: "Frequently confused with BCC and BKL; texture and border irregularity are key distinguishing features.",
  },
  BCC: {
    code: "BCC",
    fullName: "Basal Cell Carcinoma",
    plainDescription:
      "The most common skin cancer. Typically slow-growing with a pearly or waxy appearance. Rarely spreads but needs treatment.",
    riskLabel: "High",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: false, note: "Often symmetric and round" },
      { letter: "B", criterion: "Border",     relevant: true,  note: "Rolled, pearlescent border is characteristic" },
      { letter: "C", criterion: "Colour",     relevant: true,  note: "Pearly white, pink, or translucent" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Usually small when detected" },
      { letter: "E", criterion: "Evolution",  relevant: true,  note: "Slow, persistent growth; may bleed or crust" },
    ],
    differentialNote: "Pearly border with central depression is characteristic. May resemble AKIEC at early stages.",
  },
  BKL: {
    code: "BKL",
    fullName: "Benign Keratosis-like Lesion",
    plainDescription:
      "A common non-cancerous skin growth including seborrheic keratoses and solar lentigines (age spots). Generally harmless.",
    riskLabel: "Low",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: false, note: "Often symmetric, 'stuck-on' appearance" },
      { letter: "B", criterion: "Border",     relevant: false, note: "Clearly defined, sharp border typical" },
      { letter: "C", criterion: "Colour",     relevant: true,  note: "Tan to dark brown; uniform or varied" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Usually small to medium" },
      { letter: "E", criterion: "Evolution",  relevant: false, note: "Generally stable over time" },
    ],
    differentialNote: "Usually benign but can resemble melanoma. Rule out MEL if asymmetry or irregular border is present.",
  },
  DF: {
    code: "DF",
    fullName: "Dermatofibroma",
    plainDescription:
      "A harmless, firm bump in the skin, often on the legs. Usually pink to brown and may dimple inward when pinched.",
    riskLabel: "Low",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: false, note: "Typically symmetric" },
      { letter: "B", criterion: "Border",     relevant: false, note: "Well-defined, stable border" },
      { letter: "C", criterion: "Colour",     relevant: false, note: "Uniform pink to brown" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Usually less than 1 cm" },
      { letter: "E", criterion: "Evolution",  relevant: false, note: "Stable; rarely changes" },
    ],
    differentialNote: "Positive 'dimple sign' on compression is characteristic. Rarely confused with malignant lesions.",
  },
  MEL: {
    code: "MEL",
    fullName: "Melanoma",
    plainDescription:
      "The most dangerous skin cancer, arising from pigment-producing cells. Early detection is critical — it can spread rapidly if not treated.",
    riskLabel: "Critical",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: true, note: "One half does not match the other" },
      { letter: "B", criterion: "Border",     relevant: true, note: "Ragged, notched, blurred, or irregular" },
      { letter: "C", criterion: "Colour",     relevant: true, note: "Multiple shades of brown, black, red, white, or blue" },
      { letter: "D", criterion: "Diameter",   relevant: true, note: "Larger than 6 mm (pencil eraser) at diagnosis" },
      { letter: "E", criterion: "Evolution",  relevant: true, note: "Changing in size, shape, colour, or new symptoms" },
    ],
    differentialNote: "All five ABCDE criteria are relevant. Requires urgent clinical evaluation. Can resemble NV — evolution is the key differentiator.",
  },
  NV: {
    code: "NV",
    fullName: "Melanocytic Nevus (Mole)",
    plainDescription:
      "A common, benign mole formed by pigment cells. Most are harmless, but any that change shape, colour, or size should be evaluated.",
    riskLabel: "Low",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: false, note: "Typically symmetric" },
      { letter: "B", criterion: "Border",     relevant: false, note: "Smooth, regular border" },
      { letter: "C", criterion: "Colour",     relevant: false, note: "Uniform brown or tan" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Usually less than 6 mm" },
      { letter: "E", criterion: "Evolution",  relevant: true,  note: "Any change warrants evaluation — may indicate MEL" },
    ],
    differentialNote: "Most common classification. If confidence is low or Evolution criterion is met, clinical follow-up is advised.",
  },
  VASC: {
    code: "VASC",
    fullName: "Vascular Lesion",
    plainDescription:
      "Benign growths involving blood vessels, such as cherry angiomas or angiokeratomas. Characterised by their red, purple, or blue colour.",
    riskLabel: "Low",
    abcde: [
      { letter: "A", criterion: "Asymmetry",  relevant: false, note: "Typically symmetric" },
      { letter: "B", criterion: "Border",     relevant: false, note: "Well-defined" },
      { letter: "C", criterion: "Colour",     relevant: true,  note: "Bright red, purple, or blue — distinctive vascular colour" },
      { letter: "D", criterion: "Diameter",   relevant: false, note: "Usually small" },
      { letter: "E", criterion: "Evolution",  relevant: false, note: "Stable; new rapid growth warrants evaluation" },
    ],
    differentialNote: "Colour alone is often diagnostic. Rarely confused with malignant lesions.",
  },
};

// Per-class test-set metrics from QEMNet training notebook (HAM10000, 1,503 test samples)
export const perClassMetrics: Record<string, { precision: number; recall: number; f1: number; support: number }> = {
  akiec: { precision: 0.685, recall: 0.755, f1: 0.718, support: 49 },
  bcc:   { precision: 0.845, recall: 0.779, f1: 0.811, support: 77 },
  bkl:   { precision: 0.769, recall: 0.685, f1: 0.724, support: 165 },
  df:    { precision: 0.857, recall: 0.706, f1: 0.774, support: 17 },
  mel:   { precision: 0.727, recall: 0.653, f1: 0.688, support: 167 },
  nv:    { precision: 0.922, recall: 0.955, f1: 0.938, support: 1006 },
  vasc:  { precision: 0.840, recall: 0.955, f1: 0.894, support: 22 },
};
