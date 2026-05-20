# Ethara AI Task

Full-stack task and performance management app built with React, Vite, Express, Prisma, and PostgreSQL.

## Tech Stack

- Client: React, Vite, Tailwind CSS, Axios, React Router
- Server: Node.js, Express, Prisma, PostgreSQL, JWT auth

## Project Structure

```text
client/   React + Vite frontend
server/   Express API, Prisma schema, migrations, and seed script
```

## Setup

Install dependencies in both apps:

```bash
cd client
npm install

cd ../server
npm install
```

Create environment files:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Update `server/.env` with your PostgreSQL connection string and a strong `JWT_SECRET`.

Run Prisma migrations and seed data:

```bash
cd server
npm run prisma:migrate
npm run prisma:seed
```

Start the API:

```bash
cd server
npm start
```

Start the frontend:

```bash
cd client
npm run dev
```

By default, the client expects the API at `http://localhost:5000/api`.

## Useful Scripts

Client:

```bash
npm run dev
npm run build
npm run lint
npm run preview
```

Server:

```bash
npm run start
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

## Seed Users

The seed script creates demo users with the password:

```text
task123#
```

Check `server/prisma/seed.js` for the seeded email addresses.
