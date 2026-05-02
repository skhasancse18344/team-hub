# Team Hub

A collaborative team management platform built as a Turborepo monorepo.

## Stack

| Layer | Technology |
|---|---|
| Monorepo | Turborepo + npm workspaces |
| Frontend | Next.js 14 (App Router, JS) |
| Backend | Node.js + Express + TypeScript |
| Database | PostgreSQL + Prisma 7 |
| Auth | JWT (httpOnly cookies) + bcrypt |
| Real-time | Socket.io |

## Repository Structure

```
team-hub/
├── apps/
│   ├── web/          # Next.js 14 frontend  → http://localhost:3000
│   └── api/          # Express REST API     → http://localhost:4000
└── packages/
    ├── eslint-config/       # Shared ESLint rules
    ├── typescript-config/   # Shared tsconfig bases
    └── ui/                  # Shared React components
```

## Getting Started

### Prerequisites

- Node.js >= 18
- PostgreSQL running locally

### Setup

```bash
# 1. Clone and install
git clone https://github.com/skhasancse18344/team-hub.git
cd team-hub
npm install

# 2. Configure environment variables
cp .env.example apps/api/.env
cp .env.example apps/web/.env.local
# Then edit each file with your real values

# 3. Run database migrations
cd apps/api
npm run db:migrate

# 4. Start all apps in parallel (from root)
cd ../..
npm run dev
```

## Environment Variables

See [`.env.example`](.env.example) for all required variables.

| Variable | App | Description |
|---|---|---|
| `DATABASE_URL` | api | PostgreSQL connection string |
| `JWT_ACCESS_SECRET` | api | Secret for signing access tokens |
| `JWT_REFRESH_SECRET` | api | Secret for signing refresh tokens |
| `PORT` | api | API server port (default `4000`) |
| `CLIENT_URL` | api | Allowed CORS origin |
| `NODE_ENV` | api | `development` or `production` |
| `NEXT_PUBLIC_API_URL` | web | API base URL for browser requests |
| `NEXT_PUBLIC_WS_URL` | web | WebSocket server URL |

## Scripts

Run from the **root** of the monorepo:

```bash
npm run dev            # Start all apps in parallel
npm run build          # Build all apps (respects dependency order)
npm run lint           # Lint all packages
npm run check-types    # TypeScript check all packages
npm run format         # Prettier format everything
npm run format:check   # Prettier check (CI)
npm run clean          # Delete all build outputs
```

Run from **`apps/api`**:

```bash
npm run db:migrate          # Create + apply a new migration (dev)
npm run db:migrate:deploy   # Apply pending migrations (production)
npm run db:migrate:reset    # Reset DB and re-apply all migrations (dev only)
npm run db:generate         # Regenerate Prisma Client after schema changes
npm run db:studio           # Open Prisma Studio (visual DB browser)
npm run db:push             # Sync schema without a migration file (prototyping)
```

## API Reference

See [`apps/api/README.md`](apps/api/README.md) for full endpoint documentation.

## License

ISC

- [TypeScript](https://www.typescriptlang.org/) for static type checking
- [ESLint](https://eslint.org/) for code linting
- [Prettier](https://prettier.io) for code formatting

### Build

To build all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo build
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo build
npm dlx turbo build
npm exec turbo build
```

You can build a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo build --filter=docs
```

Without global `turbo`:

```sh
npx turbo build --filter=docs
npm exec turbo build --filter=docs
npm exec turbo build --filter=docs
```

### Develop

To develop all apps and packages, run the following command:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo dev
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo dev
npm exec turbo dev
npm exec turbo dev
```

You can develop a specific package by using a [filter](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters):

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo dev --filter=web
```

Without global `turbo`:

```sh
npx turbo dev --filter=web
npm exec turbo dev --filter=web
npm exec turbo dev --filter=web
```

### Remote Caching

> [!TIP]
> Vercel Remote Cache is free for all plans. Get started today at [vercel.com](https://vercel.com/signup?utm_source=remote-cache-sdk&utm_campaign=free_remote_cache).

Turborepo can use a technique known as [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching) to share cache artifacts across machines, enabling you to share build caches with your team and CI/CD pipelines.

By default, Turborepo will cache locally. To enable Remote Caching you will need an account with Vercel. If you don't have an account you can [create one](https://vercel.com/signup?utm_source=turborepo-examples), then enter the following commands:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed (recommended):

```sh
cd my-turborepo
turbo login
```

Without global `turbo`, use your package manager:

```sh
cd my-turborepo
npx turbo login
npm exec turbo login
npm exec turbo login
```

This will authenticate the Turborepo CLI with your [Vercel account](https://vercel.com/docs/concepts/personal-accounts/overview).

Next, you can link your Turborepo to your Remote Cache by running the following command from the root of your Turborepo:

With [global `turbo`](https://turborepo.dev/docs/getting-started/installation#global-installation) installed:

```sh
turbo link
```

Without global `turbo`:

```sh
npx turbo link
npm exec turbo link
npm exec turbo link
```

## Useful Links

Learn more about the power of Turborepo:

- [Tasks](https://turborepo.dev/docs/crafting-your-repository/running-tasks)
- [Caching](https://turborepo.dev/docs/crafting-your-repository/caching)
- [Remote Caching](https://turborepo.dev/docs/core-concepts/remote-caching)
- [Filtering](https://turborepo.dev/docs/crafting-your-repository/running-tasks#using-filters)
- [Configuration Options](https://turborepo.dev/docs/reference/configuration)
- [CLI Usage](https://turborepo.dev/docs/reference/command-line-reference)
