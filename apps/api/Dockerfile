FROM node:22-alpine

WORKDIR /app

# We copy workspace manifests first so Docker can cache dependency installs.
COPY package.json package-lock.json tsconfig.base.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json

RUN npm ci

COPY . .

# Prisma client generation has to happen after the schema is present so the
# runtime image uses the exact checked-in Prisma data model.
RUN npm run prisma:generate --workspace @artboard/api
RUN npm run build --workspace @artboard/api

EXPOSE 4000

CMD ["npm", "run", "start:railway", "--workspace", "@artboard/api"]
