'use strict';

/**
 * ─────────────────────────────────────────
 *  Notif Info Grup (notifgc)
 *  Kirim notifikasi ke grup bila ada perubahan
 *  info grup: nama, ikon, deskripsi, pengaturan, dll.
 *  By Wilykun — script khusus donasi/VIP
 * ─────────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

// Ambil helper Baileys dari package
let _jidNormalizedUser = null;
let _jidDecode = null;
try {
        const baileys = require('@whiskeysockets/baileys');
        _jidNormalizedUser = baileys.jidNormalizedUser;
        _jidDecode = baileys.jidDecode;
} catch (_) {
        try {
                const baileys = require('baileys');
                _jidNormalizedUser = baileys.jidNormalizedUser;
                _jidDecode = baileys.jidDecode;
        } catch (__) {}
}

function jidNorm(jid) {
        if (!jid) return jid;
        try { return _jidNormalizedUser ? _jidNormalizedUser(jid) : jid; } catch (_) { return jid; }
}
function jidUser(jid) {
        if (!jid) return '';
        try {
                if (_jidDecode) {
                        const d = _jidDecode(jid);
                        if (d?.user) return d.user;
                }
        } catch (_) {}
        return jid.split('@')[0].split(':')[0];
}

// ── Mode debug: aktifkan via env BOT_DEBUG_LOG=true atau NOTIFGC_DEBUG=true ──
const DEBUG = process.env.BOT_DEBUG_LOG === 'true' || process.env.NOTIFGC_DEBUG === 'true';

function dbg(...args) {
        if (DEBUG) console.log('\x1b[36m[NotifGC DEBUG]\x1b[39m', ...args);
}

// ─── Helper: baca config.json ───────────────────────────────────────────────
function loadConfig() {
        try {
                const cfgPath = path.join(process.cwd(), 'config.json');
                if (fs.existsSync(cfgPath)) return JSON.parse(fs.readFileSync(cfgPath, 'utf-8'));
        } catch (_) {}
        return {};
}

// ─── Cek apakah notifgc aktif untuk grup tertentu ───────────────────────────
function isNotifGCEnabled(groupId) {
        const cfg = loadConfig();
        return cfg.notifgc?.groups?.[groupId]?.enabled === true;
}

// ─── Format waktu WIB ────────────────────────────────────────────────────────
function getWaktuWIB() {
        return new Date().toLocaleString('id-ID', {
                timeZone: 'Asia/Jakarta',
                day: '2-digit', month: '2-digit', year: 'numeric',
                hour: '2-digit', minute: '2-digit', second: '2-digit',
                hour12: false,
        }).replace(',', '') + ' WIB';
}

// ─── Resolve LID → nomor HP → nama kontak ───────────────────────────────────
// Mengembalikan: { jid, num, name, display }
async function resolveAuthor(rawAuthor, hisoka, groupId) {
        if (!rawAuthor) {
                dbg('resolveAuthor: author kosong');
                return { jid: null, num: null, name: null, display: '(tidak diketahui)' };
        }

        dbg('resolveAuthor input:', rawAuthor);

        let resolvedJid = jidNorm(rawAuthor);
        const isLid = resolvedJid?.endsWith('@lid') || rawAuthor.endsWith('@lid');

        if (isLid) {
                dbg('Author adalah LID, mencoba resolve...');
                const lidRaw = resolvedJid || rawAuthor;
                const lidUser = jidUser(lidRaw);

                // ── Coba 1: signalRepository.lidMapping.getPNForLID ──
                if (!resolvedJid?.endsWith('@s.whatsapp.net')) {
                        try {
                                if (hisoka?.signalRepository?.lidMapping?.getPNForLID) {
                                        const r = await hisoka.signalRepository.lidMapping.getPNForLID(lidRaw);
                                        if (r && !String(r).endsWith('@lid')) {
                                                resolvedJid = jidNorm(r);
                                                dbg('Resolve via signalRepository:', resolvedJid);
                                        }
                                }
                        } catch (_) {}
                }

                // ── Coba 2: resolveLidToPN dari hisoka ──
                if (resolvedJid?.endsWith('@lid')) {
                        try {
                                if (typeof hisoka?.resolveLidToPN === 'function') {
                                        const r = await hisoka.resolveLidToPN({ remoteJid: lidRaw, fromMe: false, id: '' });
                                        if (r && !String(r).endsWith('@lid')) {
                                                resolvedJid = jidNorm(r);
                                                dbg('Resolve via resolveLidToPN:', resolvedJid);
                                        }
                                }
                        } catch (_) {}
                }

                // ── Coba 3: global.__lookupLidPn (cache runtime dari metadata grup) ──
                if (resolvedJid?.endsWith('@lid')) {
                        try {
                                if (typeof global.__lookupLidPn === 'function') {
                                        const r = global.__lookupLidPn(lidRaw) || global.__lookupLidPn(lidUser);
                                        if (r && !String(r).endsWith('@lid')) {
                                                resolvedJid = jidNorm(r);
                                                dbg('Resolve via __lookupLidPn:', resolvedJid);
                                        }
                                }
                        } catch (_) {}
                }

                // ── Coba 4: cari di participants metadata grup ──
                if (resolvedJid?.endsWith('@lid') && groupId) {
                        try {
                                const meta = await hisoka.groupMetadata(groupId);
                                const participants = meta?.participants || [];
                                const match = participants.find(p => {
                                        const pid = p?.id || p?.jid || '';
                                        return pid === lidRaw || jidUser(pid) === lidUser;
                                });
                                if (match) {
                                        const realRaw = match.phoneNumber || match.jid || match.id;
                                        if (realRaw && !String(realRaw).endsWith('@lid')) {
                                                resolvedJid = jidNorm(realRaw);
                                                dbg('Resolve via groupMetadata participants:', resolvedJid);
                                        }
                                }
                        } catch (_) {}
                }

                if (resolvedJid?.endsWith('@lid')) {
                        dbg('LID belum bisa di-resolve, pakai LID user saja:', lidUser);
                }
        }

        const num = jidUser(resolvedJid || rawAuthor);

        // ── Coba ambil nama kontak ──
        let name = null;
        const jidToLookup = resolvedJid && !resolvedJid.endsWith('@lid') ? resolvedJid : null;

        if (jidToLookup) {
                try {
                        if (typeof hisoka?.getName === 'function') {
                                name = hisoka.getName(jidToLookup, true) || hisoka.getName(jidToLookup) || null;
                                if (name === num) name = null; // sama dengan nomor, buang
                                dbg('Nama via hisoka.getName:', name);
                        }
                } catch (_) {}

                if (!name) {
                        try {
                                const contact = hisoka?.contacts?.read ? hisoka.contacts.read(jidToLookup) : null;
                                name = contact?.name || contact?.notify || contact?.verifiedName || null;
                                if (name === num) name = null;
                                dbg('Nama via contacts.read:', name);
                        } catch (_) {}
                }
        }

        // ── Format tampilan akhir ──
        const isUnresolved = (resolvedJid || rawAuthor).endsWith('@lid');
        let display;
        if (isUnresolved) {
                display = name ? `${name} (LID)` : '(tidak diketahui)';
        } else if (name) {
                display = `${name} (+${num})`;
        } else {
                display = `+${num}`;
        }

        dbg('resolveAuthor hasil:', { jid: resolvedJid, num, name, display });
        return { jid: resolvedJid, num, name, display };
}

// ─── Format pengaturan announce ──────────────────────────────────────────────
function fmtAnnounce(val) {
        if (val === true  || val === 1) return '🔒 Hanya admin';
        if (val === false || val === 0) return '🔓 Semua anggota';
        return String(val);
}

// ─── Format pengaturan restrict ──────────────────────────────────────────────
function fmtRestrict(val) {
        if (val === true  || val === 1) return '🔒 Hanya admin';
        if (val === false || val === 0) return '🔓 Semua anggota';
        return String(val);
}

// ─── Format durasi ephemeral ─────────────────────────────────────────────────
function fmtEphemeral(seconds) {
        if (!seconds || seconds === 0) return '❌ Nonaktif';
        if (seconds === 86400)   return '⏱️ 1 Hari';
        if (seconds === 604800)  return '⏱️ 7 Hari';
        if (seconds === 7776000) return '⏱️ 90 Hari';
        return `⏱️ ${seconds} detik`;
}

// ─── Format mode tambah anggota ──────────────────────────────────────────────
function fmtMemberAdd(val) {
        if (val === 1 || val === true)  return '👥 Semua anggota bisa tambah';
        if (val === 0 || val === false) return '🔒 Hanya admin';
        return String(val);
}

// ─── Format persetujuan bergabung ────────────────────────────────────────────
function fmtJoinApproval(val) {
        if (val === 1 || val === true)  return '✅ Perlu persetujuan admin';
        if (val === 0 || val === false) return '🚪 Langsung masuk';
        return String(val);
}

// ─── Deteksi perubahan ───────────────────────────────────────────────────────
function detectChanges(oldData, newData) {
        const changes = [];

        // Nama grup
        if (newData.subject !== undefined) {
                const oldSubj = oldData?.subject ?? null;
                const newSubj = newData.subject;
                if (String(oldSubj) !== String(newSubj)) {
                        changes.push({ field: 'subject', label: 'Nama Grup', emoji: '📝', old: oldSubj || null, new: newSubj });
                }
        }

        // Deskripsi
        if (newData.desc !== undefined) {
                const oldDesc = String(oldData?.desc ?? '');
                const newDesc = String(newData.desc ?? '');
                if (oldDesc !== newDesc) {
                        changes.push({ field: 'desc', label: 'Deskripsi Grup', emoji: '📋', old: oldDesc || '(kosong)', new: newDesc || '(kosong)' });
                }
        }

        // Pengaturan kirim pesan
        if (newData.announce !== undefined && oldData?.announce !== undefined) {
                if (String(newData.announce) !== String(oldData.announce)) {
                        changes.push({ field: 'announce', label: 'Izin Kirim Pesan', emoji: '💬', old: fmtAnnounce(oldData.announce), new: fmtAnnounce(newData.announce) });
                }
        }

        // Pengaturan edit info
        if (newData.restrict !== undefined && oldData?.restrict !== undefined) {
                if (String(newData.restrict) !== String(oldData.restrict)) {
                        changes.push({ field: 'restrict', label: 'Izin Edit Info Grup', emoji: '⚙️', old: fmtRestrict(oldData.restrict), new: fmtRestrict(newData.restrict) });
                }
        }

        // Timer pesan sementara
        if (newData.ephemeralDuration !== undefined && oldData?.ephemeralDuration !== undefined) {
                if (String(newData.ephemeralDuration) !== String(oldData.ephemeralDuration)) {
                        changes.push({ field: 'ephemeralDuration', label: 'Pesan Sementara (Timer)', emoji: '⏳', old: fmtEphemeral(oldData.ephemeralDuration), new: fmtEphemeral(newData.ephemeralDuration) });
                }
        }

        // Mode tambah anggota
        if (newData.memberAddMode !== undefined && oldData?.memberAddMode !== undefined) {
                if (String(newData.memberAddMode) !== String(oldData.memberAddMode)) {
                        changes.push({ field: 'memberAddMode', label: 'Mode Tambah Anggota', emoji: '👥', old: fmtMemberAdd(oldData.memberAddMode), new: fmtMemberAdd(newData.memberAddMode) });
                }
        }

        // Persetujuan bergabung
        if (newData.joinApprovalMode !== undefined && oldData?.joinApprovalMode !== undefined) {
                if (String(newData.joinApprovalMode) !== String(oldData.joinApprovalMode)) {
                        changes.push({ field: 'joinApprovalMode', label: 'Persetujuan Bergabung', emoji: '🚪', old: fmtJoinApproval(oldData.joinApprovalMode), new: fmtJoinApproval(newData.joinApprovalMode) });
                }
        }

        // Foto/ikon grup
        if (newData.profilePicThumbObj !== undefined) {
                const oldHasIcon = !!(oldData?.profilePicThumbObj);
                changes.push({ field: 'icon', label: 'Foto / Ikon Grup', emoji: '🖼️', old: oldHasIcon ? '(ada)' : '(kosong)', new: '(diperbarui)' });
        }

        return changes;
}

/**
 * Handler utama — dipanggil dari index.js saat event groups.update
 */
