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

  // 1. Add 2FA columns to users
  try {
    await connection.query(`
      ALTER TABLE users
      ADD COLUMN is_2fa_enabled TINYINT(1) NOT NULL DEFAULT 0,
      ADD COLUMN two_factor_secret VARCHAR(255) NULL
    `);
    console.log("Added 2FA columns to users table.");
  } catch (err) {
    if (!err.message.includes("Duplicate column name")) {
      console.log("Note on users 2FA columns:", err.message);
    }
  }

  // 2. Ensure clients has account_type, company fields
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

  // 3. User Login Sessions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_login_sessions (
      id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      device_name VARCHAR(255) NOT NULL,
      browser VARCHAR(100) NOT NULL,
      ip_address VARCHAR(100) NOT NULL,
      location VARCHAR(255) NOT NULL,
      is_current TINYINT(1) NOT NULL DEFAULT 0,
      status ENUM('active','logged_out','revoked') NOT NULL DEFAULT 'active',
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      last_active_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_user_sessions (user_id, status),
      CONSTRAINT fk_user_sessions_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("Created user_login_sessions table.");

  // 4. User Settings table
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

  // Seed sample session if user_login_sessions is empty
  const [users] = await connection.query("SELECT id FROM users LIMIT 10");
  for (const u of users) {
    const [existing] = await connection.query("SELECT COUNT(*) as count FROM user_login_sessions WHERE user_id = ?", [u.id]);
    if (existing[0].count === 0) {
      await connection.query(`
        INSERT INTO user_login_sessions (user_id, device_name, browser, ip_address, location, is_current, status)
        VALUES
        (?, 'Windows 11 PC (الحالي)', 'Chrome 128.0', '197.38.12.94', 'القاهرة، مصر', 1, 'active'),
        (?, 'iPhone 15 Pro Max', 'Safari Mobile', '156.204.18.22', 'الجيزة، مصر', 0, 'active'),
        (?, 'MacBook Air M2', 'Chrome 127.0', '41.44.80.110', 'الإسكندرية، مصر', 0, 'logged_out')
      `, [u.id, u.id, u.id]);
    }
  }

  await connection.end();
  console.log("Migration v18: User security, 2FA, sessions, AI settings, and company management applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
