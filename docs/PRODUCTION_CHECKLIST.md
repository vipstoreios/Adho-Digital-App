# Mini group Web Admin production checklist

## First admin account

1. In Supabase Dashboard → Authentication → Users, create the user with the admin email and a strong temporary password.
2. Copy the user's UUID.
3. Replace `REPLACE_WITH_AUTH_USER_UUID` in `supabase/first_admin.sql` and run it in the Supabase SQL Editor.
4. Sign in at `/login`, then verify `/dashboard` loads statistics.
5. Change the temporary password through the Supabase Auth flow. Never commit or paste passwords into source code.

## Vercel

Set these project environment variables for Production, Preview, and Development:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key only)

Never set a service-role key as a `NEXT_PUBLIC_` variable. Deploy with `pnpm install --frozen-lockfile && pnpm run build`.

## Manual acceptance test

- Login with an admin user; confirm a non-admin cannot load admin RPCs.
- Create, edit, and delete a product; upload an image and confirm the public URL renders.
- Create, edit, and delete a category.
- Open orders and change each allowed order status.
- Load customer records.
- Confirm destructive actions require confirmation and errors are visible.
- Repeat at desktop, tablet, and narrow mobile widths.
