import os
import subprocess
import sys

# Set stdout encoding
sys.stdout.reconfigure(encoding='utf-8')

# Paths
EDGE_PATH = r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe"
BASE_DIR = r"d:\libs\1\Scora"
DOCS_DIR = os.path.join(BASE_DIR, "docs")
HTML_DIR = os.path.join(DOCS_DIR, "_html")

os.makedirs(HTML_DIR, exist_ok=True)

# Common Scora CSS Header template
COMMON_STYLE = """
<style>
  @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&family=Tajawal:wght@400;500;700&family=JetBrains+Mono:wght@400;500;700&family=Outfit:wght@500;700;800&display=swap');

  :root {
    --primary: #006b2c;
    --primary-dark: #0e6d3b;
    --primary-light: #f0faf3;
    --primary-accent: #48c779;
    --dark-bg: #0e160f;
    --panel-bg: #f5fbf7;
    --line: #d6e3d9;
    --text-main: #0e160f;
    --text-muted: #576b5c;
  }

  * { box-sizing: border-box; }

  body {
    font-family: 'Tajawal', 'Cairo', system-ui, sans-serif;
    color: var(--text-main);
    background-color: #ffffff;
    margin: 0;
    padding: 0;
    direction: rtl;
    line-height: 1.6;
    -webkit-print-color-adjust: exact;
  }

  .scora-header {
    background: linear-gradient(135deg, #0e160f 0%, #004021 60%, #006b2c 100%);
    color: #ffffff;
    padding: 30px 40px;
    border-bottom: 5px solid var(--primary-accent);
  }

  .scora-header h1 {
    font-family: 'Cairo', sans-serif;
    font-size: 24px;
    font-weight: 800;
    margin: 0 0 6px 0;
    color: #ffffff;
  }

  .scora-header p {
    font-size: 13px;
    color: #a9e9bf;
    margin: 0;
  }

  .scora-badge-bar {
    display: flex;
    gap: 10px;
    margin-top: 14px;
  }

  .scora-badge {
    background: rgba(255, 255, 255, 0.15);
    border: 1px solid rgba(255, 255, 255, 0.25);
    padding: 4px 12px;
    border-radius: 20px;
    font-size: 11px;
    font-family: 'Outfit', sans-serif;
    color: #d4f5de;
    font-weight: 600;
  }

  .container {
    padding: 28px 40px;
  }

  h2 {
    font-family: 'Cairo', sans-serif;
    font-size: 18px;
    font-weight: 800;
    color: var(--primary);
    border-right: 4px solid var(--primary);
    padding-right: 12px;
    margin-top: 26px;
    margin-bottom: 12px;
  }

  h3 {
    font-family: 'Cairo', sans-serif;
    font-size: 14px;
    font-weight: 700;
    color: #2a352d;
    margin-top: 16px;
    margin-bottom: 8px;
  }

  .scora-card {
    background: var(--panel-bg);
    border: 1px solid var(--line);
    border-radius: 10px;
    padding: 16px 20px;
    margin-bottom: 18px;
  }

  table {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 12px;
  }

  th {
    background-color: var(--dark-bg);
    color: #ffffff;
    font-family: 'Cairo', sans-serif;
    font-weight: 700;
    padding: 9px 12px;
    text-align: right;
  }

  td {
    padding: 9px 12px;
    border-bottom: 1px solid var(--line);
    vertical-align: top;
  }

  tr:nth-child(even) {
    background-color: #f0faf3;
  }

  pre, code {
    font-family: 'JetBrains Mono', monospace;
    font-size: 11px;
    direction: ltr;
    text-align: left;
  }

  pre {
    background: #0e160f;
    color: #a9e9bf;
    padding: 14px;
    border-radius: 8px;
    overflow-x: auto;
    border: 1px solid #004021;
    white-space: pre-wrap;
  }

  .method-badge {
    display: inline-block;
    padding: 3px 8px;
    border-radius: 4px;
    font-family: 'Outfit', sans-serif;
    font-weight: 700;
    font-size: 10px;
    text-transform: uppercase;
  }
  .method-get { background: #d0e3ff; color: #186eca; }
  .method-post { background: #d4f5de; color: #0e6d3b; }
  .method-patch { background: #fff3cd; color: #9a6500; }
  .method-delete { background: #fde8e8; color: #ad2929; }

  .scora-footer {
    text-align: center;
    font-size: 11px;
    color: var(--text-muted);
    border-top: 1px solid var(--line);
    padding-top: 14px;
    margin-top: 36px;
  }
</style>
"""

