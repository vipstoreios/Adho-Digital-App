# Mini Group Admin Panel

A new Next.js + TypeScript management console for the Mini Group grocery platform. It is intentionally separate from the previous admin panel and uses a clean UI, Supabase Auth, repository-based data access, protected routes, and Vercel-ready configuration.

## Local setup

1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and browser-safe anon key.
4. Add `ADMIN_EMAIL` with the Supabase Auth admin email. It is server-only and is never exposed to the browser.
5. Ensure the Mini Group Supabase migrations are deployed, including admin roles, RLS/RPC functions, and the `product-images` bucket.
6. Run `pnpm install` and `pnpm dev`.

## First admin

Create the first user in Supabase Auth, set its email as `ADMIN_EMAIL`, then insert that user's UUID into `admin_roles`. The login screen asks only for the password; the server combines it with `ADMIN_EMAIL` for Supabase Auth. Follow [docs/FIRST_ADMIN.md](docs/FIRST_ADMIN.md). Passwords are managed only by Supabase Auth and are never stored in this repository or frontend code.

## Included management areas

Dashboard analytics, products and image uploads, categories, inventory, orders and status updates, customers, promotional/featured data entry points, and settings entry points. All dashboard routes require an authenticated session; server middleware redirects unauthenticated users to `/login`.

## Production deployment

In Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` as environment variables for Preview and Production. Do not add a service-role key to browser-exposed variables. Build command: `pnpm build`; output is managed by Next.js.

## Verification

Run `pnpm exec next build` before deployment. Complete the live smoke checklist in `docs/PRODUCTION_CHECKLIST.md` with a real admin account and the target Supabase project.
