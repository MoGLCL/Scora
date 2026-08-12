# Scora V0.1 - الهيكل التنظيمي والمعماري للمشروع (Project Structure & Architecture)

يوضح هذا المستند التنظيم الهيكلي للمجلدات، تقسيم المسؤوليات البرمجية (Separation of Concerns)، ومعمارية الأنظمة الفرعية داخل منصة Scora V0.1.

---

## 1. الهيكل العام للمجلدات (Root Directory Tree)

```text
Scora-V0.1/
├── .github/
│   └── workflows/
│       ├── ci.yml                 # خط أتمتة جودة الكود والبناء (CI Pipeline)
│       └── deploy.yml             # خط أتمتة النشر والتحقق الإنتاجي (CD Pipeline)
├── app/                           # مسارات التطبيق (Next.js App Router)
│   ├── (auth)/                    # مسارات المصادقة والتسجيل
│   │   ├── login/                 # صفحة تسجيل الدخول
│   │   ├── register/              # صفحة إنشاء حساب جديد
│   │   └── reset-password/        # صفحة استعادة كلمة المرور
│   ├── admin/                     # لوحة التحكم والإدارة الفنية
│   │   ├── developers/[id]/review/ # مراجعة وتقييم طلبات انضمام المطورين
│   │   └── page.tsx               # الشاشة الرئيسية للأدمن
│   ├── api/                       # مسارات الـ REST API Endpoints
│   │   ├── admin/                 # مسارات خدمات الأدمن (المستخدمين، المشاريع، AI Settings)
│   │   ├── analytics/             # خدمات تتبع الزيارات والتحليلات
│   │   ├── auth/                  # خدمات إنهاء الجلسة والمصادقة
│   │   ├── dashboard/             # بيانات لوحة التفاعل
│   │   └── notifications/         # خدمات التنبيهات اللحظية
│   ├── developer-assessment/      # وحدة تقييم المطورين بالذكاء الاصطناعي
│   │   ├── [id]/                  # شاشة اختبار وتقييم مطور محدد
│   │   └── pending/               # شاشة الانتظار والمراجعة
│   ├── developers/                # دليل وسجل المطورين المتاحين
│   ├── projects/                  # سوق المشاريع والعروض المقدمة
│   │   ├── [id]/                  # تفاصيل مشروع والعروض
│   │   └── new/                   # إضافة مشروع جديد (للعملاء)
│   ├── complete-profile/          # استمارة إكمال بيانات المطور (Onboarding)
│   ├── complete-client-profile/   # استمارة إكمال بيانات العميل (Onboarding)
│   ├── dashboard/                 # لوحة تفاعل المستخدم (مطور / عميل)
│   ├── profile/                   # الملف الشخصي وإدارة الحساب
│   ├── globals.css                # المتغيرات والتنسيقات العامة (Design Tokens)
│   ├── layout.tsx                 # الغلاف الرئيسي للمنصة (Root Layout)
│   └── page.tsx                   # الصفحة الرئيسية للمنصة (Landing Page)
├── components/                    # المكونات البرمجية للواجهة (UI Components)
│   ├── auth/                      # مكونات شبكات التسجيل الاجتماعي
│   ├── landing/                   # مكونات الصفحة الرئيسية (Hero, Workflow, Proof)
│   ├── admission-decision-form.tsx # استمارة اعتماد/رفض طلب انضمام مطور
│   ├── ai-assistant-ssd.tsx       # المساعد الذكي التفاعلي
│   ├── developer-assessment-form.tsx # استمارة اختبار وتقييم المطور
│   ├── notifications-menu.tsx     # قائمة التنبيهات اللحظية
│   ├── profile-provider.tsx       # موفر سياق وحالة الجلسات (React Context)
│   ├── site-header.tsx            # شريط الترويسة العلوي (Navbar)
│   └── site-footer.tsx            # التذييل السفلي للمنصة
├── docs/                          # وثائق وسجلات البروجيكت الفنية
│   ├── API_DOCUMENTATION.md       # التوثيق الفني الكامل للـ API و Server Actions
│   ├── ENVIRONMENT_SETUP.md       # دليل إعداد وتشغيل البيئة المحلية والـ DB
│   └── PROJECT_STRUCTURE.md       # مستند الهيكل والمعمارية (هذا الملف)
├── lib/                           # الطبقة الخدمية ومنطق الأعمال (Core Logic)
│   ├── actions/                   # خوادم العمليات (Server Actions)
│   │   ├── admin.ts               # عمليات الأدمن والإحصائيات
│   │   ├── auth.ts                # عمليات التسجيل والدخول
│   │   ├── developer-assessment.ts # عمليات تقييم المطورين بـ AI
│   │   ├── profile.ts             # عمليات تحديث الملفات والمشاريع
│   │   ├── user-session.ts        # مزامنة الجلسات الحية مع MySQL
│   │   └── upload.ts              # خدمات رفع الصور والملفات
│   ├── dal.ts                     # طبقة الوصول للبيانات (Data Access Layer)
│   ├── db.ts                      # مجمع اتصالات قاعدة البيانات (MySQL Pool)
│   ├── openrouter.ts              # ممر التكامل مع نماذج الذكاء الاصطناعي
│   ├── session.ts                 # إدارة جلسات الـ HTTP Cookies
│   ├── session-token.ts           # التشفير والفك للـ JWT Sessions (JOSE)
│   ├── trust-events.ts            # سجل وتأثير أحداث الموثوقية
│   └── types.ts                   # تعريفات الأنواع الصارمة (TypeScript Types)
├── packages/                      # الحزم والأنظمة الفرعية (Subsystem Monorepo)
│   ├── review/                    # نظام تدقيق ومراجعة المشاريع
│   ├── scoring/                   # محرك حساب درجات السكورا والموثوقية
│   ├── skills/                    # نظام تقييم وملاحظة المهارات البرمجية
│   └── storage/                   # حزمة تخزين الـ Schemas المستقلة
├── proxy.ts                       # بوابات وتوجيه الجلسات في الـ Edge Runtime
├── scripts/                       # سكربتات تهيئة وقواعد البيانات
│   ├── migrate.js                 # تهيئة الجداول الأساسية
│   └── migrate-v8.js              # تحديث جداول التقييم والـ AI
├── .env.example                   # نموذج المتغيرات البيئية القياسي
├── .env.local                     # المتغيرات البيئية المحلية (غير مرفوعة)
├── next.config.ts                 # إعدادات Next.js 16
├── package.json                   # اعتمادات المشروع والـ Scripts
├── README.md                      # التقرير الفني المباشر للمشروع
└── tsconfig.json                  # إعدادات المترجم لـ TypeScript
```

