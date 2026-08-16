# Scora — Gemini Brief: System Architecture, Tech Stack & Interactive HTML Design Doc

**Purpose:** Hand this document to **Google Gemini** (or any capable LLM) to produce a **single, self-contained HTML file** that documents Scora’s system architecture, tech stack, technical decisions, and component interactions — styled with Scora’s brand colors and design language.

**Audience for the output:** Developers, architects, investors, and onboarding engineers who need to understand how Scora works end-to-end.

**Language:** The HTML output should be **bilingual-friendly** — primary content in **Arabic** (RTL) with English technical terms where standard (Next.js, MySQL, JWT, etc.). Match Scora’s product voice: clear, professional, Egyptian Arabic where appropriate.

**Repo:** `E:\buildtmp\Scora` · **Version:** Scora V0.1 · **Audit date:** 2026-08-16

---

## 1. What Scora Is (Product Context)

**Scora (سكورا)** is an Arabic-first (RTL) talent marketplace and trust platform for hiring software developers in Egypt and the broader MENA region.

### Core value proposition
- **For clients:** Hire developers who *understand* their code — not just memorized answers — via verified profiles, trust scores, portfolios, and structured assessments.
- **For developers:** Build a credible profile with skill points, trust score, portfolio projects, AI-assisted assessments, and direct messaging with clients.
- **For admins:** Operate the platform — user management, developer admission, project moderation, AI settings, coupons, subscriptions, support tickets, and audit logs.

### Tagline (from metadata)
> «اعرف مين فاهم الكود بجد» — Know who truly understands the code.

### User roles
| Role | Arabic label | Primary surfaces |
|------|--------------|------------------|
| `guest` | زائر | Landing, login/register, public developer/project listings |
| `developer` | مطور | Dashboard, profile, assessments, portfolio, proposals, chat |
| `client` | عميل | Dashboard, post projects, review proposals, hire developers, chat |
| `admin` | مدير | `/admin` panel, developer admission review, AI config, analytics |

---

## 2. Deliverable Specification (What Gemini Must Produce)

Generate **one file:** `scora-system-architecture.html`

### Requirements
1. **Self-contained** — all CSS inline or in `<style>`; no external CDN dependencies except Google Fonts (Cairo, Tajawal, Outfit, JetBrains Mono).
2. **RTL layout** — `<html lang="ar" dir="rtl">`.
3. **Print-friendly** — `@media print` rules; sections break cleanly.
4. **Responsive** — readable on mobile (320px+) and desktop (1440px+).
5. **Navigation** — sticky sidebar or top nav with anchor links to every major section.
6. **Brand-accurate colors** — use the token table in §8; do not invent a new palette.
7. **Interactive diagrams** — use inline SVG or CSS-based architecture diagrams (no Mermaid CDN required; SVG preferred for offline use).
8. **No secrets** — never include `.env` values, API keys, or real credentials.

### Required sections in the HTML
| # | Section ID | Title (Arabic) | Content |
|---|------------|----------------|---------|
| 1 | `overview` | نظرة عامة | Product summary, problem/solution, user roles |
| 2 | `architecture` | المعمارية العامة | High-level system diagram: Browser → Next.js → MySQL → OpenRouter |
| 3 | `tech-stack` | حزمة التقنيات | Tables for frontend, backend, data, AI, DevOps |
| 4 | `layers` | طبقات التطبيق | Presentation / API / Business Logic / DAL / Database / Trust Engine |
| 5 | `request-flow` | مسار الطلب | Sequence: page load, auth check, server component render |
| 6 | `auth` | المصادقة والجلسات | JWT cookie flow, proxy gate, DAL enforcement |
| 7 | `trust-engine` | محرك الثقة | 10-layer pipeline from evidence → features → scoring → interview → review |
| 8 | `packages` | حزم المونوريبو | `@scora/trust-*` package map and dependencies |
| 9 | `data-model` | نموذج البيانات | ER diagram: users, developers, clients, projects, proposals, assessments |
| 10 | `routes` | مسارات التطبيق | Route map grouped by domain (public, auth, developer, client, admin, API) |
| 11 | `components` | مكونات الواجهة | Component interaction map (layout shell, providers, feature components) |
| 12 | `api` | واجهات API | REST endpoints + Server Actions overview |
| 13 | `decisions` | قرارات تقنية | ADR-style cards with rationale |
| 14 | `design-system` | نظام التصميم | Colors, typography, spacing, breakpoints, RTL notes |
| 15 | `deployment` | النشر والتشغيل | CI/CD, env vars (names only), migration scripts |
| 16 | `future` | ملاحظات مستقبلية | Optional scaling considerations (not in scope for V0.1) |