# HTML 1: PROJECT_STRUCTURE.html
HTML_PROJECT_STRUCTURE = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Scora V0.1 — Project Structure & Architecture</title>
  {COMMON_STYLE}
</head>
<body>
  <div class="scora-header">
    <h1>SCORA V0.1 — الهيكل التنظيمي والمعماري للمشروع</h1>
    <p>دليل المعمارية وتقسيم الحزم والمجلدات لمنصة تقييم المطورين والموثوقية البرمجية</p>
    <div class="scora-badge-bar">
      <span class="scora-badge">Version: v0.1.0</span>
      <span class="scora-badge">Architecture: Monorepo + App Router</span>
      <span class="scora-badge">Target: Next.js 16 + MySQL</span>
    </div>
  </div>

  <div class="container">
    <div class="scora-card">
      <h3>نظرة عامة على تقسيم المساق والمونوريبو</h3>
      <p>تعتمد منصة Scora V0.1 على معمارية هجينة تعزل المحركات الحسابية (Scoring Engine & Trust Ledger) داخل حزم المونوريبو المعزولة <code>packages/</code> بينما تدير الواجهات التفاعلية وخوادم العمليات داخل <code>app/</code> و <code>lib/</code>.</p>
    </div>

    <h2>الهيكل العام للمجلدات (Root Directory Map)</h2>
    <pre>
Scora-V0.1/
├── .github/workflows/         # خطوط البناء والتحقق التلقائي (CI/CD Pipelines)
│   ├── ci.yml                 # فحص TypeScript وجودة الكود البنائي
│   └── deploy.yml             # فحص جاهزية المتغيرات البيئية للنشر
├── app/                       # مسارات التطبيق (Next.js 16 App Router)
│   ├── (auth)/                # شاشات التسجيل وتأكيد الدخول
│   ├── admin/                 # لوحة التحكم والإدارة الفنية
│   ├── api/                   # مسارات الـ REST API Endpoints
│   ├── developer-assessment/  # شاشة اختبار وتقييم المطور بـ AI Engine
│   ├── projects/              # سوق المشاريع والعروض
│   ├── dashboard/             # لوحة التفاعل الشخصية
│   └── globals.css            # رموز التصميم والهوية البصرية (Design Tokens)
├── components/                # مكونات الواجهات Reusable UI Components
│   ├── auth/                  # شبكات التسجيل
│   ├── landing/               # مكونات الواجهة الرئيسية
│   └── ai-assistant-ssd.tsx   # المساعد الذكي التفاعلي
├── docs/                      # توثيق وسجلات البروجيكت الفنية
│   ├── schema.dbml            # مخطط DBML لـ dbdiagram.io
│   ├── PROJECT_STRUCTURE.md   # شرح معمارية المجلدات
│   ├── ENVIRONMENT_SETUP.md   # دليل البيئة والتثبيت
│   ├── API_DOCUMENTATION.md   # توثيق مسارات API
│   └── DATABASE_SCHEMA.md     # دليل الجداول والمؤشرات
├── lib/                       # الطبقة الخدمية ومنطق الأعمال (Core Business Logic)
│   ├── actions/               # خوادم العمليات المعزولة (Server Actions)
│   ├── dal.ts                 # طبقة الوصول للبيانات وحماية الجلسات (DAL)
│   ├── db.ts                  # مجمع الاتصالات التزامني (MySQL Connection Pool)
│   └── openrouter.ts          # ممر التكامل مع نماذج الذكاء الاصطناعي
├── packages/                  # حزم الأنظمة الفرعية (Subsystem Monorepo)
│   ├── core/                  # الأنواع والواجهات الأساسية
│   ├── scoring/               # محرك حساب درجات السكورا والموثوقية
│   ├── skills/                # نظام تقييم المهارات وحساب الـ SP
│   └── storage/               # حزمة الـ Schemas المعزولة
├── proxy.ts                   # توجيه وحماية الجلسات في Edge Runtime
└── scripts/                   # سكربتات التهيئة والـ Migrations
    ├── migrate.js             # تهيئة الجداول الأساسية
    └── migrate-v8.js          # تهيئة جداول الـ AI والـ Trust Events
    </pre>

    <h2>طبقات المعمارية وتقسيم المسؤوليات</h2>
    <table>
      <thead>
        <tr>
          <th>الطبقة (Layer)</th>
          <th>المسار / المجلد</th>
          <th>الوظيفة والمسؤولية</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><b>Presentation Layer</b></td>
          <td><code>app/</code> & <code>components/</code></td>
          <td>تقديم الواجهات باستخدام Server Components للأداء وشاشات التفاعل (Client Components).</td>
        </tr>
        <tr>
          <td><b>Security & Edge Proxy</b></td>
          <td><code>proxy.ts</code> & <code>lib/session.ts</code></td>
          <td>فحص التوكين المشفر بـ JOSE قبل السماح بالوصول للمسارات المحمية <code>/admin</code>.</td>
        </tr>
        <tr>
          <td><b>Server Actions Layer</b></td>
          <td><code>lib/actions/</code></td>
          <td>تنفيذ كافة كتابات البيانات واستعلاماتها مباشرة في السيرفر مع فحص الـ DAL.</td>
        </tr>
        <tr>
          <td><b>Data Access Layer (DAL)</b></td>
          <td><code>lib/dal.ts</code> & <code>lib/db.ts</code></td>
          <td>إدارة مجمع اتصالات MySQL ومجانية التسريب ومنع SQL Injection.</td>
        </tr>
        <tr>
          <td><b>Subsystem Monorepo</b></td>
          <td><code>packages/</code></td>
          <td>فصل خوارزميات التقييم وسجلات الثقة في حزم مستقلة قابلة لإعادة الاستخدام.</td>
        </tr>
      </tbody>
    </table>

    <div class="scora-footer">
      Scora V0.1 Architectural Documentation — Produced for Repository Distribution
    </div>
  </div>
