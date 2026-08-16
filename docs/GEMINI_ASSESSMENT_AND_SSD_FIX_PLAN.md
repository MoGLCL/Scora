# Scora — Gemini Implementation Plan: Admin Assessment Queue + SSD Gating

**Audience:** Implementing agent (Gemini or Cursor) — no prior conversation context assumed  
**Repo:** `E:\buildtmp\Scora` · **Scora V0.1**  
**Date:** 2026-08-16  
**Language:** Preserve all Arabic UI copy verbatim — copy/paste strings, do not retype.

---

## Summary (What to Fix)

| # | Problem | Expected behavior |
|---|---------|-------------------|
| **1** | Developer completes `developer-assessment` but admin does **not** see the submission in `/admin` | When assessment is fully submitted, `developers.approval_status` and `developer_assessment_sessions.status` become `admin_review`, admin gets a notification, and the pending-review banner + review links appear on the admin dashboard |
| **2** | SSD AI assistant appears for developers **before** they finish assessment **and** get admin approval | SSD widget (`AiAssistantSsd`) must be **hidden** for developers until `developers.approval_status === 'approved'`. Server APIs must also reject AI calls for unapproved developers |

---

## Ground Rules

1. **Match on strings, not line numbers** — line numbers drift; every task includes exact find-strings verified against the working tree.
2. **Do not touch `packages/*/dist/**`** — committed build artifacts; leave alone.
3. **Run `npx tsc --noEmit` after every phase** — must stay clean.
4. **Do not remove** the `<!-- BEGIN:nextjs-agent-rules -->` block from `AGENTS.md`.
5. **Minimal scope** — fix the two bugs; do not redesign assessment UX or admin UI.
6. **Server + client gate for SSD** — hiding the widget alone is not enough; `/api/ai/chat` must return 403 for unapproved developers.

---

## Part A — Root Cause Analysis (Read Before Coding)

### Problem 1: Why admin may not see completed assessments

The submission pipeline is:

```
Developer UI → submitAndFinalizeAssessment() → finalizeAssessmentSession()
  → grade answers → DB transaction:
       • session.status = 'admin_review'
       • developers.approval_status = 'admin_review'
       • admin notification INSERT
       • trust event ASSESSMENT_SUBMITTED
```

Admin dashboard reads pending reviews from `GET /api/admin/users` where:
- `approvalStatus === "admin_review"` → badge count + filter
- `approvalStatus === "admin_review" && assessmentPublicId` → review link buttons
- `assessmentPublicId` subquery: latest session with `das.status = 'admin_review'`

**Confirmed bugs / failure modes in current code:**

#### Bug 1A — Premature finalize in `finishAssessment()` (CRITICAL)

File: `components/developer-assessment-form.tsx`

When the developer finishes written questions and clicks through to the voice interview, `finishAssessment()` calls `submitAndFinalizeAssessment(publicId)` **before** the interview phase, then unconditionally `setPhase("interview")`.

```tsx
// CURRENT (broken flow)
await submitAndFinalizeAssessment(publicId);  // finalizes too early
setPhase("interview");                         // interview UI shown after finalize
```

**Impact:**
- If finalize **succeeds** here, session is already `admin_review` while developer still sees interview UI — interview API returns 409 (`status !== 'in_progress'`).
- If finalize **fails**, errors are swallowed (`console.warn`) and developer still enters interview — they believe they submitted but DB is unchanged.
- `skipInterview()` and timer paths call finalize again but **ignore failures** (`catch { // Ignore }`) and still show the green success screen (`phase === "complete"`).

**Correct flow:**
```
assessment questions → interview phase (session stays in_progress)
  → skip interview OR complete interview OR timer expires
  → finalize ONCE → admin_review → success UI
```

#### Bug 1B — Silent failure on finalize (CRITICAL)

These paths do not surface errors to the developer:
- `void submitAndFinalizeAssessment(publicId)` (timer, line ~293)
- `catch { // Ignore }` in `skipInterview()`
- `catch (err) { console.warn(...) }` in `finishAssessment()` and `finishAssessment` timer

`submitAndFinalizeAssessment` returns `{ ok: false, error }` but callers ignore it.

#### Bug 1C — Notification INSERT can roll back entire transaction

File: `lib/assessment-finalize.ts`