### Diagrams Gemini must include (as SVG inside HTML)

#### Diagram A — System Context (C4 Level 1)
```
[Developer Browser] ──► [Scora Next.js App]
[Client Browser]    ──►       │
[Admin Browser]     ──►       ├──► [MySQL Database]
                              ├──► [OpenRouter AI API]
                              ├──► [File Storage / Uploads]
                              └──► [Trust Engine Packages (in-process)]
```

#### Diagram B — Next.js App Internal Layers
```
app/ (pages, layouts, API routes)
  ↓
components/ (UI, client + server)
  ↓
lib/actions/ (Server Actions — mutations)
lib/dal.ts   (Data Access Layer — reads with session context)
  ↓
lib/db.ts    (mysql2 connection pool)
  ↓
MySQL
```

#### Diagram C — Trust Engine Pipeline (10 Layers)
```
Evidence Events (Layer 05 recorder)
  → @scora/trust-features      (Layers 01–07 feature extraction)
  → @scora/trust-baseline      (per-developer behavioral baseline)
  → @scora/trust-skills        (Layer 08 skill assessment)
  → @scora/trust-scoring       (Trust / Risk / Confidence + clusters)
  → @scora/trust-interview     (Layer 09 adaptive interview)
  → @scora/trust-review        (Layer 10 human review queue)
  → @scora/trust-api           (security boundary / REST)
  → @scora/trust-storage       (event ingestion + chain integrity)
  → @scora/trust-calibration   (policy gates + regression harness)
```

#### Diagram D — Auth & Session Flow
```
Login form → Server Action (lib/actions/auth.ts)
  → bcrypt verify → JOSE JWT sign → httpOnly cookie (scora_session)
  → proxy.ts (edge optimistic gate on protected routes)
  → lib/dal.ts verifySession() (DB status check per request)
```

#### Diagram E — Component Shell (Root Layout)
```
RootLayout (app/layout.tsx)
  ├── ProfileProvider (session + role context)
  │     └── FloatingChatProvider
  │           ├── {page children}
  │           ├── FloatingChatContainer
  │           ├── AiAssistantSsd (SSD floating AI widget)
  │           ├── AnalyticsTracker
  │           └── UserHeartbeat (presence)
  └── globals.css (design tokens)
```

#### Diagram F — Page Composition Pattern
```
Typical authenticated page:
  SiteHeader (role-aware nav + notifications + chat menu + mobile drawer)
  └── main content (Server Component page)
  SiteFooter
  MobileBottomTabs (xl:hidden — mobile/tablet only)
```

---

## 3. Verified Tech Stack (Use These Facts Exactly)

### Frontend
| Technology | Version | Role |
|------------|---------|------|
| Next.js | 16.3.0 | App Router, RSC, API routes, Turbopack dev |
| React | 19.2.8 | UI library |
| TypeScript | ^5 | Strict typing across app + packages |
| Tailwind CSS | ^4 | CSS-first config via `@theme` in `app/globals.css` — **no tailwind.config.js** |
| Lucide React | ^1.31.0 | Icons |
| Chart.js + react-chartjs-2 | ^4.5 / ^5.3 | Admin analytics charts |
| Monaco Editor | ^0.56 + @monaco-editor/react | Developer assessment code editor |
| Google Fonts | Cairo, Tajawal, Outfit, JetBrains Mono | Typography |

### Backend (within Next.js)
| Technology | Version | Role |
|------------|---------|------|
| Server Actions | Next.js built-in | Mutations: auth, profile, projects, admin, chat |
| REST API Routes | `app/api/**/route.ts` | 32 endpoints (admin, chat, AI, analytics, etc.) |
| mysql2 | ^3.23.3 | Direct MySQL connection pool (`lib/db.ts`) |
| jose | ^6.2.8 | JWT session encryption (HS256) |
| bcryptjs | ^3.0.3 | Password hashing |
| zod | ^4.4.3 | Input validation |
| sharp | ^0.35.3 | Image processing (avatars, uploads) |
| server-only | ^0.0.1 | Prevents client bundling of server modules |

### AI Integration
| Service | Role |
|---------|------|
| OpenRouter API | AI assistant chat, trust review agent, assessment question generation |
| Configurable models | Admin sets via `/api/admin/ai-settings` (e.g. Claude 3.5 Sonnet) |
| AI quota system | `lib/ai-quota.ts` — per-user limits |

### Database
| Engine | MySQL / MariaDB |
| Access | Raw SQL via `lib/db.ts` — no ORM |
| Migrations | Sequential scripts `scripts/migrate.js` through `scripts/migrate-v20.js` |

