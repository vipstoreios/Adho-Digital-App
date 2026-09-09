import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return NextResponse.json(
      { error: 'Admin login is not configured.' },
      { status: 500 },
    );
  }

  const body: unknown = await request.json().catch(() => null);
  const password =
    typeof body === 'object' && body !== null && 'password' in body
      ? (body as { password?: unknown }).password
      : undefined;

  if (typeof password !== 'string' || password.length === 0) {
    return NextResponse.json({ error: 'Password is required.' }, { status: 400 });
  }

  const store = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => store.getAll(),
        setAll: (values) => {
          values.forEach(({ name, value, options }) =>
            store.set(name, value, options),
          );
        },
      },
    },
  );

  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: adminEmail,
    password,
  });

  if (signInError) {
    return NextResponse.json(
      { error: 'Invalid admin password.' },
      { status: 401 },
    );
  }

  const { data: isAdmin, error: roleError } = await supabase.rpc('is_mini_admin');
  if (roleError || !isAdmin) {
    await supabase.auth.signOut();
    return NextResponse.json(
      { error: 'This account does not have admin access.' },
      { status: 403 },
    );
  }

  return NextResponse.json({ ok: true });
}
