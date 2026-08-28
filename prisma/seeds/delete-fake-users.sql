-- ============================================================================
-- DESTRUCTIVE: Surgical removal of the seeded fake users (fake-user-%).
--
-- Run:
--   psql "$DATABASE_URL" -f prisma/seeds/delete-fake-users.sql
--
-- Deletes, in FK-safe order, all rows created directly or indirectly by the
-- fake users seeded via prisma/seeds/fake-users.sql. Cascading FKs handle
-- Account, Session, and Notification automatically.
--
-- Deletes from (in FK-safe order):
--   * DayCoverage       (FK -> User.userId, RESTRICT)
--   * CallLog           (FK -> User.userId, RESTRICT)
--   * PtoCompensation   (FK -> User.userId, RESTRICT)
--   * Schedule          (FK -> User.userId, RESTRICT)
--   * SwapPost          (FK -> User.posterId / claimerId, RESTRICT)
--   * InviteCode        (FK -> User.createdById, RESTRICT)
--   * User              (cascades Account, Session, Notification)
--
-- Leaves real (non-fake) users untouched.
--
-- LOCAL DEV ONLY. Do NOT run against production.
-- ============================================================================

BEGIN;

DELETE FROM "DayCoverage"     WHERE "userId"      LIKE 'fake-user-%';
DELETE FROM "CallLog"         WHERE "userId"      LIKE 'fake-user-%';
DELETE FROM "PtoCompensation" WHERE "userId"      LIKE 'fake-user-%';
DELETE FROM "Schedule"        WHERE "userId"      LIKE 'fake-user-%';
DELETE FROM "SwapPost"        WHERE "posterId"    LIKE 'fake-user-%'
                                 OR "claimerId"   LIKE 'fake-user-%';
DELETE FROM "InviteCode"      WHERE "createdById" LIKE 'fake-user-%';

-- Account, Session, and Notification cascade via onDelete: Cascade.
DELETE FROM "User"            WHERE id            LIKE 'fake-user-%';

COMMIT;
