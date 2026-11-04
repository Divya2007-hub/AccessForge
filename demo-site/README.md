# Bundled demo website

`index.html` is a fictional page used by the AccessForge demo audit. It is served at `/demo-site` for human viewing and scanned directly from disk with a `file://` URL by the API.

It is intentionally inaccessible. Do not use it as a template for production work.

## Intentional failures

- The `<html>` element has no `lang` attribute.
- Hero and product images have no `alt` attribute.
- An icon-only button has no accessible name.
- The region `<select>` has no label.
- Several text and link colors fall below WCAG AA contrast.
- The page includes a skipped heading level.
- Some content sits outside landmark regions.
- A link with only an icon has no accessible text.

## Real scans

The demo audit uses the same Playwright and axe-core pipeline as a remote scan. Findings, counts, selectors, and failure summaries are produced by that run. The only difference is the navigation source: `demo-site/index.html` is loaded from the local filesystem and no external site is fetched.

Every demo report states that it covers one page at a 1366x900 viewport with a light color scheme, and that automated findings still require manual verification.
