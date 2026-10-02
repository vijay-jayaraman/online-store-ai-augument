# Software Requirements Specification (SRS)

## Digital Book Store — PDF E-Book Platform (MERN)

| Field | Value |
|---|---|
| Document version | 1.0 |
| Date | 27 September 2026 |
| Status | Final (baseline) |
| Store model | Single seller, multiple buyers |
| Currency | INR |

---

## 1. Introduction

### 1.1 Purpose

This document defines the functional and non-functional requirements for an online store that sells digital books in PDF format. It is the single source of truth for design, development, testing, and acceptance.

### 1.2 Scope

The system consists of three applications in one repository (monorepo):

| Application | Folder | Users | Purpose |
|---|---|---|---|
| Store app | `apps/store` | Guests and buyers | Browse, purchase, and download PDF books |
| Admin app | `apps/admin` | The single store seller | Manage books, orders, customers, reviews, and settings |
| API | `apps/api` | Both apps | Business logic, payments, authentication, file access |
| Shared package | `packages/shared` | All three | Zod schemas, constants, shared types |

### 1.3 Out of Scope

The following are explicitly excluded from this release:

- Coupons, discount codes, and promotional pricing
- Admin analytics, sales charts, and reporting dashboards
- Multi-vendor or marketplace features
- Physical books, shipping, and inventory
- Stripe (replaced by Razorpay)
- Zustand and all TanStack libraries (replaced by Redux Toolkit and RTK Query)

### 1.4 Definitions

| Term | Meaning |
|---|---|
| Guest | A visitor who is not logged in |
| Buyer | A logged-in customer |
| Admin / Seller | The single store owner, identified by an allowlisted email |
| Library | The set of books a buyer has purchased and can download |
| Entitlement | A record granting a buyer access to one purchased book |
| Signed URL | A temporary, expiring link to a file in Cloudflare R2 |
| Webhook | A server-to-server notification sent by Razorpay |
| One Tap | Google's single-click sign-in prompt |
| FedCM | The browser-managed sign-in API that Google One Tap uses in Chrome |

### 1.5 References

- Razorpay Orders, Standard Checkout, Refunds, and Webhooks documentation
- Cloudflare R2 S3-compatible API and CORS documentation
- Google Identity Services: One Tap and FedCM migration guide
- Redux Toolkit and RTK Query documentation
- Tailwind CSS 4 and daisyUI 5 documentation

---

## 2. Overall Description

### 2.1 Product Perspective

A standalone web platform. Both frontends are static single-page applications that call one REST API.

| External service | Purpose |
|---|---|
| MongoDB Atlas | Primary database |
| Razorpay | Payments and refunds |
| Cloudflare R2 | Storage for PDFs, sample PDFs, and cover images |
| Google Identity Services | One Tap and Google sign-in |
| Redis (Upstash or Redis Cloud) | Background job queue and rate limiting |
| Email provider (Resend or SMTP via Nodemailer) | Transactional emails |

### 2.2 User Classes

| User class | Description | Access |
|---|---|---|
| Guest | Not logged in | Browse catalog, search, view book details, read samples, use guest cart |
| Buyer | Logged in with Google | All guest actions plus checkout, library, downloads, reviews, wishlist, profile |
| Admin | The seller; email is on the admin allowlist | Admin app and admin API routes only |

### 2.3 Operating Environment

- Browsers: latest two versions of Chrome, Edge, Firefox, and Safari, on desktop and mobile
- Server runtime: Node.js 24 LTS; upgrade to Node.js 26 LTS after 28 October 2026
- Database: MongoDB 8.x
- Hosting: all apps run as Docker containers on a VPS behind Caddy (automatic HTTPS). Caddy serves the store and admin static builds and reverse-proxies the API. Separate staging and production environments (see [MILESTONES.md](./MILESTONES.md))

### 2.4 Design Constraints

