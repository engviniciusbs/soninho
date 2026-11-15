"use client";

/**
 * SleepTimer — Orbital Ring Design
 *
 * Aesthetic: Cosmic Orbital / Deep Space Calm
 * Inspired by Napper's circular wake-window visualizer.
 *
 * Core concept: the ring is the interface. The center IS the start/stop
 * button. Predicted nap windows orbit the ring as floating pill bubbles.
 * Today's sessions become glowing dots on the ring circumference.
 * Owns the data and UI state; the presentational pieces live in ./timer.
 */

import { useState } from "react";
import { useSleepTimer } from "@/hooks/useSleepTimer";
import { useWakeWindow } from "@/hooks/useWakeWindow";
import { useAISuggestions } from "@/hooks/useAISuggestions";
import { useBaby } from "@/components/providers/BabyProvider";
import type { EnvironmentData } from "./EnvironmentPicker";
import { PostSleepReview } from "./PostSleepReview";
import { SZ, TCFG, arcColorFor } from "./timer/config";
import { useBackdate } from "./timer/useBackdate";
import { useTodaySessions } from "./timer/useTodaySessions";
import { TimerRing } from "./timer/TimerRing";
import { NextSleepSuggestions } from "./timer/NextSleepSuggestions";
import { TimerDisplay } from "./timer/TimerDisplay";
import { TimerActions } from "./timer/TimerActions";
import { AdvancedControls } from "./timer/AdvancedControls";
import { BackdateStartChips } from "./timer/BackdateStartChips";
import { EnvironmentSection } from "./timer/EnvironmentSection";
import { SleepNotes } from "./timer/SleepNotes";

export function SleepTimer() {
  const {
    isRunning, elapsed, sleepType,
    notes, roomTemp, weatherCondition, sleepSackType, sleepSackTog,
    setSleepType, setNotes, setRoomTemp, setWeatherCondition,
    setSleepSackType, setSleepSackTog, handleStart, handleStop,
  } = useSleepTimer();

  const { activeBaby } = useBaby();
  const { elapsedMinutes, status, range, minutesUntilNextNap, isLoading: wwLoading } = useWakeWindow();
  const { data: ai } = useAISuggestions();
  const todaySessions = useTodaySessions(activeBaby?.id);

  const cfg = TCFG[sleepType];
  const arcColor = arcColorFor(status);

  const [envOpen, setEnvOpen] = useState(false);
  const [ctrlOpen, setCtrlOpen] = useState(false);
  const [reviewId, setReviewId] = useState<string | null>(null);
  const [reviewType, setReviewType] = useState<"NAP" | "NIGHT_SLEEP">("NAP");
  const [reviewOpen, setReviewOpen] = useState(false);
  const backdate = useBackdate();

  async function onPress() {
    if (isRunning) {
      const r = await handleStop();
      if (r) {
        setReviewId(r.endedSessionId);
        setReviewType(r.sleepType);
        setReviewOpen(true);
      }
      return;
    }
    await handleStart(backdate.resolveStartIso());
    backdate.reset();
  }

  const envData: EnvironmentData = {
    room_temp_celsius: roomTemp,
    weather_condition: weatherCondition,
    sleep_sack_type: sleepSackType,
    sleep_sack_tog: sleepSackTog,
    clothing_description: null,
  };

  function onEnvChange(d: EnvironmentData) {
    setRoomTemp(d.room_temp_celsius);
    setWeatherCondition(d.weather_condition);
    setSleepSackType(d.sleep_sack_type);
    setSleepSackTog(d.sleep_sack_tog);
  }

  return (
    <div className="flex flex-col items-center gap-4 select-none">
      {/* ════ Orbital Ring: arcs + dots, window bubbles, center button ═════ */}
      <div className="relative mx-auto" style={{ width: SZ, height: SZ }}>
        <TimerRing
          isRunning={isRunning}
          elapsedMinutes={elapsedMinutes}
          maxMinutes={range.maxMinutes}
          arcColor={arcColor}
          cfg={cfg}
          todaySessions={todaySessions}
        />
        <NextSleepSuggestions ai={ai} wwLoading={wwLoading} minutesUntilNextNap={minutesUntilNextNap} />
        <TimerDisplay
          isRunning={isRunning}
          elapsed={elapsed}
          sleepType={sleepType}
          wwLoading={wwLoading}
          minutesUntilNextNap={minutesUntilNextNap}
          aiKind={ai?.kind}
          arcColor={arcColor}
          startLabel={backdate.startLabel}
          onPress={onPress}
        />
      </div>

      {/* ════ Controls strip ══════════════════════════════════════════════ */}
      <TimerActions
        sleepType={sleepType}
        isRunning={isRunning}
        onSleepTypeChange={setSleepType}
        advancedOpen={ctrlOpen}
        onToggleAdvanced={() => setCtrlOpen(!ctrlOpen)}
      />

      {/* ════ Advanced controls (back-date + environment) ═════════════════ */}
      <AdvancedControls open={ctrlOpen && !isRunning}>
        <BackdateStartChips
          offset={backdate.offset}
          useCustom={backdate.useCustom}
          customTime={backdate.customTime}
          color={cfg.color}
          onSelectOffset={backdate.selectOffset}
          onSelectCustom={backdate.selectCustom}
          onCustomTimeChange={backdate.setCustomTime}
        />
        <EnvironmentSection
          open={envOpen}
          onToggle={() => setEnvOpen(!envOpen)}
          value={envData}
          onChange={onEnvChange}
        />
      </AdvancedControls>

      <SleepNotes visible={isRunning} notes={notes} onChange={setNotes} />

      <PostSleepReview
        sessionId={reviewId}
        sleepType={reviewType}
        open={reviewOpen}
        onClose={() => setReviewOpen(false)}
      />
    </div>
  );
}
