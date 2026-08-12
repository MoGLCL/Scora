# 🛡️ Scora V0.1 — منصة تقييم وتوظيف المطورين بالذكاء الاصطناعي
### (Developer Evaluation & Trust Verification Platform — Repository Master Guide)

---

## 🧭 الفهرس والتنقل السريع (Navigation Index)

| المستند (Document) | الصيغة (Format) | الوصف (Description) |
| :--- | :---: | :--- |
| **[هيكل المشروع والمعمارية](docs/PROJECT_STRUCTURE.md)** | `MD` / `PDF` | [مشاهدة MD](docs/PROJECT_STRUCTURE.md) • [تحميل PDF](docs/PROJECT_STRUCTURE.pdf) |
| **[دليل إعداد بيئة التشغيل](docs/ENVIRONMENT_SETUP.md)** | `MD` | [مشاهدة MD](docs/ENVIRONMENT_SETUP.md) • نموذج [.env.example](.env.example) |
| **[التوثيق الفني لـ API و Server Actions](docs/API_DOCUMENTATION.md)** | `MD` / `PDF` | [مشاهدة MD](docs/API_DOCUMENTATION.md) • [تحميل API Endpoints PDF](docs/API_ENDPOINTS.pdf) |
| **[مخطط وقواعد البيانات MySQL](docs/DATABASE_SCHEMA.md)** | `MD` / `DBML` / `PDF` | [مشاهدة MD](docs/DATABASE_SCHEMA.md) • [كود DBML لـ dbdiagram](docs/schema.dbml) • [تحميل PDF](docs/DATABASE_SCHEMA.pdf) |
| **[الشرح المعماري الشامل](docs/ARCHITECTURE_EXPLANATION.pdf)** | `PDF` | [تحميل Architecture PDF](docs/ARCHITECTURE_EXPLANATION.pdf) |

---

## 🌟 أبرز المميزات والإمكانيات (Core Features)

- 🤖 **نظام التقييم التفاعلي بالذكاء الاصطناعي (AI Assessment Engine):** إنشاء اختبارات برمجية ومقابلات تقنية مخصصة لكل مطور بناءً على مهاراته وحساب نقاط الـ SP تلقائياً.
- 🎯 **مقياس الموثوقية الشفاف (Scora Trust Score):** خوارزمية ذكية لحساب درجة موثوقية المطور من 0 إلى 100 مع سجل أحداث مشفر لا يقبل التلاعب (`trust_events`).
- 💼 **سوق المشاريع والعروض (Developer & Project Marketplace):** إمكانية نشر المشاريع من قبل العملاء وتلقي عروض المطورين المعتمدين فقط.
- 🔐 **أمان عالي ومصادقة مشفرة:** جلسات JWT معزولة بدون حالة (Stateless JOSE Session Cookies) مع حماية ضد هجمات CSRF و SQL Injection.
- ⚙️ **لوحة أدمن وإدارة كاملة (Admin Portal):** شاشات مخصصة لمراجعة طلبات انضمام المطورين، ضبط نماذج الـ AI، ومتابعة إحصائيات النظام.

---

## 🛠️ المعمارية والتقنيات الأساسية (Core Tech Stack)

| Component | Technology / Library | Description |
| :--- | :--- | :--- |
| **Framework** | Next.js 16 (App Router + Turbopack) | Server Components (RSC) + Client Components |
| **Language** | TypeScript | Strict Type Checking & Zod Schema Validation |
| **Monorepo Packages** | `@scora/trust-core`, `scoring`, `skills`, `storage` | حزم مستقلة لخوارزميات التقييم وسجلات الثقة |
| **Database** | MySQL 8.0+ / MariaDB 10.6+ | Direct Connection Pooling via `mysql2/promise` |
| **AI Integration** | OpenRouter API Engine | Claude 3.5 Sonnet & GPT-4.1 Mini Models |
| **Authentication** | JOSE (HS256 JWT) + BcryptJS | Secure HTTP-Only Stateless Session Cookies |
| **Styling & UI** | Vanilla CSS Tokens + Tailwind CSS | Cairo & Tajawal Arabic Typography |
| **Automation** | GitHub Actions CI/CD | Continuous Integration & Automated Verification |