- Payments must use Razorpay.
- Buyer sign-in must use Google One Tap, with a Google button as fallback.
- Files must be stored in Cloudflare R2. Full PDFs must never be publicly accessible.
- Client state and server data must use Redux Toolkit and RTK Query only.
- UI components must use daisyUI on Tailwind CSS.

### 2.5 Assumptions and Dependencies

- The seller has an active Razorpay account with webhooks configured.
- The seller owns distribution rights for every uploaded book.
- Buyers have a Google account.
- A Google Cloud OAuth client ID is configured with the production and staging domains.

---

## 3. Functional Requirements

Priority: **M** = Must have, **S** = Should have, **C** = Could have.

### 3.1 Authentication and Accounts

| ID | Requirement | Priority |
|---|---|---|
| AUTH-01 | The store app shall show the Google One Tap prompt on the login page and when a guest tries to open a protected page. | M |
| AUTH-02 | The store app shall show a "Sign in with Google" button as a fallback when One Tap is dismissed or unavailable. | M |
| AUTH-03 | One Tap shall be configured with FedCM enabled (`use_fedcm_for_prompt: true`). | M |
| AUTH-04 | The API shall verify every Google ID token server-side (signature, audience, issuer, expiry) before signing the user in. | M |
| AUTH-05 | On first sign-in, the API shall create a user record using the Google account's email, name, and avatar. | M |
| AUTH-06 | The API shall issue a short-lived access token (about 15 minutes) and a refresh token stored in an httpOnly, Secure, SameSite cookie. | M |
| AUTH-07 | The API shall rotate the refresh token on every refresh and revoke it on logout. | M |
| AUTH-08 | The frontend shall keep the access token in memory only (Redux state), never in localStorage. | M |
| AUTH-09 | The admin app shall use Google sign-in, and the API shall grant the `admin` role only to emails on the admin allowlist. | M |
| AUTH-10 | Blocked users shall not be able to sign in or use the API. | M |
| AUTH-11 | Logout shall clear the session and call `googleLogout()` to prevent automatic re-sign-in. | M |

### 3.2 Buyer App — Catalog and Discovery

| ID | Requirement | Priority |
|---|---|---|
| CAT-01 | The home page shall show featured books, new releases, and categories. | M |
| CAT-02 | The catalog page shall list published books with pagination. | M |
| CAT-03 | Buyers shall be able to search books by title, author, and keywords. | M |
| CAT-04 | Buyers shall be able to filter by category, author, and price range, and sort by newest, price, and rating. | M |
| CAT-05 | The book detail page shall show cover, title, author, description, page count, file size, language, price, average rating, and reviews. | M |
| CAT-06 | The book detail page shall let anyone read the free sample PDF in the browser. | M |
| CAT-07 | Books the buyer already owns shall show "In your library" instead of "Add to cart". | M |
| CAT-08 | Archived or unpublished books shall not appear in the store. | M |

### 3.3 Buyer App — Wishlist and Cart

| ID | Requirement | Priority |
|---|---|---|
| CART-01 | Guests shall be able to add books to a cart saved in localStorage. | M |
| CART-02 | On sign-in, the guest cart shall merge into the buyer's server-side cart. | M |
| CART-03 | The cart shall prevent duplicate items (each book once, since PDFs have no quantity). | M |
| CART-04 | The cart shall reject books the buyer already owns. | M |
| CART-05 | The cart shall show item prices, tax, and the total, recalculated by the API. | M |
| WISH-01 | Buyers shall be able to add and remove books from a wishlist. | S |
| WISH-02 | Buyers shall be able to move a wishlist item to the cart. | S |

### 3.4 Buyer App — Checkout and Payment (Razorpay)