```sql
INSERT INTO notifications(user_id, body, link_url) SELECT id, ?, ? FROM users WHERE is_admin=1 ...
```

Column `link_url` was added in `scripts/migrate-v13.js`. If that migration was never run on the deployment DB, **the entire finalize transaction rolls back** — no status update, no admin queue entry.

#### Bug 1D — Idempotent early return too aggressive

File: `lib/assessment-finalize.ts`

```ts
if (session.evidence_snapshot_hash) {
  return;  // exits without ensuring approval_status / session.status are admin_review
}
```

If a previous partial run ever left inconsistent state, retries silently no-op.

---

### Problem 2: Why SSD appears too early

SSD visibility is currently:

| Layer | Current check | Missing |
|-------|---------------|---------|
| `app/layout.tsx` | `showSsdAssistant: userAiSetting !== "false"` | No `approval_status` check |
| `components/ai-assistant-ssd.tsx:677` | guest / platform AI disabled / user pref | No developer approval check |
| `app/api/ai/chat/route.ts` | session + quota + platform enabled | No developer approval check |

JWT already has `developerApproved` (set at login from `approval_status === 'approved'`) but SSD does not use it. **Gate on live DB status via `verifySession().developerApprovalStatus`** (from `lib/dal.ts`) so it stays correct without forcing re-login.

---

## Part B — Expected Behavior (Acceptance Criteria)

### Assessment → Admin queue

1. Developer completes assessment (including interview skip or voice completion).
2. DB state after successful finalize:
   - `developer_assessment_sessions.status = 'admin_review'`
   - `developers.approval_status = 'admin_review'`
   - `evidence_snapshot_hash` IS NOT NULL
   - At least one notification row for each active admin user
3. Admin on `/admin`:
   - `pendingReviewsCount >= 1` for that developer
   - Amber banner shows review button linking to `/admin/developers/{assessmentPublicId}/review`
   - Assessments tab shows session with status `admin_review`
4. If finalize fails (DB error, network): developer sees **Arabic error message**, NOT the green success screen.

### SSD gating

1. Developer with `approval_status` in `pending`, `profile_incomplete`, `assessment_in_progress`, `admin_review`, `rejected`, `reset_*` → **no SSD button**, no floating widget.
2. Developer with `approval_status = 'approved'` → SSD visible (if platform AI enabled + user pref allows).
3. `POST /api/ai/chat` for unapproved developer → `403` with Arabic message `{ error: "DEVELOPER_NOT_APPROVED", message: "..." }`.
4. Clients and admins → unchanged SSD behavior.
5. After admin approves developer, SSD appears on **next page navigation** (layout re-fetch) without requiring logout.

---

# PHASE 1 — Fix assessment submission → admin queue

## Task 1.1 — Remove premature finalize from `finishAssessment()`

**File:** `components/developer-assessment-form.tsx`

**Find:**
```tsx
  const finishAssessment = async () => {
    setError("");
    setBusy(true);

    // Save draft answers to DB asynchronously
    try {
      await save();
      await submitAndFinalizeAssessment(publicId);
    } catch (err) {
      console.warn("[finishAssessment]", err);
    }

    // Provide initial default interview question if rounds array is empty
```

**Replace with:**
```tsx
  const finishAssessment = async () => {
    setError("");
    setBusy(true);

    // Persist answers only — finalize happens AFTER interview (skip or complete)
    try {
      await save();
    } catch (err) {
      console.warn("[finishAssessment:save]", err);
      setError("تعذر حفظ إجاباتك. حاول مرة أخرى قبل الانتقال للمقابلة.");
      setBusy(false);
      return;
    }

    // Provide initial default interview question if rounds array is empty
```

**Do not** call `submitAndFinalizeAssessment` anywhere in `finishAssessment`.

---

## Task 1.2 — Add shared finalize helper with error handling in the form

**File:** `components/developer-assessment-form.tsx`

Add this function **inside the component** (after existing hooks, before `finishAssessment`):

```tsx
  async function finalizeToAdminQueue(): Promise<boolean> {
    const result = await submitAndFinalizeAssessment(publicId);
    if (!result?.ok) {
      setError(result?.error || "تعذر تسليم التقييم للمراجعة. حاول مرة أخرى أو تواصل مع الدعم.");
      return false;
    }
    return true;
  }
```

