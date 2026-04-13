/**
 * Clothing recommendation logic based on room temperature, sleep sack type and TOG rating.
 *
 * Sources:
 * - Image 1: "Como vestir o bebê para dormir em cada temperatura" (sack type based)
 * - Image 2: TOG rating guide (Mil Merre style)
 */

export type SleepSackType = "none" | "mesh" | "flannel" | "fleece";
export type WeatherCondition = "sunny" | "cloudy" | "rainy" | "hot" | "cold" | "windy";

export interface ClothingRecommendation {
  sleepSack: string;
  layers: string;
  warning?: string;
}

// ─── TOG-based recommendations (Image 2) ─────────────────────────────────────
// Keyed by [temp bucket][TOG] → layers to wear INSIDE the sleep sack
const TOG_TABLE: Record<string, Record<string, string>> = {
  ">=26": {
    "0.5": "Body manga curta ou só fralda",
    "1":   "Body manga curta",
  },
  "24-25": {
    "0.5": "Body manga longa",
    "1":   "Body manga curta",
    "2":   "Body de manga curta",
  },
  "22-23": {
    "0.5": "Body manga longa + camiseta de pijama",
    "1":   "Body manga curta + camiseta de pijama",
    "2":   "Body manga longa",
  },
  "20-21": {
    "1":   "Body manga longa + macacão",
    "2":   "Body manga longa + camiseta de pijama",
    "3":   "Body manga longa",
  },
  "18-19": {
    "2":   "Body manga longa + macacão",
    "3":   "Body manga longa + camiseta de pijama",
  },
  "16-17": {
    "3":   "Body manga longa + macacão",
  },
};

// ─── Sack-type based recommendations (Image 1) ───────────────────────────────
interface SackEntry {
  minTemp: number;
  maxTemp: number;
  sackType: SleepSackType;
  layers: string;
}

const SACK_TABLE: SackEntry[] = [
  { minTemp: 28, maxTemp: 99, sackType: "mesh",    layers: "Body manga curta" },
  { minTemp: 25, maxTemp: 27, sackType: "mesh",    layers: "Body manga curta ou manga longa" },
  { minTemp: 23, maxTemp: 24, sackType: "mesh",    layers: "Body manga longa + calça" },
  { minTemp: 23, maxTemp: 24, sackType: "flannel", layers: "Body manga longa" },
  { minTemp: 20, maxTemp: 22, sackType: "flannel", layers: "Body manga longa + calça" },
  { minTemp: 20, maxTemp: 22, sackType: "fleece",  layers: "Body manga longa" },
  { minTemp: 16, maxTemp: 19, sackType: "flannel", layers: "Body manga longa + calça + macacão soft/fleece" },
  { minTemp: 16, maxTemp: 19, sackType: "fleece",  layers: "Body manga longa + calça" },
  { minTemp: 12, maxTemp: 15, sackType: "fleece",  layers: "Body manga longa + calça + macacão soft/fleece" },
  { minTemp:  0, maxTemp: 11, sackType: "fleece",  layers: "Conjunto térmico + macacão soft/fleece + luvas + touca" },
];

// ─── Human-readable sack names ────────────────────────────────────────────────
export const SACK_LABELS: Record<SleepSackType, string> = {
  none:    "Sem saquinho",
  mesh:    "Saquinho de malha",
  flannel: "Saquinho flanelado",
  fleece:  "Saquinho soft/fleece",
};

export const TOG_OPTIONS = [0.5, 1.0, 1.5, 2.0, 2.5, 3.0];

// ─── Helper: get TOG bucket key ───────────────────────────────────────────────
function getTOGBucket(temp: number): string {
  if (temp >= 26) return ">=26";
  if (temp >= 24) return "24-25";
  if (temp >= 22) return "22-23";
  if (temp >= 20) return "20-21";
  if (temp >= 18) return "18-19";
  return "16-17";
}

