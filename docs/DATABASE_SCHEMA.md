# Scora V0.1 - التوثيق الفني لهيكل قاعدة البيانات والجداول (Database Schema & Relations Reference)

يوضح هذا المستند التصميم الهيكلي لقواعد البيانات MySQL/MariaDB في منصة Scora V0.1، العلاقات بين الجداول (Foreign Keys)، القيود (Constraints)، وسجل التحديثات الهيكلية (Migration History).

---

## 1. مخطط العلاقات بين الجداول (Entity-Relationship Overview)

```text
+-------------------+        +--------------------+
|       users       | 1 --- 1|     developers     |
+-------------------+        +--------------------+
| id (PK)           |        | id (PK)            |
| email             |        | user_id (FK)       |
| password_hash     |        | trust_score        |
| role              |        | skill_points       |
| status            |        +--------------------+
+-------------------+                  |
          |                            | 1
          | 1                          |
          |                            v N
          v 1                +--------------------+
+-------------------+        |  developer_skills  |
|      clients      |        +--------------------+
+-------------------+        | developer_id (FK)  |
| id (PK)           |        | skill_id (FK)      |
| user_id (FK)      |        +--------------------+
+-------------------+
          |
          | 1
          v N
+-------------------+        +--------------------+
|     projects      | 1 --- N|     proposals      |
+-------------------+        +--------------------+
| id (PK)           |        | id (PK)            |
| client_id (FK)    |        | project_id (FK)    |
| status            |        | developer_id (FK)  |
+-------------------+        +--------------------+
```

---

## 2. تفاصيل الجداول والأعمدة (Table Definitions)

### أ. جدول المستخدمين (`users`)
يخزن الحسابات الفعالة ورتب الصلاحيات الأساسية.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `email` VARCHAR(255) UNIQUE NOT NULL
- `password_hash` VARCHAR(255) NOT NULL
- `full_name` VARCHAR(255) NOT NULL
- `phone` VARCHAR(50) NULL
- `role` ENUM('developer', 'client', 'admin') DEFAULT 'developer'
- `status` ENUM('active', 'suspended', 'banned') DEFAULT 'active'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### ب. جدول المطورين (`developers`)
يخزن تفاصيل المطور البرمجي، النقاط، ودرجة السكورا والموثوقية.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT UNIQUE NOT NULL (FK -> users.id ON DELETE CASCADE)
- `display_name` VARCHAR(255) NOT NULL
- `job_title` VARCHAR(255) NULL
- `bio` TEXT NULL
- `location` VARCHAR(255) NULL
- `availability` ENUM('available', 'busy', 'soon') DEFAULT 'available'
- `trust_score` INT DEFAULT 100
- `skill_points` INT DEFAULT 0
- `admission_status` ENUM('pending', 'approved', 'rejected') DEFAULT 'pending'

### ج. جدول العملاء (`clients`)
يخزن بيانات العميل وصاحب العمل.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `user_id` INT UNIQUE NOT NULL (FK -> users.id ON DELETE CASCADE)
- `display_name` VARCHAR(255) NOT NULL
- `company_name` VARCHAR(255) NULL
- `website` VARCHAR(500) NULL
- `location` VARCHAR(255) NULL

### د. جدول المشاريع (`projects`)
يخزن المشاريع المعلنة من قبل العملاء.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `client_id` INT NOT NULL (FK -> clients.id ON DELETE CASCADE)
- `title` VARCHAR(255) NOT NULL
- `category` VARCHAR(100) NULL
- `description` TEXT NOT NULL
- `budget_from` INT DEFAULT 0
- `budget_to` INT DEFAULT 0
- `deadline_days` INT DEFAULT 7
- `status` ENUM('open', 'in_progress', 'completed', 'closed') DEFAULT 'open'
- `posted_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

### هـ. جدول العروض المقدمة (`proposals`)
يخزن العروض البرمجية المقدمة من المطورين على المشاريع.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `project_id` INT NOT NULL (FK -> projects.id ON DELETE CASCADE)
- `developer_id` INT NOT NULL (FK -> developers.id ON DELETE CASCADE)
- `price` INT NOT NULL
- `delivery_days` INT NOT NULL
- `cover_text` TEXT NOT NULL
- `status` ENUM('pending', 'accepted', 'rejected', 'withdrawn') DEFAULT 'pending'
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
- UNIQUE KEY `unique_dev_project` (`project_id`, `developer_id`)

### و. جدول التقييمات والـ AI (`developer_assessments`)
يخزن سجل نتائج الاختبارات وتحليلات الـ AI لمهارات المطورين.
- `id` INT AUTO_INCREMENT PRIMARY KEY
- `developer_id` INT NOT NULL (FK -> developers.id ON DELETE CASCADE)
- `category` VARCHAR(100) NOT NULL
- `score` INT NOT NULL
- `ai_feedback` TEXT NULL
- `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP

---

## 3. سجل السكربتات والتحديثات الهيكلية (Migrations History)

- `scripts/migrate.js`: التأسيس الأولي لجداول المستخدمين، المطورين، العملاء، والمشاريع.
- `scripts/migrate-v2.js`: إضافة الفهارس وحقول حالة الحساب ومدة التوقيف.
- `scripts/migrate-v3.js`: التحديث الهيكلي لقوائم العروض واستعلامات التقييم.
- `scripts/migrate-v4.js` - `scripts/migrate-v7.js`: التوسع في جداول المهارات، الإشعارات، والرسائل.
- `scripts/migrate-v8.js`: التحديث الحالي الخاص بتقييمات الذكاء الاصطناعي وإعدادات OpenRouter وبوابة اعتماد المطورين.
