import { format } from "date-fns";
import { ListRow } from "@/components/ui/list-row";
import { formatDuration } from "@/lib/utils";
import { howFellAsleepLabels } from "@/lib/sleep/captureLabels";
import { g } from "@/lib/i18n/gender";
import type { BabySex, SleepSession } from "@/types";

/** "adormeceu …" for each way of falling asleep (mockup copy), agreeing with `babies.sex`. */
function fellAsleep(sex: BabySex | null | undefined): Record<string, string> {
  return {
    peito: "adormeceu no peito",
    mamadeira: "adormeceu na mamadeira",
    colo: "adormeceu no colo",
    berco: g(sex, {
      f: "adormeceu sozinha no berço",
      m: "adormeceu sozinho no berço",
      n: "adormeceu no berço sem ajuda",
    }),
    carrinho: "adormeceu no carrinho",
    movimento: "adormeceu em movimento",
  };
}

function hhmm(iso: string): string {
  return format(new Date(iso), "HH:mm");
}

/** Title, subtitle and value of one sleep in the Registro list. */
export function describeSleep(
  session: SleepSession,
  sex?: BabySex | null
): { title: string; subtitle: string; value: string } {
  const parts = [
    session.end_time ? `${hhmm(session.start_time)} a ${hhmm(session.end_time)}` : `${hhmm(session.start_time)} até agora`,
  ];
  if (session.how_fell_asleep) {
    parts.push(
      fellAsleep(sex)[session.how_fell_asleep] ??
        `adormeceu: ${(howFellAsleepLabels(sex)[session.how_fell_asleep] ?? session.how_fell_asleep).toLowerCase()}`
    );
  }
  const minutes =
    session.duration_min ??
    (session.end_time ? (Date.parse(session.end_time) - Date.parse(session.start_time)) / 60_000 : null);
  return {
    title: session.type === "NAP" ? "Soneca" : "Noite",
    subtitle: parts.join(", "),
    value: minutes === null ? "Em andamento" : formatDuration(minutes),
  };
}

interface SleepCardProps {
  session: SleepSession;
  /** `babies.sex` of the baby the sleep belongs to. */
  sex?: BabySex | null;
  onEdit?: (session: SleepSession) => void;
}

/**
 * One sleep in the Registro list (mockup `.list .item`): the type, then the
 * interval and how the baby fell asleep, and the duration. Tapping it edits
 * (and deletes, from the form); a running sleep links to the home instead.
 */
export function SleepCard({ session, sex, onEdit }: SleepCardProps) {
  // A sleep still running is not edited here (saving would end it, deleting
  // would remove the live timer): the row reads "Em andamento" and opens the
  // home, where it is stopped.
  if (!session.end_time) return <ListRow {...describeSleep(session, sex)} href="/app" />;
  return <ListRow {...describeSleep(session, sex)} onClick={onEdit ? () => onEdit(session) : undefined} />;
}
