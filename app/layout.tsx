import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "QEMNet — Quantum Skin Cancer Screening",
  description: "Hybrid quantum-classical deep learning for dermoscopic skin lesion classification. B.E. Major Project.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
