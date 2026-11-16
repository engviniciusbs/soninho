import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Moon } from "lucide-react";
import { MoonOrb, Stars } from "./Decor";

export function HeroSection() {
  const prefersReducedMotion = useReducedMotion();
  const heroRef = useRef<HTMLElement>(null);

  const { scrollYProgress: heroProgress } = useScroll({
    target: heroRef,
    offset: ["start start", "end start"],
  });

  const moonY = useTransform(heroProgress, [0, 1], ["0%", "40%"]);
  const moonScale = useTransform(heroProgress, [0, 1], [1, 0.85]);
  const headingY = useTransform(heroProgress, [0, 1], ["0%", "-30%"]);
  const headingOpacity = useTransform(heroProgress, [0, 0.7], [1, 0]);

  return (
    <section
      ref={heroRef}
      className="relative flex min-h-[100svh] flex-col items-center justify-center overflow-hidden px-6 pt-28 pb-24 sm:pt-32"
    >
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(60% 50% at 50% 40%, rgba(129,140,248,0.22) 0%, rgba(8,14,26,0) 70%)",
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 animate-[aurora-drift_14s_ease-in-out_infinite] motion-reduce:animate-none"
        aria-hidden
        style={{
          background:
            "radial-gradient(40% 40% at 30% 70%, rgba(196,181,253,0.12) 0%, transparent 70%), radial-gradient(35% 35% at 75% 30%, rgba(147,197,253,0.10) 0%, transparent 70%)",
        }}
      />
      <Stars />

      <motion.div
        style={prefersReducedMotion ? undefined : { y: moonY, scale: moonScale }}
        className="pointer-events-none absolute inset-0 flex items-center justify-center"
        aria-hidden
      >
        <MoonOrb />
      </motion.div>

      <motion.div
        style={prefersReducedMotion ? undefined : { y: headingY, opacity: headingOpacity }}
        className="relative z-10 mx-auto flex max-w-5xl flex-col items-center text-center"
      >
        <motion.span
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.1 }}
          className="mb-8 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.03] px-4 py-1.5 text-xs tracking-widest uppercase text-[#c4b5fd] backdrop-blur-sm"
        >
          <Moon className="h-3.5 w-3.5" aria-hidden />
          Soninho · em breve nas lojas
        </motion.span>

        <motion.h1
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 1, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          className="font-display text-balance text-[clamp(2.75rem,8.5vw,7rem)] leading-[0.95] font-medium text-white"
        >
          Menos{" "}
          <em className="italic text-[#c4b5fd]" style={{ fontVariationSettings: '"SOFT" 100' }}>
            adivinhação
          </em>
          .
          <br className="hidden sm:block" />
          <span className="sm:block"> Mais noites calmas.</span>
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.45 }}
          className="mt-7 max-w-xl text-base sm:text-lg text-white/70"
        >
          Timer, rotina e sugestões de soneca — compartilhados com a família
          inteira, em tempo real.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.9, delay: 0.6 }}
          className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
        >
          <Link
            href="/register"
            className="group relative inline-flex h-14 items-center gap-2 overflow-hidden rounded-full bg-white px-8 text-sm font-semibold text-[#080e1a] shadow-[0_10px_40px_-8px_rgba(196,181,253,0.6)] transition-transform duration-300 hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-2 focus-visible:ring-offset-[#080e1a]"
          >
            <span className="relative z-10">Criar conta grátis</span>
            <ArrowRight className="relative z-10 h-4 w-4 transition-transform duration-300 group-hover:translate-x-1" aria-hidden />
            <span
              className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#c4b5fd] via-[#fde68a] to-[#c4b5fd] opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
              aria-hidden
            />
          </Link>

          <a
            href="#proof"
            className="group inline-flex h-14 items-center gap-2 rounded-full border border-white/15 px-6 text-sm text-white/80 transition-colors duration-300 hover:border-white/40 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
          >
            Como funciona
            <span className="h-px w-6 bg-white/30 transition-all duration-300 group-hover:w-10 group-hover:bg-white/80" aria-hidden />
          </a>
        </motion.div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-6 left-1/2 z-10 -translate-x-1/2 text-[10px] uppercase tracking-[0.4em] text-white/40"
        aria-hidden
      >
        role down
      </motion.div>
    </section>
  );
}
