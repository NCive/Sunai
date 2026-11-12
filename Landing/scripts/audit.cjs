const fs = require('fs');
const path = require('path');

const emojiRegex = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/u;
const bannedTerms = ['TODO', 'placeholder', 'lorem'];
const oldColors = [
  '#116466', '#D1E8E2', '#FFCB9A', '#D9B08C', '#2C3531',
  '#070F0D', '#0D1C19', '#142824', '#A3C8BF', '#188082',
  '#0a1815', '#050a08', '#9aeadd', '#1a332d', '#0f1f1b',
  '#172a24', '#23443b', '#0b1613', '#1d3b34', '#284e45'
];

function auditDir(dirPath) {
  let issues = 0;
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.tsx') || full.endsWith('.css'))) {
        const text = fs.readFileSync(full, 'utf8');
        if (emojiRegex.test(text)) {
          console.error(`[EMOJI] in ${full}`);
          issues++;
        }
        for (const term of bannedTerms) {
          if (text.toLowerCase().includes(term.toLowerCase())) {
            console.error(`[BANNED TERM: ${term}] in ${full}`);
            issues++;
          }
        }
        for (const col of oldColors) {
          if (text.toLowerCase().includes(col.toLowerCase())) {
            console.error(`[OLD COLOR: ${col}] in ${full}`);
            issues++;
          }
        }
      }
    }
  }
  walk(dirPath);
  return issues;
}

const frontendIssues = auditDir(path.resolve(__dirname, '../../Frontend/src'));
const landingIssues = auditDir(path.resolve(__dirname, '../src'));

console.log(`Frontend src issues: ${frontendIssues}`);
console.log(`Landing src issues: ${landingIssues}`);
if (frontendIssues === 0 && landingIssues === 0) {
  console.log('AUDIT PASSED: 0 emojis, 0 banned words, 0 old colors across both src directories!');
  process.exit(0);
} else {
  console.error('AUDIT FAILED!');
  process.exit(1);
}

