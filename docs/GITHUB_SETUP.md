# GitHub setup: Adho Digital App

The local repository is already initialized with one clean commit. Create an empty GitHub repository named `Adho Digital App` (GitHub repository slugs normally use `adho-digital-app`), then run from this folder:

```powershell
git remote add origin https://github.com/<your-account>/adho-digital-app.git
git branch -M main
git push -u origin main
```

Before pushing, confirm `.env.local` is not tracked and only `.env.example` is committed. Configure Vercel from the GitHub repository and add the two `NEXT_PUBLIC_SUPABASE_*` variables in Vercel project settings.