async function handleNotifGC(hisoka, groupUpdate, oldGroupData) {
        try {
                const groupId = groupUpdate?.id;
                if (!groupId) return;

                dbg('─── Event masuk ───');
                dbg('Grup      :', groupId);
                dbg('Author raw:', groupUpdate.author || '(tidak ada)');
                dbg('Data baru :', JSON.stringify(groupUpdate));
                dbg('Data lama :', JSON.stringify(oldGroupData || {}));

                if (!isNotifGCEnabled(groupId)) {
                        dbg('NotifGC nonaktif untuk grup', groupId, '→ skip');
                        return;
                }

                const changes = detectChanges(oldGroupData || {}, groupUpdate);

                dbg(`Perubahan terdeteksi (${changes.length}):`, changes.map(c => c.field).join(', ') || 'tidak ada');

                if (changes.length === 0) {
                        dbg('Tidak ada perubahan relevan → skip notif');
                        return;
                }

                // Resolve author ke nama + nomor yang benar
                const author = await resolveAuthor(groupUpdate.author || null, hisoka, groupId);

                const waktu    = getWaktuWIB();
                const namaGrup = groupUpdate.subject || oldGroupData?.subject || groupId.split('@')[0];

                let teks = `╭───〔 *🔔 NOTIF INFO GRUP* 〕───╮\n│\n`;
                teks += `│ 📌 *Nama Grup :* ${namaGrup}\n`;
                teks += `│ 👤 *Diubah oleh :* ${author.display}\n`;
                teks += `│ 🕐 *Waktu :* ${waktu}\n`;
                teks += `│\n`;
                teks += `│ ✏️ *Perubahan Terdeteksi:*\n`;

                for (const change of changes) {
                        teks += `│\n`;
                        if (change.field === 'icon') {
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                teks += `│    → Foto grup baru telah dipasang\n`;
                        } else if (change.field === 'desc') {
                                const oldShort = String(change.old).substring(0, 100);
                                const newShort = String(change.new).substring(0, 100);
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                teks += `│ ┌ *Sebelum:*\n`;
                                teks += `│ │ ${oldShort}\n`;
                                teks += `│ └ *Sesudah:*\n`;
                                teks += `│   ${newShort}\n`;
                        } else if (change.field === 'subject') {
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                if (change.old) teks += `│ ┌ *Sebelum:* ${change.old}\n`;
                                teks += `│ └ *Sesudah:* ${change.new}\n`;
                        } else {
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                teks += `│ ┌ *Sebelum:* ${change.old}\n`;
                                teks += `│ └ *Sesudah:* ${change.new}\n`;
                        }
                }

                teks += `│\n`;
                teks += `╰────────────────────────────────────╯`;

                dbg('Mengirim notif ke', groupId, '...');
                await hisoka.sendMessage(groupId, { text: teks });

                console.log(
                        `\x1b[32m[NotifGC]\x1b[39m Notif terkirim → ${groupId}` +
                        ` | diubah: ${author.display}` +
                        ` | field: ${changes.map(c => c.field).join(', ')}`
                );

        } catch (err) {
                console.error('\x1b[31m[NotifGC] Error handleNotifGC:\x1b[39m', err?.message || err);
        }
}

