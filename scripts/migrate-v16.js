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

  await connection.query(`
    CREATE TABLE IF NOT EXISTS developer_projects (
      id            BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      developer_id  BIGINT UNSIGNED NOT NULL,
      title         VARCHAR(255) NOT NULL,
      description   TEXT NULL,
      preview_url   VARCHAR(1000) NULL,
      technologies_json LONGTEXT NULL,
      created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      KEY idx_dev_projects_developer (developer_id),
      CONSTRAINT fk_dev_projects_developer FOREIGN KEY (developer_id) REFERENCES developers(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS developer_project_images (
      id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id  BIGINT UNSIGNED NOT NULL,
      url         VARCHAR(1000) NOT NULL,
      alt_text    VARCHAR(255) NULL,
      sort_order  INT UNSIGNED NOT NULL DEFAULT 0,
      created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      KEY idx_dev_project_images_project (project_id, sort_order),
      CONSTRAINT fk_dev_project_images_project FOREIGN KEY (project_id) REFERENCES developer_projects(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.query(`
    CREATE TABLE IF NOT EXISTS developer_project_reviews (
      id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
      project_id      BIGINT UNSIGNED NOT NULL,
      reviewer_user_id BIGINT UNSIGNED NOT NULL,
      rating          TINYINT UNSIGNED NOT NULL,
      comment         TEXT NULL,
      created_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at      TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_dev_project_review (project_id, reviewer_user_id),
      KEY idx_dev_project_reviews_project (project_id, created_at),
      CONSTRAINT fk_dev_project_reviews_project FOREIGN KEY (project_id) REFERENCES developer_projects(id) ON DELETE CASCADE,
      CONSTRAINT fk_dev_project_reviews_user FOREIGN KEY (reviewer_user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);

  await connection.end();
  console.log("Migration v16: developer portfolio projects, watermarked images, ratings, and comments applied.");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
