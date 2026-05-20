# Ethara AI Task

Ethara AI Task is a full-stack task, project, and performance management application. It gives admins a workspace for managing members, projects, task assignment, reviews, and performance activity, while members get a focused dashboard for their assigned work, status progress, review history, and profile insights.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Frontend | React, Vite, Tailwind CSS, React Router, Axios, Lucide React |
| Backend | Node.js, Express, Prisma, JWT, bcrypt |
| Database | PostgreSQL |
| Tooling | npm, Prisma Migrate, ESLint |

## Main Features

- JWT-based login and signup
- Role-based access for `ADMIN` and `MEMBER`
- Admin dashboard with project, task, member, overdue, and rating summaries
- Member dashboard with assigned tasks, task status groups, activity, ratings, and review trends
- Project creation and project member assignment
- Task creation, assignment, status updates, priority, due dates, and overdue tracking
- Task history and activity logging
- Member profile page with task and review statistics
- Admin member management
- Admin performance reviews with ratings, feedback, strengths, and improvement areas
- Prisma migrations and seed data for a ready-to-test local database

## Project Structure

```text
ethara_ai/
  client/
    src/
      api/              Axios API client
      components/       Shared route/layout/modal components
      context/          Auth context and session state
      pages/            Dashboard, projects, users, profile, auth pages
    public/             Static frontend assets
    package.json

  server/
    middleware/         Auth and admin authorization middleware
    prisma/
      migrations/       Database migration history
      schema.prisma     Prisma models and enums
      seed.js           Demo data seed script
    routes/             Express API routes
    index.js            API entry point
    prisma.js           Prisma client instance
    package.json
```

## Application Workflow

### 1. Authentication

Users can sign up or log in from the frontend. After login, the backend returns a JWT containing the user's id, email, role, and team id. The frontend stores the token and sends it with future API requests using the Axios interceptor in `client/src/api/axios.js`.

Protected routes require a valid token. Admin-only routes also require the user role to be `ADMIN`.

### 2. Admin Workflow

Admins can:

- View organization-level dashboard metrics
- Create projects
- Add members to projects
- Create and assign tasks to project members
- View all users
- Create, edit, and delete members
- Review member performance
- Track task activity, status changes, overdue work, and average ratings

Typical admin flow:

```text
Login as admin
  -> Open Dashboard
  -> Create or inspect projects
  -> Add members to a project
  -> Create tasks and assign them
  -> Review members from the Users page
  -> Monitor task progress and performance from Dashboard/Profile views
```

### 3. Member Workflow

Members can:

- View assigned tasks
- Move tasks through allowed status progressions
- See overdue and upcoming work
- Open task details
- View received reviews and rating trends
- Check their profile statistics and activity

Typical member flow:

```text
Login as member
  -> Open Dashboard
  -> Review assigned tasks
  -> Move tasks from Todo to In Progress to Done
  -> Check activity and review feedback
  -> Open Profile for personal performance summary
```

### 4. Task Lifecycle

Tasks use this status flow:

```text
TODO -> IN_PROGRESS -> DONE
```

Each task can include:

- Title and description
- Priority: `Low`, `Medium`, or `High`
- Due date
- Assigned member
- Project
- Creator
- Status history
- Activity log entries

When a task is assigned, updated, or completed, the server writes supporting history/activity records so dashboards can show meaningful progress.

### 5. Review and Performance Workflow

Admins can create reviews for members. A review includes:

- Numeric rating from 1 to 5
- Performance mark: `EXCEEDS`, `MEETS`, or `NEEDS_IMPROVEMENT`
- Feedback
- Strengths
- Improvement areas

Reviews are used on member dashboards and profile pages to show performance summaries, recent feedback, and rating trends.

## Database Models

The Prisma schema includes these main models:

- `Team`
- `User`
- `Project`
- `Task`
- `Review`
- `ActivityLog`
- `TaskHistory`

Important enums:

- `Role`: `ADMIN`, `MEMBER`
- `TaskStatus`: `TODO`, `IN_PROGRESS`, `DONE`
- `PerformanceMark`: `EXCEEDS`, `MEETS`, `NEEDS_IMPROVEMENT`
- `ActivityType`: task assignment, status updates, task completion, reviews, rating updates

## API Overview

The server runs on `http://localhost:5000` by default. API routes are mounted under `/api`.