| ID | Requirement | Priority |
|---|---|---|
| PAY-01 | Checkout shall require the buyer to be signed in. | M |
| PAY-02 | The API shall create a Razorpay order using prices and tax taken from the database, never from the client. | M |
| PAY-03 | The API shall create a local order with status `pending` linked to the Razorpay order ID. | M |
| PAY-04 | The store app shall open Razorpay Standard Checkout (`checkout.js`) with the order ID and the buyer's prefilled name and email. | M |
| PAY-05 | After payment, the store app shall send `razorpay_order_id`, `razorpay_payment_id`, and `razorpay_signature` to the API. | M |
| PAY-06 | The API shall verify the payment signature using HMAC-SHA256 with the Razorpay key secret. | M |
| PAY-07 | The API shall expose a webhook endpoint that verifies `X-Razorpay-Signature` against the **raw** request body using the webhook secret. | M |
| PAY-08 | The `payment.captured` webhook shall be the authoritative event that marks an order `paid` and creates library entitlements. | M |
| PAY-09 | Webhook processing shall be idempotent: receiving the same event more than once shall not create duplicate entitlements or emails. | M |
| PAY-10 | The API shall handle `payment.failed` by marking the order `failed`. | M |
| PAY-11 | The store app shall show a success page (with a link to the library) or a failure page with a retry option. | M |
| PAY-12 | Pending orders with no payment after 30 minutes shall be marked `expired`. | S |

### 3.5 Buyer App — Library and Downloads

| ID | Requirement | Priority |
|---|---|---|
| LIB-01 | "My Library" shall list every book the buyer owns, with cover, title, and purchase date. | M |
| LIB-02 | Clicking Download shall request a signed R2 URL from the API. | M |
| LIB-03 | The API shall issue a download URL only if the buyer holds an entitlement for that book. | M |
| LIB-04 | Signed download URLs shall expire after 5 minutes and force a file download with a readable file name. | M |
| LIB-05 | Each entitlement shall have a download limit set in store settings; the API shall refuse downloads beyond the limit. | M |
| LIB-06 | Every download shall be logged (user, book, time, IP address). | M |
| LIB-07 | The API may stamp the buyer's email into the PDF at download time to discourage sharing. | C |

### 3.6 Buyer App — Orders, Reviews, and Profile

| ID | Requirement | Priority |
|---|---|---|
| ORD-01 | Buyers shall see their order history with status, items, amount, and date. | M |
| ORD-02 | Buyers shall be able to download a PDF invoice for each paid order. | S |
| ORD-03 | Buyers shall receive an order confirmation email with a link to the library. | M |
| REV-01 | Only buyers who own a book shall be able to rate (1–5) and review it. | M |
| REV-02 | A buyer shall have at most one review per book and may edit or delete it. | M |
| REV-03 | New reviews shall be visible immediately and can be hidden by the admin. | S |
| PRO-01 | Buyers shall be able to view their profile and update their display name. | S |

### 3.7 Admin App — Books and Catalog

| ID | Requirement | Priority |
|---|---|---|
| ADM-BK-01 | The admin shall be able to create, edit, publish, unpublish, and archive books. | M |
| ADM-BK-02 | Book fields: title, slug, author(s), category, description, language, page count, price, tax category, status, featured flag. | M |
| ADM-BK-03 | The admin shall upload the full PDF, a sample PDF, and a cover image for each book. | M |
| ADM-BK-04 | Uploads shall go directly from the browser to R2 using signed upload URLs issued by the API. | M |
| ADM-BK-05 | The API shall accept only `application/pdf` for PDFs and JPEG/PNG/WebP for covers, and enforce maximum file sizes. | M |
| ADM-BK-06 | The upload UI shall show upload progress and allow replacing a file. | M |
| ADM-BK-07 | Archived books shall remain downloadable by buyers who already own them. | M |
| ADM-BK-08 | Price changes shall not affect past orders. | M |
| ADM-CT-01 | The admin shall be able to create, edit, and delete categories and authors. | M |
| ADM-CT-02 | A category or author in use by a book shall not be deletable. | M |

### 3.8 Admin App — Orders, Refunds, and Customers

