# Migration Audit: Supabase vs. Target Database

This document outlines the findings from an audit comparing the source Supabase project and the target database (Prisma).

## Summary
- **Tables**: All 18 public tables from Supabase are defined in the target database schema.
- **Views**: 1 view missing (`user_membership_details`).
- **Schema-Specific Tables**: 18 `auth` schema tables and 2 `storage` schema tables are not represented in the public Prisma schema (standard for Supabase migrations).
- **Data Volume**: Supabase contains substantial data in several logs and operational tables that may not have been fully migrated.

## Detailed Gap Analysis

### 1. Missing Views
The following views were found in Supabase but are missing from the target database:
- `user_membership_details`

### 2. Missing/Internal Tables (Usually Ignored)
The following tables are in Supabase but not in the Prisma schema (likely by design):
- `v_api_url` (Supabase internal/migration helper)
- `v_cron_secret` (Supabase internal/migration helper)
- All tables in `auth` schema (e.g., `users`, `sessions`, `identities`)
- All tables in `storage` schema (e.g., `objects`, `buckets`)

### 3. Data Volume Audit (Supabase Row Counts)
The target database may be missing data from these high-volume tables:
- `cron_logs`: 1,057 rows
- `notification_logs`: 1,046 rows
- `meals`: 223 rows
- `water_intake`: 165 rows
- `body_measurements`: 27 rows
- `user_memberships`: 23 rows
- `notification_messages`: 19 rows
- `user_preferences`: 16 rows

## Findings on Specific Issues
- **Banners**: `motivation_banners` exists in both databases. Supabase has 2 rows.
- **Plans**: `user_plans` exists but has 0 rows in Supabase.
- **Views**: `user_membership_details` is the primary functional view missing.

## Recommendations
1. **View Migration**: Manually create the `user_membership_details` view in the target database.
2. **Data Sync**: If production data is missing, a data migration script (e.g., using `pg_dump` or a custom ETL script) is required for the high-volume tables.
