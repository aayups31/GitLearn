export const schemaDDL = `
CREATE SCHEMA IF NOT EXISTS outclass_service;
CREATE TABLE IF NOT EXISTS outclass_service.accounts (
  user_id uuid PRIMARY KEY, customer text UNIQUE, subscription text, paid_until timestamptz,
  checkout_key uuid, checkout_expires_at timestamptz, checkout_session text
);
ALTER TABLE outclass_service.accounts ADD COLUMN IF NOT EXISTS checkout_key uuid;
ALTER TABLE outclass_service.accounts ADD COLUMN IF NOT EXISTS checkout_expires_at timestamptz;
ALTER TABLE outclass_service.accounts ADD COLUMN IF NOT EXISTS checkout_session text;
CREATE TABLE IF NOT EXISTS outclass_service.usage (
  user_id uuid NOT NULL, period text NOT NULL, used integer NOT NULL DEFAULT 0 CHECK(used>=0), PRIMARY KEY(user_id,period)
);
CREATE TABLE IF NOT EXISTS outclass_service.requests (
  id uuid PRIMARY KEY, user_id uuid NOT NULL, period text NOT NULL, refunded boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS outclass_service.webhooks (id text PRIMARY KEY, received_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS outclass_service.budget (period text PRIMARY KEY, used integer NOT NULL DEFAULT 0 CHECK(used>=0));
REVOKE ALL ON SCHEMA outclass_service FROM PUBLIC;
`;

export const supabasePermissionsDDL = `
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname='outclass_api') THEN
    CREATE ROLE outclass_api NOLOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOREPLICATION NOBYPASSRLS;
  END IF;
END $$;
REVOKE ALL ON SCHEMA outclass_service FROM anon, authenticated;
REVOKE ALL ON ALL TABLES IN SCHEMA outclass_service FROM PUBLIC, anon, authenticated, outclass_api;
GRANT USAGE ON SCHEMA outclass_service TO outclass_api;
GRANT SELECT, INSERT, UPDATE ON outclass_service.accounts, outclass_service.usage, outclass_service.requests, outclass_service.budget TO outclass_api;
GRANT SELECT, INSERT ON outclass_service.webhooks TO outclass_api;
ALTER DEFAULT PRIVILEGES IN SCHEMA outclass_service REVOKE ALL ON TABLES FROM PUBLIC, anon, authenticated;
DO $$ DECLARE table_name text; BEGIN
  FOREACH table_name IN ARRAY ARRAY['accounts','usage','requests','webhooks','budget'] LOOP
    EXECUTE format('ALTER TABLE outclass_service.%I ENABLE ROW LEVEL SECURITY', table_name);
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='outclass_service' AND tablename=table_name AND policyname='outclass_service_only') THEN
      EXECUTE format('CREATE POLICY outclass_service_only ON outclass_service.%I FOR ALL TO outclass_api USING (true) WITH CHECK (true)', table_name);
    END IF;
  END LOOP;
END $$;
`;

export async function verifySchema(db: {
  query: (query: string) => Promise<unknown>;
}) {
  // No DDL on application startup. The service login has no schema ownership.
  await db.query(
    `SELECT user_id,customer,subscription,paid_until,checkout_key,checkout_expires_at,checkout_session FROM outclass_service.accounts LIMIT 0`,
  );
  await db.query(
    `SELECT user_id,period,used FROM outclass_service.usage LIMIT 0`,
  );
  await db.query(
    `SELECT id,user_id,period,refunded,created_at FROM outclass_service.requests LIMIT 0`,
  );
  await db.query(
    `SELECT id,received_at FROM outclass_service.webhooks LIMIT 0`,
  );
  await db.query(`SELECT period,used FROM outclass_service.budget LIMIT 0`);
}
