# Scora V0.1 — دليل إعداد بيئة التشغيل وقواعد البيانات (Environment Setup & Configuration Guide)

> **Navigation:** [🏠 الرئيسية (Main README)](../README.md) \| [📂 هيكل المشروع](PROJECT_STRUCTURE.md) \| [📡 توثيق الـ API](API_DOCUMENTATION.md) \| [🗄️ قاعدة البيانات](DATABASE_SCHEMA.md) \| [نموذج .env.example](../.env.example)

دليل فني خطوة بخطوة لإعداد بيئة التطوير المحلية (Local Development) والإنتاجية (Production) لمنصة **Scora V0.1**.

---

## 💻 1. المتطلبات الأساسية (Prerequisites)

قبل البدء في تثبيت المشروع، يتطلب توفر البيئة البرمجية التالية:

- **Node.js**: الإصدار 18.17.0 أو أحدث (يُفضل LTS Node 20 or Node 22).
- **npm**: الإصدار 9.0.0 أو أحدث.
- **MySQL Server**: الإصدار 8.0+ أو **MariaDB**: الإصدار 10.6+ (مع تفعيل ترميز `utf8mb4_general_ci`).
- **Git**: لإدارة النسخ البرمجية.

---

## 🚀 2. خطوات التثبيت والتشغيل (Quick Start Steps)

### الخطوة الأولى: استنساخ المستودع (Clone Repository)
```bash
git clone https://github.com/MoGLCL/Scora.git
cd Scora
```

### الخطوة الثانية: تثبيت الاعتمادات (Install Dependencies)
```bash
npm install --legacy-peer-deps
```

### الخطوة الثالثة: ضبط المتغيرات البيئية (Environment Variables)
قم بإنشاء ملف `.env.local` في الجذر الرئيسي للمشروع بناءً على النموذج المرفق `.env.example`:

```bash
cp .env.example .env.local
```

افتح ملف `.env.local` وقم بضبط القيم التالية:

```env
# بيانات اتصال قاعدة البيانات MySQL (سواء محلي أو Remote)
DB_HOST=mysql-scorasql.alwaysdata.net
DB_PORT=3306
DB_USER=scorasql
DB_PASSWORD=S123S123s123
DB_NAME=scorasql_1
DB_CONNECTION_LIMIT=10

# مفتاح مشفر لتأمين جلسات JWT
SESSION_SECRET=scora_super_secret_jwt_key_2026_production_secure_token

# بيانات التكامل مع الذكاء الاصطناعي OpenRouter API
OPENROUTER_API_KEY=your_actual_openrouter_api_key
OPENROUTER_MODEL=openai/gpt-4.1-mini
OPENROUTER_SITE_URL=http://localhost:3000
OPENROUTER_SITE_TITLE=SCORA
```

---

## 🗄️ 3. تهيئة وبناء قاعدة البيانات (Database Provisioning & Migrations)

يحتوي المشروع على سكربتات تتابعية لتهيئة الجداول والمؤشرات بدون الحاجة لأدوات ORM معقدة:

### 1. تشغيل التهيئة الأساسية:
```bash
node scripts/migrate.js
```
*يقوم السكربت بإنشاء جداول `users`, `developers`, `clients`, `projects`, `proposals`, `skills`, `messages`, `notifications`.*

### 2. تشغيل ترحيل التقييمات والـ AI (Migration v8):
```bash
node scripts/migrate-v8.js
```
*يقوم بإنشاء جداول جلسات التقييم `developer_assessment_sessions`, `questions`, `answers`, `trust_events` وسجلات الموثوقية.*

---

## 🛠️ 4. تشغيل خادم التطوير والبناء (Running & Building)

### تشغيل الخادم المحلي (Development Server)
```bash
npm run dev
```
سيكون التطبيق متاحاً عبر المتصفح على الرابط: `http://localhost:3000`.

### فحص مطابقة الأنواع (TypeScript Check)
```bash
npx tsc --noEmit
```

### بناء حزمة الإنتاج (Production Build)
```bash
npm run build
npm run start
```

---

## 🔄 5. أتمتة البناء والتكامل المستمر (CI/CD Pipeline)

المشروع مزود بـ GitHub Actions Workflows داخل مجلد `.github/workflows/`:
- **Continuous Integration (`ci.yml`)**: يقوم بفحص الجودة والأنواع والبناء تلقائياً عند أي Push أو Pull Request.
- **Continuous Deployment (`deploy.yml`)**: يفحص جاهزية المتغيرات البيئية والنشر الإنتاجي.
