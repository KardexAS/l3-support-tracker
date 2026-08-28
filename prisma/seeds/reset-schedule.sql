-- ============================================================================
-- DESTRUCTIVE: Full schedule-domain reset for LOCAL testing.
--
-- Run:
--   psql "$DATABASE_URL" -f prisma/seeds/reset-schedule.sql
--
-- Wipes all schedule activity while preserving users, auth sessions,
-- compensation rules, holidays, Slack config, and other setup data.
--
-- Deletes from (in FK-safe order):
--   * DayCoverage       (FK -> Schedule, SwapPost)
--   * CallLog           (FK -> Schedule)
--   * SwapPost
--   * PtoCompensation
--   * Schedule
--
-- Leaves intact:
--   User, Account, Session, CompensationRule, Holiday, SlackConfig,
--   Notification, InviteCode
--
-- LOCAL DEV ONLY. Do NOT run against production.
-- ============================================================================

BEGIN;

DELETE FROM "DayCoverage";
DELETE FROM "CallLog";
DELETE FROM "SwapPost";
DELETE FROM "PtoCompensation";
DELETE FROM "Schedule";

COMMIT;
