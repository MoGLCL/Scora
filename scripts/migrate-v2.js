/**
 * Scora — schema completion + fake-data purge (phase 2).
 *
 * Run:   node scripts/migrate-v2.js
 * Re-run: safe. Every step checks the current schema before touching it.
 *
 * What this does, in order:
 *   1. Adds the columns the UI already collects but had nowhere to store
 *      (phone, account status, client industry, project deliverables).
 *   2. Creates the tables that were previously faked in localStorage
 *      (support tickets, ticket replies, admin audit log, reviews,
 *      platform settings, password resets).
 *   3. Adds the unique key that `ON DUPLICATE KEY UPDATE` in the proposal
 *      action already assumed existed.
 *   4. Deletes orphaned profile rows left behind by the old demo seed, then
 *      adds the foreign keys that stop them coming back.
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

let conn;
const log = (ok, msg) => console.log(`  ${ok ? "✓" : "·"} ${msg}`);

async function columnExists(table, column) {
  const [r] = await conn.query(
    `SELECT 1 FROM information_schema.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?`,
    [table, column]
  );
  return r.length > 0;
}

async function indexExists(table, index) {
  const [r] = await conn.query(
    `SELECT 1 FROM information_schema.STATISTICS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND INDEX_NAME = ?`,
    [table, index]
  );
  return r.length > 0;
}

async function fkExists(name) {
  const [r] = await conn.query(
    `SELECT 1 FROM information_schema.TABLE_CONSTRAINTS
     WHERE CONSTRAINT_SCHEMA = DATABASE() AND CONSTRAINT_NAME = ?
       AND CONSTRAINT_TYPE = 'FOREIGN KEY'`,
    [name]
  );
  return r.length > 0;
}

/** Add a column only when it is missing. */
async function addColumn(table, column, definition) {
  if (await columnExists(table, column)) {
    log(false, `${table}.${column} already present`);
    return;
  }
  await conn.query(`ALTER TABLE \`${table}\` ADD COLUMN \`${column}\` ${definition}`);
  log(true, `${table}.${column} added`);
}

async function addIndex(table, name, definition) {
  if (await indexExists(table, name)) {
    log(false, `${table}.${name} already present`);
    return;
  }
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD ${definition}`);
    log(true, `${table}.${name} added`);
  } catch (err) {
    console.error(`  ✗ ${table}.${name}: ${err.message}`);
  }
}

async function addForeignKey(table, name, definition) {
  if (await fkExists(name)) {
    log(false, `${name} already present`);
    return;
  }
  try {
    await conn.query(`ALTER TABLE \`${table}\` ADD CONSTRAINT \`${name}\` ${definition}`);
    log(true, `${name} added`);
  } catch (err) {
    console.error(`  ✗ ${name}: ${err.message}`);
  }
}

async function createTable(name, body) {
  await conn.query(
    `CREATE TABLE IF NOT EXISTS \`${name}\` (${body})
     ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci`
  );
  log(true, `table ${name} ready`);
}

