# Scora — Backend Build Plan (MVP)

> **Stack:** Node 20 + TypeScript + Express + PostgreSQL 16 + Prisma + Redis + BullMQ + Judge0 (self-hosted) + Claude API
> **Team:** 2 devs · Dev A = Backend/Infra · Dev B = Frontend
> **Context:** مشروع مسابقة — الأولوية إثبات الـCore Loop كامل end-to-end، مش تغطية كل feature.

---

## 0. Shared Foundation (الاتنين سوا، أول يومين)

### 0.1 Monorepo

pnpm workspaces + Turborepo. السبب: فريق من ٢، ولازم الـtypes تكون مشتركة بين الباك والفرونت من غير drift.

```
scora/
├── apps/
│   ├── api/                 # Express + workers
│   └── web/                 # Next.js
├── packages/
│   ├── contracts/           # ⭐ Zod schemas + inferred types + enums
│   ├── ui/                  # Design-system components
│   └── config/              # eslint, tsconfig, tailwind preset (tokens)
├── infra/judge0/            # docker-compose + judge0.conf
├── docker-compose.yml       # postgres + redis + api + worker + web
└── turbo.json
```

### 0.2 `packages/contracts` — أهم قرار في المشروع

كل request/response بيتعرّف مرة واحدة كـZod schema، والاتنين بيستوردوا منه.

```ts
// packages/contracts/src/assessment.ts
export const SubmitSolutionBody = z.object({
  sourceCode: z.string().min(1).max(100_000),
  language: LanguageEnum,
});
export type SubmitSolutionBody = z.infer<typeof SubmitSolutionBody>;

export const AssessmentStatusResponse = z.object({
  assessmentId: z.string().uuid(),
  status: AssessmentStatusEnum,
  stage: z.enum(['QUEUED','RUNNING_TESTS','ANALYZING_CODE','SCORING_TRUST','DONE']).nullable(),
  result: EvaluationResult.nullable(),
});
```

**القاعدة:** الباك يستخدمه في validation middleware، والفرونت في الـAPI client + الـforms (`zodResolver`). لو حد غيّر shape، الـTypeScript يكسر عند التاني فورًا. ده بيوفّر أسابيع debugging على الـintegration.

### 0.3 ليه NestJS مش مطلوب هنا

Scora فيها ١٥+ module متداخلة، وده عادةً بيبرّر NestJS. بس مع فريق ٢ وضغط وقت، Express بـconvention صارمة أسرع. الشرط: **كل module يمشي على نفس الـ4-layer pattern** بدون استثناء:

```
modules/<name>/
├── <name>.routes.ts      # express Router + middleware chain فقط
├── <name>.controller.ts  # req→dto، call service، res. صفر منطق
├── <name>.service.ts     # كل الـbusiness logic. مايعرفش عن req/res
└── <name>.repo.ts        # كل استعلامات Prisma. مافيش prisma بره الملف ده
```

الملف اللي يخرق ده، الـPR مايتمرجش. ده بيديك ٩٠٪ من فايدة NestJS بصفر boilerplate.

### 0.4 Module map للـMVP

```
auth · users · developers · skills · challenges
assessments · execution · evaluation · trust · skillpoints
passport · discovery · contact · notifications · admin
```

**اتشال بوعي:** ai-challenges · interviews · human-review UI · company-dashboard · payments · marketplace.

---

## 1. Data Model (Prisma)

٢٠ table. دي أهم artifact — ابنوها الأول قبل أي endpoint.

### 1.1 Identity

```prisma
model User {
  id              String   @id @default(uuid())
  email           String   @unique
  passwordHash    String
  role            Role     // DEVELOPER | CLIENT | COMPANY | ADMIN
  emailVerifiedAt DateTime?
  createdAt       DateTime @default(now())

  developer DeveloperProfile?
  client    ClientProfile?
  company   CompanyProfile?
  tokens    RefreshToken[]
}

model RefreshToken {
  id        String   @id @default(uuid())
  userId    String
  tokenHash String   @unique     // نخزن hash مش الـtoken
  deviceId  String?
  expiresAt DateTime
  revokedAt DateTime?
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  @@index([userId, revokedAt])
}
```

### 1.2 Developer Profile

```prisma
model DeveloperProfile {
  id           String @id @default(uuid())
  userId       String @unique
  displayName  String
  headline     String?              // "Full-stack developer"
  bio          String? @db.Text
  avatarUrl    String?
  country      String?
  city         String?
  availability Availability @default(NOT_AVAILABLE)
  hourlyRateMin Int?
  hourlyRateMax Int?
  githubUrl    String?
  linkedinUrl  String?
  portfolioUrl String?

  // ⭐ denormalized aggregates — تتحدّث في tx مع الـledger
  trustScore         Int @default(50)   // يبدأ محيّد مش 100
  totalSp            Int @default(0)
  verifiedSkillCount Int @default(0)
  assessmentCount    Int @default(0)

  passportSlug        String  @unique   // scora.dev/p/<slug>
  passportVisibility  Visibility @default(PRIVATE)
  passportPublishedAt DateTime?

  user        User @relation(fields: [userId], references: [id], onDelete: Cascade)
  skills      DeveloperSkill[]
  assessments Assessment[]
  @@index([trustScore, totalSp])        // للـdiscovery sorting
}
```

