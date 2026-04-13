"use client";

import { motion, AnimatePresence } from "framer-motion";
import {
  Sun,
  Cloud,
  CloudRain,
  Thermometer,
  Snowflake,
  Wind,
  Minus,
  Plus,
  Info,
  AlertTriangle,
  Shirt,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getClothingRecommendation,
  suggestSleepSackType,
  SACK_LABELS,
  TOG_OPTIONS,
  type SleepSackType,
  type WeatherCondition,
} from "@/lib/sleep/clothingRecommendation";

// ─── Types ────────────────────────────────────────────────────────────────────

export interface EnvironmentData {
  room_temp_celsius: number | null;
  weather_condition: string | null;
  sleep_sack_type: string | null;
  sleep_sack_tog: number | null;
  clothing_description: string | null;
}

interface EnvironmentPickerProps {
  value: EnvironmentData;
  onChange: (data: EnvironmentData) => void;
  compact?: boolean;
}

// ─── Weather options ──────────────────────────────────────────────────────────
const WEATHER_OPTIONS: { value: WeatherCondition; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "sunny",  label: "Ensolarado",  icon: Sun },
  { value: "cloudy", label: "Nublado",     icon: Cloud },
  { value: "rainy",  label: "Chuvoso",     icon: CloudRain },
  { value: "hot",    label: "Muito quente",icon: Thermometer },
  { value: "cold",   label: "Frio",        icon: Snowflake },
  { value: "windy",  label: "Ventando",    icon: Wind },
];

// ─── Sack type options ────────────────────────────────────────────────────────
const SACK_OPTIONS: { value: SleepSackType; shortLabel: string; tog?: string }[] = [
  { value: "none",    shortLabel: "Nenhum" },
  { value: "mesh",    shortLabel: "Malha",   tog: "~0.5" },
  { value: "flannel", shortLabel: "Flanela", tog: "1–2" },
  { value: "fleece",  shortLabel: "Fleece",  tog: "2–3" },
];

// ─── Temperature stepper ──────────────────────────────────────────────────────
function TempStepper({
  value,
  onChange,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
}) {
  const temp = value ?? 22;

  const tempColor =
    temp >= 28 ? "text-orange-400" :
    temp >= 24 ? "text-amber-400" :
    temp >= 20 ? "text-emerald-400" :
    temp >= 16 ? "text-sky-400" :
    "text-indigo-400";

  return (
    <div className="flex flex-col gap-2">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Temperatura do quarto
      </label>
      <div className="flex items-center gap-3">
        <button
          type="button"
          aria-label="Diminuir temperatura"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(Math.max(10, temp - 0.5)); }}
          onClick={() => onChange(Math.max(10, temp - 0.5))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Minus className="h-4 w-4" aria-hidden="true" />
        </button>

        <div className="flex flex-1 items-center justify-center gap-1">
          <span
            className={cn("text-3xl font-bold tabular-nums transition-colors", tempColor)}
            aria-live="polite"
            aria-atomic="true"
          >
            {value === null ? "—" : temp.toFixed(1)}
          </span>
          <span className="text-sm text-muted-foreground mt-1">°C</span>
        </div>

        <button
          type="button"
          aria-label="Aumentar temperatura"
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(Math.min(40, temp + 0.5)); }}
          onClick={() => onChange(Math.min(40, temp + 0.5))}
          className="flex h-9 w-9 items-center justify-center rounded-xl border border-border/60 bg-card/50 text-muted-foreground transition-colors hover:bg-muted/40 hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring active:scale-95"
          style={{ touchAction: "manipulation" }}
        >
          <Plus className="h-4 w-4" aria-hidden="true" />
        </button>
      </div>

      {/* Quick presets */}
      <div className="flex gap-1.5 flex-wrap">
        {[18, 20, 22, 24, 26, 28].map((t) => (
          <button
            key={t}
            type="button"
            aria-label={`Definir temperatura como ${t}°C`}
            aria-pressed={value === t}
            onClick={() => onChange(t)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(t); }}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              value === t
                ? "bg-primary text-primary-foreground"
                : "border border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
            )}
            style={{ touchAction: "manipulation" }}
          >
            {t}°
          </button>
        ))}
        {value !== null && (
          <button
            type="button"
            aria-label="Limpar temperatura"
            onClick={() => onChange(null)}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") onChange(null); }}
            className="rounded-lg px-2.5 py-1 text-xs text-muted-foreground/60 transition-colors hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            Limpar
          </button>
        )}
      </div>
    </div>
  );
}