### DevOps
| Tool | Role |
|------|------|
| GitHub Actions | `.github/workflows/ci.yml` (lint, typecheck, build) |
| GitHub Actions | `.github/workflows/deploy.yml` (production deploy on main / Scora-V0.1) |
| ESLint | ^9 with eslint-config-next |

### Monorepo Packages (`packages/*`)
| Package | NPM name | Purpose |
|---------|----------|---------|
| `core` | `@scora/trust-core` | Event taxonomy, evidence envelope, validation, ports — zero deps |
| `features` | `@scora/trust-features` | 67 features across Layers 01–07 |
| `baseline` | `@scora/trust-baseline` | Per-developer behavioral baselines (robust stats) |
| `skills` | `@scora/trust-skills` | Layer 08 skill assessment |
| `scoring` | `@scora/trust-scoring` | Trust / Risk / Confidence + cluster catalogue |
| `interview` | `@scora/trust-interview` | Layer 09 adaptive technical interview |
| `review` | `@scora/trust-review` | Layer 10 human review queue |
| `api` | `@scora/trust-api` | Security boundary REST API |
| `storage` | `@scora/trust-storage` | Event ingestion + immutable chain |
| `calibration` | `@scora/trust-calibration` | Policy gates + regression harness |

Workspace config: `"workspaces": ["packages/*"]` in root `package.json`.

---

## 4. Application Architecture (Factual Detail for Gemini)

### 4.1 Directory structure
```
Scora/
├── app/                    # Next.js App Router (36 page routes + 32 API routes)
│   ├── layout.tsx          # Root layout: fonts, providers, global shell
│   ├── globals.css         # Design tokens (@theme), utilities, base styles
│   ├── page.tsx            # Landing (redirects signed-in users to /dashboard)
│   ├── api/                # REST endpoints
│   ├── admin/              # Admin panel
│   ├── chat/               # Messaging (master-detail on mobile)
│   ├── dashboard/          # Role-aware home
│   ├── developer-assessment/ # AI coding assessments
│   ├── developers/         # Developer directory + profiles
│   ├── projects/           # Project marketplace
│   ├── profile/            # Public + editable profiles
│   └── ...                 # auth, settings, support, legal pages
├── components/             # 45 React components
│   ├── landing/            # Hero, Proof, Workflow, TrustEngine, Audience, CtaBand
│   ├── admin/              # Admin tabs and modals
│   ├── auth/               # Social icons
│   └── *.tsx               # Shared UI (header, footer, chat, AI assistant, etc.)
├── lib/                    # Server-side business logic
│   ├── actions/            # 15 Server Action modules
│   ├── dal.ts              # Data Access Layer (session-aware reads)
│   ├── db.ts               # MySQL pool
│   ├── session.ts          # Cookie management
│   ├── session-token.ts    # JOSE JWT encrypt/decrypt
│   ├── openrouter.ts       # AI API client
│   └── ai/                 # Assistant context + action handlers
├── packages/               # Trust Engine monorepo (10 packages)
├── scripts/                # DB migration scripts (v1–v20)
├── docs/                   # Existing technical documentation
├── proxy.ts                # Edge route gate (JWT signature check)
└── public/                 # Static assets, Monaco editor bundle, icons
```

### 4.2 Architectural patterns in use

| Pattern | Where | Why |
|---------|-------|-----|
| **Server Components (RSC)** | Most `app/**/page.tsx` | Fast SSR, direct DB reads, no client JS for static content |
| **Client Components** | Forms, chat, AI widget, admin modals | Interactivity, browser APIs |
| **Server Actions** | `lib/actions/*.ts` | Type-safe mutations without separate API layer |
| **Data Access Layer** | `lib/dal.ts` | Centralized session verification; React `cache()` dedup per render |
| **React Context** | `ProfileProvider`, `FloatingChatProvider` | Client-side session/profile state hydrated from server |
| **Edge Proxy Gate** | `proxy.ts` | Optimistic JWT check before protected routes |
| **Monorepo packages** | `packages/*` | Isolated, testable Trust Engine with pure domain logic |
| **Raw SQL** | `lib/db.ts` | Direct control, no ORM overhead for V0.1 |

### 4.3 Session & auth model
- Cookie name: `scora_session`
- JWT signed with HS256 via `jose`
- Payload contains: `userId`, `role`, `isAdmin` (no sensitive data in token)
- **Two-layer auth:**
  1. `proxy.ts` — verifies JWT signature + expiry at edge (no DB)
  2. `lib/dal.ts verifySession()` — checks user status (active/suspended/banned) in DB
- Password hashing: bcryptjs
- Protected routes list in `proxy.ts`: `/dashboard`, `/profile`, `/chat`, `/admin`, etc.

