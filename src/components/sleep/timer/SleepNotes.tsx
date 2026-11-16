"use client";

import { Textarea } from "@/components/ui/textarea";

interface SleepNotesProps {
  notes: string;
  onChange: (notes: string) => void;
}

/** Quick notes textarea for the running session ("Anotar algo"). */
export function SleepNotes({ notes, onChange }: SleepNotesProps) {
  return (
    <div className="w-full">
      <label htmlFor="sleep-notes" className="sr-only">
        Notas sobre o sono
      </label>
      <Textarea
        id="sleep-notes"
        placeholder="Como está o sono, algo que a família precise saber"
        value={notes}
        onChange={(e) => onChange(e.target.value)}
        className="min-h-24 resize-none rounded-[18px] border-sn-bd bg-sn-s2 text-base text-sn-tx placeholder:text-sn-mu"
        rows={3}
      />
    </div>
  );
}
