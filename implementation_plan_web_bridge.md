# TimberFlow: "Web Bridge" Connection Plan

We are switching from direct database pipes (Prisma TCP) to standard web requests (Supabase HTTPS) to bypass network blocks.

## User Review Required

> [!IMPORTANT]
> **API Credentials Needed**: I need your **Project URL** and **Anon Key** from the Supabase Dashboard (Settings > API).

> [!CAUTION]
> **Refactor Notice**: This will replace Prisma with the Supabase Client in your main services. Your code will stay on Drive E, but the way it talks to the cloud will change to be much more reliable.

## Proposed Changes

### [Library]
- Install `@supabase/supabase-js`. 
- (I will use my "Drive E" trick to ensure this works without disk errors).

### [Services]
- **[NEW] [supabase.ts](file:///e:/Desktop/timber/src/lib/supabase.ts)**: Initialize the web client.
- **[MODIFY] [quoteService.ts](file:///e:/Desktop/timber/src/lib/services/quoteService.ts)**: Rewrite database calls to use `supabase.from('quotes').insert(...)`.

## Verification Plan
1. Check connectivity to Supabase API via `curl`.
2. Save a test estimate and verify it appears in the Supabase Table Editor.
