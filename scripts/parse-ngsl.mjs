import fs from 'fs';
const lines = fs.readFileSync('raw-data/NGSL.csv', 'utf8').split('\n');
const words = [];
let id = 1;
for (let i = 1; i < lines.length; i++) {
  const line = lines[i].trim();
  if (!line) continue;
  const parts = line.split(',');
  const word = parts[0];
  let meaning = parts.slice(1).join(',').trim();
  // Remove wrapping quotes if any
  if (meaning.startsWith('"') && meaning.endsWith('"')) {
    meaning = meaning.substring(1, meaning.length - 1);
  }
  meaning = meaning.replace(/,/g, '/').replace(/\s*\/\s*/g, '/');
  if (word && meaning) {
    words.push(`  { id: ${id++}, word: ${JSON.stringify(word)}, meaning: ${JSON.stringify(meaning)} }`);
  }
}
const out = `import type { Card } from '../types/card';\n\nexport const NGSL_WORDS: Omit<Card, 'box' | 'lastReviewed' | 'correctCount' | 'wrongCount' | 'box4EntryIndex' | 'graduated'>[] = [\n${words.join(',\n')}\n];\n`;
fs.writeFileSync('src/data/ngsl.ts', out);