</body>
</html>
"""

# HTML 2: DATABASE_SCHEMA.html
HTML_DATABASE_SCHEMA = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Scora V0.1 — Database Schema & DBML</title>
  {COMMON_STYLE}
</head>
<body>
  <div class="scora-header">
    <h1>SCORA V0.1 — مخطط وهيكل قواعد البيانات (Database Schema)</h1>
    <p>التصميم الهيكلي لجداول MySQL والعلاقات والقيود وكود DBML المباشر لـ dbdiagram.io</p>
    <div class="scora-badge-bar">
      <span class="scora-badge">Engine: MySQL 8.0+ / MariaDB</span>
      <span class="scora-badge">Format: DBML Standard</span>
      <span class="scora-badge">ERD Ready: dbdiagram.io</span>
    </div>
  </div>

  <div class="container">
    <div class="scora-card">
      <h3>رابط كود DBML التفاعلي (`docs/schema.dbml`)</h3>
      <p>يمكنك نسخ محتوى الملف <code>docs/schema.dbml</code> ولصقه فوراً في موقع <a href="https://dbdiagram.io/" target="_blank">https://dbdiagram.io/</a> لرسم المخطط البياني التفاعلي الكامل لجداول المنصة.</p>
    </div>

    <h2>جدول تفاصيل الجداول والأعمدة الأساسية</h2>
    <table>
      <thead>
        <tr>
          <th>اسم الجدول</th>
          <th>الأعمدة الرئيسية (Primary & Foreign Keys)</th>
          <th>الوظيفة والقيود (Constraints & Indexes)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>users</code></td>
          <td><code>id (PK)</code>, <code>email (UQ)</code>, <code>password_hash</code>, <code>role</code>, <code>is_admin</code></td>
          <td>جدول المستخدمين الأساسي. دور الحساب إما <code>developer</code> أو <code>client</code>.</td>
        </tr>
        <tr>
          <td><code>developers</code></td>
          <td><code>id (PK)</code>, <code>user_id (FK -> users.id, UQ)</code>, <code>trust_score</code>, <code>skill_points</code></td>
          <td>ملف المطور والتصنيف ورتبة السكورا ومراحل اعتماد الـ AI والـ Admin.</td>
        </tr>
        <tr>
          <td><code>clients</code></td>
          <td><code>id (PK)</code>, <code>user_id (FK -> users.id, UQ)</code>, <code>company_name</code></td>
          <td>ملف العميل وصاحب العمل الشارع للمشاريع.</td>
        </tr>
        <tr>
          <td><code>skills</code> & <code>developer_skills</code></td>
          <td><code>developer_id (FK)</code>, <code>skill_id (FK)</code>, <code>level</code>, <code>sp</code></td>
          <td>ربط المطورين بالمهارات المكتسبة مع تحديد نقاط الـ SP ومستوى الخبرة.</td>
        </tr>
        <tr>
          <td><code>projects</code></td>
          <td><code>id (PK)</code>, <code>client_id (FK -> clients.id)</code>, <code>status</code>, <code>budget_from/to</code></td>
          <td>المشاريع المعلنة وحالتها (<code>open</code>, <code>in_progress</code>, <code>completed</code>).</td>
        </tr>
        <tr>
          <td><code>proposals</code></td>
          <td><code>id (PK)</code>, <code>project_id (FK)</code>, <code>developer_id (FK)</code>, <code>price</code></td>
          <td>عروض المطورين المقدمة على المشاريع المفتوحة.</td>
        </tr>
        <tr>
          <td><code>developer_assessment_sessions</code></td>
          <td><code>id (PK)</code>, <code>public_id (UQ)</code>, <code>developer_id (FK)</code>, <code>score</code></td>
          <td>جلسات اختبارات وتقييمات المطورين بالذكاء الاصطناعي.</td>
        </tr>
        <tr>
          <td><code>trust_events</code></td>
          <td><code>id (PK)</code>, <code>event_id (UQ)</code>, <code>developer_id (FK)</code>, <code>event_hash</code></td>
          <td>سجل أحداث الموثوقية التراكمي المشفر لمنع تلاعب الدرجات.</td>
        </tr>
      </tbody>
    </table>

    <h2>مقتطف كود DBML الجاهز لـ dbdiagram.io</h2>
    <pre>
// Scora V0.1 — Database Schema DBML (for dbdiagram.io)
Table users {{
  id bigint [pk, increment]
  email varchar(255) [not null, unique]
  password_hash varchar(255) [not null]
  full_name varchar(255) [not null]
  role EnumRole [not null, default: 'client']
  is_admin tinyint(1) [not null, default: 0]
}}

Table developers {{
  id bigint [pk, increment]
  user_id bigint [not null, unique, ref: - users.id]
  trust_score int [not null, default: 50]
  skill_points int [not null, default: 0]
  approval_status EnumApprovalStatus [not null, default: 'profile_incomplete']
}}

Ref: developers.user_id - users.id [delete: cascade]
Ref: projects.client_id > clients.id [delete: cascade]
Ref: proposals.project_id > projects.id [delete: cascade]
Ref: proposals.developer_id > developers.id [delete: cascade]
    </pre>

    <div class="scora-footer">
      Scora V0.1 Database Documentation — Produced for Repository Distribution
    </div>
  </div>
</body>
</html>
"""

