import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { buildScheduleIcs } from "@/lib/ics";

export const runtime = "nodejs";

/**
 * GET /api/schedule/calendar/download
 *
 * Returns the on-call schedule as a downloadable .ics file for import into
 * Outlook (or any calendar app). Authenticated via the user session.
 *
 * Range: past 4 weeks + all future schedules.
 */
export async function GET() {
  const { error } = await requireApiAuth();
  if (error) return error;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  fourWeeksAgo.setHours(0, 0, 0, 0);

  const schedules = await prisma.schedule.findMany({
    where: {
      weekStart: { gte: fourWeeksAgo },
    },
    include: {
      user: { select: { fullName: true, name: true } },
      dayCoverages: {
        include: {
          user: { select: { fullName: true, name: true } },
        },
      },
    },
    orderBy: { weekStart: "asc" },
  });

  const icsContent = buildScheduleIcs(schedules);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="oncall-schedule.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}
