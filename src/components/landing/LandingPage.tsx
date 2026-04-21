"use client";

import Link from "next/link";
import { useRef } from "react";
import {
  motion,
  useScroll,
  useTransform,
  useReducedMotion,
} from "framer-motion";
import { ArrowRight, Moon, Sparkles, Users } from "lucide-react";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";

export function LandingPage() {
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
    <main
      id="main-content"
      className="relative min-h-screen overflow-x-hidden bg-[#080e1a] text-[#e7eaf5] font-sans selection:bg-[#c4b5fd] selection:text-[#080e1a]"
    >
      <div className="pointer-events-none fixed inset-0 z-[60] lp-grain opacity-[0.35]" aria-hidden />

      <LandingNav />

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

      <section
        id="proof"
        className="relative overflow-hidden border-y border-white/5 bg-[#05090f] py-28 sm:py-36"
      >
        <div
          className="pointer-events-none absolute inset-0 lp-noise opacity-60"
          aria-hidden
        />

        <div className="relative mx-auto max-w-7xl px-6">
          <div className="mb-20 flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
            <div>
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.4em] text-[#c4b5fd]">
                Três toques por dia
              </p>
              <h2 className="font-display text-balance text-[clamp(2.25rem,5.5vw,4.5rem)] leading-[1] font-medium text-white">
                Um ritual que cabe{" "}
                <em className="italic text-white/60">no colo</em>.
              </h2>
            </div>
            <p className="max-w-sm text-base text-white/60 sm:text-right">
              Sem planilha, sem ansiedade. Só o essencial, no lugar certo, na
              hora certa.
            </p>
          </div>

          <div className="relative grid grid-cols-1 gap-10 md:grid-cols-3 md:gap-6 lg:gap-10">
            <ProofCard
              index="01"
              title="Iniciou."
              kicker="Timer"
              description="Um toque registra a soneca com hora, janela e contexto — automático."
              accent="#c4b5fd"
              icon={<Moon className="h-5 w-5" aria-hidden />}
              delay={0}
              tilt={-2}
            >
              <MockTimer />
            </ProofCard>

            <ProofCard
              index="02"
              title="Entendeu."
              kicker="Padrões"
              description="Gráficos diários e sugestões geradas a partir das últimas 24h."
              accent="#93c5fd"
              icon={<Sparkles className="h-5 w-5" aria-hidden />}
              delay={0.1}
              tilt={0}
              raised
            >
              <MockInsights />
            </ProofCard>

            <ProofCard
              index="03"
              title="Compartilhou."
              kicker="Família"
              description="Mãe, pai, babá e avós no mesmo bebê — com permissões e alertas."
              accent="#fde68a"
              icon={<Users className="h-5 w-5" aria-hidden />}
              delay={0.2}
              tilt={2}
            >
              <MockFamily />
            </ProofCard>
          </div>
        </div>
      </section>

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
    </main>
  );
}

function LandingNav() {
  return (
    <nav className="fixed top-4 left-4 right-4 z-50 sm:top-6 sm:left-6 sm:right-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between rounded-full border border-white/10 bg-[#0a1020]/60 px-5 py-3 backdrop-blur-xl sm:px-6 sm:py-3.5">
        <Link
          href="/"
          className="flex items-center gap-2.5 rounded-full py-0.5 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0a1020]"
        >
          <SoninhoLogoMark size={30} />
          <span className="font-display text-lg tracking-tight text-white">
            Soninho
          </span>
        </Link>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/login"
            className="hidden rounded-full px-4 py-2 text-sm text-white/70 transition-colors hover:text-white sm:inline-flex"
          >
            Entrar
          </Link>
          <Link
            href="/register"
            className="inline-flex items-center gap-1.5 rounded-full bg-white px-4 py-2 text-sm font-medium text-[#080e1a] transition-transform duration-200 hover:-translate-y-0.5 sm:px-5"
          >
            Começar
            <ArrowRight className="h-3.5 w-3.5" aria-hidden />
          </Link>
        </div>
      </div>
    </nav>
  );
}

