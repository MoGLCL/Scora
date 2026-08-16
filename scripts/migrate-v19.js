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

  console.log("Connected to MySQL for Migration v19...");

  // 1. user_subscriptions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS user_subscriptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      plan ENUM('free', 'pro', 'vip') NOT NULL DEFAULT 'free',
      status ENUM('active', 'expired', 'cancelled', 'trial') NOT NULL DEFAULT 'trial',
      trial_ends_at TIMESTAMP NULL,
      current_period_start TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      current_period_end TIMESTAMP NULL,
      coupon_code VARCHAR(50) NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_user_subscription (user_id),
      CONSTRAINT fk_sub_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified user_subscriptions table.");

  // 2. ai_usage_logs table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS ai_usage_logs (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      user_id BIGINT UNSIGNED NOT NULL,
      model VARCHAR(100) NULL,
      prompt_tokens INT NULL DEFAULT 0,
      response_tokens INT NULL DEFAULT 0,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_ai_user_time (user_id, created_at),
      CONSTRAINT fk_ai_usage_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified ai_usage_logs table.");

  // 3. coupons table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS coupons (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      code VARCHAR(50) NOT NULL UNIQUE,
      description VARCHAR(255) NULL,
      discount_type ENUM('percentage', 'fixed', 'free') NOT NULL DEFAULT 'percentage',
      discount_value DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      applicable_plan ENUM('all', 'pro', 'vip') NOT NULL DEFAULT 'all',
      duration_days INT NOT NULL DEFAULT 30,
      max_uses INT NULL,
      used_count INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      expires_at TIMESTAMP NULL,
      created_by BIGINT UNSIGNED NULL,
      created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      INDEX idx_coupon_code (code)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified coupons table.");

  // 4. coupon_redemptions table
  await connection.query(`
    CREATE TABLE IF NOT EXISTS coupon_redemptions (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      coupon_id BIGINT UNSIGNED NOT NULL,
      user_id BIGINT UNSIGNED NOT NULL,
      plan_applied ENUM('pro', 'vip') NOT NULL,
      discount_amount DECIMAL(10,2) NOT NULL DEFAULT 0.00,
      redeemed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      INDEX idx_redemption_user (user_id),
      INDEX idx_redemption_coupon (coupon_id),
      CONSTRAINT fk_redemption_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE CASCADE,
      CONSTRAINT fk_redemption_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci
  `);
  console.log("✓ Created/verified coupon_redemptions table.");

  // 5. Seed initial coupons if none exist
  const [existingCoupons] = await connection.query("SELECT COUNT(*) AS c FROM coupons");
  if (existingCoupons[0].c === 0) {
    await connection.query(`
      INSERT INTO coupons (code, description, discount_type, discount_value, applicable_plan, duration_days, max_uses, is_active)
      VALUES
      ('SCORA100', 'كوبون تفعيل مجاني 100% لجميع الباقات', 'free', 100.00, 'all', 30, 500, 1),
      ('VIPFREE', 'كوبون تفعيل باقة VIP مجاناً لمدة شهر', 'free', 100.00, 'vip', 30, 200, 1),
      ('PROMO50', 'خصم 50% على باقة Pro الشهرية', 'percentage', 50.00, 'pro', 30, 1000, 1),
      ('SCORA200', 'خصم بقيمة 200 جنيه مصري', 'fixed', 200.00, 'all', 30, 1000, 1)
    `);
    console.log("✓ Seeded initial promo coupons (SCORA100, VIPFREE, PROMO50, SCORA200).");
  }

  // 6. Ensure all existing users have user_subscriptions entry (Free plan with 3-day trial from registration)
  await connection.query(`
    INSERT IGNORE INTO user_subscriptions (user_id, plan, status, trial_ends_at, current_period_start)
    SELECT id, 'free', 'trial', DATE_ADD(created_at, INTERVAL 3 DAY), created_at
    FROM users
  `);
  console.log("✓ Initialized subscriptions for existing users.");

  await connection.end();
  console.log("Migration v19 completed successfully!");
}

main().catch((error) => {
  console.error("Migration error:", error);
  process.exit(1);
});
