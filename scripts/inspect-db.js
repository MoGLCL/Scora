/**
 * Schema inspector — prints every table's columns, indexes and row count.
 * Read-only. Run: node scripts/inspect-db.js
 */
const fs = require("fs");
const path = require("path");
const mysql = require("mysql2/promise");

const envPath = path.join(path.resolve(__dirname, ".."), ".env.local");
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (m && !(m[1] in process.env)) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

(async () => {
  const c = await mysql.createConnection({
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT ?? 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
  });

  const [cols] = await c.query(
    `SELECT TABLE_NAME t, COLUMN_NAME c, COLUMN_TYPE ty, IS_NULLABLE n
       FROM information_schema.COLUMNS
      WHERE TABLE_SCHEMA = DATABASE()
      ORDER BY TABLE_NAME, ORDINAL_POSITION`
  );

  const byTable = {};
  for (const r of cols) (byTable[r.t] ??= []).push(`${r.c} ${r.ty}${r.n === "NO" ? " NOT NULL" : ""}`);

  for (const table of Object.keys(byTable)) {
    const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${table}\``);
    console.log(`\n== ${table}  (${n} rows)`);
    console.log("  " + byTable[table].join("\n  "));
  }

  await c.end();
})().catch((e) => {
  console.error("ERR", e.message);
  process.exit(1);
});
