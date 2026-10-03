# Digital Book Store

A PDF e-book store built on the MERN stack: a buyer store app, a seller admin app, and a REST API, in one npm workspaces monorepo.

- Requirements: [docs/SRS.md](docs/SRS.md)
- Milestones and issues: [docs/MILESTONES.md](docs/MILESTONES.md), [docs/ISSUES.md](docs/ISSUES.md)

## Prerequisites

- Node.js 24 (see `.nvmrc`). With nvm: `nvm use`
- npm 11 (comes with Node.js 24)

## Setup

```bash
git clone https://github.com/vijay-jayaraman/online-store-ai-augument.git
cd online-store-ai-augument
npm install
cp .env.example .env
```

Fill in `.env` with local values. Real `.env` files are never committed.

## Scripts

Run from the repository root.

| Script                  | What it does                                                  |
| ----------------------- | ------------------------------------------------------------- |
| `npm run dev`           | Starts every app that has a `dev` script, in parallel         |
| `npm run lint`          | Runs ESLint on the whole repository                           |
| `npm run lint:fix`      | Runs ESLint and fixes what it can                             |
| `npm run format`        | Formats all files with Prettier                               |
| `npm run format:check`  | Checks formatting without changing files (used in CI)         |
| `npm test`              | Runs unit, component, and integration tests in all workspaces |
| `npm run test:coverage` | Runs the tests with coverage                                  |
| `npm run test:e2e`      | Runs the Playwright end-to-end tests                          |

The `dev` and test scripts run in every workspace that defines them, and do nothing until the apps exist.

## Repository layout

```
apps/
  api/        REST API (Express)            http://localhost:4000
  store/      Buyer app (React + Vite)      http://localhost:5173
  admin/      Seller app (React + Vite)     http://localhost:5174
packages/
  shared/     Zod schemas and constants used by all three apps
e2e/          Playwright end-to-end tests
scripts/      Repository helper scripts
docs/         SRS, milestones, and issue list
```

The full planned structure is in [SRS Section 7.4](docs/SRS.md#74-repository-folder-structure).

## Conventions

- Branches: `feat/M5-02-google-sign-in`, `fix/...`, `chore/...`
- Commits: [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `test:`, `chore:`, `docs:`)
- Pull requests: one issue per pull request, title starts with the issue ID, squash merge
- `docs/`, `mock_ui/`, and `Notes/` are reference material and are excluded from ESLint and Prettier.
