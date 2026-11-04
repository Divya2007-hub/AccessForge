# Bundled demo website

`index.html` is a fictional page used by the AccessForge demo audit. It is served at `/demo-site` for human viewing and scanned directly from disk with a `file://` URL by the API.

It is intentionally inaccessible. Do not use it as a template for production work.

## Files

- `index.html` is the intentionally inaccessible baseline. It is unchanged.
- `index.repaired.html` is a verified "after" copy for comparison. It adds alt text to the hero image, empty alt text to decorative product images, and turns the header search icon into a named link that moves focus to the search form.

## Reproducing the comparison

```bash
npm install
npx playwright install chromium
npm run demo:a11y
```

The comparison loads both files directly with `file://` and runs the same axe-core WCAG 2.0, 2.1, and 2.2 A/AA tags as the test suite.

| File | Expected result |
| --- | --- |
| `index.html` | 6 violations across 19 elements: `button-name`, `color-contrast`, `html-has-lang`, `image-alt`, `link-name`, `select-name` |
| `index.repaired.html` | 4 violations across 14 elements: `color-contrast`, `html-has-lang`, `link-name`, `select-name` |

The repaired copy also passes the keyboard path: search link → Enter → `FORM#gear-search` → Tab → search input. At 375x667 the search link stays visible while the Gear, Guides, and Journal links are hidden.

## Intentional failures in the baseline

- The `<html>` element has no `lang` attribute.
- Hero and product images have no `alt` attribute.
- An icon-only button has no accessible name.
- The region `<select>` has no label.
- Several text and link colors fall below WCAG AA contrast.
- The page includes a skipped heading level.
- Some content sits outside landmark regions.
- A link with only an icon has no accessible text.

## Remaining limitations

`index.repaired.html` still has `color-contrast`, `html-has-lang`, `link-name` (the footer icon link), and `select-name` violations. It also keeps the skipped heading level and landmark issues that axe-core does not report as violations. The repaired copy demonstrates two fixes; it is not a fully accessible page or a compliance certificate. Automated checks cover only part of WCAG, so manual keyboard, screen-reader, zoom/reflow, and form testing are still required.

## Real scans

The demo audit uses the same Playwright and axe-core pipeline as a remote scan. Findings, counts, selectors, and failure summaries are produced by that run. The only difference is the navigation source: `demo-site/index.html` is loaded from the local filesystem and no external site is fetched.

Every demo report states that it covers one page at a 1366x900 viewport with a light color scheme, and that automated findings still require manual verification.
