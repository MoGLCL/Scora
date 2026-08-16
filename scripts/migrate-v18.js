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

  // 1. Ensure clients has account_type, company fields
  const clientCols = [
    { name: "account_type", def: "ENUM('personal','company') NOT NULL DEFAULT 'personal'" },
    { name: "company_name", def: "VARCHAR(255) NULL" },
    { name: "tax_id", def: "VARCHAR(100) NULL" },
    { name: "industry", def: "VARCHAR(100) NULL" },
    { name: "company_size", def: "VARCHAR(50) NULL" },
    { name: "website", def: "VARCHAR(500) NULL" },
  ];

  for (const col of clientCols) {
    try {
      await connection.query(`ALTER TABLE clients ADD COLUMN ${col.name} ${col.def}`);
      console.log(`Added column ${col.name} to clients.`);
    } catch (err) {
      if (!err.message.includes("Duplicate column name")) {
        // column already exists
      }
    }
  }

  // 2. User Settings table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_settings (
      user_id BIGINT UNSIGNED NOT NULL,
      setting_key VARCHAR(100) NOT NULL,
      setting_value LONGTEXT NOT NULL,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      PRIMARY KEY (user_id, setting_key),
      CONSTRAINT fk_user_settings_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("Created user_settings table.");

  await connection.end();
  console.log("Migration v18: AI settings and company management applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
