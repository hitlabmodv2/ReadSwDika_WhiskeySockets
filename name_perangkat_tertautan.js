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

export const BROWSER_LIST = [
        { key: 'v1',  label: 'Ubuntu + Chrome',         value: ['Ubuntu',   'Chrome',  '136.0.7103.93']  },
        { key: 'v2',  label: 'Windows + Chrome',        value: ['Windows',  'Chrome',  '136.0.7103.93']  },
        { key: 'v3',  label: 'MacOS + Chrome',          value: ['MacOS',    'Chrome',  '136.0.7103.93']  },
        { key: 'v4',  label: 'Ubuntu + Firefox',        value: ['Ubuntu',   'Firefox', '136.0.7103.93']  },
        { key: 'v5',  label: 'Windows + Firefox',       value: ['Windows',  'Firefox', '136.0.7103.93']  },
        { key: 'v6',  label: 'MacOS + Firefox',         value: ['MacOS',    'Firefox', '136.0.7103.93']  },
        { key: 'v7',  label: 'Ubuntu + Safari',         value: ['Ubuntu',   'Safari',  '136.0.7103.93']  },
        { key: 'v8',  label: 'MacOS + Safari',          value: ['MacOS',    'Safari',  '136.0.7103.93']  },
        { key: 'v9',  label: 'Windows + Edge',          value: ['Windows',  'Edge',    '136.0.7103.93']  },
        { key: 'v10', label: 'Ubuntu + Edge',           value: ['Ubuntu',   'Edge',    '136.0.7103.93']  },
        { key: 'v11', label: 'Android + Chrome Mobile', value: ['Android',  'Chrome',  '136.0.7103.93']  },
        { key: 'v12', label: 'iPhone + Safari Mobile',  value: ['iPhone',   'Safari',  '136.0.7103.93']  },
];

export function getBrowserDevice(cfg) {
        const selected = (cfg?.browserDevice?.selected || 'v1').toLowerCase();
        const found = BROWSER_LIST.find(b => b.key === selected);
        return found ? found.value : BROWSER_LIST[0].value;
}

export default getBrowserDevice;
