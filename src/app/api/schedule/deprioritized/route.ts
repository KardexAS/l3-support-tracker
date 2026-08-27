import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { addWeeks, startOfWeek } from "date-fns";
import { canManageSchedule } from "@/lib/auth-guard";

export const runtime = "nodejs";

// GET /api/schedule/deprioritized?startDate=YYYY-MM-DD&weeks=N
// Returns { userIds: string[] } — engineers who have self-assigned within
// the specified rotation-generation window and would be placed last in the
// round-robin order. Used by the Generate Rotation dialog to live-preview
// which engineers will be de-prioritized based on the current form inputs.
export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!canManageSchedule(session)) {
    return NextResponse.json(
      { error: "Forbidden: insufficient permissions" },
      { status: 403 }
    );
  }

  const { searchParams } = new URL(request.url);
  const startDateStr = searchParams.get("startDate");
  const weeksStr = searchParams.get("weeks");

  if (!startDateStr || !weeksStr) {
    return NextResponse.json(
      { error: "startDate and weeks are required" },
      { status: 400 }
    );
  }

  const weeks = parseInt(weeksStr, 10);
  if (!Number.isFinite(weeks) || weeks < 1 || weeks > 52) {
    return NextResponse.json(
      { error: "weeks must be between 1 and 52" },
      { status: 400 }
    );
  }

  // Normalize to the Monday of the requested start week, consistent with
  // how rotation generation itself computes the window
  // (see src/app/api/schedule/route.ts handleGenerateRotation).
  const baseDate = startOfWeek(new Date(startDateStr + "T12:00:00"), {
    weekStartsOn: 1,
  });
  const windowEnd = addWeeks(baseDate, weeks);

  const selfAssigned = await prisma.schedule.findMany({
    where: {
      isSelfAssigned: true,
      weekStart: { gte: baseDate, lt: windowEnd },
    },
    select: { userId: true },
  });

  const userIds = [...new Set(selfAssigned.map((s) => s.userId))];

  return NextResponse.json({ userIds });
}
