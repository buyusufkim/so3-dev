# SO3 PT — AI Studio Database Handoff

## Purpose

`so3-live-content-snapshot-sanitized.sql` is a sanitized snapshot of the live SO3 PT database content dated 2026-08-21. Use it only as development context or inside an isolated local/development database.

## Safety boundary

- Never connect AI Studio directly to the production MySQL database.
- Never request, store, expose, or commit production database credentials.
- Never run this snapshot against the production database.
- Do not generate destructive production SQL (`DROP DATABASE`, `DROP TABLE`, or mass deletion).
- The production website remains untouched until Yusuf explicitly approves a deployment package.

## Sanitization

- Production administrator rows and password hashes are excluded.
- Login-attempt and audit-log data are excluded.
- IP addresses and session data are excluded.
- One inactive, non-login placeholder administrator preserves historical foreign-key references.
- Public CMS content, events, branches, trainers, settings, media metadata and relations are retained.

## Source-of-truth rules

- The GitHub repository remains the canonical application source.
- `database/migrations/` remains authoritative for incremental schema changes.
- `database/fresh-install.sql` remains authoritative for empty-database installation.
- This snapshot represents current live content, not a replacement for migrations.
- Do not commit this snapshot to GitHub unless Yusuf explicitly requests it.

## Development workflow

1. Inspect the snapshot when a feature depends on real table structure or current CMS relationships.
2. Implement application changes in the GitHub-backed project.
3. For schema changes, add the next numbered migration and update `database/fresh-install.sql` consistently.
4. Run lint/build and available PHP/static checks.
5. Stop with an exact report. Do not deploy or access production.

## Initial AI Studio instruction

Use the attached sanitized SQL only as a read-only representation of the current live database. Do not connect to the production server and do not ask for production credentials. First audit the repository and snapshot for consistency, then wait for the next feature request. Do not modify files, generate a migration, or deploy anything until explicitly instructed.
