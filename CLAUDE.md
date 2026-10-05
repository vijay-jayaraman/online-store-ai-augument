# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project status

A single-seller PDF e-book store (MERN, INR, Razorpay) built as an npm workspaces monorepo. Development follows the issues in `docs/MILESTONES.md` in order. M0-01 (repository root tooling), M0-02 (`packages/shared`), and M0-03 (`apps/api` skeleton) are done. `apps/store`, `apps/admin`, and `e2e` do not exist yet; issues M0-05 to M0-08 create them. API tests (Vitest, Supertest) arrive in M0-04, so `apps/api` has no `test` script yet.

The API reads `apps/api/.env` (copy `apps/api/.env.example`) and needs MongoDB and Redis running locally. Until `deploy/compose.local.yml` exists (M2), start them with Docker: `docker run -d -p 27017:27017 mongo:8` and `docker run -d -p 6379:6379 redis:8`. Health check: `GET http://localhost:4000/api/v1/health`.

**Read first:**

- `docs/SRS.md`: the requirements (IDs like `PAY-08`, `SEC-07`), the pinned package versions (§7), and the target folder structure (§7.4).
- `docs/MILESTONES.md`: each issue's tasks, acceptance criteria, and test criteria.
- `docs/ISSUES.md`: the same issues as a table with labels and dependencies. These are GitHub issues #1–#79, numbered in M0-01 to M15-06 order.

## Commands

Run from the repository root. Node 24 (`.nvmrc`), npm 11.

```bash
npm ci                     # install all workspaces
npm run dev                # start every workspace with a "dev" script, in parallel
npm run lint               # ESLint 10 on the whole repo (lint:fix to fix)
npm run format:check       # Prettier check (format to write)
npm test                   # "test" in every workspace that defines it
npm run test:coverage
npm run test:e2e           # "test:e2e" in every workspace that defines it

npm run dev -w apps/api    # one workspace
npm test -w apps/api -- tests/unit/pricing.test.js -t "applies tax"   # one test file or test name (Vitest)
```

`dev`, `test`, `test:coverage`, and `test:e2e` go through `scripts/run-workspaces.js`:

- It runs the script only in workspaces that define a script with that exact name.
- It exits 0 when no workspace defines it.
- So a new workspace must define `dev` / `test` / `test:coverage` (and `e2e` must define `test:e2e`), or the root script silently skips it.
- It exists because `npm run --workspaces --if-present` fails with "No workspaces found!" when there are none, and because npm runs workspace scripts one at a time.

## Lint and format

- Flat config in `eslint.config.js`:
  - `apps/store` and `apps/admin`: `react-hooks`, `react-refresh`, browser globals.
  - API, `packages/`, `e2e/`, `scripts/` and root config files: `eslint-plugin-n`, Node globals.
  - `eslint-config-prettier` stays last.
- Do not add `eslint-plugin-react` or `eslint-plugin-jsx-a11y`. Their releases do not support ESLint 10 and break `npm ci` with a peer dependency conflict.
- `docs/`, `mock_ui/`, and `Notes/` are reference material, excluded from both ESLint and Prettier.
- Prettier: single quotes, semicolons, trailing commas, print width 100. Line endings are LF (`.gitattributes`).
- Everything is ES modules (`"type": "module"`). The codebase is JavaScript (`.js`/`.jsx`), not TypeScript.

## Architecture (target, from SRS §1–§7)

- **Apps and ports:**
  - `apps/store` (buyer SPA): 5173
  - `apps/admin` (seller SPA): 5174
  - `apps/api` (Express 5 REST API): 4000, routes under `/api/v1`
  - Both SPAs use React 19 + Vite 8, Redux Toolkit/RTK Query and Tailwind 4 + daisyUI 5. They are static builds served by Caddy, which also reverse-proxies the API.
- **Shared validation:**
  - Zod schemas and constants live only in `packages/shared` (`@bookstore/shared`).
  - The API and both frontends import them from there; never redefine a schema inside an app.
  - Every request body, query, and param is validated.
  - API errors always use `{ error: { code, message, details } }`.
- **API layout:**
  - `src/modules/<group>/` with `*.routes.js`, `*.controller.js`, `*.service.js`.
  - Mongoose models in `src/models/` (one per collection, SRS §6).
  - `app.js` is separate from `server.js`, so Supertest can test the app without opening a port.
  - `worker.js` is a separate entry point for BullMQ jobs (emails, invoices, webhook side effects, expiring pending orders).
  - The API and worker are the same Docker image run with different commands.
- **Frontend state:**
  - Server data lives only in RTK Query with cache tags.
  - Client state (auth user and access token, guest cart, UI flags) lives in Redux slices.
  - The guest cart is persisted to localStorage via `createListenerMiddleware`.
  - A shared base query refreshes the token on 401 and retries once.
  - Zustand and TanStack libraries are out of scope.
- **Auth:**
  - Google One Tap with a button fallback. The API verifies the Google ID token server-side.
  - The access token lasts about 15 minutes. The refresh token is an httpOnly cookie, rotated on every refresh and revoked on logout.
  - The admin is identified by an email allowlist, and the `admin` role is checked on every admin route.
  - End-to-end tests sign in through `POST /auth/test-login`, which exists only when `NODE_ENV === "test"`.
- **Payments (Razorpay):**
  - Prices and tax always come from the database, never from the client.
  - The verified `payment.captured` webhook is the only thing that marks an order `paid` and creates entitlements. Its signature is checked against the **raw** body.
  - Webhook processing must be idempotent.
- **Files (Cloudflare R2):**
  - The admin uploads directly to R2 through signed upload URLs.
  - Full PDFs are never public. Downloads use 5-minute signed URLs, issued only after an entitlement check, with download limits and logging.
- **Cross-cutting:**
  - Redis-backed rate limits on auth, checkout, download, and upload-signing routes.
  - From M6 onward, every admin create, update, delete, refund, or block action writes an audit log entry.

## Testing

- Vitest everywhere; Supertest + `mongodb-memory-server` for API integration tests.
- Testing Library + jsdom + MSW for component tests; Playwright in `e2e/` with `STORE_URL`, `ADMIN_URL`, and `API_URL`.
- Each issue's **Test criteria** in MILESTONES.md lists the tests that must exist before it is closed.
- Required test cases are TC-01 to TC-10 in SRS §8.3.

## Workflow

- One issue per branch and pull request.
  - Branch names: `feat/M5-02-google-sign-in`, `fix/...`, `chore/...`.
  - The pull request title starts with the issue ID, e.g. `M0-01 · ...`.
  - Squash merge into `main`.
  - Create the branch with `gh issue develop <n> --name <branch> --checkout` so it is linked to the issue.
- Commits follow Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`).
- If an issue's scope changes, edit `docs/MILESTONES.md` first, then `docs/ISSUES.md` and the GitHub issue body.
- When a milestone is complete, tag `main` as `v0.<milestone+1>.0`.
- New environment variables go in `.env.example` (root and per app). Real `.env` files are git-ignored.
- `mock_ui/` is a static HTML/CSS/JS UI mockup ("Page & Pine") to use as the visual reference for the store and admin apps.
- The development machine is Windows, with PowerShell as the default shell.
