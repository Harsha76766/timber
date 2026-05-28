# TimberFlow: Supabase Database Migration Plan

We are moving your database from your local computer (SQLite) to the Supabase Cloud (PostgreSQL).

## User Review Required

> [!CAUTION]
> **DRIVE C IS FULL**: Your C: drive has **0 bytes free**. While the database will now be in the cloud, you still need to delete some files on C: (like Recycle Bin) so that the app can "talk" to Supabase.

> [!IMPORTANT]
> **Connection Needed**: I need your Supabase **Database URL**. It looks like `postgresql://postgres:[PASSWORD]@db.[ID].supabase.co:5432/postgres`.

## Proposed Changes

### [Database]

#### [MODIFY] [prisma/schema.prisma](file:///e:/Desktop/timber/prisma/schema.prisma)
- Change `provider = "sqlite"` to `provider = "postgresql"`.
- This tells the app to stop looking at your local disk for the database.

#### [MODIFY] [.env](file:///e:/Desktop/timber/.env)
- Update `DATABASE_URL` with the Supabase connection string.
- Add `DIRECT_URL` for direct access.

### [Data Sync]
- We will start fresh on Supabase to ensure everything is clean and fast.
- Run `npx prisma db push` to set up the tables in the cloud.

## Verification Plan
1. Run `npx prisma db push`.
2. Check Supabase Dashboard to see the `User`, `Quote`, and `Product` tables.
3. Save a new estimate and verify it appears in "History".