# HTML 3: API_ENDPOINTS.html
HTML_API_ENDPOINTS = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Scora V0.1 — API Endpoints & Server Actions</title>
  {COMMON_STYLE}
</head>
<body>
  <div class="scora-header">
    <h1>SCORA V0.1 — توثيق الـ API ومسارات النظام (API Endpoints)</h1>
    <p>دليل شامل لمسارات الـ REST API وخوادم العمليات المباشرة Server Actions مع نموذج الحماية</p>
    <div class="scora-badge-bar">
      <span class="scora-badge">Auth: JOSE Stateless JWT</span>
      <span class="scora-badge">Format: JSON REST + Server Actions</span>
      <span class="scora-badge">Validation: Zod Schema</span>
    </div>
  </div>

  <div class="container">
    <h2>1. مسارات الـ REST API Endpoints (`app/api/*`)</h2>
    <table>
      <thead>
        <tr>
          <th>المسار (Endpoint Route)</th>
          <th>النوع (Method)</th>
          <th>الصلاحيات (Access)</th>
          <th>الوصف وبيانات الطلب (Description & Payload)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>/api/admin/stats</code></td>
          <td><span class="method-badge method-get">GET</span></td>
          <td>Admin Only</td>
          <td>جلب إحصائيات المنصة الكاملة (عدد المطورين، العملاء، التقييمات، السكورا).</td>
        </tr>
        <tr>
          <td><code>/api/admin/developers</code></td>
          <td><span class="method-badge method-get">GET</span></td>
          <td>Admin Only</td>
          <td>قائمة المطورين مع إمكانية الفلترة بحالة الاعتماد والدرجة.</td>
        </tr>
        <tr>
          <td><code>/api/admin/settings</code></td>
          <td><span class="method-badge method-get">GET</span> / <span class="method-badge method-post">POST</span></td>
          <td>Admin Only</td>
          <td>قراءة وتحديث إعدادات OpenRouter AI وهيكل المنصة.</td>
        </tr>
        <tr>
          <td><code>/api/developer-assessment/session</code></td>
          <td><span class="method-badge method-post">POST</span></td>
          <td>Developer</td>
          <td>إنشاء جلسة تقييم تفاعلية بالذكاء الاصطناعي وبناء الأسئلة.</td>
        </tr>
        <tr>
          <td><code>/api/developer-assessment/submit</code></td>
          <td><span class="method-badge method-post">POST</span></td>
          <td>Developer</td>
          <td>إرسال الإجابة وتقييمها بـ AI Engine واحتساب النقاط.</td>
        </tr>
        <tr>
          <td><code>/api/notifications</code></td>
          <td><span class="method-badge method-get">GET</span> / <span class="method-badge method-patch">PATCH</span></td>
          <td>Auth User</td>
          <td>استرجاع وتحديث حالة قراءة الإشعارات اللحظية.</td>
        </tr>
      </tbody>
    </table>

    <h2>2. خوادم العمليات (Server Actions — `lib/actions/*`)</h2>
    <table>
      <thead>
        <tr>
          <th>اسم الدالة (Action Name)</th>
          <th>الملف (Source File)</th>
          <th>المدخلات (Parameters)</th>
          <th>الوظيفة والنتائج (Functionality)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td><code>registerAction</code></td>
          <td><code>lib/actions/auth.ts</code></td>
          <td><code>email, password, full_name, role</code></td>
          <td>تسجيل حساب جديد وتشفير كلمة المرور وإنشاء الجلسة.</td>
        </tr>
        <tr>
          <td><code>loginAction</code></td>
          <td><code>lib/actions/auth.ts</code></td>
          <td><code>email, password</code></td>
          <td>المصادقة وتأكيد التوكين في الكوكيز وتوجيه المستخدم.</td>
        </tr>
        <tr>
          <td><code>completeDeveloperOnboarding</code></td>
          <td><code>lib/actions/profile.ts</code></td>
          <td><code>job_title, headline, bio, skills</code></td>
          <td>إكمال ملف المطور والانتقال لمرحلة التقييم بالـ AI.</td>
        </tr>
        <tr>
          <td><code>createProjectAction</code></td>
          <td><code>lib/actions/profile.ts</code></td>
          <td><code>title, description, budget, skills</code></td>
          <td>إضافة مشروع جديد في سوق المشاريع بواسطة العميل.</td>
        </tr>
        <tr>
          <td><code>reviewDeveloperAction</code></td>
          <td><code>lib/actions/admin.ts</code></td>
          <td><code>developerId, decision, reason</code></td>
          <td>اعتماد أو رفض طلب انضمام مطور من شاشة الأدمن.</td>
        </tr>
      </tbody>
    </table>

    <div class="scora-footer">
      Scora V0.1 API Documentation — Produced for Repository Distribution
    </div>
  </div>
