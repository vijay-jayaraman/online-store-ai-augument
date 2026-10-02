# Milestones and Build Plan

## Digital Book Store — PDF E-Book Platform (MERN)

| Field | Value |
|---|---|
| Document version | 1.0 |
| Date | 28 September 2026 |
| Based on | [SRS.md](./SRS.md) v1.0 |
| Environments | Staging (from M3), Production (from M15) |
| Hosting | All apps on a VPS with Docker, behind Caddy |

---

## 1. How to Use This Document

- Each **milestone** is a GitHub milestone. Each **issue** below is one GitHub issue, and the heading is the issue title.
- Issues are numbered `M<milestone>-<number>`, for example `M9-04`. Use this ID in branch names and pull request titles.
- **SRS refs** lists the requirement IDs from the SRS that the issue delivers. **Test criteria** lists the tests that must exist and pass before the issue is closed. Test case IDs such as `TC-02` come from SRS Section 8.3.
- Work on milestones in order. Within a milestone, follow the **Depends on** field. Issues without a dependency can be worked on in parallel.
- Infrastructure milestones (M0–M4) come first so that every feature from M5 onward goes through the same flow: pull request, CI, merge to `main`, automatic deploy to staging.

### 1.1 Workflow

| Item | Convention |
|---|---|
| Branches | `main` is protected. Work on `feat/M5-02-google-sign-in`, `fix/...`, `chore/...` |
| Commits | Conventional Commits (`feat:`, `fix:`, `test:`, `chore:`, `docs:`) |
| Pull requests | One issue per pull request, title starts with the issue ID, squash merge |
| Staging deploy | Automatic on every merge to `main` (from M3) |
| Milestone release | When a milestone is complete, tag `main` as `v0.<milestone+1>.0` and write release notes |
| Production deploy | Only from `v1.0.0` onward, on a version tag, with manual approval (from M15) |

### 1.2 Labels

| Group | Labels |
|---|---|
| Type | `feature`, `infra`, `test`, `docs`, `security` |
| Area | `api`, `store`, `admin`, `shared`, `ci`, `devops` |
| Priority (from SRS) | `must`, `should`, `could` |

### 1.3 Definition of Done (applies to every issue)

- [ ] The pull request is reviewed and merged, and CI is green.
- [ ] All tests listed under **Test criteria** are written and pass, and coverage has not dropped below the thresholds set in M1-02.
- [ ] All new request inputs are validated with Zod schemas from `packages/shared`, and errors use the shape `{ error: { code, message, details } }`.
- [ ] New environment variables are added to `.env.example` and to the staging secrets.
- [ ] From M3 onward: the change is deployed to staging and checked manually.
- [ ] From M6 onward: every admin create, update, delete, refund, or block action writes an audit log entry (ADM-AU-01).

### 1.4 Environments and Domains

`<domain>` is the store's registered domain name.

| | Local | Staging | Production |
|---|---|---|---|
| Store app | `http://localhost:5173` | `https://store.staging.<domain>` | `https://<domain>` |
| Admin app | `http://localhost:5174` | `https://admin.staging.<domain>` | `https://admin.<domain>` |
| API | `http://localhost:4000` | `https://api.staging.<domain>` | `https://api.<domain>` |
| Public files (R2) | staging bucket | `https://cdn.staging.<domain>` | `https://cdn.<domain>` |
| MongoDB | Docker container | Atlas cluster (staging) | Atlas cluster (production) |
| Redis | Docker container | Managed Redis (staging) | Managed Redis (production) |
| Razorpay | Test mode | Test mode | Live mode |

### 1.5 Deployment Architecture (Staging and Production)

```
                  Internet (HTTPS 443)
                          │
                ┌─────────▼─────────┐
                │  Caddy (web)      │  automatic TLS certificates
                │  - store static   │  store.<env> → /srv/store
                │  - admin static   │  admin.<env> → /srv/admin
                │  - reverse proxy  │  api.<env>   → api:4000
                └─────────┬─────────┘
                          │ Docker network
          ┌───────────────┴───────────────┐
   ┌──────▼──────┐                 ┌──────▼──────┐
   │ api         │                 │ worker      │   same image,
   │ server.js   │                 │ worker.js   │   different command
   └──────┬──────┘                 └──────┬──────┘
          └──────────────┬────────────────┘
       MongoDB Atlas · Redis · Cloudflare R2 · Razorpay · Google · Resend
```

Deployment files live in the `deploy/` folder (see SRS Section 7.4):

| File | Purpose |
|---|---|
| `apps/api/Dockerfile` | Image for the API and the background worker |
| `deploy/web.Dockerfile` | Builds the store and admin apps and packages them into a Caddy image |
| `deploy/Caddyfile` | Domain routing, TLS, static file serving, reverse proxy |
| `deploy/compose.staging.yml`, `deploy/compose.production.yml` | Services that run on the VPS |
| `docker-compose.dev.yml` | Local MongoDB and Redis for development |

---

## 2. Milestone Overview

| # | Milestone | Release tag | Result you can demo |
|---|---|---|---|
| M0 | Foundation and test setup | `v0.1.0` | All three apps run locally, and every test suite runs with a sample test |
| M1 | CI pipeline (GitHub Actions) | `v0.2.0` | Every pull request runs lint, tests, coverage, audit, and Playwright |
| M2 | Docker | `v0.3.0` | The full stack runs locally in containers, and images are pushed to GHCR |
| M3 | Staging VPS and continuous deployment | `v0.4.0` | A merge to `main` deploys to the VPS automatically, with health check and rollback |
| M4 | Domain mapping and SSL | `v0.5.0` | Staging is reachable on its own subdomains over HTTPS |
| M5 | Authentication | `v0.6.0` | Google One Tap sign-in for buyers, admin sign-in with allowlist |
| M6 | Admin catalog and uploads | `v0.7.0` | Admin creates books and uploads PDF, sample, and cover to R2 |
| M7 | Store catalog | `v0.8.0` | Buyers browse, search, filter, and read samples |
| M8 | Cart and wishlist | `v0.9.0` | Guest cart, cart merge on sign-in, wishlist |
| M9 | Checkout and payments (Razorpay) | `v0.10.0` | Buyer pays in Razorpay test mode and the order is marked paid by webhook |
| M10 | Library and downloads | `v0.11.0` | Buyer downloads purchased PDFs through signed URLs |
| M11 | Orders, emails, invoices, profile | `v0.12.0` | Order history, invoices, and transactional emails |
| M12 | Reviews | `v0.13.0` | Buyers review owned books; admin moderates |
| M13 | Admin operations | `v0.14.0` | Admin manages orders, refunds, and customers |
| M14 | Settings, audit log, legal pages | `v0.15.0` | Store settings, email templates, audit log viewer, legal pages |
| M15 | Hardening and production launch | `v1.0.0` | Production is live and the SRS Section 9 acceptance criteria pass |

---

## M0 — Foundation and Test Setup

**Goal:** A working monorepo in which all three apps and the shared package start locally and every type of test (unit, component, integration, end-to-end) runs with at least one sample test.

**Release `v0.1.0`:** `npm run dev` starts all apps, and `npm test` and `npm run test:e2e` pass.

#### M0-01 · Initialize the npm workspaces monorepo with lint and formatting

**Labels:** `infra`, `must` · **Depends on:** — · **SRS refs:** MAIN-01, MAIN-04, SEC-06

**Context:** Every later issue builds on this repository layout. Setting up workspaces, linting, and formatting now keeps all apps consistent.

**Tasks**
- [ ] Create the root `package.json` with `"workspaces": ["apps/*", "packages/*", "e2e"]` and `"engines": { "node": ">=24" }`.
- [ ] Add `.nvmrc` (Node 24), `.gitignore` (including `node_modules`, `dist`, `coverage`, `.env*` except `.env.example`), and `.editorconfig`.
- [ ] Add a flat `eslint.config.js` (React rules for the apps, Node rules for the API) and `.prettierrc`.
- [ ] Add root scripts: `dev` (runs all apps in parallel), `lint`, `format`, `format:check`, `test`, `test:coverage`, `test:e2e`.
- [ ] Create the root `.env.example` and `README.md` with setup instructions.

**Acceptance criteria**
- Given a fresh clone, when I run `npm install`, then all workspaces install without errors.
- When I run `npm run lint` and `npm run format:check`, then both pass on the clean repository.
- `.env` files are ignored by git and `.env.example` is committed.

**Test criteria**
- `npm run lint` and `npm run format:check` exit with code 0.

---

#### M0-02 · Create the `packages/shared` package

**Labels:** `infra`, `shared`, `must` · **Depends on:** M0-01 · **SRS refs:** MAIN-01, SEC-04

**Context:** Zod schemas and constants must be defined once and used by the API and both frontends, so validation rules never drift apart.

**Tasks**
- [ ] Create `packages/shared` with `src/schemas`, `src/constants`, `src/index.js`, and `exports` in `package.json`.
- [ ] Add constants: roles (`buyer`, `admin`), book statuses, order statuses, error codes, file type and size limits.
- [ ] Add a first schema, `paginationQuerySchema` (`page`, `pageSize` with defaults and maximum).
- [ ] Set up Vitest for the package.

**Acceptance criteria**
- The API and both frontends can `import { ORDER_STATUS } from "@bookstore/shared"`.
- `paginationQuerySchema` applies defaults and rejects `pageSize` above the maximum.

**Test criteria**
- Unit tests for `paginationQuerySchema`: valid input, defaults, invalid values.

---

#### M0-03 · Create the API skeleton (Express 5)

**Labels:** `infra`, `api`, `must` · **Depends on:** M0-02 · **SRS refs:** MAIN-02, MAIN-03, 4.2

**Context:** This sets the structure every API module will follow: configuration, logging, error handling, and a separate app and server so the app can be tested without opening a port.

**Tasks**
- [ ] Create `apps/api` with the folders from SRS Section 7.4.
- [ ] `src/config/env.js`: load `.env` with `dotenv` and validate it with a Zod schema. The process exits with a clear message if a variable is missing.
- [ ] `src/app.js`: Express app with `helmet`, `cors` (origins from env), `cookie-parser`, `express.json()`, `pino-http` with a request ID on every log line, and routes mounted under `/api/v1`.
- [ ] `src/middleware/errorHandler.js`: returns `{ error: { code, message, details } }`. Zod errors return 400 with details.
- [ ] `src/modules/health`: `GET /health` returns API, database, and Redis status.
- [ ] `src/config/db.js`: Mongoose connection with retry. `src/server.js`: starts the HTTP server and shuts down cleanly on `SIGTERM`.

**Acceptance criteria**
- `npm run dev -w apps/api` starts the API on port 4000.
- `GET /health` returns `200` with `{ status: "ok", db: "up", redis: "up" }`, and returns `503` if the database is down.
- An unknown route returns `404` in the standard error shape.
- Every log line is JSON and includes a request ID.

