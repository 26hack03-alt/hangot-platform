# Database setup

The production runtime uses Supabase Postgres. Apply these files to a new Supabase project in order:

1. `supabase/migrations/202608060001_vercel_postgres_schema.sql`
2. `supabase/migrations/202608060002_rls_and_application_rpc.sql`

The application server accesses PostgREST with `SUPABASE_SERVICE_ROLE_KEY`; browser code must never import `app/lib/database/*`. Authentication continues to use the public Supabase URL and anon key with PKCE cookies.

The `drizzle/` directory is retained only as Cloudflare D1 history and must not be applied to Supabase. See `SUPABASE_VERCEL_SETUP.md` for RLS, OAuth URLs, initial admin assignment, and optional D1 transfer.
