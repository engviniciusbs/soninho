import { Moon, Sparkles, Users } from "lucide-react";
import { ProofCard } from "./ProofCard";
import { MockFamily, MockInsights, MockTimer } from "./ProofMocks";

export function ProofSection() {
  return (
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
  );
}
