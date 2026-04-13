import { create } from "zustand";
import { persist } from "zustand/middleware";

interface TimerState {
  isRunning: boolean;
  sessionId: string | null;
  startTime: string | null;
  sleepType: "NAP" | "NIGHT_SLEEP";
  notes: string;
  activeBabyId: string | null;
  // Environment data captured before starting
  roomTemp: number | null;
  weatherCondition: string | null;
  sleepSackType: string | null;
  sleepSackTog: number | null;
}

interface SleepStore extends TimerState {
  startTimer: (sessionId: string, startTime: string, type: "NAP" | "NIGHT_SLEEP", babyId: string) => void;
  stopTimer: () => void;
  setSleepType: (type: "NAP" | "NIGHT_SLEEP") => void;
  setNotes: (notes: string) => void;
  setActiveBabyId: (id: string | null) => void;
  setRoomTemp: (temp: number | null) => void;
  setWeatherCondition: (condition: string | null) => void;
  setSleepSackType: (type: string | null) => void;
  setSleepSackTog: (tog: number | null) => void;
  restoreFromSession: (sessionId: string, startTime: string, type: "NAP" | "NIGHT_SLEEP") => void;
}

export const useSleepStore = create<SleepStore>()(
  persist(
    (set) => ({
      isRunning: false,
      sessionId: null,
      startTime: null,
      sleepType: "NAP",
      notes: "",
      activeBabyId: null,
      roomTemp: null,
      weatherCondition: null,
      sleepSackType: null,
      sleepSackTog: null,

      startTimer: (sessionId, startTime, type, babyId) =>
        set({
          isRunning: true,
          sessionId,
          startTime,
          sleepType: type,
          activeBabyId: babyId,
        }),

      stopTimer: () =>
        set({
          isRunning: false,
          sessionId: null,
          startTime: null,
          notes: "",
          roomTemp: null,
          weatherCondition: null,
          sleepSackType: null,
          sleepSackTog: null,
        }),

      setSleepType: (type) => set({ sleepType: type }),
      setNotes: (notes) => set({ notes }),
      setActiveBabyId: (id) => set({ activeBabyId: id }),
      setRoomTemp: (temp) => set({ roomTemp: temp }),
      setWeatherCondition: (condition) => set({ weatherCondition: condition }),
      setSleepSackType: (type) => set({ sleepSackType: type }),
      setSleepSackTog: (tog) => set({ sleepSackTog: tog }),

      restoreFromSession: (sessionId, startTime, type) =>
        set({
          isRunning: true,
          sessionId,
          startTime,
          sleepType: type,
        }),
    }),
    {
      name: "soninho-timer",
    }
  )
);
