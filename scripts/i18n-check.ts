import fs from 'fs';
import path from 'path';
import { fr } from '../src/i18n/fr';
import { en } from '../src/i18n/en';

const files: string[] = [];
(function walk(d: string) { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.(ts|tsx)$/.test(f.name) && !p.includes('/i18n/')) files.push(p); } })('src');
const used = new Set<string>();
for (const f of files) {
  const s = fs.readFileSync(f, 'utf8');
  for (const m of s.matchAll(/\bt\(\s*'([a-zA-Z][\w.]*)'/g)) used.add(m[1]);
}
const missing = [...used].filter((k) => !(k in fr) || !(k in en));
console.log(missing.length ? 'MISSING:\n' + missing.sort().join('\n') : 'all static keys present');
const unequal = Object.keys(fr).filter((k) => !(k in en)).concat(Object.keys(en).filter((k) => !(k in fr)));
if (unequal.length) console.log('FR/EN mismatch:', unequal);