`ClientProfile` / `CompanyProfile`: بسيطة — `companyName, website, size, logoUrl, verifiedAt`.

### 1.3 Skills

```prisma
model Skill {
  id       String @id @default(uuid())
  slug     String @unique      // "react", "nodejs", "postgresql"
  name     String              // "React"
  nameAr   String              // "رياكت"
  category SkillCategory       // LANGUAGE | FRAMEWORK | DATABASE | TOOL
  iconKey  String?
}

model DeveloperSkill {
  id              String @id @default(uuid())
  developerId     String
  skillId         String
  claimedLevel    ClaimedLevel?    // ادّعاء المطور — claim مش proof
  sp              Int @default(0)
  level           SkillLevel @default(BEGINNER)   // مشتقّة من sp
  verifiedAt      DateTime?        // ← الـVerified badge
  submissionCount Int @default(0)
  lastActivityAt  DateTime?

  developer DeveloperProfile @relation(fields: [developerId], references: [id], onDelete: Cascade)
  skill     Skill @relation(fields: [skillId], references: [id])
  @@unique([developerId, skillId])
  @@index([skillId, sp])           // "React devs sorted by SP"
}
```

**فرق جوهري:** `claimedLevel` = ادّعاء (يظهر رمادي في الـUI). `sp` + `verifiedAt` = دليل. ده لبّ الـproduct — لازم يبان في الـschema نفسه.

### 1.4 Challenges & Execution

```prisma
model Challenge {
  id               String @id @default(uuid())
  slug             String @unique
  title            String
  titleAr          String
  promptMd         String @db.Text          // Markdown
  skillId          String
  difficulty       Difficulty                // EASY | INTERMEDIATE | ADVANCED
  durationMinutes  Int @default(45)
  taskCount        Int @default(1)
  allowedLanguages Language[]
  starterCode      Json                      // { "JAVASCRIPT": "function solve(){}" }
  harnessTemplate  Json                      // ⭐ { "JAVASCRIPT": "...{{USER_CODE}}...runner" }
  status           ContentStatus @default(DRAFT)
  version          Int @default(1)

  testCases   TestCase[]
  assessments Assessment[]
  @@index([skillId, difficulty, status])
}

model TestCase {
  id          String @id @default(uuid())
  challengeId String
  ordinal     Int
  name        String                  // "handles empty array"
  input       Json
  expected    Json
  isHidden    Boolean @default(false) // visible في Run، الكل في Submit
  weight      Float   @default(1)
  timeoutMs   Int     @default(2000)
  @@unique([challengeId, ordinal])
}

model Assessment {                    // = محاولة واحدة
  id          String @id @default(uuid())
  developerId String
  challengeId String
  language    Language
  status      AssessmentStatus @default(IN_PROGRESS)
  stage       PipelineStage?          // للـprogress UI

  startedAt   DateTime @default(now())
  expiresAt   DateTime                // server-side فقط
  submittedAt DateTime?
  completedAt DateTime?

  finalScore  Int?
  spAwarded   Int?
  trustBand   TrustBand?

  submissions Submission[]
  snapshots   CodeSnapshot[]
  trustEvents TrustEvent[]
  evaluation  Evaluation?
  @@index([developerId, status])
}

model CodeSnapshot {                  // autosave كل 20s — أساس تحليل code evolution
  id           String @id @default(uuid())
  assessmentId String
  sourceCode   String @db.Text
  charCount    Int
  createdAt    DateTime @default(now())
  @@index([assessmentId, createdAt])
}

model Submission {
  id           String @id @default(uuid())
  assessmentId String
  attemptNo    Int
  sourceCode   String @db.Text
  language     Language
  isFinal      Boolean @default(false)
  createdAt    DateTime @default(now())

  execution   ExecutionJob?
  testResults TestResult[]
  @@unique([assessmentId, attemptNo])
}

model ExecutionJob {
  id            String @id @default(uuid())
  submissionId  String @unique
  provider      String                // "judge0" | "mock"
  externalToken String?               // Judge0 token
  status        ExecStatus
  stdout        String? @db.Text
  stderr        String? @db.Text
  compileOutput String? @db.Text
  exitCode      Int?
  timeMs        Int?
  memoryKb      Int?
  rawResponse   Json?                 // للـdebugging — ماتشيلوهش
  startedAt     DateTime?
  finishedAt    DateTime?
}

model TestResult {
  id           String @id @default(uuid())
  submissionId String
  testCaseId   String
  passed       Boolean
  actualOutput String? @db.Text
  timeMs       Int?
  errorMessage String?
  @@unique([submissionId, testCaseId])
}
```

### 1.5 Evaluation