---

## Task 1.3 — Fix `skipInterview()` to require successful finalize

**File:** `components/developer-assessment-form.tsx`

**Find:**
```tsx
  async function skipInterview() {
    setBusy(true);
    setError("");
    try {
      await submitAndFinalizeAssessment(publicId);
    } catch {
      // Ignore
    } finally {
      setBusy(false);
      setPhase("complete");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    }
  }
```

**Replace with:**
```tsx
  async function skipInterview() {
    setBusy(true);
    setError("");
    try {
      const ok = await finalizeToAdminQueue();
      if (!ok) return;
      setPhase("complete");
      if (typeof window !== "undefined") {
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    } catch {
      setError("حدث خطأ أثناء تسليم التقييم. يرجى المحاولة مرة أخرى.");
    } finally {
      setBusy(false);
    }
  }
```

---

## Task 1.4 — Fix `sendVoice()` complete path

**File:** `components/developer-assessment-form.tsx`

**Find:**
```tsx
        if (data.complete) {
          await submitAndFinalizeAssessment(publicId);
          setPhase("complete");
```

**Replace with:**
```tsx
        if (data.complete) {
          const ok = await finalizeToAdminQueue();
          if (ok) setPhase("complete");
```

---

## Task 1.5 — Fix assessment timer finalize (assessment + interview phases)

**File:** `components/developer-assessment-form.tsx`

The timer currently fires finalize during `assessment` phase and uses `void` (fire-and-forget).

**Find:**
```tsx
  useEffect(() => {
    const timer = setInterval(
      () =>
        setRemaining((value) => {
          if (value <= 1) {
            if (phase === "assessment") void save();
            void submitAndFinalizeAssessment(publicId);
            queueMicrotask(() => setPhase("complete"));
            return 0;
          }
          return value - 1;
        }),
      1000
    );
    return () => clearInterval(timer);
  }, [phase, publicId, save]);
```

**Replace with:**
```tsx
  useEffect(() => {
    const timer = setInterval(() => {
      setRemaining((value) => {
        if (value > 1) return value - 1;

        // Timer expired — behavior depends on phase
        if (phase === "assessment") {
          void save();
          // Move to interview; do NOT finalize yet
          queueMicrotask(() => {
            setRounds((prev) =>
              prev.length > 0
                ? prev
                : [
                    {
                      public_id: `int_${Date.now()}`,
                      question_text:
                        "وضح بالتفصيل آلية اختبار كفاءة الكود الذي قمت بكتابته والأساليب البرمجية المتبعة للحفاظ على جودة وأمان النظام؟",
                      response_transcript: null,
                      audio_url: null,
                    },
                  ]
            );
            setPhase("interview");
          });
        } else if (phase === "interview") {
          void finalizeToAdminQueue().then((ok) => {
            if (ok) setPhase("complete");
          });
        }
        return 0;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [phase, publicId, save]);
```

> **Note:** `finalizeToAdminQueue` must be wrapped in `useCallback` if ESLint complains about exhaustive deps — acceptable minimal fix:

```tsx
  const finalizeToAdminQueue = useCallback(async (): Promise<boolean> => {
    const result = await submitAndFinalizeAssessment(publicId);
    if (!result?.ok) {
      setError(result?.error || "تعذر تسليم التقييم للمراجعة. حاول مرة أخرى أو تواصل مع الدعم.");
      return false;
    }
    return true;
  }, [publicId]);
```

Use `useCallback` version instead of plain function from Task 1.2.

---

## Task 1.6 — Harden `finalizeAssessmentSession()` in `lib/assessment-finalize.ts`

### 1.6a — Repair idempotent path

**Find:**
```ts
  // If already locked, do not overwrite evidence
  if (session.evidence_snapshot_hash) {
    return;
  }
```

**Replace with:**
```ts
  // If already locked, ensure queue state is consistent (repair partial failures)
  if (session.evidence_snapshot_hash) {
    if (session.status !== "admin_review") {
      await transaction(async (c) => {
        await c.execute(
          "UPDATE developer_assessment_sessions SET status='admin_review', current_phase='completed', submitted_at=COALESCE(submitted_at,CURRENT_TIMESTAMP) WHERE id=?",
          [sessionId]
        );
        await c.execute("UPDATE developers SET approval_status='admin_review' WHERE id=?", [developerId]);
      });
    }
    return;
  }
```

