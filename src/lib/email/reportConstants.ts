export const REPORT_PERIOD_OPTIONS = [7, 14, 30] as const;
export type ReportPeriodDays = (typeof REPORT_PERIOD_OPTIONS)[number];

export function isValidReportPeriod(days: number): days is ReportPeriodDays {
  return (REPORT_PERIOD_OPTIONS as readonly number[]).includes(days);
}
