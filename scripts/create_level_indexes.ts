import fs from "node:fs";
import path from "node:path";

const levelsDir = path.resolve("data/levels");
const subtitlesDir = path.resolve("data/subtitles");

if (!fs.existsSync(levelsDir)) {
  console.error(`Levels directory not found: ${levelsDir}`);
  process.exit(1);
}

fs.mkdirSync(subtitlesDir, { recursive: true });

const placeholderSubtitlePath = path.join(subtitlesDir, "replace_this.json");

if (!fs.existsSync(placeholderSubtitlePath)) {
  const placeholderSubtitle = {
    name: "replace_this",
    items: [],
  };

  fs.writeFileSync(
    placeholderSubtitlePath,
    JSON.stringify(placeholderSubtitle, null, 2) + "\n",
    "utf8",
  );

  console.log(`Created ${placeholderSubtitlePath}`);
}

const levelDirs = fs
  .readdirSync(levelsDir, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort((a, b) => a.localeCompare(b));

let created = 0;
let skipped = 0;

for (const levelName of levelDirs) {
  const levelPath = path.join(levelsDir, levelName);
  const indexPath = path.join(levelPath, "index.mdx");

  if (fs.existsSync(indexPath)) {
    skipped += 1;
    continue;
  }

  const content = `---
title: "${levelName}"
subtitles:
  - replace_this
---
`;

  fs.writeFileSync(indexPath, content, "utf8");
  created += 1;
}

console.log(`Created ${created} level index files.`);
console.log(`Skipped ${skipped} existing index files.`);