```prisma
model Evaluation {
  id           String @id @default(uuid())
  assessmentId String @unique

  // الأبعاد الخمسة من الـDesign System
  correctnessScore     Int      // deterministic — من TestResult
  codeQualityScore     Int      // LLM
  maintainabilityScore Int      // LLM
  securityScore        Int      // LLM
  performanceScore     Int      // deterministic percentile + LLM notes
  finalScore           Int      // weighted blend

  strengths    Json            // [{ title, evidence }]
  improvements Json

  // LLM audit trail — ضروري للـreproducibility
  llmModel      String?
  promptVersion String?
  llmRawJson    Json?
  tokensIn      Int?
  tokensOut     Int?
  costUsd       Decimal? @db.Decimal(10,6)

  // Human review (الـfields موجودة، الـUI في Phase 2)
  humanReviewStatus ReviewStatus @default(NOT_REQUIRED)
  reviewedBy        String?
  reviewedAt        DateTime?
  reviewerNotes     String? @db.Text
}
```

### 1.6 Trust Engine

```prisma
model TrustEvent {                    // append-only، حجم كبير
  id              String @id @default(uuid())
  assessmentId    String
  developerId     String
  type            TrustEventType      // PASTE | FOCUS | BLUR | KEYSTROKE_BATCH | RUN | SUBMIT | LARGE_INSERT
  payload         Json                // { charCount, deltaSize, durationMs }
  clientTimestamp DateTime            // ساعة الـclient (ممكن يتلاعب فيها)
  sequence        Int                 // gaps = tampering signal
  receivedAt      DateTime @default(now())
  @@index([assessmentId, sequence])
}

model TrustSignal {                   // النتيجة المحسوبة — explainable
  id           String @id @default(uuid())
  assessmentId String
  key          String   // "paste_ratio" | "largest_single_insert" | ...
  value        Float
  weight       Float
  contribution Float
  @@unique([assessmentId, key])
}

model TrustScoreHistory {
  id           String @id @default(uuid())
  developerId  String
  assessmentId String?
  scoreBefore  Int
  scoreAfter   Int
  delta        Int
  reason       String              // "assessment_completed" | "manual_review" | "recompute"
  createdAt    DateTime @default(now())
  @@index([developerId, createdAt])
}
```

### 1.7 Skill Points — **Ledger, not counter**

```prisma
model SkillPointLedger {
  id           String @id @default(uuid())
  developerId  String
  skillId      String
  delta        Int
  balanceAfter Int
  reason       String              // "assessment" | "verification_bonus" | "correction"
  assessmentId String?
  breakdown    Json                // { base, qualityMult, trustFactor, diminishing }
  createdAt    DateTime @default(now())
  @@unique([assessmentId, skillId, reason])   // ← retry-safe
  @@index([developerId, skillId, createdAt])
}
```

**ليه ledger؟** لو زوّدت `DeveloperSkill.sp` بـUPDATE مباشر، ماتعرفش تجاوب على "ليه عندي 780 SP؟" ولا تعرف تعيد الحساب لو غيّرت الـformula. الـledger بيحل الاتنين، وبيخليك تعرض breakdown في الـUI — وده feature بيبيع.

`DeveloperSkill.sp` = cache للـ`SUM(delta)`، بيتحدّث في نفس الـtransaction.

### 1.8 باقي الـtables

`PassportView` (slug, viewerUserId?, ipHash, referer, createdAt) · `ContactRequest` (fromUserId, toDeveloperId, message, status) · `SavedDeveloper` · `Notification` · `AuditLog`.

---

## 2. Code Execution — Judge0 Self-Hosted

### 2.1 ⚠️ أكبر مخاطرة تقنية — اقروا ده الأول

Judge0 محتاج **cgroup v1**. على Ubuntu 22.04+ الافتراضي v2، فلازم:

```bash
# /etc/default/grub
GRUB_CMDLINE_LINUX="systemd.unified_cgroup_hierarchy=0"
sudo update-grub && sudo reboot
```

وإنتوا على **Windows 11**. يعني Judge0 مش هيشتغل على الـdev machine بسهولة (محتاج WSL2 بـkernel tweaks، وحتى كده fragile).

**الحل — provider abstraction من أول يوم:**

```ts
// modules/execution/runner.port.ts
export interface CodeRunner {
  run(input: { source: string; language: Language; stdin: string; timeoutMs: number })
    : Promise<{ stdout: string; stderr: string; exitCode: number; timeMs: number; memoryKb: number }>;
}
```

| Provider | متى | ملاحظة |
|---|---|---|
| `MockRunner` | dev على Windows | ينفّذ JS بـ`node:vm` في child process معزول. يشتغل فورًا. |
| `Judge0Runner` | staging + demo | Docker Compose على Linux VPS (Hetzner CX22 ~€4/شهر) |

`EXECUTION_PROVIDER=mock|judge0` في الـenv. **ابنوا MockRunner في Sprint 2 والـJudge0 في Sprint 3.** كده الـpipeline كلها تشتغل بدري، والـJudge0 يبقى swap لملف واحد مش blocker.

### 2.2 One submission = one Judge0 call

الغلطة الشائعة: submission لكل test case → ١٠ calls، الـqueue تتخم، latency عالي.

**الصح:** الـharness يلف على كل الـtest cases جوه process واحد ويطبع JSON summary.

