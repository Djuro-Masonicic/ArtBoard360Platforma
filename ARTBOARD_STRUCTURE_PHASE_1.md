# ArtBoard / Art Studio 360 Structure - Phase 1

This file records the first routing step for the new structure, without replacing the current working app.

## Current Decision

ArtBoard remains the active platform inside this repository. Art Studio 360 can later become a separate public studio site or a separate route group, but we should not break the current artist, admission, dashboard and portfolio builder flows.

## Added Route Bridges

- `/umjetnici` renders the existing artists page from `/artists`.
- `/umjetnik/[slug]` renders the existing artist profile from `/artists/[slug]`.
- `/artboard` is the public overview page for the ArtBoard platform/product.
- `/usluge` is the public services page for the Art Studio 360 business side.
- `/registracija` redirects to the current `/prijava` flow for now.
- `/prijava-umjetnika` redirects to `/prijava` for clearer future naming.
- `/nalog` redirects to `/artist/dashboard`.
- `/uredi-profil` redirects to `/artist/dashboard`.
- `/pretplata` redirects to `/artist/subscription`.
- `/oglasi` is a placeholder page for future calls, jobs and opportunities.
- `/paketi` is a public package/membership page that points users toward artist application and subscription management.
- `/uslovi-koriscenja` is a placeholder legal page so the footer no longer points to a dead anchor.

## Why This Step Matters

The new business plan needs cleaner public URLs, but the project already has working functionality. These bridge routes let us start using the new structure gradually, while preserving existing APIs, forms and dashboards.

## Suggested Next Step

Create a real ArtBoard homepage section map:

- hero
- artists
- portfolio builder
- benefits/packages
- opportunities/jobs
- FAQ
- final CTA

After that, build the real `/oglasi` data model and admin workflow.
