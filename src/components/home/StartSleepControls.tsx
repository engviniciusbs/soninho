"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { IconClock, IconMoon, IconPlay, IconSun } from "@/components/brand/icons";
import { BackdateStartChips } from "@/components/sleep/timer/BackdateStartChips";
import type { useBackdate } from "@/components/sleep/timer/useBackdate";

type SleepType = "NAP" | "NIGHT_SLEEP";

export interface StartSleepControlsProps {
  sleepType: SleepType;
  onSleepTypeChange: (type: SleepType) => void;
  onStart: () => Promise<void>;
  backdate: ReturnType<typeof useBackdate>;
}

const TYPE_OPTIONS = [
  { value: "NAP" as const, label: "Soneca", icon: <IconSun size={22} /> },
  { value: "NIGHT_SLEEP" as const, label: "Noturno", icon: <IconMoon size={20} /> },
];

/** Awake controls (mockup `.seg`, `.cta`, `.ghost`): type, start, back-dated start. */
export function StartSleepControls({ sleepType, onSleepTypeChange, onStart, backdate }: StartSleepControlsProps) {
  const [backdateOpen, setBackdateOpen] = useState(false);
  const [starting, setStarting] = useState(false);

  async function start() {
    setStarting(true);
    try {
      await onStart();
    } finally {
      setStarting(false);
    }
  }

  return (
    <div className="flex flex-col">
      <SegmentedControl
        aria-label="Tipo de sono"
        value={sleepType}
        onChange={onSleepTypeChange}
        options={TYPE_OPTIONS}
        className="mt-1 mb-3"
      />
      <Button variant="primary" className="w-full" onClick={start} loading={starting}>
        {!starting && <IconPlay size={22} />}
        {sleepType === "NAP" ? "Iniciar soneca" : "Iniciar sono noturno"}
      </Button>
      <Button
        variant="ghost"
        className="mx-auto mt-2"
        aria-expanded={backdateOpen}
        onClick={() => setBackdateOpen((o) => !o)}
      >
        <IconClock size={20} />
        Começou antes?
      </Button>
      {backdateOpen && (
        <div className="pt-1 pb-2">
          <BackdateStartChips
            offset={backdate.offset}
            useCustom={backdate.useCustom}
            customTime={backdate.customTime}
            startLabel={backdate.startLabel}
            onSelectOffset={backdate.selectOffset}
            onSelectCustom={backdate.selectCustom}
            onCustomTimeChange={backdate.setCustomTime}
          />
        </div>
      )}
    </div>
  );
}