```
harnessTemplate["JAVASCRIPT"] =
  "{{USER_CODE}}\n" +
  "const __tests = JSON.parse(require('fs').readFileSync(0,'utf8'));\n" +
  "const __out = __tests.map(t => {\n" +
  "  const t0 = process.hrtime.bigint();\n" +
  "  try { const r = solve(...t.args);\n" +
  "        return {id:t.id, ok:true, value:r, ns:Number(process.hrtime.bigint()-t0)}; }\n" +
  "  catch(e) { return {id:t.id, ok:false, error:String(e && e.message)}; }\n" +
  "});\n" +
  "console.log('__SCORA__' + JSON.stringify(__out));"
```

الـtest cases تتبعت كـstdin JSON. الباك يقرأ السطر بعد `__SCORA__` ويقارن بالـexpected. call واحد، نتيجة كل الـtests.

### 2.3 Judge0 config

```ini
# infra/judge0/judge0.conf
ALLOW_ENABLE_NETWORK=false        # ← أهم سطر. مافيش network للكود
MAX_CPU_TIME_LIMIT=10
MAX_WALL_TIME_LIMIT=15
MAX_MEMORY_LIMIT=256000
MAX_PROCESSES_AND_OR_THREADS=60
ENABLE_ADDITIONAL_FILES=false
AUTHN_HEADER=X-Auth-Token
AUTHN_TOKEN=<random-32-bytes>     # مايوصلش للفرونت أبدًا
```

الـflow: `POST /submissions?base64_encoded=true&wait=false` + `callback_url` → Judge0 يعمل POST على `/internal/judge0/callback` (نفس الـdocker network، محمي بـHMAC). Polling fallback كل 1s بحد أقصى 30s لو الـcallback ماوصلش.

Language IDs (63=Node, 71=Python3, 62=Java, 54=C++, 82=SQLite): **ماتـhardcode-وهمش.** اعملوا `GET /languages` عند الـboot وcache الـmap في Redis. الأرقام بتتغير بين versions.

### 2.4 ⚠️ قيد تصميمي لازم تقبلوه

Judge0 = ملف واحد، stdin/stdout. **مش بيقدر يشغّل React app ولا Express server.**

الـDesign System فيه `Challenge Card` بعنوان "Build a secure API" — ده **مش قابل للتنفيذ على Judge0**.

**قرار الـMVP:**
- كل الـchallenges = function-level (logic, algorithms, data transforms, SQL)
- مهارات الـframeworks (React/Node) تتقاس بـ: JS/TS challenges متقدمة + **code-review challenges** (نديه كود مكسور، يصلّحه) + MCQ conceptual
- الـfull-project sandboxes → Phase 2 بـ**E2B** أو **StackBlitz WebContainers**

كونوا صريحين في ده مع اللجنة. "بنقيس القدرة الهندسية على مستوى الدالة في الـMVP، والـproject-level في الـroadmap" أقوى بكتير من demo مكسور.

---

## 3. Evaluation Engine

### 3.1 التقسيم

| البعد | المصدر | الطريقة |
|---|---|---|
| **Correctness** | Deterministic | `Σ(weight × passed) / Σ(weight) × 100` |
| **Performance** | Deterministic | percentile مقابل الـsubmissions الناجحة على نفس الـchallenge (fallback: نسبة من timeout) |
| **Code Quality** | LLM + static | ESLint programmatic API للـJS/TS → النتايج تتحقن في الـprompt كـevidence |
| **Maintainability** | LLM | naming, structure, duplication, cognitive load |
| **Security** | LLM | injection, unvalidated input, unsafe eval, secrets |

**ليه LLM أصلاً؟** الأدوات الساكنة بتقيس proxies (طول الدالة، complexity) مش جودة فعلية. والـLLM بيقدر يقول *ليه* — والـ"ليه" هو الـproduct. بس **مايشوفش الـcorrectness** — Judge0 بيقولها. ماتخلّوا الـLLM يحكم على الصح والغلط.

### 3.2 ⚠️ تصحيح: `temperature: 0` مرفوض

**`temperature: 0` بيرجع HTTP 400 على Claude Opus 4.8/4.7.** الـsampling parameters (`temperature`, `top_p`, `top_k`) اتشالت من الـmodels دي. على Sonnet 4.6 لسه مقبولة، بس مش هي الـlever الصح.

**الـdeterminism بييجي من ٤ حاجات تانية:**

1. **`output_config.format` بـJSON Schema** — يفرض الـshape، مش احتمال
2. **rubric ثابت byte-for-byte** في الـsystem prompt (+ prompt caching)
3. **Few-shot anchors** — ٢-٣ أمثلة محلولة بدرجاتها. **ده أقوى مثبّت للـscale من أي parameter**
4. **`output_config.effort: 'medium'`** — ثبات وتكلفة أفضل من `high` للـjudge

