# Deployment - PHP & MySQL (Shared Hosting / Plesk / cPanel)

## Prerequisites
- **PHP**: 8.1 minimum (8.2+ recommended).
- **Extensions**: `pdo_mysql`, `mbstring`, `json`, `openssl`, `session`.
- **Database**: MySQL 8+ or recent MariaDB.
- **SSL/TLS**: Let's Encrypt or equivalent is REQUIRED. The admin panel relies on secure sessions.

## 1. Database Setup
1. Create a database via your hosting panel.
2. Create **two** dedicated database users:
   - **Migration User**: Temporarily granted `CREATE`, `ALTER`, `INDEX`, etc. for running migrations.
   - **Application Runtime User**: Granted **Least Privilege**: Only `SELECT`, `INSERT`, `UPDATE`, `DELETE`. This is the user configured in `config.local.php`.

## 2. Database Installation & Migrations
### Path A: Fresh/Empty Database
If you are deploying to a completely empty database for the first time:
1. Import `database/fresh-install.sql` using phpMyAdmin or the MySQL CLI.
   *Note: This file canonically represents migrations 001–027.*
   *WARNING: Never import `fresh-install.sql` into a live database containing existing data.*
2. Configure runtime credentials in `config.local.php`.
3. Create the first admin **only** through the `php bin/create-admin.php` CLI tool.

### Path B: Existing/Incremental Database
If you are deploying an update to an existing live database:
1. Run the incremental migration tool to receive migrations (e.g., 027) safely:
   ```bash
   php bin/migrate.php
   ```

   Migration 027 registers the canonical demo media already deployed under `media/so3`, fills only missing homepage and branch media, and creates the six canonical demo events with their galleries. Existing customized media and same-slug events are preserved.
2. **Never** import `fresh-install.sql` over an existing database.

## 3. Configuration
1. Use `SO3_CONFIG_PATH` environment variable if available to point to a config file outside the document root.
2. Alternatively, copy `api/config/config.example.php` to `api/config/config.local.php`.
3. Fill in your secure credentials (using the runtime user with least privileges).
4. **CRITICAL**: The application refuses to use the example config and will throw an error if configuration is missing. Ensure `config.local.php` is explicitly denied in your web server configuration via the included `api/config/.htaccess`.

## 4. Deployment Steps
1. Build the frontend: `npm run build`.
2. Upload the `dist/` directory contents and the `api/` directory to the server.
3. Protect sensitive files (`.git`, `node_modules`, `config.local.php`) from web access via the root `.htaccess`.
4. Production uploads directory is `document-root/uploads`. Preserve `dist/uploads/.htaccess` during upload.
5. The `uploads` directory must be writable by the PHP runtime using the safest hosting-supported permissions, normally `0755` or `0775`. Do not use `0777`.

## 5. Web Server Configuration & Dynamic SEO
The application uses a dynamic SEO shell and dynamic sitemap driven by PHP, followed by an SPA fallback. **mod_rewrite (or Nginx equivalent) and PHP are required** for this functionality.

### Important Structural Requirements
The deployed document root structure must be:
```text
document-root/
  index.html
  api/
    core/
      SeoPageRenderer.php
```
- The `dist/` contents (from `npm run build`) and the `api/` directory **must remain siblings under the document root**.
- The `index.html` file must be readable by the PHP runtime, as `api/core/SeoPageRenderer.php` reads it (`dirname(__DIR__, 2) . '/index.html'`) to inject dynamic SEO tags.
- Event SEO (`/etkinlikler/...`) and the sitemap (`/sitemap.xml`) update automatically from published CMS data with a short cache delay (e.g., 60 seconds).
- Nginx requires equivalent routing rules to achieve the same internal rewrites.

### Apache Example (.htaccess)
```apache
RewriteEngine On

# Dynamic SEO and Sitemap
RewriteRule ^sitemap\.xml$ api/seo-sitemap.php [L]
RewriteRule ^etkinlikler/(.+)$ api/seo-event.php?slug=$1 [B,L,QSA]

# Allow API access
RewriteCond %{REQUEST_URI} ^/api/ [NC]
RewriteRule ^ - [L]

# Allow uploads access
RewriteCond %{REQUEST_URI} ^/uploads/ [NC]
RewriteRule ^ - [L]

# Deny access to sensitive files
RewriteRule ^(\.git|\.env|config\.local\.php|composer\.json|package\.json|.*\.sql|.*\.mjs|scripts/.*) - [F,L,NC]

# SPA Fallback for all other routes
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^ index.html [L]
```

## 6. Runtime SEO Verification
After deploying to a staging environment, run the non-destructive verification harness to confirm Apache, PHP, and database routing behaves correctly for SEO.

### Required Environment Variables

Set the following environment variables before running the verifier:
- `SO3_VERIFY_BASE_URL`: The full URL to your staging deployment (e.g., `https://staging.so3pt.com.tr`). Must use HTTPS. Optionally, it may contain a root trailing slash. Must not contain any other paths, query strings, or credentials.
- `SO3_VERIFY_ALLOW_HTTP`: Set to `true` only if testing against `localhost` to bypass the HTTPS requirement.
- `SO3_VERIFY_PUBLISHED_SLUG`: An existing published event slug. Must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and be distinct from the other test slugs.
- `SO3_VERIFY_NONPUBLIC_SLUG`: An existing nonpublic (drafted or hidden) event slug. Must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and be distinct from the other test slugs.
- `SO3_VERIFY_MISSING_SLUG`: A random slug that does not exist. Must match `^[a-z0-9]+(?:-[a-z0-9]+)*$` and be distinct from the other test slugs.

### Execution
```bash
npm run verify:runtime-seo
```

### Staging-First Workflow & 503 Verification
1. **Deploy to Staging**: Push your build to an isolated staging URL with an identical `.htaccess`, PHP version, and database schema to production.
2. **Run Verifier**: Execute `npm run verify:runtime-seo`. Expect an exit code of `0` indicating all HTTP statuses, cache controls, and method gates are functioning safely.
3. **Manual 503 Check [MANUAL STAGING REQUIRED]**: 
   - Temporarily break the staging database connection (e.g., rename `config.local.php` or `index.html`).
   - Visit the staging event URL in your browser or run a manual `curl -I`.
   - Confirm it securely degrades to a `503 Service Unavailable` with `Cache-Control: no-store` and a standalone HTML error page.
   - Restore the staging environment.
4. **Deploy to Production**: Only proceed to production once the staging verifier confirms the infrastructure routing matrix is sound.

The Apache/PHP/MySQL runtime remains officially unverified until this command is executed against a live staging environment. Note that successful local linters or build outputs do not guarantee successful runtime execution in staging.

## 7. Admin Creation & Cleanup
If SSH access is available, run:
```bash
php bin/create-admin.php
```

You can optionally configure a cron job to automatically delete old failed login attempts to prevent the `admin_login_attempts` table from growing indefinitely:
```bash
0 0 * * * php /path/to/bin/cleanup-login-attempts.php
```

**Note on Migrations**: MySQL/MariaDB DDL statements (like `CREATE TABLE`, `ALTER TABLE`) will implicitly commit transactions. Rollbacks generally only protect DML statements (`INSERT`, `UPDATE`, `DELETE`) within the same migration.

If no SSH is available, manually generate an Argon2id or bcrypt hash via a local PHP script and insert it via phpMyAdmin. Never create an unauthenticated script to create admins.
