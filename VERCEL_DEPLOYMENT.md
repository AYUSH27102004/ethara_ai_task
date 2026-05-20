# Vercel Deployment Guide

This project can be deployed on Vercel as two separate projects from the same GitHub repository:

- `server`: Express API running as a Vercel Function
- `client`: React + Vite frontend served as a static app

You also need an external PostgreSQL database such as Neon, Supabase, Prisma Postgres, or any hosted Postgres provider. Vercel does not automatically create the database for this Express/Prisma API.

## 1. Prepare a PostgreSQL Database

Create a hosted PostgreSQL database first and copy its connection string.

Use the pooled/serverless connection string if your provider offers one. It usually looks like:

```env
postgresql://USER:PASSWORD@HOST:PORT/DATABASE?sslmode=require
```

You will use this as `DATABASE_URL` in the Vercel backend project.

## 2. Deploy the Backend Project

1. Open Vercel.
2. Click **Add New -> Project**.
3. Import `AYUSH27102004/ethara_ai_task`.
4. In project settings, set **Root Directory** to:

```text
server
```

5. Keep the install command as default.
6. The backend `server/vercel.json` sets the build command to:

```bash
npm run vercel-build
```

7. Add these environment variables:

```env
DATABASE_URL=your-postgres-connection-string
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
```

8. Deploy.

Run production migrations separately from your local machine after setting `DATABASE_URL` to the same hosted database:

```bash
cd server
npm run prisma:generate
npx prisma migrate deploy
```

After deployment, open:

```text
https://your-backend-project.vercel.app/
```

Expected response:

```text
API is running...
```

Your backend API base URL will be:

```text
https://your-backend-project.vercel.app/api
```

## 3. Deploy the Frontend Project

1. Click **Add New -> Project** again.
2. Import the same GitHub repository.
3. Set **Root Directory** to:

```text
client
```

4. Vercel should detect Vite automatically.
5. Use these settings if Vercel asks:

| Setting | Value |
| --- | --- |
| Framework Preset | Vite |
| Build Command | `npm run build` |
| Output Directory | `dist` |

6. Add this environment variable:

```env
VITE_API_URL=https://your-backend-project.vercel.app/api
```

7. Deploy.

The frontend `client/vercel.json` includes a rewrite to `index.html` so React Router routes like `/dashboard`, `/projects`, and `/profile` work on refresh.

## 4. Seed Demo Data

The seed script deletes existing data first. Only run it once if you want demo accounts.

Run locally against your production database only if you are okay resetting demo data:

```bash
cd server
npm run prisma:seed
```

Seeded users:

| Role | Email | Password |
| --- | --- | --- |
| Admin | `admin@gmail.com` | `task123#` |
| Member | `member1@gmail.com` | `task123#` |
| Member | `member2@gmail.com` | `task123#` |
| Member | `member3@gmail.com` | `task123#` |

## 5. Common Issues

### Frontend API calls fail

- Confirm `VITE_API_URL` points to the backend Vercel URL and includes `/api`.
- Redeploy the frontend after changing `VITE_API_URL`.
- Confirm the backend root URL returns `API is running...`.

### Backend deploy fails during Prisma

- Confirm `DATABASE_URL` is present in backend environment variables.
- Confirm your database accepts connections from Vercel.
- Confirm the database URL includes SSL if your provider requires it.
- If build fails with `P1001`, run migrations locally with `npx prisma migrate deploy` and keep Vercel's build command as `npm run vercel-build`.

### Login fails after deploy

- Confirm `JWT_SECRET` is present in backend environment variables.
- Confirm migrations completed during backend deploy.
- Seed the database once if you want the demo users.