| ID | Requirement | Priority |
|---|---|---|
| ADM-OR-01 | The admin shall see all orders with filters by status and date, and search by order ID or buyer email. | M |
| ADM-OR-02 | The order detail view shall show items, amounts, Razorpay IDs, payment status, and the webhook history. | M |
| ADM-OR-03 | The admin shall be able to issue a full refund through the Razorpay Refunds API. | M |
| ADM-OR-04 | A refunded order shall revoke the related library entitlements. | M |
| ADM-OR-05 | The API shall process `refund.processed` webhooks to confirm refunds. | M |
| ADM-CU-01 | The admin shall see a list of customers with their purchases and download counts. | M |
| ADM-CU-02 | The admin shall be able to block and unblock a customer. | M |
| ADM-RV-01 | The admin shall be able to hide or delete reviews. | M |

### 3.9 Admin App — Settings and Audit

| ID | Requirement | Priority |
|---|---|---|
| ADM-ST-01 | The admin shall configure store name, support email, logo, tax/GST settings, and default download limit. | M |
| ADM-ST-02 | The admin shall edit the subject and body of transactional email templates. | S |
| ADM-AU-01 | Every admin create, update, delete, refund, and block action shall be written to an audit log with timestamp and details. | M |
| ADM-AU-02 | The admin shall be able to view the audit log. | S |

### 3.10 Background Processing and Notifications

| ID | Requirement | Priority |
|---|---|---|
| JOB-01 | Emails, invoice generation, and webhook side effects shall run as background jobs in a BullMQ queue. | M |
| JOB-02 | Failed jobs shall retry with exponential backoff and be visible in logs. | M |
| JOB-03 | Emails sent: welcome, order confirmation, payment failed, refund processed. | M |

---

## 4. External Interface Requirements

### 4.1 User Interface

- Built with React, Tailwind CSS 4, and daisyUI 5 components.
- Responsive layout from 360 px mobile width up to desktop.
- Light and dark themes using daisyUI themes.
- All interactive elements must be keyboard accessible and meet WCAG 2.2 AA contrast.
- Loading, empty, and error states for every data view.

### 4.2 API Interface

- REST over HTTPS with JSON bodies, versioned under `/api/v1`.
- Admin routes under `/api/v1/admin/*`, protected by the `admin` role.
- Consistent error shape: `{ error: { code, message, details } }`.
- Paginated list responses: `{ items, page, pageSize, total }`.

Main route groups:

| Group | Examples |
|---|---|
| Auth | `POST /auth/google`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Catalog | `GET /books`, `GET /books/:slug`, `GET /categories`, `GET /authors` |
| Cart and wishlist | `GET/PUT /me/cart`, `GET/POST/DELETE /me/wishlist` |
| Checkout | `POST /checkout/orders`, `POST /checkout/verify` |
| Webhooks | `POST /webhooks/razorpay` |
| Library | `GET /me/library`, `GET /me/library/:bookId/download` |
| Orders | `GET /me/orders`, `GET /me/orders/:id/invoice` |
| Reviews | `POST/PATCH/DELETE /books/:id/reviews` |
| Admin | `/admin/books`, `/admin/uploads/sign`, `/admin/orders`, `/admin/orders/:id/refund`, `/admin/customers`, `/admin/reviews`, `/admin/settings`, `/admin/audit-log` |

### 4.3 Third-Party Interfaces

| Service | Integration |
|---|---|
| Razorpay | Node SDK for orders and refunds; `checkout.js` in the browser; webhooks for `payment.captured`, `payment.failed`, `refund.processed` |
| Cloudflare R2 | AWS SDK v3 S3 client with `region: "auto"` and the R2 account endpoint; signed PUT URLs for uploads and signed GET URLs for downloads |
| Google Identity Services | `@react-oauth/google` in the browser; `google-auth-library` `verifyIdToken` on the server |
| Email | Resend API or SMTP |

### 4.4 Storage Layout (Cloudflare R2)

| Bucket | Access | Contents | Key pattern |
|---|---|---|---|
| `books-private` | Private; signed URLs only | Full PDFs | `books/<bookId>/<uuid>.pdf` |
| `books-public` | Public via custom domain and CDN | Covers and sample PDFs | `covers/<bookId>/<uuid>.webp`, `samples/<bookId>/<uuid>.pdf` |

