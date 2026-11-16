"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { differenceInWeeks } from "date-fns";
import { formatInTimeZone, fromZonedTime } from "date-fns-tz";
import { createClient } from "@/lib/supabase/client";
import { getSleepSessions } from "@/lib/supabase/queries/sleep";
import { allocateSessionToLocalDays, lastDayKeysInTimeZone } from "@/lib/sleep/sessionDayAllocation";
import { getAgeSchedule } from "@/lib/sleep/schedules";
import { useBaby } from "@/components/providers/BabyProvider";
import { useNow } from "@/hooks/useNow";
import { useCanWrite } from "@/hooks/useCanWrite";
import { ViewOnlyNotice } from "@/components/family/ViewOnlyNotice";
import { WeekStrip, WEEK_STRIP_DAYS } from "@/components/history/WeekStrip";
import { DaySummaryCard } from "@/components/history/DaySummaryCard";
import { SleepCard } from "@/components/sleep/SleepCard";
import { SleepForm } from "@/components/sleep/SleepForm";
import { PageTitle } from "@/components/ui/page-title";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Chip } from "@/components/ui/chip";
import { Skeleton } from "@/components/ui/skeleton";
import { IconPlus } from "@/components/brand/icons";
import type { SleepSession } from "@/types";
import { withProvisionalEnd } from "@/lib/sleep/provisional";
import { parseLocalDate } from "@/lib/dates/localDate";

type Filter = "todos" | "sonecas" | "noite";

const FILTERS: { value: Filter; label: string; type?: SleepSession["type"] }[] = [
  { value: "todos", label: "Todos" },
  { value: "sonecas", label: "Sonecas", type: "NAP" },
  { value: "noite", label: "Noite", type: "NIGHT_SLEEP" },
];

const EMPTY_FILTER: Record<Exclude<Filter, "todos">, string> = {
  sonecas: "Nenhuma soneca neste dia.",
  noite: "Nenhuma noite neste dia.",
};

/** One value of the query string: shown at once when picked, then read back from the URL. */
function useUrlParam(name: string): [string | null, (value: string | null) => void] {
  const param = useSearchParams().get(name);
  const [picked, setPicked] = useState<{ param: string | null; value: string | null } | null>(null);
  const value = picked && picked.param === param ? picked.value : param;

  function set(next: string | null) {
    setPicked({ param, value: next });
    const url = new URL(window.location.href);
    if (next === null) url.searchParams.delete(name);
    else url.searchParams.set(name, next);
    window.history.replaceState(null, "", `${url.pathname}${url.search}`);
  }

  return [value, set];
}

function timeZoneNow(): string {
  return Intl.DateTimeFormat().resolvedOptions().timeZone;
}

