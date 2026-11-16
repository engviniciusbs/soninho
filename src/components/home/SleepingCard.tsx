"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Chip } from "@/components/ui/chip";
import { Ring } from "@/components/ui/ring";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { IconPen, IconStop } from "@/components/brand/icons";
import { EnvironmentPicker, type EnvironmentData } from "@/components/sleep/EnvironmentPicker";
import { SleepNotes } from "@/components/sleep/timer/SleepNotes";
import { elapsedToSeconds } from "./format";

export interface SleepingCardProps {
  sleepType: "NAP" | "NIGHT_SLEEP";
  /** "HH:MM:SS" since the start. */
  elapsed: string;
  /** "HH:mm" of the start, or null before the timer has one. */
  since: string | null;
  environment: EnvironmentData;
  onEnvironmentChange: (d: EnvironmentData) => void;
  /** Environment sheet opened: refresh from the session. */
  onEnvironmentOpen: () => void;
  /** Called when the environment sheet closes, to save what changed. */
  onEnvironmentDone: () => void;
  notes: string;
  onNotesChange: (notes: string) => void;
  onNotesOpen: () => void;
  onNotesDone: () => void;
  onStop: () => Promise<void>;
}

/** Running sleep (mockup "Dormindo"): ring with the time, environment chips, "Acordou". */
export function SleepingCard({
  sleepType, elapsed, since, environment, onEnvironmentChange, onEnvironmentOpen, onEnvironmentDone,
  notes, onNotesChange, onNotesOpen, onNotesDone, onStop,
}: SleepingCardProps) {
  const [envOpen, setEnvOpen] = useState(false);
  const [notesOpen, setNotesOpen] = useState(false);
  const [stopping, setStopping] = useState(false);

  // The ring sweeps once per hour, like a minute hand; the numbers carry the value.
  const progress = (elapsedToSeconds(elapsed) % 3600) / 3600;
  const temp = environment.room_temp_celsius;
  const tog = environment.sleep_sack_tog;

  async function stop() {
    setStopping(true);
    try {
      await onStop();
    } finally {
      setStopping(false);
    }
  }

  function openEnv() {
    setEnvOpen(true);
    onEnvironmentOpen();
  }

  function closeEnv(open: boolean) {
    if (open) return openEnv();
    setEnvOpen(false);
    onEnvironmentDone();
  }

  function openNotes() {
    setNotesOpen(true);
    onNotesOpen();
  }

  function closeNotes(open: boolean) {
    if (open) return openNotes();
    setNotesOpen(false);
    onNotesDone();
  }

  return (
    <Card className="items-center gap-0 px-[18px] text-center">
      <p className="font-sans text-sm font-bold text-sn-mu">
        {sleepType === "NAP" ? "Soneca em andamento" : "Sono noturno em andamento"}
      </p>
      <Ring progress={progress} size={220} className="mt-2 mb-3">
        <span className="block font-display text-[42px] leading-none font-bold text-sn-tx tabular-nums">
          {elapsed}
        </span>
        {since && (
          <span className="mt-2 block font-sans text-[13px] font-semibold text-sn-mu tabular-nums">
            Desde {since}
          </span>
        )}
      </Ring>

      <div className="mb-3.5 flex flex-wrap justify-center gap-2">
        <Chip onClick={openEnv}>
          {temp !== null ? `${temp}°C` : "Temperatura"}
        </Chip>
        <Chip onClick={openEnv}>{tog !== null ? `TOG ${tog.toFixed(1)}` : "TOG"}</Chip>
        <Chip onClick={openEnv}>Ambiente</Chip>
      </div>

      <Button variant="secondary" className="w-full" onClick={stop} loading={stopping}>
        {!stopping && <IconStop size={20} />}
        Acordou
      </Button>
      <Button variant="ghost" className="mt-2" onClick={openNotes}>
        <IconPen size={18} />
        Anotar algo
      </Button>

      <Sheet open={envOpen} onOpenChange={closeEnv}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Condições do ambiente</SheetTitle>
            <SheetDescription>Fica salvo junto deste sono.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <EnvironmentPicker value={environment} onChange={onEnvironmentChange} />
          </div>
          <SheetFooter>
            <Button variant="primary" onClick={() => closeEnv(false)}>
              Pronto
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <Sheet open={notesOpen} onOpenChange={closeNotes}>
        <SheetContent side="bottom" className="mx-auto max-w-[480px]">
          <SheetHeader>
            <SheetTitle>Anotar algo</SheetTitle>
            <SheetDescription>A nota fica salva junto deste sono.</SheetDescription>
          </SheetHeader>
          <div className="px-4">
            <SleepNotes notes={notes} onChange={onNotesChange} />
          </div>
          <SheetFooter>
            <Button variant="primary" onClick={() => closeNotes(false)}>
              Salvar nota
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </Card>
  );
}
