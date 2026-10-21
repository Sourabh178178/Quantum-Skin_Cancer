import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MedQube — Earlier signals, deeper understanding",
  description: "A quantum-assisted early-disease screening platform prototype.",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="en"><body>{children}</body></html>;
}
