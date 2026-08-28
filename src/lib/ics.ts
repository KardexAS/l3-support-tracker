/**
 * Shared ICS (iCalendar) builder for the on-call schedule.
 *
 * Produces a VCALENDAR document containing one all-day VEVENT per day for
 * each Schedule, honoring per-day coverage overrides (DayCoverage) so the
 * ICS reflects who is actually on-call each day (not just the raw weekly
 * assignment).
 */

type ContactMethod = "SMS" | "SLACK" | "TEAMS" | "CALL";

type UserRef = {
  fullName: string | null;
  name: string | null;
  preferredContact: ContactMethod;
  /** Decrypted phone number (or null if not on file). */
  phoneNumber: string | null;
};

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
    const weekStartDate = new Date(schedule.weekStart);

    const coverageMap = new Map<string, UserRef>();
    for (const coverage of schedule.dayCoverages) {
      const dateKey = formatDateKey(new Date(coverage.date));
      coverageMap.set(dateKey, coverage.user);
    }

    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayDate = new Date(weekStartDate);
      dayDate.setDate(dayDate.getDate() + dayOffset);

      const dateKey = formatDateKey(dayDate);
      const onCallUser = coverageMap.get(dateKey) || schedule.user;
      const onCallName =
        onCallUser.fullName || onCallUser.name || "Unknown";

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

      const contactLine = formatContactLine(onCallUser);
      const description = `On-call rotation week of ${weekLabel}\\n${contactLine}`;

      events.push(
        [
          "BEGIN:VEVENT",
          `UID:${uid}`,
          `DTSTART;VALUE=DATE:${dtStart}`,
          `DTEND;VALUE=DATE:${dtEnd}`,
          `SUMMARY:On-Call: ${escapeIcsText(onCallName)}`,
          `DESCRIPTION:${escapeIcsText(description, { preserveEscapedNewlines: true })}`,
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

/**
 * Build the human-readable "contact" line included in each event's DESCRIPTION.
 *
 * Examples:
 *   - "Please contact by: Text - 513-515-0842"
 *   - "Please contact by: Call - phone not on file"
 *   - "Please contact by: Slack"
 *   - "Please contact by: Teams"
 */
function formatContactLine(user: UserRef): string {
  const phone = user.phoneNumber
    ? formatPhoneForDisplay(user.phoneNumber)
    : "phone not on file";
  switch (user.preferredContact) {
    case "SMS":
      return `Please contact by: Text - ${phone}`;
    case "CALL":
      return `Please contact by: Call - ${phone}`;
    case "SLACK":
      return "Please contact by: Slack";
    case "TEAMS":
      return "Please contact by: Teams";
    default:
      return "Contact method not specified";
  }
}

/**
 * Format a stored phone number for human display.
 *
 * Strips non-digits, drops a US country-code leading "1", and renders as
 * XXX-XXX-XXXX when 10 digits remain. Falls back to the raw digit string
 * for anything unexpected so we never crash on odd input.
 */
export function formatPhoneForDisplay(raw: string): string {
  let digits = raw.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) {
    digits = digits.slice(1);
  }
  if (digits.length === 10) {
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  return digits || raw;
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

/**
 * Escape text for ICS properties (commas, semicolons, backslashes, newlines).
 *
 * When `preserveEscapedNewlines` is true, existing "\\n" sequences in the input
 * are preserved as ICS line breaks instead of being double-escaped (used for
 * DESCRIPTION content that pre-embeds newlines).
 */
export function escapeIcsText(
  text: string,
  opts: { preserveEscapedNewlines?: boolean } = {}
): string {
  if (opts.preserveEscapedNewlines) {
    // Split on the literal two-character sequence "\n", escape each segment
    // independently, then rejoin with an ICS line break.
    return text
      .split("\\n")
      .map((segment) =>
        segment
          .replace(/\\/g, "\\\\")
          .replace(/;/g, "\\;")
          .replace(/,/g, "\\,")
          .replace(/\n/g, "\\n")
      )
      .join("\\n");
  }
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}
