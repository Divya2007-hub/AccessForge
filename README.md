# AccessForge

AccessForge is a Phase 3A accessibility audit, local review, and approved-fix export workspace. It scans one public web page with a real Chromium and axe-core run, stores the resulting report in the browser, turns supported findings into editable rule-based fix drafts with a local approval audit trail, and exports approved snapshots as a local handoff bundle.

The product is intentionally honest about its limits: it does not show a composite accessibility score, it does not claim a clean scan proves compliance, its drafts are deterministic templates rather than agent output, and no decision or export modifies code.

## What is implemented today

- Real one-page scanner using Playwright Chromium and axe-core.
- Server-side URL validation, DNS resolution checks, private-network blocking, request-level target blocking, rate limits, and scan concurrency limits.
- Report pages with severity counts, affected elements, failure summaries, rule documentation links, suggested remediation, and a manual verification checklist.
- Dashboard with scan totals, severity distribution, recent scans, and locally stored scan history.
- Bundled demo website with intentional accessibility defects, audited through a real `file://` axe-core run, plus a verified repaired copy for before/after comparison.
- Local fix review driven by a saved scan: deterministic drafts for supported rules, editable proposed HTML, before/after comparison, approve/reject/reopen decisions, and a persistent local audit trail.
- Approved-fix export: a JSON review bundle plus a fragment diff containing only the exact approved HTML snapshots, notes, and timestamps.
- Agent workflow page that documents the planned architecture and plainly marks it as disconnected.

The deterministic recipes cover `image-alt`, `button-name`, `link-name`, `select-name`, `label`, `input-button-name`, `html-has-lang`, and `frame-title`. Other findings are listed as unsupported and left for manual review. Approval is blocked while a bracketed placeholder remains or the proposed HTML is unchanged.

## What Phase 3A does not include

- No GitHub or Switch connection. The UI labels both as disconnected.
- No live coding agents and no agent-generated proposals.
- No applyable repository patch. AccessForge does not store source paths, line numbers, or project files, so the fragment diff is explicitly a review aid.
- No code modification, pull requests, commits, or repository writes. Approvals and exports stay in browser storage or downloaded files.
- No authentication, database, scheduled scans, multi-page crawling, or team features.
- No composite accessibility score. Counts describe observed axe-core results only.

## Quick start

Prerequisites:

- Node.js 20.9 or newer.
- npm.
- A Chromium build for Playwright.

```bash
npm install
npx playwright install chromium
npm run dev
```

Open <http://localhost:3000>. The bundled demo audit works without any external network access.

Optional configuration:

```bash
cp .env.example .env.local
```

## Scripts

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start the Next.js development server. |
| `npm run build` | Create a production build. |
| `npm run start` | Serve the production build. |
| `npm run lint` | Run ESLint. |
| `npm run typecheck` | Run TypeScript with `--noEmit`. |
| `npm run test:e2e` | Run the Playwright suite; it starts the dev server on port 3100. |
| `npm run demo:a11y` | Compare the bundled demo baseline and repaired copy with axe-core; also checks keyboard and mobile behavior. |
| `npm run playwright:install` | Install the Chromium build used by Playwright. |

## Reproducing the accessibility demonstration

The repository includes two static versions of the bundled demo:

- `demo-site/index.html` is the intentionally inaccessible baseline. It is unchanged.
- `demo-site/index.repaired.html` is a verified "after" copy. It adds alt text to the hero image, empty alt text to decorative product images, and turns the header search icon into a named link that moves focus to the search form.

Run the comparison without starting the app or contacting an external service:

```bash
npm install
npx playwright install chromium
npm run demo:a11y
```

The script loads both files directly with `file://`, runs axe-core with the same WCAG 2.0, 2.1, and 2.2 A/AA tags as the test suite, and prints:

| File | Expected result |
| --- | --- |
| `demo-site/index.html` | 6 violations across 19 elements: `button-name`, `color-contrast`, `html-has-lang`, `image-alt`, `link-name`, `select-name` |
| `demo-site/index.repaired.html` | 4 violations across 14 elements: `color-contrast`, `html-has-lang`, `link-name`, `select-name` |

The repaired copy also passes the keyboard check: focus the header search link, press Enter to move focus to `FORM#gear-search`, then press Tab to reach the search input. At 375x667 the search link stays visible while the Gear, Guides, and Journal links are hidden.

The repaired copy is not a compliance certificate. The remaining violations are pre-existing limitations, and automated axe-core checks cover only part of WCAG. The demo files are static and contain no credentials, environment values, Switch handoffs, or local state.

## How scanning works

1. The API validates the request body and applies a per-IP rate limit (8 remote scans and 6 demo audits per minute).
2. The URL is normalized to HTTP or HTTPS. Credentials, non-standard ports, localhost, private and reserved IP literals, blocked hostname suffixes, and metadata hostnames are rejected.
3. The hostname is resolved with DNS. Every resolved address must be public, which blocks DNS names that point into private networks.
4. A Chromium context is created at a 1366x900 desktop viewport with a light color scheme. Every browser request is checked again and blocked if it targets a private or unresolvable host.
5. axe-core runs with the WCAG 2.0, 2.1, and 2.2 A/AA tags plus best-practice rules. Remaining findings are marked as needing review rather than counted as violations.
6. The report stores real rule IDs, selectors, HTML snippets, failure summaries, rule documentation links, counts, environment details, and limitations. It deliberately contains no score.
7. The browser saves the report and history in `localStorage`. Nothing is uploaded or persisted on the server.

