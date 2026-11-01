FROM node:22-alpine

WORKDIR /app

# As with the API image, we copy workspace manifests first for cache-friendly installs.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/portfolio-document-plan/package.json packages/portfolio-document-plan/package.json
COPY packages/qr-card-renderer/package.json packages/qr-card-renderer/package.json
COPY packages/promotion-renderer/package.json packages/promotion-renderer/package.json

RUN npm ci

COPY . .

RUN npm run build --workspace @artboard/web

EXPOSE 3000

CMD ["npm", "run", "start:prod", "--workspace", "@artboard/web", "--", "--hostname", "0.0.0.0", "--port", "3000"]
