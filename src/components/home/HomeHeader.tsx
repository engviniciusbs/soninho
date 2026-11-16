"use client";

import { format } from "date-fns";
import { Select as SelectPrimitive } from "@base-ui/react/select";
import { Select, SelectContent, SelectItem } from "@/components/ui/select";
import { BabyAvatar } from "@/components/baby/BabyAvatar";
import { SoninhoLogoMark } from "@/components/brand/SoninhoLogoMark";
import { IconChevronRight } from "@/components/brand/icons";
import { useBaby } from "@/components/providers/BabyProvider";
import { useNow } from "@/hooks/useNow";
import { getBabyAge } from "@/lib/utils";

export function ageLabel(birthDate: string): string {
  const { weeks, months } = getBabyAge(birthDate);
  if (months >= 1) return `${months} ${months === 1 ? "mês" : "meses"}`;
  return `${weeks} ${weeks === 1 ? "semana" : "semanas"}`;
}

/** Brand and clock (mockup `.top`). The clock renders only after mount. */
export function HomeTopBar() {
  const now = useNow(1000);
  return (
    <div className="mb-4 flex items-center justify-between">
      <p className="flex items-center gap-2.5 font-display text-[22px] font-bold text-sn-tx">
        <SoninhoLogoMark size={26} />
        Soninho
      </p>
      <time
        className="font-sans text-[15px] font-semibold text-sn-mu tabular-nums"
        dateTime={now === null ? undefined : new Date(now).toISOString()}
      >
        {now === null ? null : format(now, "HH:mm")}
      </time>
    </div>
  );
}

/**
 * Active baby with avatar, name and age (mockup `.baby`). The whole row opens
 * the baby switcher (the TopBar's select, now owned by the home).
 */
export function BabySwitcher() {
  const { babies, activeBaby, setActiveBaby } = useBaby();
  if (!activeBaby) return null;

  return (
    <Select
      value={activeBaby.id}
      onValueChange={(id) => {
        const baby = babies.find((b) => b.id === id);
        if (baby) setActiveBaby(baby);
      }}
    >
      <SelectPrimitive.Trigger
        aria-label={`${activeBaby.name}, ${ageLabel(activeBaby.birth_date)}: trocar de bebê`}
        className="mb-4 flex w-full cursor-pointer items-center gap-3.5 rounded-[20px] py-1 text-left outline-none transition-transform duration-(--sn-dur-micro) ease-sn-out active:scale-[0.99] motion-reduce:transition-none disabled:pointer-events-none disabled:opacity-55 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-sn-pr"
      >
        <BabyAvatar
          avatarUrl={activeBaby.avatar_url}
          name={activeBaby.name}
          size="md"
          className="[&>span]:size-14"
        />
        <span className="min-w-0 flex-1">
          <span className="block truncate font-display text-2xl leading-[1.1] font-bold text-sn-tx">
            {activeBaby.name}
          </span>
          <span className="mt-0.5 block font-sans text-sm font-semibold text-sn-mu">
            {ageLabel(activeBaby.birth_date)}
          </span>
        </span>
        <span aria-hidden="true" className="shrink-0 text-sn-mu">
          <IconChevronRight size={22} />
        </span>
      </SelectPrimitive.Trigger>
      <SelectContent alignItemWithTrigger={false} align="start">
        {babies.map((baby) => (
          <SelectItem key={baby.id} value={baby.id}>
            <span className="flex items-center gap-2">
              <BabyAvatar avatarUrl={baby.avatar_url} name={baby.name} size="sm" />
              <span>{baby.name}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
