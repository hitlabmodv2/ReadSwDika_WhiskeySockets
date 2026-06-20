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
 *  clearsesi.cjs — Reset file sesi WA (.clearsesi)
 *  Hapus hisoka.json tanpa perlu pairing ulang penuh
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Clear Sesi WA (.clearsesi)
 *  Hapus & reset file sesi WhatsApp (hisoka.json) tanpa perlu
 *  pairing ulang secara penuh — berguna saat bot terkena ban
 *  atau sesi corrupt, juga tersedia mode per-sesi JadiBot.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

/**
 * clearSesi — bersihkan sessions/hisoka.json tanpa pairing ulang
 *
 * KEEP (wajib, agar bot tetap konek tanpa pairing ulang):
 *   creds, keys.app-state-sync-key, keys.identity-key,
 *   keys.session, keys.device-list, settings
 *
 * HAPUS / TRIM (cache — di-refetch otomatis oleh Baileys):
 *   contacts, groups,
 *   keys.lid-mapping, keys.sender-key,
 *   keys.app-state-sync-version, keys.tctoken,
 *   keys.pre-key → trim, sisakan 100 id terbesar (belum dipakai)
 */

const fs   = require('fs');
const path = require('path');

const SESSION_FILE = path.resolve('./sessions/hisoka.json');

function byteSize(obj) {
        return Buffer.byteLength(JSON.stringify(obj));
}

function fmtMB(bytes) {
        return (bytes / 1024 / 1024).toFixed(2) + ' MB';
}

/**
 * clearSesi(onStep)
 *   onStep({ steps, totalSaved, beforeSize }) — dipanggil tiap langkah selesai
 * Returns { steps, beforeSize, afterSize, fmtBefore, fmtAfter, fmtSaved }
 */
async function clearSesi(onStep) {
        if (!fs.existsSync(SESSION_FILE)) throw new Error('SESSION_NOT_FOUND');

        const raw        = fs.readFileSync(SESSION_FILE, 'utf8');
        const data       = JSON.parse(raw);
        const beforeSize = Buffer.byteLength(raw);

        const steps = [];
        let totalSaved = 0;

        async function doStep(name, label, savedBytes) {
                steps.push({ name, label, savedBytes });
                totalSaved += savedBytes;
                if (onStep) {
                        try { await onStep({ steps, totalSaved, beforeSize }); } catch (_) {}
                }
        }

        // 1. contacts
        {
                const cnt   = Object.keys(data.contacts || {}).length;
                const bytes = byteSize(data.contacts || {});
                data.contacts = {};
                await doStep('contacts', `${cnt} kontak`, bytes);
        }

        // 2. groups
        {
                const cnt   = Object.keys(data.groups || {}).length;
                const bytes = byteSize(data.groups || {});
                data.groups = {};
                await doStep('groups', `${cnt} grup`, bytes);
        }

        // 3. lid-mapping
        if (data.keys?.['lid-mapping']) {
                const cnt   = Object.keys(data.keys['lid-mapping']).length;
                const bytes = byteSize(data.keys['lid-mapping']);
                data.keys['lid-mapping'] = {};
                await doStep('lid-mapping', `${cnt} entri`, bytes);
        }

        // 4. sender-key
        if (data.keys?.['sender-key']) {
                const cnt   = Object.keys(data.keys['sender-key']).length;
                const bytes = byteSize(data.keys['sender-key']);
                data.keys['sender-key'] = {};
                await doStep('sender-key', `${cnt} entri`, bytes);
        }

        // 5. app-state-sync-version
        if (data.keys?.['app-state-sync-version']) {
                const cnt   = Object.keys(data.keys['app-state-sync-version']).length;
                const bytes = byteSize(data.keys['app-state-sync-version']);
                data.keys['app-state-sync-version'] = {};
                await doStep('app-state-sync-version', `${cnt} entri`, bytes);
        }

        // 6. tctoken
        if (data.keys?.['tctoken']) {
                const cnt   = Object.keys(data.keys['tctoken']).length;
                const bytes = byteSize(data.keys['tctoken']);
                data.keys['tctoken'] = {};
                await doStep('tctoken', `${cnt} entri`, bytes);
        }

        // 7. pre-key — trim, sisakan 100 id terbesar
        if (data.keys?.['pre-key']) {
                const obj   = data.keys['pre-key'];
                const ids   = Object.keys(obj).map(Number).sort((a, b) => a - b);
                const KEEP  = 100;
                const keep  = ids.slice(Math.max(0, ids.length - KEEP));
                const removed = ids.length - keep.length;
                const bytesBefore = byteSize(obj);
                const newObj = {};
                for (const id of keep) newObj[String(id)] = obj[String(id)];
                data.keys['pre-key'] = newObj;
                const saved2 = bytesBefore - byteSize(newObj);
                await doStep(
                        'pre-key (trim)',
                        `hapus ${removed} lama, sisakan ${keep.length}`,
                        saved2
                );
        }

        // Tulis ulang file
        const newRaw    = JSON.stringify(data);
        fs.writeFileSync(SESSION_FILE, newRaw, 'utf8');
        const afterSize = Buffer.byteLength(newRaw);

        return {
                steps,
                beforeSize,
                afterSize,
                savedBytes:  beforeSize - afterSize,
                fmtBefore:   fmtMB(beforeSize),
                fmtAfter:    fmtMB(afterSize),
                fmtSaved:    fmtMB(beforeSize - afterSize)
        };
}

