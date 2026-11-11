# QA / test report — v3.1.5
Build: 20261110-count-only-mode

## Passed — automated
- Build and all nine Node suites, including test-counter.cjs.
- Counter handles local file, successful hosted count, disabled backend,
  invalid payload and fetch failure. Same-origin POST contains no client IP.
- Thai counter label and model state preservation.
- Original test-app.cjs unchanged; before/after numerical stdout identical.
- Existing language, lesson, receptor, route, schedule, accumulation and mass-balance regressions.

## Pending
- PHP syntax/runtime (PHP executable unavailable): concurrent writes, private
  filesystem permissions, corrupted-log handling, pruning and live endpoint.
- PHP host deployment with log access checked through file manager/SSH.
- Real-browser counter and layouts at 320/390/1360 px, English/Thai text fit,
  keyboard, reduced motion, print, screen-reader and real-phone touch checks.
- Prior Chromium attempts failed before page load due to denied socket calls;
  DOM tests are not visual/browser verification.

## Scope
Page opens, not unique people. No third-party service, public IP display,
authenticated admin interface, trusted-proxy parsing or bot filtering.
IP records expire after the configured period on the next maintenance request;
daily host cron is recommended for predictable cleanup. All-time count retained.
No new illustrations or changes to the scientific models.


## v3.1.4 addendum — counter
Passed (PHP 8.3.6 + Chromium): normal count and refresh, no increment on tab change, locked-down parent, open_basedir (and its storage_dir fix), static host, proxy Host rewrite, cross-site refusal, 40 concurrent views with no loss. All nine Node suites pass; test-counter.cjs now covers the three specific messages and their Thai text.
Pending: your real host, retention pruning over 30 days, cron cleanup, manual screen-reader pass.

## v3.1.5 addendum — count-only mode
Passed (PHP 8.3.6 + Chromium): open_basedir-confined host with IP logging on (clear message), with `log_ip` false (count 1 then 2, no IP stored, notice swapped, data file not readable over HTTP), normal host with `log_ip` false still using the private folder. All nine suites pass.
Pending: the real InfinityFree account (I could not open the live site), whether its Apache honours the `.htaccess` (the PHP guard protects the file regardless), manual screen-reader pass.
