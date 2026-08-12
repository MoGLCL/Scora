# Scora V0.1 — التوثيق الفني الشامل لـ APIs و Server Actions (API Reference)

> **Navigation:** [🏠 الرئيسية (Main README)](../README.md) \| [🌐 التوثيق التفاعلي HTML](API_DOCUMENTATION.html) \| [📂 هيكل المشروع](PROJECT_STRUCTURE.md) \| [⚙️ إعداد البيئة](ENVIRONMENT_SETUP.md) \| [🗄️ قاعدة البيانات](DATABASE_SCHEMA.md) \| [📄 تحميل PDF](API_ENDPOINTS.pdf)

> **💡 ملاحظة:** يتوفر التوثيق الفني التفاعلي بالكامل بتقنيات وتصاميم Scora البصرية في [API_DOCUMENTATION.html](API_DOCUMENTATION.html).

دليل مرجعي تفصيلي لجميع مسارات الـ **REST API Endpoints** وخوادم العمليات **Server Actions** لمنصة **Scora V0.1**.

---

## 🔒 1. نظام المصادقة والأمان (Auth & Security Model)

تعتمد المنصة على معيارين للمصادقة:
1. **HTTP Cookies (Stateless JWT Sessions)**: جلسات مشفرة بـ `JOSE (HS256)` تحتوي على الهوية والـ Role (`developer` أو `client` أو `admin`).
2. **Server Actions Security Layer**: يتم فحص الجلسة عبر `verifySession()` من طبقة `lib/dal.ts` قبل تنفيذ أي أداء برمجي على قواعد البيانات.

---

## ⚡ 2. خوادم العمليات (Server Actions Reference — `lib/actions/`)

### أ. المصادقة والجلسات (`lib/actions/auth.ts`)

#### 1. `registerAction(formData: FormData)`
- **الوصف**: إنشاء حساب جديد في المنصة كمطور أو عميل.
- **المدخلات (Zod Schema)**:
  - `email`: string (valid email format)
  - `password`: string (min 6 chars)
  - `full_name`: string
  - `role`: `'developer'` | `'client'`
- **المخرجات**: `{ success: true, redirectUrl: string }` أو `{ success: false, error: string }`.

#### 2. `loginAction(formData: FormData)`
- **الوصف**: تسجيل الدخول والتحقق من كلمة المرور وإنشاء توكين الجلسة في الكوكيز.
- **المدخلات**: `email`, `password`.
- **المخرجات**: التوجيه التلقائي إلى `/dashboard` أو `/admin`.

#### 3. `logoutAction()`
- **الوصف**: إنهاء الجلسة الحالية ومسح الكوكيز.

---

### ب. إدارة الملفات والمشاريع (`lib/actions/profile.ts` & `proposals.ts`)

#### 1. `completeDeveloperOnboarding(data)`
- **الوصف**: إكمال بيانات الملف الشخصي للمطور عند التسجيل الأول (المهارات، المسمى الوظيفي، الروابط).
- **المدخلات**: `job_title`, `headline`, `bio`, `location`, `github_url`, `skills: string[]`.

#### 2. `createProjectAction(data)`
- **الوصف**: إضافة مشروع جديد بواسطة العميل.
- **المدخلات**: `title`, `category`, `description`, `budget_from`, `budget_to`, `deadline_days`, `skills`.

#### 3. `submitProposalAction(data)`
- **الوصف**: تقديم عرض برمجي من مطور على مشروع مفتوح.
- **المدخلات**: `project_id`, `price`, `delivery_days`, `cover_text`.

---

### ج. محرك التقييم بـ AI (`lib/actions/developer-assessment.ts`)

#### 1. `startAssessmentSession()`
- **الوصف**: إنتاج جلسة تقييم تفاعلية بالذكاء الاصطناعي بناءً على تخصص المطور عبر OpenRouter API.
- **المخرجات**: `sessionPublicId`, أسئلة التقييم (MCQ / Interview / Code).

#### 2. `submitAnswerAction(sessionPublicId, questionPublicId, answerText)`
- **الوصف**: حفظ إجابة المطور وتقييمها لحظياً عبر الـ AI Engine مع احتساب درجات الـ SP والثقة.

---

### د. خدمات الإدارة والأدمن (`lib/actions/admin.ts`)

#### 1. `reviewDeveloperAction(developerId, decision, reason)`
- **الوصف**: اعتماد أو رفض طلب انضمام مطور من قبل الأدمن.
- **المدخلات**: `developerId`, `decision: 'approved' | 'rejected'`, `reason`.

#### 2. `updatePlatformSettingsAction(settings)`
- **الوصف**: تحديث إعدادات نموذج الذكاء الاصطناعي بـ OpenRouter وبوابة المنصة.

---

## 🌐 3. مسارات الـ REST API Endpoints (`app/api/`)

### 1. خدمات الإدارة والمسؤولين (`/api/admin/*`)
| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/admin/stats` | `GET` | Admin | استرجاع إحصائيات المنصة الشاملة (المستخدمين، التقييمات، السكورا). |
| `/api/admin/developers` | `GET` | Admin | قائمة المطورين مع فلترة حالة الاعتماد والـ Trust Score. |
| `/api/admin/settings` | `GET / POST` | Admin | قراءة وتحديث إعدادات OpenRouter AI والحسابات. |

### 2. خدمات التقييم والـ AI (`/api/developer-assessment/*`)
| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/developer-assessment/session` | `POST` | Dev | توليد جلسة تقييم جديدة. |
| `/api/developer-assessment/submit` | `POST` | Dev | تقديم الإجابات وتقييمها. |

### 3. الإشعارات والتحليلات (`/api/notifications` & `/api/analytics`)
| Route | Method | Access | Description |
| :--- | :--- | :--- | :--- |
| `/api/notifications` | `GET / PATCH` | Auth User | جلب الإشعارات وتحديدها كـ Read. |
| `/api/analytics` | `GET` | Admin | سجل تحليلات الزيارات والأداء. |
