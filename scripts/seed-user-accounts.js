const mysql = require("mysql2/promise");
const bcrypt = require("bcryptjs");

const dbConfig = {
  host: process.env.DB_HOST || "mysql-scorasql.alwaysdata.net",
  port: Number(process.env.DB_PORT || 3306),
  user: process.env.DB_USER || "scorasql",
  password: process.env.DB_PASSWORD || "S123S123s123",
  database: process.env.DB_NAME || "scorasql_1",
};

async function seed() {
  console.log("Connecting to MySQL Database...");
  const conn = await mysql.createConnection(dbConfig);
  console.log("Connected successfully!");

  const rawPassword = "Scora2026@#";
  const passwordHash = await bcrypt.hash(rawPassword, 12);
  console.log("Generated bcrypt password hash for Scora2026@#");

  const accounts = [
    {
      email: "cscora@gmail.com",
      username: "cscora",
      fullName: "عميل سكورا",
      phone: "01011112222",
      role: "client",
      isAdmin: 0,
      accountType: "individual",
      companyName: null,
    },
    {
      email: "dscora@gmail.com",
      username: "dscora",
      fullName: "مطور سكورا المعتمد",
      phone: "01033334444",
      role: "developer",
      isAdmin: 0,
      jobTitle: "Senior Full Stack Developer",
      bio: "مطور مهارات معتمد ومقبول رسمياً على منصة سكورا.",
      trustScore: 90,
      skillPoints: 850,
    },
    {
      email: "Ascora@mail.com",
      username: "ascora",
      fullName: "أدمن سكورا",
      phone: "01055556666",
      role: "client",
      isAdmin: 1,
      accountType: "company",
      companyName: "شركة سكورا العالمية",
    },
  ];

  for (const acc of accounts) {
    console.log(`Processing account: ${acc.email}...`);

    // Check if user exists
    const [existing] = await conn.execute("SELECT id FROM users WHERE email = ? OR username = ?", [acc.email, acc.username]);

    let userId;
    if (existing.length > 0) {
      userId = existing[0].id;
      console.log(`Updating existing user #${userId} (${acc.email})...`);
      await conn.execute(
        "UPDATE users SET password_hash = ?, role = ?, is_admin = ?, status = 'active', onboarding_completed_at = CURRENT_TIMESTAMP, full_name = ?, phone = ? WHERE id = ?",
        [passwordHash, acc.role, acc.isAdmin, acc.fullName, acc.phone, userId]
      );
    } else {
      console.log(`Inserting new user (${acc.email})...`);
      const [res] = await conn.execute(
        "INSERT INTO users (email, username, password_hash, role, is_admin, status, onboarding_completed_at, full_name, phone) VALUES (?, ?, ?, ?, ?, 'active', CURRENT_TIMESTAMP, ?, ?)",
        [acc.email, acc.username, passwordHash, acc.role, acc.isAdmin, acc.fullName, acc.phone]
      );
      userId = res.insertId;
      console.log(`Created user #${userId}`);
    }

    if (acc.role === "client") {
      const [clientRows] = await conn.execute("SELECT id FROM clients WHERE user_id = ?", [userId]);
      if (clientRows.length > 0) {
        await conn.execute(
          "UPDATE clients SET display_name = ?, account_type = ?, company_name = ? WHERE user_id = ?",
          [acc.fullName, acc.accountType || "individual", acc.companyName || null, userId]
        );
      } else {
        await conn.execute(
          "INSERT INTO clients (user_id, display_name, account_type, company_name) VALUES (?, ?, ?, ?)",
          [userId, acc.fullName, acc.accountType || "individual", acc.companyName || null]
        );
      }
      console.log(`Client profile set for #${userId}`);
    } else if (acc.role === "developer") {
      const [devRows] = await conn.execute("SELECT id FROM developers WHERE user_id = ?", [userId]);
      let devId;
      if (devRows.length > 0) {
        devId = devRows[0].id;
        await conn.execute(
          "UPDATE developers SET display_name = ?, job_title = ?, bio = ?, approval_status = 'approved', is_verified = 1, trust_score = ?, skill_points = ? WHERE user_id = ?",
          [acc.fullName, acc.jobTitle, acc.bio, acc.trustScore, acc.skillPoints, userId]
        );
      } else {
        const [devRes] = await conn.execute(
          "INSERT INTO developers (user_id, display_name, job_title, bio, approval_status, is_verified, trust_score, skill_points) VALUES (?, ?, ?, ?, 'approved', 1, ?, ?)",
          [userId, acc.fullName, acc.jobTitle, acc.bio, acc.trustScore, acc.skillPoints]
        );
        devId = devRes.insertId;
      }

      // Add default skills for developer so dashboard/skills display perfectly
      const skillsToAssign = ["JavaScript", "TypeScript", "React", "Node.js", "Python"];
      for (const skillName of skillsToAssign) {
        const [sRows] = await conn.execute("SELECT id FROM skills WHERE name = ?", [skillName]);
        let skillId;
        if (sRows.length > 0) {
          skillId = sRows[0].id;
        } else {
          const [sRes] = await conn.execute("INSERT INTO skills (name, slug) VALUES (?, ?)", [skillName, skillName.toLowerCase()]);
          skillId = sRes.insertId;
        }
        await conn.execute("INSERT IGNORE INTO developer_skills (developer_id, skill_id, sp) VALUES (?, ?, 100)", [devId, skillId]);
      }

      console.log(`Developer profile set for #${userId} with approval_status = 'approved'`);
    }
  }

  console.log("\n✅ ALL 3 ACCOUNTS CREATED & UPDATED SUCCESSFULLY IN DATABASE WITH ONBOARDING COMPLETED & DEVELOPER APPROVED!");
  await conn.end();
}

seed().catch((err) => {
  console.error("❌ Seeding failed:", err);
  process.exit(1);
});