function MoonOrb() {
  return (
    <div className="relative flex items-center justify-center">
      <div
        className="absolute h-[560px] w-[560px] rounded-full motion-reduce:hidden"
        style={{
          background:
            "radial-gradient(circle, rgba(129,140,248,0.22) 0%, transparent 60%)",
          animation: "breathe 6s ease-in-out infinite",
        }}
      />
      <div
        className="absolute h-[380px] w-[380px] rounded-full border border-white/[0.06] motion-reduce:hidden"
        style={{
          animation: "orbit-slow 60s linear infinite",
        }}
      />
      <div
        className="absolute h-[300px] w-[300px] rounded-full border border-white/[0.08] motion-reduce:hidden"
        style={{
          animation: "orbit-slow 40s linear infinite reverse",
        }}
      />

      <div
        className="relative h-[220px] w-[220px] rounded-full sm:h-[280px] sm:w-[280px]"
        style={{
          background:
            "radial-gradient(circle at 35% 35%, #fefce8 0%, #e9d5ff 35%, #818cf8 80%, #4338ca 100%)",
          boxShadow:
            "inset -30px -30px 60px rgba(15,23,42,0.7), 0 0 80px rgba(196,181,253,0.35), 0 0 160px rgba(129,140,248,0.25)",
        }}
      >
        <span
          className="absolute top-[35%] left-[30%] h-8 w-8 rounded-full opacity-40"
          style={{
            background:
              "radial-gradient(circle, rgba(15,23,42,0.4) 0%, transparent 70%)",
          }}
        />
        <span
          className="absolute top-[55%] left-[55%] h-5 w-5 rounded-full opacity-30"
          style={{
            background:
              "radial-gradient(circle, rgba(15,23,42,0.4) 0%, transparent 70%)",
          }}
        />
      </div>
    </div>
  );
}

const starPositions = [
  { top: "12%", left: "18%", size: 2, delay: 0 },
  { top: "22%", left: "82%", size: 3, delay: 0.8 },
  { top: "68%", left: "10%", size: 2, delay: 1.5 },
  { top: "78%", left: "88%", size: 3, delay: 2.2 },
  { top: "38%", left: "8%", size: 1, delay: 0.4 },
  { top: "48%", left: "92%", size: 2, delay: 1.1 },
  { top: "85%", left: "42%", size: 1, delay: 1.8 },
  { top: "15%", left: "50%", size: 1, delay: 0.6 },
];

function Stars({ dense = true }: { dense?: boolean }) {
  const stars = dense ? starPositions : starPositions.slice(0, 5);
  return (
    <>
      {stars.map((s, i) => (
        <span
          key={i}
          className="pointer-events-none absolute rounded-full bg-white motion-reduce:opacity-60"
          style={{
            top: s.top,
            left: s.left,
            width: `${s.size}px`,
            height: `${s.size}px`,
            boxShadow: "0 0 6px rgba(255,255,255,0.8)",
            animation: `twinkle 2.5s ease-in-out ${s.delay}s infinite`,
          }}
          aria-hidden
        />
      ))}
    </>
  );
}

function ProofCard({
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
  icon: React.ReactNode;
  delay: number;
  tilt: number;
  raised?: boolean;
  children: React.ReactNode;
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

function MockTimer() {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative">
        <div className="absolute -inset-4 rounded-full bg-[#c4b5fd]/20 blur-2xl" aria-hidden />
        <div
          className="relative flex h-24 w-24 items-center justify-center rounded-full border-2 border-[#c4b5fd]/40 bg-[#1a1530]"
          style={{
            animation: "breathe 4s ease-in-out infinite",
          }}
        >
          <Moon className="h-9 w-9 text-[#c4b5fd]" strokeWidth={1.5} aria-hidden />
        </div>
      </div>
      <p className="font-display text-2xl text-white tracking-tight">01:24</p>
      <p className="font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">
        Em soneca
      </p>
    </div>
  );
}

function MockInsights() {
  const bars = [40, 65, 55, 80, 70, 90, 60];
  return (
    <div className="flex h-full w-full flex-col justify-between gap-3">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[9px] uppercase tracking-[0.3em] text-white/40">
          Últimos 7d
        </span>
        <span className="font-display text-lg text-white">14h 32m</span>
      </div>
      <div className="flex h-16 items-end gap-1.5">
        {bars.map((h, i) => (
          <div
            key={i}
            className="flex-1 rounded-t-sm bg-gradient-to-t from-[#93c5fd]/40 to-[#93c5fd]"
            style={{
              height: `${h}%`,
              animation: `float 3s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-[#93c5fd]/10 px-2.5 py-1.5">
        <Sparkles className="h-3 w-3 text-[#93c5fd]" aria-hidden />
        <span className="text-[11px] text-white/70">Próxima soneca às 14:20</span>
      </div>
    </div>
  );
}

function MockFamily() {
  const members = [
    { initial: "M", color: "#fde68a", label: "Mãe" },
    { initial: "P", color: "#c4b5fd", label: "Pai" },
    { initial: "B", color: "#93c5fd", label: "Babá" },
  ];
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex -space-x-3">
        {members.map((m, i) => (
          <div
            key={i}
            className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-[#0a1020] font-display text-lg font-medium text-[#080e1a]"
            style={{ backgroundColor: m.color, zIndex: members.length - i }}
          >
            {m.initial}
          </div>
        ))}
        <div className="relative flex h-12 w-12 items-center justify-center rounded-full border-2 border-dashed border-white/20 text-white/40">
          +
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-lg bg-white/5 px-3 py-1.5">
        <span className="h-1.5 w-1.5 rounded-full bg-[#6ee7b7]" aria-hidden />
        <span className="text-[11px] text-white/70">Mãe está registrando agora</span>
      </div>
    </div>
  );
}
