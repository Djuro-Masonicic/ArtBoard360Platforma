# ArtBoard Platforma

This repository contains a monorepo scaffold for an artist portfolio and gallery platform migrated from Webflow CMS exports.

## Why the schema looks like this

The CSV exports show that:

- artists already contain long-form bio text, quotes, profile media, cover media, social links, and a semicolon-delimited artwork field
- testimonials are partly artist-linked and partly general partner/client feedback
- disciplines repeat across artists, so a small normalized join table is easier to query than a comma-separated string field

That led to the following core structure:

- `Artist` is the main record we render on the public site
- `Artwork` stores one row per image URL or uploaded artwork
- `Testimonial` has an optional `artistId`
- `SocialLink` stores one row per platform per artist
- `Discipline` and `ArtistDiscipline` keep filtering clean

## Monorepo layout

```text
apps/
  api/   NestJS + Prisma + Cloudflare R2 integration
  web/   Next.js App Router frontend
```

## Final infrastructure stack

- frontend: Next.js on Vercel
- backend: NestJS on Railway
- database: PostgreSQL on Railway
- ORM: Prisma
- object storage: Cloudflare R2

## Local development

1. Copy `.env.example` to `.env`.
2. Install dependencies with `npm install`.
3. Generate Prisma client with `npm run prisma:generate`.
4. Run migrations with `npm run prisma:migrate`.
5. Validate access to your configured R2 bucket with `npm run storage:setup`.
6. Import the CSV data with:
   - `npm run import:artists`
   - `npm run import:testimonials`
7. Start both apps with `npm run dev`.

## Environment strategy

### Development

- run PostgreSQL locally with Docker
- run the NestJS API locally
- run the Next.js frontend locally
- point the backend at a development Cloudflare R2 bucket or a dev-only public URL

### Staging

- deploy the backend to a Railway staging service
- deploy the frontend to a Vercel preview or staging project
- use a staging Railway Postgres database
- use a staging R2 bucket or a staging path prefix strategy

### Production

- deploy the backend to Railway
- deploy the frontend to Vercel
- use Railway Postgres production credentials
- expose R2 through a custom public domain for media URLs

## Upload flow

The current production-friendly upload flow is intentionally backend-led:

1. The browser sends the selected file and metadata to the NestJS backend.
2. The backend validates MIME type and file size.
3. The backend uploads the binary file to Cloudflare R2.
4. The backend stores only metadata and public URLs in PostgreSQL.

This keeps the code simple today while leaving room for later improvements such as:

- video uploads
- thumbnail generation
- media moderation
- image transformations

## Docker

Use `docker compose up --build` to run the local Postgres database and backend container.

If you also want the frontend container, use the optional full-stack profile:

```bash
docker compose --profile fullstack up --build
```

## Railway deployment notes

- Railway can use the included API Dockerfile directly.
- If you deploy from the monorepo root with custom commands instead of Docker overrides:
  - build command: `npm run railway:build:api`
  - start command: `npm run railway:start:api`
  - pre-deploy command for migrations: `npm run railway:migrate:api`
- Railway injects `PORT` automatically, and the Nest app now respects it.

## Vercel deployment notes

- Point the Vercel project root to `apps/web`, or configure it as a monorepo project in the dashboard.
- Set `API_BASE_URL` and `NEXT_PUBLIC_API_BASE_URL` to the public Railway backend URL.
- For local syncing with deployed env vars, use `vercel env pull`.

## CSV migration notes

- the artist CSV contains `73` artist rows
- the import process infers `1087` artwork rows from the image URL list
- `16` testimonials can be linked back to artist records by slug or normalized name
- the remaining testimonials are stored as general platform feedback with `artistId = null`
