# v3.1.3 — Optional hosted page-view counter and private IP log
Build: 20261109-visit-counter

- Header language toggle and all teaching/model behavior retained.
- Public page-view total with English/Thai tracking notice; refreshes count again, not unique people.
- Optional same-origin PHP endpoint logs UTC access time and REMOTE_ADDR. Raw addresses never appear in public JSON responses.
- Locked atomic storage outside the web document root; configurable path and enable flag. Old IP entries are removed on maintenance requests after 30 days; total count retained.
- No third-party analytics, browser fingerprint or client-IP lookup service.
- Frontend tests pass. PHP runtime and deployment verification remain Pending because PHP is unavailable in this environment.

# v3.1.2 — English / Thai interface
Build: 20261109-thai

- Added persistent-in-page English / ไทย buttons in the header; English remains the default.
- Offline Thai catalogue covers all four tabs, static lesson text, dynamic feedback, anatomy cards, scenarios, question bank, graph labels, glossary, teacher notes, print summary, and accessible names.
- Uses plain Thai with English technical terms where useful. Equations, mathematical notation, source filenames and machine identifiers remain unchanged.
- Translation changes presentation nodes and document language only. No reload, route reset, time change, altered answers or altered control values.
- Observes only changed subtrees while Thai is selected; ignores user text and raw debug logs. No added network dependency, storage, font download or external asset.
- Added test-language.cjs. Eight suites pass; original PK test stdout remains byte-identical and original app logic is unchanged except version/build identifiers.
- Real-browser attempt failed before page load: host socket permission denied. Visual Thai layout, print pagination, screen-reader pronunciation and real-phone touch checks remain Pending.

# v3.1.1 — Mobile feedback and lesson usability
Build: 20261108-mobile-feedback

- Compact receptor strip and response meter above controls; sticky within the controls section, below the measured tab bar; disabled on short landscape viewports.
- Wrapping native radio predictions, 44px minimum tap rows, larger checkbox/radio indicators, visible keyboard focus.
- Graph labels sized to 14 CSS pixels by ResizeObserver, fewer x-axis ticks, HTML axis titles and labelled 40% partial-agonist ceiling.
- Consistent agonist/antagonist feedback; full sentences replace dash-plus-capital wording.
- Preserve each revealed step's slider settings and keep Show all's lab with its owning lesson; reveal focuses the result.
- Added mobile lesson DOM regression suite. PK and receptor equations unchanged.
- Browser launch blocked by host socket permissions; visual QA remains pending.

# v3.0.0 — Pharmacology teaching tab
Build: 20261108-meaning-first

- Added PK/PD explanations, receptor glossary, full/partial agonists and reversible competitive antagonist experiments.
- Added original SVG receptor icons, calculated occupancy percentages, concentration–response curves, and an explanatory question.
- Shared Beginner/Advanced mode; advanced equations, affinity control and assumptions.
- Extended ARIA tabs and arrow/Home/End handling to four tabs; responsive two-row navigation on phones.
- Retained v2.9.6 accumulation comparisons, NAC-inspired profile, metabolite circulation and forward particle motion.
- Existing PK regression output unchanged; new receptor/interaction checks pass.
- Visual browser and manual screen-reader checks remain pending.

## v3.1.0 — Meaning before terminology
Build: 20261108-meaning-first
Five steps: fit versus act; full/partial activation; binding without activation;
competition and recovery; everyday examples and connecting PK/PD. Main narrative
cards use short sentences and brief explanations before scientific labels.
Next/Back and Show all; predictions retained during navigation; five prediction
questions and one written reflection in two formats; correct, incorrect and
skip explanations without scores or timers. Revisiting a step reopens its last
revealed example at the example’s default values. Sliders allow free exploration
after reveal. The current lab is shared in Show all, displayed beside the
selected experiment rather than duplicating receptors with conflicting states.
Teacher notes include a 45-minute outline, misconceptions, answer reasoning,
antihistamine inverse-agonism nuance and a print-only summary.
Two bridge buttons preserve simulation settings, time and playback. The
simulator bridge says drug amount, because the PK graph does not plot actual
concentration. Written responses are self-assessed and not automatically graded.
PK/PD numerical equations unchanged.

Passed: six Node suites including new test-lesson.cjs; original regression
stdout byte-identical; JS syntax; build; unique IDs and five lesson sections.
Pending: all four tabs at 320/390/1360 px, sideways-scroll inspection, real-browser
page-error and keyboard/reduced-motion checks, print pagination, screen-reader
and real-phone touch checks. Chromium launch attempted 2026-11-08 through
Playwright; failed before page load with socket() Operation not permitted.
No screenshot or real-browser result is claimed.
Sources: IUPHAR Pharmacology Education Project; salbutamol SmPC
https://www.medicines.org.uk/emc/product/6340/smpc; NCI caffeine dictionary;
H1-antihistamines review https://pubmed.ncbi.nlm.nih.gov/23173575/.
No new external illustrations. Original SVG receptor icons/graph remain CC0 1.0;
all existing credits remain in the interface. Required resources work offline.