```ts
const EvaluationSchema = {
  type: 'object',
  additionalProperties: false,
  required: ['codeQuality','maintainability','security','performanceNotes','strengths','improvements'],
  properties: {
    codeQuality:     { type: 'object', additionalProperties: false,
                       required: ['score','reasoning'],
                       properties: { score: { type: 'integer' }, reasoning: { type: 'string' } } },
    maintainability: { /* نفس الشكل */ },
    security:        { /* نفس الشكل */ },
    performanceNotes:{ type: 'string' },
    strengths:       { type: 'array', items: { type: 'object', additionalProperties: false,
                        required: ['title','evidence'],
                        properties: { title: {type:'string'}, evidence: {type:'string'} } } },
    improvements:    { /* نفس الشكل */ },
  },
};

const res = await anthropic.messages.create({
  model: 'claude-opus-4-8',
  max_tokens: 4000,
  output_config: { format: { type: 'json_schema', schema: EvaluationSchema }, effort: 'medium' },
  system: [{ type: 'text', text: RUBRIC_V1, cache_control: { type: 'ephemeral', ttl: '1h' } }],
  messages: [{ role: 'user', content: buildSubmissionContext(submission, testResults, lintFindings) }],
  // ⛔ لا temperature — لا top_p — لا budget_tokens
});
```

**قيد في الـJSON Schema:** `minimum`/`maximum` **مش مدعومين**. مش هتقدر تفرض `score: 0..100` في الـschema — الـSDK بيشيلهم ويتحقق client-side. فاعملوا clamp بـZod بعد الـparse:

```ts
const parsed = EvaluationZod.parse(JSON.parse(text));   // z.number().int().min(0).max(100)
```

### 3.3 اختيار الـModel + التكلفة الفعلية

| Model | ID | $/1M in | $/1M out | تكلفة تقييم واحد* |
|---|---|---|---|---|
| Opus 4.8 | `claude-opus-4-8` | $5 | $25 | **~$0.027** |
| Sonnet 4.6 | `claude-sonnet-4-6` | $3 | $15 | **~$0.016** |
| Haiku 4.5 | `claude-haiku-4-5` | $1 | $5 | **~$0.0055** |

\* rubric 2.5k مـcached + submission 1.2k + output 800.

**التوصية:** `claude-opus-4-8` كـdefault. ٥٠٠ تقييم في الـdemo = **$13 تقريبًا**. ده مش سبب تنزل tier — جودة الـreasoning هي اللي هتبان للجنة، لأن الـ"ليه" هو الـproduct. لو عايزين توفير: Haiku 4.5 للـre-scoring/backfill offline بس.

**⚠️ فخ prompt caching:** أقل prefix قابل للـcaching = **4096 token على Opus 4.8 و Haiku 4.5** (2048 على Sonnet 4.6). لو الـrubric 2500 token، **مش هيتـcache على Opus** — و`cache_read_input_tokens` هيرجع صفر **بدون أي error**. الحل: خلّوا `RUBRIC_V1` + الـfew-shot anchors فوق 4096 token. الـanchors محتاجينها أصلاً للـconsistency — فده يخدم الغرضين.

راقبوا `usage.cache_read_input_tokens` في اللوج. صفر بعد أول request → في invalidator (تاريخ، UUID، ترتيب JSON غير ثابت في الـsystem prompt).

**توفير إضافي:** الـre-evaluation والـbackfill عبر **Message Batches API** = خصم ٥٠٪.

### 3.4 الـFinal Score

```ts
const WEIGHTS = { correctness: .40, codeQuality: .22, maintainability: .16, security: .12, performance: .10 };
```

يديك ~88 على مثال الـDesign System (92/84/81/90/88) — مطابق للمقصود. خلّوها في `config/scoring.ts` مش hardcoded، وخزّنوا `promptVersion` + weights version في `Evaluation` عشان تفسّروا درجات قديمة.

---

## 4. Trust Engine

### 4.1 المبدأ (من الـDesign System)

> Signal واحد ≠ غش. Signals متعددة → risk → أثر على الـtrust.

الـoutput مش boolean. تلات bands: `HIGH_CONFIDENCE` / `NEEDS_REVIEW` / `LOW_CONFIDENCE`. **ماتكتبوا كلمة "cheater" في أي مكان** — لا في الكود، لا في الـDB، لا في الـUI. الـframing هو الـproduct.

### 4.2 الـSignals (MVP — ٧ كفاية)

| Signal | الحساب | الوزن |
|---|---|---|
| `paste_ratio` | pasted chars ÷ final chars | 0.25 |
| `largest_single_insert` | أكبر إضافة في snapshot واحد ÷ الحجم النهائي | 0.20 |
| `blur_ratio` | وقت خارج التاب ÷ الوقت الكلي | 0.15 |
| `typing_burstiness` | معامل تغيّر سرعة الكتابة | 0.15 |
| `code_evolution_entropy` | تشابه متتالي بين snapshots (كود ظهر كامل مرة واحدة = مريب) | 0.10 |
| `time_z_score` | مقابل median الـchallenge دي | 0.10 |
| `sequence_integrity` | فجوات في `TrustEvent.sequence` = تلاعب client-side | 0.05 |

```ts
riskScore = Σ (normalize(signal.value) × signal.weight)   // 0..1

band = riskScore < 0.35 ? 'HIGH_CONFIDENCE'
     : riskScore < 0.65 ? 'NEEDS_REVIEW'
     :                    'LOW_CONFIDENCE';

trustDelta = round((0.5 - riskScore) * 12);   // ±6 لكل تقييم
newTrust  = clamp(trust + trustDelta, 0, 100);
```