// ─── Map stub type number → label + emoji ────────────────────────────────────
const STUB_INFO = {
        22:  { label: 'Foto / Ikon Grup',              emoji: '🖼️' },
        21:  { label: 'Nama Grup',                     emoji: '📝' },
        24:  { label: 'Deskripsi Grup',                emoji: '📋' },
        25:  { label: 'Izin Edit Info Grup',           emoji: '⚙️' },
        26:  { label: 'Izin Kirim Pesan Baru',         emoji: '💬' },
        23:  { label: 'Tautan Undangan Grup',          emoji: '🔗' },
        145: { label: 'Mode Persetujuan Bergabung',    emoji: '🚪' },
        171: { label: 'Mode Tambah Anggota',           emoji: '👥' },
        144: { label: 'Permintaan Bergabung',          emoji: '📩' },
        186: { label: 'Kirim Riwayat Pesan ke Anggota Baru', emoji: '📜' },
};

//
// Stub types yang TIDAK ditangkap oleh groups.update sehingga HARUS lewat stub:
//   22  = GROUP_CHANGE_ICON          → icon, groups.update tidak fire
//   23  = GROUP_CHANGE_INVITE_LINK   → reset link undangan, tidak di groups.update
//   186 = GROUP_CHANGE_RECENT_HISTORY_SHARING → kirim riwayat pesan, tidak di groups.update
//
// Stub yang sudah ditangkap groups.update (subject/desc/restrict/announce/
//   memberAddMode/joinApprovalMode) TIDAK masuk sini untuk hindari double notif.
//
const STUB_HANDLE_VIA_STUB = new Set([22, 23, 186]);