**Test criteria**
- Covered by M0-04.

---

#### M0-04 · Set up API tests (Vitest, Supertest, in-memory MongoDB)

**Labels:** `test`, `api`, `must` · **Depends on:** M0-03 · **SRS refs:** 8.1, 8.2

**Context:** Every API issue from M5 onward needs integration tests against a real, disposable database.

**Tasks**
- [ ] Configure Vitest for `apps/api` with separate `unit` and `integration` projects.
- [ ] Add a global setup that starts `mongodb-memory-server` and clears collections between tests.
- [ ] Add a test helper that builds the Express app for Supertest.
- [ ] Add coverage with `@vitest/coverage-v8`.

**Acceptance criteria**
- `npm test -w apps/api` runs unit and integration tests without any external services.

**Test criteria**
- Integration: `GET /health` returns 200. An unknown route returns 404 in the error shape.
- Unit: the error handler converts a Zod error into a 400 response with details.

---

#### M0-05 · Create the store app skeleton

**Labels:** `infra`, `store`, `must` · **Depends on:** M0-02 · **SRS refs:** 4.1, 7.2

**Context:** This sets up the frontend structure: routing, Redux store, RTK Query base API, styling, and themes.

**Tasks**
- [ ] Create `apps/store` with Vite 8 and React 19, using the folders from SRS Section 7.4.
- [ ] Set up `react-router` with a root layout (header, footer, main content) and a 404 page.
- [ ] `src/app/store.js`: Redux store. `src/api/baseApi.js`: RTK Query `createApi` with `fetchBaseQuery` pointing at `VITE_API_URL`.
- [ ] Set up Tailwind CSS 4 with `@tailwindcss/vite` and daisyUI 5, with light and dark themes and a theme toggle.
- [ ] Add a home page that shows the API health status through RTK Query.

**Acceptance criteria**
- `npm run dev -w apps/store` starts on port 5173 and shows the layout.
- The theme toggle switches between light and dark and remembers the choice.
- The layout works from 360 px width up to desktop.

**Test criteria**
- Covered by M0-07.

---

#### M0-06 · Create the admin app skeleton

**Labels:** `infra`, `admin`, `must` · **Depends on:** M0-02 · **SRS refs:** 4.1, 7.2

**Context:** Same foundation as the store app, with an admin layout (sidebar navigation).

**Tasks**
- [ ] Create `apps/admin` with Vite and React on port 5174.
- [ ] Add a sidebar layout with placeholder pages for Books, Categories, Authors, Orders, Customers, Reviews, Settings, and Audit Log.
- [ ] Add the Redux store, RTK Query base API, Tailwind CSS, and daisyUI themes, the same as the store app.

**Acceptance criteria**
- `npm run dev -w apps/admin` starts on port 5174 and every sidebar link opens its placeholder page.

**Test criteria**
- Covered by M0-07.

---

#### M0-07 · Set up frontend tests (Vitest, Testing Library, MSW)

**Labels:** `test`, `store`, `admin`, `must` · **Depends on:** M0-05, M0-06 · **SRS refs:** 8.1, 8.2

**Context:** Component tests need a browser-like environment and fake API responses, so RTK Query can be tested without a running API.

**Tasks**
- [ ] Configure Vitest with `jsdom` in both apps, and a setup file that loads `@testing-library/jest-dom`.
- [ ] Add MSW handlers in `tests/mocks/` and start the MSW server in the test setup.
- [ ] Add a `renderWithProviders` helper that wraps components in the Redux store and router.

**Acceptance criteria**
- `npm test -w apps/store` and `npm test -w apps/admin` run component tests with fake API responses.

**Test criteria**
- Store: the home page shows "API is up" when MSW returns a healthy response and an error state when it returns 503.
- Admin: clicking a sidebar link shows the matching page.

---

#### M0-08 · Set up Playwright end-to-end tests

**Labels:** `test`, `must` · **Depends on:** M0-05, M0-06 · **SRS refs:** 8.1, 8.2

**Context:** End-to-end tests run in real browsers. They start as smoke tests and grow into the full flows TC-09 and TC-10.

**Tasks**
- [ ] Create the `e2e` workspace with `@playwright/test` and `playwright.config.js` (Chromium, Firefox, WebKit, and a mobile viewport).
- [ ] Make the base URLs configurable with `STORE_URL`, `ADMIN_URL`, and `API_URL` so the same tests can run against local and staging.
- [ ] Use Playwright's `webServer` option to start the apps locally.

**Acceptance criteria**
- `npm run test:e2e` starts the apps and runs the smoke tests in all configured browsers.

**Test criteria**
- Smoke: the store home page loads and shows the header. The admin app loads and shows the sidebar.

---

## M1 — CI Pipeline (GitHub Actions)

**Goal:** Every pull request and every push to `main` is checked automatically, and a pull request cannot be merged until the checks pass.

**Release `v0.2.0`:** A pull request shows green checks for lint, tests, audit, and end-to-end tests.

#### M1-01 · CI workflow for lint and format checks

**Labels:** `infra`, `ci`, `must` · **Depends on:** M0-01 · **SRS refs:** MAIN-04

**Context:** Linting is the fastest check, so it runs first and fails early.

**Tasks**
- [ ] Create `.github/workflows/ci.yml`, triggered on `pull_request` and `push` to `main`.
- [ ] Use `actions/setup-node` with Node 24 and npm caching, then run `npm ci`.
- [ ] Add a `lint` job that runs `npm run lint` and `npm run format:check`.
- [ ] Cancel earlier runs on the same branch with `concurrency`.

**Acceptance criteria**
- A pull request with a lint error shows a failed `lint` check.
- A pull request without errors shows a green `lint` check.

**Test criteria**
- Open a test pull request with a deliberate lint error and confirm the check fails. Fix it and confirm the check passes.

---

#### M1-02 · Run unit, component, and integration tests with coverage in CI

**Labels:** `infra`, `ci`, `test`, `must` · **Depends on:** M1-01, M0-04, M0-07 · **SRS refs:** 8.4

**Context:** All non-browser tests run on every pull request. Coverage thresholds stop coverage from quietly dropping over time.

**Tasks**
- [ ] Add a `test` job that runs `npm run test:coverage` for every workspace.
- [ ] Set coverage thresholds: 80% lines for `apps/api` and `packages/shared`, 70% for `apps/store` and `apps/admin`.
- [ ] Upload the coverage reports as workflow artifacts.

**Acceptance criteria**
- A failing test or coverage below the threshold fails the `test` check.
- Coverage reports can be downloaded from the workflow run.

**Test criteria**
- Break one test on purpose in a test pull request and confirm the check fails.

---

#### M1-03 · Dependency audit in CI

**Labels:** `security`, `ci`, `must` · **Depends on:** M1-01 · **SRS refs:** SEC-11

**Context:** Known vulnerabilities in dependencies must be caught before they reach staging.

**Tasks**
- [ ] Add an `audit` job that runs `npm audit --audit-level=high`.
- [ ] Enable Dependabot for npm, GitHub Actions, and Docker with a weekly schedule.

**Acceptance criteria**
- The `audit` check fails when there is a high or critical vulnerability.
- Dependabot opens update pull requests.

**Test criteria**
- The `audit` job runs on every pull request and its result is shown on the pull request.

---

#### M1-04 · Run Playwright tests in CI

**Labels:** `infra`, `ci`, `test`, `must` · **Depends on:** M1-02, M0-08 · **SRS refs:** 8.4

**Context:** End-to-end tests run after the faster checks pass, as required by SRS Section 8.4.

**Tasks**
- [ ] Add an `e2e` job with `needs: [lint, test]`.
- [ ] Install browsers with `npx playwright install --with-deps`, and start MongoDB and Redis as GitHub Actions service containers.
- [ ] Run `npm run test:e2e` and upload the Playwright HTML report and traces when the job fails.

**Acceptance criteria**
- The `e2e` check runs on every pull request after `lint` and `test` pass.
- When an end-to-end test fails, its trace is available as an artifact.

**Test criteria**
- The smoke tests from M0-08 pass in CI.

---

#### M1-05 · Branch protection and GitHub templates

**Labels:** `infra`, `docs`, `must` · **Depends on:** M1-04 · **SRS refs:** —

**Context:** Merging must only be possible when every check is green, and issues and pull requests should follow the structure in this document.

**Tasks**
- [ ] Protect `main`: pull request required, required checks `lint`, `test`, `audit`, `e2e`, branch up to date, no force-push.
- [ ] Add `.github/ISSUE_TEMPLATE/feature.md` with the sections used in this document (Context, Tasks, Acceptance criteria, Test criteria).
- [ ] Add `.github/pull_request_template.md` with the Definition of Done checklist from Section 1.3.
- [ ] Create the labels from Section 1.2 and the milestones M0–M15.

**Acceptance criteria**
- A pull request with a failing check cannot be merged.
- Creating a new issue offers the feature template.

**Test criteria**
- Try to merge a pull request with a failing check and confirm it is blocked.

---

## M2 — Docker

**Goal:** Every deployable part runs as a Docker image, the full stack runs locally with Docker Compose, and CI publishes images to the GitHub Container Registry (GHCR).

**Release `v0.3.0`:** `docker compose up` runs the complete stack locally, and each merge to `main` publishes new images.

#### M2-01 · Docker image for the API and worker

**Labels:** `infra`, `devops`, `api`, `must` · **Depends on:** M0-03 · **SRS refs:** SCAL-01, SCAL-02, 2.3

**Context:** The API and the background worker share code, so one image runs both, each with a different start command.

**Tasks**
- [ ] Create `apps/api/Dockerfile` as a multi-stage build: install workspace dependencies, then copy only production files into a `node:24-alpine` (or `-slim`) runtime image.
- [ ] Run as the non-root `node` user, with `NODE_ENV=production`, and add a `HEALTHCHECK` that calls `/health`.
- [ ] Add a placeholder `src/worker.js` that connects to Redis and logs that it is ready. The worker is started with the command `node src/worker.js`.
- [ ] Add a `.dockerignore`.

**Acceptance criteria**
- `docker build -f apps/api/Dockerfile .` builds an image under 250 MB.
- The container starts, runs as a non-root user, and reports healthy.
- The same image started with `node src/worker.js` runs the worker.

**Test criteria**
- CI builds the image (M2-04) and the container smoke test passes (M2-04).

---

#### M2-02 · Web image: Caddy serving the store and admin apps

**Labels:** `infra`, `devops`, `store`, `admin`, `must` · **Depends on:** M0-05, M0-06 · **SRS refs:** 2.3, 4.1

**Context:** Both frontends are static files. One Caddy image serves both apps and also acts as the reverse proxy and TLS endpoint for the API (configured in M4). Vite reads `VITE_*` variables at build time, so the web image is built separately for each environment.

