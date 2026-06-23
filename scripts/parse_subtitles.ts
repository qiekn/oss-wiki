//
// Generate by GPT-5.5 2026-06-23 16:17
//

import fs from "node:fs";
import path from "node:path";

interface SubtitleItem {
  character: string;
  marker: string;
  comment: string;
  text: string;
}

interface SubtitleEntry {
  name: string;
  items: SubtitleItem[];
}

interface SubtitleIndexItem {
  name: string;
  file: string;
}

const inputFile = path.resolve("data/en.subtitles");
const outputDir = path.resolve("data/subtitles");

if (!fs.existsSync(inputFile)) {
  console.error(`Input file not found: ${inputFile}`);
  process.exit(1);
}

fs.rmSync(outputDir, { recursive: true, force: true });
fs.mkdirSync(outputDir, { recursive: true });

const raw = fs.readFileSync(inputFile, "utf8");
const lines = raw.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

let currentEntry: SubtitleEntry | null = null;
let currentItem: SubtitleItem | null = null;

const entries: SubtitleEntry[] = [];

function sanitizeFileName(name: string): string {
  return name.replace(/[<>:"/\\|?*\x00-\x1F]/g, "_").replace(/\s+/g, "_");
}

function normalizeText(text: string): string {
  return text
    .split("\n")
    .map((line) => line.trimEnd())
    .join("\n")
    .trim();
}

function isEmptyEndMarker(item: SubtitleItem): boolean {
  return (
    item.character === "_" &&
    item.text.trim() === "" &&
    item.comment.trim() === ""
  );
}

function finishCurrentItem(): void {
  if (!currentEntry || !currentItem) return;

  const item: SubtitleItem = {
    character: currentItem.character,
    marker: currentItem.marker,
    comment: normalizeText(currentItem.comment),
    text: normalizeText(currentItem.text),
  };

  if (!isEmptyEndMarker(item)) {
    currentEntry.items.push(item);
  }

  currentItem = null;
}

function finishCurrentEntry(): void {
  if (!currentEntry) return;

  finishCurrentItem();

  if (currentEntry.name.length > 0) {
    entries.push(currentEntry);
  }

  currentEntry = null;
}

function appendItemText(line: string): void {
  if (!currentItem) return;
  currentItem.text += currentItem.text ? `\n${line}` : line;
}

function appendItemComment(comment: string): void {
  if (!currentItem) return;
  currentItem.comment += currentItem.comment ? `\n${comment}` : comment;
}

for (const rawLine of lines) {
  const line = rawLine.trimEnd();
  const trimmed = line.trim();

  if (trimmed === "") {
    if (currentItem) {
      currentItem.text += "\n";
    }
    continue;
  }

  const nameMatch = trimmed.match(/^:{1,2}\s*(.+)$/);

  if (nameMatch) {
    finishCurrentEntry();

    currentEntry = {
      name: nameMatch[1].trim(),
      items: [],
    };

    continue;
  }

  const cueMatch = trimmed.match(/^=\s+(\S+)\s+(.+)$/);

  if (cueMatch) {
    if (!currentEntry) {
      throw new Error(`Found cue before subtitle name: ${line}`);
    }

    finishCurrentItem();

    currentItem = {
      character: cueMatch[1],
      marker: cueMatch[2].trim(),
      comment: "",
      text: "",
    };

    continue;
  }

  if (!currentItem) {
    console.warn(`Ignored line without active item: ${line}`);
    continue;
  }

  const itemCommentMatch = trimmed.match(/^\+\+\s*(.*)$/);

  if (itemCommentMatch) {
    appendItemComment(itemCommentMatch[1].trim());
    continue;
  }

  appendItemText(line);
}

finishCurrentEntry();

const index: SubtitleIndexItem[] = [];

for (const entry of entries) {
  const fileName = `${sanitizeFileName(entry.name)}.json`;
  const filePath = path.join(outputDir, fileName);

  fs.writeFileSync(filePath, JSON.stringify(entry, null, 2) + "\n", "utf8");

  index.push({
    name: entry.name,
    file: fileName,
  });
}

fs.writeFileSync(
  path.join(outputDir, "index.json"),
  JSON.stringify(index, null, 2) + "\n",
  "utf8",
);

console.log(`Parsed ${entries.length} subtitle entries.`);
console.log(`Input: ${inputFile}`);
console.log(`Output: ${outputDir}`);
