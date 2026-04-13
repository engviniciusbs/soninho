"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Moon,
  Sun,
  Trash2,
  Pencil,
  Star,
  Thermometer,
  Cloud,
  CloudRain,
  Snowflake,
  Wind,
  Shirt,
} from "lucide-react";
import { formatDuration, formatTimeRange } from "@/lib/utils";
import { createClient } from "@/lib/supabase/client";
import { deleteSleepSession } from "@/lib/supabase/queries";
import { toast } from "sonner";
import type { SleepSession } from "@/types";
import type { WeatherCondition } from "@/lib/sleep/clothingRecommendation";

// ─── Weather icon map ─────────────────────────────────────────────────────────
const WEATHER_ICONS: Record<WeatherCondition, React.ComponentType<{ className?: string }>> = {
  sunny:  Sun,
  cloudy: Cloud,
  rainy:  CloudRain,
  hot:    Thermometer,
  cold:   Snowflake,
  windy:  Wind,
};

const WEATHER_LABELS: Record<WeatherCondition, string> = {
  sunny:  "Ensolarado",
  cloudy: "Nublado",
  rainy:  "Chuvoso",
  hot:    "Muito quente",
  cold:   "Frio",
  windy:  "Ventando",
};

const SACK_SHORT: Record<string, string> = {
  mesh:    "Malha",
  flannel: "Flanela",
  fleece:  "Fleece",
  none:    "",
};

interface SleepCardProps {
  session: SleepSession;
  onEdit?: (session: SleepSession) => void;
}

export function SleepCard({ session, onEdit }: SleepCardProps) {
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const queryClient = useQueryClient();
  const supabase = createClient();

  const isNap = session.type === "NAP";

  const WeatherIcon = session.weather_condition
    ? WEATHER_ICONS[session.weather_condition as WeatherCondition]
    : null;

  async function handleDelete() {
    setDeleting(true);
    const { error } = await deleteSleepSession(supabase, session.id);
    if (error) {
      toast.error("Erro ao excluir registro");
    } else {
      toast.success("Registro excluído");
      queryClient.invalidateQueries({ queryKey: ["sleep-sessions"] });
    }
    setDeleting(false);
    setShowDelete(false);
  }

  return (
    <>
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, x: -16 }}
        layout
        className={`group rounded-2xl border transition-colors hover:border-border/80 ${
          isNap
            ? "border-lavender/15 bg-lavender/5"
            : "border-sky-sleep/15 bg-sky-sleep/5"
        }`}
      >
        <div className="flex items-center gap-3 py-3.5 px-4">
          {/* Type icon */}
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-transform group-hover:scale-105 ${
              isNap
                ? "bg-lavender/20 text-lavender"
                : "bg-sky-sleep/20 text-sky-sleep"
            }`}
          >
            {isNap
              ? <Sun className="h-5 w-5" aria-hidden="true" />
              : <Moon className="h-5 w-5" aria-hidden="true" />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-semibold">
                {isNap ? "Soneca" : "Sono noturno"}
              </span>
              {session.quality != null && (
                <Badge variant="secondary" className="rounded-full text-[11px] gap-1 px-2 py-0">
                  <Star className="h-2.5 w-2.5 fill-current" aria-hidden="true" />
                  {session.quality}
                </Badge>
              )}
              {!session.end_time && (
                <span className="rounded-full bg-primary/15 px-2 py-0.5 text-[11px] font-medium text-primary">
                  Em andamento
                </span>
              )}
            </div>

            <p className="text-xs text-muted-foreground mt-0.5">
              {formatTimeRange(session.start_time, session.end_time)}
            </p>

            {/* Environment badges */}
            {(session.room_temp_celsius != null ||
              session.weather_condition ||
              (session.sleep_sack_type && session.sleep_sack_type !== "none")) && (
              <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
                {session.room_temp_celsius != null && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Thermometer className="h-2.5 w-2.5" aria-hidden="true" />
                    <span className="tabular-nums">{session.room_temp_celsius}°C</span>
                  </span>
                )}
                {session.weather_condition && WeatherIcon && (
                  <span
                    className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground"
                    title={WEATHER_LABELS[session.weather_condition as WeatherCondition]}
                  >
                    <WeatherIcon className="h-2.5 w-2.5" aria-hidden="true" />
                    <span>{WEATHER_LABELS[session.weather_condition as WeatherCondition]}</span>
                  </span>
                )}
                {session.sleep_sack_type && session.sleep_sack_type !== "none" && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-border/40 bg-card/60 px-2 py-0.5 text-[11px] text-muted-foreground">
                    <Shirt className="h-2.5 w-2.5" aria-hidden="true" />
                    <span>
                      {SACK_SHORT[session.sleep_sack_type] ?? session.sleep_sack_type}
                      {session.sleep_sack_tog != null && ` TOG ${session.sleep_sack_tog}`}
                    </span>
                  </span>
                )}
              </div>
            )}

            {session.notes && (
              <p className="text-xs text-muted-foreground/70 truncate mt-0.5">
                {session.notes}
              </p>
            )}
          </div>

          {/* Duration */}
          {session.duration_min != null && (
            <span className="text-sm font-bold tabular-nums shrink-0 text-foreground/80">
              {formatDuration(session.duration_min)}
            </span>
          )}

          {/* Actions */}
          <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
            {onEdit && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-lg"
                onClick={() => onEdit(session)}
                aria-label="Editar registro"
              >
                <Pencil className="h-3.5 w-3.5" aria-hidden="true" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={() => setShowDelete(true)}
              aria-label="Excluir registro"
            >
              <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            </Button>
          </div>
        </div>
      </motion.div>

      <Dialog open={showDelete} onOpenChange={setShowDelete}>
        <DialogContent className="rounded-2xl sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>Excluir registro</DialogTitle>
            <DialogDescription>
              Tem certeza que deseja excluir este registro de sono?
              Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              onClick={() => setShowDelete(false)}
              className="rounded-xl"
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting}
              className="rounded-xl"
            >
              {deleting ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
