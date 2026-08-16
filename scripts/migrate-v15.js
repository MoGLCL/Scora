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

  const [userCols] = await connection.query("DESCRIBE users");
  const userColNames = userCols.map((c) => c.Field);
  if (!userColNames.includes("is_verified")) {
    await connection.query("ALTER TABLE users ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER role");
    console.log("Added is_verified to users table");
  }

  const [clientCols] = await connection.query("DESCRIBE clients");
  const clientColNames = clientCols.map((c) => c.Field);
  if (!clientColNames.includes("is_verified")) {
    await connection.query("ALTER TABLE clients ADD COLUMN is_verified TINYINT(1) NOT NULL DEFAULT 0 AFTER avatar_url");
    console.log("Added is_verified to clients table");
  }

  // Sync users is_verified from developers where is_verified = 1
  await connection.query(`
    UPDATE users u
    JOIN developers d ON d.user_id = u.id
    SET u.is_verified = d.is_verified
    WHERE d.is_verified = 1;
  `);

  await connection.end();
  console.log("Migration v15: Verification schema applied successfully.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
