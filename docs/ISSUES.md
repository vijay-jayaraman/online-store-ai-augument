# Issue List — Version 1.0

## Digital Book Store — PDF E-Book Platform (MERN)

| Field | Value |
|---|---|
| Document version | 1.0 |
| Date | 2 October 2026 |
| Based on | [MILESTONES.md](./MILESTONES.md) v1.0, [SRS.md](./SRS.md) v1.0 |
| Milestones | 16 (M0–M15) |
| Issues | 79 |

---

## 1. How to Use This List

- This is the list of GitHub issues to create for version 1.0. Each row is one issue, and each milestone section is one GitHub milestone.
- **Issue title on GitHub:** `<ID> · <Title>`, for example `M5-02 · ...`. Put the ID first so issues sort in build order and match branch names (`feat/M5-02-...`).
- **Issue body on GitHub:** copy the matching section from [MILESTONES.md](./MILESTONES.md). The ID in each row links to it. It holds the context, tasks, acceptance criteria, and test criteria.
- **Labels and milestone:** set them as shown in the row. Label definitions are in [MILESTONES.md §1.2](./MILESTONES.md#12-labels).
- **Depends on:** do not start an issue until the issues it depends on are closed. After creating the issues on GitHub, replace these IDs with the real issue numbers (`#12`) so GitHub links them.
- Every issue also follows the [Definition of Done](./MILESTONES.md#13-definition-of-done-applies-to-every-issue).
- If an issue changes, edit MILESTONES.md first, then update this list.

---

## 2. Summary

| Milestone | Name | Release tag | Issues |
|---|---|---|---|
| [M0](#m0--foundation-and-test-setup) | Foundation and Test Setup | `v0.1.0` | 8 |
| [M1](#m1--ci-pipeline-github-actions) | CI Pipeline (GitHub Actions) | `v0.2.0` | 5 |
| [M2](#m2--docker) | Docker | `v0.3.0` | 4 |
| [M3](#m3--staging-vps-and-continuous-deployment) | Staging VPS and Continuous Deployment | `v0.4.0` | 6 |
| [M4](#m4--domain-mapping-and-ssl) | Domain Mapping and SSL | `v0.5.0` | 4 |
| [M5](#m5--authentication) | Authentication | `v0.6.0` | 6 |
| [M6](#m6--admin-catalog-and-uploads) | Admin Catalog and Uploads | `v0.7.0` | 6 |
| [M7](#m7--store-catalog) | Store Catalog | `v0.8.0` | 4 |
| [M8](#m8--cart-and-wishlist) | Cart and Wishlist | `v0.9.0` | 4 |
| [M9](#m9--checkout-and-payments-razorpay) | Checkout and Payments (Razorpay) | `v0.10.0` | 6 |
| [M10](#m10--library-and-downloads) | Library and Downloads | `v0.11.0` | 5 |
| [M11](#m11--orders-emails-invoices-and-profile) | Orders, Emails, Invoices, and Profile | `v0.12.0` | 5 |
| [M12](#m12--reviews) | Reviews | `v0.13.0` | 3 |
| [M13](#m13--admin-operations) | Admin Operations | `v0.14.0` | 3 |
| [M14](#m14--settings-audit-log-and-legal-pages) | Settings, Audit Log, and Legal Pages | `v0.15.0` | 4 |
| [M15](#m15--hardening-and-production-launch) | Hardening and Production Launch | `v1.0.0` | 6 |
| | **Total** | | **79** |

**Issues per label**

| Label | Issues |
|---|---|
| `feature` | 45 |
| `infra` | 26 |
| `test` | 9 |
| `docs` | 1 |
| `security` | 15 |
| `api` | 38 |
| `store` | 17 |
| `admin` | 13 |
| `shared` | 2 |
| `ci` | 7 |
| `devops` | 14 |
| `must` | 72 |
| `should` | 6 |
| `could` | 1 |

---

## M0 — Foundation and Test Setup

**GitHub milestone title:** `M0 — Foundation and Test Setup` · **Release:** `v0.1.0` · **Issues:** 8

**Goal:** A working monorepo in which all three apps and the shared package start locally and every type of test (unit, component, integration, end-to-end) runs with at least one sample test.

**Done when:** `npm run dev` starts all apps, and `npm test` and `npm run test:e2e` pass.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m0-01"></a>[M0-01](./MILESTONES.md#m0-01--initialize-the-npm-workspaces-monorepo-with-lint-and-formatting) | Initialize the npm workspaces monorepo with lint and formatting | `infra`, `must` | — | MAIN-01, MAIN-04, SEC-06 |
| <a id="m0-02"></a>[M0-02](./MILESTONES.md#m0-02--create-the-packagesshared-package) | Create the `packages/shared` package | `infra`, `shared`, `must` | [M0-01](#m0-01) | MAIN-01, SEC-04 |
| <a id="m0-03"></a>[M0-03](./MILESTONES.md#m0-03--create-the-api-skeleton-express-5) | Create the API skeleton (Express 5) | `infra`, `api`, `must` | [M0-02](#m0-02) | MAIN-02, MAIN-03, 4.2 |
| <a id="m0-04"></a>[M0-04](./MILESTONES.md#m0-04--set-up-api-tests-vitest-supertest-in-memory-mongodb) | Set up API tests (Vitest, Supertest, in-memory MongoDB) | `test`, `api`, `must` | [M0-03](#m0-03) | 8.1, 8.2 |
| <a id="m0-05"></a>[M0-05](./MILESTONES.md#m0-05--create-the-store-app-skeleton) | Create the store app skeleton | `infra`, `store`, `must` | [M0-02](#m0-02) | 4.1, 7.2 |
| <a id="m0-06"></a>[M0-06](./MILESTONES.md#m0-06--create-the-admin-app-skeleton) | Create the admin app skeleton | `infra`, `admin`, `must` | [M0-02](#m0-02) | 4.1, 7.2 |
| <a id="m0-07"></a>[M0-07](./MILESTONES.md#m0-07--set-up-frontend-tests-vitest-testing-library-msw) | Set up frontend tests (Vitest, Testing Library, MSW) | `test`, `store`, `admin`, `must` | [M0-05](#m0-05), [M0-06](#m0-06) | 8.1, 8.2 |
| <a id="m0-08"></a>[M0-08](./MILESTONES.md#m0-08--set-up-playwright-end-to-end-tests) | Set up Playwright end-to-end tests | `test`, `must` | [M0-05](#m0-05), [M0-06](#m0-06) | 8.1, 8.2 |

---

## M1 — CI Pipeline (GitHub Actions)

**GitHub milestone title:** `M1 — CI Pipeline (GitHub Actions)` · **Release:** `v0.2.0` · **Issues:** 5

**Goal:** Every pull request and every push to `main` is checked automatically, and a pull request cannot be merged until the checks pass.

**Done when:** A pull request shows green checks for lint, tests, audit, and end-to-end tests.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m1-01"></a>[M1-01](./MILESTONES.md#m1-01--ci-workflow-for-lint-and-format-checks) | CI workflow for lint and format checks | `infra`, `ci`, `must` | [M0-01](#m0-01) | MAIN-04 |
| <a id="m1-02"></a>[M1-02](./MILESTONES.md#m1-02--run-unit-component-and-integration-tests-with-coverage-in-ci) | Run unit, component, and integration tests with coverage in CI | `infra`, `ci`, `test`, `must` | [M1-01](#m1-01), [M0-04](#m0-04), [M0-07](#m0-07) | 8.4 |
| <a id="m1-03"></a>[M1-03](./MILESTONES.md#m1-03--dependency-audit-in-ci) | Dependency audit in CI | `security`, `ci`, `must` | [M1-01](#m1-01) | SEC-11 |
| <a id="m1-04"></a>[M1-04](./MILESTONES.md#m1-04--run-playwright-tests-in-ci) | Run Playwright tests in CI | `infra`, `ci`, `test`, `must` | [M1-02](#m1-02), [M0-08](#m0-08) | 8.4 |
| <a id="m1-05"></a>[M1-05](./MILESTONES.md#m1-05--branch-protection-and-github-templates) | Branch protection and GitHub templates | `infra`, `docs`, `must` | [M1-04](#m1-04) | — |

---

## M2 — Docker

**GitHub milestone title:** `M2 — Docker` · **Release:** `v0.3.0` · **Issues:** 4

**Goal:** Every deployable part runs as a Docker image, the full stack runs locally with Docker Compose, and CI publishes images to the GitHub Container Registry (GHCR).

**Done when:** `docker compose up` runs the complete stack locally, and each merge to `main` publishes new images.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m2-01"></a>[M2-01](./MILESTONES.md#m2-01--docker-image-for-the-api-and-worker) | Docker image for the API and worker | `infra`, `devops`, `api`, `must` | [M0-03](#m0-03) | SCAL-01, SCAL-02, 2.3 |
| <a id="m2-02"></a>[M2-02](./MILESTONES.md#m2-02--web-image-caddy-serving-the-store-and-admin-apps) | Web image: Caddy serving the store and admin apps | `infra`, `devops`, `store`, `admin`, `must` | [M0-05](#m0-05), [M0-06](#m0-06) | 2.3, 4.1 |
| <a id="m2-03"></a>[M2-03](./MILESTONES.md#m2-03--docker-compose-for-local-development-and-a-local-full-stack) | Docker Compose for local development and a local full stack | `infra`, `devops`, `must` | [M2-01](#m2-01), [M2-02](#m2-02) | 2.3 |
| <a id="m2-04"></a>[M2-04](./MILESTONES.md#m2-04--build-and-push-images-to-ghcr-in-ci-with-a-container-smoke-test) | Build and push images to GHCR in CI, with a container smoke test | `infra`, `ci`, `devops`, `must` | [M2-03](#m2-03), [M1-05](#m1-05) | 2.3 |

---

## M3 — Staging VPS and Continuous Deployment

**GitHub milestone title:** `M3 — Staging VPS and Continuous Deployment` · **Release:** `v0.4.0` · **Issues:** 6

**Goal:** A secured VPS runs the staging stack, and every merge to `main` deploys to it automatically, with a health check and automatic rollback.

**Done when:** Merging a change to `main` makes it appear on the staging server within minutes, without manual steps.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m3-01"></a>[M3-01](./MILESTONES.md#m3-01--provision-and-secure-the-staging-vps) | Provision and secure the staging VPS | `infra`, `devops`, `security`, `must` | — | SEC-01, SEC-06 |
| <a id="m3-02"></a>[M3-02](./MILESTONES.md#m3-02--install-docker-and-prepare-the-deployment-folder) | Install Docker and prepare the deployment folder | `infra`, `devops`, `must` | [M3-01](#m3-01) | 2.3 |
| <a id="m3-03"></a>[M3-03](./MILESTONES.md#m3-03--provision-staging-external-services-and-secrets) | Provision staging external services and secrets | `infra`, `devops`, `security`, `must` | [M3-02](#m3-02) | 2.1, 2.5, 4.4, SEC-06 |
| <a id="m3-04"></a>[M3-04](./MILESTONES.md#m3-04--deploy-workflow-automatic-deploy-to-staging-on-merge-to-main) | Deploy workflow: automatic deploy to staging on merge to `main` | `infra`, `ci`, `devops`, `must` | [M3-03](#m3-03), [M2-04](#m2-04) | 2.3 |
| <a id="m3-05"></a>[M3-05](./MILESTONES.md#m3-05--health-check-after-deploy-and-automatic-rollback) | Health check after deploy and automatic rollback | `infra`, `devops`, `must` | [M3-04](#m3-04) | MAIN-03, SCAL-03 |
| <a id="m3-06"></a>[M3-06](./MILESTONES.md#m3-06--uptime-monitoring-for-staging) | Uptime monitoring for staging | `infra`, `devops`, `should` | [M3-05](#m3-05) | MAIN-03, SCAL-03 |

---

## M4 — Domain Mapping and SSL

**GitHub milestone title:** `M4 — Domain Mapping and SSL` · **Release:** `v0.5.0` · **Issues:** 4

**Goal:** Staging is available on its own subdomains over HTTPS, with certificates issued and renewed automatically by Caddy.

**Done when:** `https://store.staging.<domain>`, `https://admin.staging.<domain>`, and `https://api.staging.<domain>/health` all load with valid certificates.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m4-01"></a>[M4-01](./MILESTONES.md#m4-01--dns-records-for-staging) | DNS records for staging | `infra`, `devops`, `must` | [M3-01](#m3-01) | SEC-01, PERF-03 |
| <a id="m4-02"></a>[M4-02](./MILESTONES.md#m4-02--caddy-configuration-for-domains-tls-and-routing) | Caddy configuration for domains, TLS, and routing | `infra`, `devops`, `security`, `must` | [M4-01](#m4-01), [M3-04](#m3-04) | SEC-01, SEC-02 |
| <a id="m4-03"></a>[M4-03](./MILESTONES.md#m4-03--configure-the-api-and-external-services-for-the-staging-domains) | Configure the API and external services for the staging domains | `infra`, `api`, `security`, `must` | [M4-02](#m4-02) | SEC-03, AUTH-06, 4.4, 2.5 |
| <a id="m4-04"></a>[M4-04](./MILESTONES.md#m4-04--run-the-end-to-end-smoke-tests-against-staging-after-each-deploy) | Run the end-to-end smoke tests against staging after each deploy | `test`, `ci`, `must` | [M4-02](#m4-02), [M3-05](#m3-05) | 8.2 |

---

## M5 — Authentication

**GitHub milestone title:** `M5 — Authentication` · **Release:** `v0.6.0` · **Issues:** 6

**Goal:** Buyers sign in with Google One Tap (with a button as fallback), the admin signs in with Google and is recognized through the allowlist, and sessions use short-lived access tokens with rotating refresh tokens.

**Done when:** A buyer signs in on staging with One Tap and stays signed in after a page reload. A non-admin account is refused by the admin app.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m5-01"></a>[M5-01](./MILESTONES.md#m5-01--user-and-refresh-token-models-and-shared-auth-schemas) | User and refresh token models, and shared auth schemas | `feature`, `api`, `shared`, `must` | [M0-04](#m0-04) | 6 (`users`, `refreshTokens`), AUTH-05 |
| <a id="m5-02"></a>[M5-02](./MILESTONES.md#m5-02--google-sign-in-endpoint-post-authgoogle) | Google sign-in endpoint (`POST /auth/google`) | `feature`, `api`, `security`, `must` | [M5-01](#m5-01) | AUTH-04, AUTH-05, AUTH-06, AUTH-09, AUTH-10 |
| <a id="m5-03"></a>[M5-03](./MILESTONES.md#m5-03--refresh-logout-current-user-auth-middleware-and-test-login) | Refresh, logout, current user, auth middleware, and test login | `feature`, `api`, `security`, `must` | [M5-02](#m5-02) | AUTH-07, AUTH-10, SEC-09, 8.4 |
| <a id="m5-04"></a>[M5-04](./MILESTONES.md#m5-04--redis-connection-and-rate-limiting-on-auth-routes) | Redis connection and rate limiting on auth routes | `feature`, `api`, `security`, `must` | [M5-03](#m5-03) | SEC-05, SCAL-01 |
| <a id="m5-05"></a>[M5-05](./MILESTONES.md#m5-05--store-app-google-one-tap-fallback-button-session-handling) | Store app: Google One Tap, fallback button, session handling | `feature`, `store`, `must` | [M5-03](#m5-03) | AUTH-01, AUTH-02, AUTH-03, AUTH-08, AUTH-11, 7.2 |
| <a id="m5-06"></a>[M5-06](./MILESTONES.md#m5-06--admin-app-google-sign-in-and-admin-guard) | Admin app: Google sign-in and admin guard | `feature`, `admin`, `must` | [M5-05](#m5-05) | AUTH-09, TC-06 |

---

## M6 — Admin Catalog and Uploads

**GitHub milestone title:** `M6 — Admin Catalog and Uploads` · **Release:** `v0.7.0` · **Issues:** 6

**Goal:** The admin manages categories, authors, and books, and uploads the full PDF, sample PDF, and cover image directly to Cloudflare R2.

**Done when:** On staging, the admin creates a book with all three files and publishes it.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m6-01"></a>[M6-01](./MILESTONES.md#m6-01--audit-log-model-and-helper) | Audit log model and helper | `feature`, `api`, `must` | [M5-03](#m5-03) | ADM-AU-01, 6 (`auditLogs`) |
| <a id="m6-02"></a>[M6-02](./MILESTONES.md#m6-02--categories-and-authors-admin-api) | Categories and authors: admin API | `feature`, `api`, `must` | [M6-01](#m6-01) | ADM-CT-01, ADM-CT-02 |
| <a id="m6-03"></a>[M6-03](./MILESTONES.md#m6-03--categories-and-authors-admin-ui) | Categories and authors: admin UI | `feature`, `admin`, `must` | [M6-02](#m6-02), [M5-06](#m5-06) | ADM-CT-01, ADM-CT-02, 4.1 |
| <a id="m6-04"></a>[M6-04](./MILESTONES.md#m6-04--book-model-and-admin-book-api) | Book model and admin book API | `feature`, `api`, `must` | [M6-02](#m6-02) | ADM-BK-01, ADM-BK-02, ADM-BK-07, ADM-BK-08, PERF-04 |
| <a id="m6-05"></a>[M6-05](./MILESTONES.md#m6-05--signed-upload-urls-for-r2) | Signed upload URLs for R2 | `feature`, `api`, `security`, `must` | [M6-04](#m6-04) | ADM-BK-04, ADM-BK-05, 4.4, SEC-05, SEC-08 |
| <a id="m6-06"></a>[M6-06](./MILESTONES.md#m6-06--admin-books-ui-with-direct-uploads-and-progress) | Admin books UI with direct uploads and progress | `feature`, `admin`, `must` | [M6-05](#m6-05), [M6-03](#m6-03) | ADM-BK-01, ADM-BK-03, ADM-BK-06 |

---

## M7 — Store Catalog

**GitHub milestone title:** `M7 — Store Catalog` · **Release:** `v0.8.0` · **Issues:** 4

**Goal:** Anyone can browse, search, and filter published books, view book details, and read the free sample.

**Done when:** A book published in the admin app appears in the store, and its sample opens in the browser.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m7-01"></a>[M7-01](./MILESTONES.md#m7-01--public-catalog-api) | Public catalog API | `feature`, `api`, `must` | [M6-04](#m6-04) | CAT-02, CAT-03, CAT-04, CAT-05, CAT-08, PERF-01, PERF-04 |
| <a id="m7-02"></a>[M7-02](./MILESTONES.md#m7-02--home-page) | Home page | `feature`, `store`, `must` | [M7-01](#m7-01) | CAT-01, PERF-02, PERF-03 |
| <a id="m7-03"></a>[M7-03](./MILESTONES.md#m7-03--catalog-page-with-search-filters-and-sorting) | Catalog page with search, filters, and sorting | `feature`, `store`, `must` | [M7-01](#m7-01) | CAT-02, CAT-03, CAT-04 |
| <a id="m7-04"></a>[M7-04](./MILESTONES.md#m7-04--book-detail-page-and-sample-reader) | Book detail page and sample reader | `feature`, `store`, `must` | [M7-01](#m7-01) | CAT-05, CAT-06 |

---

## M8 — Cart and Wishlist

**GitHub milestone title:** `M8 — Cart and Wishlist` · **Release:** `v0.9.0` · **Issues:** 4

**Goal:** Guests and buyers can build a cart, the guest cart moves into the buyer's account on sign-in, and buyers keep a wishlist. The API calculates all totals.

**Done when:** A guest adds books, signs in, and sees the same books in the cart with tax and total.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m8-01"></a>[M8-01](./MILESTONES.md#m8-01--settings-defaults-and-pricing-service) | Settings defaults and pricing service | `feature`, `api`, `must` | [M7-01](#m7-01) | CART-05, PAY-02, ADM-ST-01 |
| <a id="m8-02"></a>[M8-02](./MILESTONES.md#m8-02--cart-api) | Cart API | `feature`, `api`, `must` | [M8-01](#m8-01), [M5-03](#m5-03) | CART-02, CART-03, CART-04, CART-05, 6 (`carts`) |
| <a id="m8-03"></a>[M8-03](./MILESTONES.md#m8-03--store-cart-guest-cart-merge-on-sign-in-cart-page) | Store cart: guest cart, merge on sign-in, cart page | `feature`, `store`, `must` | [M8-02](#m8-02), [M5-05](#m5-05) | CART-01, CART-02, CART-03, CART-05, 7.2 |
| <a id="m8-04"></a>[M8-04](./MILESTONES.md#m8-04--wishlist-api-and-ui) | Wishlist API and UI | `feature`, `api`, `store`, `should` | [M8-03](#m8-03) | WISH-01, WISH-02, 6 (`wishlists`) |

---

## M9 — Checkout and Payments (Razorpay)

**GitHub milestone title:** `M9 — Checkout and Payments (Razorpay)` · **Release:** `v0.10.0` · **Issues:** 6

**Goal:** A signed-in buyer pays through Razorpay Standard Checkout. The order is marked paid by a verified, idempotent webhook, and the buyer's library access is created.

**Done when:** On staging, a buyer pays in Razorpay test mode and the order becomes `paid` through the webhook.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m9-01"></a>[M9-01](./MILESTONES.md#m9-01--background-job-queue-and-worker-bullmq) | Background job queue and worker (BullMQ) | `feature`, `api`, `infra`, `must` | [M5-04](#m5-04) | JOB-01, JOB-02, SCAL-02 |
| <a id="m9-02"></a>[M9-02](./MILESTONES.md#m9-02--order-model-and-create-checkout-order-post-checkoutorders) | Order model and create checkout order (`POST /checkout/orders`) | `feature`, `api`, `security`, `must` | [M8-02](#m8-02), [M9-01](#m9-01) | PAY-01, PAY-02, PAY-03, SEC-05, 6 (`orders`) |
| <a id="m9-03"></a>[M9-03](./MILESTONES.md#m9-03--store-checkout-with-razorpay-standard-checkout) | Store checkout with Razorpay Standard Checkout | `feature`, `store`, `must` | [M9-02](#m9-02), [M8-03](#m8-03) | PAY-04, PAY-05, SEC-02, SEC-10 |
| <a id="m9-04"></a>[M9-04](./MILESTONES.md#m9-04--verify-payment-signature-post-checkoutverify) | Verify payment signature (`POST /checkout/verify`) | `feature`, `api`, `security`, `must` | [M9-02](#m9-02) | PAY-05, PAY-06, SEC-07 |
| <a id="m9-05"></a>[M9-05](./MILESTONES.md#m9-05--razorpay-webhook-signature-idempotency-payment-events-entitlements) | Razorpay webhook: signature, idempotency, payment events, entitlements | `feature`, `api`, `security`, `must` | [M9-01](#m9-01), [M9-02](#m9-02) | PAY-07, PAY-08, PAY-09, PAY-10, SEC-07, 6 (`webhookEvents`, `entitlements`) |
| <a id="m9-06"></a>[M9-06](./MILESTONES.md#m9-06--payment-result-pages-and-expiring-unpaid-orders) | Payment result pages and expiring unpaid orders | `feature`, `store`, `api`, `must` | [M9-03](#m9-03), [M9-05](#m9-05) | PAY-11, PAY-12 |

---

## M10 — Library and Downloads

**GitHub milestone title:** `M10 — Library and Downloads` · **Release:** `v0.11.0` · **Issues:** 5

**Goal:** Buyers see the books they own and download them through short-lived signed URLs, with ownership checks, download limits, and logging.

**Done when:** The complete buyer flow works on staging: sign in, buy, and download.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m10-01"></a>[M10-01](./MILESTONES.md#m10-01--library-api-and-ownership-flags) | Library API and ownership flags | `feature`, `api`, `must` | [M9-05](#m9-05) | LIB-01, CAT-07, CART-04 |
| <a id="m10-02"></a>[M10-02](./MILESTONES.md#m10-02--download-endpoint-with-signed-urls-limits-and-logging) | Download endpoint with signed URLs, limits, and logging | `feature`, `api`, `security`, `must` | [M10-01](#m10-01), [M6-05](#m6-05) | LIB-02, LIB-03, LIB-04, LIB-05, LIB-06, SEC-05, SEC-08 |
| <a id="m10-03"></a>[M10-03](./MILESTONES.md#m10-03--my-library-page-and-in-your-library-labels) | My Library page and "In your library" labels | `feature`, `store`, `must` | [M10-01](#m10-01), [M10-02](#m10-02) | LIB-01, LIB-02, CAT-07 |
| <a id="m10-04"></a>[M10-04](./MILESTONES.md#m10-04--end-to-end-test-of-the-full-purchase-flow) | End-to-end test of the full purchase flow | `test`, `must` | [M10-03](#m10-03) | TC-09, 8.4 |
| <a id="m10-05"></a>[M10-05](./MILESTONES.md#m10-05--stamp-the-buyers-email-into-the-pdf-at-download-optional) | Stamp the buyer's email into the PDF at download (optional) | `feature`, `api`, `could` | [M10-02](#m10-02) | LIB-07 |

---

## M11 — Orders, Emails, Invoices, and Profile

**GitHub milestone title:** `M11 — Orders, Emails, Invoices, and Profile` · **Release:** `v0.12.0` · **Issues:** 5

**Goal:** Buyers see their order history, download invoices, receive transactional emails, and update their profile.

**Done when:** After a purchase on staging, the buyer receives a confirmation email and can download an invoice.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m11-01"></a>[M11-01](./MILESTONES.md#m11-01--email-service-and-email-jobs) | Email service and email jobs | `feature`, `api`, `must` | [M9-01](#m9-01) | JOB-01, JOB-02, JOB-03 |
| <a id="m11-02"></a>[M11-02](./MILESTONES.md#m11-02--order-emails-from-payment-events) | Order emails from payment events | `feature`, `api`, `must` | [M11-01](#m11-01), [M9-05](#m9-05) | ORD-03, JOB-03 |
| <a id="m11-03"></a>[M11-03](./MILESTONES.md#m11-03--order-history) | Order history | `feature`, `api`, `store`, `must` | [M9-05](#m9-05) | ORD-01 |
| <a id="m11-04"></a>[M11-04](./MILESTONES.md#m11-04--invoice-pdfs) | Invoice PDFs | `feature`, `api`, `store`, `should` | [M11-03](#m11-03), [M8-01](#m8-01) | ORD-02, 5.5 |
| <a id="m11-05"></a>[M11-05](./MILESTONES.md#m11-05--buyer-profile) | Buyer profile | `feature`, `api`, `store`, `should` | [M5-05](#m5-05) | PRO-01 |

---

## M12 — Reviews

**GitHub milestone title:** `M12 — Reviews` · **Release:** `v0.13.0` · **Issues:** 3

**Goal:** Buyers rate and review books they own, and the admin can hide or delete reviews.

**Done when:** A buyer reviews a purchased book on staging, and the rating shows on the book page.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m12-01"></a>[M12-01](./MILESTONES.md#m12-01--reviews-api-and-rating-summary) | Reviews API and rating summary | `feature`, `api`, `must` | [M10-01](#m10-01) | REV-01, REV-02, REV-03, 6 (`reviews`) |
| <a id="m12-02"></a>[M12-02](./MILESTONES.md#m12-02--reviews-on-the-book-detail-page) | Reviews on the book detail page | `feature`, `store`, `must` | [M12-01](#m12-01), [M7-04](#m7-04) | REV-01, REV-02, CAT-05 |
| <a id="m12-03"></a>[M12-03](./MILESTONES.md#m12-03--review-moderation-in-the-admin-app) | Review moderation in the admin app | `feature`, `api`, `admin`, `must` | [M12-01](#m12-01), [M6-01](#m6-01) | ADM-RV-01, REV-03, ADM-AU-01 |

---

## M13 — Admin Operations

**GitHub milestone title:** `M13 — Admin Operations` · **Release:** `v0.14.0` · **Issues:** 3

**Goal:** The admin manages orders and refunds and manages customers, including blocking them.

**Done when:** On staging, the admin refunds a test order and the buyer loses access to the book.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m13-01"></a>[M13-01](./MILESTONES.md#m13-01--admin-orders-list-and-detail) | Admin orders list and detail | `feature`, `api`, `admin`, `must` | [M9-05](#m9-05) | ADM-OR-01, ADM-OR-02 |
| <a id="m13-02"></a>[M13-02](./MILESTONES.md#m13-02--refunds) | Refunds | `feature`, `api`, `admin`, `security`, `must` | [M13-01](#m13-01), [M11-01](#m11-01) | ADM-OR-03, ADM-OR-04, ADM-OR-05, JOB-03, TC-07 |
| <a id="m13-03"></a>[M13-03](./MILESTONES.md#m13-03--customers-list-and-blocking) | Customers list and blocking | `feature`, `api`, `admin`, `must` | [M10-02](#m10-02), [M6-01](#m6-01) | ADM-CU-01, ADM-CU-02, AUTH-10 |

---

## M14 — Settings, Audit Log, and Legal Pages

**GitHub milestone title:** `M14 — Settings, Audit Log, and Legal Pages` · **Release:** `v0.15.0` · **Issues:** 4

**Goal:** The admin configures the store and email templates and views the audit log. The store has its legal pages.

**Done when:** All SRS "Must have" and "Should have" requirements are complete on staging.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m14-01"></a>[M14-01](./MILESTONES.md#m14-01--store-settings-screen) | Store settings screen | `feature`, `api`, `admin`, `must` | [M8-01](#m8-01), [M6-05](#m6-05) | ADM-ST-01 |
| <a id="m14-02"></a>[M14-02](./MILESTONES.md#m14-02--email-template-editing) | Email template editing | `feature`, `api`, `admin`, `should` | [M14-01](#m14-01), [M11-01](#m11-01) | ADM-ST-02 |
| <a id="m14-03"></a>[M14-03](./MILESTONES.md#m14-03--audit-log-viewer) | Audit log viewer | `feature`, `api`, `admin`, `should` | [M6-01](#m6-01) | ADM-AU-02 |
| <a id="m14-04"></a>[M14-04](./MILESTONES.md#m14-04--legal-pages-and-account-deletion-request) | Legal pages and account deletion request | `feature`, `store`, `api`, `must` | [M5-05](#m5-05) | 5.5 |

---

## M15 — Hardening and Production Launch

**GitHub milestone title:** `M15 — Hardening and Production Launch` · **Release:** `v1.0.0` · **Issues:** 6

**Goal:** The platform passes the security, performance, accessibility, and reliability requirements, and production goes live.

**Done when:** Production is live at `https://<domain>` and the SRS Section 9 acceptance criteria are met.

| ID | Title | Labels | Depends on | SRS refs |
|---|---|---|---|---|
| <a id="m15-01"></a>[M15-01](./MILESTONES.md#m15-01--security-review) | Security review | `security`, `must` | M14 complete | SEC-01 to SEC-11 |
| <a id="m15-02"></a>[M15-02](./MILESTONES.md#m15-02--performance-check) | Performance check | `infra`, `must` | [M15-01](#m15-01) | PERF-01 to PERF-04 |
| <a id="m15-03"></a>[M15-03](./MILESTONES.md#m15-03--accessibility-and-responsive-layout-check) | Accessibility and responsive layout check | `test`, `must` | [M15-01](#m15-01) | 4.1 |
| <a id="m15-04"></a>[M15-04](./MILESTONES.md#m15-04--backups-logs-and-alerts) | Backups, logs, and alerts | `infra`, `devops`, `must` | [M15-01](#m15-01) | SCAL-03, SCAL-04, MAIN-02, MAIN-03 |
| <a id="m15-05"></a>[M15-05](./MILESTONES.md#m15-05--production-environment-and-release-pipeline) | Production environment and release pipeline | `infra`, `devops`, `must` | [M15-04](#m15-04) | 2.3, SEC-06 |
| <a id="m15-06"></a>[M15-06](./MILESTONES.md#m15-06--release-acceptance-and-go-live) | Release acceptance and go-live | `test`, `must` | [M15-05](#m15-05) | SRS Section 9 |
