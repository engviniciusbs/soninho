import type { Metadata } from "next";
import { LandingPage } from "@/components/landing/LandingPage";

export const metadata: Metadata = {
  title: "Soninho — Dorme o bebê. Descansa a cabeça.",
  description:
    "Timer, rotina e lembretes da família inteira. Menos adivinhação, mais noites calmas.",
  openGraph: {
    title: "Soninho — Dorme o bebê. Descansa a cabeça.",
    description:
      "Timer, rotina e lembretes da família inteira. Menos adivinhação, mais noites calmas.",
    type: "website",
  },
};

export default function Home() {
  return <LandingPage />;
}
