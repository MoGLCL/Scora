# SCORA Platform — Project Architecture & Complete Handover Guide

> **Project Name:** SCORA (سكورا)  
> **Repository:** https://github.com/MoGLCL/Scora.git (Branch: `Scora-V0.1`)  
> **Tech Stack:** Next.js 16.3 (Turbopack, App Router, Server Actions), React 19, TypeScript, MySQL (mysql2/promise connection pool), Tailwind CSS with Cairo/Tajawal Typography, OpenRouter AI Multi-Model Architecture, Web Audio Recording API, Monaco Editor Code Sandbox.

---

## 1. Strict Platform Rules & Directives

1. **NO EMOJIS ANYWHERE:** Absolutely forbidden in all code, comments, UI text, toast notifications, badges, or console logs.
2. **FREE AI MODELS ONLY (OpenRouter):**
   - The platform relies strictly on 100% free AI models from OpenRouter (e.g. `deepseek/deepseek-r1:free`, `meta-llama/llama-3.3-70b-instruct:free`, `google/gemini-2.0-flash-thinking-exp:free`, `qwen/qwen-2.5-coder-32b-instruct:free`).
   - Timeouts must remain generous (90 seconds for assessment generation, 60 seconds for evaluation, 45 seconds for connection tests).
3. **TRUST SCORE & SKILL POINTS (SP) RULES:**
   - **Trust Score:** Capped strictly between `0%` and `100%` (`min: 0, max: 100`).
   - **Skill Points (SP):** Completely open and unlimited (`min: 0`, NO upper limit).
   - The Admin can edit both values dynamically from `/admin` or during test review at `/admin/developers/[id]/review`.
4. **NO HARDCODED DEFAULT SKILLS:**
   - When a developer edits their skills, the modal must strictly retain and persist their exact selected skills (no fallback default skill arrays).
5. **NO LOOPS OR SPAM POLLING:**
   - Admission status (`/api/developer-admission/status`) checks once on mount; live polling (10s) is strictly active only when waiting for admin decision (`admin_review` or `reset_requested`) with `document.visibilityState === 'visible'`.
   - Notifications menu polls every 15s when the tab is visible.
6. **GIT PUSH RULE:**
   - Do NOT run automated git pushes; only push when the user explicitly instructs it.

---

## 2. Core Architecture & Layers

### A. Authentication & Session Management
- **Token:** JWT signed via `jose` stored in `scora_session` HTTP-only secure cookie.
- **Data Access Layer (DAL):** `lib/dal.ts` exports `verifySession()` (React `cache()` memoized per request), `getCurrentUser()`, `getCurrentDeveloper()`, `getCurrentClient()`.
- **Middleware Guard (`proxy.ts`):** Enforces route protection, onboarding gates, and ensures unapproved developers can access `/developer-assessment/pending` and their profile without infinite redirect loops.

### B. The 10-Layer Trust Engine & Admission Flow
1. **Developer Registration & Onboarding (`/complete-profile`):**
   - Developer completes real identity fields: Name, Phone (Egyptian format validation `01xxxxxxxxx`), Username, Location, Tracks, Skills (2 edits max allowed during pending).
2. **Assessment Generation (`lib/actions/developer-assessment.ts` & `lib/openrouter.ts`):**
   - Generates a customized test tailored to the developer's exact selected skills and job track:
     - Coding tasks (Monaco sandbox IDE).
     - Multiple choice questions (MCQs).
     - Open-ended technical essays.
3. **Audio Interview Rounds (`developer_interview_rounds`):**
   - Developer records voice answers explaining their code logic.
   - Converted to text via Web Audio speech recognition / transcript pipeline.
4. **SHA-256 Cryptographic Event Chain (`lib/trust-events.ts` & `trust_events` table):**
   - Every action (test started, answer submitted, snapshot locked, evaluation) creates an immutable hash linked to previous block hashes.
5. **Admin Review & Decision Form (`/admin/developers/[id]/review`):**
   - Displays AI Review Report, code submissions, audio transcripts, and SHA-256 audit chain.
   - Form defaults dynamically to the developer's actual test score percentage, while allowing the Admin to edit Trust (0-100%) and SP (unlimited) before clicking "قبول وتفعيل حساب المطور".