- CORS on both buckets allows `PUT` only from the admin app origin, with `Content-Type` as an allowed header.
- The R2 API token is scoped to these two buckets with Object Read and Write only.
- Object keys are generated by the API; uploaded file names are never used as keys.

---

## 5. Non-Functional Requirements

### 5.1 Security

| ID | Requirement |
|---|---|
| SEC-01 | All traffic shall use HTTPS; HSTS enabled. |
| SEC-02 | Security headers shall be set with Helmet, including a Content Security Policy that allows Razorpay and Google domains. |
| SEC-03 | CORS on the API shall allow only the store and admin app origins. |
| SEC-04 | All request bodies, query strings, and route parameters shall be validated with Zod. |
| SEC-05 | Rate limits (Redis-backed) shall apply to auth, checkout, download, and upload-signing routes. |
| SEC-06 | Secrets (Razorpay keys, webhook secret, R2 keys, JWT secrets, Google client secret) shall be stored in environment variables and never committed. |
| SEC-07 | Razorpay payment signatures and webhook signatures shall be verified before any state change. |
| SEC-08 | Full PDFs shall be accessible only through short-lived signed URLs issued after an ownership check. |
| SEC-09 | Admin routes shall check the `admin` role on every request. |
| SEC-10 | Card and UPI details shall never touch the application servers (handled entirely by Razorpay). |
| SEC-11 | Dependencies shall be checked with `npm audit` in CI. |

### 5.2 Performance

| ID | Requirement |
|---|---|
| PERF-01 | 95th-percentile API response time under 300 ms for catalog and library routes, excluding third-party calls. |
| PERF-02 | Store app Largest Contentful Paint under 2.5 s on a mid-range mobile device over 4G. |
| PERF-03 | Covers and samples shall be served from the Cloudflare CDN. |
| PERF-04 | MongoDB indexes on book slug, status, category, author, text search fields, user email, order Razorpay ID, and entitlement (user, book). |

### 5.3 Scalability and Availability

| ID | Requirement |
|---|---|
| SCAL-01 | The API shall be stateless so it can run as multiple instances behind a load balancer. |
| SCAL-02 | Heavy or slow work shall run in background workers, separate from request handling. |
| SCAL-03 | Target availability: 99.5% monthly. |
| SCAL-04 | Daily automated MongoDB backups with at least 7 days of retention. |

### 5.4 Maintainability and Observability

| ID | Requirement |
|---|---|
| MAIN-01 | Code shall be organized as an npm workspaces monorepo with shared validation schemas. |
| MAIN-02 | Structured JSON logs with Pino, including a request ID on every log line. |
| MAIN-03 | A `/health` endpoint shall report API, database, and Redis status. |
| MAIN-04 | ESLint and Prettier shall run in CI. |

### 5.5 Legal and Compliance

- Terms of Service, Privacy Policy, and Refund Policy pages shall be linked in the store footer.
- GST-compliant invoices when GST is enabled in settings.
- Buyers may request account deletion; order records are retained as required for tax purposes.

---

## 6. Data Model (Summary)

| Collection | Key fields |
|---|---|
| `users` | email (unique), name, avatarUrl, googleId, role (`buyer`/`admin`), isBlocked, createdAt |
| `refreshTokens` | userId, tokenHash, expiresAt, revokedAt |
| `books` | title, slug (unique), authorIds, categoryId, description, language, pages, price, taxCategory, status (`draft`/`published`/`archived`), featured, coverKey, sampleKey, pdfKey, fileSize, ratingAvg, ratingCount |
| `authors` | name, slug, bio |
| `categories` | name, slug |
| `carts` | userId, bookIds |
| `wishlists` | userId, bookIds |
| `orders` | userId, items (bookId, title, price snapshot), subtotal, tax, total, currency, status (`pending`/`paid`/`failed`/`expired`/`refunded`), razorpayOrderId, razorpayPaymentId, invoiceNumber, createdAt |
| `entitlements` | userId, bookId, orderId, downloadCount, downloadLimit, revokedAt (unique on userId + bookId) |
| `downloads` | entitlementId, userId, bookId, ip, userAgent, createdAt |
| `reviews` | userId, bookId, rating, comment, isHidden (unique on userId + bookId) |
| `webhookEvents` | eventId (unique), type, payload, processedAt |
| `settings` | storeName, supportEmail, logoKey, gst settings, defaultDownloadLimit, emailTemplates |
| `auditLogs` | adminId, action, entity, entityId, before, after, createdAt |

