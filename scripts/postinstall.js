/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  Support dari kalian bikin saya
 *  makin semangat update fitur,
 *  fix bug, dan rawat script ini.
 *
 *  Dilarang menjual ulang script ini
 *  Tanpa izin resmi dari developer.
 *  Jika ketahuan = NO UPDATE / NO FIX
 *
 *  Hargai karya, gunakan dengan bijak.
 *  Terima kasih sudah support.
 * ───────────────────────────────
 *
 *  postinstall.js — Script setup setelah npm install
 *  Buat symlink baileys → @whiskeysockets/baileys otomatis
 * ───────────────────────────────
 */
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