Also extend the session SELECT at the top to include checking status — the query already selects `status`.

### 1.6b — Resilient admin notification (don't fail finalize if notification schema differs)

**Find** (inside the transaction, the admin notification INSERT):
```ts
    await c.execute(
      "INSERT INTO notifications(user_id, body, link_url) SELECT id, ?, ? FROM users WHERE is_admin=1 AND status='active'",
      [
        `تم قفل حزمة الأدلة لاختبار مطور جديد (${session.public_id}). جاهز للمراجعة في لوحة الإدارة.`,
        `/admin/developers/${session.public_id}/review`
      ]
    );
```

**Replace with:**
```ts
    const notifyBody = `تم قفل حزمة الأدلة لاختبار مطور جديد (${session.public_id}). جاهز للمراجعة في لوحة الإدارة.`;
    const notifyLink = `/admin/developers/${session.public_id}/review`;
    try {
      await c.execute(
        "INSERT INTO notifications(user_id, body, link_url) SELECT id, ?, ? FROM users WHERE is_admin=1 AND status='active'",
        [notifyBody, notifyLink]
      );
    } catch {
      // Fallback if migrate-v13 link_url column missing — still complete the submission
      await c.execute(
        "INSERT INTO notifications(user_id, body) SELECT id, ? FROM users WHERE is_admin=1 AND status='active'",
        [`${notifyBody} — ${notifyLink}`]
      );
    }
```

### 1.6c — Return success/error from `submitAndFinalizeAssessment`

**File:** `lib/actions/developer-assessment.ts`

Wrap finalize in try/catch:

**Find:**
```ts
  await finalizeAssessmentSession(session.id, session.developer_id);
  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  return { ok: true as const };
```

**Replace with:**
```ts
  try {
    await finalizeAssessmentSession(session.id, session.developer_id);
  } catch (err) {
    console.error("[submitAndFinalizeAssessment]", err);
    return { ok: false as const, error: "تعذر إرسال التقييم للمراجعة. يرجى المحاولة مرة أخرى." };
  }
  revalidatePath("/admin");
  revalidatePath("/developer-assessment/pending");
  revalidatePath("/complete-profile");
  revalidatePath("/dashboard");
  revalidatePath(`/admin/developers/${publicId}/review`);
  return { ok: true as const };
```

---

## Task 1.7 — Admin dashboard: show review links even when subquery returns null

**File:** `app/api/admin/users/route.ts`

Broaden `assessment_public_id` subquery to fall back to latest submitted session:

**Find:**
```sql
      (SELECT das.public_id FROM developer_assessment_sessions das WHERE das.developer_id=d.id AND das.status='admin_review' ORDER BY das.id DESC LIMIT 1) assessment_public_id,
```

**Replace with:**
```sql
      (SELECT das.public_id FROM developer_assessment_sessions das
       WHERE das.developer_id=d.id AND das.status IN ('admin_review','approved','rejected')
       ORDER BY FIELD(das.status,'admin_review','approved','rejected'), das.submitted_at DESC, das.id DESC
       LIMIT 1) assessment_public_id,
```

Apply the **same change** in `lib/actions/admin.ts` → `fetchDbUsersForAdmin()` (identical subquery around line 77).

**File:** `app/admin/page.tsx`

**Find:**
```tsx
                    .filter((u) => u.approvalStatus === "admin_review" && u.assessmentPublicId)
```

**Replace with:**
```tsx
                    .filter((u) => u.approvalStatus === "admin_review")
```

For users missing `assessmentPublicId`, link to `/admin?tab=assessments` as fallback:

**Find:**
```tsx
                        href={`/admin/developers/${u.assessmentPublicId}/review`}
```

**Replace with:**
```tsx
                        href={u.assessmentPublicId ? `/admin/developers/${u.assessmentPublicId}/review` : "/admin"}
```

(Or use `onClick` to switch tab — href fallback is sufficient for v1.)

---

## Task 1.8 — Verify DB migration (document in code comment)

Add a one-line comment at top of `lib/assessment-finalize.ts`:

```ts
// Requires notifications.link_url (scripts/migrate-v13.js). Fallback INSERT without link_url if column missing.
```

