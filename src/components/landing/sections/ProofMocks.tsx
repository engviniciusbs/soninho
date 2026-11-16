import { Moon, Sparkles } from "lucide-react";

/** Miniature app screens shown inside the proof cards. */

export function MockTimer() {
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

export function MockInsights() {
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

export function MockFamily() {
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
