import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireApiAuth } from "@/lib/api-auth";
import { buildScheduleIcs, type ScheduleForIcs } from "@/lib/ics";
import { decrypt } from "@/lib/encryption";

export const runtime = "nodejs";

/**
 * GET /api/schedule/calendar/download
 *
 * Returns the on-call schedule as a downloadable .ics file for import into
 * Outlook (or any calendar app). Authenticated via the user session.
 *
 * Range: past 4 weeks + all future schedules.
 *
 * Each event's DESCRIPTION includes the on-call engineer's preferred contact
 * method and (if SMS/CALL) their phone number.
 */
export async function GET() {
  const { error } = await requireApiAuth();
  if (error) return error;

  const fourWeeksAgo = new Date();
  fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
  fourWeeksAgo.setHours(0, 0, 0, 0);

  const userSelect = {
    fullName: true,
    name: true,
    preferredContact: true,
    encryptedPhone: true,
  } as const;

  const schedules = await prisma.schedule.findMany({
    where: {
      weekStart: { gte: fourWeeksAgo },
    },
    include: {
      user: { select: userSelect },
      dayCoverages: {
        include: {
          user: { select: userSelect },
        },
      },
    },
    orderBy: { weekStart: "asc" },
  });

  const enriched: ScheduleForIcs[] = schedules.map((s) => ({
    id: s.id,
    weekStart: s.weekStart,
    user: shapeUser(s.user),
    dayCoverages: s.dayCoverages.map((dc) => ({
      date: dc.date,
      user: shapeUser(dc.user),
    })),
  }));

  const icsContent = buildScheduleIcs(enriched);

  return new NextResponse(icsContent, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": 'attachment; filename="oncall-schedule.ics"',
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
}

type RawUser = {
  fullName: string | null;
  name: string | null;
  preferredContact: "SMS" | "SLACK" | "TEAMS" | "CALL";
  encryptedPhone: string | null;
};

function shapeUser(user: RawUser) {
  let phoneNumber: string | null = null;
  if (user.encryptedPhone) {
    try {
      phoneNumber = decrypt(user.encryptedPhone);
    } catch {
      // If decryption fails (e.g. key rotation, corrupted data), treat as missing.
      phoneNumber = null;
    }
  }
  return {
    fullName: user.fullName,
    name: user.name,
    preferredContact: user.preferredContact,
    phoneNumber,
  };
}
