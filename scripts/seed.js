/**
 * Seed the Scora database with the catalog data and demo records that the
 * pages previously hardcoded.
 *
 * Run: node scripts/seed.js
 * Safe to re-run — rows are upserted by their natural keys.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const SKILLS = [
  ["javascript", "JavaScript", "جافاسكريبت", "language"],
  ["typescript", "TypeScript", "تايب سكريبت", "language"],
  ["python", "Python", "بايثون", "language"],
  ["cpp", "C++", "سي بلس بلس", "language"],
  ["java", "Java", "جافا", "language"],
  ["go", "Go", "جو", "language"],
  ["rust", "Rust", "رست", "language"],
  ["react", "React.js", "رياكت", "framework"],
  ["nextjs", "Next.js", "نكست", "framework"],
  ["vue", "Vue.js", "فيو", "framework"],
  ["nodejs", "Node.js", "نود", "framework"],
  ["express", "Express.js", "إكسبريس", "framework"],
  ["fastapi", "FastAPI", "فاست إيه بي آي", "framework"],
  ["django", "Django", "دجانجو", "framework"],
  ["flutter", "Flutter", "فلاتر", "framework"],
  ["postgresql", "PostgreSQL", "بوستجرس", "database"],
  ["mysql", "MySQL", "ماي إس كيو إل", "database"],
  ["mongodb", "MongoDB", "مونجو", "database"],
  ["redis", "Redis", "ريديس", "database"],
  ["sql", "SQL", "إس كيو إل", "database"],
  ["docker", "Docker", "دوكر", "tool"],
  ["kubernetes", "Kubernetes", "كوبرنيتس", "tool"],
  ["aws", "AWS", "أمازون", "tool"],
  ["git", "Git & GitHub", "جيت", "tool"],
  ["graphql", "GraphQL", "جراف كيو إل", "tool"],
  ["tailwind", "Tailwind CSS", "تيلويند", "tool"],
  ["figma", "Figma", "فيجما", "tool"],
  ["airflow", "Airflow", "إير فلو", "tool"],
  ["pytorch", "PyTorch", "باي تورش", "tool"],
  ["tensorflow", "TensorFlow", "تنسرفلو", "tool"],
];

const DEVELOPERS = [
  {
    email: "mohammed@scora.dev",
    name: "محمد وائل الغنام",
    title: "مهندس برمجيات",
    location: "القاهرة، مصر",
    city: "القاهرة",
    years: 5,
    trust: 92,
    sp: 820,
    verified: 1,
    availability: "available",
    bio: "أبني منتجات ويب قابلة للتوسع وأشرح قراراتي التقنية بوضوح. أفضّل العمل على حلول عملية يمكن صيانتها.",
    github: "https://github.com/mohammed-wael",
    linkedin: "https://linkedin.com/in/mohammed-wael",
    site: "https://mohammed.dev",
    skills: ["react", "typescript", "nodejs", "python"],
  },
  {
    email: "mennah@scora.dev",
    name: "منة حسن",
    title: "مهندسة بيانات",
    location: "الإسكندرية، مصر",
    city: "الإسكندرية",
    years: 4,
    trust: 88,
    sp: 760,
    verified: 1,
    availability: "soon",
    bio: "أعمل على خطوط معالجة البيانات وبناء نماذج التعلم الآلي وتحليل البيانات الضخمة.",
    github: "https://github.com/mennah",
    linkedin: "https://linkedin.com/in/mennah",
    site: "",
    skills: ["python", "sql", "airflow"],
  },
  {
    email: "mabdelhalim@scora.dev",
    name: "محمد عبدالحليم",
    title: "مهندس Backend",
    location: "الجيزة، مصر",
    city: "الجيزة",
    years: 6,
    trust: 95,
    sp: 910,
    verified: 1,
    availability: "available",
    bio: "أصمم أنظمة خلفية موزعة وواجهات برمجة آمنة وعالية الأداء.",
    github: "https://github.com/mabdelhalim",
    linkedin: "https://linkedin.com/in/mabdelhalim",
    site: "",
    skills: ["aws", "nodejs", "go"],
  },
  {
    email: "ahmed.ali@scora.dev",
    name: "أحمد علي محمود",
    title: "Backend & Systems Engineer",
    location: "القاهرة، مصر",
    city: "القاهرة",
    years: 5,
    trust: 88,
    sp: 720,
    verified: 1,
    availability: "busy",
    bio: "متخصص في تحسين أداء قواعد البيانات وبناء الأنظمة الخلفية الآمنة.",
    github: "https://github.com/ahmedali",
    linkedin: "",
    site: "",
    skills: ["nodejs", "postgresql", "docker"],
  },
  {
    email: "mahmoud.hassan@scora.dev",
    name: "محمود حسن سعيد",
    title: "Frontend React Engineer",
    location: "المنصورة، مصر",
    city: "المنصورة",
    years: 4,
    trust: 91,
    sp: 690,
    verified: 1,
    availability: "available",
    bio: "أبني واجهات متجاوبة ودقيقة بصريًا مع اهتمام كبير بالأداء وتجربة المستخدم.",
    github: "https://github.com/mahmoudhassan",
    linkedin: "",
    site: "",
    skills: ["react", "nextjs", "tailwind", "typescript"],
  },
  {
    email: "sara.ibrahim@scora.dev",
    name: "سارة إبراهيم",
    title: "Mobile App Engineer",
    location: "القاهرة، مصر",
    city: "القاهرة",
    years: 3,
    trust: 84,
    sp: 540,
    verified: 0,
    availability: "soon",
    bio: "أطوّر تطبيقات موبايل متعددة المنصات بأداء عالٍ وتجربة استخدام سلسة.",
    github: "https://github.com/saraibrahim",
    linkedin: "",
    site: "",
    skills: ["flutter", "firebase", "java"],
  },
];

const CLIENTS = [
  {
    email: "ahmed.khaled@company.com",
    name: "أحمد خالد",
    company: "Scora Technologies",
    website: "https://company.scora.app",
    location: "القاهرة، مصر",
  },
  {
    email: "info@smart-tech.com",
    name: "شركة التقنية الذكية",
    company: "شركة التقنية الذكية",
    website: "https://smart-tech.example",
    location: "القاهرة، مصر",
  },
  {
    email: "info@digital-innovation.com",
    name: "مؤسسة الابتكار الرقمي",
    company: "مؤسسة الابتكار الرقمي",
    website: "https://digital-innovation.example",
    location: "الإسكندرية، مصر",
  },
];

const PROJECTS = [
  {
    clientEmail: "info@smart-tech.com",
    title: "تطوير لوحة تحكم وتصاميم منصة SaaS تعليمية",
    category: "Full-Stack Web",
    budgetFrom: 15000,
    budgetTo: 25000,
    deadline: 14,
    description:
      "نبحث عن مطور Full-Stack محترف وموثق لبناء لوحة تحكم كاملة لإدارة الاشتراكات والتحليلات والتقييمات الخاصة بمنصة SaaS تعليمية. يشمل العمل تصميم الواجهات المتجاوبة، ربط API السيرفر، وتوفير بيئة تشغيل آمنة وسريعة.",
    skills: ["Next.js", "TypeScript", "Tailwind CSS"],
  },
  {
    clientEmail: "info@digital-innovation.com",
    title: "ربط بوابة دفع إلكترونية وتكامل واجهات API",
    category: "Backend",
    budgetFrom: 8000,
    budgetTo: 12000,
    deadline: 21,
    description:
      "مطلوب مطور Backend لبناء موديول الدفع والفواتير الضريبية وتوثيق الـ API بمعايير أمان عالية.",
    skills: ["Node.js", "Express.js", "Stripe API"],
  },
  {
    clientEmail: "ahmed.khaled@company.com",
    title: "تطبيق هاتف ذكي لحجز خدمات الصيانة والمهام",
    category: "Mobile",
    budgetFrom: 30000,
    budgetTo: 45000,
    deadline: 45,
    description:
      "مشروع تطوير تطبيق أندرويد وآيفون متكامل مع نظام الخرائط والإشعارات وتتبع الطلبات المباشر.",
    skills: ["Flutter", "Firebase", "REST API"],
  },
];

const ASSESSMENTS = [
  ["React.js & State Management Assessment", "web", "intermediate"],
  ["Node.js REST API & Database Optimization", "backend", "advanced"],
  ["Python Data Structures & Algorithm Assessment", "ai", "basic"],
];

async function main() {
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4_general_ci",
  });

  // Skills
  for (const [slug, name, nameAr, category] of SKILLS) {
    await conn.execute(
      `INSERT INTO skills (slug, name, name_ar, category) VALUES (?,?,?,?)
       ON DUPLICATE KEY UPDATE name=VALUES(name), name_ar=VALUES(name_ar), category=VALUES(category)`,
      [slug, name, nameAr, category]
    );
  }
  console.log(`✓ skills: ${SKILLS.length}`);

  const passwordHash = await bcrypt.hash("Scora@1234", 12);

  // Developers
  for (const d of DEVELOPERS) {
    await conn.execute(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?, 'developer')
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)`,
      [d.email, passwordHash, d.name]
    );
    const [[u]] = await conn.query("SELECT id FROM users WHERE email = ?", [d.email]);
    await conn.execute(
      `INSERT INTO developers
         (user_id, display_name, job_title, bio, location, city, availability,
          github_url, linkedin_url, portfolio_url, trust_score, skill_points,
          is_verified, experience_years)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)
       ON DUPLICATE KEY UPDATE
         display_name=VALUES(display_name), job_title=VALUES(job_title), bio=VALUES(bio),
         location=VALUES(location), city=VALUES(city), availability=VALUES(availability),
         trust_score=VALUES(trust_score), skill_points=VALUES(skill_points),
         is_verified=VALUES(is_verified), experience_years=VALUES(experience_years)`,
      [u.id, d.name, d.title, d.bio, d.location, d.city, d.availability,
       d.github, d.linkedin, d.site, d.trust, d.sp, d.verified, d.years]
    );
    const [[dev]] = await conn.query("SELECT id FROM developers WHERE user_id = ?", [u.id]);
    for (const slug of d.skills) {
      const [[s]] = await conn.query("SELECT id FROM skills WHERE slug = ?", [slug]);
      if (!s) continue;
      await conn.execute(
        `INSERT INTO developer_skills (developer_id, skill_id, level, sp) VALUES (?,?,?,?)
         ON DUPLICATE KEY UPDATE sp=VALUES(sp)`,
        [dev.id, s.id, "advanced", Math.round(d.sp / d.skills.length)]
      );
    }
    for (const [title, category, difficulty] of ASSESSMENTS.slice(0, 2)) {
      const [[exists]] = await conn.query(
        "SELECT id FROM assessments WHERE developer_id = ? AND title = ?",
        [dev.id, title]
      );
      if (!exists) {
        await conn.execute(
          `INSERT INTO assessments (developer_id, title, category, difficulty, status, score, sp_awarded, submitted_at)
           VALUES (?,?,?,?, 'passed', ?, ?, NOW())`,
          [dev.id, title, category, difficulty, 88, 150]
        );
      }
    }
  }
  console.log(`✓ developers: ${DEVELOPERS.length}`);

  // Clients
  for (const c of CLIENTS) {
    await conn.execute(
      `INSERT INTO users (email, password_hash, full_name, role) VALUES (?,?,?, 'client')
       ON DUPLICATE KEY UPDATE full_name=VALUES(full_name)`,
      [c.email, passwordHash, c.name]
    );
    const [[u]] = await conn.query("SELECT id FROM users WHERE email = ?", [c.email]);
    await conn.execute(
      `INSERT INTO clients (user_id, display_name, company_name, website, location)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE company_name=VALUES(company_name), website=VALUES(website), location=VALUES(location)`,
      [u.id, c.name, c.company, c.website, c.location]
    );
  }
  console.log(`✓ clients: ${CLIENTS.length}`);

  // Projects
  for (const p of PROJECTS) {
    const [[u]] = await conn.query("SELECT id FROM users WHERE email = ?", [p.clientEmail]);
    const [[cl]] = await conn.query("SELECT id FROM clients WHERE user_id = ?", [u.id]);
    const [[exists]] = await conn.query("SELECT id FROM projects WHERE title = ?", [p.title]);
    if (exists) continue;
    await conn.execute(
      `INSERT INTO projects (client_id, title, category, description, budget_from, budget_to, deadline_days, status, skills_json)
       VALUES (?,?,?,?,?,?,?, 'open', ?)`,
      [cl.id, p.title, p.category, p.description, p.budgetFrom, p.budgetTo, p.deadline,
       JSON.stringify(p.skills)]
    );
  }
  console.log(`✓ projects: ${PROJECTS.length}`);

  // A couple of proposals on the first project
  const [[proj]] = await conn.query("SELECT id FROM projects ORDER BY id LIMIT 1");
  const proposalSeeds = [
    ["ahmed.ali@scora.dev", 18500, 10, "أستطيع إنجاز السيرفرات وقواعد البيانات وتطوير REST APIs محمية بالكامل وتوفير توثيق Swagger للـ Endpoints."],
    ["mahmoud.hassan@scora.dev", 22000, 12, "أستطيع بناء تصميم الواجهات المتجاوبة بدقة وبناء المكونات التفاعلية باستخدام Next.js وTailwind CSS."],
  ];
  for (const [email, price, days, cover] of proposalSeeds) {
    const [[u]] = await conn.query("SELECT id FROM users WHERE email = ?", [email]);
    const [[dev]] = await conn.query("SELECT id FROM developers WHERE user_id = ?", [u.id]);
    await conn.execute(
      `INSERT INTO proposals (project_id, developer_id, price, delivery_days, cover_text)
       VALUES (?,?,?,?,?)
       ON DUPLICATE KEY UPDATE price=VALUES(price), delivery_days=VALUES(delivery_days)`,
      [proj.id, dev.id, price, days, cover]
    );
  }
  console.log(`✓ proposals: ${proposalSeeds.length}`);

  console.log("\nSeed complete. Demo login password for all seeded accounts: Scora@1234");
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