**Tasks**
- [ ] Create `deploy/web.Dockerfile`: build stage runs `npm run build` for both apps with build args `VITE_API_URL`, `VITE_GOOGLE_CLIENT_ID`, `VITE_RAZORPAY_KEY_ID`, and `VITE_CDN_URL`.
- [ ] Runtime stage based on the official `caddy:2` image, copying the builds to `/srv/store` and `/srv/admin`.
- [ ] Add a first `deploy/Caddyfile` for local use (ports 8080 and 8081) with SPA fallback (`try_files {path} /index.html`).
- [ ] Add long cache headers for hashed assets and no caching for `index.html`.

**Acceptance criteria**
- Opening a deep link such as `/books/some-slug` directly loads the app instead of returning 404.
- `index.html` is served with `Cache-Control: no-cache`, and hashed assets with a one-year cache.

**Test criteria**
- CI builds the image (M2-04). A manual check confirms deep links and cache headers.

---

#### M2-03 · Docker Compose for local development and a local full stack

**Labels:** `infra`, `devops`, `must` · **Depends on:** M2-01, M2-02 · **SRS refs:** 2.3

**Context:** Developers need MongoDB and Redis locally without installing them, and a way to run the production-like stack on their own machine.

**Tasks**
- [ ] `docker-compose.dev.yml`: MongoDB 8 and Redis with named volumes, used by `npm run dev`.
- [ ] `deploy/compose.local.yml`: `web`, `api`, `worker`, `mongo`, `redis`, using the images from M2-01 and M2-02.
- [ ] Make `api` and `worker` wait for `mongo` and `redis` to be healthy (`depends_on` with `condition: service_healthy`).
- [ ] Document both workflows in `README.md`.

**Acceptance criteria**
- `docker compose -f docker-compose.dev.yml up -d` followed by `npm run dev` gives a working local setup.
- `docker compose -f deploy/compose.local.yml up --build` serves the store, the admin app, and the API.

**Test criteria**
- Manual: the store home page shows "API is up" when running the full local stack.

---

#### M2-04 · Build and push images to GHCR in CI, with a container smoke test

**Labels:** `infra`, `ci`, `devops`, `must` · **Depends on:** M2-03, M1-05 · **SRS refs:** 2.3

**Context:** The VPS pulls ready-made images from a registry instead of building on the server. Every image is tagged with the commit SHA so any version can be deployed or rolled back.

**Tasks**
- [ ] Add a `docker` job to CI that builds the `api` and `web` images with Docker Buildx and layer caching.
- [ ] On pull requests: build only, then start the stack with Compose and check that `/health` returns 200.
- [ ] On `main`: push `ghcr.io/<owner>/bookstore-api:<sha>` and `bookstore-web:staging-<sha>`, and also tag them `staging`.
- [ ] On version tags `v*.*.*`: push `bookstore-api:<version>` and `bookstore-web:production-<version>` (used from M15).

**Acceptance criteria**
- After a merge to `main`, both images with the commit SHA tag appear in GHCR.
- A pull request that breaks the Docker build or the health check fails the `docker` check.

**Test criteria**
- The container smoke test (`/health` returns 200) runs in CI on every pull request.

---

## M3 — Staging VPS and Continuous Deployment

**Goal:** A secured VPS runs the staging stack, and every merge to `main` deploys to it automatically, with a health check and automatic rollback.

**Release `v0.4.0`:** Merging a change to `main` makes it appear on the staging server within minutes, without manual steps.

#### M3-01 · Provision and secure the staging VPS

**Labels:** `infra`, `devops`, `security`, `must` · **Depends on:** — · **SRS refs:** SEC-01, SEC-06

**Context:** The server must be locked down before anything is deployed to it.

**Tasks**
- [ ] Create a VPS (2 vCPU, 4 GB RAM minimum) with Ubuntu 24.04 LTS or 26.04 LTS.
- [ ] Create a `deploy` user with SSH key login. Disable root login and password authentication.
- [ ] Configure the `ufw` firewall to allow only ports 22, 80, and 443. Install `fail2ban` and enable unattended security upgrades.
- [ ] Set the timezone to UTC and add a 2 GB swap file.

**Acceptance criteria**
- SSH login works only with a key and only as the `deploy` user.
- A port scan shows only 22, 80, and 443 open.

**Test criteria**
- Manual: `ssh root@<server>` and password login are both rejected. `sudo ufw status` lists only the allowed ports.

---

#### M3-02 · Install Docker and prepare the deployment folder

**Labels:** `infra`, `devops`, `must` · **Depends on:** M3-01 · **SRS refs:** 2.3

**Context:** The server only needs Docker, the Compose file, and a secrets file. The code itself arrives as images.

**Tasks**
- [ ] Install Docker Engine and the Compose plugin from Docker's official repository, and add `deploy` to the `docker` group.
- [ ] Configure Docker log rotation (`max-size: 10m`, `max-file: 5`) in `/etc/docker/daemon.json`.
- [ ] Create `/opt/bookstore/staging/` containing `compose.yml` (copied from `deploy/compose.staging.yml`) and `.env` with permissions `600`.
- [ ] Log in to GHCR with a read-only personal access token (`read:packages`).

**Acceptance criteria**
- `docker compose pull` in `/opt/bookstore/staging` pulls the images from GHCR.
- The `.env` file is readable only by the `deploy` user.

**Test criteria**
- Manual: run `docker compose up -d` once by hand and check that `/health` responds on the server.

---

#### M3-03 · Provision staging external services and secrets

**Labels:** `infra`, `devops`, `security`, `must` · **Depends on:** M3-02 · **SRS refs:** 2.1, 2.5, 4.4, SEC-06

**Context:** Staging uses its own external accounts and resources, separate from production, so tests never touch real data or money.

**Tasks**
- [ ] MongoDB Atlas: a staging cluster, a database user with least privilege, and network access limited to the VPS IP address.
- [ ] Redis: a staging instance on Upstash or Redis Cloud with TLS.
- [ ] Cloudflare R2: buckets `books-private-staging` and `books-public-staging`, and an API token scoped to these two buckets with Object Read and Write only.
- [ ] Razorpay: test mode key ID and secret. The webhook is configured in M9-05.
- [ ] Google Cloud: an OAuth client ID for staging (authorized origins are added in M4-03).
- [ ] Resend: an API key and a verified sending domain.
- [ ] Put all values in `/opt/bookstore/staging/.env`, and list every variable name in `.env.example`.

**Acceptance criteria**
- The deployed API reports `db: "up"` and `redis: "up"` on `/health`.
- No secret appears in the repository, in the images, or in CI logs.

**Test criteria**
- Manual: `/health` on the staging server shows all services up. Search the repository for key prefixes (for example `rzp_`) and confirm there are no matches.

---

#### M3-04 · Deploy workflow: automatic deploy to staging on merge to `main`

**Labels:** `infra`, `ci`, `devops`, `must` · **Depends on:** M3-03, M2-04 · **SRS refs:** 2.3

**Context:** This makes continuous deployment real: once CI passes on `main`, the new images are deployed without anyone logging in to the server.

**Tasks**
- [ ] Create a GitHub Environment `staging` with secrets `SSH_HOST`, `SSH_USER`, and `SSH_PRIVATE_KEY`, plus the `VITE_*` build variables for staging.
- [ ] Create `.github/workflows/deploy-staging.yml`, triggered when CI completes successfully on `main`.
- [ ] Over SSH: copy `deploy/compose.staging.yml` and `deploy/Caddyfile`, set `IMAGE_TAG=<sha>`, then run `docker compose pull` and `docker compose up -d --remove-orphans`.
- [ ] Remove unused images with `docker image prune -f`.

**Acceptance criteria**
- A merge to `main` deploys the new SHA to staging within 10 minutes without manual steps.
- Two merges in quick succession deploy in order, and the later one wins (`concurrency` group).

**Test criteria**
- Merge a visible change (for example the footer text) and confirm it appears on staging.

---

#### M3-05 · Health check after deploy and automatic rollback

**Labels:** `infra`, `devops`, `must` · **Depends on:** M3-04 · **SRS refs:** MAIN-03, SCAL-03

**Context:** A broken deploy must not leave staging down. If the health check fails, the previous version is restored.

**Tasks**
- [ ] Before deploying, save the currently running tag to `/opt/bookstore/staging/.previous_tag`.
- [ ] After `up -d`, check `/health` up to 10 times, 6 seconds apart.
- [ ] If the check fails, redeploy the previous tag, print the last 100 log lines of the API container, and fail the workflow.
- [ ] Add a manual `workflow_dispatch` input to deploy any earlier SHA.

**Acceptance criteria**
- A deploy with a failing health check rolls back automatically, and the workflow is marked failed.
- Any earlier version can be redeployed from the Actions tab.

**Test criteria**
- Deploy a build that deliberately fails `/health` on a test branch, and confirm staging returns to the previous version.

---

#### M3-06 · Uptime monitoring for staging

**Labels:** `infra`, `devops`, `should` · **Depends on:** M3-05 · **SRS refs:** MAIN-03, SCAL-03

**Context:** The team should know about downtime before users report it.

**Tasks**
- [ ] Add an external uptime monitor (for example UptimeRobot or Better Stack) on the `/health` endpoint every 5 minutes, with email alerts.
- [ ] Add a "Deploying and rolling back" section to `README.md`.

**Acceptance criteria**
- Stopping the API container triggers an alert within 10 minutes.

**Test criteria**
- Manual: stop the API container, confirm the alert arrives, then start the container again.

---

## M4 — Domain Mapping and SSL

**Goal:** Staging is available on its own subdomains over HTTPS, with certificates issued and renewed automatically by Caddy.

**Release `v0.5.0`:** `https://store.staging.<domain>`, `https://admin.staging.<domain>`, and `https://api.staging.<domain>/health` all load with valid certificates.

#### M4-01 · DNS records for staging

**Labels:** `infra`, `devops`, `must` · **Depends on:** M3-01 · **SRS refs:** SEC-01, PERF-03

**Context:** Caddy can only obtain certificates once the subdomains point to the VPS.

**Tasks**
- [ ] Create `A` (and `AAAA` if IPv6 is available) records for `store.staging`, `admin.staging`, and `api.staging` pointing to the VPS. If the DNS is on Cloudflare, set them to "DNS only" (not proxied) so Caddy can complete the HTTP challenge.
- [ ] Connect `cdn.staging.<domain>` as a custom domain on the `books-public-staging` R2 bucket.

**Acceptance criteria**
- `nslookup` for each subdomain returns the VPS IP address.
- A file uploaded to `books-public-staging` is reachable at `https://cdn.staging.<domain>/<key>`.

**Test criteria**
- Manual DNS and CDN checks as above.

---

#### M4-02 · Caddy configuration for domains, TLS, and routing

**Labels:** `infra`, `devops`, `security`, `must` · **Depends on:** M4-01, M3-04 · **SRS refs:** SEC-01, SEC-02

