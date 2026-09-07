# First admin account

1. In Supabase Dashboard, open Authentication → Users → Add user and create the administrator account.
2. Copy the new user's UUID.
3. Run the parameterized SQL in `supabase/first_admin.sql`, replacing the placeholder with that UUID.
4. Sign in at `/login` and verify `/dashboard` loads.

Never put the initial password, a service-role key, or a password hash in frontend code, `.env.example`, or Git. Rotate any temporary password after the first sign-in.
