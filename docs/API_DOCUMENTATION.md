# Scora V0.1 - التوثيق الفني الكامل للـ API و Server Actions (API Documentation & Server Actions Reference)

يقدم هذا التوثيق مرجعاً شاملاً لكافة مسارات الـ REST API والـ Server Actions المتاحة داخل منصة Scora V0.1، مع توضيح صيغ الطلبات (Request Headers / Payloads)، الاستجابات المتوقعة (Response Schemas)، وأكواد الأخطاء.

---

## 1. معايير المصادقة ونموذج الاستجابة القياسي (Auth & Standards)

### أ. إدارة الجلسات والصلاحيات (Session Cookie)
تعتمد جميع المسارات المحمية على JWT Session Cookie باسم `scora_session` يتم تشفيره وإدارته عبر الخادم.
- **Header:** `Cookie: scora_session=<JWT_TOKEN>`
- **Content-Type:** `application/json`

### ب. هيكل الاستجابة القياسي في حال الأخطاء (Error Response Schema)
```json
{
  "ok": false,
  "error": "وصف الخطأ الفني باللغة العربية",
  "fieldErrors": {
    "fieldName": ["رسالة الخطأ التفصيلية"]
  }
}
```

---

## 2. مسارات خدمات الإدارة والتحليلات (Admin & Analytics REST APIs)

### `GET /api/admin/users`
جلب قائمة المستخدمين المسجلين في النظام مع بيانات الصلاحيات والسكورا.
- **Access Level:** Admin Only
- **Response 200 OK:**
```json
{
  "users": [
    {
      "id": "1",
      "name": "أحمد محمود",
      "email": "ahmed@example.com",
      "role": "developer",
      "skillPoints": 120,
      "trustScore": 95,
      "status": "active",
      "joinDate": "12 أغسطس 2026"
    }
  ]
}
```

### `GET /api/admin/stats`
جلب الإحصائيات التجميعية الحية لمنصة سكورا من قاعدة البيانات.
- **Access Level:** Admin Only
- **Response 200 OK:**
```json
{
  "totalUsers": 48,
  "developersCount": 32,
  "clientsCount": 16,
  "totalProjects": 12,
  "openProjects": 8,
  "systemStatus": "healthy"
}
```

### `GET /api/admin/projects`
جلب قوائم المشاريع وإحصائيات العروض المقدمة.
- **Access Level:** Admin Only
- **Response 200 OK:**
```json
{
  "projects": [
    {
      "id": "5",
      "title": "تطوير تطبيق منصة تعليمية",
      "clientName": "شركة التقنية الذكية",
      "budget": "25,000 ج.م - 40,000 ج.م",
      "status": "open",
      "proposalsCount": 4
    }
  ]
}
```

### `POST /api/admin/ai-settings`
تحديث إعدادات وتكوين محرك الذكاء الاصطناعي و OpenRouter.
- **Access Level:** Admin Only
- **Request Payload:**
```json
{
  "aiAssistantBaseUrl": "https://openrouter.ai/api/v1",
  "aiAssistantApiKey": "sk-or-v1-key...",
  "trustEngineModel": "anthropic/claude-3.5-sonnet",
  "baseTrustPoints": 15
}
```
- **Response 200 OK:**
```json
{
  "ok": true,
  "message": "تم حفظ إعدادات محرك الذكاء الاصطناعي بنجاح"
}
```

### `POST /api/analytics/visit`
تسجيل زيارات الصفحات وتحليلات الاستخدام.
- **Access Level:** Public / All Users
- **Request Payload:**
```json
{
  "path": "/projects",
  "referrer": "https://google.com"
}
```
- **Response 200 OK:**
```json
{
  "recorded": true
}
```

---

## 3. مسارات التنبيهات والمصادقة (Auth & Notifications APIs)

### `GET /api/notifications`
جلب قائمة التنبيهات اللحظية للمستخدم الحالي.
- **Access Level:** Authenticated User (Developer / Client / Admin)
- **Response 200 OK:**
```json
{
  "notifications": [
    {
      "id": "101",
      "title": "تم قبول عرضك",
      "message": "تم اختيار عرضك للمشروع تطوير منصة تعليمية",
      "createdAt": "2026-08-12T14:30:00Z",
      "read": false
    }
  ]
}
```

### `POST /api/auth/logout`
إنهاء الجلسة وتدمير الكوكي المشفر في السيرفر.
- **Access Level:** Authenticated User
- **Response 200 OK:**
```json
{
  "ok": true,
  "redirectTo": "/login"
}
```

---

## 4. مرجع خوادم العمليات (Server Actions API Reference)

### أ. خدمات المصادقة (`lib/actions/auth.ts`)

#### `register(_prev, formData)`
إنشاء حساب جديد للمطور أو العميل وتسجيل بياناته في MySQL.
- **Inputs:** `fullName`, `email`, `phone`, `password`, `role` (`developer` | `client`).
- **Returns:** `{ ok: true, role, redirectTo }` أو `{ ok: false, error }`.

#### `login(_prev, formData)`
التحقق من بيانات الدخول وإنشاء جلسة JWT مشفرة.
- **Inputs:** `email`, `password`.
- **Returns:** `{ ok: true, role, redirectTo }` أو `{ ok: false, error }`.

#### `changePassword(currentPassword, newPassword)`
تحديث كلمة المرور للمستخدم الحالي بعد التأكد من الجلسة.
- **Inputs:** `currentPassword`, `newPassword`.
- **Returns:** `{ ok: true }` أو `{ ok: false, error }`.

---

### ب. خدمات الجلسات والملفات الشخصية (`lib/actions/user-session.ts` & `lib/actions/profile.ts`)

#### `syncUserSessionWithDb()`
مزامنة وتحديث حالة الجلسة لحظياً وقراءة البيانات من جدول `users` بـ MySQL.
- **Returns:** `UserDbSessionResult` تحتوي على الهوية، الرتبة، تفاصيل المطور أو العميل.

#### `updateDeveloperProfile(_prev, formData)`
تحديث بيانات الملف الشخصي للمطور (المسمى الوظيفي، النبذة، المهارات، الروابط).

#### `createProject(_prev, formData)`
نشر مشروع جديد بواسطة حساب عميل.
- **Inputs:** `title`, `category`, `description`, `budgetFrom`, `budgetTo`, `deadlineDays`, `skills`.

#### `submitProposal(input)`
تقديم عرض جديد بواسطة مطور على مشروع مفتوح.
- **Inputs:** `{ projectId, amount, deliveryDays, coverLetter }`.
- **Returns:** `{ ok: true, proposal }` أو `{ ok: false, error }`.

---

### ج. خدمات تقييم المطورين والـ AI (`lib/actions/developer-assessment.ts`)

#### `submitDeveloperAssessment(input)`
إرسال استجابات المطور لاختبار المهارات والملاءمة وتحليلها بواسطة نموذج الذكاء الاصطناعي OpenRouter لحساب نقاط السكورا.
- **Inputs:** `{ developerId, answers, assessmentCategory }`.
- **Returns:** `{ ok: true, scoreResult: { trustScore, skillPoints, aiFeedback } }`.

#### `submitAdmissionDecision(input)`
اعتماد أو رفض طلب انضمام المطور بواسطة أدمن النظام.
- **Inputs:** `{ developerId, decision: "approved" | "rejected", adminNotes }`.
- **Returns:** `{ ok: true }`.
