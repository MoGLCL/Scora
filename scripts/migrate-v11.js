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

  const [cols] = await connection.query("DESCRIBE developer_assessment_sessions");
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes("evidence_snapshot_json")) {
    await connection.query("ALTER TABLE developer_assessment_sessions ADD COLUMN evidence_snapshot_json LONGTEXT NULL AFTER interview_expires_at");
  }
  if (!colNames.includes("evidence_snapshot_hash")) {
    await connection.query("ALTER TABLE developer_assessment_sessions ADD COLUMN evidence_snapshot_hash VARCHAR(64) NULL AFTER evidence_snapshot_json");
  }
  if (!colNames.includes("snapshot_locked_at")) {
    await connection.query("ALTER TABLE developer_assessment_sessions ADD COLUMN snapshot_locked_at TIMESTAMP NULL AFTER evidence_snapshot_hash");
  }
  if (!colNames.includes("ai_review_report_json")) {
    await connection.query("ALTER TABLE developer_assessment_sessions ADD COLUMN ai_review_report_json LONGTEXT NULL AFTER snapshot_locked_at");
  }
  if (!colNames.includes("ai_reviewed_at")) {
    await connection.query("ALTER TABLE developer_assessment_sessions ADD COLUMN ai_reviewed_at TIMESTAMP NULL AFTER ai_review_report_json");
  }

  await connection.end();
  console.log("Migration v11 completed: Evidence snapshot & AI Review columns added successfully");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
