/**
 * Scora — database migration script
 * Target: MySQL 8+ / MariaDB 10.6+ (utf8mb4).
 *
 * Run:   node scripts/migrate.js
 * Re-run: safe — each object is created only if it does not exist.
 *
 * Every statement is idempotent so the script can be re-applied. The
 * transaction is intentionally NOT used: MySQL 8 pre-8.0.18 and MariaDB
 * cannot roll back DDL, and a partial migration with DROP is worse than
 * re-running a create-if-missing script.
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const rootDir = path.resolve(__dirname, "..");
const envPath = path.join(rootDir, ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const required = (name) => {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
};

async function main() {
  const conn = await mysql.createConnection({
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    charset: "utf8mb4_general_ci",
    multipleStatements: true,
  });

  const statements = [
    // ─── Identity & roles ───────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS users (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      email         VARCHAR(255) NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      full_name     VARCHAR(255) NOT NULL,
      role          ENUM('developer','client','admin') NOT NULL DEFAULT 'client',
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_users_email (email)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Developer profile (1:1 with users) ─────────────────────────────
    `CREATE TABLE IF NOT EXISTS developers (
      id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id        BIGINT UNSIGNED NOT NULL,
      display_name   VARCHAR(255) NOT NULL,
      job_title      VARCHAR(255) NULL,
      headline       VARCHAR(255) NULL,
      bio            TEXT NULL,
      location       VARCHAR(255) NULL,
      country        VARCHAR(100) NULL,
      city           VARCHAR(100) NULL,
      availability   ENUM('available','busy','soon') NOT NULL DEFAULT 'soon',
      hourly_rate_min INT UNSIGNED NULL,
      hourly_rate_max INT UNSIGNED NULL,
      github_url     VARCHAR(500) NULL,
      linkedin_url   VARCHAR(500) NULL,
      portfolio_url  VARCHAR(500) NULL,
      trust_score    INT NOT NULL DEFAULT 50,
      skill_points   INT NOT NULL DEFAULT 0,
      is_verified    TINYINT(1) NOT NULL DEFAULT 0,
      experience_years INT UNSIGNED NULL,
      avatar_url     VARCHAR(500) NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_developers_user (user_id),
      KEY idx_developers_trust_sp (trust_score, skill_points),
      CONSTRAINT fk_developers_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Client profile (1:1 with users) ────────────────────────────────
    `CREATE TABLE IF NOT EXISTS clients (
      id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id        BIGINT UNSIGNED NOT NULL,
      display_name   VARCHAR(255) NOT NULL,
      company_name   VARCHAR(255) NULL,
      website        VARCHAR(500) NULL,
      location       VARCHAR(255) NULL,
      avatar_url     VARCHAR(500) NULL,
      created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_clients_user (user_id),
      CONSTRAINT fk_clients_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Skills catalog ─────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS skills (
      id       BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      slug     VARCHAR(100) NOT NULL,
      name     VARCHAR(100) NOT NULL,
      name_ar  VARCHAR(100) NULL,
      category ENUM('language','framework','database','tool') NOT NULL DEFAULT 'tool',
      icon_key VARCHAR(100) NULL,
      UNIQUE KEY uq_skills_slug (slug)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Developer ↔ skills (M:N) ───────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS developer_skills (
      id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      developer_id BIGINT UNSIGNED NOT NULL,
      skill_id     BIGINT UNSIGNED NOT NULL,
      level        ENUM('beginner','intermediate','advanced','expert') NOT NULL DEFAULT 'beginner',
      sp           INT NOT NULL DEFAULT 0,
      created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_devskill (developer_id, skill_id),
      CONSTRAINT fk_devskill_dev FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
      CONSTRAINT fk_devskill_skill FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Projects (posted by clients) ───────────────────────────────────
    `CREATE TABLE IF NOT EXISTS projects (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      client_id     BIGINT UNSIGNED NOT NULL,
      title         VARCHAR(255) NOT NULL,
      category      VARCHAR(100) NULL,
      description   TEXT NULL,
      budget_from   INT UNSIGNED NULL,
      budget_to     INT UNSIGNED NULL,
      deadline_days INT UNSIGNED NULL,
      status        ENUM('open','in_progress','completed','closed') NOT NULL DEFAULT 'open',
      skills_json   JSON NULL,
      posted_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_projects_status (status),
      KEY idx_projects_client (client_id),
      CONSTRAINT fk_projects_client FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Proposals (developer responses to a project) ───────────────────
    `CREATE TABLE IF NOT EXISTS proposals (
      id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id       BIGINT UNSIGNED NOT NULL,
      developer_id     BIGINT UNSIGNED NOT NULL,
      price            INT UNSIGNED NOT NULL,
      delivery_days    INT UNSIGNED NOT NULL,
      cover_text       TEXT NULL,
      status           ENUM('pending','accepted','rejected','withdrawn') NOT NULL DEFAULT 'pending',
      created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      UNIQUE KEY uq_proposal (project_id, developer_id),
      KEY idx_proposals_dev (developer_id),
      CONSTRAINT fk_proposals_project FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_proposals_dev FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Assessments ────────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS assessments (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      developer_id  BIGINT UNSIGNED NOT NULL,
      title         VARCHAR(255) NOT NULL,
      category      VARCHAR(100) NULL,
      difficulty    ENUM('basic','intermediate','advanced') NOT NULL DEFAULT 'intermediate',
      status        ENUM('in_progress','passed','failed','review') NOT NULL DEFAULT 'in_progress',
      score         INT UNSIGNED NULL,
      sp_awarded    INT UNSIGNED NULL,
      submitted_at  TIMESTAMP NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_assessments_dev (developer_id),
      CONSTRAINT fk_assessments_dev FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Messages (direct chat) ─────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS messages (
      id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      sender_id  BIGINT UNSIGNED NOT NULL,
      receiver_id BIGINT UNSIGNED NOT NULL,
      body       TEXT NOT NULL,
      is_read    TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_messages_pair (sender_id, receiver_id, created_at),
      KEY idx_messages_recv (receiver_id, is_read),
      CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Notifications ──────────────────────────────────────────────────
    `CREATE TABLE IF NOT EXISTS notifications (
      id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id    BIGINT UNSIGNED NOT NULL,
      body       TEXT NOT NULL,
      is_read    TINYINT(1) NOT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_notifications_user (user_id, is_read),
      CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,

    // ─── Uploaded media (avatars, images) ───────────────────────────────
    `CREATE TABLE IF NOT EXISTS media (
      id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      owner_type VARCHAR(50) NOT NULL,
      owner_id   BIGINT UNSIGNED NOT NULL,
      mime_type  VARCHAR(100) NOT NULL,
      size_bytes INT UNSIGNED NOT NULL,
      width      INT UNSIGNED NULL,
      height     INT UNSIGNED NULL,
      url        VARCHAR(1000) NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_media_owner (owner_type, owner_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`,
  ];

  console.log(`Applying ${statements.length} statements…`);
  let applied = 0;
  for (const sql of statements) {
    try {
      await conn.query(sql);
      applied++;
      console.log(`  ✓ ${sql.slice(0, 60).replace(/\s+/g, " ")}…`);
    } catch (err) {
      console.error(`  ✗ ${sql.slice(0, 60).replace(/\s+/g, " ")}…\n    ${err.message}`);
    }
  }
  console.log(`Done: ${applied}/${statements.length} applied.`);
  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