</body>
</html>
"""

# HTML 4: ARCHITECTURE_EXPLANATION.html
HTML_ARCHITECTURE_EXPLANATION = f"""<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
  <meta charset="UTF-8">
  <title>Scora V0.1 — Architecture Explanation</title>
  {COMMON_STYLE}
</head>
<body>
  <div class="scora-header">
    <h1>SCORA V0.1 — التقرير المعماري والأنظمة الفرعية (Architecture Explanation)</h1>
    <p>شرح معماري كامل لهيكل النظام، خوارزميات التقييم، أمان الجلسات والتكامل مع الذكاء الاصطناعي</p>
    <div class="scora-badge-bar">
      <span class="scora-badge">Framework: Next.js 16 App Router</span>
      <span class="scora-badge">AI Model: OpenRouter Engine</span>
      <span class="scora-badge">Scoring: Scora Trust Ledger</span>
    </div>
  </div>

  <div class="container">
    <div class="scora-card">
      <h3>الهدف المعماري لمنصة Scora</h3>
      <p>تم تصميم منصة Scora V0.1 لحل مشكلة التقييم التقليدي للمطورين، عبر تقديم بيئة موثوقة تعتمد على الذكاء الاصطناعي لاختبار قدرات المطور البرمجية وسجل موثوقية مشفر (Trust Ledger) يضمن عدم التلاعب بالنتائج.</p>
    </div>

    <h2>1. المعمارية الهيكلية (Monorepo & App Router Boundary)</h2>
    <p>تستخدم المنصة تقسيم هجين يجمع بين مرونة Next.js App Router وقوة حزم المونوريبو المعزولة:</p>
    <ul>
      <li><b>React Server Components (RSC):</b> تقديم الشاشات الثابتة ولوحات التفاعل بسرعة فائقة وبدون إرسال JavaScript زائد للعميل.</li>
      <li><b>Client Components (`"use client"`):</b> النماذج التفاعلية وشاشات التقييم المباشر واختبارات الـ AI.</li>
      <li><b>Data Access Layer (DAL):</b> طبقة معزولة داخل <code>lib/dal.ts</code> تمنع استعلام قواعد البيانات إلا بعد فحص صلاحية التوكين المشفر.</li>
      <li><b>Subsystem Monorepo (`packages/`):</b> فصل خوارزميات حساب النقاط والمهارات في حزم مستقلة (<code>packages/scoring</code>, <code>packages/skills</code>).</li>
    </ul>

    <h2>2. محرك التقييم بالذكاء الاصطناعي (OpenRouter AI Pipeline)</h2>
    <div class="scora-card">
      <ol>
        <li>يقوم المطور ببدء جلسة التقييم عبر <code>startAssessmentSession()</code>.</li>
        <li>يقوم نظام <code>lib/openrouter.ts</code> بإرسال طلب نموذج OpenRouter AI لإنشاء أسئلة برمجية مخصصة بناءً على مهارات المطور.</li>
        <li>يتم حفظ الأسئلة والجلسة في جداول <code>developer_assessment_sessions</code> و <code>questions</code>.</li>
        <li>عند إجابة المطور، يقوم محرك الـ AI بتحليل الإجابة لحظياً وتقييم جودتها وتوليد ملاحظات فنية (AI Feedback).</li>
        <li>تُحتسب درجات الـ SP والـ Trust Score بناءً على نتائج التقييم المحققة.</li>
      </ol>
    </div>

    <h2>3. سجل أحداث الموثوقية المشفر (Cryptographic Trust Ledger)</h2>
    <p>تتضمن المنصة جدول <code>trust_events</code> الذي يعمل كسجل مشفر (Append-Only Cryptographic Ledger):</p>
    <pre>
