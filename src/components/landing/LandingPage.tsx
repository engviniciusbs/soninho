"use client";

import { LandingNav } from "./sections/LandingNav";
import { HeroSection } from "./sections/HeroSection";
import { ProofSection } from "./sections/ProofSection";
import { ClosingSection } from "./sections/ClosingSection";

export function LandingPage() {
  return (
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-[#080e1a] text-[#e7eaf5] font-sans selection:bg-[#c4b5fd] selection:text-[#080e1a]"
    >
      <div className="pointer-events-none fixed inset-0 z-[60] lp-grain opacity-[0.35]" aria-hidden />

      <LandingNav />

      <HeroSection />

      <ProofSection />

      <ClosingSection />
    </main>
  );
}
