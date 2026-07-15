## Start Commands

These are the commands for starting the project locally, one by one.

### 1. Start the local database in Docker

```powershell
docker compose up -d postgres
```

### 2. Run Prisma migrations on the local database

If you are using the local Docker database, make sure your root `.env` uses:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/artboard_platforma
DIRECT_URL=postgresql://postgres:postgres@localhost:5433/artboard_platforma
```

Then run:

```powershell
npm run prisma:migrate --workspace @artboard/api
```

### 3. Start the backend in watch mode

This mode automatically reloads when you change backend files, so you do not need to restart it manually every time.

```powershell
npm run start:dev --workspace @artboard/api
```

Backend URL:

```text
http://localhost:4000
```

### 4. Start the frontend

```powershell
npm run dev --workspace @artboard/web
```

Frontend URL:

```text
http://localhost:3000
```

### 5. Optional: open Prisma Studio for the local database

```powershell
npx prisma studio --port 5555 --browser none --url "postgresql://postgres:postgres@localhost:5433/artboard_platforma"
```

Prisma Studio URL:

```text
http://localhost:5555
```

### Optional shortcuts

Start frontend + backend together:

```powershell
npm run dev
```

Stop the local database container:

```powershell
docker compose stop postgres
```

Completely remove the local database container:

```powershell
docker compose down
```
