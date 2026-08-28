/**
 * Shared ICS (iCalendar) builder for the on-call schedule.
 *
 * Produces a VCALENDAR document containing one all-day VEVENT per day for
 * each Schedule, honoring per-day coverage overrides (DayCoverage) so the
 * ICS reflects who is actually on-call each day (not just the raw weekly
 * assignment).
 */

type UserRef = { fullName: string | null; name: string | null };

export interface ScheduleForIcs {
  id: string;
  weekStart: Date;
  user: UserRef;
  dayCoverages: {
    date: Date;
    user: UserRef;
  }[];
}

/**
 * Build the complete ICS document as a string.
 */
export function buildScheduleIcs(schedules: ScheduleForIcs[]): string {
  const events: string[] = [];

  for (const schedule of schedules) {
    const assigneeName =
      schedule.user.fullName || schedule.user.name || "Unknown";
    const weekStartDate = new Date(schedule.weekStart);

    const coverageMap = new Map<string, string>();
    for (const coverage of schedule.dayCoverages) {
      const dateKey = formatDateKey(new Date(coverage.date));
      const coverName =
        coverage.user.fullName || coverage.user.name || "Unknown";
      coverageMap.set(dateKey, coverName);
    }

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(dayDate.getDate() + dayOffset);

      const dateKey = formatDateKey(dayDate);
      const onCallName = coverageMap.get(dateKey) || assigneeName;

      const dtStart = formatIcsDate(dayDate);
      const nextDay = new Date(dayDate);
      nextDay.setDate(nextDay.getDate() + 1);
      const dtEnd = formatIcsDate(nextDay);

      const uid = `${schedule.id}-${dateKey}@oncall-tracker`;
      const weekLabel = weekStartDate.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      });

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${dtStart}`,
          `DTEND;VALUE=DATE:${dtEnd}`,
          `SUMMARY:On-Call: ${escapeIcsText(onCallName)}`,
          `DESCRIPTION:On-call rotation week of ${weekLabel}`,
          "TRANSP:TRANSPARENT",
          "END:VEVENT",
        ].join("\r\n")
      );
    }
  }

  return [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//On-Call Tracker//EN",
    "X-WR-CALNAME:On-Call Schedule",
    "X-WR-TIMEZONE:America/New_York",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    ...events,
    "END:VCALENDAR",
  ].join("\r\n");
}

/** Format a Date to YYYYMMDD for ICS DATE values. */
export function formatIcsDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}${m}${d}`;
}

/** Format a Date to YYYY-MM-DD for keying day coverages. */
export function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Escape text for ICS properties (commas, semicolons, backslashes, newlines). */
export function escapeIcsText(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
