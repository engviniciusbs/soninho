import type { ReactNode } from "react";
import { motion } from "framer-motion";

export function ProofCard({
  index,
  title,
  kicker,
  description,
  accent,
  icon,
  delay,
  tilt,
  raised,
  children,
}: {
  index: string;
  title: string;
  kicker: string;
  description: string;
  accent: string;
  icon: ReactNode;
  delay: number;
  tilt: number;
  raised?: boolean;
  children: ReactNode;
}) {
  return (
    <motion.article
      initial={{ opacity: 0, y: 40, rotate: tilt * 2 }}
      whileInView={{ opacity: 1, y: 0, rotate: tilt }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.9, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`group relative flex flex-col overflow-hidden rounded-3xl border border-white/10 bg-gradient-to-b from-white/[0.04] to-white/[0.01] p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-white/20 sm:p-7 ${
        raised ? "md:-translate-y-6" : ""
      }`}
      style={{ transformOrigin: "center top" }}
    >
      <div className="mb-5 flex items-center justify-between">
        <span
          className="font-display text-5xl italic leading-none"
          style={{ color: accent }}
        >
          {index}
        </span>
        <span
          className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/[0.04]"
          style={{ color: accent }}
        >
          {icon}
        </span>
      </div>

      <div className="relative mb-6 aspect-[4/3] overflow-hidden rounded-2xl border border-white/5 bg-[#0a1020]">
        <div
          className="absolute inset-0 opacity-60"
          style={{
            background: `radial-gradient(60% 50% at 50% 40%, ${accent}1f 0%, transparent 70%)`,
          }}
        />
        <div className="relative flex h-full items-center justify-center p-4">
          {children}
        </div>
      </div>

      <p className="mb-2 font-mono text-[10px] uppercase tracking-[0.35em] text-white/40">
        {kicker}
      </p>
      <h3 className="font-display text-3xl font-medium text-white">{title}</h3>
      <p className="mt-3 text-sm leading-relaxed text-white/60">
        {description}
      </p>
    </motion.article>
  );
}
