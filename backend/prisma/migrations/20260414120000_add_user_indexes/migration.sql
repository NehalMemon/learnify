-- Add user filter indexes
CREATE INDEX IF NOT EXISTS "users_role_idx" ON "users" ("role");