### 4.4 Key user flows (document these as sequence diagrams)

**Registration flow:**
1. `/register` → `register()` Server Action → insert `users` + role-specific table → set session cookie → redirect to onboarding

**Developer onboarding:**
1. `/complete-profile` → skills, bio, location → `/developer-assessment` → Monaco editor assessment → AI scoring → admin admission review

**Client hiring flow:**
1. `/projects/new` → create project → developers submit proposals → client accepts proposal → chat enabled

**Trust assessment flow:**
1. Developer starts assessment → events recorded → features extracted → scoring → optional interview → admin/human review → trust score updated on profile

---

## 5. Route Map (Pages)

### Public / Marketing
| Route | Purpose |
|-------|---------|
| `/` | Landing page (Hero, Proof, Workflow, TrustEngine, Audience, CTA) |
| `/about` | About Scora |
| `/how-it-works` | Trust score explanation |
| `/pricing` | Subscription plans |
| `/laws` | Terms of service |
| `/privacy` | Privacy policy |
| `/support` | Support tickets |

### Auth
| Route | Purpose |
|-------|---------|
| `/login` | Sign in |
| `/register` | Sign up (developer or client) |
| `/reset-password` | Password recovery |
| `/choose-username` | Mandatory username selection |

### Developer
| Route | Purpose |
|-------|---------|
| `/dashboard` | Developer home |
| `/developers` | Browse developers |
| `/developers/[id]` | Developer public profile |
| `/profile/[username]` | Public profile page |
| `/profile/edit` | Edit own profile |
| `/complete-profile` | Onboarding form |
| `/assessments` | Assessment history |
| `/developer-assessment/[id]` | Active assessment (Monaco) |
| `/developer-assessment/pending` | Awaiting admin review |
| `/portfolio/new` | Add portfolio project |
| `/portfolio/[id]` | Portfolio detail |

### Client
| Route | Purpose |
|-------|---------|
| `/dashboard` | Client home |
| `/projects` | Browse projects |
| `/projects/new` | Post new project |
| `/projects/[id]` | Project detail |
| `/projects/[id]/proposals` | Review proposals |
| `/complete-client-profile` | Client onboarding |
| `/client-profile` | Client profile view |
| `/hire-developer` | Hire flow |

### Shared (authenticated)
| Route | Purpose |
|-------|---------|
| `/chat` | Messaging (URL-driven master-detail: `?with=username`) |
| `/settings` | Account settings, AI preferences, password |

### Admin
| Route | Purpose |
|-------|---------|
| `/admin` | Full admin panel (users, projects, AI, coupons, tickets, audit) |
| `/admin/developers/[id]/review` | Developer admission review |

---

## 6. API Surface (REST)

32 route handlers under `app/api/`:

| Group | Endpoints | Access |
|-------|-----------|--------|
| **Auth** | `POST /api/auth/logout` | Authenticated |
| **Admin** | `/api/admin/users`, `/stats`, `/projects`, `/coupons`, `/ai-settings`, `/ai-sessions`, `/assessments`, `/reviews`, `/audit-logs`, `/tickets`, `/plans` | Admin only |
| **Projects** | `GET/POST /api/projects`, `GET /api/projects/[id]` | Mixed |
| **Chat** | `/api/chat/recent`, `/api/chat/[userId]` | Authenticated |
| **AI** | `/api/ai/chat`, `/api/ai/action`, `/api/ai/quota` | Authenticated + quota |
| **Developer Assessment** | `/api/developer-assessment/[id]/state`, `/interview` | Developer |
| **Notifications** | `GET /api/notifications` | Authenticated |
| **Analytics** | `POST /api/analytics/visit` | Public |
| **Support** | `/api/support/tickets/[ticketId]` | Authenticated |
| **Subscriptions** | `/api/subscriptions/subscribe`, `/api/plans`, `/api/coupons/validate` | Mixed |
| **Heartbeat** | `POST /api/heartbeat` | Authenticated (presence) |
| **Dashboard** | `GET /api/dashboard` | Authenticated |

Server Actions (no HTTP path — called from forms):
- `lib/actions/auth.ts` — register, login
- `lib/actions/profile.ts` — profile update, create project, submit proposal
- `lib/actions/admin.ts` — 20+ admin operations
- `lib/actions/developer-assessment.ts` — assessment lifecycle
- `lib/actions/chat.ts` — send message
- `lib/actions/proposals.ts` — accept/reject/unhire
- And 9 more modules — see `lib/actions/` directory

---

## 7. Database Entities (Core Tables)

Document as ER diagram in HTML:

| Table | Key fields | Relations |
|-------|------------|-----------|
| `users` | id, email, password_hash, role, status, username | 1:1 developers or clients |
| `developers` | user_id, trust_score, skill_points, admission_status, bio, skills | → developer_skills, assessments, proposals |
| `clients` | user_id, company_name, account_type | → projects |
| `projects` | client_id, title, budget, status | → proposals |
| `proposals` | project_id, developer_id, price, status | unique (project, developer) |
| `developer_assessments` | developer_id, category, score, ai_feedback | Trust engine output |
| `developer_skills` | developer_id, skill_id, sp (skill points) | → skills |
| `notifications` | user_id, title, message, read | |
| `messages` | sender_id, receiver_id, body, image_url | Chat |
| `support_tickets` | user_id, category, subject, status | |
| `platform_settings` | setting_key, setting_value | AI config, feature flags |
| `subscriptions` / `plans` / `coupons` | Billing system | |

Full schema: see `docs/DATABASE_SCHEMA.md`.

---

## 8. Design System (Colors & Typography for HTML Styling)

**Figma source:** https://www.figma.com/design/B8L6A9R6c7pCutZep7uXcS/SCORA (page "Design System")

### 8.1 CSS custom properties (from `app/globals.css @theme`)

#### Green ramp (brand)
| Token | Hex | Usage |
|-------|-----|-------|
| `--color-green-50` | `#f0faf3` | Lightest tint |
| `--color-green-100` | `#d4f5de` | |
| `--color-green-200` | `#a9e9bf` | |
| `--color-green-300` | `#74d99f` | |
| `--color-green-400` | `#48c779` | |
| `--color-green-500` | `#16a34a` | |
| `--color-green-600` | `#0e6d3b` | |
| `--color-green-700` | `#006b2c` | Primary semantic |
| `--color-green-800` | `#004021` | Dark headings |
| `--color-green-900` | `#002110` | Ink / body text |

#### Neutral ramp
| Token | Hex |
|-------|-----|
| `--color-neutral-0` | `#ffffff` |
| `--color-neutral-50` | `#f7faf8` |
| `--color-neutral-100` | `#eff5f0` |
| `--color-neutral-200` | `#d6e3d9` |
| `--color-neutral-300` | `#b8ccbd` |
| `--color-neutral-400` | `#879b8d` |
| `--color-neutral-500` | `#576b5c` |
| `--color-neutral-600` | `#3e4a3d` |
| `--color-neutral-700` | `#2a352d` |
| `--color-neutral-900` | `#0e160f` |

#### Semantic roles
| Token | Value | Role |
|-------|-------|------|
| `--color-primary` | `#006b2c` (green-700) | Links, CTAs, accents |
| `--color-background` | `#ffffff` | Page background |
| `--color-surface` | `#f7faf8` | Cards, panels |
| `--color-ink` | `#002110` (green-900) | Primary text |
| `--color-muted` | `#576b5c` (neutral-500) | Secondary text |
| `--color-line` | `#d6e3d9` (neutral-200) | Borders |
| `--color-success` | `#0e6d3b` | Success states |
| `--color-warning` | `#9a6500` | Warnings |
| `--color-error` | `#ad2929` | Errors |
| `--color-info` | `#186eca` | Info |

#### Landing-specific
| Token | Hex | Role |
|-------|-----|------|
| `--color-panel` | `#f5fbf7` | Trust engine panel bg |
| `--color-track` | `#dbebe0` | Progress bar track |
| `--color-fill` | `#4ab86e` | Progress bar fill |
| `--color-avatar` | `#f5fcf7` | Avatar background |
| `--color-avatar-ring` | `#78c991` | Avatar ring |

#### Hardcoded UI colors (used in components — include in HTML)
| Hex | Usage |
|-----|-------|
| `#056B38` | Primary buttons, active nav, theme-color, scrollbar hover |
| `#08592E` | Button hover state |
| `#05291A` | Dark text on light surfaces |
| `#D1E3D6` | Input borders, dividers |
| `#E8FAF0` | Active/hover backgrounds, selected options |
| `#C5E8D1` | Active nav border |
| `#F7FAF8` | Input backgrounds, scrollbar track |
| `#BFE3CD` | Scrollbar thumb |

### 8.2 Typography
| Role | Font | CSS variable | Weights |
|------|------|--------------|---------|
| Headings | Cairo | `--font-heading` | 400, 600, 700 |
| Body | Tajawal | `--font-body` | 400, 500, 700 |
| Technical labels | Outfit | `--font-technical` | 800 (`@utility technical`) |
| Code | JetBrains Mono | `--font-mono` | default |

### 8.3 Shape (border radius)
| Token | Value | Usage |
|-------|-------|-------|
| `--radius-sm` | 8px | Small elements |
| `--radius-md` | 12px | Buttons, inputs |
| `--radius-lg` | 20px | Cards |
| `--radius-xl` | 28px | Large panels, chat containers |

