# Scora V0.1 - التقرير الفني المباشر ودليل المشروع (Repository Documentation Master)

هذا المستند يمثل الدليل الرئيسي الفني لمنصة Scora V0.1. تم تنظيم وتوثيق كافة الأنظمة المعمارية، قواعد البيانات، والمسارات في مجلد الوثائق المستقل `docs/` لتوفير بيئة عمل احترافية وسهلة المتابعة للمطورين.

---

## 📚 التوثيق الفني المعماري المتاح داخل مجلد `docs/`

تم إعداد الوثائق التخصصية وتوزيعها داخل المجلد المستقل `docs/` على النحو التالي:

1. **[هيكل المشروع والمعمارية (Project Structure & Architecture)](docs/PROJECT_STRUCTURE.md):**
   شرح كامل لتقسيم المجلدات، طبقة الوصول للبيانات (DAL)، خوادم العمليات (Server Actions)، وحزم التقييم والموثوقية المعزولة داخل المونوريبو.

2. **[دليل إعداد بيئة التشغيل وقواعد البيانات (Environment Setup & Configuration)](docs/ENVIRONMENT_SETUP.md):**
   خطوات التثبيت المحلي، ربط MySQL، ضبط المتغيرات البيئية في `.env.local`، وتشغيل سكربتات التحديث التتابعية من `migrate.js` حتى `migrate-v8.js`.

3. **[التوثيق الفني الكامل للـ API و Server Actions (API Reference)](docs/API_DOCUMENTATION.md):**
   توثيق كامل لمسارات الـ REST API الخاصة بالأدمن، الإحصائيات، التحليلات، التنبيهات، ومواصفات خوادم العمليات الخاصة بالمصادقة، تقييم المطورين بـ AI، والعروض.

4. **[مخطط وقواعد بيانات MySQL (Database Schema & Relations)](docs/DATABASE_SCHEMA.md):**
   المخطط الهيكلي لقواعد البيانات (ER Diagrams)، جداول المستخدمين والمطورين والمشاريع، القيود والتكامل الترجعي (Foreign Keys)، وسجل الـ Migrations.

---

## المعمارية والتقنيات الأساسية (Core Tech Stack)

- **Framework:** Next.js 16 (App Router + Turbopack)
- **Language:** TypeScript (Strict Type Checking)
- **Styling:** Vanilla CSS Tokens + Tailwind CSS
- **Database Engine:** MySQL / MariaDB (Direct Connection Pool + Server Actions)
- **Security & Auth:** JOSE (Stateless JWT Sessions), BcryptJS, Server-Only Cookies
- **AI Integration:** OpenRouter API (Claude 3.5 Sonnet Engine)
- **CI/CD Automation (Bonus Feature):** GitHub Actions (Multi-stage Pipeline in `.github/workflows/`)

---

## خط أتمتة البناء والنشر (GitHub Actions CI/CD)

المشروع مجهز بخط أتمتة مستمر مدمج داخل المستودع:

1. **Continuous Integration (`.github/workflows/ci.yml`):**
   يتحقق تلقائياً من جودة الكود (ESLint)، مطابقة TypeScript الصارمة (`npx tsc --noEmit`)، وبناء النسخة الإنتاجية بكفاءة وتخزين الـ Build Artifacts.

2. **Continuous Deployment (`.github/workflows/deploy.yml`):**
   يفحص جاهزية المتغيرات البيئية والتكامل الإنتاجي فور الدمج على برانش `main` أو `Scora-V0.1`.

3. **التشغيل اليدوي المباشر (Manual Trigger):**
   يدعم الـ Workflows خاصية `workflow_dispatch` لتشغيل الفحص بضغطة زر واحدة من تبويب Actions في GitHub.

---

## تعليمات البدء والتشغيل السريع (Quick Start)

```bash
# 1. تثبيت الاعتمادات والمكتبات
npm install --legacy-peer-deps

# 2. تهيئة وتحديث جداول قاعدة البيانات
node scripts/migrate.js
node scripts/migrate-v8.js

# 3. تشغيل سيرفر التطوير المحلي
npm run dev

# 4. فحص الأنواع وبناء حزمة الإنتاج
npm run build
```
