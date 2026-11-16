import { formatInTimeZone, fromZonedTime } from "date-fns-tz";

const MIN_NIGHTS = 3;
const MAX_NIGHTS = 7;
const DAY_MIN = 24 * 60;
/** Only ends in [04:00, 10:00] count as the morning wake; others are night wakings. */
const MORNING_FROM = 4 * 60;
const MORNING_UNTIL = 10 * 60;

function minutesOfDay(date: Date, timeZone: string): number {
  const [h, m] = formatInTimeZone(date, timeZone, "HH:mm").split(":").map(Number);
  return h * 60 + m;
}

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

/**
 * Estima o próximo despertar pela média circular (sen/cos) do horário em que
 * as últimas noites terminaram. Só contam fins entre 04:00 e 10:00 locais;
 * um fim fora disso é um despertar de madrugada. Menos de 3 noites: null.
 */
export function estimateWakeTime(
  nights: { start: string; end: string | null }[],
  now: Date,
  timeZone: string,
): Date | null {
  const ends = nights
    .map((n) => (n.end ? new Date(n.end) : null))
    .filter((d): d is Date => d !== null && !Number.isNaN(d.getTime()))
    .filter((d) => {
      const m = minutesOfDay(d, timeZone);
      return m >= MORNING_FROM && m <= MORNING_UNTIL;
    })
    .sort((a, b) => b.getTime() - a.getTime())
    .slice(0, MAX_NIGHTS);
  if (ends.length < MIN_NIGHTS) return null;

  let sin = 0;
  let cos = 0;
  for (const end of ends) {
    const angle = (minutesOfDay(end, timeZone) / DAY_MIN) * 2 * Math.PI;
    sin += Math.sin(angle);
    cos += Math.cos(angle);
  }
  const avg = Math.round(((Math.atan2(sin, cos) / (2 * Math.PI)) * DAY_MIN + DAY_MIN) % DAY_MIN) % DAY_MIN;
  const clock = `${pad(Math.floor(avg / 60))}:${pad(avg % 60)}:00`;

  const today = formatInTimeZone(now, timeZone, "yyyy-MM-dd");
  const candidate = fromZonedTime(`${today}T${clock}`, timeZone);
  if (candidate.getTime() > now.getTime()) return candidate;

  const [y, mo, d] = today.split("-").map(Number);
  const next = new Date(Date.UTC(y, mo - 1, d + 1));
  const nextDay = `${next.getUTCFullYear()}-${pad(next.getUTCMonth() + 1)}-${pad(next.getUTCDate())}`;
  return fromZonedTime(`${nextDay}T${clock}`, timeZone);
}
