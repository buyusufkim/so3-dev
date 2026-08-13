# SO3 PT - Security Policy

## Threat Model & Secret Management
No sensitive information (passwords, tokens, API keys) is to be hardcoded in the repository. 
The application relies on external configuration via `SO3_CONFIG_PATH` environment variable, or `config.local.php` as a local fallback, which is ignored by `.gitignore`. The application **fails closed** if a valid private configuration is missing, and will never use example configuration. The web server must be configured to deny access to these files (e.g., via `api/config/.htaccess`).

## Authentication & Sessions
- Authentication is handled exclusively server-side using native PHP sessions.
- Session IDs must never be exposed to the frontend (e.g., in localStorage).
- A 30-minute idle timeout and an 8-hour absolute timeout enforce session freshness.
- `session_regenerate_id(true)` is strictly applied upon login.

## CSRF Protection
- All state-changing requests (POST, PUT, PATCH, DELETE) require a cryptographically secure CSRF token.
- The token is passed via the `X-CSRF-Token` header and verified against the PHP session.
- CSRF token is rotated immediately after a successful login.

## SQL Injection Prevention
- All database interactions use PDO with prepared statements. No user input is directly interpolated into SQL strings.

## User Enumeration & Payload Limits
- Auth endpoints reject payloads larger than 16KB.
- Unknown users are verified against a fixed dummy hash so timing remains roughly equivalent to an incorrect password check.

## XSS Prevention
- Data fetched from the API is sanitized before being displayed. Use React's default escaping and avoid `dangerouslySetInnerHTML` unless rendering explicitly trusted, sanitized HTML.

## Rate Limiting
- Failed login attempts are throttled after 5 failures in 15 minutes to prevent brute-force attacks. A `Retry-After: 900` header is returned on 429. Successful logins clear the recent failed attempt records for that IP/username.

## Error Handling
- In production, error disclosure is turned off. Stack traces and internal paths are never returned to the client.

## Logging Policy
- A recursive redaction function strips sensitive keys (e.g., password, CSRF, session tokens) from all metadata before writing it to the `audit_logs` table. Total metadata size is capped at 16KB.