**Context:** Caddy obtains and renews TLS certificates automatically and routes each subdomain to the right place.

**Tasks**
- [ ] Update `deploy/Caddyfile` to use environment placeholders: `{$STORE_DOMAIN}`, `{$ADMIN_DOMAIN}`, `{$API_DOMAIN}`, and set `{$ACME_EMAIL}` for certificate notices.
- [ ] Store and admin sites: serve static files with SPA fallback and compression (`encode zstd gzip`).
- [ ] API site: `reverse_proxy api:4000` with the client IP passed on.
- [ ] All sites: `Strict-Transport-Security: max-age=31536000; includeSubDomains`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`.
- [ ] Store Caddy certificates in a named volume (`caddy_data`) so they survive restarts.
- [ ] In `compose.staging.yml`, publish only the `web` service on ports 80 and 443. `api` and `worker` are only reachable on the internal Docker network.

**Acceptance criteria**
- All three staging URLs load over HTTPS with a valid certificate, and HTTP redirects to HTTPS.
- The API port 4000 is not reachable from the internet.
- An SSL Labs test gives grade A or better.

**Test criteria**
- Manual: SSL Labs report, `curl -I http://store.staging.<domain>` returns a redirect, and a port check shows 4000 closed.

---

#### M4-03 · Configure the API and external services for the staging domains

**Labels:** `infra`, `api`, `security`, `must` · **Depends on:** M4-02 · **SRS refs:** SEC-03, AUTH-06, 4.4, 2.5

**Context:** Cookies, CORS, Google sign-in, and R2 uploads all depend on the exact domain names.

**Tasks**
- [ ] API: set `CORS_ORIGINS` to the staging store and admin URLs with `credentials: true`, and `app.set("trust proxy", 1)`.
- [ ] Refresh-token cookie: `httpOnly`, `Secure`, `SameSite=Lax`, `Domain=.staging.<domain>`, `Path=/api/v1/auth`.
- [ ] Google Cloud: add the staging store and admin URLs to the authorized JavaScript origins.
- [ ] R2: CORS on both buckets allows `PUT` from the admin origin only, with the `Content-Type` header allowed.

**Acceptance criteria**
- A request to the API from any origin other than the store or admin app is rejected by CORS.
- The browser accepts the refresh cookie on the staging domains (verified in M5).

**Test criteria**
- Integration: CORS allows the configured origins and rejects other origins.

---

#### M4-04 · Run the end-to-end smoke tests against staging after each deploy

**Labels:** `test`, `ci`, `must` · **Depends on:** M4-02, M3-05 · **SRS refs:** 8.2

**Context:** After each deploy, a quick browser test confirms that the real staging environment works, not only the CI copy.

**Tasks**
- [ ] Add a job at the end of `deploy-staging.yml` that runs the Playwright tests tagged `@smoke` with `STORE_URL`, `ADMIN_URL`, and `API_URL` set to staging.
- [ ] Upload the report as an artifact if a test fails.

**Acceptance criteria**
- Each staging deploy ends with a smoke test run, and a failure marks the deployment as failed.

**Test criteria**
- The smoke tests from M0-08 pass against staging.

---

## M5 — Authentication

**Goal:** Buyers sign in with Google One Tap (with a button as fallback), the admin signs in with Google and is recognized through the allowlist, and sessions use short-lived access tokens with rotating refresh tokens.

**Release `v0.6.0`:** A buyer signs in on staging with One Tap and stays signed in after a page reload. A non-admin account is refused by the admin app.

#### M5-01 · User and refresh token models, and shared auth schemas

**Labels:** `feature`, `api`, `shared`, `must` · **Depends on:** M0-04 · **SRS refs:** 6 (`users`, `refreshTokens`), AUTH-05

**Context:** Sign-in and sessions need these two collections.

**Tasks**
- [ ] `models/User.js`: `email` (unique, lowercase), `name`, `avatarUrl`, `googleId` (unique), `role`, `isBlocked`, timestamps.
- [ ] `models/RefreshToken.js`: `userId`, `tokenHash` (SHA-256, never the raw token), `family`, `expiresAt` (TTL index), `revokedAt`.
- [ ] `packages/shared/src/schemas/auth.js`: `googleSignInSchema` (`credential`) and the public user shape.

**Acceptance criteria**
- Two users with the same email cannot be created.
- Expired refresh tokens are removed automatically by the TTL index.

**Test criteria**
- Integration: unique index on email. Refresh tokens store only a hash.

---

#### M5-02 · Google sign-in endpoint (`POST /auth/google`)

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M5-01 · **SRS refs:** AUTH-04, AUTH-05, AUTH-06, AUTH-09, AUTH-10

**Context:** The API must never trust the browser. It verifies the Google ID token itself before creating a session.

**Tasks**
- [ ] `services/google.js`: `OAuth2Client.verifyIdToken` with `audience = GOOGLE_CLIENT_ID`. Check the issuer, expiry, and `email_verified`.
- [ ] Find or create the user by `googleId`, and update the name and avatar on each sign-in.
- [ ] Set `role` to `admin` only if the email is in `ADMIN_EMAILS`, otherwise `buyer`.
- [ ] Reject blocked users with `403 USER_BLOCKED`.
- [ ] Issue an access token (JWT, 15 minutes, containing `sub` and `role`) in the response body, and a refresh token in the cookie described in M4-03.

**Acceptance criteria**
- A valid Google credential returns `{ accessToken, user }` and sets the refresh cookie.
- An invalid, expired, or wrong-audience credential returns `401`.
- A new email creates exactly one user. Signing in again does not create another.
- A blocked user receives `403`.

**Test criteria**
- Integration (with `google-auth-library` mocked): new user, returning user, admin email gets the `admin` role, non-allowlisted email gets `buyer`, invalid token, blocked user.

---

#### M5-03 · Refresh, logout, current user, auth middleware, and test login

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M5-02 · **SRS refs:** AUTH-07, AUTH-10, SEC-09, 8.4

**Context:** Sessions stay alive through refresh-token rotation. Protected routes need `authenticate` and `requireAdmin`. End-to-end tests cannot use One Tap, so they need a test-only sign-in route.

**Tasks**
- [ ] `POST /auth/refresh`: validate the cookie, revoke the old token, issue a new pair. If a revoked token is reused, revoke its whole token family.
- [ ] `POST /auth/logout`: revoke the refresh token and clear the cookie.
- [ ] `GET /auth/me`: return the current user.
- [ ] `middleware/authenticate.js`: verify the JWT, load the user, reject blocked users. `middleware/requireAdmin.js`: require `role === "admin"`.
- [ ] `POST /auth/test-login`: registered only when `NODE_ENV === "test"`. Takes an email and role and returns a session.

**Acceptance criteria**
- Refresh returns a new access token and a new cookie, and the old refresh token no longer works.
- Reusing a revoked refresh token revokes every token in that family.
- After logout, refresh returns `401`.
- `/auth/test-login` returns `404` when `NODE_ENV` is not `test`.

**Test criteria**
- Integration: rotation, reuse detection, logout, `/auth/me` with and without a token, expired token returns `401`, `requireAdmin` rejects a buyer (**TC-06**), the test-login route exists only in test mode.

---

#### M5-04 · Redis connection and rate limiting on auth routes

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M5-03 · **SRS refs:** SEC-05, SCAL-01

**Context:** Rate limits must be shared across all API instances, so they are stored in Redis. The same middleware is reused later for checkout, downloads, and upload signing.

**Tasks**
- [ ] `config/redis.js`: a shared `ioredis` client, included in `/health`.
- [ ] `middleware/rateLimit.js`: a factory built on `express-rate-limit` with `rate-limit-redis`, returning `429` in the standard error shape.
- [ ] Apply it to `/auth/*` (for example 20 requests per minute per IP).

**Acceptance criteria**
- The 21st auth request within a minute from the same IP returns `429` with a `Retry-After` header.

**Test criteria**
- Integration: the limit is enforced (using a test Redis or an in-memory store in tests).

---

#### M5-05 · Store app: Google One Tap, fallback button, session handling

**Labels:** `feature`, `store`, `must` · **Depends on:** M5-03 · **SRS refs:** AUTH-01, AUTH-02, AUTH-03, AUTH-08, AUTH-11, 7.2

**Context:** This is the buyer's sign-in experience, and it is the base for every protected page.

**Tasks**
- [ ] Wrap the app in `GoogleOAuthProvider`. On the login page and on protected pages, use `useGoogleOneTapLogin` with `use_fedcm_for_prompt: true`.
- [ ] Show `<GoogleLogin />` as a fallback when One Tap is dismissed or unavailable.
- [ ] `features/auth/authSlice.js`: `user` and `accessToken` kept in memory only (never in localStorage).
- [ ] `baseQueryWithReauth`: on `401`, call `/auth/refresh` once, then retry the original request. If refresh fails, sign the user out.
- [ ] On app start, call `/auth/refresh` to restore the session from the cookie.
- [ ] `ProtectedRoute` for pages that need sign-in. Logout calls the API, clears the state, and calls `googleLogout()`.

**Acceptance criteria**
- A guest opening a protected page sees the One Tap prompt, and after signing in lands on the requested page.
- Reloading the page keeps the user signed in (through the refresh cookie).
- After logout, One Tap does not sign the user in again automatically.
- The access token never appears in localStorage or sessionStorage.

**Test criteria**
- Unit: `authSlice` reducers.
- Component (MSW): an expired token is refreshed and the original request succeeds (**TC-08**). A failed refresh signs the user out. `ProtectedRoute` redirects guests.
- E2E: sign in through `/auth/test-login`, reload, and still signed in.

---

#### M5-06 · Admin app: Google sign-in and admin guard

**Labels:** `feature`, `admin`, `must` · **Depends on:** M5-05 · **SRS refs:** AUTH-09, TC-06

**Context:** Only the allowlisted seller may use the admin app.

**Tasks**
- [ ] Admin login page with the Google sign-in button, using the same auth slice and re-auth base query pattern as the store.
- [ ] `AdminRoute`: if the signed-in user is not an admin, show a "Not authorized" page with a logout button.

**Acceptance criteria**
- The allowlisted email reaches the admin dashboard.
- Any other Google account sees "Not authorized" and cannot call admin API routes.

**Test criteria**
- Component: `AdminRoute` shows "Not authorized" for a buyer.
- E2E: a buyer signed in through test login cannot open admin pages (**TC-06**).

---

## M6 — Admin Catalog and Uploads

**Goal:** The admin manages categories, authors, and books, and uploads the full PDF, sample PDF, and cover image directly to Cloudflare R2.

**Release `v0.7.0`:** On staging, the admin creates a book with all three files and publishes it.

#### M6-01 · Audit log model and helper

**Labels:** `feature`, `api`, `must` · **Depends on:** M5-03 · **SRS refs:** ADM-AU-01, 6 (`auditLogs`)

