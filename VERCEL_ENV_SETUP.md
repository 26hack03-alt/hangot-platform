# Vercel environment setup

Register `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `APP_URL`, `ALLOWED_ORIGIN`, and `ALLOWED_GOOGLE_DOMAIN`. The service-role key is a Vercel server secret: never prefix it with `NEXT_PUBLIC_` or expose it in a client component, response, or log. Google Sheets variables remain optional and separate.

- Install: `pnpm install --frozen-lockfile`
- Build: `pnpm run build:vercel`
- Output: `.output`
- Runtime: Node.js 22+

After Vercel assigns the production domain, set `APP_URL` and `ALLOWED_ORIGIN` to that exact HTTPS origin and rebuild.
