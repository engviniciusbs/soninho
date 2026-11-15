import { z } from "zod";

export const zUuid = z.string().uuid();

function isValidTimeZone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export const zTimeZone = z
  .string()
  .refine(isValidTimeZone, "Fuso horário inválido")
  .default("America/Sao_Paulo");

/** Integer in [1, max]; default when absent/NaN/<1; values above max clamp to max. */
export const zLimit = (max: number, def: number) =>
  z.preprocess((v) => {
    if (v === undefined || v === null || v === "") return def;
    const n = typeof v === "number" ? v : Number(v);
    if (!Number.isFinite(n)) return def;
    const i = Math.trunc(n);
    if (i < 1) return def;
    return Math.min(i, max);
  }, z.number().int().min(1).max(max));

export const zIsoRange = z
  .object({
    start_time: z.string().datetime({ offset: true }),
    end_time: z.string().datetime({ offset: true }).nullish(),
  })
  .refine(
    (v) => !v.end_time || new Date(v.end_time).getTime() >= new Date(v.start_time).getTime(),
    { message: "O fim não pode ser antes do início", path: ["end_time"] }
  );