**Context:** Every admin change from this milestone onward must be recorded, so the helper is built before the first admin feature. The viewer comes in M14.

**Tasks**
- [ ] `models/AuditLog.js`: `adminId`, `action`, `entity`, `entityId`, `before`, `after`, `createdAt` (indexed).
- [ ] `services/audit.js`: `recordAudit({ req, action, entity, entityId, before, after })`, which removes sensitive fields before saving.

**Acceptance criteria**
- Calling the helper stores one entry with the admin's ID and a timestamp.

**Test criteria**
- Unit: sensitive fields are removed. Integration: an entry is created.

---

#### M6-02 · Categories and authors: admin API

**Labels:** `feature`, `api`, `must` · **Depends on:** M6-01 · **SRS refs:** ADM-CT-01, ADM-CT-02

**Context:** Books reference categories and authors, so these must exist first.

**Tasks**
- [ ] Models `Category` (`name`, `slug` unique) and `Author` (`name`, `slug` unique, `bio`).
- [ ] `/admin/categories` and `/admin/authors`: list (paginated), create, update, delete, with automatic slugs.
- [ ] Deletion returns `409 IN_USE` if any book references the category or author.
- [ ] Write an audit entry for each change. Add shared Zod schemas.

**Acceptance criteria**
- The admin can create, edit, and delete categories and authors.
- A category or author used by a book cannot be deleted.
- Buyers receive `403` on these routes.

**Test criteria**
- Integration: CRUD, duplicate slug returns `409`, in-use deletion returns `409`, buyer returns `403`, audit entries are created.

---

#### M6-03 · Categories and authors: admin UI

**Labels:** `feature`, `admin`, `must` · **Depends on:** M6-02, M5-06 · **SRS refs:** ADM-CT-01, ADM-CT-02, 4.1

**Tasks**
- [ ] RTK Query endpoints with cache tags.
- [ ] List pages with a daisyUI table and pagination, and create and edit forms in a modal using `react-hook-form` with the shared Zod schema.
- [ ] Confirm before deleting, and show the "in use" error clearly.
- [ ] Loading, empty, and error states.

**Acceptance criteria**
- Changes appear in the list immediately without a page reload.
- Form errors match the API validation rules.

**Test criteria**
- Component (MSW): create, edit, the in-use deletion error message, empty state.

---

#### M6-04 · Book model and admin book API

**Labels:** `feature`, `api`, `must` · **Depends on:** M6-02 · **SRS refs:** ADM-BK-01, ADM-BK-02, ADM-BK-07, ADM-BK-08, PERF-04

**Context:** The book is the central record of the store.

**Tasks**
- [ ] `models/Book.js` with the fields from SRS Section 6. Price is stored in paise (integer).
- [ ] Indexes: `slug` unique, `status`, `categoryId`, `authorIds`, and a text index on title, description, and keywords.
- [ ] `/admin/books`: list with filters (status, search), get, create (status `draft`), update, and the actions `publish`, `unpublish`, `archive`.
- [ ] Publishing requires a cover, sample, and PDF to be present. Otherwise return `422 BOOK_INCOMPLETE`.
- [ ] Write an audit entry for each change.

**Acceptance criteria**
- A book cannot be published until all three files are uploaded.
- Archiving hides a book from the store but keeps it (for existing owners, see ADM-BK-07).
- Price is always an integer number of paise.

**Test criteria**
- Integration: CRUD, status transitions, publishing without files returns `422`, the slug is unique, buyer returns `403`.

---

#### M6-05 · Signed upload URLs for R2

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M6-04 · **SRS refs:** ADM-BK-04, ADM-BK-05, 4.4, SEC-05, SEC-08

**Context:** Large files go directly from the browser to R2, so they never pass through the API. The API only signs the upload and checks the file type and size.

**Tasks**
- [ ] `services/r2.js`: an S3 client with `region: "auto"` and the R2 endpoint, and helpers `signPut` and `signGet`.
- [ ] `POST /admin/uploads/sign` with `{ bookId, kind: "pdf" | "sample" | "cover", contentType, size }`. Check the type and size against the limits in `packages/shared`.
- [ ] Generate keys on the server (`books/<bookId>/<uuid>.pdf`, `samples/...`, `covers/...`), choose the private or public bucket by `kind`, and sign with `ContentType` included. The URL expires in 10 minutes.
- [ ] `POST /admin/books/:id/files` with `{ kind, key }`: check that the object exists (`HeadObject`), save the key and file size on the book, and delete the replaced file.
- [ ] Rate-limit the sign route.

**Acceptance criteria**
- Only `application/pdf` is accepted for `pdf` and `sample`, and only JPEG, PNG, or WebP for `cover`. Files over the size limit are rejected with `422`.
- Keys never contain the uploaded file name.
- Full PDFs always go to the private bucket.

**Test criteria**
- Unit (with `aws-sdk-client-mock`): key format, bucket choice, `ContentType` in the signed request.
- Integration: wrong type returns `422`, oversize returns `422`, confirming an object that doesn't exist returns `422`.

---

#### M6-06 · Admin books UI with direct uploads and progress

**Labels:** `feature`, `admin`, `must` · **Depends on:** M6-05, M6-03 · **SRS refs:** ADM-BK-01, ADM-BK-03, ADM-BK-06

**Tasks**
- [ ] Books list with status badges, search, and filters.
- [ ] Book form with all fields, author and category pickers, and price entered in rupees but sent in paise.
- [ ] Upload component: get a signed URL, `PUT` the file with `XMLHttpRequest` to show a progress bar, then confirm. Allow replacing a file.
- [ ] Cover preview and file name and size display. Publish, unpublish, and archive buttons with confirmation.

**Acceptance criteria**
- The admin creates a book, uploads three files with progress shown, and publishes it.
- Replacing a file shows the new file, and the old one is removed.
- Choosing a file of the wrong type shows an error before uploading.

**Test criteria**
- Component (MSW): form validation, upload progress states, publish disabled until all files exist.
- E2E (staging): create a book, upload files, publish (first half of **TC-10**).

---

## M7 — Store Catalog

**Goal:** Anyone can browse, search, and filter published books, view book details, and read the free sample.

**Release `v0.8.0`:** A book published in the admin app appears in the store, and its sample opens in the browser.

#### M7-01 · Public catalog API

**Labels:** `feature`, `api`, `must` · **Depends on:** M6-04 · **SRS refs:** CAT-02, CAT-03, CAT-04, CAT-05, CAT-08, PERF-01, PERF-04

**Tasks**
- [ ] `GET /books`: only `published` books, paginated as `{ items, page, pageSize, total }`, with query parameters `q` (text search), `category`, `author`, `minPrice`, `maxPrice`, and `sort` (`newest`, `price_asc`, `price_desc`, `rating`).
- [ ] `GET /books/:slug`: book details including author and category names, cover and sample URLs from the CDN. Never includes `pdfKey`.
- [ ] `GET /books/featured`, `GET /books/new`, `GET /categories`, `GET /authors`.
- [ ] Validate all query parameters with shared Zod schemas.

**Acceptance criteria**
- Draft and archived books never appear in lists, and their slugs return `404`.
- The response never includes the private PDF key.
- Catalog responses stay under 300 ms (p95) with 1,000 seeded books.

**Test criteria**
- Integration: filters, sorting, pagination, search, draft and archived hidden, no `pdfKey` in the response.
- Unit: query schema defaults and limits.

---

#### M7-02 · Home page

**Labels:** `feature`, `store`, `must` · **Depends on:** M7-01 · **SRS refs:** CAT-01, PERF-02, PERF-03

**Tasks**
- [ ] Sections for featured books, new releases, and categories, using a shared `BookCard` component (cover, title, author, price in INR, rating).
- [ ] Load cover images lazily with fixed dimensions to avoid layout shift, served from the CDN.

**Acceptance criteria**
- The home page shows all three sections with loading skeletons and empty states.

**Test criteria**
- Component (MSW): sections render, empty state, error state. `BookCard` formats INR prices correctly.

---

#### M7-03 · Catalog page with search, filters, and sorting

**Labels:** `feature`, `store`, `must` · **Depends on:** M7-01 · **SRS refs:** CAT-02, CAT-03, CAT-04

**Tasks**
- [ ] Search box (debounced), category, author, and price filters, sort dropdown, and pagination.
- [ ] Keep all filters in the URL query string so results can be shared and the back button works.

**Acceptance criteria**
- Changing a filter updates the results and the URL, and reloading the page keeps the filters.

**Test criteria**
- Component (MSW): filtering changes the request parameters, pagination, empty results message.

---

#### M7-04 · Book detail page and sample reader

**Labels:** `feature`, `store`, `must` · **Depends on:** M7-01 · **SRS refs:** CAT-05, CAT-06