**Optional operator step** (not code): run `node scripts/migrate-v13.js` on production if notifications lack `link_url`.

---

### Phase 1 acceptance tests

| Step | Action | Expected |
|------|--------|----------|
| 1 | Register new developer, complete profile, start assessment | Session `in_progress` |
| 2 | Finish written questions → enter interview | Session still `in_progress`, **not** `admin_review` |
| 3 | Click "skip interview" | Session `admin_review`, developer `admin_review`, success screen |
| 4 | Open `/admin` as admin | Pending banner + review link visible |
| 5 | Open review page | Evidence snapshot + decision form loads |
| 6 | Simulate finalize failure (temporarily throw in finalize) | Developer sees error, **not** green success |

```bash
npx tsc --noEmit
```

---

# PHASE 2 — Gate SSD AI until developer is approved

## Task 2.1 — Expose approval status in root layout profile

**File:** `app/layout.tsx`

Inside `initialProfile` object, add:

```tsx
    developerApprovalStatus: session?.role === "developer" ? (developer ? await queryOne<{ approval_status: string }>("SELECT approval_status FROM developers WHERE user_id=?", [session.userId]).then(r => r?.approval_status ?? "profile_incomplete") : "profile_incomplete") : null,
```

**Cleaner approach (preferred):** `verifySession()` already returns `developerApprovalStatus`. Use it:

**Find** the `initialProfile` block opening and add after `role:` line:

```tsx
    developerApprovalStatus: session?.developerApprovalStatus ?? null,
```

Ensure `verifySession()` is already called — it is (`const session = await verifySession()`). The field `developerApprovalStatus` already exists on the return type from `lib/dal.ts:45`.

Also gate `showSsdAssistant` for developers:

**Find:**
```tsx
    showSsdAssistant: userAiSetting?.setting_value !== "false",
```

**Replace with:**
```tsx
    showSsdAssistant:
      userAiSetting?.setting_value !== "false" &&
      (session?.role !== "developer" || session?.developerApprovalStatus === "approved"),
```

---

## Task 2.2 — Extend ProfileProvider type + state

**File:** `components/profile-provider.tsx`

1. Add to the initial profile interface (near `showSsdAssistant`):
```tsx
  developerApprovalStatus?: string | null;
```

2. Add to context value / state initialization from `initialProfile.developerApprovalStatus`.

3. Export via `useProfile()`:
```tsx
  developerApprovalStatus: string | null;
```

Default: `null` for non-developers.

---

## Task 2.3 — Gate SSD component (client-side)

**File:** `components/ai-assistant-ssd.tsx`

**Find** the destructuring from `useProfile()` and add `developerApprovalStatus`.

**Find:**
```tsx
  if (userRole === "guest" || !systemSettings.isAiAssistantEnabled || !showSsdAssistant) return null;
```

**Replace with:**
```tsx
  const developerBlocked =
    userRole === "developer" && developerApprovalStatus !== "approved";

  if (userRole === "guest" || developerBlocked || !systemSettings.isAiAssistantEnabled || !showSsdAssistant) return null;
```

Also hide on assessment pages (belt-and-suspenders):

```tsx
  const onAssessmentPage = pathname?.startsWith("/developer-assessment");
  if (onAssessmentPage) return null;
```

(`usePathname` is already imported.)

---

## Task 2.4 — Gate SSD API (server-side, mandatory)

**File:** `app/api/ai/chat/route.ts`

After session check and before quota check, add:

```tsx
  if (s.role === "developer") {
    const dev = await queryOne<{ approval_status: string }>(
      "SELECT approval_status FROM developers WHERE user_id=?",
      [s.userId]
    );
    if (dev?.approval_status !== "approved") {
      return NextResponse.json(
        {
          error: "DEVELOPER_NOT_APPROVED",
          message: "مساعد SSD متاح بعد إكمال التقييم البرمجي واعتماد حسابك من الإدارة.",
        },
        { status: 403 }
      );
    }
  }
```

**File:** `app/api/ai/quota/route.ts` (if exists — gate read endpoint too)

Apply the same check so unapproved developers cannot probe quota.

---

## Task 2.5 — Refresh session JWT on admin approval (recommended)

**File:** `lib/actions/admin.ts` → `decideDeveloperAdmission()`

