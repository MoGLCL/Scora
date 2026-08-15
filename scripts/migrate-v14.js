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

  const [cols] = await connection.query("DESCRIBE developers");
  const colNames = cols.map((c) => c.Field);

  if (!colNames.includes("skills_change_count")) {
    await connection.query("ALTER TABLE developers ADD COLUMN skills_change_count INT NOT NULL DEFAULT 0 AFTER job_title");
    console.log("Added skills_change_count to developers table");
  }

  await connection.end();
  console.log("Migration v14 completed successfully.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
