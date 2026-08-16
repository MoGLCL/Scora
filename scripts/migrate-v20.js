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
  });

  console.log("Connected to MySQL for Migration v20 (AI Chat Logs & Sessions)...");

  // 1. ai_chat_sessions
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ai_chat_sessions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      session_key VARCHAR(64) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      user_role VARCHAR(32) NOT NULL DEFAULT 'guest',
      started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      message_count INT UNSIGNED NOT NULL DEFAULT 1,
      model_used VARCHAR(100) NULL,
      status ENUM('active', 'completed', 'error') NOT NULL DEFAULT 'active',
      UNIQUE KEY uq_ai_session_key (session_key),
      INDEX idx_ai_session_user (user_id, last_active_at),
      CONSTRAINT fk_ai_session_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified ai_chat_sessions table.");

  // 2. ai_chat_messages
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ai_chat_messages (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      session_key VARCHAR(64) NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      sender ENUM('user', 'assistant') NOT NULL,
      content LONGTEXT NOT NULL,
      model_used VARCHAR(100) NULL,
      metadata JSON NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_msg_session (session_key, created_at),
      INDEX idx_ai_msg_user (user_id, created_at),
      CONSTRAINT fk_ai_msg_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified ai_chat_messages table.");

  console.log("Migration v20 completed successfully!");
  await connection.end();
}

main().catch((err) => {
  console.error("Migration v20 failed:", err);
  process.exit(1);
});