**قاعدتين حاسمتين:**
1. **الـsignals الخام تُخزّن دايمًا** (`TrustEvent`). الـformula هتتغير ١٠ مرات — والـraw events بتخليك تعيد الحساب بأثر رجعي (`recompute-trust` worker).
2. **مافيش قرار من تقييم واحد.** Trust يتحرك تدريجيًا. مطور معاه assessment واحد trust بتاعه 50 (محيّد) مش 95.

### 4.3 التقاط الـTelemetry

الفرونت يجمع local ويـflush كل 5s + على `visibilitychange` + على `beforeunload` بـ`navigator.sendBeacon`.

```
POST /assessments/:id/telemetry   { events: TrustEventInput[] }
```

Rate limit: 20 req/min لكل assessment، max 500 event في الـbatch. **الـserver مايثقش في `clientTimestamp`** — يخزنه كـsignal (فرقه عن `receivedAt` مؤشر في حد ذاته) ويستخدم `receivedAt` للحسابات الزمنية.

---

## 5. Skill Points Formula

```ts
const BASE = { EASY: 40, INTERMEDIATE: 90, ADVANCED: 160 };

function computeSp({ difficulty, finalScore, trustScore, currentSp }) {
  const base        = BASE[difficulty];
  const quality     = Math.pow(finalScore / 100, 1.5);    // 60% → .46 · 90% → .85
  const trustFactor = clamp(trustScore / 100, 0.5, 1.0);  // trust واطي يخفّف، مايصفّرش
  const diminishing = 1 / (1 + currentSp / 1200);         // 0 SP → 1.0 · 800 SP → .60

  return Math.max(1, Math.round(base * quality * trustFactor * diminishing));
}
```

**Levels** (من الـDesign System): `0–299 Beginner · 300–599 Intermediate · 600–799 Advanced · 800+ Expert`

**شرط الـVerified badge** — لازم يكون صعب، وإلا الـbadge بلا معنى:

```ts
verified = sp >= 600
        && submissionCount >= 2
        && hasAtLeastOne(difficulty >= INTERMEDIATE)
        && trustScore >= 70
        && bestFinalScore >= 75;
```

كل حساب يكتب صف في `SkillPointLedger` بـ`breakdown` كامل، جوه نفس الـtransaction اللي بيحدّث `DeveloperSkill.sp` و`DeveloperProfile.totalSp`.

---

## 6. الـPipeline غير المتزامنة

```
POST /assessments/:id/submit
  ├─ tx: Submission(isFinal) + status=EVALUATING + stage=QUEUED
  ├─ enqueue execute-submission  { jobId: submissionId }   ← jobId = dedupe مجاني
  └─ 202 { assessmentId, status: 'EVALUATING' }

[execute worker]        stage=RUNNING_TESTS
  build harness → runner.run() → parse __SCORA__ → TestResult[] → ExecutionJob
  └─ enqueue evaluate-submission

[evaluate worker]       stage=ANALYZING_CODE
  deterministic (correctness, performance percentile, ESLint)
  + LLM judge (cached rubric → json_schema)
  → aggregate → Evaluation
  └─ enqueue finalize-assessment

[finalize worker]       stage=SCORING_TRUST
  tx: TrustSignal[] + TrustScoreHistory + SkillPointLedger
      + DeveloperSkill/Profile aggregates + verification check
      + Assessment{status: COMPLETED, stage: DONE, finalScore, spAwarded, trustBand}
  → Notification
```

### 6.1 الأمان في التنفيذ

| المشكلة | الحل |
|---|---|
| Submit مرتين | Partial unique index: `WHERE is_final = true` على `assessmentId` |
| Retry بيدوبل الـSP | `@@unique([assessmentId, skillId, reason])` على الـledger |
| Timer manipulation | `expiresAt` يتحسب ويتحقق **server-side فقط**. الفرونت timer عرض بس. |
| LLM بيفشل / JSON مكسور | 3 retries بـexponential backoff → fallback: درجات deterministic بس + `humanReviewStatus=REQUIRED` + الـUI يقول "التقييم النوعي قيد المراجعة". **الـassessment مايفضلش عالق أبدًا.** |
| Worker مات في النص | BullMQ `stalledInterval` + jobs idempotent (كل worker يتحقق من الـstage قبل الشغل) |
| Judge0 نايم | Circuit breaker → الـjob يقعد `WAITING_EXECUTOR` ويكمّل لما يرجع |

### 6.2 الـQueues

```ts
execute-submission   { attempts: 3, backoff: exponential 2s,  timeout: 60s  }
evaluate-submission  { attempts: 3, backoff: exponential 5s,  timeout: 180s }
finalize-assessment  { attempts: 5, backoff: exponential 1s }
recompute-trust      { repeat: nightly }        // بعد أي تغيير في الـformula
expire-assessments   { repeat: every 1 min }    // IN_PROGRESS + expiresAt < now → EXPIRED
```

الـworkers في process منفصل (`apps/api/src/queues/worker.ts`) مش جوه الـHTTP server. Container مستقل في الـcompose.

---

## 7. API Surface (MVP)

