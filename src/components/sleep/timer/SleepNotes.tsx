"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";

interface SleepNotesProps {
  /** Notes are only shown while a session is running. */
  visible: boolean;
  notes: string;
  onChange: (notes: string) => void;
}

/** Quick notes textarea for the running session. */
export function SleepNotes({ visible, notes, onChange }: SleepNotesProps) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          exit={{ opacity: 0, height: 0 }}
          className="w-full max-w-[300px] overflow-hidden"
        >
          <label htmlFor="sleep-notes" className="sr-only">
            Notas sobre o sono
          </label>
          <Textarea
            id="sleep-notes"
            placeholder="Notas rápidas…"
            value={notes}
            onChange={(e) => onChange(e.target.value)}
            className="rounded-2xl resize-none text-sm border-white/10 bg-white/5 placeholder:text-white/20"
            rows={2}
          />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