---

## 7. Technology Stack (Finalized Versions, September 2026)

### 7.1 Runtime and Platform

| Item | Version |
|---|---|
| Node.js | 24.x LTS (move to 26.x LTS after 28 Oct 2026) |
| MongoDB | 8.x (Atlas) |
| TypeScript (if used) | 7.0.x (pin 6.0 if lint tooling is incompatible) |

### 7.2 Frontend (store and admin)

| Package | Version | Purpose |
|---|---|---|
| `react`, `react-dom` | 19.3.0 | UI library |
| `vite` | 8.2.0 | Build tool and dev server |
| `react-router` | 7.17.0 | Routing |
| `@reduxjs/toolkit` | 2.12.0 | State management and RTK Query |
| `react-redux` | 9.2.0 | React bindings for Redux |
| `tailwindcss`, `@tailwindcss/vite` | 4.3.3 | Styling |
| `daisyui` | 5.7.36 | UI components |
| `@react-oauth/google` | 0.13.5 | Google One Tap (store app) |
| `zod` | 4.5.4 | Form and schema validation |
| `react-hook-form`, `@hookform/resolvers` | latest | Forms |
| Razorpay `checkout.js` | loaded from Razorpay CDN | Payment UI |

State management rules:

- Server data (books, orders, library, admin lists) lives in RTK Query with cache tags.
- Client state (auth user and access token, guest cart, UI flags) lives in Redux slices.
- The guest cart is saved to localStorage with RTK's `createListenerMiddleware`.
- A shared base query handles 401 responses by refreshing the token and retrying once.

### 7.3 Backend (API)

| Package | Version | Purpose |
|---|---|---|
| `express` | 5.2.1 | HTTP server |
| `mongoose` | 9.10.x | MongoDB models |
| `razorpay` | 2.9.8 | Orders, refunds, signature helpers |
| `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner` | latest v3 | Cloudflare R2 access |
| `google-auth-library` | 11.0.2 | Google ID token verification |
| `jsonwebtoken` | 9.0.3 | Access and refresh tokens |
| `zod` | 4.5.4 | Request validation |
| `helmet` | 8.3.0 | Security headers |
| `express-rate-limit`, `rate-limit-redis` | 8.7.0 / latest | Rate limiting |
| `bullmq`, `ioredis` | 6.3.9 / 5.11.1 | Background jobs |
| `pino`, `pino-http` | 10.3.1 / latest | Logging |
| `cors`, `cookie-parser`, `dotenv` | latest | Middleware and config |
| `pdf-lib` | 1.17.1 | Invoices and optional PDF watermarking |
| `resend` or `nodemailer` | latest | Email |

### 7.4 Repository Folder Structure

