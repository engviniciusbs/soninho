"use client";

import { useFormState, type Control, type FieldValues } from "react-hook-form";
import { Input } from "@/components/ui/input";
import type { TimeRangeNames } from "./useTimeRangeValidation";

interface DateTimeRangeFieldsProps<T extends FieldValues> {
  control: Control<T>;
  names: TimeRangeNames<T>;
  /** Labels of the start row (defaults: "Data início" / "Hora início"). */
  startLabels?: { date: string; time: string };
  /** Renders the end row (default true). */
  showEnd?: boolean;
}

const START_LABELS = { date: "Data início", time: "Hora início" };

/** Start and end date/time inputs; the end time shows the range error. */
export function DateTimeRangeFields<T extends FieldValues>({
  control,
  names,
  startLabels = START_LABELS,
  showEnd = true,
}: DateTimeRangeFieldsProps<T>) {
  const formState = useFormState({ control, name: names.endTime });
  const endError = control.getFieldState(names.endTime, formState).error;

  return (
    <>
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <label htmlFor={names.startDate} className="text-xs text-muted-foreground">
            {startLabels.date}
          </label>
          <Input id={names.startDate} type="date" {...control.register(names.startDate)} className="rounded-xl" autoComplete="off" />
        </div>
        <div className="space-y-1">
          <label htmlFor={names.startTime} className="text-xs text-muted-foreground">
            {startLabels.time}
          </label>
          <Input id={names.startTime} type="time" {...control.register(names.startTime)} className="rounded-xl" autoComplete="off" />
        </div>
      </div>

      {showEnd && (
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-1">
            <label htmlFor={names.endDate} className="text-xs text-muted-foreground">
              Data fim
            </label>
            <Input id={names.endDate} type="date" {...control.register(names.endDate)} className="rounded-xl" autoComplete="off" />
          </div>
          <div className="space-y-1">
            <label htmlFor={names.endTime} className="text-xs text-muted-foreground">
              Hora fim
            </label>
            <Input
              id={names.endTime}
              type="time"
              {...control.register(names.endTime)}
              aria-invalid={!!endError}
              className="rounded-xl"
              autoComplete="off"
            />
            {endError?.message && (
              <p role="alert" className="text-xs text-destructive">
                {endError.message}
              </p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
