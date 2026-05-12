# Supabase Setup

## 1. Create a Supabase project

Go to [supabase.com](https://supabase.com) and create a new project (or use an existing one).

## 2. Set environment variables

Copy `.env.example` to `.env.local` and fill in:

```
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

You can find these in **Settings → API** in the Supabase dashboard.

> **Never** prefix `SUPABASE_SERVICE_ROLE_KEY` with `NEXT_PUBLIC_`. It must only be used server-side.

## 3. Run the schema

1. Open the **SQL Editor** in your Supabase dashboard.
2. Paste the contents of `supabase/schema.sql`.
3. Click **Run**.

This creates the `profiles`, `clients`, and `projects` tables with RLS policies.

## 4. Bootstrap the owner

After running the `create_members_table` migration, insert the first owner:

```sql
insert into public.members (user_id, email, role, status)
select id, email, 'owner', 'active'
from auth.users
where email = '<OWNER_EMAIL>'
limit 1;
```

Replace `<OWNER_EMAIL>` with the email of the workspace owner.

## 5. Verify

- Check **Table Editor** — you should see `profiles`, `clients`, `projects`, and `members`.
- Each table should have RLS enabled (green shield icon).
- The `members` table should have one row with `role=owner` and `status=active`.