// ─── Main recommendation function ────────────────────────────────────────────
export function getClothingRecommendation(
  tempCelsius: number | null,
  sleepSackType: SleepSackType | null,
  sleepSackTog: number | null
): ClothingRecommendation | null {
  if (tempCelsius === null) return null;

  const temp = tempCelsius;
  let sleepSack: string;
  let layers: string;
  let warning: string | undefined;

  // Priority: TOG > sack type > generic
  if (sleepSackTog !== null) {
    const bucket = getTOGBucket(temp);
    const togKey = sleepSackTog.toString();
    const togLayers = TOG_TABLE[bucket]?.[togKey];

    if (togLayers) {
      layers = togLayers;
      sleepSack = `Saquinho TOG ${sleepSackTog}`;
    } else {
      // Find nearest TOG value in this bucket
      const available = Object.keys(TOG_TABLE[bucket] ?? {}).map(Number).sort();
      if (available.length > 0) {
        const nearest = available.reduce((a, b) =>
          Math.abs(b - sleepSackTog) < Math.abs(a - sleepSackTog) ? b : a
        );
        layers = TOG_TABLE[bucket][nearest.toString()] ?? "";
        sleepSack = `Saquinho TOG ${sleepSackTog}`;
        warning = `Para TOG ${sleepSackTog} nesta temperatura, use como referência TOG ${nearest}`;
      } else {
        layers = "Verifique as recomendações do fabricante";
        sleepSack = `Saquinho TOG ${sleepSackTog}`;
      }
    }
  } else if (sleepSackType && sleepSackType !== "none") {
    // Look up by sack type
    const match = SACK_TABLE.find(
      (e) => e.sackType === sleepSackType && temp >= e.minTemp && temp <= e.maxTemp
    );

    if (match) {
      layers = match.layers;
      sleepSack = SACK_LABELS[sleepSackType];
    } else {
      // Closest temperature range for this sack type
      const candidates = SACK_TABLE.filter((e) => e.sackType === sleepSackType);
      if (candidates.length > 0) {
        const closest = candidates.reduce((a, b) => {
          const aDist = Math.min(Math.abs(a.minTemp - temp), Math.abs(a.maxTemp - temp));
          const bDist = Math.min(Math.abs(b.minTemp - temp), Math.abs(b.maxTemp - temp));
          return bDist < aDist ? b : a;
        });
        layers = closest.layers;
        sleepSack = SACK_LABELS[sleepSackType];
        warning = `Temperatura fora do intervalo recomendado para ${SACK_LABELS[sleepSackType]}`;
      } else {
        layers = "Sem referência para esta combinação";
        sleepSack = SACK_LABELS[sleepSackType];
      }
    }
  } else {
    // No sack — just temperature guidance
    sleepSack = "Sem saquinho";
    if (temp >= 26) {
      layers = "Body manga curta ou só fralda";
    } else if (temp >= 22) {
      layers = "Body manga longa";
    } else if (temp >= 18) {
      layers = "Body manga longa + calça + macacão";
    } else {
      layers = "Roupa bem quente — considere usar um saquinho";
      warning = "Temperatura baixa: recomendamos usar um saquinho de dormir";
    }
  }

  // Safety warnings
  if (temp > 30 && !warning) {
    warning = "Temperatura elevada — verifique se o bebê não está com calor";
  }
  if (temp < 14 && !warning) {
    warning = "Temperatura muito baixa — certifique-se que o ambiente está aquecido";
  }

  return { sleepSack, layers, warning };
}

// ─── Suggest sack type for a temperature ─────────────────────────────────────
export function suggestSleepSackType(tempCelsius: number): SleepSackType {
  if (tempCelsius >= 24) return "mesh";
  if (tempCelsius >= 20) return "flannel";
  return "fleece";
}

export function suggestSleepSackTOG(tempCelsius: number): number {
  if (tempCelsius >= 26) return 0.5;
  if (tempCelsius >= 22) return 1.0;
  if (tempCelsius >= 18) return 2.0;
  return 3.0;
}
