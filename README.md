# TeraDoDo — Task Management + Calendar

A simple task management and calendar app.

- **Frontend**: Next.js (App Router, TypeScript, Tailwind CSS)
- **Backend**: Go REST API (chi router, JWT auth, PostgreSQL via `lib/pq`)
- **Database**: PostgreSQL
- **Local setup**: Docker Compose

## Project layout

```
.
├── backend/            Go REST API
│   ├── cmd/api/        Application entrypoint
│   ├── internal/       Config, database, handlers, middleware, models, auth
│   └── migrations/     SQL schema (auto-applied on first DB start)
├── frontend/           Next.js app
│   └── src/
│       ├── app/        Routes: /login, /register, /dashboard, /calendar
│       ├── components/ UI components
│       └── lib/        API client + auth context
└── docker-compose.yml
```

## Run locally

```bash
docker compose up --build
```

Then open:

- Frontend: http://localhost:3000
- Backend health check: http://localhost:8080/health
- PostgreSQL: localhost:5432 (user/password/db: `teradodo`)

The database schema in `backend/migrations/001_init.sql` is applied automatically the
first time the `db` container starts (via Postgres's `docker-entrypoint-initdb.d`).

## Features

- **Auth**: register/login with JWT; each user only sees tasks they created or were assigned
- **Tasks**: create, edit, delete, mark complete, filter (today / upcoming / completed),
  search by title, filter by assignee
- **Assignment**: assign tasks to other users via a dropdown; shows creator and assignee
- **Calendar**: monthly view with tasks per day; click a date to see its tasks

## API

| Method | Path             | Description                          |
| ------ | ---------------- | ------------------------------------ |
| POST   | `/auth/register` | Create an account                    |
| POST   | `/auth/login`    | Log in, returns a JWT                |
| GET    | `/users`         | List users (for assignment dropdown) |
| GET    | `/tasks`         | List tasks (supports filters/search) |
| POST   | `/tasks`         | Create a task                        |
| PATCH  | `/tasks/:id`     | Update a task                        |
| DELETE | `/tasks/:id`     | Delete a task                        |

All routes except `/auth/*` and `/health` require `Authorization: Bearer <token>`.

## Environment variables

The defaults in `docker-compose.yml` work out of the box for local development.
For reference:

| Variable               | Used by  | Default (local)                                                  |
| ---------------------- | -------- | ---------------------------------------------------------------- |
| `DATABASE_URL`         | backend  | `postgres://teradodo:teradodo@db:5432/teradodo?sslmode=disable`  |
| `JWT_SECRET`           | backend  | `dev-secret-change-me`                                           |
| `PORT`                 | backend  | `8080`                                                           |
| `NEXT_PUBLIC_API_URL`  | frontend | `http://localhost:8080`                                          |