```
── Auth ────────────────────────────────────────────────
POST   /auth/register                 { email, password, role }
POST   /auth/login                    → { accessToken(15m), refreshToken(httpOnly cookie) }
POST   /auth/refresh                   rotating refresh tokens
POST   /auth/logout
POST   /auth/verify-email

── Developer ───────────────────────────────────────────
GET    /me
PATCH  /me/developer
POST   /me/developer/skills           { skillId, claimedLevel }
DELETE /me/developer/skills/:id
PATCH  /me/developer/passport         { visibility, slug }

── Catalog ─────────────────────────────────────────────
GET    /skills
GET    /challenges?skill=&difficulty=&page=
GET    /challenges/:slug              (بدون hidden tests ولا الـharness)

── Assessment (الـCore Loop) ───────────────────────────
POST   /assessments                   { challengeId, language } → { id, expiresAt, starterCode, visibleTests }
GET    /assessments/:id               (owner فقط)
PUT    /assessments/:id/snapshot      { sourceCode }              autosave
POST   /assessments/:id/run           { sourceCode } → visible tests، sync (wait ≤10s)
POST   /assessments/:id/submit        { sourceCode } → 202
POST   /assessments/:id/telemetry     { events[] }
GET    /assessments/:id/status        → { status, stage, result? }   ← الفرونت بيـpoll ده
GET    /me/assessments?status=

── Passport ────────────────────────────────────────────
GET    /passport/:slug                عام، بدون auth، cached
GET    /me/passport                   preview + private data

── Discovery ───────────────────────────────────────────
GET    /developers?skills=react,node&minTrust=85&minSp=600&verified=true&availability=&page=
GET    /developers/:slug
POST   /developers/:id/contact        (CLIENT/COMPANY فقط)
POST   /developers/:id/save

── Internal ────────────────────────────────────────────
POST   /internal/judge0/callback      HMAC-signed، مش public
GET    /health  ·  GET /ready         DB + Redis + Judge0 reachability
```

**قواعد ثابتة:** كل الـresponses `{ data }` أو `{ error: { code, message, details? } }`. Cursor pagination للـlists. `X-Request-Id` في كل response ومربوط باللوج. OpenAPI متولّد من الـZod schemas بـ`zod-to-openapi` — مجاني لأن الـschemas موجودة أصلاً.

---

## 8. Cross-Cutting

**Auth:** JWT access (15m، في الـmemory على الـclient) + rotating refresh (httpOnly, Secure, SameSite=Lax cookie). Argon2id للـpasswords. Refresh reuse detection → إبطال كل tokens الـuser.

**Validation:** middleware واحد `validate({ body?, query?, params? })` من `packages/contracts`. **صفر manual parsing في الـcontrollers.**

**Rate limits (Redis):** login 5/15min per IP+email · register 3/hour per IP · run 10/min per assessment · submit 5/hour per developer · telemetry 20/min · public passport 60/min per IP.

**Errors:** `AppError` class بـ`code` + `httpStatus`. `errorHandler` واحد في الآخر. Prisma errors تتحوّل (P2002 → 409 CONFLICT). **الـstack traces ماتخرجش في production.**

**Logging:** Pino JSON + `requestId` + `userId`. Redact: `password`, `sourceCode`, `authorization`, `AUTHN_TOKEN`. اللوج بيتقرأ ساعة الـdemo — خلّوه نضيف.

**Security أساسي:** helmet · CORS allowlist · body limit 200kb (`sourceCode` 100k) · **صفر `eval` على كود المستخدم في الـAPI process** — دايمًا يعدّي على الـrunner · Judge0 token مايخرجش للفرونت خالص.

**Testing (براجماتي للمسابقة):** Vitest unit للـformulas (`computeSp`, `trustSignals`, `aggregateScore`) — دي الأجزاء اللي غلطها بيخرب النتيجة كلها. Supertest integration للـhappy path بتاع الـcore loop. Testcontainers للـPostgres. **مش هدف تغطية ٨٠٪** — غطّوا الـformulas والـpipeline.

---

## 9. Environment & Deploy

```env
NODE_ENV · PORT · DATABASE_URL · REDIS_URL
JWT_ACCESS_SECRET · JWT_REFRESH_SECRET · ARGON2_MEMORY
EXECUTION_PROVIDER=mock|judge0
JUDGE0_URL · JUDGE0_AUTH_TOKEN · JUDGE0_CALLBACK_SECRET
ANTHROPIC_API_KEY · LLM_JUDGE_MODEL=claude-opus-4-8 · LLM_JUDGE_MODE=live|stub
SCORING_WEIGHTS_VERSION · TRUST_WEIGHTS_VERSION
WEB_ORIGIN · PUBLIC_API_URL
```

كله يتـvalidate بـZod عند الـboot. **الـprocess يموت لو حاجة ناقصة** — مايشتغلش بـdefaults صامتة.

**Deploy للمسابقة:** VPS واحد (Hetzner CX22، €4/شهر) + Docker Compose + Caddy للـTLS التلقائي. Postgres في container مع volume + `pg_dump` cron كل ساعة. الـJudge0 stack على نفس السيرفر (Ubuntu 22.04 + cgroup v1 flag). Kubernetes = وقت مهدور هنا.