event_hash = SHA256( event_id + session_public_id + payload_json + previous_hash )
    </pre>
    <p>يضمن هذا التسلسل عدم قدرة أي طرف على تعديل نتائج التقييم أو تزوير درجات المطورين بعد صدورها.</p>

    <div class="scora-footer">
      Scora V0.1 Architecture Document — Produced for Repository Distribution
    </div>
  </div>
</body>
</html>
"""

def generate_pdf(html_content, html_filename, pdf_filename):
    html_path = os.path.join(HTML_DIR, html_filename)
    pdf_path = os.path.join(DOCS_DIR, pdf_filename)
    
    with open(html_path, "w", encoding="utf-8") as f:
        f.write(html_content)
        
    print(f"Generating PDF for {pdf_filename}...")
    
    cmd = [
        EDGE_PATH,
        "--headless",
        "--disable-gpu",
        "--no-pdf-header-footer",
        f"--print-to-pdf={pdf_path}",
        f"file:///{html_path.replace('\\', '/')}"
    ]
    
    result = subprocess.run(cmd, capture_output=True, text=True)
    if os.path.exists(pdf_path):
        print(f"Success: created {pdf_filename} ({os.path.getsize(pdf_path)} bytes)")
    else:
        print(f"Error generating {pdf_filename}: {result.stderr}")

def main():
    generate_pdf(HTML_PROJECT_STRUCTURE, "project_structure.html", "PROJECT_STRUCTURE.pdf")
    generate_pdf(HTML_DATABASE_SCHEMA, "database_schema.html", "DATABASE_SCHEMA.pdf")
    generate_pdf(HTML_API_ENDPOINTS, "api_endpoints.html", "API_ENDPOINTS.pdf")
    generate_pdf(HTML_ARCHITECTURE_EXPLANATION, "architecture_explanation.html", "ARCHITECTURE_EXPLANATION.pdf")

if __name__ == "__main__":
    main()