module.exports = { clearSesi, fmtMB };

// ── HANDLER: clearsesi ────────────────────────────────────────────────────────

async function handleClearsesi({ hisoka, m, tolak, logCommand, getJadibotNumber, jadibotClearSesiMap }) {
        const _csIsJadibot = hisoka?.isMainBot === false;
        if (!m.isOwner && !_csIsJadibot) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner!');

        const jadibotNumCtx = _csIsJadibot ? getJadibotNumber(hisoka) : null;
        const clearFn = _csIsJadibot
                ? jadibotClearSesiMap.get(jadibotNumCtx)
                : global.__clearSesiInPlace;

        if (!clearFn) {
                return tolak(hisoka, m, '❌ Fungsi clearSesi tidak tersedia. Coba restart bot terlebih dahulu.');
        }

        const sessionLabel = _csIsJadibot
                ? `jadibot/${jadibotNumCtx}.json`
                : `sessions/hisoka.json`;

        const fmtMBCS = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';

        const ICONS = {
                'contacts':               '👥',
                'groups':                 '👨‍👩‍👦',
                'lid-mapping':            '🗺️',
                'sender-key':             '🔑',
                'app-state-sync-version': '🔄',
                'tctoken':                '🎫',
                'pre-key (trim)':         '🗝️',
        };

        const csProgMsg = await m.reply(
                `🧹 *Clear Sesi — Memulai...*\n\n` +
                `📂 *File :* ${sessionLabel}\n` +
                `🔍 *Memeriksa dan membersihkan cache...*\n\n` +
                `_Harap tunggu..._`
        );

        try {
                const result = await clearFn(async ({ steps, totalSaved, beforeSize }) => {
                        if (!csProgMsg?.key) return;

                        const lines = steps.map(s => {
                                const icon = ICONS[s.name] || '📦';
                                const kb   = (s.savedBytes / 1024).toFixed(1);
                                return `  ${icon} *${s.name}* — ${s.label} (hemat ${kb} KB)`;
                        }).join('\n');

                        const pctSaved = Math.min(100, Math.round((totalSaved / beforeSize) * 100));
                        const bar = '[' + '█'.repeat(Math.round(pctSaved / 10)) + '░'.repeat(10 - Math.round(pctSaved / 10)) + ']';

                        try {
                                await m.reply({
                                        edit: csProgMsg.key,
                                        text:
                                                `🧹 *Clear Sesi — Sedang berjalan...*\n\n` +
                                                `📊 *Progress :* ${bar} ${pctSaved}%\n` +
                                                `💾 *Hemat :* ${fmtMBCS(totalSaved)}\n\n` +
                                                `*Langkah selesai:*\n` +
                                                `${lines}\n\n` +
                                                `_Harap tunggu..._`
                                });
                        } catch (_) {}
                });

                const linesDone = result.steps.map(s => {
                        const icon = ICONS[s.name] || '📦';
                        const kb   = (s.savedBytes / 1024).toFixed(1);
                        return `  ${icon} *${s.name}* — ${s.label} (${kb} KB)`;
                }).join('\n');

                const doneText =
                        `✅ *Clear Sesi selesai!*\n\n` +
                        `📂 *File :* ${sessionLabel}\n` +
                        `📉 *Sebelum :* ${result.fmtBefore}\n` +
                        `📈 *Sesudah :* ${result.fmtAfter}\n` +
                        `💾 *Total hemat :* ${result.fmtSaved}\n\n` +
                        `*Detail yang dibersihkan:*\n` +
                        `${linesDone}\n\n` +
                        `_Bot tetap aktif, tidak perlu pairing ulang_ ✔️`;

                if (csProgMsg?.key) {
                        await m.reply({ edit: csProgMsg.key, text: doneText });
                } else {
                        await m.reply(doneText);
                }
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal clear sesi: ${err.message}`);
        }

        logCommand(m, hisoka, 'clearsesi');
}

module.exports.handleClearsesi = handleClearsesi;
