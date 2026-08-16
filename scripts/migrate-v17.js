const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const envPath = path.join(__dirname, "..", ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) {
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
    }
  }
}

async function main() {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  // 1. Add image_url to messages
  const [msgCols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='messages'"
  );
  if (!msgCols.some((x) => x.COLUMN_NAME === "image_url")) {
    await c.query("ALTER TABLE messages ADD COLUMN image_url VARCHAR(1000) NULL AFTER body");
    console.log("Added image_url column to messages table");
  }

  // 2. Add reported_message_id to support_tickets if not present
  const [ticketCols] = await c.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA=DATABASE() AND TABLE_NAME='support_tickets'"
  );
  if (!ticketCols.some((x) => x.COLUMN_NAME === "reported_message_id")) {
    await c.query("ALTER TABLE support_tickets ADD COLUMN reported_message_id BIGINT UNSIGNED NULL AFTER reported_user_id");
    console.log("Added reported_message_id column to support_tickets table");
  }

  // 3. Ensure ticket_messages has sender_kind supporting 'ssd' or 'agent'
  await c.query(`
    CREATE TABLE IF NOT EXISTS ticket_messages (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      ticket_id BIGINT UNSIGNED NOT NULL,
      sender_id BIGINT UNSIGNED NULL,
      sender_kind ENUM('complainant','admin','reported','ssd') NOT NULL DEFAULT 'complainant',
      body TEXT NOT NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_ticket_messages_ticket (ticket_id)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  // Modify column if table already existed without 'ssd'
  try {
    await c.query("ALTER TABLE ticket_messages MODIFY COLUMN sender_kind ENUM('complainant','admin','reported','ssd') NOT NULL DEFAULT 'complainant'");
  } catch {
    // Ignore if already modified
  }

  await c.end();
  console.log("Migration v17 successfully applied!");
}

main().catch((err) => {
  console.error("Migration v17 failed:", err);
  process.exit(1);
});
