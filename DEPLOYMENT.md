# Deployment — v3.1.3
Build: 20261109-visit-counter

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

## Verification status
Frontend offline/hosted/disabled/error handling tested. PHP is not installed in
this build environment, so syntax/runtime, concurrency, file permissions,
retention and live-host response checks remain Pending. Do these on the PHP
host before enabling the counter for a class. Existing mobile/screen-reader
visual checks remain pending as documented in QA.md.

The endpoint uses REMOTE_ADDR, not untrusted forwarded headers. Proxy/CDN
visitor-IP support requires host-specific trusted-proxy configuration and is
not implemented. Public counters can include bots and repeated requests.
