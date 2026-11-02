# Portfolio PDF delivery and editor navigation — 2026-11-02

## Fixes

- `R2StorageService` now uses the same size limit for generated PDF uploads and downloads (50 MiB by default). Previously uploads allowed 50 MiB, while downloads reused the 10 MiB image limit and returned `PDF nije dostupan u dozvoljenoj veličini.` Image upload limits, private bucket selection, PDF signature validation and owner namespace checks remain intact.
- Next portfolio PDF proxies forward the upstream response stream instead of buffering the full PDF. This applies to owner/version downloads, account/Guest previews, purchase delivery and admin/shared previews. Authentication and response privacy headers are preserved. Streaming avoids Vercel's buffered response size limit: https://vercel.com/kb/guide/how-to-bypass-vercel-body-size-limit-serverless-functions
- Changing an editor step scrolls the document to the top immediately, including desktop/mobile Next buttons. Initial mounting does not force a scroll.
- The first explicit save from the profile memory editor carries the active step to the saved project URL and uses `scroll: false`. Existing draft saves stay in the same editor tab. The destination validates the requested step against those available to that project.

## Verification

- API and web TypeScript: passed (`--noEmit --incremental false`).
- API build and isolated Next production build: passed.
- `portfolio-private-pdf.test.cjs`: 11 passed; private/legacy PDFs above 10 MiB, upload/download size agreement, oversized/headerless stream rejection, cached purchase delivery, invalid files and private namespace checks.
- `portfolio-pdf-streaming.test.cjs`: 7 passed; each PDF proxy starts delivery before the upstream stream ends and delivers the remaining 12 MiB without buffering.
- `portfolio-commerce.api.test.cjs`: 22 passed; quotas, concurrency, idempotency, historical versions, paid delivery and admin authorization.
- `portfolio-commerce.browser.cjs`: 65 checks passed, no browser runtime exceptions. Includes first-save Design tab retention, existing-save Export tab retention at 1440/390 px, all five Next transitions at both widths, and complete large PDF delivery through the real Next owner/version routes without new storage writes, versions or quota consumption.

All database tests used independent test databases; storage was in memory. No working/production database records or existing R2 objects were changed. Authenticated download of the user's specific production portfolio was not performed; no user session was available.