```
online-store-01/
├── apps/
│   ├── store/                        # Buyer SPA (React + Vite)
│   │   ├── public/
│   │   ├── src/
│   │   │   ├── app/                  # Redux store, router, providers (Google OAuth, theme)
│   │   │   ├── api/                  # RTK Query base API with re-auth base query
│   │   │   ├── features/             # One folder per feature: slice, endpoints, components, pages
│   │   │   │   ├── auth/
│   │   │   │   ├── catalog/
│   │   │   │   ├── cart/
│   │   │   │   ├── wishlist/
│   │   │   │   ├── checkout/
│   │   │   │   ├── library/
│   │   │   │   ├── orders/
│   │   │   │   ├── reviews/
│   │   │   │   └── profile/
│   │   │   ├── components/           # Shared UI: layout, header, footer, book card
│   │   │   ├── pages/                # Home, legal pages, 404
│   │   │   ├── hooks/
│   │   │   ├── lib/                  # Razorpay loader, localStorage helpers, formatters
│   │   │   ├── styles/               # Tailwind CSS + daisyUI entry
│   │   │   └── main.jsx
│   │   ├── tests/                    # Component tests and MSW handlers
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   ├── admin/                        # Seller SPA (React + Vite)
│   │   ├── src/
│   │   │   ├── app/
│   │   │   ├── api/
│   │   │   ├── features/
│   │   │   │   ├── auth/
│   │   │   │   ├── books/            # Book CRUD and R2 uploads with progress
│   │   │   │   ├── categories/
│   │   │   │   ├── authors/
│   │   │   │   ├── orders/           # Orders and refunds
│   │   │   │   ├── customers/
│   │   │   │   ├── reviews/
│   │   │   │   ├── settings/
│   │   │   │   └── audit-log/
│   │   │   ├── components/
│   │   │   ├── lib/
│   │   │   ├── styles/
│   │   │   └── main.jsx
│   │   ├── tests/
│   │   ├── index.html
│   │   ├── vite.config.js
│   │   └── package.json
│   │
│   └── api/                          # REST API (Express)
│       ├── src/
│       │   ├── config/               # Env validation (Zod), MongoDB, Redis, R2, Razorpay, Google clients
│       │   ├── modules/              # One folder per route group: routes, controller, service
│       │   │   ├── auth/
│       │   │   ├── catalog/
│       │   │   ├── cart/
│       │   │   ├── wishlist/
│       │   │   ├── checkout/
│       │   │   ├── webhooks/         # Razorpay webhook (raw body)
│       │   │   ├── library/
│       │   │   ├── orders/
│       │   │   ├── reviews/
│       │   │   ├── health/
│       │   │   └── admin/            # books, uploads, orders, customers, reviews, settings, audit-log
│       │   ├── models/               # Mongoose models, one per collection (Section 6)
│       │   ├── middleware/           # authenticate, requireAdmin, validate, rateLimit, requestId, errorHandler
│       │   ├── services/             # r2, razorpay, email, pdf (invoice/watermark), pricing and tax
│       │   ├── jobs/
│       │   │   ├── queues.js         # BullMQ queue definitions
│       │   │   └── processors/       # email, invoice, webhook side effects, expire pending orders
│       │   ├── emails/               # Default email templates
│       │   ├── utils/
│       │   ├── app.js                # Express app setup (Helmet, CORS, routes)
│       │   ├── server.js             # HTTP server entry point
│       │   └── worker.js             # Background worker entry point
│       ├── tests/
│       │   ├── unit/
│       │   └── integration/          # Supertest + mongodb-memory-server
│       ├── Dockerfile
│       └── package.json
│
├── packages/
│   └── shared/                       # Shared by all three apps
│       ├── src/
│       │   ├── schemas/              # Zod schemas for requests and forms
│       │   ├── constants/            # Roles, order statuses, error codes, file size limits
│       │   └── index.js
│       └── package.json
│
├── e2e/                              # Playwright end-to-end tests (TC-09, TC-10)
│   ├── tests/
│   └── playwright.config.js
├── deploy/                           # Deployment files (see MILESTONES.md M2–M4)
│   ├── web.Dockerfile                # Builds store + admin into a Caddy image
│   ├── Caddyfile                     # Domains, TLS, static files, API reverse proxy
│   ├── compose.local.yml
│   ├── compose.staging.yml
│   └── compose.production.yml
├── docs/
│   ├── SRS.md
│   └── MILESTONES.md
├── prompts/
├── .github/
│   └── workflows/
│       ├── ci.yml                    # Lint, test, coverage, npm audit, Playwright, Docker build
│       ├── deploy-staging.yml        # Deploy on merge to main
│       └── deploy-production.yml     # Deploy on version tag, with approval
├── docker-compose.dev.yml            # Local MongoDB and Redis
├── .env.example                      # All required variables, no real secrets (SEC-06)
├── .gitignore
├── eslint.config.js
├── .prettierrc
├── package.json                      # npm workspaces root
└── README.md
```

