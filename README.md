# Mini Group Admin Control Center

A Next.js + TypeScript management console for the Mini Group multi-store grocery ecosystem. It shares the same Supabase database as the Flutter customer, store-owner and driver experiences, while keeping repository-based data access, protected routes, and Vercel-ready configuration.

## Local setup

1. Install Node.js 20+ and pnpm.
2. Copy `.env.example` to `.env.local`.
3. Add the Supabase project URL and browser-safe anon key.
4. Add `ADMIN_EMAIL` with the Supabase Auth admin email. It is server-only and is never exposed to the browser.
5. Deploy the existing base migrations, then `supabase/marketplace_roles_stores.sql`, followed by `supabase/admin_control_center.sql`. Both are additive and preserve customer data.
6. Run `pnpm install` and `pnpm dev`.

## First admin

Create the first user in Supabase Auth, set its email as `ADMIN_EMAIL`, then insert that user's UUID into `admin_roles`. The login screen asks only for the password; the server combines it with `ADMIN_EMAIL` for Supabase Auth. Follow [docs/FIRST_ADMIN.md](docs/FIRST_ADMIN.md). Passwords are managed only by Supabase Auth and are never stored in this repository or frontend code.

## Included management areas

The control center includes:

- Live KPI dashboard: products, customers, orders, sales, active stores and drivers, pending orders and low stock.
- Product catalogue, multilingual names, IQD prices, units, stock, discounts, images and active state.
- Categories, inventory, orders and fulfilment status.
- Customer email/profile listing, multi-role assignment and protected account deletion.
- Stores, approval state, location coordinates, opening hours, delivery/pickup capabilities, logos and covers.
- Drivers, vehicles and availability.
- Scheduled multilingual advertising banners with image uploads and store/product/URL actions.
- Featured products, app settings and multilingual in-app content by screen/section.
- Administrative audit trail, confirmation prompts, loading/error/success states, search and pagination.

Both login and middleware verify `admin_roles`; an ordinary authenticated customer cannot open dashboard routes. Every write remains subject to Supabase RLS and secure admin RPC checks.

## Production deployment

In Vercel, set `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, and server-only `ADMIN_EMAIL` for Preview and Production. Do not add a service-role key to this project or any `NEXT_PUBLIC_*` variable. Build command: `pnpm build`; output is managed by Next.js.

Required environment variables:

```env
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=YOUR_BROWSER_SAFE_ANON_KEY
ADMIN_EMAIL=admin@your-domain.example
```

The anon key is expected in the browser and is safe only because all database/storage writes are protected by RLS. Never use `SUPABASE_SERVICE_ROLE_KEY` in this web app.

## Verification

Run `pnpm exec next build` before deployment. Then verify login, dashboard KPIs, one create/edit/delete cycle, role assignment, order status, image upload and banner scheduling with a real admin account.