Common arbitrary values in UI: `rounded-[14px]`, `rounded-[12px]`, `rounded-[28px]`, `rounded-full`.

### 8.4 Layout constants
| Constant | Value | Notes |
|----------|-------|-------|
| Max content width | `1296px` | `max-w-[1296px]` on most pages |
| Mobile/desktop breakpoint | **`xl` = 1280px** | Single boundary for nav mode switch |
| Mobile bottom tab bar | `xl:hidden`, `pb-20` body padding | Fixed bottom nav for signed-in users |
| Direction | RTL | `<html dir="rtl" lang="ar">` |
| theme-color | `#056B38` | Browser chrome on Android |

### 8.5 HTML styling guidance for Gemini
- Page background: `#ffffff` with subtle `#f7faf8` section alternation
- Sidebar/nav background: `#f5fbf7` with `#d6e3d9` borders
- Code blocks: `#f7faf8` background, `#05291A` text, `#056B38` accents
- Diagram boxes: white fill, `#D1E3D6` border, `#056B38` connector arrows
- Section headers: Cairo bold, `#002110`
- ADR cards: `#f5fbf7` panel, left/right accent bar in `#056B38`
- Hover states: `#E8FAF0` background

---

## 9. Component Catalog (For Interaction Diagram)

### Layout shell
| Component | File | Role |
|-----------|------|------|
| `RootLayout` | `app/layout.tsx` | Fonts, metadata, providers |
| `SiteHeader` | `components/site-header.tsx` | Sticky nav, role-aware links, avatar, notifications, chat menu |
| `SiteFooter` | `components/site-footer.tsx` | Footer links |
| `MobileBottomTabs` | `components/mobile-bottom-tabs.tsx` | Bottom nav (xl:hidden) |
| `MobileNavDrawer` | `components/mobile-nav-drawer.tsx` | Hamburger drawer for tablet/mobile |

### State providers
| Component | File | Role |
|-----------|------|------|
| `ProfileProvider` | `components/profile-provider.tsx` | Hydrates user role, developer/client profile to client tree |
| `FloatingChatProvider` | `components/floating-chat-provider.tsx` | Floating chat widget state |

### Feature components
| Component | File | Role |
|-----------|------|------|
| `AiAssistantSsd` | `components/ai-assistant-ssd.tsx` | Floating AI assistant (SSD widget) |
| `FloatingChatContainer` | `components/floating-chat-container.tsx` | Minimized chat bubble |
| `ChatClient` | `components/chat-client.tsx` | Real-time chat UI |
| `ChatMenu` | `components/chat-menu.tsx` | Header chat dropdown |
| `NotificationsMenu` | `components/notifications-menu.tsx` | Header notifications dropdown |
| `DeveloperAssessmentForm` | `components/developer-assessment-form.tsx` | Assessment UI with Monaco |
| `DeveloperAssessmentHub` | `components/developer-assessment-hub.tsx` | Assessment entry point |
| `SubscriptionCheckoutModal` | `components/subscription-checkout-modal.tsx` | Plan purchase |
| `VerifiedBadge` | `components/verified-badge.tsx` | Trust verification badge |
| `ScoraLogo` | `components/scora-logo.tsx` | Brand logo (S icon + "cora" wordmark) |

### Landing sections
| Component | File |
|-----------|------|
| `Hero` | `components/landing/hero.tsx` |
| `Proof` | `components/landing/proof.tsx` |
| `Workflow` | `components/landing/workflow.tsx` |
| `TrustEngine` | `components/landing/trust-engine.tsx` |
| `Audience` | `components/landing/audience.tsx` |
| `CtaBand` | `components/landing/cta-band.tsx` |

### Admin
| Component | File |
|-----------|------|
| `AdminUserModals` | `components/admin/admin-user-modals.tsx` |
| `AdminProjectModals` | `components/admin/admin-project-modals.tsx` |
| `AdminCouponsTab` | `components/admin/admin-coupons-tab.tsx` |
| `AdminAiLogsTab` | `components/admin/admin-ai-logs-tab.tsx` |
| `AdminPlansTab` | `components/admin/admin-plans-tab.tsx` |
| `AdminProgressiveChart` | `components/admin/admin-progressive-chart.tsx` |

