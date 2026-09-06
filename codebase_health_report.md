# 📊 Codebase Health & Improvement Scope Report — AutomaCRM

---

## 1. Executive Summary

**AutomaCRM** is a WhatsApp CRM for real estate builders, built on **Next.js 16 (App Router) + Supabase + Tailwind CSS 4 + TypeScript 6**. The codebase is ~325 source files / 2.4 MB across 43 migrations, 67 API routes, and a rich set of dashboard features (inbox, pipelines, contacts, broadcasts, automations, flows, AI, commercial docs, lead forms).

### Strengths
| Area | Rating | Notes |
|---|---|---|
| **Architecture** | ⭐⭐⭐⭐ | Clean separation: `lib/` for business logic, `components/` for UI, `hooks/` for shared state, `types/` centralised. API routes are thin adapters delegating to shared cores. |
| **Security** | ⭐⭐⭐⭐⭐ | Comprehensive headers (HSTS, CSP-RO, Permissions-Policy), AES-256-GCM token encryption with legacy CBC migration path, HMAC-SHA256 webhook signature verification (fail-closed), RBAC role hierarchy with RLS parity, rate limiting on all sensitive endpoints. |
| **Type Safety** | ⭐⭐⭐⭐ | Strict TS config. Only ~31 suppressions (`eslint-disable`, `as any`, `@ts-ignore`) across 325 files — well below average. Centralised type barrel in [`index.ts`](file:///c:/Users/vinay/Documents/automacrm/src/types/index.ts). |
| **Auth & Multi-tenancy** | ⭐⭐⭐⭐⭐ | Solid account-sharing model (migration 017+), dual auth paths (cookie session for dashboard, API key for `/api/v1`), account-scoped RLS, role predicates as single source of truth. |
| **Documentation** | ⭐⭐⭐⭐ | Exceptionally well-commented code — almost every non-trivial decision carries an inline "Why" rationale. |

### Areas for Improvement
| Area | Rating | Notes |
|---|---|---|
| **Test Coverage** | ⭐ | **Zero test files exist.** No `.test.ts` / `.spec.ts` anywhere. The `__resetRateLimitForTests()` export in [rate-limit.ts](file:///c:/Users/vinay/Documents/automacrm/src/lib/rate-limit.ts) is the only test-aware code. |
| **Component Size** | ⭐⭐ | 6 files exceed 30 KB; the top two ([automation-builder.tsx](file:///c:/Users/vinay/Documents/automacrm/src/components/automations/automation-builder.tsx) at 53.7 KB, [webhook route.ts](file:///c:/Users/vinay/Documents/automacrm/src/app/api/whatsapp/webhook/route.ts) at 46 KB) are hard to review, reason about, or modify safely. |
| **Data Fetching** | ⭐⭐ | Nearly all pages are `"use client"` with `useEffect` fetching — no server-side data loading, no caching layer, no request deduplication. |
| **CI/CD** | ⭐ | No test runner, no CI pipeline, no build verification beyond `npm run build`. |

---

## 2. Top Critical Priorities (Immediate Action Required)

### 🔴 P0 — Zero Test Coverage

> [!CAUTION]
> There are **no automated tests** in the entire codebase. Not a single `.test.ts`, `.spec.ts`, or test framework (`jest`, `vitest`) in `devDependencies`.

**Impact:** Every change is deployed on faith. Critical business logic — the [automation engine](file:///c:/Users/vinay/Documents/automacrm/src/lib/automations/engine.ts) (31 KB), [flow engine](file:///c:/Users/vinay/Documents/automacrm/src/lib/flows/engine.ts) (41 KB), [webhook handler](file:///c:/Users/vinay/Documents/automacrm/src/app/api/whatsapp/webhook/route.ts) (46 KB), [broadcast send](file:///c:/Users/vinay/Documents/automacrm/src/lib/whatsapp/broadcast-core.ts), [encryption](file:///c:/Users/vinay/Documents/automacrm/src/lib/whatsapp/encryption.ts), [role system](file:///c:/Users/vinay/Documents/automacrm/src/lib/auth/roles.ts) — is untested. A regression in any of these silently breaks message delivery, security, or financial data.

**Recommendation:** Install `vitest` + `@testing-library/react`, and prioritise tests for:
1. `lib/auth/roles.ts` (pure functions, easy win)
2. `lib/whatsapp/encryption.ts` (encrypt ↔ decrypt roundtrip, legacy format detection)
3. `lib/rate-limit.ts` (already has a `__resetRateLimitForTests` helper)
4. `lib/whatsapp/phone-utils.ts`
5. `lib/whatsapp/template-validators.ts`
6. Webhook signature verification

---

### 🔴 P0 — No Middleware File

> [!WARNING]
> The auth proxy logic lives in [`src/proxy.ts`](file:///c:/Users/vinay/Documents/automacrm/src/proxy.ts) but there is **no `middleware.ts`** in `src/` (or root) to wire it to Next.js. If the middleware was deleted or never created, the `proxy()` function may not be executing at all — meaning:
> - Auth redirects (unauthenticated → `/login`, authenticated → `/dashboard`) may not fire in production
> - Supabase session-refresh cookies may not propagate
> - The `protectedPaths` guard may be bypassed

**Action:** Verify that middleware is correctly wired. If it's imported elsewhere (perhaps from a root `middleware.ts` not in `src/`), document that path. Otherwise, create `src/middleware.ts` that re-exports `proxy` and `config`.

---

### 🟡 P1 — Webhook Route Is a 1,245-Line Monolith

[`webhook/route.ts`](file:///c:/Users/vinay/Documents/automacrm/src/app/api/whatsapp/webhook/route.ts) handles **all inbound WhatsApp events** (messages, statuses, reactions, template changes) plus triggers automations, flows, AI auto-reply, and external webhook dispatch — all in a single 46 KB file with a lazy-initialized `supabaseAdmin()` that carries an `any` type.

**Risk:** A bug in status-update handling could break message receipt. A thrown exception in the `after()` callback silently loses inbound events. The file is extremely difficult to review or extend.

**Recommendation:** Extract into focused modules:
- `handleInboundMessage()`
- `handleStatusUpdate()`
- `handleReaction()`
- `handleTemplateChange()`

Each dispatched by a thin router in the route handler.

---

## 3. Frontend Review & Scope for Improvement

### 3.1 UI/UX & Responsiveness

| Issue | Severity | Details |
|---|---|---|
| **All dashboard pages are client-rendered** | Medium | Every `(dashboard)/**/page.tsx` is `"use client"` with inline `useEffect` fetching. No SSR, no streaming, no skeleton-first rendering. Initial load shows a spinner until JS boots + data arrives. |
| **Giant page components** | Medium | [contacts/page.tsx](file:///c:/Users/vinay/Documents/automacrm/src/app/(dashboard)/contacts/page.tsx) (852 lines), [companies/page.tsx](file:///c:/Users/vinay/Documents/automacrm/src/app/(dashboard)/companies/page.tsx) (~40 KB), [inbox/page.tsx](file:///c:/Users/vinay/Documents/automacrm/src/app/(dashboard)/inbox/page.tsx) (642 lines) combine data fetching, state, modals, and rendering in one file. |
| **Theming system is solid** | ✅ | Two-axis theming (mode × accent) in [`globals.css`](file:///c:/Users/vinay/Documents/automacrm/src/app/globals.css) is well-designed and composable. |

### 3.2 Component Architecture

**Oversized Components (decomposition candidates):**

| Component | Size | Recommended Split |
|---|---|---|
| [`automation-builder.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/components/automations/automation-builder.tsx) | 53.7 KB | Split into `AutomationHeader`, `StepList`, `StepEditor`, `TriggerConfig`, `TestRunner` |
| [`message-thread.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/components/inbox/message-thread.tsx) | 43.9 KB / 1,207 lines | Extract `ThreadHeader`, `MessageList`, `DateSeparator`, `AssignmentDropdown`, `StatusControls` |
| [`message-composer.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/components/inbox/message-composer.tsx) | 39 KB / 1,053 lines | Extract `MediaAttachPicker`, `VoiceRecorder`, `InteractiveComposer`, `ComposerToolbar` |
| [`template-manager.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/components/settings/template-manager.tsx) | 43.9 KB | Split `TemplateList`, `TemplateEditor`, `TemplatePreview`, `MetaSyncPanel` |
| [`document-form-dialog.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/components/commercial/document-form-dialog.tsx) | 42.5 KB | Split `LineItemEditor`, `TaxCalculator`, `ClientSelector`, `DocumentPreview` |

**Good patterns already in use:**
- ✅ UI primitives in [`components/ui/`](file:///c:/Users/vinay/Documents/automacrm/src/components/ui) (23 well-scoped shadcn components)
- ✅ Role-gated UI via [`GatedButton`](file:///c:/Users/vinay/Documents/automacrm/src/components/ui/gated-button.tsx) and [`useCan`](file:///c:/Users/vinay/Documents/automacrm/src/hooks/use-can.ts) hook
- ✅ Clean domain folders: `inbox/`, `contacts/`, `automations/`, `flows/`, `commercial/`, `settings/`

### 3.3 State & Data Fetching

| Pattern | Current | Recommended |
|---|---|---|
| **Data fetching** | Raw `useEffect` + `createClient().from()` in every component | Adopt React Query / `useSWR` for caching, dedup, optimistic updates, background refetch |
| **Server components** | Not used — every page is `"use client"` | Move initial data loads to server components; pass as props to client interactive shells |
| **Realtime** | Custom [`useRealtime`](file:///c:/Users/vinay/Documents/automacrm/src/hooks/use-realtime.ts) hook + manual resync token — well-implemented | ✅ Good pattern. Consider integrating with React Query's `queryClient.invalidateQueries` |
| **Auth context** | [`AuthProvider`](file:///c:/Users/vinay/Documents/automacrm/src/hooks/use-auth.tsx) fetches profile + account in waterfall (profile → account) | Could be a single server-side load passed via props, eliminating the client waterfall |
| **Re-renders** | `ESLint react-hooks/exhaustive-deps` suppressed in 2+ places — possible stale closure bugs | Audit each suppression; replace with proper dep arrays or `useRef` patterns |

---

## 4. Backend Review & Scope for Improvement

### 4.1 API & Controller Design

**Strengths:**
- ✅ Consistent auth pattern: `requireRole()` / `requireApiKey()` at the top of every route
- ✅ Rate limiting is comprehensive and well-budgeted (per-user, per-key, per-account for AI)
- ✅ Shared send core: [`send-message.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/whatsapp/send-message.ts) is reused by both dashboard and public API
- ✅ Error handling: typed `UnauthorizedError` / `ForbiddenError` / `SendMessageError` with `toErrorResponse()` pattern

**Improvements:**

| Issue | Details |
|---|---|
| **Webhook route monolith** | 1,245-line single file handles ALL inbound events. See P1 above. |
| **Duplicate admin client creation** | Three separate `supabaseAdmin()` singletons: [`lib/flows/admin-client.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/flows/admin-client.ts), [`lib/automations/admin-client.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/automations/admin-client.ts), and an inline one in the webhook route (with `any` type). Consolidate to a single shared module. |
| **Input validation** | No schema validation library (no `zod`, `joi`, `valibot`). Request bodies are destructured and only partially validated inline. Consider adopting Zod for all API route inputs. |
| **No API versioning strategy** | `/api/v1/*` exists but internal routes (`/api/whatsapp/*`, `/api/account/*`) are unversioned. If these become public-facing, breaking changes have no migration path. |

### 4.2 Database & Query Optimization

**Schema Health (43 migrations):**
- ✅ Idempotent migrations with `IF NOT EXISTS` / `DROP IF EXISTS`
- ✅ Proper indexing on foreign keys and lookup fields
- ✅ RLS enabled on every table with account-scoped policies

**Potential Issues:**

| Issue | Location | Impact |
|---|---|---|
| **N+1 in AuthProvider** | [`use-auth.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/hooks/use-auth.tsx#L272-L277) — profile fetch + separate account fetch | 2 sequential queries per page load. Could be a single query with a join, or a server-side prefetch. |
| **N+1 in `getCurrentAccount()`** | [`account.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/auth/account.ts#L122-L159) — `getUser()` → profile → account (3 sequential round trips) | Every API route pays this cost. Consider caching the profile+account in the session or using a single RPC. |
| **Client-side pagination** | Several pages (contacts, companies) fetch data client-side with manual pagination; heavy for large datasets | Move to server-side cursor-based pagination |
| **No composite indexes documented** | Initial schema indexes single columns; queries filtering on `(account_id, status)` or `(account_id, phone_normalized)` may miss composite indexes | Audit slow queries with `EXPLAIN ANALYZE` and add composite indexes |

### 4.3 Security & Validation

| Area | Status | Notes |
|---|---|---|
| **RBAC** | ✅ Excellent | Role hierarchy in [`roles.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/auth/roles.ts) mirrors RLS policies. Capability predicates are the single source of truth. |
| **Token encryption** | ✅ Excellent | AES-256-GCM with automatic CBC→GCM migration path in [`encryption.ts`](file:///c:/Users/vinay/Documents/automacrm/src/lib/whatsapp/encryption.ts). |
| **Webhook verification** | ✅ Excellent | HMAC-SHA256 with `timingSafeEqual`, fail-closed when `META_APP_SECRET` is missing. |
| **Rate limiting** | ✅ Good | Well-commented per-action budgets. Caveat: in-memory Map doesn't survive horizontal scaling (documented). |
| **CSP** | ✅ Report-only | Currently `Content-Security-Policy-Report-Only`. Needs promotion to enforcing after confidence. |
| **Input validation** | ⚠️ Weak | No schema validation library. Body fields are destructured without type/shape checks beyond manual `if (!field)` guards. |
| **ENCRYPTION_KEY** | ⚠️ Risk | `process.env.ENCRYPTION_KEY!` is used with non-null assertion. If the env var is missing, the process crashes on first encrypt/decrypt rather than at startup. Add an early boot check. |

---

## 5. Developer Experience (DX) & Maintainability

### 5.1 Code Styling & Formatting

| Tool | Status |
|---|---|
| ESLint | ✅ Configured via [`eslint.config.mjs`](file:///c:/Users/vinay/Documents/automacrm/eslint.config.mjs) with `next/core-web-vitals` + `next/typescript` |
| Prettier | ✅ Configured via [`.prettierrc`](file:///c:/Users/vinay/Documents/automacrm/.prettierrc) with tailwind plugin |
| EditorConfig | ✅ Present |

### 5.2 Type Safety

- **Strict mode:** ✅ Enabled in [`tsconfig.json`](file:///c:/Users/vinay/Documents/automacrm/tsconfig.json) (`"strict": true`)
- **Suppressions:** 31 total — mostly `eslint-disable-next-line` for legitimate React patterns (`set-state-in-effect`, `exhaustive-deps`) and 4 `@typescript-eslint/no-explicit-any` in the webhook route
- **Type barrel:** All domain types centralised in [`src/types/index.ts`](file:///c:/Users/vinay/Documents/automacrm/src/types/index.ts) (870 lines, well-documented)
- **Duplicate types:** `Profile` interface is defined in both [`types/index.ts`](file:///c:/Users/vinay/Documents/automacrm/src/types/index.ts#L13-L49) and [`use-auth.tsx`](file:///c:/Users/vinay/Documents/automacrm/src/hooks/use-auth.tsx#L24-L38) with slightly different shapes — potential drift risk

### 5.3 Test Coverage

> [!IMPORTANT]
> **0% automated test coverage.** No test framework installed. No test scripts in `package.json`. This is the single biggest risk to long-term maintainability.

### 5.4 CI/CD & DevOps

| Item | Status |
|---|---|
| CI pipeline | ❌ None (no `.github/workflows/`, no Vercel config) |
| Pre-commit hooks | ❌ None (no `husky`, `lint-staged`) |
| Build check | ⚠️ Manual `npm run build` only |
| Type check | ⚠️ `npm run typecheck` exists but not automated |
| Deployment | Standalone output configured (`output: "standalone"`) — Docker-ready |

### 5.5 i18n

- ✅ `next-intl` integration is in place
- Messages directory exists at [`messages/`](file:///c:/Users/vinay/Documents/automacrm/messages)
- Components consistently use `useTranslations()` — good pattern

---

## 6. Actionable Refactoring Roadmap

### Phase 1 — Foundation (High Impact, Low-Medium Effort) 🟢

| # | Task | Impact | Effort | Details |
|---|---|---|---|---|
| 1 | **Install Vitest + write unit tests for `lib/`** | 🔴 Critical | Medium | Start with `roles.ts`, `encryption.ts`, `rate-limit.ts`, `phone-utils.ts`, `template-validators.ts`. Target: 80% coverage on pure `lib/` functions within 2 weeks. |
| 2 | **Verify middleware wiring** | 🔴 Critical | Low | Confirm `proxy.ts` is connected via a `middleware.ts` file. If missing, create it. |
| 3 | **Consolidate `supabaseAdmin()` singletons** | 🟡 High | Low | One shared admin client in `lib/supabase/admin.ts`, typed as `SupabaseClient`. Remove the `any`-typed inline version in the webhook route. |
| 4 | **Add Zod validation to top-5 API routes** | 🟡 High | Medium | `/api/whatsapp/send`, `/api/contacts/[id]`, `/api/automations`, `/api/flows`, `/api/commercial-documents`. |
| 5 | **Add startup env-var validation** | 🟡 High | Low | Validate `ENCRYPTION_KEY`, `META_APP_SECRET`, `SUPABASE_SERVICE_ROLE_KEY` at boot. Fail fast with clear error messages instead of crashing on first use. |
| 6 | **De-duplicate `Profile` type** | 🟡 Medium | Low | Use the canonical `Profile` from `types/index.ts` in `use-auth.tsx`, or define a `ProfileRow` pick type. |

### Phase 2 — Architecture (High Impact, Medium Effort) 🟡

| # | Task | Impact | Effort | Details |
|---|---|---|---|---|
| 7 | **Split webhook route into sub-handlers** | 🟡 High | Medium | Extract `handleInboundMessage`, `handleStatusUpdate`, `handleReaction`, `handleTemplateChange` into `lib/whatsapp/webhook/`. Route handler becomes a thin dispatcher. |
| 8 | **Adopt React Query (TanStack Query)** | 🟡 High | Medium | Wrap Supabase fetches in `useQuery` / `useMutation`. Get automatic caching, dedup, background refetch, optimistic updates. Start with Inbox and Contacts pages. |
| 9 | **Break up the 5 largest components** | 🟡 Medium | Medium | See §3.2 table. Each component should be < 500 lines. Extract sub-components with clear prop interfaces. |
| 10 | **Merge profile + account auth into 1 query** | 🟡 Medium | Low | Create an `rpc('get_current_context')` that returns profile + account + role in one round trip. Use both client-side (AuthProvider) and server-side (getCurrentAccount). |

### Phase 3 — DX & Quality (Medium Impact, Medium Effort) 🔵

| # | Task | Impact | Effort | Details |
|---|---|---|---|---|
| 11 | **Set up CI pipeline** | 🟡 Medium | Low | GitHub Actions: `npm run typecheck`, `npm run lint`, `npm run build`, `npx vitest run`. Run on every PR. |
| 12 | **Add pre-commit hooks** | 🟡 Medium | Low | Install `husky` + `lint-staged`. Run `prettier --write` + `eslint --fix` on staged files. |
| 13 | **Promote CSP to enforcing** | 🟡 Medium | Low | Flip `Content-Security-Policy-Report-Only` → `Content-Security-Policy` after monitoring for violations. |
| 14 | **Server-side initial data loads** | 🔵 Medium | High | Convert page components from `"use client"` + `useEffect` to server components with `async` data loading. Pass initial data as props to client interactive shells. Improves FCP and SEO. |
| 15 | **Audit ESLint suppressions** | 🔵 Low | Low | Review each of the ~31 `eslint-disable` comments. The `react-hooks/exhaustive-deps` ones in particular may indicate stale closure bugs. |

### Phase 4 — Polish (Lower Impact, Variable Effort) ⚪

| # | Task | Impact | Effort | Details |
|---|---|---|---|---|
| 16 | **Add composite DB indexes** | 🔵 Low-Medium | Low | `(account_id, status)` on `conversations`, `(account_id, phone_normalized)` on `contacts`, `(account_id, is_active)` on `automations`. Audit with `EXPLAIN ANALYZE`. |
| 17 | **Error monitoring** | 🔵 Medium | Low | Add Sentry or similar. The webhook's `after()` callback can silently swallow errors — structured error reporting catches these. |
| 18 | **API rate limiting for horizontal scale** | ⚪ Future | Medium | Current in-memory Map is documented as single-instance only. When scaling, swap for Upstash Redis — the interface is already designed for this. |
| 19 | **E2E tests** | ⚪ Future | High | Playwright for critical flows: login → inbox → send message → verify delivery status update. |

---

## Codebase Statistics Summary

| Metric | Value |
|---|---|
| Source files (`.ts` / `.tsx`) | ~325 |
| Total source size | 2.4 MB |
| API routes | 67 |
| DB migrations | 43 (245 KB SQL) |
| UI components | 23 primitives + ~50 domain components |
| Custom hooks | 9 |
| Type definitions | 870 lines (centralised) |
| Test files | **0** |
| ESLint suppressions | ~31 |
| `as any` casts | 2 (in webhook route admin client) |
| TODOs / FIXMEs | 1 |
| Dependencies | 22 runtime + 8 dev |
