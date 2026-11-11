# QA / test report — v3.1.3
Build: 20261109-visit-counter

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