// ─── Recommendation card ──────────────────────────────────────────────────────
function RecommendationCard({
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
      <div className="rounded-xl border border-dashed border-border/40 bg-card/20 px-4 py-3">
        <p className="text-xs text-muted-foreground/60 text-center">
          Informe a temperatura do quarto para ver a sugestão de roupa
        </p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl border border-primary/20 bg-primary/5 p-3 space-y-2"
      aria-live="polite"
      aria-atomic="true"
    >
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/20">
          <Shirt className="h-3.5 w-3.5 text-primary" aria-hidden="true" />
        </div>
        <span className="text-xs font-semibold text-primary uppercase tracking-wide">
          Sugestão de roupa
        </span>
      </div>

      <div className="space-y-1">
        <p className="text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{rec.sleepSack}</span>
        </p>
        <p className="text-sm font-medium text-foreground leading-snug">
          {rec.layers}
        </p>
      </div>

      {rec.warning && (
        <div className="flex items-start gap-1.5 rounded-lg bg-amber-500/10 px-2.5 py-2">
          <AlertTriangle className="h-3.5 w-3.5 shrink-0 mt-0.5 text-amber-400" aria-hidden="true" />
          <p className="text-xs text-amber-300/90">{rec.warning}</p>
        </div>
      )}
    </motion.div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────
export function EnvironmentPicker({ value, onChange, compact = false }: EnvironmentPickerProps) {
  const sackType = (value.sleep_sack_type as SleepSackType) ?? null;
  const togValue = value.sleep_sack_tog;
  const temp = value.room_temp_celsius;

  function setTemp(t: number | null) {
    const suggestedSack = t !== null && !sackType ? suggestSleepSackType(t) : sackType;
    onChange({ ...value, room_temp_celsius: t });
    // Auto-suggest sack type only if none is selected yet
    if (t !== null && !sackType) {
      onChange({ ...value, room_temp_celsius: t, sleep_sack_type: suggestedSack });
    }
  }

  function setSackType(type: SleepSackType) {
    const newTog = type === "none" ? null : togValue;
    onChange({ ...value, sleep_sack_type: type, sleep_sack_tog: newTog });
  }

  function setTog(tog: number) {
    onChange({ ...value, sleep_sack_tog: togValue === tog ? null : tog });
  }

  function setWeather(w: WeatherCondition) {
    onChange({ ...value, weather_condition: value.weather_condition === w ? null : w });
  }

  return (
    <div className="space-y-5">
      {/* Temperature */}
      <TempStepper value={temp} onChange={setTemp} />

      {/* Weather condition */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Clima externo
          <span className="ml-1 normal-case font-normal text-muted-foreground/50">(opcional)</span>
        </label>
        <div
          role="group"
          aria-label="Condição climática"
          className="grid grid-cols-3 gap-2"
        >
          {WEATHER_OPTIONS.map(({ value: wv, label, icon: Icon }) => {
            const isActive = value.weather_condition === wv;
            return (
              <button
                key={wv}
                type="button"
                aria-pressed={isActive}
                aria-label={label}
                onClick={() => setWeather(wv)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setWeather(wv); }}
                className={cn(
                  "flex flex-col items-center gap-1 rounded-xl border py-2.5 px-2 text-xs font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
                <span className="leading-tight text-center">{label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Sleep sack type */}
      <div className="space-y-2">
        <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
          Saquinho de dormir
        </label>
        <div
          role="group"
          aria-label="Tipo de saquinho"
          className="grid grid-cols-4 gap-1.5"
        >
          {SACK_OPTIONS.map(({ value: sv, shortLabel, tog }) => {
            const isActive = sackType === sv || (!sackType && sv === "none");
            return (
              <button
                key={sv}
                type="button"
                aria-pressed={isActive}
                aria-label={`${SACK_LABELS[sv]}${tog ? ` (TOG ${tog})` : ""}`}
                onClick={() => setSackType(sv)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSackType(sv); }}
                className={cn(
                  "flex flex-col items-center gap-0.5 rounded-xl border py-2.5 px-1 transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  isActive
                    ? "border-primary/50 bg-primary/10 text-primary"
                    : "border-border/50 bg-card/40 text-muted-foreground hover:border-border hover:text-foreground"
                )}
                style={{ touchAction: "manipulation" }}
              >
                <span className="text-[11px] font-semibold leading-tight">{shortLabel}</span>
                {tog && (
                  <span className="text-[10px] opacity-60 leading-tight">TOG {tog}</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* TOG selector — only when a sack is selected */}
      <AnimatePresence>
        {sackType && sackType !== "none" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-2 overflow-hidden"
          >
            <div className="flex items-center gap-1.5">
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                TOG do saquinho
              </label>
              <Info className="h-3 w-3 text-muted-foreground/40" aria-hidden="true" />
            </div>
            <div
              role="group"
              aria-label="TOG do saquinho"
              className="flex gap-1.5 flex-wrap"
            >
              {TOG_OPTIONS.map((t) => {
                const isActive = togValue === t;
                return (
                  <button
                    key={t}
                    type="button"
                    aria-pressed={isActive}
                    aria-label={`TOG ${t}`}
                    onClick={() => setTog(t)}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTog(t); }}
                    className={cn(
                      "rounded-lg px-3 py-1.5 text-xs font-semibold transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                      isActive
                        ? "bg-primary text-primary-foreground"
                        : "border border-border/60 bg-card/40 text-muted-foreground hover:border-primary/40 hover:text-foreground"
                    )}
                    style={{ touchAction: "manipulation" }}
                  >
                    {t}
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Clothing recommendation */}
      {!compact && (
        <RecommendationCard temp={temp} sackType={sackType} togValue={togValue} />
      )}
    </div>
  );
}

// ─── Compact version for SleepTimer ──────────────────────────────────────────
export function EnvironmentPickerCompact({
  value,
  onChange,
}: {
  value: EnvironmentData;
  onChange: (data: EnvironmentData) => void;
}) {
  const temp = value.room_temp_celsius;
  const sackType = (value.sleep_sack_type as SleepSackType) ?? null;
  const togValue = value.sleep_sack_tog;

  function setTemp(t: number | null) {
    onChange({ ...value, room_temp_celsius: t });
  }

  function setSackType(type: SleepSackType) {
    onChange({
      ...value,
      sleep_sack_type: type === sackType ? null : type,
      sleep_sack_tog: type === "none" ? null : togValue,
    });
  }

  const rec = getClothingRecommendation(temp, sackType, togValue);

  return (
    <div className="space-y-3">
      {/* Temperature row */}
      <div className="flex items-center justify-between gap-2">
        <span className="text-xs text-muted-foreground">Temp. do quarto</span>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Diminuir temperatura"
            onClick={() => setTemp(Math.max(10, (temp ?? 22) - 1))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTemp(Math.max(10, (temp ?? 22) - 1)); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            <Minus className="h-3 w-3" aria-hidden="true" />
          </button>
          <span
            className="w-14 text-center text-sm font-semibold tabular-nums"
            aria-live="polite"
          >
            {temp !== null ? `${temp}°C` : "—"}
          </span>
          <button
            type="button"
            aria-label="Aumentar temperatura"
            onClick={() => setTemp(Math.min(40, (temp ?? 22) + 1))}
            onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setTemp(Math.min(40, (temp ?? 22) + 1)); }}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/60 bg-card/50 text-muted-foreground hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            style={{ touchAction: "manipulation" }}
          >
            <Plus className="h-3 w-3" aria-hidden="true" />
          </button>
          {temp !== null && (
            <button
              type="button"
              aria-label="Limpar temperatura"
              onClick={() => setTemp(null)}
              className="text-[10px] text-muted-foreground/50 hover:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              ✕
            </button>
          )}
        </div>
      </div>

      {/* Sack type row */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground shrink-0">Saquinho</span>
        <div className="flex gap-1 flex-1" role="group" aria-label="Saquinho">
          {SACK_OPTIONS.map(({ value: sv, shortLabel }) => (
            <button
              key={sv}
              type="button"
              aria-pressed={sackType === sv || (!sackType && sv === "none")}
              aria-label={SACK_LABELS[sv]}
              onClick={() => setSackType(sv)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSackType(sv); }}
              className={cn(
                "flex-1 rounded-lg py-1 text-[11px] font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                (sackType === sv || (!sackType && sv === "none"))
                  ? "bg-primary/20 text-primary border border-primary/30"
                  : "border border-border/40 text-muted-foreground hover:text-foreground"
              )}
              style={{ touchAction: "manipulation" }}
            >
              {shortLabel}
            </button>
          ))}
        </div>
      </div>

      {/* Recommendation */}
      <AnimatePresence>
        {rec && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            aria-live="polite"
          >
            <div className="rounded-xl bg-primary/5 border border-primary/15 px-3 py-2 flex items-start gap-2">
              <Shirt className="h-3.5 w-3.5 text-primary mt-0.5 shrink-0" aria-hidden="true" />
              <div className="min-w-0">
                <p className="text-xs font-medium text-foreground leading-snug">{rec.layers}</p>
                {rec.warning && (
                  <p className="text-[11px] text-amber-400/80 mt-0.5 leading-snug">{rec.warning}</p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