---

## 📂 هيكل المجلدات الرئيسي (Project Directory Tree)

```text
Scora-V0.1/
├── .github/workflows/         # خطوط أتمتة البناء والاختبار (CI/CD Pipelines)
├── app/                       # مسارات التطبيق (Next.js App Router)
│   ├── (auth)/                # شاشات التسجيل وتأكيد الدخول
│   ├── admin/                 # لوحة الإدارة الفنية والاعتمادات
│   ├── api/                   # مسارات الـ REST API Endpoints
│   ├── developer-assessment/  # شاشات اختبار المطور بالذكاء الاصطناعي
│   ├── projects/              # سوق المشاريع والعروض
│   └── dashboard/             # لوحة تفاعل المطور والعميل
├── components/                # مكونات واجهة المستخدم (UI Components)
├── docs/                      # مجلد التوثيق الفني الشامل
│   ├── schema.dbml            # مخطط DBML لـ dbdiagram.io
│   ├── PROJECT_STRUCTURE.md   # شرح معمارية المجلدات والحزم
│   ├── ENVIRONMENT_SETUP.md   # دليل التشغيل والـ Environment Setup
│   ├── API_DOCUMENTATION.md   # توثيق مسارات الـ REST APIs و Server Actions
│   ├── DATABASE_SCHEMA.md     # دليل جداول قواعد البيانات والعلاقات
│   ├── PROJECT_STRUCTURE.pdf  # نسخة PDF بهوية سكورا
│   ├── DATABASE_SCHEMA.pdf    # نسخة PDF بهوية سكورا
│   ├── API_ENDPOINTS.pdf      # نسخة PDF بهوية سكورا
│   └── ARCHITECTURE_EXPLANATION.pdf # نسخة PDF بهوية سكورا
├── lib/                       # الطبقة الخدمية ومنطق الأعمال (Core Logic)
│   ├── actions/               # خوادم العمليات (Server Actions)
│   ├── dal.ts                 # طبقة الوصول للبيانات (Data Access Layer)
│   ├── db.ts                  # مجمع اتصالات قاعدة البيانات (MySQL Pool)
│   └── openrouter.ts          # ممر التكامل مع AI Engine
├── packages/                  # حزم المونوريبو المستقلة (Subsystems)
│   ├── core/                  # حزمة الموثوقية والأنواع الأساسية
│   ├── scoring/               # محرك حساب درجات السكورا
│   ├── skills/                # نظام تقييم وحساب نقاط المهارات
│   └── storage/               # حزمة تعريف الـ Schemas
├── scripts/                   # سكربتات التهيئة والـ Migrations
│   ├── migrate.js             # تهيئة الجداول الأساسية
│   └── migrate-v8.js          # تهيئة جداول الـ AI والـ Trust Ledger
├── .env.example               # نموذج المتغيرات البيئية Standard
├── next.config.ts             # إعدادات Next.js 16
└── package.json               # الاعتمادات البرمجية والـ Scripts
```

---

## ⚡ تعليمات التشغيل السريع (Quick Start)

```bash
# 1. استنساخ المستودع وتثبيت الاعتمادات
git clone https://github.com/MoGLCL/Scora.git
cd Scora
npm install --legacy-peer-deps

# 2. إعداد المتغيرات البيئية
cp .env.example .env.local

# 3. تشغيل تهيئة وتحديث قاعدة البيانات
node scripts/migrate.js
node scripts/migrate-v8.js

# 4. تشغيل خادم التطوير المحلي
npm run dev

# 5. بناء وااختبار نسخة الإنتاج
npm run build
```
