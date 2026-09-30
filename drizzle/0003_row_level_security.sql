-- Row-level security: the database itself keeps each company's data to that company.
--
-- Customer-facing code runs every statement as the restricted role lasan_grow_app with the
-- workspace pinned in the transaction setting app.org_id (lib/db tenantDb). That role owns no
-- tables and can't bypass RLS, so a query that forgets its org filter, or asks for another
-- company's id, sees and changes nothing. The privileged owner connection is kept for sign-in,
-- the platform console and migrations only.
--
-- The role is created without a password. In production it gets one out of band
-- (ALTER ROLE lasan_grow_app LOGIN PASSWORD '…') and the app connects with it as DATABASE_APP_URL.

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'lasan_grow_app') THEN
    CREATE ROLE lasan_grow_app NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
  END IF;
END $$;--> statement-breakpoint

-- The owner connection may switch to it (SET LOCAL ROLE), which is how local development and
-- any deployment without DATABASE_APP_URL still get RLS.
GRANT lasan_grow_app TO CURRENT_USER;--> statement-breakpoint

-- The workspace pinned for this transaction; NULL when none is, which matches no rows.
CREATE OR REPLACE FUNCTION public.app_current_org() RETURNS uuid
  LANGUAGE sql STABLE
  AS $$ SELECT nullif(current_setting('app.org_id', true), '')::uuid $$;--> statement-breakpoint

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM lasan_grow_app;--> statement-breakpoint
GRANT USAGE ON SCHEMA public TO lasan_grow_app;--> statement-breakpoint
GRANT EXECUTE ON FUNCTION public.app_current_org() TO lasan_grow_app;--> statement-breakpoint

-- Workspace data: full access, but only to the pinned workspace's rows.
GRANT SELECT, INSERT, UPDATE, DELETE ON users, companies, contacts, leads, stages, deals, activities TO lasan_grow_app;--> statement-breakpoint

ALTER TABLE users ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE stages ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE deals ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;--> statement-breakpoint

-- USING limits what can be read, updated and deleted; WITH CHECK stops rows being written into,
-- or moved to, another workspace.
CREATE POLICY tenant_isolation ON users TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON companies TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON contacts TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON leads TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON stages TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON deals TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint
CREATE POLICY tenant_isolation ON activities TO lasan_grow_app
  USING (org_id = public.app_current_org()) WITH CHECK (org_id = public.app_current_org());--> statement-breakpoint

-- The workspace row itself: read it, and rename it or change its currency. Its status (suspension)
-- and who created it are for the console only.
GRANT SELECT ON organizations TO lasan_grow_app;--> statement-breakpoint
GRANT UPDATE (name, currency) ON organizations TO lasan_grow_app;--> statement-breakpoint
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
CREATE POLICY own_workspace ON organizations TO lasan_grow_app
  USING (id = public.app_current_org()) WITH CHECK (id = public.app_current_org());--> statement-breakpoint

-- Lasan staff accounts: not reachable from customer code at all (no grant, and RLS with no policy).
ALTER TABLE platform_admins ENABLE ROW LEVEL SECURITY;
