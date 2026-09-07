# Adho Digital App — Mini group Admin Panel

Next.js + TypeScript + Tailwind + Supabase admin dashboard for Mini group grocery operations.

The dashboard includes protected login, live overview statistics, and browser routes for products, categories, orders, and customers. CRUD mutations should be wired to the same admin RPC/RLS contract before production launch.

## Setup

```bash
npm install
copy .env.example .env.local
npm run dev
```

Set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY`. Admin access is granted only when the authenticated user exists in `admin_roles`; no password is stored in frontend code. Deploy with Vercel using the same environment variables. The Supabase project must have `admin_management.sql` deployed so `admin_overview`, admin RLS policies, order status RPC, and storage policies are available.

## Production checklist

- Keep only the publishable Supabase key in `NEXT_PUBLIC_SUPABASE_ANON_KEY`; never expose a service-role key.
- Create the user in Supabase Auth, then add its UUID to `admin_roles` with role `admin`.
- Verify `admin_overview`, `admin_set_order_status`, `mini_admin_*`, and `mini_admin_image_insert` in the live project.
- Configure the same two environment variables in Vercel; do not commit `.env.local`.
- Test product/category create, edit, delete, image upload/removal, and order status updates with a real admin account.

See [docs/PRODUCTION_CHECKLIST.md](docs/PRODUCTION_CHECKLIST.md) and [supabase/first_admin.sql](supabase/first_admin.sql) for the first-admin setup and acceptance test.
