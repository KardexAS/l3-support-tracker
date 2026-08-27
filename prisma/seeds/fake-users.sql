-- ============================================================================
-- Idempotent seed of 8 fake engineer users for LOCAL schedule testing.
--
-- Run:
--   psql "$DATABASE_URL" -f prisma/seeds/fake-users.sql
--
-- Creates:
--   * 8 User rows (all ENGINEER role, onboarded, active, verified)
--   * 8 Account rows (fake GitHub OAuth stubs so the users look "linked")
--   * 8 Session rows (30-day expiry) for cookie-swap sign-in bypass
--
-- LOCAL DEV ONLY. Do NOT run against production.
-- ============================================================================

BEGIN;

-- ---------------- Users ----------------
INSERT INTO "User" (
  id, name, "fullName", email, "emailVerified", image,
  roles, "preferredContact", "encryptedPhone",
  verified, onboarded, "isActive",
  "createdAt", "updatedAt"
) VALUES
  ('fake-user-01', 'alice-dev',    'Alice Anderson', 'alice@example.test',  NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-02', 'bob-eng',      'Bob Brooks',     'bob@example.test',    NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-03', 'carol-code',   'Carol Chen',     'carol@example.test',  NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-04', 'dave-ops',     'Dave Diaz',      'dave@example.test',   NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-05', 'eve-sre',      'Eve Evans',      'eve@example.test',    NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-06', 'frank-l3',     'Frank Foster',   'frank@example.test',  NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-07', 'grace-oncall', 'Grace Green',    'grace@example.test',  NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW()),
  ('fake-user-08', 'henry-l3',     'Henry Hughes',   'henry@example.test',  NULL, NULL,
    ARRAY['ENGINEER']::"Role"[], 'SLACK'::"ContactMethod", NULL, true, true, true, NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- ---------------- Fake OAuth account stubs ----------------
-- provider = 'github' matches the configured provider in src/lib/auth.ts.
-- providerAccountId is a synthetic string; never collides with real GitHub IDs.
INSERT INTO "Account" (
  id, "userId", type, provider, "providerAccountId",
  refresh_token, access_token, expires_at, token_type, scope, id_token, session_state
) VALUES
  ('fake-acct-01', 'fake-user-01', 'oauth', 'github', 'fake-gh-1000001', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-02', 'fake-user-02', 'oauth', 'github', 'fake-gh-1000002', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-03', 'fake-user-03', 'oauth', 'github', 'fake-gh-1000003', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-04', 'fake-user-04', 'oauth', 'github', 'fake-gh-1000004', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-05', 'fake-user-05', 'oauth', 'github', 'fake-gh-1000005', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-06', 'fake-user-06', 'oauth', 'github', 'fake-gh-1000006', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-07', 'fake-user-07', 'oauth', 'github', 'fake-gh-1000007', NULL, NULL, NULL, NULL, NULL, NULL, NULL),
  ('fake-acct-08', 'fake-user-08', 'oauth', 'github', 'fake-gh-1000008', NULL, NULL, NULL, NULL, NULL, NULL, NULL)
ON CONFLICT (provider, "providerAccountId") DO NOTHING;

-- ---------------- Long-lived sessions (30 days) ----------------
-- Paste one of these sessionToken values into your browser's
-- `authjs.session-token` cookie on http://localhost:3000 to sign in as that user.
INSERT INTO "Session" (id, "sessionToken", "userId", expires) VALUES
  ('fake-sess-01', 'fake-session-token-alice-01', 'fake-user-01', NOW() + INTERVAL '30 days'),
  ('fake-sess-02', 'fake-session-token-bob-02',   'fake-user-02', NOW() + INTERVAL '30 days'),
  ('fake-sess-03', 'fake-session-token-carol-03', 'fake-user-03', NOW() + INTERVAL '30 days'),
  ('fake-sess-04', 'fake-session-token-dave-04',  'fake-user-04', NOW() + INTERVAL '30 days'),
  ('fake-sess-05', 'fake-session-token-eve-05',   'fake-user-05', NOW() + INTERVAL '30 days'),
  ('fake-sess-06', 'fake-session-token-frank-06', 'fake-user-06', NOW() + INTERVAL '30 days'),
  ('fake-sess-07', 'fake-session-token-grace-07', 'fake-user-07', NOW() + INTERVAL '30 days'),
  ('fake-sess-08', 'fake-session-token-henry-08', 'fake-user-08', NOW() + INTERVAL '30 days')
ON CONFLICT ("sessionToken") DO NOTHING;

COMMIT;

-- ============================================================================
-- HOW TO "SIGN IN" AS A FAKE USER (local dev only)
-- ============================================================================
-- 1. Start the dev server (http://localhost:3000).
-- 2. Open DevTools -> Application -> Cookies -> http://localhost:3000.
-- 3. Create or replace a cookie named:  authjs.session-token
--    Value: one of the sessionToken strings above, e.g.
--      fake-session-token-alice-01
--    Path: /
--    HttpOnly: (either is fine when set manually)
--    Expires/Max-Age: any future date
-- 4. Refresh the page. You should be signed in as that user.
--
-- To switch users:  replace the cookie value with a different sessionToken.
-- To sign out:      delete the cookie (or use the app's Sign Out button).
--
-- NOTE: In production the cookie is named `__Secure-authjs.session-token`
-- and requires HTTPS. This bypass is intended for LOCAL DEV ONLY.
-- ============================================================================

-- ---------------- CLEANUP (uncomment to remove all fake data) ----------------
-- BEGIN;
-- DELETE FROM "Session"  WHERE id LIKE 'fake-sess-%';
-- DELETE FROM "Account"  WHERE id LIKE 'fake-acct-%';
-- DELETE FROM "Schedule" WHERE "userId" LIKE 'fake-user-%';
-- DELETE FROM "CallLog"  WHERE "userId" LIKE 'fake-user-%';
-- DELETE FROM "User"     WHERE id LIKE 'fake-user-%';
-- COMMIT;
