const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (match && !(match[1] in process.env)) process.env[match[1]] = match[2].replace(/^["']|["']$/g, "");
  }
}

async function main() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    charset: "utf8mb4",
    multipleStatements: true,
  });

  await connection.query(`
    UPDATE developers SET approval_status='profile_incomplete' WHERE approval_status='';

    ALTER TABLE developers
      MODIFY approval_status ENUM(
        'profile_incomplete',
        'assessment_in_progress',
        'admin_review',
        'approved',
        'rejected',
        'reset_requested',
        'reset_approved'
      ) NOT NULL DEFAULT 'profile_incomplete';

    ALTER TABLE developer_assessment_sessions
      MODIFY status ENUM(
        'generating',
        'in_progress',
        'admin_review',
        'approved',
        'rejected',
        'generation_failed',
        'expired'
      ) NOT NULL DEFAULT 'generating';

    CREATE TABLE IF NOT EXISTS developer_reassessment_requests (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      developer_id BIGINT UNSIGNED NOT NULL,
      requested_by BIGINT UNSIGNED NOT NULL,
      note VARCHAR(1000) NULL,
      status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'pending',
      decided_by BIGINT UNSIGNED NULL,
      decision_reason VARCHAR(1000) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      decided_at TIMESTAMP NULL,
      KEY idx_reassessment_developer_status (developer_id, status, created_at),
      CONSTRAINT fk_reassessment_developer FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE,
      CONSTRAINT fk_reassessment_requester FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE CASCADE,
      CONSTRAINT fk_reassessment_decider FOREIGN KEY (decided_by) REFERENCES users(id) ON DELETE SET NULL
    );
  `);

  await connection.end();
  console.log("Reassessment status migration complete");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