Conventions:

- Each app has its own `package.json` and `.env`. Real `.env` files are never committed.
- Frontend code is grouped by feature. Each feature folder holds its Redux slice, RTK Query endpoints, components, and pages.
- API code is grouped by route group. Each module has `*.routes.js`, `*.controller.js`, and `*.service.js`.
- The API and the background worker share code but start from separate entry points (`server.js` and `worker.js`), as required by SCAL-02.
- Zod schemas are defined only in `packages/shared` and imported by the frontends and the API.

---

## 8. Testing Requirements

### 8.1 Tools

| Package | Version | Used for |
|---|---|---|
| `vitest` | 5.0.2 (fallback 4.1.x) | Test runner for all apps |
| `@vitest/coverage-v8` | 5.0.2 | Code coverage |
| `@testing-library/react`, `@testing-library/dom` | 16.3.3 / 10.x | Component tests |
| `@testing-library/user-event` | 14.6.5 | Simulated user input |
| `@testing-library/jest-dom` | 7.0.1 | DOM assertions |
| `jsdom` | latest | Browser environment for component tests |
| `msw` | 2.15.0 | Fake API responses for RTK Query |
| `supertest` | 7.2.2 | API route tests |
| `mongodb-memory-server` | 11.2.0 | Throwaway MongoDB for integration tests |
| `aws-sdk-client-mock` | latest | Faking the R2 client |
| `@playwright/test` | 1.63.0 | End-to-end browser tests |

### 8.2 Test Levels

| Level | Scope | When it runs |
|---|---|---|
| Unit | Price and tax calculation, signature verification, Redux slices, Zod schemas | Every save and commit |
| Component | Store and admin screens with MSW-backed RTK Query | Every commit |
| API integration | Express routes with Supertest and in-memory MongoDB; Razorpay, R2, and Google mocked | Every commit |
| End-to-end | Full flows in real browsers against staging-like services | Pull requests and before deploys |

### 8.3 Required Test Cases

| ID | Test |
|---|---|
| TC-01 | A Razorpay webhook with an invalid signature is rejected with no state change. |
| TC-02 | A valid `payment.captured` webhook marks the order paid and creates entitlements; sending it twice creates no duplicates. |
| TC-03 | Checkout uses database prices even when the client sends different prices. |
| TC-04 | The download route returns 403 for a buyer who does not own the book. |
| TC-05 | The download route enforces the download limit. |
| TC-06 | Admin routes reject buyer accounts. |
| TC-07 | A refund revokes library access. |
| TC-08 | An expired access token is refreshed automatically and the original request succeeds. |
| TC-09 | End-to-end: a buyer signs in, adds a book, pays in Razorpay test mode, sees it in My Library, and downloads it. |
| TC-10 | End-to-end: the admin creates a book, uploads PDF, sample, and cover, publishes it, and it appears in the store. |

### 8.4 Testing Constraints

- Google One Tap cannot be automated; end-to-end tests use a `POST /auth/test-login` route registered only when `NODE_ENV === "test"`.
- The Razorpay checkout pop-up is verified manually before each release; automated tests simulate a captured payment.
- CI runs lint, unit, component, and integration tests with coverage on every pull request, then Playwright tests.

---

## 9. Acceptance Criteria

The release is accepted when:

1. All **Must have** requirements in Section 3 are implemented.
2. All required test cases in Section 8.3 pass in CI.
3. A real test-mode purchase, download, and refund complete successfully on staging.
4. Full PDFs cannot be accessed without a valid, unexpired signed URL.
5. No high or critical findings from `npm audit` remain open.