The demo audit follows the same path but navigates to `demo-site/index.html` with a `file://` URL and labels the result as a bundled demo.

## How local fix review works

1. Open a saved report and choose **Review fixes**.
2. AccessForge selects findings that match a deterministic template recipe. Each recipe inserts or replaces one attribute in the captured HTML.
3. A draft starts with a bracketed placeholder such as `[Describe the image purpose]`. Approval stays disabled until the placeholder is removed or the draft is otherwise changed.
4. Saving a draft writes it to browser storage. The review queue then shows the edited state and the compare view highlights the difference.
5. Approving records the exact original and proposed HTML, the optional note, and a timestamp in the local audit trail. Rejecting and reopening use the same event log.
6. Decisions never call the scanner APIs, write files, contact GitHub, or invoke an agent. Exported review logs are downloaded from the browser as JSON.

## How approved-fix export works

1. Approve at least one draft in the current report. Pending, rejected, and changes-requested drafts are excluded.
2. Choose **Export approved bundle** to download a JSON handoff file containing report metadata, the exact approved original and proposed HTML, the decision note, timestamps, limitations, and the fragment diff.
3. Choose **Download fragment diff** to download the same fragment diff as a `.diff` text file for review.
4. The export is built entirely in the browser. Nothing is sent to a server, applied to a file, committed, or opened as a pull request.
5. The fragment diff is not an applyable Git patch. It uses synthetic `accessforge-fragments/...` paths because reports do not store source file paths or line numbers. Apply each approved change in the source repository, then re-run verification.

## Safety and operational limits

- One page per scan, with a 30-second navigation timeout, a 3-second network-idle wait, and a 25-second axe-core timeout.
- Only standard ports 80 and 443 are allowed.
- Remote pages are loaded without authentication, so login-gated content cannot be scanned.
- A maximum of 2 scans run concurrently per server process by default. Extra requests receive `BUSY`.
- Findings are capped at 10 elements per rule and 600 characters per HTML snippet.
- Automated checks cover only a subset of WCAG. Reports always direct users to keyboard, screen-reader, zoom/reflow, media, form-error, and custom-widget testing.
- The in-memory rate limiter and concurrency counter are per process. A multi-instance deployment needs shared infrastructure for those controls.

## Storage and privacy

- Scan reports and history live only in the current browser's `localStorage`.
- The dashboard reads local history; nothing is fetched back from a database.
- Reports are capped at 25 entries. Exporting a report downloads its JSON from the browser.
- Review drafts and decisions use `accessforge.review.v1`, capped at 500 events, 300 drafts, and 5,000 characters per proposed HTML. They do not sync across browsers or devices.
- Approved-fix bundles and fragment diffs are generated in the browser and downloaded as files. They are not uploaded or stored by AccessForge.
- There is no server-side account, database, or durable audit log yet. Clearing browser storage removes reports, drafts, and review history.

## Testing

```bash
npx playwright install chromium
npm run test:e2e
```

The Playwright suite covers:

- URL normalization and blocking, including private IPv4 and IPv6 ranges, metadata hosts, ports, DNS failures, and request-level guard behavior.
- Axe checks for the landing page, dashboard, scanner, agents page, fix review, and a real demo report.
- API rejection of private targets and malformed bodies.
- Deterministic review proposal generation, unsupported-rule handling, placeholder detection, and decision-state derivation.
- A full demo scan feeding a local review: edit and save a draft, approve it, download both approved-fix exports, reload to confirm persistence, and reopen the review.
- Approved-fix bundle filtering, approved-snapshot fidelity, empty exports, diff labeling, and filename safety.
- A full demo scan returning real axe-core findings and rendering the saved report page.

The config runs tests serially and starts `next dev` on `http://127.0.0.1:3100`.

The standalone `npm run demo:a11y` check does not start the dev server and is not part of the Playwright suite.

## Project layout

```text
demo-site/                 Intentional accessibility baseline and verified repaired copy
src/app/                   Next.js routes, API handlers, and pages
src/components/            Application shell, report, review, and UI components
src/lib/client/            localStorage history, review storage, and fetch helpers
src/lib/review/            Deterministic fix recipes and review state derivation
src/lib/scanner/           URL guard, axe orchestration, WCAG and remediation data
src/lib/server/            API helpers and rate limiting
tests/                     Playwright and axe test suite
```

## Configuration

| Variable | Default | Purpose |
| --- | --- | --- |
| `ACCESSFORGE_MAX_CONCURRENT_SCANS` | `2` | Maximum concurrent browser scans in one server process. |
| `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH` | Playwright default | Use a system Chromium instead of the downloaded build. |
| `PLAYWRIGHT_NO_SANDBOX` | unset | Set to `true` only in a trusted container that requires `--no-sandbox`. |

## Deployment notes

The scanner needs a long-lived Node.js runtime with Chromium installed. Serverless and edge runtimes that cannot bundle or launch Chromium are not supported. Run `npx playwright install --with-deps chromium` in the deployment image, keep the endpoint rate-limited at the edge as well, and consider a dedicated browser worker for production traffic.

AccessForge is a Phase 3A implementation, not a compliance certification service.
