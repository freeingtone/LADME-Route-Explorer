# Deployment — v3.1.5
Build: 20261110-count-only-mode

## Static/offline lesson
Open index.html locally. No tracking occurs for file: URLs. On static web
hosting the lesson still works; the counter reports unavailable.

## PHP hosting with counter and IP log
1. Confirm PHP 7.4 or newer is executed by your host.
2. Upload index.html, analytics.php and analytics-config.php together. Do not
   upload the test files or editable sources into the public web directory.
3. Default storage is a private sibling of DOCUMENT_ROOT, named
   ladme-private-<12-character site hash>. PHP must be able to create it.
4. If it cannot, create a writable private directory OUTSIDE public_html,
   htdocs and every other publicly served directory. Set its absolute path in
   analytics-config.php under storage_dir. Never expose this directory through
   a web alias or symlink. The endpoint rejects paths inside DOCUMENT_ROOT.
5. Open the page and verify the count increments once; refresh increments once
   more. Changing a tab or language should not increment it.
6. Use your hosting file manager or SSH to open the private visits.json file.
   It contains total_page_views and visits [{accessed_at, ip}]. It is not
   available through the public website. Keep backups containing IPs private.
7. Confirm GET analytics.php exposes only enabled, page_views and retention_days.
   POST records a view. No log viewer or public download endpoint is included.

## Retention / disabling
- Default IP retention is 30 days; config allows 1–30. Expired entries are pruned
  on the next successful GET or POST. With no traffic, no automatic task runs.
- For regular cleanup, schedule a daily GET of your site's analytics.php using
  the host's cron facility. GET cleans expired records without adding a view.
- The total page-view count remains after old IP entries are removed.
- Set enabled to false in analytics-config.php to stop new tracking. This does
  not delete existing records. Remove them privately according to your policy.
- No settings or credentials need to be added to index.html.

## InfinityFree and other hosts where PHP can only use htdocs
On these hosts PHP cannot reach any folder outside the site's own `htdocs`, so IP logging (which needs a private folder outside the web root) cannot work. Use count-only mode:
1. Upload `index.html`, `analytics.php` and `analytics-config.php` into `htdocs`.
2. In `analytics-config.php` change `'log_ip' => true` to `'log_ip' => false`.
3. Open the page. It should say "Page views: 1", and 2 after a refresh. The notice under it then says no IP addresses are recorded.
4. Check that the stored total is not public: browse to `/.ladme-counter-<12 characters>/visits.php` on your site (the folder name is visible in your file manager). You should get an error page or a blank page, never numbers.
Count-only mode stores a single total and no personal data. It cannot be turned back into a visitor log later.

## Troubleshooting: what the page message means
| Message under "Website visit information" | Cause | Fix |
|---|---|---|
| Page views: N | Working. | None. |
| Counter unavailable — this host does not run the PHP counter | `analytics.php` is not being executed: static hosting (GitHub Pages, Netlify, many school servers), PHP turned off, or the file was not uploaded next to `index.html`. | Use a PHP host and upload `analytics.php` and `analytics-config.php` with `index.html`. On static hosting the lesson works and the counter stays off by design. |
| Counter unavailable — the server could not create its private log folder | PHP cannot create the private folder beside the web root, or `open_basedir` blocks it (InfinityFree always does). On such hosts set `log_ip` to `false`. The exact reason is in the host's PHP error log (search "LADME counter"). | Create a folder outside `public_html`/`htdocs` that PHP can write, then put its absolute path in `analytics-config.php` under `storage_dir`. Under `open_basedir`, choose a path inside the allowed area. |
| Counter unavailable — the server rejected the request origin | A request from another site, or an old browser behind a proxy that rewrites the Host header. | Open the page from the same address that serves `analytics.php`. |
| Visit tracking is disabled. | `enabled` is `false` in `analytics-config.php`. | Set it to `true`. |
| Offline — no page view recorded. | The file was opened from disk (`file:`). | Open it from the web host. |

## Verification status (v3.1.5)
Tested with PHP 8.3.6 (built-in server) and Chromium, 2026-11-09:
- Normal layout: count 1, then 2 after a refresh; changing tabs does not add a view; `visits.json` holds time and IP; GET returns only enabled, page_views and retention_days.
- Parent folder not writable: 503 with the private-folder message; cause written to the server log.
- `open_basedir` limited to the web folder: same message; setting `storage_dir` inside the allowed area fixes it.
- Static host: "does not run the PHP counter".
- Rewritten Host with `Sec-Fetch-Site: same-origin`: accepted. Missing `Sec-Fetch-Site` with a mismatched Origin: refused. `cross-site`: refused.
- InfinityFree-style `open_basedir` (htdocs only): default config shows the private-folder message; `log_ip` false counts 1 then 2, stores no IP, and a direct request for `visits.php` returns 404 with no data (tested without `.htaccess`, so the PHP guard alone is proven).
- 40 simultaneous page views (20 in parallel, 8 workers): total 40 and 40 log entries, no lost updates.

Still pending: a check on your real host (PHP version, permissions, `open_basedir`), the 30-day retention pruning over time, the cron cleanup, and proxy/CDN visitor-IP handling (not implemented; the counter records the direct connection address). Existing mobile and screen-reader checks remain pending as documented in QA.md.

The endpoint uses REMOTE_ADDR, not untrusted forwarded headers. Public counters can include bots and repeated requests.
