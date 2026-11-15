import { useEffect } from "react";
import {
  useWatch,
  type Control,
  type FieldValues,
  type Path,
  type UseFormClearErrors,
} from "react-hook-form";
import { END_BEFORE_START_MESSAGE, isEndBeforeStart } from "@/lib/validation/timeRange";

/** Form field names of a start/end date + time range (dates YYYY-MM-DD, times HH:MM). */
export interface TimeRangeNames<T extends FieldValues> {
  startDate: Path<T>;
  startTime: Path<T>;
  endDate: Path<T>;
  endTime: Path<T>;
}

/** Local instant for a date + time pair, or null while either is empty. */
function toLocal(date: unknown, time: unknown): string | null {
  return date && time ? `${date}T${time}:00` : null;
}

/**
 * Keeps the end-before-start error on `names.endTime` in sync with the range:
 * any change to one of the 4 fields sets it when end < start and clears it
 * otherwise. Only the range error is cleared; other errors on the field stay.
 * RHF's `control` exposes `setError` but not `clearErrors`, hence the option.
 */
export function useTimeRangeValidation<T extends FieldValues>(
  control: Control<T>,
  names: TimeRangeNames<T>,
  { clearErrors, enabled = true }: { clearErrors: UseFormClearErrors<T>; enabled?: boolean }
) {
  const { startDate, startTime, endDate, endTime } = names;
  const [sd, st, ed, et] = useWatch({ control, name: [startDate, startTime, endDate, endTime] });

  useEffect(() => {
    if (!enabled) return;
    const start = toLocal(sd, st);
    const end = toLocal(ed, et);
    const invalid = !!start && !!end && isEndBeforeStart(start, end);
    const current = control.getFieldState(endTime).error;
    if (invalid) {
      if (current?.message !== END_BEFORE_START_MESSAGE) {
        control.setError(endTime, { type: "validate", message: END_BEFORE_START_MESSAGE });
      }
    } else if (current?.message === END_BEFORE_START_MESSAGE) {
      clearErrors(endTime);
    }
  }, [sd, st, ed, et, enabled, control, endTime, clearErrors]);
}
