const fs = require("fs");
const path = require("path");
const sharp = require("sharp");

async function main() {
  const svgPath = path.join(__dirname, "..", "app", "icon.svg");
  const svgBuffer = fs.readFileSync(svgPath);

  const targets = [
    { dest: path.join(__dirname, "..", "public", "favicon-16x16.png"), size: 16 },
    { dest: path.join(__dirname, "..", "public", "favicon-32x32.png"), size: 32 },
    { dest: path.join(__dirname, "..", "public", "apple-touch-icon.png"), size: 180 },
    { dest: path.join(__dirname, "..", "public", "android-chrome-192x192.png"), size: 192 },
    { dest: path.join(__dirname, "..", "public", "android-chrome-512x512.png"), size: 512 },
    { dest: path.join(__dirname, "..", "app", "icon.png"), size: 512 },
  ];

  const iconsDir = path.join(__dirname, "..", "public", "icons");
  if (!fs.existsSync(iconsDir)) fs.mkdirSync(iconsDir, { recursive: true });

  targets.push(
    { dest: path.join(iconsDir, "favicon-16x16.png"), size: 16 },
    { dest: path.join(iconsDir, "favicon-32x32.png"), size: 32 },
    { dest: path.join(iconsDir, "apple-touch-icon.png"), size: 180 }
  );

  for (const { dest, size } of targets) {
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(dest);
    console.log(`Generated: ${dest} (${size}x${size})`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
