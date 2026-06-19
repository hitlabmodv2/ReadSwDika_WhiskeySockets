/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  ceksesi.cjs — Cek status sesi Baileys (.ceksesi)
 *  Info file sesi, ukuran, jumlah key, aktif atau tidak
 * ───────────────────────────────
 */
'use strict';

/**
 * cekSesi — tampilkan info detail sessions/hisoka.json
 * Bekerja dengan format SINGLE FILE JSON (bukan multi-file folder).
 *
 * Output: breakdown per kategori key, ukuran, dan saran pruning
 */

const fs   = require('fs');
const path = require('path');

const SESSION_FILE = path.resolve('./sessions/hisoka.json');

function byteSize(obj) {
        return Buffer.byteLength(JSON.stringify(obj));
}

function fmtKB(bytes) {
        return (bytes / 1024).toFixed(1) + ' KB';
}

function fmtMB(bytes) {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

const EMOJI_MAP = {
        'creds':                   '🛡️',
        'contacts':                '👥',
        'groups':                  '🫂',
        'settings':                '⚙️',
        'pre-key':                 '🗝️',
        'session':                 '🔑',
        'sender-key':              '📨',
        'identity-key':            '🪪',
        'device-list':             '📱',
        'lid-mapping':             '🗺️',
        'app-state-sync-key':      '🔄',
        'app-state-sync-version':  '📋',
        'tctoken':                 '🎫',
};

const DESC_MAP = {
        'creds':                   'Kredensial utama bot — JANGAN hapus',
        'contacts':                'Cache kontak — aman dihapus (auto re-populate)',
        'groups':                  'Cache data grup — aman dihapus (auto re-fetch)',
        'settings':                'Pengaturan sesi lokal',
        'pre-key':                 'Kunci E2E — aman trim (sisakan 100 terbaru)',
        'session':                 'Sesi aktif per kontak — jangan hapus sembarangan',
        'sender-key':              'Kunci enkripsi grup — aman dihapus (auto re-gen)',
        'identity-key':            'Identitas kontak (Signal) — jangan hapus',
        'device-list':             'Daftar perangkat kontak — aman dihapus',
        'lid-mapping':             'Cache LID→PN — aman dihapus (auto re-fetch)',
        'app-state-sync-key':      'Sync state WA — jangan hapus',
        'app-state-sync-version':  'Versi sync state — aman dihapus (auto re-sync)',
        'tctoken':                 'Token cache — aman dihapus',
};

const SAFE_DELETE = new Set([
        'contacts', 'groups', 'lid-mapping', 'sender-key',
        'app-state-sync-version', 'tctoken',
]);

const SAFE_TRIM = new Set(['pre-key']);

function cekSesi() {
        if (!fs.existsSync(SESSION_FILE)) throw new Error('SESSION_NOT_FOUND');

        const raw     = fs.readFileSync(SESSION_FILE, 'utf8');
        const data    = JSON.parse(raw);
        const fileSizeByte = Buffer.byteLength(raw);

        const rows = [];

        // creds (flat object)
        if (data.creds) {
                rows.push({
                        key:   'creds',
                        count: Object.keys(data.creds).length + ' field',
                        bytes: byteSize(data.creds),
                        safe:  'KEEP',
                });
        }

        // keys sub-object
        if (data.keys && typeof data.keys === 'object') {
                for (const subKey of Object.keys(data.keys)) {
                        const obj   = data.keys[subKey] || {};
                        const count = Object.keys(obj).length;
                        const bytes = byteSize(obj);
                        let safe = 'KEEP';
                        if (SAFE_DELETE.has(subKey)) safe = 'HAPUS';
                        if (SAFE_TRIM.has(subKey))   safe = 'TRIM';
                        rows.push({ key: subKey, count: count + ' entri', bytes, safe });
                }
        }

        // contacts top-level
        if (data.contacts) {
                const count = Object.keys(data.contacts).length;
                rows.push({ key: 'contacts', count: count + ' kontak', bytes: byteSize(data.contacts), safe: 'HAPUS' });
        }

        // groups top-level
        if (data.groups) {
                const count = Object.keys(data.groups).length;
                rows.push({ key: 'groups', count: count + ' grup', bytes: byteSize(data.groups), safe: 'HAPUS' });
        }

        // settings top-level
        if (data.settings) {
                rows.push({ key: 'settings', count: '1 obj', bytes: byteSize(data.settings), safe: 'KEEP' });
        }

        // Hitung potensi hemat
        let potentialSave = 0;
        for (const r of rows) {
                if (r.safe === 'HAPUS') potentialSave += r.bytes;
                if (r.safe === 'TRIM')  potentialSave += Math.max(0, r.bytes - Math.round(r.bytes * (100 / Math.max(1, parseInt(r.count)))));
        }

        // Sort: HAPUS & TRIM dulu (terbesar), lalu KEEP
        rows.sort((a, b) => {
                const order = { 'HAPUS': 0, 'TRIM': 1, 'KEEP': 2 };
                if (order[a.safe] !== order[b.safe]) return order[a.safe] - order[b.safe];
                return b.bytes - a.bytes;
        });

        return {
                rows,
                fileSizeByte,
                fmtFileSize: fmtMB(fileSizeByte),
                fmtKB,
                fmtMB,
                SESSION_FILE,
        };
}

module.exports = { cekSesi };