### Interaction edges to diagram
```
SiteHeader ──reads──► ProfileProvider (role, username)
SiteHeader ──contains──► NotificationsMenu, ChatMenu, MobileNavDrawer
SiteHeader ──links──► navLinks (role-specific routes)

AiAssistantSsd ──calls──► POST /api/ai/chat, POST /api/ai/action
AiAssistantSsd ──reads──► ProfileProvider (showSsdAssistant flag)

DeveloperAssessmentForm ──calls──► Server Actions (developer-assessment.ts)
DeveloperAssessmentForm ──embeds──► Monaco Editor
DeveloperAssessmentForm ──feeds──► Trust Engine packages (event ingestion)

ChatClient ──calls──► Server Actions (chat.ts), GET /api/chat/[userId]
FloatingChatContainer ──wraps──► ChatClient (minimized state)

AnalyticsTracker ──calls──► POST /api/analytics/visit
UserHeartbeat ──calls──► POST /api/heartbeat
```

---

## 10. Technical Decisions (ADR Cards for HTML)

Gemini should render each as a card with: **Decision · Context · Choice · Consequences · Status**

### ADR-001: Next.js App Router with Server Components
- **Context:** Need fast Arabic RTL pages with SEO and minimal client JS
- **Choice:** Next.js 16 App Router, RSC-first, client components only where needed
- **Consequences:** Direct DB access in pages; careful boundary between server/client
- **Status:** Accepted

### ADR-002: Raw SQL over ORM
- **Context:** V0.1 needs direct control; team knows SQL; no complex graph queries
- **Choice:** mysql2 pool + parameterized queries in DAL/actions
- **Consequences:** Manual migration scripts; no auto schema sync
- **Status:** Accepted (may revisit for V0.2)

### ADR-003: JWT Session Cookies (not server-side sessions)
- **Context:** Stateless scaling; edge proxy needs fast auth check
- **Choice:** JOSE HS256 JWT in httpOnly cookie; DB status check in DAL
- **Consequences:** Two-layer auth; token cannot be revoked without DB check
- **Status:** Accepted

### ADR-004: Server Actions over REST for mutations
- **Context:** Form-heavy Arabic UI; type safety with Zod
- **Choice:** Server Actions in `lib/actions/`; REST only for client polling (chat, notifications, AI)
- **Consequences:** Mixed pattern; REST needed for real-time features
- **Status:** Accepted

### ADR-005: Trust Engine as isolated monorepo packages
- **Context:** Scoring logic must be testable, deterministic, and reusable outside the web app
- **Choice:** 10 packages under `packages/` with pure functions and 100+ unit tests
- **Consequences:** Build step required (`npm run build:packages`); committed dist/ artifacts
- **Status:** Accepted

### ADR-006: OpenRouter for AI (not direct provider SDK)
- **Context:** Admin-configurable models; single integration point
- **Choice:** OpenRouter API with admin settings for model/key/base URL
- **Consequences:** Vendor dependency; easy model switching
- **Status:** Accepted

### ADR-007: RTL-first with physical CSS directions
- **Context:** Arabic is primary language; Tailwind physical left/right do not flip
- **Choice:** `dir="rtl"` on html; explicit RTL-aware positioning (drawer from right, ChevronRight for back)
- **Consequences:** Every layout change must be tested in RTL
- **Status:** Accepted

### ADR-008: Single breakpoint at xl (1280px) for mobile/desktop nav
- **Context:** Arabic nav links need ~1100px; previous 950px breakpoint caused dead zone
- **Choice:** Bottom tabs + hamburger drawer below 1280px; desktop nav at xl+
- **Consequences:** iPad landscape uses mobile nav (intentional)
- **Status:** Accepted

### ADR-009: Trust/Risk/Confidence scoring (not approve/reject)
- **Context:** Automated systems must not make hiring decisions
- **Choice:** Recommendations like `SUPPORTED`, `HUMAN_REVIEW_REQUIRED` — never `APPROVE`/`REJECT`
- **Consequences:** Admin/human always in the loop for adverse outcomes
- **Status:** Accepted (Trust Engine policy)

### ADR-010: No ORM migrations — sequential JS scripts
- **Context:** Simple deployment; full control over schema changes
- **Choice:** `scripts/migrate.js` through `migrate-v20.js` run manually
- **Consequences:** No automatic migration on deploy; operator must run scripts
- **Status:** Accepted

---

## 11. Trust Engine Deep Dive (For Architecture Section)

This is Scora's differentiator. Gemini must explain it clearly.

### Philosophy
- **Measure, don't judge** (features layer)
- **Corroborate before accusing** (clusters require ≥2 layers)
- **Never penalize absence of evidence** (null ≠ zero)
- **Human review for adverse outcomes** (Layer 10)
- **Developer-facing summaries never name cluster patterns**

