const fs = require('fs');
const path = require('path');

const APPROVED_PALETTE = {
  // Core 6 Tokens
  '#0A0807': '--space-black (darkest void, text on white/gold buttons)',
  '#0B1330': '--space-navy (primary app background, cards, panels)',
  '#2A4F9A': '--space-blue (milky way glow, borders, active fills)',
  '#F2F4FF': '--space-star (primary text, stars, white buttons)',
  '#7A5236': '--space-brown (warm cosmic dust tint, secondary accents)',
  '#C89A5E': '--space-gold (stellar core, badges, secondary highlights)',
  
  // Semantic Decision Colors
  '#2FD3A5': '--decision-green (harmless backchannel / resume)',
  '#FF6A5C': '--decision-red (interruption / stop & listen)',
  '#FFD166': '--decision-amber (unclear / checking state)',

  // Pure White & Translucent Overlays
  '#FFFFFF': 'pure white (max highlight / hover)',
};

const BANNED_PATTERNS = [
  '#116466', '#d1e8e2', '#ffcb9a', '#d9b08c', '#2c3531',
  '#070f0d', '#0d1c19', '#142824', '#a3c8bf', '#188082',
  '#0a1815', '#050a08', '#9aeadd', '#1a332d', '#0f1f1b',
  '#172a24', '#23443b', '#0b1613', '#1d3b34', '#284e45',
  'made of stars', 'peach', 'teal', 'mint'
];

const targetDirs = [
  'Sunai/Frontend/src',
  'Sunai/Landing/src',
  'Sunai/Landing/public',
  'Sunai/Frontend/index.html',
  'Sunai/Landing/index.html',
];

const hexRegex = /#([0-9a-fA-F]{3,8})\b/g;
const rgbaRegex = /rgba?\(\s*([0-9]+)\s*,\s*([0-9]+)\s*,\s*([0-9]+)(?:\s*,\s*([0-9.]+))?\s*\)/g;

const foundHexes = new Set();
const foundRgb = new Set();
let bannedFound = [];

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');

  // Check banned patterns
  const lower = content.toLowerCase();
  for (const b of BANNED_PATTERNS) {
    if (lower.includes(b)) {
      bannedFound.push({ file: filePath, pattern: b });
    }
  }

  // Extract Hexes
  let m;
  while ((m = hexRegex.exec(content)) !== null) {
    foundHexes.add(m[0].toUpperCase());
  }

  // Extract RGBA
  while ((m = rgbaRegex.exec(content)) !== null) {
    foundRgb.add(m[0]);
  }
}

function walkDir(dir) {
  if (fs.statSync(dir).isFile()) {
    scanFile(dir);
    return;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (e.name !== 'node_modules' && e.name !== 'dist' && e.name !== 'vad') {
        walkDir(full);
      }
    } else if (/\.(ts|tsx|css|svg|html)$/i.test(e.name)) {
      scanFile(full);
    }
  }
}

targetDirs.forEach(d => walkDir(d));

console.log('=== APPROVED PALETTE INVENTORY ===');
const hexList = Array.from(foundHexes).sort();
hexList.forEach(hex => {
  const desc = APPROVED_PALETTE[hex] || (APPROVED_PALETTE[hex.slice(0, 7)] ? `Toned/Alpha of ${hex.slice(0, 7)}` : 'Custom palette color');
  console.log(`  ${hex.padEnd(10)} -> ${desc}`);
});

console.log('\n=== RGBA TINTS & SHADES INVENTORY ===');
const rgbList = Array.from(foundRgb).sort();
rgbList.forEach(rgb => {
  console.log(`  ${rgb}`);
});

console.log('\n=== BANNED OLD THEME PATTERN CHECK ===');
if (bannedFound.length === 0) {
  console.log('  PASS: Exactly 0 matches for old teal, peach, mint, and "Made of Stars"!');
} else {
  console.error('  FAIL: Found banned occurrences:', bannedFound);
  process.exit(1);
}

