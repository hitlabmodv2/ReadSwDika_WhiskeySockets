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
        // Elemen ketiga adalah versi OS dari profil resmi Baileys,
        // bukan versi Chrome/Firefox/Safari.
        { key: 'v1',  label: 'Ubuntu + Chrome',         value: Browsers.ubuntu('Chrome')                  },
        { key: 'v2',  label: 'Windows + Chrome',        value: Browsers.windows('Chrome')                 },
        { key: 'v3',  label: 'MacOS + Chrome',          value: Browsers.macOS('Chrome')                   },
        { key: 'v4',  label: 'Ubuntu + Firefox',        value: Browsers.ubuntu('Firefox')                 },
        { key: 'v5',  label: 'Windows + Firefox',       value: Browsers.windows('Firefox')                },
        { key: 'v6',  label: 'MacOS + Firefox',         value: Browsers.macOS('Firefox')                  },
        { key: 'v7',  label: 'Ubuntu + Safari',         value: Browsers.ubuntu('Safari')                  },
        { key: 'v8',  label: 'MacOS + Safari',          value: Browsers.macOS('Safari')                   },
        { key: 'v9',  label: 'Windows + Edge',          value: Browsers.windows('Edge')                   },
        { key: 'v10', label: 'Ubuntu + Edge',           value: Browsers.ubuntu('Edge')                    },
        { key: 'v11', label: 'Android + Chrome Mobile', value: Browsers.android('Chrome')                 },
        { key: 'v12', label: 'iPhone + Safari Mobile',  value: ['iPhone', 'Safari', '17.5.1']             },
        { key: 'v13', label: 'Windows + Opera',         value: Browsers.windows('Opera')                   },
        { key: 'v14', label: 'MacOS + Edge',            value: Browsers.macOS('Edge')                      },
        { key: 'v15', label: 'Ubuntu + Opera',          value: Browsers.ubuntu('Opera')                    },
        { key: 'v16', label: 'MacOS + Opera',           value: Browsers.macOS('Opera')                     },
];

export function getBrowserDevice(cfg) {
        const selected = (cfg?.browserDevice?.selected || 'v1').toLowerCase();
        const found = BROWSER_LIST.find(b => b.key === selected);
        return found ? [...found.value] : [...BROWSER_LIST[0].value];
}

export default getBrowserDevice;
