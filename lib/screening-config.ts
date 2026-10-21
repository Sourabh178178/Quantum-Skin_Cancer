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