// Semua stub types yang kita pantau untuk debug
const STUB_ALL_WATCH = new Set(Object.keys(STUB_INFO).map(Number));

/**
 * Handler untuk perubahan ikon grup via messages.upsert (messageStubType = 22)
 * dan stub group lainnya yang tidak ditangkap groups.update.
 *
 * @param {object} hisoka  - Baileys socket
 * @param {object} message - Item dari messagesUpsert.messages
 */
async function handleNotifGCStub(hisoka, message) {
        try {
                const stubType = message?.messageStubType;
                if (!stubType) return;

                const groupId = message?.key?.remoteJid;
                if (!groupId || !groupId.endsWith('@g.us')) return;

                // ── Debug: log semua stub grup kalau debug aktif ──
                if (DEBUG && STUB_ALL_WATCH.has(stubType)) {
                        dbg('─── Stub message masuk ───');
                        dbg('Grup         :', groupId);
                        dbg('stubType     :', stubType, '→', STUB_INFO[stubType]?.label || '(tidak dikenali)');
                        dbg('participant  :', message?.participant || message?.key?.participant || '(tidak ada)');
                        dbg('stubParams   :', JSON.stringify(message?.messageStubParameters || []));
                        dbg('fromMe       :', message?.key?.fromMe);
                }

                // Hanya proses stub yang ada di map kita
                if (!STUB_INFO[stubType]) return;

                // Hanya proses stub yang TIDAK ditangani groups.update
                // (22=icon, 23=invite link, 186=riwayat pesan)
                if (!STUB_HANDLE_VIA_STUB.has(stubType)) {
                        dbg(`Stub type ${stubType} dilewati (sudah ditangani groups.update)`);
                        return;
                }

                if (!isNotifGCEnabled(groupId)) {
                        dbg('NotifGC nonaktif untuk grup', groupId, '→ skip stub');
                        return;
                }

                const rawParticipant = message?.participant || message?.key?.participant || null;
                const author = await resolveAuthor(rawParticipant, hisoka, groupId);

                const waktu    = getWaktuWIB();
                const info     = STUB_INFO[stubType];
                const stubParams = message?.messageStubParameters || [];

                // Ambil nama grup dari cache groups atau stub params
                let namaGrup = '';
                try {
                        const grpData = hisoka?.groups?.read ? hisoka.groups.read(groupId) : null;
                        namaGrup = grpData?.subject || groupId.split('@')[0];
                } catch (_) { namaGrup = groupId.split('@')[0]; }

                let teks = `╭───〔 *🔔 NOTIF INFO GRUP* 〕───╮\n│\n`;
                teks += `│ 📌 *Nama Grup :* ${namaGrup}\n`;
                teks += `│ 👤 *Diubah oleh :* ${author.display}\n`;
                teks += `│ 🕐 *Waktu :* ${waktu}\n`;
                teks += `│\n`;
                teks += `│ ✏️ *Perubahan Terdeteksi:*\n`;
                teks += `│\n`;
                teks += `│ ${info.emoji} *${info.label}*\n`;

                if (stubType === 22) {
                        teks += `│    → Foto / ikon grup baru telah dipasang\n`;
                } else if (stubType === 23) {
                        teks += `│    → Tautan undangan grup telah direset\n`;
                        teks += `│    → Link lama sudah tidak berlaku\n`;
                } else if (stubType === 186) {
                        // stubParams[0] biasanya "on" / "off" atau nama mode
                        const mode = stubParams[0];
                        if (mode === '1' || mode === 'on' || mode === 'true') {
                                teks += `│    → Semua anggota diizinkan melihat\n`;
                                teks += `│       riwayat pesan saat bergabung\n`;
                        } else if (mode === '0' || mode === 'off' || mode === 'false') {
                                teks += `│    → Riwayat pesan tidak dikirim ke\n`;
                                teks += `│       anggota baru\n`;
                        } else {
                                teks += `│    → Pengaturan riwayat pesan diubah\n`;
                                if (mode) teks += `│    → Mode: ${mode}\n`;
                        }
                } else if (stubParams.length > 0) {
                        teks += `│    → ${stubParams.join(', ')}\n`;
                }

                teks += `│\n`;
                teks += `╰────────────────────────────────────╯`;

                await hisoka.sendMessage(groupId, { text: teks });

                console.log(
                        `\x1b[32m[NotifGC]\x1b[39m Stub notif terkirim → ${groupId}` +
                        ` | stub: ${stubType} (${info.label})` +
                        ` | diubah: ${author.display}`
                );

        } catch (err) {
                console.error('\x1b[31m[NotifGC] Error handleNotifGCStub:\x1b[39m', err?.message || err);
        }
}

module.exports = { handleNotifGC, handleNotifGCStub, isNotifGCEnabled };