async function main() {
  conn = await mysql.createConnection({
    host: required("DB_HOST"),
    port: Number(process.env.DB_PORT ?? 3306),
    user: required("DB_USER"),
    password: required("DB_PASSWORD"),
    database: required("DB_NAME"),
    charset: "utf8mb4_general_ci",
  });

  // ── 1. Columns the product already needs ──────────────────────────────
  console.log("\n[1/5] Columns");

  // Onboarding collects a phone number; moderation needs an account state.
  await addColumn("users", "phone", "VARCHAR(32) NULL AFTER full_name");
  await addColumn("users", "phone_verified", "TINYINT(1) NOT NULL DEFAULT 0 AFTER phone");
  await addColumn(
    "users",
    "status",
    "ENUM('active','suspended','banned') NOT NULL DEFAULT 'active' AFTER role"
  );
  await addColumn("users", "suspended_until", "TIMESTAMP NULL DEFAULT NULL AFTER status");
  await addColumn("users", "last_login_at", "TIMESTAMP NULL DEFAULT NULL");

  // The client onboarding form collected an industry and then dropped it.
  await addColumn("clients", "industry", "VARCHAR(255) NULL AFTER company_name");
  await addColumn("clients", "phone", "VARCHAR(32) NULL AFTER website");

  // Developer onboarding asks for years of experience + a phone.
  await addColumn("developers", "phone", "VARCHAR(32) NULL AFTER location");

  // The project detail page renders a deliverables list that had no column.
  await addColumn("projects", "deliverables_json", "LONGTEXT NULL AFTER skills_json");

  // ── 2. Tables that were previously localStorage-only ──────────────────
  console.log("\n[2/5] Tables");

  await createTable(
    "support_tickets",
    `id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     user_id           BIGINT UNSIGNED NOT NULL,
     reported_user_id  BIGINT UNSIGNED NULL,
     category          VARCHAR(100) NOT NULL,
     subject           VARCHAR(255) NOT NULL,
     description       TEXT NOT NULL,
     status            ENUM('new','reviewing','resolved') NOT NULL DEFAULT 'new',
     created_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     updated_at        TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
     KEY idx_tickets_user (user_id),
     KEY idx_tickets_reported (reported_user_id),
     KEY idx_tickets_status (status)`
  );

  await createTable(
    "ticket_messages",
    `id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     ticket_id  BIGINT UNSIGNED NOT NULL,
     sender_id  BIGINT UNSIGNED NULL,
     sender_kind ENUM('complainant','admin','reported') NOT NULL DEFAULT 'complainant',
     body       TEXT NOT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_ticket_messages_ticket (ticket_id)`
  );

  await createTable(
    "admin_audit_logs",
    `id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     actor_user_id  BIGINT UNSIGNED NULL,
     actor_name     VARCHAR(255) NULL,
     action         VARCHAR(255) NOT NULL,
     category       ENUM('security','admin','ai','system') NOT NULL DEFAULT 'admin',
     target_type    VARCHAR(50) NULL,
     target_id      VARCHAR(64) NULL,
     details        TEXT NULL,
     ip_address     VARCHAR(64) NULL,
     status         ENUM('success','warn','danger') NOT NULL DEFAULT 'success',
     created_at     TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_audit_created (created_at),
     KEY idx_audit_category (category)`
  );

  await createTable(
    "reviews",
    `id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     project_id       BIGINT UNSIGNED NULL,
     reviewer_user_id BIGINT UNSIGNED NOT NULL,
     reviewee_user_id BIGINT UNSIGNED NOT NULL,
     rating           TINYINT UNSIGNED NOT NULL,
     comment          TEXT NULL,
     created_at       TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     KEY idx_reviews_reviewee (reviewee_user_id),
     KEY idx_reviews_project (project_id)`
  );

  // Admin settings belong on the server, not in every visitor's localStorage.
  await createTable(
    "platform_settings",
    `setting_key   VARCHAR(100) NOT NULL PRIMARY KEY,
     setting_value TEXT NULL,
     updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP`
  );

  await createTable(
    "password_resets",
    `id         BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
     user_id    BIGINT UNSIGNED NOT NULL,
     token_hash CHAR(64) NOT NULL,
     expires_at TIMESTAMP NOT NULL,
     used_at    TIMESTAMP NULL DEFAULT NULL,
     created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
     UNIQUE KEY uq_reset_token (token_hash),
     KEY idx_reset_user (user_id)`
  );

  // ── 3. Keys the application code already relies on ────────────────────
  console.log("\n[3/5] Indexes");

  // submitProposal() uses ON DUPLICATE KEY UPDATE to turn a re-submission
  // into an edit. Without this key it silently inserted duplicates instead.
  const [dupProposals] = await conn.query(
    `SELECT project_id, developer_id, COUNT(*) n FROM proposals
     GROUP BY project_id, developer_id HAVING n > 1`
  );
  if (dupProposals.length) {
    await conn.query(
      `DELETE p1 FROM proposals p1
       JOIN proposals p2
         ON p1.project_id = p2.project_id
        AND p1.developer_id = p2.developer_id
        AND p1.id < p2.id`
    );
    log(true, `collapsed ${dupProposals.length} duplicate proposal group(s)`);
  }
  await addIndex(
    "proposals",
    "uq_proposal_project_dev",
    "UNIQUE KEY uq_proposal_project_dev (project_id, developer_id)"
  );
  await addIndex(
    "developer_skills",
    "uq_dev_skill",
    "UNIQUE KEY uq_dev_skill (developer_id, skill_id)"
  );
  await addIndex("users", "idx_users_status", "KEY idx_users_status (status)");

  // ── 4. Purge demo/orphan rows ─────────────────────────────────────────
  console.log("\n[4/5] Purging orphaned demo data");

  const orphanDevs = `SELECT d.id FROM developers d
                      LEFT JOIN users u ON u.id = d.user_id WHERE u.id IS NULL`;
  const orphanClients = `SELECT c.id FROM clients c
                         LEFT JOIN users u ON u.id = c.user_id WHERE u.id IS NULL`;

  const [devIds] = await conn.query(orphanDevs);
  const [clientIds] = await conn.query(orphanClients);

  if (devIds.length) {
    const ids = devIds.map((r) => r.id);
    const ph = ids.map(() => "?").join(",");
    const [s] = await conn.query(`DELETE FROM developer_skills WHERE developer_id IN (${ph})`, ids);
    const [a] = await conn.query(`DELETE FROM assessments WHERE developer_id IN (${ph})`, ids);
    const [p] = await conn.query(`DELETE FROM proposals WHERE developer_id IN (${ph})`, ids);
    const [m] = await conn.query(
      `DELETE FROM media WHERE owner_type = 'developer' AND owner_id IN (${ph})`,
      ids
    );
    const [d] = await conn.query(`DELETE FROM developers WHERE id IN (${ph})`, ids);
    log(true, `removed ${d.affectedRows} orphan developer(s) — skills:${s.affectedRows} assessments:${a.affectedRows} proposals:${p.affectedRows} media:${m.affectedRows}`);
  } else {
    log(false, "no orphan developers");
  }

  if (clientIds.length) {
    const ids = clientIds.map((r) => r.id);
    const ph = ids.map(() => "?").join(",");
    const [pr] = await conn.query(
      `DELETE FROM proposals WHERE project_id IN (SELECT id FROM projects WHERE client_id IN (${ph}))`,
      ids
    );
    const [pj] = await conn.query(`DELETE FROM projects WHERE client_id IN (${ph})`, ids);
    const [m] = await conn.query(
      `DELETE FROM media WHERE owner_type = 'client' AND owner_id IN (${ph})`,
      ids
    );
    const [c] = await conn.query(`DELETE FROM clients WHERE id IN (${ph})`, ids);
    log(true, `removed ${c.affectedRows} orphan client(s) — projects:${pj.affectedRows} proposals:${pr.affectedRows} media:${m.affectedRows}`);
  } else {
    log(false, "no orphan clients");
  }

  // Skills referenced by nothing are fine to keep — the catalogue is real
  // reference data, not demo content. But dangling join rows are not.
  const [ds] = await conn.query(
    `DELETE ds FROM developer_skills ds
     LEFT JOIN developers d ON d.id = ds.developer_id WHERE d.id IS NULL`
  );
  if (ds.affectedRows) log(true, `removed ${ds.affectedRows} dangling developer_skills row(s)`);

  const [as] = await conn.query(
    `DELETE a FROM assessments a
     LEFT JOIN developers d ON d.id = a.developer_id WHERE d.id IS NULL`
  );
  if (as.affectedRows) log(true, `removed ${as.affectedRows} dangling assessment(s)`);

  // ── 5. Referential integrity ──────────────────────────────────────────
  console.log("\n[5/5] Foreign keys");

  await addForeignKey(
    "developers",
    "fk_developers_user",
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "clients",
    "fk_clients_user",
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "developer_skills",
    "fk_devskills_dev",
    "FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "developer_skills",
    "fk_devskills_skill",
    "FOREIGN KEY (skill_id) REFERENCES skills(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "assessments",
    "fk_assessments_dev",
    "FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "projects",
    "fk_projects_client",
    "FOREIGN KEY (client_id) REFERENCES clients(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "proposals",
    "fk_proposals_project",
    "FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "proposals",
    "fk_proposals_dev",
    "FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "messages",
    "fk_messages_sender",
    "FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "messages",
    "fk_messages_receiver",
    "FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "notifications",
    "fk_notifications_user",
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "support_tickets",
    "fk_tickets_user",
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "support_tickets",
    "fk_tickets_reported",
    "FOREIGN KEY (reported_user_id) REFERENCES users(id) ON DELETE SET NULL"
  );
  await addForeignKey(
    "ticket_messages",
    "fk_ticket_messages_ticket",
    "FOREIGN KEY (ticket_id) REFERENCES support_tickets(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "reviews",
    "fk_reviews_reviewer",
    "FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "reviews",
    "fk_reviews_reviewee",
    "FOREIGN KEY (reviewee_user_id) REFERENCES users(id) ON DELETE CASCADE"
  );
  await addForeignKey(
    "password_resets",
    "fk_reset_user",
    "FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE"
  );

  console.log("\nFinal row counts:");
  for (const t of [
    "users", "developers", "clients", "projects", "proposals", "skills",
    "developer_skills", "assessments", "media", "messages", "notifications",
    "support_tickets", "ticket_messages", "admin_audit_logs", "reviews",
    "platform_settings", "password_resets",
  ]) {
    const [[{ n }]] = await conn.query(`SELECT COUNT(*) n FROM \`${t}\``);
    console.log(`  ${t.padEnd(18)} ${n}`);
  }

  await conn.end();
  console.log("\nDone.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