---

## 2. معمارية الأنظمة والمسؤوليات (Architectural Separation)

### أ. طبقة الواجهات والـ Pages (`app/` & `components/`)
- تعتمد على مكونات React Server Components (RSC) لتقديم الشاشات الثابتة بسرعة عالية.
- تستخدم Client Components في النماذج التفاعلية (`"use client"`) مثل الاستشارات، الاختبارات، والمحادثات.
- تعتمد إدارة الحالة العامة للعميل على `profile-provider.tsx` لمزامنة الهوية ورتبة المستخدم.

### ب. طبقة الحماية والتوجيه (`proxy.ts` & `lib/session-token.ts`)
- يعمل الـ `proxy.ts` كـ Middle Layer يفحص صلاحيات التوكين المشفر قبل وصول أي طلب للمسارات المحمية مثل `/admin` أو `/dashboard`.
- التشفير يعتمد على معيار HS256 عبر مكتبة `jose` دون تخزين بيانات حساسة في الـ Payload.

### ج. طبقة الخدمات وقواعد البيانات (`lib/actions/` & `lib/db.ts`)
- تُنفذ كافة كتابات واستعلامات البيانات الحساسة عبر Server Actions المباشرة والمعزولة في السيرفر.
- مجمع الاتصالات `db.ts` يعتمد على `mysql2/promise` مع إدارة تلقائية للـ Connection Pool ومنع تسريب الاستعلامات (SQL Injection Prevention).

### د. حزم التقييم المعزولة (`packages/`)
- تم فصل خوارزميات حساب نقاط الموثوقية وتقييم المهارات في حزم مستقلة (`packages/scoring` و `packages/skills`) لضمان سهولة إعادة الاستخدام في أنظمة خارجية أو الخدمات الخلفية.
