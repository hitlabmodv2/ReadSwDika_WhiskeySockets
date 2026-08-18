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
 *  name_perangkat_tertautan.js — Daftar profil perangkat WhatsApp
 *  Menyediakan pilihan browser/device untuk proses pairing bot
 * ───────────────────────────────
 */
/**
 * ─────────────────────────────────────────────
 *  ⚠️  PERHATIAN SEBELUM MENGUBAH FILE INI  ⚠️
 * ─────────────────────────────────────────────
 *  Ganti browser lewat command bot:
 *    .aturbrowser       → lihat semua pilihan
 *    .aturbrowser v1    → ganti ke pilihan V1
 *
 *  Setelah mengganti, bot perlu di-restart
 *  agar perubahan perangkat tertaut berlaku.
 * ─────────────────────────────────────────────
 */

import { Browsers } from '@whiskeysockets/baileys';

export const BROWSER_LIST = [
        // Gunakan factory resmi Baileys. Elemen ketiga adalah versi OS,
        // bukan versi Chrome; hardcode Chrome build lama bisa dianggap
        // sebagai profil browser non-canonical saat pairing/reconnect.
        { key: 'v1',  label: 'Ubuntu + Chrome',         value: Browsers.ubuntu('Chrome')                  },
        { key: 'v2',  label: 'Windows + Chrome',        value: ['Windows',  'Chrome',  '125.0.6422.141']     },
        { key: 'v3',  label: 'MacOS + Chrome',          value: ['Mac OS',   'Chrome',  '126.0.6478.114']     },
        { key: 'v4',  label: 'Ubuntu + Firefox',        value: ['Ubuntu',   'Firefox', '125.0.1.20240501']   },
        { key: 'v5',  label: 'Windows + Firefox',       value: ['Windows',  'Firefox', '126.0.0.20240603']   },
        { key: 'v6',  label: 'MacOS + Firefox',         value: ['Mac OS',   'Firefox', '127.0.0.20240617']   },
        { key: 'v7',  label: 'Ubuntu + Safari',         value: ['Ubuntu',   'Safari',  '617.2.4.4.9.1']      },
        { key: 'v8',  label: 'MacOS + Safari',          value: ['Mac OS',   'Safari',  '619.2.8.12.8.1']     },
        { key: 'v9',  label: 'Windows + Edge',          value: ['Windows',  'Edge',    '124.0.2478.67']      },
        { key: 'v10', label: 'Ubuntu + Edge',           value: ['Ubuntu',   'Edge',    '125.0.2535.51']      },
        { key: 'v11', label: 'Android + Chrome Mobile', value: ['Android',  'Chrome',  '125.0.6422.165']     },
        { key: 'v12', label: 'iPhone + Safari Mobile',  value: ['iPhone',   'Safari',  '619.2.8.12.8.1']     },
];

export function getBrowserDevice(cfg) {
        const selected = (cfg?.browserDevice?.selected || 'v1').toLowerCase();
        const found = BROWSER_LIST.find(b => b.key === selected);
        return found ? found.value : BROWSER_LIST[0].value;
}

export default getBrowserDevice;