After successful transaction, if decision is `approved`, refresh the developer's session cookie so `developerApproved: true` in JWT matches DB (helps `proxy.ts` route gate):

```tsx
  if (parsed.data.decision === "approved") {
    const { createSession } = await import("@/lib/session");
    const approvedUser = await queryOne<{ role: AppRole; onboarding_completed_at: Date | null; is_admin: 0 | 1; username: string | null }>(
      "SELECT role, onboarding_completed_at, is_admin, username FROM users WHERE id=?",
      [row.user_id]
    );
    if (approvedUser) {
      await createSession(
        row.user_id,
        approvedUser.role,
        Boolean(approvedUser.onboarding_completed_at),
        Boolean(approvedUser.is_admin),
        true, // developerApproved
        Boolean(approvedUser.username?.trim())
      );
    }
  }
```

Import `AppRole` from `@/lib/types` if needed.

> Developer may need one navigation after approval for layout SSR to show SSD — cookie refresh makes proxy + SSD consistent immediately.

---

### Phase 2 acceptance tests

| Developer state | SSD visible? | POST /api/ai/chat |
|-----------------|-------------|-------------------|
| `profile_incomplete` | No | 403 |
| `assessment_in_progress` | No | 403 |
| `admin_review` (submitted, awaiting admin) | No | 403 |
| `approved` | Yes (if AI enabled) | 200 |
| `rejected` | No | 403 |
| Client | Yes (unchanged) | 200 |
| Admin | Yes (unchanged) | 200 |

Test on `/developer-assessment/[id]` — SSD must not appear during test.

```bash
npx tsc --noEmit
```

---

## Part C — Files Touched (Checklist)

| File | Phase | Changes |
|------|-------|---------|
| `components/developer-assessment-form.tsx` | 1 | Fix finalize timing, error handling, timer |
| `lib/assessment-finalize.ts` | 1 | Repair idempotent path, resilient notifications |
| `lib/actions/developer-assessment.ts` | 1 | try/catch on finalize, extra revalidatePath |
| `app/api/admin/users/route.ts` | 1 | Broader assessment_public_id subquery |
| `lib/actions/admin.ts` | 1 + 2 | Same subquery + session refresh on approve |
| `app/admin/page.tsx` | 1 | Relax filter on review banner links |
| `app/layout.tsx` | 2 | Gate showSsdAssistant by approval |
| `components/profile-provider.tsx` | 2 | developerApprovalStatus in context |
| `components/ai-assistant-ssd.tsx` | 2 | Client gate + hide on assessment pages |
| `app/api/ai/chat/route.ts` | 2 | Server gate 403 |
| `app/api/ai/quota/route.ts` | 2 | Server gate (if file exists) |

---

## Part D — Suggested Commit Messages

```
1. fix(assessment): finalize only after interview; surface submit errors to developer
2. fix(assessment): harden finalize transaction and admin notification fallback
3. fix(admin): show pending developer reviews with resilient assessmentPublicId lookup
4. fix(ai): hide SSD assistant until developer assessment is admin-approved
```

---

## Part E — Gemini Prompt (Copy-Paste)

---

**PROMPT START**

You are implementing two bug fixes in the Scora Next.js repo (`E:\buildtmp\Scora`). Read and follow **`docs/GEMINI_ASSESSMENT_AND_SSD_FIX_PLAN.md`** exactly.

**Problem 1:** Developer assessment submission does not appear on admin dashboard.  
**Problem 2:** SSD AI assistant must not show for developers until they complete assessment AND admin sets `approval_status = 'approved'`.

Implement **Phase 1** then **Phase 2** from the plan. Rules:
- Match find-strings exactly; re-read files if strings drift
- Run `npx tsc --noEmit` after each phase
- Do not touch `packages/*/dist/**`
- Preserve Arabic strings verbatim
- Server-side gate on `/api/ai/chat` is mandatory, not optional

When done, summarize what changed and list manual test steps from the acceptance tables.

**PROMPT END**

---

## Part F — Out of Scope

- Redesigning the assessment UI or interview flow
- Changing trust engine scoring logic
- Admin table layout redesign
- Forcing SSD visibility for rejected developers who request reassessment (they stay blocked until `approved`)

---

*Plan generated from static analysis of Scora V0.1 on 2026-08-16.*