### Layer map
| Layer | Package | Function |
|-------|---------|----------|
| L01 Environment | features | Runtime integrity, device context |
| L02 Interaction | features | Window focus, idle patterns |
| L03 Typing | features | Keystroke dynamics, paste ratios |
| L04 Code Evolution | features | Edit patterns, refactoring |
| L05 Runtime | features | Errors, test runs, execution |
| L06 External | features | Reference visits, imports |
| L07 Editor Assistance | features | Completion acceptance, dependency index |
| L08 Skills | skills | Skill claim verification |
| L09 Interview | interview | Adaptive grounded questions |
| L10 Review | review | Human reviewer queue |

### Scoring outputs
| Output | Range | Meaning |
|--------|-------|---------|
| Trust | 0–100 | Evidence supports code ownership |
| Risk | 0–100 | Corroborated concern (clusters only) |
| Confidence | 0–100 | Evidence quality (independent of Trust) |

### Cluster catalogue (Risk sources)
| Cluster | Min layers | Max severity |
|---------|------------|--------------|
| `unverified_external_import` | 2+ | 0.80 |
| `assistance_dependence` | 2+ | 0.55 |
| `environment_integrity_compromise` | 2+ | 0.60 |
| `absent_development_process` | 2+ | 0.50 |

---

## 12. Environment & Deployment (Names Only — No Values)

Reference `docs/ENVIRONMENT_SETUP.md` for full list. Key variable **names** to mention:
- `DATABASE_URL` or individual `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
- `SESSION_SECRET` — JWT signing key
- `OPENROUTER_API_KEY` — AI integration
- `NODE_ENV`

### CI/CD pipeline
1. **CI** (`ci.yml`): checkout → npm install → eslint → tsc → next build
2. **Deploy** (`deploy.yml`): triggered on push to `main` or `Scora-V0.1`

### Local dev commands
```bash
npm install --legacy-peer-deps
node scripts/migrate.js && node scripts/migrate-v8.js  # run all migrations as needed
npm run dev          # http://localhost:3000
npm run build        # production build
npm run typecheck    # tsc --noEmit
npm run build:packages  # compile trust engine packages
```

---

## 13. Existing Documentation (Cross-Reference in HTML)

Link or summarize these repo docs in a "Further Reading" section:
| File | Content |
|------|---------|
| `README.md` | Project master doc (Arabic) |
| `docs/PROJECT_STRUCTURE.md` | Folder tree + layer separation |
| `docs/DATABASE_SCHEMA.md` | ER diagrams + table definitions |
| `docs/API_DOCUMENTATION.md` | REST + Server Actions reference |
| `docs/ENVIRONMENT_SETUP.md` | Local setup guide |
| `docs/RESPONSIVE_UX_FIX_PLAN.md` | Mobile/responsive architecture decisions |
| `packages/*/README.md` | Trust Engine package docs |

---

## 14. Gemini Prompt (Copy-Paste Block)

Use this block when handing to Gemini:

---

**PROMPT START**

You are a senior software architect and technical writer. Using the brief in this document, create a **single self-contained HTML file** named `scora-system-architecture.html`.

Requirements:
1. Read every section of this brief carefully — all facts are verified from the Scora V0.1 codebase.
2. Produce all 16 sections listed in §2 with anchor navigation.
3. Include 6 SVG architecture diagrams (A–F from §2) styled with Scora colors from §8.
4. Use Arabic as primary language (RTL), with English for technology names.
5. Apply the design system from §8 — Cairo/Tajawal/Outfit/JetBrains Mono fonts via Google Fonts.
6. Include ADR cards from §10.
7. Include interactive hover effects on diagram nodes (CSS only).
8. Add a collapsible "Tech Stack" table and a route map table.
9. Add a color palette swatch section showing all brand colors.
10. Make it beautiful, professional, and suitable for presenting to stakeholders.
11. Do NOT include any secrets, API keys, or placeholder credentials.
12. Output ONLY the complete HTML file content — no markdown wrapper.

**PROMPT END**

---

## 15. Quality Checklist (For Reviewing Gemini Output)

- [ ] HTML validates as well-formed; opens offline in browser
- [ ] RTL layout correct; no LTR leakage in nav/text
- [ ] All 6 diagrams present and readable
- [ ] Color swatches match §8 hex values exactly
- [ ] Trust Engine 10-layer pipeline explained
- [ ] Auth two-layer model documented (proxy + DAL)
- [ ] Mobile breakpoint (xl/1280px) mentioned in design section
- [ ] No invented features not in this brief
- [ ] Server Actions vs REST API distinction clear
- [ ] Monorepo packages listed with correct npm names
- [ ] Print stylesheet included

---

*This brief was generated from static analysis of the Scora V0.1 repository on 2026-08-16. Verify against live codebase before treating as authoritative for production decisions.*
