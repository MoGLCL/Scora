# Scora V0.1 — التوثيق الفني الهيكلي لقاعدة البيانات (Database Schema & Relations Reference)

> **Navigation:** [🏠 الرئيسية (Main README)](../README.md) \| [📂 هيكل المشروع](PROJECT_STRUCTURE.md) \| [⚙️ إعداد البيئة](ENVIRONMENT_SETUP.md) \| [📡 توثيق الـ API](API_DOCUMENTATION.md) \| [🔗 كود DBML](schema.dbml) \| [📄 تحميل PDF](DATABASE_SCHEMA.pdf)

مستند مرجعي شامل لقواعد البيانات في منصة **Scora V0.1** (MySQL 8.0+ / MariaDB 10.6+). يحتوي هذا الملف على جميع الجداول، المخططات الهيكلية، العلاقات (Foreign Keys)، القيود (Constraints)، ورابط كود **DBML** الجاهز للرفع الفوري على منصة [https://dbdiagram.io/](https://dbdiagram.io/).

---

## 🔗 مخطط العلاقات وتصميم DBML المباشر (`docs/schema.dbml`)

تم إنشاء وتجهيز مخطط قاعدة البيانات بالكامل باستخدام معيار **DBML (Database Markup Language)** الجاهز للاستخدام المباشر في أدوات رسم الـ ERD مثل [dbdiagram.io](https://dbdiagram.io/).

يمكنك الوصول للملف المباشر عبر [docs/schema.dbml](schema.dbml).

### كيفية استخدام الكود على dbdiagram.io:
1. افتح موقع [https://dbdiagram.io/](https://dbdiagram.io/).
2. انسخ محتوى الملف [docs/schema.dbml](schema.dbml).
3. الصق الكود في المحرر الأيسر بـ dbdiagram.io ليعرض لك الرسم البياني الفوري لجميع الجداول والعلاقات التفاعلية.

---

## 📊 الرسم التخطيطي للأنظمة الفرعية (Subsystem Modules)

```text
                               +-------------------+
                               |       users       |
                               +-------------------+
                               | id (PK)           |
                               | email (UQ)        |
                               | password_hash     |
                               | role, is_admin    |
                               +-------------------+
                                 /               \
                          1 : 1 /                 \ 1 : 1
                               v                   v
                     +-------------------+   +-------------------+
                     |    developers     |   |      clients      |
                     +-------------------+   +-------------------+
                     | id (PK)           |   | id (PK)           |
                     | user_id (FK)      |   | user_id (FK)      |
                     | trust_score       |   | company_name      |
                     | skill_points      |   +-------------------+
                     | approval_status   |             |
                     +-------------------+             | 1 : N
                       /        |                      v
                1 : N /   1 : N |            +-------------------+
                     v          v            |     projects      |
      +-----------------+ +----------------+ +-------------------+
      | developer_skills| |   assessments  | | id (PK)           |
      +-----------------+ +----------------+ | client_id (FK)    |
      | developer_id(FK)| | id (PK)        | | status            |
      | skill_id (FK)   | | dev_id (FK)    | +-------------------+
      +-----------------+ | session_id(FK) |           |
                 ^        +----------------+           | 1 : N
                 |                                     v
          +--------------+                   +-------------------+
          |    skills    |                   |     proposals     |
          +--------------+                   +-------------------+
          | id (PK)      |                   | id (PK)           |
          | slug (UQ)    |                   | project_id (FK)   |
          +--------------+                   | developer_id (FK) |
                                             +-------------------+
```

---

## 📋 تفاصيل الجداول والأعمدة (Comprehensive Table Specs)

### 1. جدول المستخدمين (`users`)
المصدر الأساسي للحسابات والمصادقة في المنصة.
- `id` (BIGINT UNSIGNED, PK, AUTO_INCREMENT): المعرف الفريد.
- `email` (VARCHAR(255), UQ, NOT NULL): البريد الإلكتروني للحساب.
- `password_hash` (VARCHAR(255), NOT NULL): كلمة المرور المشفرة بـ Bcrypt.
- `full_name` (VARCHAR(255), NOT NULL): الاسم الكامل.
- `role` (ENUM('developer', 'client'), DEFAULT 'client'): نوع الحساب.
- `is_admin` (TINYINT(1), DEFAULT 0): صلاحية مدير النظام (Admin).
- `created_at` / `updated_at`: الطوابع الزمنية.

---

### 2. جدول المطورين (`developers`)
يحتوي على البيانات التخصصية للمطور، نتائج التقييم، ودرجة الموثوقية (Trust Score).
- `id` (BIGINT UNSIGNED, PK, AUTO_INCREMENT): المعرف الفريد للمطور.
- `user_id` (BIGINT UNSIGNED, UQ, FK -> users.id): ربط 1:1 مع جدول المستخدمين.
- `display_name` (VARCHAR(255), NOT NULL): اسم المطور المعلن.
- `account_type` (ENUM('personal', 'company'), DEFAULT 'personal'): حساب فردي أم شركة.
- `trust_score` (INT, DEFAULT 50): درجة الموثوقية المحسوبة بمحرك Scora Engine.
- `skill_points` (INT, DEFAULT 0): نقاط المهارة التراكمية (SP).
- `approval_status` (ENUM('profile_incomplete', 'assessment_in_progress', 'admin_review', 'approved', 'rejected'), DEFAULT 'profile_incomplete'): حالة الاعتماد خطوة بخطوة.
- `approved_by` (BIGINT UNSIGNED, FK -> users.id): المدير المعتمد للطلب.

---

### 3. جدول العملاء (`clients`)
بيانات أصحاب العمل والشركات التي تطرح المشاريع.
- `id` (BIGINT UNSIGNED, PK, AUTO_INCREMENT).
- `user_id` (BIGINT UNSIGNED, UQ, FK -> users.id): ربط 1:1 مع `users.id`.
- `display_name` (VARCHAR(255), NOT NULL).
- `company_name` (VARCHAR(255), NULL).
- `website` (VARCHAR(500), NULL).

---

### 4. المهارات والربط (`skills` & `developer_skills`)
كتالوج المهارات وسجل مهارات كل مطور مع مستوى الخبرة والـ SP.
- **skills**: `id`, `slug` (UNIQUE), `name`, `name_ar`, `category` (language/framework/database/tool).
- **developer_skills**: `id`, `developer_id` (FK), `skill_id` (FK), `level` (beginner/intermediate/advanced/expert), `sp`.

---

### 5. المشاريع والعروض (`projects` & `proposals`)
سوق العمل الحر والمشاريع البرمجية.
- **projects**: `id`, `client_id` (FK -> clients.id), `title`, `description`, `budget_from`, `budget_to`, `deadline_days`, `status` (open/in_progress/completed/closed).
- **proposals**: `id`, `project_id` (FK -> projects.id), `developer_id` (FK -> developers.id), `price`, `delivery_days`, `cover_text`, `status` (pending/accepted/rejected/withdrawn).

---

### 6. تقييم المطورين بالذكاء الاصطناعي (`developer_assessment_*`)
نظام التقييم والاختبار المباشر المدعوم بـ OpenRouter AI engine.
- **developer_assessment_sessions**: جلسات التقييم (`public_id`, `developer_id`, `status`, `score`, `trust_awarded`, `sp_awarded`).
- **developer_assessment_questions**: أسئلة التقييم المنسقة (`session_id`, `kind`: mcq/interview/code, `question_text`, `options_json`).
- **developer_assessment_answers**: إجابات المطور وتحليل الـ AI.

---

### 7. سجل الموثوقية الموحد (`trust_events`)
سجل أحداث الموثوقية (Cryptographic Trust Ledger) غير القابل للتعديل للتأكد من نزاهة التقييم.
- `event_id` (VARCHAR(100), UNIQUE)
- `session_public_id` (VARCHAR(80))
- `developer_id` (BIGINT UNSIGNED, FK -> developers.id)
- `event_hash` (CHAR(64), SHA-256)
- `previous_hash` (CHAR(64), SHA-256)

---

## ⚡ السكربتات والتحديثات الهيكلية (Migration Tools)

جميع التعديلات الهيكلية يتم تطبيقها عبر السكربتات المرفقة في المشروع:
- `node scripts/migrate.js`: إنشاء الجداول الأساسية والمؤشرات.
- `node scripts/migrate-v8.js`: إضافة جداول التقييم بالـ AI، سجلات الثقة، وإعدادات المنصة.