/** The chosen day (`?dia=AAAA-MM-DD`, today when absent or out of the strip) and the filter (`?tipo=`). */
function DayView() {
  const { activeBaby, isLoading: babyLoading } = useBaby();
  const { canWrite, isLoading: roleLoading } = useCanWrite();
  const supabase = createClient();
  const timeZone = timeZoneNow();
  const now = useNow(60_000);
  const [diaParam, setDia] = useUrlParam("dia");
  const [tipoParam, setTipo] = useUrlParam("tipo");
  const [showForm, setShowForm] = useState(false);
  const [editSession, setEditSession] = useState<SleepSession | null>(null);

  const keys = lastDayKeysInTimeZone(WEEK_STRIP_DAYS, timeZone, new Date());
  const todayKey = keys[keys.length - 1];
  const dayKey = diaParam && keys.includes(diaParam) ? diaParam : todayKey;
  const filter = FILTERS.find((f) => f.value === tipoParam) ?? FILTERS[0];

  // Day bounds in the device timezone (23 or 25 hours on a DST change).
  const { dayStart, dayEnd, fetchFrom } = useMemo(() => {
    const start = fromZonedTime(`${dayKey}T00:00:00`, timeZone);
    const at = (deltaHours: number) =>
      formatInTimeZone(new Date(start.getTime() + deltaHours * 3_600_000), timeZone, "yyyy-MM-dd");
    return {
      dayStart: start,
      dayEnd: fromZonedTime(`${at(36)}T00:00:00`, timeZone),
      fetchFrom: fromZonedTime(`${at(-12)}T00:00:00`, timeZone),
    };
  }, [dayKey, timeZone]);

  // From the day before, so a night that began then is included.
  const { data: fetched = [], isLoading, isError, refetch } = useQuery({
    queryKey: ["sleep-sessions", activeBaby?.id, "day", dayKey],
    queryFn: async (): Promise<SleepSession[]> => {
      if (!activeBaby) return [];
      const { data, error } = await getSleepSessions(
        supabase,
        activeBaby.id,
        fetchFrom,
        new Date(dayEnd.getTime() - 1)
      );
      if (error) throw error;
      return (data ?? []) as SleepSession[];
    },
    enabled: !!activeBaby,
  });

  // The sleeps that touch the day, earliest first.
  const sessions = useMemo(() => {
    const from = dayStart.getTime();
    const to = dayEnd.getTime();
    return fetched
      .filter((s) => {
        const start = Date.parse(s.start_time);
        const end = s.end_time ? Date.parse(s.end_time) : (now ?? start);
        return start < to && end > from;
      })
      .sort((a, b) => Date.parse(a.start_time) - Date.parse(b.start_time));
  }, [fetched, dayStart, dayEnd, now]);

  // A sleep still running counts up to now (the allocation skips open sessions).
  const totalMinutes = useMemo(
    () =>
      sessions
        .map((s) => (now === null ? s : withProvisionalEnd(s, now)))
        .flatMap((s) => allocateSessionToLocalDays(s, timeZone))
        .filter((a) => a.dayKey === dayKey)
        .reduce((sum, a) => sum + a.napMinutes + a.nightMinutes, 0),
    [sessions, timeZone, dayKey, now]
  );

  const targetHours = activeBaby
    ? getAgeSchedule(differenceInWeeks(new Date(), parseLocalDate(activeBaby.birth_date))).totalSleepHours
    : 0;

  const listed = filter.type ? sessions.filter((s) => s.type === filter.type) : sessions;

  function openForm(session: SleepSession | null) {
    setEditSession(session);
    setShowForm(true);
  }

  return (
    <>
      <WeekStrip
        selected={dayStart}
        timeZone={timeZone}
        onSelect={(d) => {
          const k = formatInTimeZone(d, timeZone, "yyyy-MM-dd");
          setDia(k === todayKey ? null : k);
        }}
      />

      <div className="flex flex-col gap-3">
        {!roleLoading && !canWrite && <ViewOnlyNotice />}
        {babyLoading || isLoading ? (
          <DayFallback />
        ) : isError ? (
          <Card role="alert" className="gap-2 px-[18px]">
            <p className="font-sans text-[15px] font-semibold text-sn-tx">Não foi possível carregar este dia.</p>
            <Button variant="secondary" size="sm" className="self-start" onClick={() => void refetch()}>
              Tentar de novo
            </Button>
          </Card>
        ) : (
          <>
            <DaySummaryCard
              totalMinutes={totalMinutes}
              isToday={dayKey === todayKey}
              targetHours={targetHours}
              sessions={sessions}
              dayStart={dayStart}
              dayEnd={dayEnd}
              now={now}
            />

            {sessions.length > 0 && (
              <>
                <div className="flex flex-wrap gap-2" role="group" aria-label="Filtrar por tipo">
                  {FILTERS.map((f) => (
                    <Chip
                      key={f.value}
                      selected={f.value === filter.value}
                      onClick={() => setTipo(f.value === "todos" ? null : f.value)}
                    >
                      {f.label}
                    </Chip>
                  ))}
                </div>

                <Card className="gap-0 px-[18px] py-2">
                  {listed.length === 0 ? (
                    <p className="py-2 font-sans text-[15px] font-semibold text-sn-mu">
                      {EMPTY_FILTER[filter.value as Exclude<Filter, "todos">]}
                    </p>
                  ) : (
                    <ul aria-label="Sonos do dia" className="divide-y divide-sn-bd">
                      {listed.map((s) => (
                        <li key={s.id}>
                          <SleepCard session={s} sex={activeBaby?.sex} onEdit={canWrite ? openForm : undefined} />
                        </li>
                      ))}
                    </ul>
                  )}
                </Card>
              </>
            )}
          </>
        )}

        {canWrite && (
          <Button variant="secondary" className="w-full" onClick={() => openForm(null)}>
            <IconPlus size={20} />
            Adicionar sono
          </Button>
        )}
      </div>

      {canWrite && (
        <SleepForm
          open={showForm}
          onClose={() => {
            setShowForm(false);
            setEditSession(null);
          }}
          session={editSession}
          day={dayKey === todayKey ? undefined : dayKey}
        />
      )}
    </>
  );
}

function DayFallback() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3">
      <Skeleton className="h-[136px] w-full rounded-[24px]" />
      <Skeleton className="h-[180px] w-full rounded-[24px]" />
    </div>
  );
}

export default function HistoryPage() {
  return (
    <div>
      <PageTitle>Registro</PageTitle>
      <Suspense
        fallback={
          <div aria-busy="true" className="flex flex-col gap-3">
            <Skeleton className="h-[62px] w-full rounded-2xl" />
            <DayFallback />
          </div>
        }
      >
        <DayView />
      </Suspense>
    </div>
  );
}
