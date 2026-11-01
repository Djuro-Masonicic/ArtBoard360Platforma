FROM node:22-alpine

WORKDIR /app
RUN apk add --no-cache chromium
ENV PROMOTION_CHROME_EXECUTABLE=/usr/bin/chromium

# We copy workspace manifests first so Docker can cache dependency installs.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/portfolio-document-plan/package.json packages/portfolio-document-plan/package.json
COPY packages/qr-card-renderer/package.json packages/qr-card-renderer/package.json
COPY packages/promotion-renderer/package.json packages/promotion-renderer/package.json

RUN npm ci

COPY . .

# Prisma client generation has to happen after the schema is present so the
# runtime image uses the exact checked-in Prisma data model.
RUN npm run prisma:generate --workspace @artboard/api
RUN npm run build --workspace @artboard/api

EXPOSE 4000

CMD ["npm", "run", "start:railway", "--workspace", "@artboard/api"]