| Area | Endpoint |
| --- | --- |
| Auth | `POST /api/auth/signup` |
| Auth | `POST /api/auth/login` |
| Users | `GET /api/users` |
| Users | `GET /api/users/me` |
| Users | `POST /api/users` |
| Users | `GET /api/users/:id` |
| Users | `PUT /api/users/:id` |
| Users | `DELETE /api/users/:id` |
| Projects | `GET /api/projects` |
| Projects | `POST /api/projects` |
| Projects | `GET /api/projects/:id` |
| Projects | `PUT /api/projects/:id` |
| Projects | `DELETE /api/projects/:id` |
| Projects | `POST /api/projects/:id/members` |
| Tasks | `GET /api/tasks` |
| Tasks | `POST /api/tasks` |
| Tasks | `GET /api/tasks/:id` |
| Tasks | `PUT /api/tasks/:id` |
| Tasks | `DELETE /api/tasks/:id` |
| Dashboard | `GET /api/dashboard/admin` |
| Dashboard | `GET /api/dashboard/member` |
| Reviews | `GET /api/reviews` |
| Reviews | `POST /api/reviews` |

Most routes require an `Authorization: Bearer <token>` header. Admin management routes require an admin token.

## Local Setup

### Prerequisites

- Node.js 18.18 or newer
- npm
- PostgreSQL database

### 1. Clone the Repository

```bash
git clone https://github.com/AYUSH27102004/ethara_ai_task.git
cd ethara_ai_task
```

### 2. Install Dependencies

Install frontend dependencies:

```bash
cd client
npm install
```

Install backend dependencies:

```bash
cd ../server
npm install
```

### 3. Configure Environment Variables

Create local env files from the examples.

PowerShell:

```powershell
Copy-Item client/.env.example client/.env
Copy-Item server/.env.example server/.env
```

Bash:

```bash
cp client/.env.example client/.env
cp server/.env.example server/.env
```

Update `server/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE?schema=public"
JWT_SECRET="replace-with-a-long-random-secret"
PORT=5000
```

Update `client/.env` only if your API URL is different:

```env
VITE_API_URL=http://localhost:5000/api
```

Real `.env` files are intentionally ignored by git.

### 4. Prepare the Database

From the `server` folder:

```bash
npm run prisma:generate
npm run prisma:migrate
npm run prisma:seed
```

The seed script resets the demo data and creates one team, one admin, three members, a project, tasks, task history, activity logs, and reviews.

### 5. Start the Backend

From the `server` folder:

```bash
npm start
```

The API should be available at:

```text
http://localhost:5000
```

### 6. Start the Frontend

Open a second terminal:

```bash
cd client
npm run dev
```

Vite will print the local frontend URL, usually:

```text
http://localhost:5173
```

## Demo Login Credentials

All seeded users use this password:

```text
task123#
```

| Role | Email |
| --- | --- |
| Admin | `admin@gmail.com` |
| Member | `member1@gmail.com` |
| Member | `member2@gmail.com` |
| Member | `member3@gmail.com` |

## Useful Scripts

### Client

| Command | Purpose |
| --- | --- |
| `npm run dev` | Start Vite development server |
| `npm run build` | Build frontend for production |
| `npm run lint` | Run ESLint |
| `npm run preview` | Preview production build locally |

### Server

| Command | Purpose |
| --- | --- |
| `npm start` | Start Express API |
| `npm run dev` | Start Express API |
| `npm run prisma:generate` | Generate Prisma client |
| `npm run prisma:migrate` | Run local development migrations |
| `npm run prisma:seed` | Seed demo data |

## Deployment Notes

For a Vercel deployment walkthrough, see [`VERCEL_DEPLOYMENT.md`](./VERCEL_DEPLOYMENT.md).

Backend deployment checklist:

- Provision a PostgreSQL database
- Set `DATABASE_URL`
- Set a strong `JWT_SECRET`
- Set `PORT` if required by the host
- Run migrations with `npx prisma migrate deploy`
- Run `npx prisma generate` during build or postinstall if needed

Frontend deployment checklist:

- Build with `npm run build`
- Set `VITE_API_URL` to the deployed backend API URL, including `/api`
- Deploy the generated `client/dist` output

## Git Hygiene

The repository includes a root `.gitignore` that excludes:

- `node_modules`
- frontend build output such as `client/dist`
- real `.env` files
- logs, caches, local database files, and editor artifacts

Only `.env.example` files are committed so other developers can configure their own local environments safely.

## Troubleshooting

If the frontend cannot reach the backend:

- Confirm the backend is running on port `5000`
- Confirm `client/.env` has `VITE_API_URL=http://localhost:5000/api`
- Restart the Vite dev server after changing `.env`

If Prisma cannot connect:

- Check `DATABASE_URL` in `server/.env`
- Confirm PostgreSQL is running
- Run `npm run prisma:generate`
- Run `npm run prisma:migrate`

If login fails with seeded accounts:

- Re-run `npm run prisma:seed`
- Use password `task123#`
- Confirm the API server is using the same database that was seeded