---

## 10. Backend Sprint Track (٥ أسابيع)

| Sprint | Backend (Dev A) | 🔗 Sync Point |
|---|---|---|
| **W0** (2-3 أيام) | Monorepo · Docker Compose · Prisma schema كامل + migrate · `contracts` skeleton · health endpoints · CI | 🔗 **الاتنين يكتبوا `contracts` سوا — أهم حاجة في الأسبوع** |
| **W1** | Auth كامل · Developer profile + skills CRUD · Skills seed (20) · Challenge/TestCase + seed script (6 challenges) | 🔗 يوم 3: Auth endpoints جاهزة → Dev B يربط |
| **W2** | Assessment lifecycle (start/snapshot/run/submit/status) · **MockRunner** · harness builder · TestResult parsing · BullMQ + الـ3 workers · deterministic scoring | 🔗 يوم 4: **الـcore loop شغّال بالـmock** → Dev B يربط الـeditor. **أهم milestone.** |
| **W3** | LLM judge (rubric v1 + anchors >4096 tok + json_schema + caching + fallback) · Trust Engine (7 signals) · SP ledger + verification · **Judge0 على الـVPS** | 🔗 يوم 2: `EvaluationResult` shape نهائي → Dev B يبني الـresult screen |
| **W4** | Passport read model + caching · Discovery search + filters + indexes · Contact requests · Rate limits · OpenAPI · seed data واقعي (12 مطور كاملين) | 🔗 يوم 3: Discovery + Passport APIs → Dev B |
| **W5** | تثبيت · load test على الـsubmit pipeline · demo script · backups · **Demo Safety Mode** | 🔗 rehearsal كامل مرتين |

### ⭐ Demo Safety Mode — ابنوه في W2 مش W5

```env
EXECUTION_PROVIDER=mock      # لو Judge0 وقع
LLM_JUDGE_MODE=stub          # لو الـAPI فيه مشكلة أو النت ضعيف
```

`stub` يرجع evaluation ثابت واقعي في 200ms. **مسابقات كتير بتضيع بسبب الويفي.** خلّوا الـdemo يشتغل offline بالكامل، وقولوا للجنة إن الـlive mode متاح — واعرضوه لو النت سمح.

### الـDemo Path (لازم يشتغل من غير أي شرح)

```
تسجيل مطور → إضافة مهارات → بدء تحدي React
  → كتابة كود في الـeditor (لصق مقصود لعرض الـtrust)
  → Run (3/4 نجحوا) → Submit
  → progress: Running tests → Analyzing → Trust → Done
  → نتيجة: 87/100 + breakdown 5 أبعاد + "+90 SP" + Trust 92
  → Passport العام (رابط قابل للمشاركة + OG image)
  → تسجيل خروج → دخول كـclient → بحث "React, Trust>85, Verified"
  → المطور يظهر → عرض الـPassport → تواصل
```

**كل خطوة ≤ 3 ثواني.** لو التقييم بياخد 20 ثانية، اللجنة هتلل. الـstub mode بيحل ده.

---

## 11. مش في الـMVP (قولوها بصراحة كـroadmap)

| Phase | الحاجات |
|---|---|
| **2** | AI-generated challenges · Technical interviews · Human review UI · Company dashboard · advanced search · project-level sandboxes (E2B) |
| **3** | Recommendations · ATS integrations · advanced integrity engine |
| **4** | Marketplace · contracts · payments · escrow · Enterprise API |

القدرة على إنك تقول "شلنا ده بوعي، وده السبب" أقوى في التحكيم من feature list طويلة نصها مكسور.

---

## 12. Risk Register

| # | المخاطرة | الاحتمال | التأثير | التخفيف |
|---|---|---|---|---|
| 1 | **Judge0 cgroup v1 على Windows** | عالي | عالي | MockRunner من W2 · Judge0 على Linux VPS بس |
| 2 | الـLLM judge غالي/بطيء/غير ثابت | متوسط | متوسط | caching (>4096 tok!) · effort=medium · stub mode · Batch API للـbackfill |
| 3 | الـcore loop بياخد وقت أطول | عالي | عالي | خلّوه Sprint 2 — أقرب milestone. أي تأخير يبان بدري. |
| 4 | Trust engine بيدي false positives | متوسط | عالي | bands مش boolean · raw events محفوظة · `recompute-trust` |
| 5 | drift بين الـFE والـBE | متوسط | متوسط | `packages/contracts` + CI بيكسر على الـtype mismatch |
| 6 | scope creep ناحية الـmarketplace | عالي | عالي | الجدول فوق مكتوب. مافيش Phase 4 في المسابقة. |
| 7 | النت في يوم الـdemo | متوسط | **قاتل** | Demo Safety Mode + كله local |

---

## 13. أول ٣ Commits (ابدأوا كده حرفيًا)

```
1. chore: pnpm monorepo + turbo + tsconfig base + eslint/prettier
2. feat(db): Prisma schema كامل + initial migration + skills/challenges seed
3. feat(contracts): auth + assessment + evaluation Zod schemas
```

بعد الـ3 دي، Dev A و Dev B يشتغلوا متوازي بدون blocking.
