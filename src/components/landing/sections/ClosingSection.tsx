import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight } from "lucide-react";
import { Stars } from "./Decor";

export function ClosingSection() {
  return (
    <section className="relative overflow-hidden px-6 py-32 sm:py-44">
      <div
        className="pointer-events-none absolute inset-0"
        aria-hidden
        style={{
          background:
            "radial-gradient(55% 55% at 50% 40%, rgba(129,140,248,0.18) 0%, rgba(8,14,26,0) 70%)",
        }}
      />
      <Stars dense={false} />

      <motion.div
        initial={{ opacity: 0, y: 30 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        className="relative mx-auto flex max-w-4xl flex-col items-center text-center"
      >
        <h2 className="font-display text-balance text-[clamp(2.5rem,7vw,5.5rem)] leading-[1] font-medium text-white">
          Dorme o bebê.
          <br />
          <em className="italic text-[#c4b5fd]">Descansa a cabeça.</em>
        </h2>

        <p className="mt-7 max-w-md text-base text-white/60">
          Três minutos pra criar conta. O resto a gente ajuda.
        </p>

        <Link
          href="/register"
          className="group relative mt-12 inline-flex h-16 items-center gap-3 overflow-hidden rounded-full bg-white px-10 text-sm font-semibold text-[#080e1a] shadow-[0_20px_60px_-15px_rgba(196,181,253,0.7)] transition-transform duration-300 hover:-translate-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#c4b5fd] focus-visible:ring-offset-4 focus-visible:ring-offset-[#080e1a]"
        >
          <span className="relative z-10">Criar conta grátis</span>
          <ArrowRight className="relative z-10 h-5 w-5 transition-transform duration-300 group-hover:translate-x-1.5" aria-hidden />
          <span
            className="absolute inset-0 -translate-x-full bg-gradient-to-r from-[#c4b5fd] via-[#fde68a] to-[#c4b5fd] opacity-0 transition-all duration-500 group-hover:translate-x-0 group-hover:opacity-100"
            aria-hidden
          />
        </Link>

        <p className="mt-10 text-xs uppercase tracking-[0.35em] text-white/30">
          Em breve nas lojas · iOS & Android
        </p>
      </motion.div>

      <footer className="relative mx-auto mt-24 flex max-w-5xl flex-col items-center justify-between gap-4 border-t border-white/5 pt-8 text-xs text-white/30 sm:flex-row">
        <span className="font-display text-sm italic text-white/50">
          Soninho
        </span>
        <span>Feito com carinho no Brasil · {new Date().getFullYear()}</span>
        <Link
          href="/login"
          className="transition-colors hover:text-white/70"
        >
          Já tem conta → entrar
        </Link>
      </footer>
    </section>
  );
}
