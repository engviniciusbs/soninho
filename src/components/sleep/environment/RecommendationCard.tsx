import { IconAlert, IconShirt } from "@/components/brand/icons";
import {
  getClothingRecommendation,
  type SleepSackType,
} from "@/lib/sleep/clothingRecommendation";

// ─── Recommendation (a tinted well, not a card: it sits in a sheet or a form) ─
export function RecommendationCard({
  temp,
  sackType,
  togValue,
}: {
  temp: number | null;
  sackType: SleepSackType | null;
  togValue: number | null;
}) {
  const rec = getClothingRecommendation(temp, sackType, togValue);

  if (!rec) {
    return (
      <p className="rounded-2xl bg-sn-s2/40 px-4 py-3 text-center font-sans text-[15px] font-semibold text-sn-mu">
        Informe a temperatura do quarto para ver a sugestão de roupa
      </p>
    );
  }

  return (
    <div className="space-y-2 rounded-2xl bg-sn-s2/60 p-4" aria-live="polite" aria-atomic="true">
      <p className="flex items-center gap-2 font-sans text-sm font-bold text-sn-pr">
        <IconShirt size={18} />
        Sugestão de roupa
      </p>
      <p className="font-sans text-[15px] font-bold text-sn-tx">{rec.sleepSack}</p>
      <p className="font-sans text-base leading-snug text-sn-tx">{rec.layers}</p>
      {rec.warning && (
        <p className="flex items-start gap-2 rounded-xl bg-sn-warn/10 px-3 py-2 font-sans text-[15px] font-semibold text-sn-warn">
          <IconAlert size={18} className="mt-0.5 shrink-0" />
          {rec.warning}
        </p>
      )}
    </div>
  );
}
