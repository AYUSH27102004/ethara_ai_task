# Railway Deployment Guide

This project is a small monorepo with two deployable services:

- `server`: Express + Prisma API from the `server/` folder
- `client`: React + Vite frontend from the `client/` folder

You will also need one Railway PostgreSQL database service.

## 1. Push Latest Code

Make sure the latest code is on GitHub before importing it in Railway:

```bash
git push origin main
```

## 2. Create a Railway Project

1. Open Railway and create a new project.
2. Choose **Deploy from GitHub repo**.
3. Select `AYUSH27102004/ethara_ai_task`.
4. Add a PostgreSQL service from the Railway project canvas.

Railway's PostgreSQL service exposes `DATABASE_URL`, which Prisma can use directly.

## 3. Deploy the Backend Service

Create a service from the same GitHub repo and configure it like this:

| Setting | Value |
| --- | --- |
| Service name | `server` |
| Root Directory | `/server` |
| Start Command | `npm run railway:start` |

Add these variables to the `server` service:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
JWT_SECRET=replace-with-a-long-random-secret
NODE_ENV=production
```

If your PostgreSQL service has a different name, use that service name in the reference variable. For example, if it is named `PostgreSQL`, use:

```env
DATABASE_URL=${{PostgreSQL.DATABASE_URL}}
```

After the backend deploy succeeds, go to the backend service **Settings -> Networking** and generate a public domain.

The API URL will look like:

```text
https://your-server-domain.up.railway.app/api
```

## 4. Deploy the Frontend Service

Create another service from the same GitHub repo and configure it like this:

| Setting | Value |
| --- | --- |
| Service name | `client` |
| Root Directory | `/client` |
| Builder | Dockerfile detected automatically |

Add this variable to the `client` service before deploying or redeploying:

```env
VITE_API_URL=https://your-server-domain.up.railway.app/api
```

The frontend Dockerfile declares `VITE_API_URL` as a build argument so Vite can bake the API URL into the browser bundle during `npm run build`.

Then deploy the frontend service and generate a public domain from **Settings -> Networking**.

## 5. Optional: Seed Demo Data

Do not run the seed script automatically in production because it clears existing data first.

If you want the demo users on Railway, run the seed command once against the Railway database:

```bash
cd server
npm run prisma:seed
```

Only do this when `DATABASE_URL` points to the Railway database and you are okay with resetting demo data.

Seed users all use:

```text
task123#
```

## 6. Verify Deployment

Backend:

```text
https://your-server-domain.up.railway.app/
```

Expected response:

```text
API is running...
```

Frontend:

```text
https://your-client-domain.up.railway.app
```

Login with:

```text
admin@gmail.com
task123#
```

## 7. Common Issues

### Frontend shows network/API errors

- Confirm `VITE_API_URL` includes `/api`
- Confirm it points to the backend public Railway domain
- Redeploy the frontend after changing `VITE_API_URL`

### Backend fails on Prisma

- Confirm `DATABASE_URL` is set on the backend service
- Confirm the reference variable uses the exact PostgreSQL service name
- Check backend deploy logs for migration errors

### Login works locally but not on Railway

- Confirm `JWT_SECRET` is set on the backend service
- Confirm frontend `VITE_API_URL` points to Railway, not localhost
- Confirm the Railway database has been migrated and optionally seeded
