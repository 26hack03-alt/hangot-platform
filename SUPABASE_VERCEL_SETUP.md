# Supabase setup for Vercel

1. Apply `supabase/migrations/202608060001_vercel_postgres_schema.sql` and then `202608060002_rls_and_application_rpc.sql` in SQL Editor.
2. Confirm RLS is enabled, anon has no table privileges, and `review_application` is executable only by `service_role`.
3. Keep Google enabled in Authentication > Providers.
4. Set Site URL to the final Vercel URL and add `https://<vercel-domain>/auth/callback` to Redirect URLs. Keep the required local callback separately.
5. Store the service-role key only in encrypted Vercel server environment variables.
6. After the intended user signs in once, assign the initial admin with a verified Auth UUID:

```sql
update public.users set role = 'admin', updated_at = now()
where auth_user_id = '<verified auth.users UUID>';
```

D1 transfer is optional. Export locally, inspect the JSON, run the importer without `--execute`, back up Supabase, and only then opt in to execution. Never run transfer during deployment.
