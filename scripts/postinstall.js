import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const p = path.join(root, 'node_modules', 'baileys');
const t = path.join(root, 'node_modules', '@whiskeysockets', 'baileys');

if (!fs.existsSync(p)) {
  fs.symlinkSync(t, p, 'dir');
  console.log('[postinstall] baileys → @whiskeysockets/baileys symlink dibuat');
} else {
  console.log('[postinstall] baileys symlink sudah ada');
}