**Tasks**
- [ ] Detail page with cover, title, authors, description, page count, file size, language, price, and rating summary. The reviews list is added in M12.
- [ ] "Read sample" opens the sample PDF from the CDN in a modal (`<iframe>` or the browser's PDF viewer), with a link to open it in a new tab.
- [ ] Add page `<title>` and meta description for each book.
- [ ] An "Add to cart" placeholder button, connected in M8.

**Acceptance criteria**
- The sample opens for guests without signing in.
- An unknown slug shows the 404 page.

**Test criteria**
- Component (MSW): all fields render, 404 state, sample modal opens.
- E2E: the admin publishes a book and it appears in the store with a working sample (completes **TC-10**).

---

## M8 — Cart and Wishlist

**Goal:** Guests and buyers can build a cart, the guest cart moves into the buyer's account on sign-in, and buyers keep a wishlist. The API calculates all totals.

**Release `v0.9.0`:** A guest adds books, signs in, and sees the same books in the cart with tax and total.

#### M8-01 · Settings defaults and pricing service

**Labels:** `feature`, `api`, `must` · **Depends on:** M7-01 · **SRS refs:** CART-05, PAY-02, ADM-ST-01

**Context:** Tax and download limits come from store settings. The settings document is created now with defaults, and the admin screen for it comes in M14. All money calculations happen on the server.

**Tasks**
- [ ] `models/Settings.js`: a single document with `storeName`, `supportEmail`, `gst` (`enabled`, `rate`, `inclusive`), `defaultDownloadLimit`, `emailTemplates`. Create it with defaults on startup if it doesn't exist.
- [ ] `services/pricing.js`: `calculateTotals(books, settings)` returns `{ items, subtotal, tax, total }` in paise, rounding correctly and supporting prices that include or exclude GST.

**Acceptance criteria**
- Totals are always integers in paise and add up (`subtotal + tax = total` for tax-exclusive prices).

**Test criteria**
- Unit: GST off, GST exclusive, GST inclusive, rounding edge cases, empty cart.

---

#### M8-02 · Cart API

**Labels:** `feature`, `api`, `must` · **Depends on:** M8-01, M5-03 · **SRS refs:** CART-02, CART-03, CART-04, CART-05, 6 (`carts`)

**Tasks**
- [ ] `models/Cart.js`: `userId` (unique), `bookIds`.
- [ ] `GET /me/cart`: returns the items with current prices and totals from the pricing service.
- [ ] `PUT /me/cart` with `{ bookIds }`: removes duplicates, drops books that are not published, and drops books the buyer already owns (the ownership check is connected in M10-01).
- [ ] `POST /me/cart/merge` with `{ bookIds }`: combines the guest cart with the server cart.

**Acceptance criteria**
- A book can appear only once in a cart.
- Prices in the response always come from the database.
- Unpublished books are removed from the cart automatically.

**Test criteria**
- Integration: add, remove, duplicate removal, merge, unpublished book dropped, totals match the pricing service.

---

#### M8-03 · Store cart: guest cart, merge on sign-in, cart page

**Labels:** `feature`, `store`, `must` · **Depends on:** M8-02, M5-05 · **SRS refs:** CART-01, CART-02, CART-03, CART-05, 7.2

**Tasks**
- [ ] `features/cart/cartSlice.js` for the guest cart, saved to localStorage with `createListenerMiddleware`.
- [ ] After sign-in, call `/me/cart/merge` with the guest cart, then clear the local copy.
- [ ] "Add to cart" on book cards and the detail page, and a cart count badge in the header.
- [ ] Cart page with items, remove buttons, subtotal, tax, total (from the API for signed-in buyers), and a "Checkout" button.

**Acceptance criteria**
- The guest cart survives a page reload.
- After sign-in, guest and server cart items are combined without duplicates, and the local cart is cleared.
- The header badge always shows the right count.

**Test criteria**
- Unit: cart slice reducers and the listener that writes to localStorage.
- Component (MSW): the merge call on sign-in, totals displayed from the API.

---

#### M8-04 · Wishlist API and UI

**Labels:** `feature`, `api`, `store`, `should` · **Depends on:** M8-03 · **SRS refs:** WISH-01, WISH-02, 6 (`wishlists`)

**Tasks**
- [ ] `models/Wishlist.js`. `GET /me/wishlist`, `POST /me/wishlist` with `{ bookId }`, `DELETE /me/wishlist/:bookId`.
- [ ] Heart button on book cards and the detail page (signed-in buyers), and a wishlist page with "Move to cart".

**Acceptance criteria**
- A buyer adds and removes wishlist items, and "Move to cart" moves the book to the cart and removes it from the wishlist.

**Test criteria**
- Integration: add, remove, no duplicates. Component: "Move to cart" updates both lists.

---

## M9 — Checkout and Payments (Razorpay)

**Goal:** A signed-in buyer pays through Razorpay Standard Checkout. The order is marked paid by a verified, idempotent webhook, and the buyer's library access is created.

**Release `v0.10.0`:** On staging, a buyer pays in Razorpay test mode and the order becomes `paid` through the webhook.

#### M9-01 · Background job queue and worker (BullMQ)

**Labels:** `feature`, `api`, `infra`, `must` · **Depends on:** M5-04 · **SRS refs:** JOB-01, JOB-02, SCAL-02

**Context:** Webhook side effects, emails, invoices, and scheduled clean-ups run in the worker, not in the request.

**Tasks**
- [ ] `jobs/queues.js`: queues `payments`, `emails`, `invoices`, `maintenance`, sharing the Redis connection.
- [ ] Default job options: 5 attempts with exponential backoff, keep failed jobs for inspection.
- [ ] `worker.js`: registers processors from `jobs/processors/`, logs failed jobs with Pino, and shuts down cleanly.
- [ ] Add the `worker` service to the staging Compose file.

**Acceptance criteria**
- A job that fails is retried with increasing delay and logged on each failure.
- Stopping the worker with `SIGTERM` lets running jobs finish.

**Test criteria**
- Integration: a job is processed, a failing job is retried (processor function tested directly).

---

#### M9-02 · Order model and create checkout order (`POST /checkout/orders`)

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M8-02, M9-01 · **SRS refs:** PAY-01, PAY-02, PAY-03, SEC-05, 6 (`orders`)

**Tasks**
- [ ] `models/Order.js` with the fields from SRS Section 6, including a price snapshot per item. Indexes on `razorpayOrderId` (unique) and `userId`.
- [ ] `services/razorpay.js`: the Razorpay client using `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
- [ ] `POST /checkout/orders`: load the buyer's cart, calculate totals from the database, create the Razorpay order (`amount` in paise, `currency: "INR"`, `receipt` = local order ID), and save a local `pending` order.
- [ ] Return `{ orderId, razorpayOrderId, amount, currency, keyId }`. Rate-limit the route.

**Acceptance criteria**
- Guests receive `401`.
- An empty cart returns `422`.
- The amount always comes from the database, whatever the client sends.

**Test criteria**
- Integration (Razorpay mocked): order created as `pending`, amount matches database prices even when the client sends other prices (**TC-03**), empty cart returns `422`, guest returns `401`.

---

#### M9-03 · Store checkout with Razorpay Standard Checkout

**Labels:** `feature`, `store`, `must` · **Depends on:** M9-02, M8-03 · **SRS refs:** PAY-04, PAY-05, SEC-02, SEC-10

**Tasks**
- [ ] `lib/loadRazorpay.js`: loads `https://checkout.razorpay.com/v1/checkout.js` once.
- [ ] The checkout page shows an order summary. "Pay" creates the order and opens Razorpay with `order_id`, `amount`, `prefill.name`, `prefill.email`, and the store name.
- [ ] The `handler` callback sends the three Razorpay fields to `/checkout/verify` (M9-04). `modal.ondismiss` returns the buyer to the cart.
- [ ] Update the Content Security Policy (Caddy for the store, Helmet for the API) to allow Razorpay's script, frame, and API domains.

**Acceptance criteria**
- The Razorpay window opens with the correct amount and the buyer's name and email filled in.
- Card and UPI details are entered only in Razorpay's window, never in the store's own forms.

**Test criteria**
- Component: the Razorpay constructor is called with the correct options (`window.Razorpay` mocked).
- Manual: a test-mode payment on staging (SRS Section 8.4).

---

#### M9-04 · Verify payment signature (`POST /checkout/verify`)

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M9-02 · **SRS refs:** PAY-05, PAY-06, SEC-07

**Context:** This gives the buyer fast feedback after paying. The webhook (M9-05) remains the authoritative source for marking the order paid.

**Tasks**
- [ ] Compute `HMAC_SHA256(razorpay_order_id + "|" + razorpay_payment_id, RAZORPAY_KEY_SECRET)` and compare it with `crypto.timingSafeEqual`.
- [ ] If it matches: save `razorpayPaymentId` on the order and return the order status. If the webhook hasn't arrived yet, return `pending_confirmation`.
- [ ] If it doesn't match: return `400 INVALID_SIGNATURE` and change nothing.

**Acceptance criteria**
- A correct signature is accepted. A signature that differs by one character is rejected with no change to the order.
- A buyer cannot verify another buyer's order.

**Test criteria**
- Unit: signature helper with known test vectors.
- Integration: valid, invalid, and another user's order.

---

#### M9-05 · Razorpay webhook: signature, idempotency, payment events, entitlements

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M9-01, M9-02 · **SRS refs:** PAY-07, PAY-08, PAY-09, PAY-10, SEC-07, 6 (`webhookEvents`, `entitlements`)

**Context:** This is the most important part of the payment system. It must reject forged requests, and it must handle the same event arriving more than once.

**Tasks**
- [ ] Mount `POST /webhooks/razorpay` with `express.raw({ type: "application/json" })` **before** the global `express.json()`.
- [ ] Verify `X-Razorpay-Signature` as HMAC-SHA256 of the raw body using `RAZORPAY_WEBHOOK_SECRET`. Return `400` if it doesn't match.
- [ ] Save the event in `webhookEvents` with a unique `eventId` (from the `x-razorpay-event-id` header). If the ID already exists, return `200` and do nothing else.
- [ ] Add a `payments` job. The processor for `payment.captured` marks the order `paid` and creates an `Entitlement` per item, using an upsert on the unique `(userId, bookId)` pair, then clears the cart. For `payment.failed`, it marks the order `failed`.
- [ ] Return `200` quickly, and do the processing in the worker.
- [ ] Create the `Entitlement` model with `downloadLimit` copied from settings.
- [ ] Configure the webhook URL `https://api.staging.<domain>/api/v1/webhooks/razorpay` in the Razorpay test dashboard.

**Acceptance criteria**
- A webhook with an invalid signature returns `400` and changes nothing.
- A valid `payment.captured` marks the order paid and creates one entitlement per book.
- Sending the same event twice creates no duplicate entitlements.
- A `payment.captured` for an order that is already paid does nothing.

**Test criteria**
- Integration: invalid signature causes no state change (**TC-01**). A valid captured event creates the paid order and entitlements, and sending it again creates no duplicates (**TC-02**). `payment.failed` marks the order failed. The signature is checked on the raw body (a re-serialized body fails).

---

#### M9-06 · Payment result pages and expiring unpaid orders

**Labels:** `feature`, `store`, `api`, `must` · **Depends on:** M9-03, M9-05 · **SRS refs:** PAY-11, PAY-12

**Tasks**
- [ ] The success page polls `GET /me/orders/:id` until the order is `paid` (or up to 30 seconds), then shows a link to My Library.
- [ ] The failure page shows the reason and a "Try again" button that restarts checkout.
- [ ] A `maintenance` repeatable job every 5 minutes marks `pending` orders older than 30 minutes as `expired`.

**Acceptance criteria**
- After paying, the buyer sees the success page and a working library link.
- A pending order with no payment after 30 minutes becomes `expired`.

**Test criteria**
- Component (MSW): success polling, failure and retry.
- Integration: the expiry processor expires only pending orders older than 30 minutes.

---

## M10 — Library and Downloads

**Goal:** Buyers see the books they own and download them through short-lived signed URLs, with ownership checks, download limits, and logging.

**Release `v0.11.0`:** The complete buyer flow works on staging: sign in, buy, and download.

#### M10-01 · Library API and ownership flags

**Labels:** `feature`, `api`, `must` · **Depends on:** M9-05 · **SRS refs:** LIB-01, CAT-07, CART-04

**Tasks**
- [ ] `GET /me/library`: active (not revoked) entitlements with book cover, title, purchase date, and downloads used and remaining.
- [ ] `GET /me/library/ids`: IDs of owned books, used by the store to show "In your library".
- [ ] Connect the ownership check to the cart API (M8-02) and the checkout (M9-02) so owned books are refused.
- [ ] Archived books still appear in the library.

**Acceptance criteria**
- The library shows every owned book, including archived ones.
- An owned book cannot be added to the cart or checked out again.

**Test criteria**
- Integration: library contents, revoked entitlement hidden, owned book refused by the cart and checkout.

---

#### M10-02 · Download endpoint with signed URLs, limits, and logging

**Labels:** `feature`, `api`, `security`, `must` · **Depends on:** M10-01, M6-05 · **SRS refs:** LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, SEC-05, SEC-08

**Tasks**
- [ ] `GET /me/library/:bookId/download`: find an active entitlement, otherwise return `403`.
- [ ] If `downloadCount >= downloadLimit`, return `403 DOWNLOAD_LIMIT_REACHED`.
- [ ] Sign a `GetObject` URL on the private bucket, valid for 5 minutes, with `ResponseContentDisposition: attachment; filename="<book-slug>.pdf"`.
- [ ] Increase `downloadCount` atomically, and save a `downloads` record (user, book, IP, user agent). Rate-limit the route.

**Acceptance criteria**
- A buyer who doesn't own the book gets `403`.
- The link expires after 5 minutes.
- The file downloads with a readable file name.
- Downloads beyond the limit are refused.

**Test criteria**
- Integration (R2 mocked): not owned returns `403` (**TC-04**), limit enforced (**TC-05**), revoked entitlement returns `403`, a download log entry is created, the URL expiry is 300 seconds.
- Manual (staging): a real download works, and the same URL fails after 5 minutes.

---

#### M10-03 · My Library page and "In your library" labels

**Labels:** `feature`, `store`, `must` · **Depends on:** M10-01, M10-02 · **SRS refs:** LIB-01, LIB-02, CAT-07

**Tasks**
- [ ] My Library page: a grid of owned books with purchase date, downloads remaining, and a Download button that fetches a fresh URL and starts the download.
- [ ] Book cards and the detail page show "In your library" instead of "Add to cart" for owned books.

**Acceptance criteria**
- Download starts the file download, and the remaining count goes down.
- Owned books show "In your library" throughout the store.

**Test criteria**
- Component (MSW): library list, limit reached message, owned badge on book cards.

---

#### M10-04 · End-to-end test of the full purchase flow

**Labels:** `test`, `must` · **Depends on:** M10-03 · **SRS refs:** TC-09, 8.4

**Context:** The Razorpay window cannot be automated reliably, so the test simulates the captured payment by sending a signed test webhook.

**Tasks**
- [ ] Playwright: sign in through test login, add a book, start checkout, then send a signed `payment.captured` webhook for the created order.
- [ ] Check that the success page shows, the book appears in My Library, and the download request returns a signed URL.

**Acceptance criteria**
- The test passes in CI and against staging.

**Test criteria**
- **TC-09** passes.

---

#### M10-05 · Stamp the buyer's email into the PDF at download (optional)

**Labels:** `feature`, `api`, `could` · **Depends on:** M10-02 · **SRS refs:** LIB-07

**Tasks**
- [ ] Behind a setting: load the PDF, add "Licensed to <email>" to each page's footer with `pdf-lib`, save it as a temporary object, and sign that object instead.
- [ ] Delete temporary objects after one hour (R2 lifecycle rule on the `tmp/` prefix).

**Acceptance criteria**
- When the setting is on, the downloaded file shows the buyer's email on every page.

**Test criteria**
- Unit: the stamping function adds text to every page of a sample PDF.

---

## M11 — Orders, Emails, Invoices, and Profile

**Goal:** Buyers see their order history, download invoices, receive transactional emails, and update their profile.

**Release `v0.12.0`:** After a purchase on staging, the buyer receives a confirmation email and can download an invoice.

#### M11-01 · Email service and email jobs

**Labels:** `feature`, `api`, `must` · **Depends on:** M9-01 · **SRS refs:** JOB-01, JOB-02, JOB-03

**Tasks**
- [ ] `services/email.js`: send through Resend (or Nodemailer SMTP) with default templates in `src/emails/`. Templates are editable in M14.
- [ ] `emails` job processor. Each job has a `jobId` built from the event (for example `order-confirmed:<orderId>`) so the same email is never sent twice.
- [ ] Send the welcome email on a buyer's first sign-in.

**Acceptance criteria**
- Emails are sent by the worker, not during the request, and failed sends are retried.
- The same email is never sent twice for the same event.

**Test criteria**
- Unit: templates render with variables filled in.
- Integration: a duplicate job ID is not queued twice (email provider mocked).

---

#### M11-02 · Order emails from payment events

**Labels:** `feature`, `api`, `must` · **Depends on:** M11-01, M9-05 · **SRS refs:** ORD-03, JOB-03

**Tasks**
- [ ] After `payment.captured` is processed, queue the order confirmation email with a link to My Library.
- [ ] After `payment.failed`, queue the payment failed email with a link to try again.

**Acceptance criteria**
- A paid order sends exactly one confirmation email, even if the webhook arrives twice.

**Test criteria**
- Integration: the captured event sent twice queues one email.

---

#### M11-03 · Order history

**Labels:** `feature`, `api`, `store`, `must` · **Depends on:** M9-05 · **SRS refs:** ORD-01

**Tasks**
- [ ] `GET /me/orders` (paginated, newest first) and `GET /me/orders/:id`, returning only the buyer's own orders.
- [ ] Orders page with status badges, items, amount, and date, and an order detail view.

**Acceptance criteria**
- A buyer sees only their own orders. Another buyer's order ID returns `404`.

**Test criteria**
- Integration: list, detail, another user's order returns `404`. Component: status badges and empty state.

---

#### M11-04 · Invoice PDFs

**Labels:** `feature`, `api`, `store`, `should` · **Depends on:** M11-03, M8-01 · **SRS refs:** ORD-02, 5.5

**Tasks**
- [ ] Give paid orders a sequential invoice number (`INV-<year>-<seq>`), using an atomic counter.
- [ ] An `invoices` job builds the PDF with `pdf-lib` (store details, buyer, items, GST breakdown when enabled) and saves it to the private bucket.
- [ ] `GET /me/orders/:id/invoice` returns a signed URL. The Orders page gets a "Download invoice" button.

**Acceptance criteria**
- Each paid order has exactly one invoice number, with no gaps or duplicates.
- The invoice shows the GST breakdown when GST is enabled.

**Test criteria**
- Unit: invoice numbering under concurrent calls. Invoice content contains the order totals.
- Integration: only the owner can get the invoice URL.

---

#### M11-05 · Buyer profile

**Labels:** `feature`, `api`, `store`, `should` · **Depends on:** M5-05 · **SRS refs:** PRO-01

**Tasks**
- [ ] `PATCH /me` with `{ name }` (validated). Profile page showing the email and avatar, with an editable display name.

**Acceptance criteria**
- The new name appears in the header right after saving.

**Test criteria**
- Integration: update the name, reject an invalid name. Component: the form saves and shows the result.

---

## M12 — Reviews

**Goal:** Buyers rate and review books they own, and the admin can hide or delete reviews.

**Release `v0.13.0`:** A buyer reviews a purchased book on staging, and the rating shows on the book page.

#### M12-01 · Reviews API and rating summary

**Labels:** `feature`, `api`, `must` · **Depends on:** M10-01 · **SRS refs:** REV-01, REV-02, REV-03, 6 (`reviews`)

**Tasks**
- [ ] `models/Review.js` with a unique `(userId, bookId)` index.
- [ ] `POST /books/:id/reviews` (owners only), `PATCH` and `DELETE` for the author's own review, and `GET /books/:id/reviews` (paginated, visible reviews only).
- [ ] Update `ratingAvg` and `ratingCount` on the book whenever a review is added, edited, deleted, or hidden.

**Acceptance criteria**
- Only buyers who own the book can review it, and only once.
- The book's rating updates immediately.

**Test criteria**
- Integration: non-owner returns `403`, second review returns `409`, edit and delete own review only, rating summary correct after each change.

---

#### M12-02 · Reviews on the book detail page

**Labels:** `feature`, `store`, `must` · **Depends on:** M12-01, M7-04 · **SRS refs:** REV-01, REV-02, CAT-05

**Tasks**
- [ ] A reviews list with star ratings and pagination.
- [ ] Owners see a review form (1–5 stars and a comment) and can edit or delete their own review.

**Acceptance criteria**
- The form appears only for owners who haven't reviewed yet, and changes to "Edit your review" afterwards.

**Test criteria**
- Component (MSW): form visibility rules, submit, edit, delete.

---

#### M12-03 · Review moderation in the admin app

**Labels:** `feature`, `api`, `admin`, `must` · **Depends on:** M12-01, M6-01 · **SRS refs:** ADM-RV-01, REV-03, ADM-AU-01

**Tasks**
- [ ] `GET /admin/reviews` (filter by book, rating, hidden), `PATCH /admin/reviews/:id` with `{ isHidden }`, `DELETE /admin/reviews/:id`. Write audit entries.
- [ ] An admin reviews page with hide, unhide, and delete actions.

**Acceptance criteria**
- A hidden review disappears from the store, and the book's rating is recalculated.

**Test criteria**
- Integration: hide, unhide, delete, rating recalculated, audit entries created.

---

## M13 — Admin Operations

**Goal:** The admin manages orders and refunds and manages customers, including blocking them.

**Release `v0.14.0`:** On staging, the admin refunds a test order and the buyer loses access to the book.

#### M13-01 · Admin orders list and detail

**Labels:** `feature`, `api`, `admin`, `must` · **Depends on:** M9-05 · **SRS refs:** ADM-OR-01, ADM-OR-02

**Tasks**
- [ ] `GET /admin/orders` with filters (status, date range) and search (order ID, Razorpay order ID, buyer email).
- [ ] `GET /admin/orders/:id` with items, amounts, Razorpay IDs, status history, and related webhook events.
- [ ] Orders list and detail pages in the admin app.

**Acceptance criteria**
- The admin can find any order by its ID or the buyer's email and see its full webhook history.

**Test criteria**
- Integration: filters, search, buyer returns `403`. Component: filters update the query.

---

#### M13-02 · Refunds

**Labels:** `feature`, `api`, `admin`, `security`, `must` · **Depends on:** M13-01, M11-01 · **SRS refs:** ADM-OR-03, ADM-OR-04, ADM-OR-05, JOB-03, TC-07

**Tasks**
- [ ] `POST /admin/orders/:id/refund`: only for `paid` orders. Calls the Razorpay Refunds API for the full amount and records the refund as requested. Writes an audit entry.
- [ ] Webhook `refund.processed` (using the same verification and idempotency as M9-05): mark the order `refunded`, set `revokedAt` on its entitlements, and queue the refund email.
- [ ] A "Refund" button on the order detail page with a confirmation dialog.

**Acceptance criteria**
- Refunding a paid order ends with the order `refunded` and the buyer unable to download the refunded books.
- Refunding an order that is not paid returns `422`.
- The buyer receives one refund email.

**Test criteria**
- Integration (Razorpay mocked): refund request, then `refund.processed` revokes access (**TC-07**), duplicate webhook has no extra effect, refunding an unpaid order returns `422`.
- Manual: a test-mode refund on staging.

---

#### M13-03 · Customers list and blocking

**Labels:** `feature`, `api`, `admin`, `must` · **Depends on:** M10-02, M6-01 · **SRS refs:** ADM-CU-01, ADM-CU-02, AUTH-10

**Tasks**
- [ ] `GET /admin/customers` with search and counts of orders, books owned, and downloads.
- [ ] `PATCH /admin/customers/:id` with `{ isBlocked }`. Blocking also revokes all the user's refresh tokens. Write audit entries.
- [ ] A customers page with a detail view (purchases and downloads) and block and unblock buttons.

**Acceptance criteria**
- A blocked customer is signed out within 15 minutes (when the access token expires) and cannot sign in again.
- The admin cannot block their own account.

**Test criteria**
- Integration: block revokes sessions, blocked user refused at sign-in and on API calls, cannot block self, audit entries created.

---

## M14 — Settings, Audit Log, and Legal Pages

**Goal:** The admin configures the store and email templates and views the audit log. The store has its legal pages.

**Release `v0.15.0`:** All SRS "Must have" and "Should have" requirements are complete on staging.

#### M14-01 · Store settings screen

**Labels:** `feature`, `api`, `admin`, `must` · **Depends on:** M8-01, M6-05 · **SRS refs:** ADM-ST-01

**Tasks**
- [ ] `GET /admin/settings` and `PATCH /admin/settings`: store name, support email, logo (uploaded like a cover), GST settings, default download limit. Write audit entries.
- [ ] A public `GET /settings/public` for the store (store name, logo, support email).
- [ ] A settings page in the admin app.

**Acceptance criteria**
- Changing the GST rate changes new cart totals, and existing orders stay unchanged.
- Changing the default download limit applies to new purchases only.

**Test criteria**
- Integration: update settings, new orders use the new values, old orders unchanged, audit entry created.

---

#### M14-02 · Email template editing

**Labels:** `feature`, `api`, `admin`, `should` · **Depends on:** M14-01, M11-01 · **SRS refs:** ADM-ST-02

**Tasks**
- [ ] Editable subject and body for the welcome, order confirmation, payment failed, and refund emails, with a list of allowed placeholders (for example `{{name}}`, `{{orderId}}`).
- [ ] A preview with sample data, and a "Reset to default" button.

**Acceptance criteria**
- An edited template is used for the next email of that type.
- Unknown placeholders are rejected when saving.

**Test criteria**
- Unit: rendering with placeholders, rejection of unknown placeholders. Integration: save and reset.

---

#### M14-03 · Audit log viewer

**Labels:** `feature`, `api`, `admin`, `should` · **Depends on:** M6-01 · **SRS refs:** ADM-AU-02

**Tasks**
- [ ] `GET /admin/audit-log` with filters (action, entity, date range), paginated.
- [ ] An audit log page with a detail view showing the before and after values side by side.

**Acceptance criteria**
- Every admin action from the earlier milestones appears in the log.

**Test criteria**
- Integration: filters and pagination. Component: the before and after view renders.

---

#### M14-04 · Legal pages and account deletion request

**Labels:** `feature`, `store`, `api`, `must` · **Depends on:** M5-05 · **SRS refs:** 5.5

**Tasks**
- [ ] Terms of Service, Privacy Policy, and Refund Policy pages, linked from the store footer.
- [ ] `POST /me/deletion-request`: records the request and emails the support address. When processed, the account is anonymized and order records are kept for tax purposes.

**Acceptance criteria**
- All three legal pages are reachable from every store page.
- Anonymizing an account keeps its orders and invoices.

**Test criteria**
- Integration: after anonymizing, orders remain and personal fields are cleared. E2E: the footer links open the three pages.

---

## M15 — Hardening and Production Launch

**Goal:** The platform passes the security, performance, accessibility, and reliability requirements, and production goes live.

**Release `v1.0.0`:** Production is live at `https://<domain>` and the SRS Section 9 acceptance criteria are met.

#### M15-01 · Security review

**Labels:** `security`, `must` · **Depends on:** M14 complete · **SRS refs:** SEC-01 to SEC-11

**Tasks**
- [ ] Finalize the Content Security Policy for the store, admin, and API (only self, Razorpay, Google, and the CDN).
- [ ] Confirm rate limits on the auth, checkout, download, and upload-signing routes.
- [ ] Confirm every route validates its inputs with Zod, every admin route checks the admin role, and cookies use the correct flags.
- [ ] Try direct access to R2 private objects without a signed URL.
- [ ] Get `npm audit` to zero high or critical findings, and scan the git history for secrets (for example with `gitleaks`).

**Acceptance criteria**
- A private PDF cannot be opened without a valid, unexpired signed URL.
- There are no high or critical findings.

**Test criteria**
- Integration: a test that loops over every `/admin/*` route and checks that a buyer receives `403`.
- Manual: the checklist above, with results recorded in the issue.

---

#### M15-02 · Performance check

**Labels:** `infra`, `must` · **Depends on:** M15-01 · **SRS refs:** PERF-01 to PERF-04

**Tasks**
- [ ] Seed staging with 1,000 books and load-test the catalog and library routes (for example with k6).
- [ ] Check that every query uses an index (`explain()` in MongoDB Atlas).
- [ ] Run Lighthouse on the store home and book pages with mobile throttling.

**Acceptance criteria**
- p95 API response time is under 300 ms, and store Largest Contentful Paint is under 2.5 seconds.

**Test criteria**
- The load test and Lighthouse reports are attached to the issue.

---

#### M15-03 · Accessibility and responsive layout check

**Labels:** `test`, `must` · **Depends on:** M15-01 · **SRS refs:** 4.1

**Tasks**
- [ ] Add `@axe-core/playwright` checks to the main pages of the store and admin app.
- [ ] Check keyboard navigation for sign-in, cart, checkout, and library. Check layouts at 360 px, tablet, and desktop in light and dark themes.

**Acceptance criteria**
- There are no serious or critical axe violations, and every action can be done with the keyboard.

**Test criteria**
- The axe checks run in CI as part of the end-to-end suite.

---

#### M15-04 · Backups, logs, and alerts

**Labels:** `infra`, `devops`, `must` · **Depends on:** M15-01 · **SRS refs:** SCAL-03, SCAL-04, MAIN-02, MAIN-03

**Tasks**
- [ ] Enable daily MongoDB Atlas backups with at least 7 days of retention, and do one test restore.
- [ ] Send the API and worker logs to a log service or keep them on the server with rotation. Add alerts for repeated failed jobs and failed webhooks.

**Acceptance criteria**
- A backup has been restored successfully to a test cluster.
- Failed jobs trigger an alert.

**Test criteria**
- Manual: restore test and alert test, recorded in the issue.

---

#### M15-05 · Production environment and release pipeline

**Labels:** `infra`, `devops`, `must` · **Depends on:** M15-04 · **SRS refs:** 2.3, SEC-06

**Tasks**
- [ ] Set up a production VPS following M3-01 and M3-02, in `/opt/bookstore/production`.
- [ ] Create production resources: Atlas cluster, Redis, R2 buckets `books-private` and `books-public` with `cdn.<domain>`, Razorpay **live** keys and webhook, the Google OAuth production origins, and Resend.
- [ ] Add DNS records for `<domain>`, `admin.<domain>`, and `api.<domain>`, and `deploy/compose.production.yml` with the Caddy domains.
- [ ] `.github/workflows/deploy-production.yml`: triggered by a `v*.*.*` tag, uses the GitHub Environment `production` with required reviewer approval, and includes the same health check, rollback, and smoke tests as staging.

**Acceptance criteria**
- Pushing tag `v1.0.0` deploys production after approval.
- Staging and production share no databases, buckets, or keys.

**Test criteria**
- The production smoke tests pass after the deploy.

---

#### M15-06 · Release acceptance and go-live

**Labels:** `test`, `must` · **Depends on:** M15-05 · **SRS refs:** SRS Section 9

**Tasks**
- [ ] Confirm that every "Must have" requirement in SRS Section 3 is closed (see the traceability table below).
- [ ] Confirm that all required test cases TC-01 to TC-10 pass in CI.
- [ ] On staging: complete a real test-mode purchase, download, and refund.
- [ ] On production: make one real low-value purchase, download it, and refund it. Then switch the store live.

**Acceptance criteria**
- Every item in SRS Section 9 is checked and recorded in this issue.

**Test criteria**
- The acceptance checklist is complete and signed off.

---

## Appendix A — SRS Traceability

| SRS requirements | Milestone and issues |
|---|---|
| AUTH-01 to AUTH-11 | M5-02, M5-03, M5-05, M5-06, M13-03 |
| CAT-01 to CAT-08 | M7-01 to M7-04, M10-03 |
| CART-01 to CART-05, WISH-01, WISH-02 | M8-01 to M8-04, M10-01 |
| PAY-01 to PAY-12 | M9-02 to M9-06 |
| LIB-01 to LIB-07 | M10-01 to M10-05 |
| ORD-01 to ORD-03, PRO-01 | M11-02 to M11-05 |
| REV-01 to REV-03, ADM-RV-01 | M12-01 to M12-03 |
| ADM-BK-01 to ADM-BK-08, ADM-CT-01, ADM-CT-02 | M6-02 to M6-06 |
| ADM-OR-01 to ADM-OR-05, ADM-CU-01, ADM-CU-02 | M13-01 to M13-03 |
| ADM-ST-01, ADM-ST-02, ADM-AU-01, ADM-AU-02 | M6-01, M14-01 to M14-03 |
| JOB-01 to JOB-03 | M9-01, M11-01, M11-02, M13-02 |
| SEC-01 to SEC-11 | M1-03, M3-01, M4-02, M4-03, M5-04, M6-05, M9-04, M9-05, M10-02, M15-01 |
| PERF-01 to PERF-04 | M6-04, M7-01, M7-02, M15-02 |
| SCAL-01 to SCAL-04, MAIN-01 to MAIN-04 | M0-01, M0-03, M1-01, M2-01, M3-05, M3-06, M9-01, M15-04 |
| Section 5.5 (legal) | M11-04, M14-04 |

## Appendix B — Required Test Cases

| Test case | Issue |
|---|---|
| TC-01 Invalid webhook signature rejected | M9-05 |
| TC-02 Captured webhook is idempotent | M9-05 |
| TC-03 Checkout uses database prices | M9-02 |
| TC-04 Download refused for non-owners | M10-02 |
| TC-05 Download limit enforced | M10-02 |
| TC-06 Admin routes reject buyers | M5-03, M5-06, M15-01 |
| TC-07 Refund revokes access | M13-02 |
| TC-08 Expired access token refreshed automatically | M5-05 |
| TC-09 End-to-end purchase and download | M10-04 |
| TC-10 End-to-end admin creates and publishes a book | M6-06, M7-04 |