---

## 3. Database Schema Overview (MySQL)

Key Tables:
- `users`: User accounts (`id`, `email`, `password_hash`, `full_name`, `username`, `phone`, `role`, `is_admin`, `status`, `suspended_until`, `onboarding_completed_at`).
- `developers`: Developer profiles (`user_id`, `job_title`, `bio`, `location`, `approval_status`, `trust_score`, `skill_points`, `remaining_skills_changes`, `rejection_reason`).
- `developer_skills`: Pivot table mapping developer to skills with individual `sp`.
- `clients`: Client accounts (`user_id`, `account_type`, `company_name`, `industry`, `location`).
- `projects`: Client projects (`client_id`, `title`, `description`, `budget_from`, `budget_to`, `skills_json`, `status`).
- `proposals`: Developer bids on projects (`project_id`, `developer_id`, `price`, `delivery_days`, `cover_text`, `status`).
- `developer_assessment_sessions`: Assessment sessions (`developer_id`, `public_id`, `status`, `model`, `score`, `trust_awarded`, `sp_awarded`, `evidence_snapshot_hash`).
- `developer_assessment_questions`: Questions generated for a session (`session_id`, `kind`, `skill`, `question_text`, `max_score`).
- `developer_assessment_answers`: Candidate submissions and grades (`question_id`, `answer_text`, `score`, `feedback`).
- `developer_interview_rounds`: Audio interview recordings and transcripts (`session_id`, `question_text`, `audio_url`, `response_transcript`).
- `trust_events`: SHA-256 event audit log (`session_public_id`, `event_type`, `source`, `event_hash`, `prev_event_hash`).
- `system_settings`: Platform runtime settings (`key`, `value` e.g. `openrouter_api_key`, `openrouter_models_json`, `quick_registration_enabled`).

---

## 4. Key Directories & Critical Files

```
apps/Front New/
├── app/
│   ├── page.tsx                                # Landing page
│   ├── login/ & register/                      # Authentication
│   ├── complete-profile/                       # Developer onboarding
│   ├── complete-client-profile/                # Client onboarding
│   ├── developer-assessment/
│   │   ├── pending/page.tsx                    # Developer admission waiting/status room
│   │   └── [id]/page.tsx                       # Live Monaco code sandbox test & interview
│   ├── admin/
│   │   ├── page.tsx                            # Full Admin control dashboard (Users, Projects, Stats, AI, Settings)
│   │   └── developers/[id]/review/page.tsx     # Admin developer review & admission decision
│   ├── projects/                               # Marketplace & project details
│   ├── profile/                                # User profiles
│   └── chat/                                   # Real-time messaging
├── components/
│   ├── admission-status.tsx                    # Live client status, skill editor, and assessment launcher
│   ├── admission-decision-form.tsx             # Admin decision form with dynamic Trust (0-100%) & open SP
│   ├── admin-ai-review-card.tsx                # Post-assessment AI intelligence report
│   ├── openrouter-settings.tsx                 # Admin OpenRouter AI model selector & connectivity test
│   └── notifications-menu.tsx                  # Live header notification drawer
├── lib/
│   ├── db.ts                                   # MySQL pool & query execution
│   ├── dal.ts                                  # Server Data Access Layer (session-verified reads)
│   ├── openrouter.ts                           # OpenRouter API client with fallback multi-model pipeline
│   ├── actions/
│   │   ├── admin.ts                            # Admin server actions (decideDeveloperAdmission, updateUserForAdmin, etc.)
│   │   ├── developer-assessment.ts             # Assessment start, submit, and answer actions
│   │   ├── profile.ts                          # Profile updates and skill management
│   │   └── settings.ts                         # System & AI settings actions
│   └── types.ts                                # TypeScript domain models
└── proxy.ts                                    # Next.js route gatekeeper & middleware
```

---

## 5. Current Verified State

- **Build Status:** Next.js production build passes with `0 errors` (`Compiled successfully`).
- **Loop Prevention:** All infinite loops, fast polling leaks, and double-click submissions have been eliminated.
- **Dynamic Scoring:** Real scores from candidate tests populate the Admin Review form, with full admin ability to adjust Trust (0 - 100%) and SP (open/unlimited).
