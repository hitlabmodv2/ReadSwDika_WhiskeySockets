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

// ─── Format nomor dari JID ───────────────────────────────────────────────────
function formatJidToNumber(jid) {
        if (!jid) return '(tidak diketahui)';
        const raw = jid.split('@')[0].split(':')[0];
        return `+${raw}`;
}

// ─── Format pengaturan announce (siapa yang bisa kirim pesan) ────────────────
function fmtAnnounce(val) {
        if (val === true  || val === 1) return '🔒 Hanya admin';
        if (val === false || val === 0) return '🔓 Semua anggota';
        return String(val);
}

// ─── Format pengaturan restrict (siapa yang bisa edit info) ──────────────────
function fmtRestrict(val) {
        if (val === true  || val === 1) return '🔒 Hanya admin';
        if (val === false || val === 0) return '🔓 Semua anggota';
        return String(val);
}

// ─── Format durasi pesan sementara (ephemeral) ───────────────────────────────
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

/**
 * Deteksi perubahan antara data grup lama vs baru.
 * Mengembalikan array objek { field, label, emoji, old, new }
 */
function detectChanges(oldData, newData) {
        const changes = [];

        // ── Nama grup ──
        if (newData.subject !== undefined) {
                const oldSubj = oldData?.subject ?? null;
                const newSubj = newData.subject;
                if (oldSubj !== newSubj) {
                        changes.push({
                                field: 'subject',
                                label: 'Nama Grup',
                                emoji: '📝',
                                old: oldSubj || null,
                                new: newSubj,
                        });
                }
        }

        // ── Deskripsi grup ──
        if (newData.desc !== undefined) {
                const oldDesc = oldData?.desc ?? '';
                const newDesc = newData.desc ?? '';
                if (String(oldDesc) !== String(newDesc)) {
                        changes.push({
                                field: 'desc',
                                label: 'Deskripsi Grup',
                                emoji: '📋',
                                old: oldDesc || '(kosong)',
                                new: newDesc || '(kosong)',
                        });
                }
        }

        // ── Pengaturan kirim pesan (announce) ──
        if (newData.announce !== undefined && oldData?.announce !== undefined) {
                if (String(newData.announce) !== String(oldData.announce)) {
                        changes.push({
                                field: 'announce',
                                label: 'Izin Kirim Pesan',
                                emoji: '💬',
                                old: fmtAnnounce(oldData.announce),
                                new: fmtAnnounce(newData.announce),
                        });
                }
        }

        // ── Pengaturan edit info grup (restrict) ──
        if (newData.restrict !== undefined && oldData?.restrict !== undefined) {
                if (String(newData.restrict) !== String(oldData.restrict)) {
                        changes.push({
                                field: 'restrict',
                                label: 'Izin Edit Info Grup',
                                emoji: '⚙️',
                                old: fmtRestrict(oldData.restrict),
                                new: fmtRestrict(newData.restrict),
                        });
                }
        }

        // ── Timer pesan sementara (ephemeral) ──
        if (newData.ephemeralDuration !== undefined && oldData?.ephemeralDuration !== undefined) {
                if (String(newData.ephemeralDuration) !== String(oldData.ephemeralDuration)) {
                        changes.push({
                                field: 'ephemeralDuration',
                                label: 'Pesan Sementara (Timer)',
                                emoji: '⏳',
                                old: fmtEphemeral(oldData.ephemeralDuration),
                                new: fmtEphemeral(newData.ephemeralDuration),
                        });
                }
        }

        // ── Mode tambah anggota ──
        if (newData.memberAddMode !== undefined && oldData?.memberAddMode !== undefined) {
                if (String(newData.memberAddMode) !== String(oldData.memberAddMode)) {
                        changes.push({
                                field: 'memberAddMode',
                                label: 'Mode Tambah Anggota',
                                emoji: '👥',
                                old: fmtMemberAdd(oldData.memberAddMode),
                                new: fmtMemberAdd(newData.memberAddMode),
                        });
                }
        }

        // ── Persetujuan bergabung ──
        if (newData.joinApprovalMode !== undefined && oldData?.joinApprovalMode !== undefined) {
                if (String(newData.joinApprovalMode) !== String(oldData.joinApprovalMode)) {
                        changes.push({
                                field: 'joinApprovalMode',
                                label: 'Persetujuan Bergabung',
                                emoji: '🚪',
                                old: fmtJoinApproval(oldData.joinApprovalMode),
                                new: fmtJoinApproval(newData.joinApprovalMode),
                        });
                }
        }

        // ── Foto/Ikon grup (profilePicThumbObj) ──
        if (newData.profilePicThumbObj !== undefined) {
                const oldHasIcon = !!(oldData?.profilePicThumbObj);
                changes.push({
                        field: 'icon',
                        label: 'Foto / Ikon Grup',
                        emoji: '🖼️',
                        old: oldHasIcon ? '(ada)' : '(kosong)',
                        new: '(diperbarui)',
                });
        }

        return changes;
}

/**
 * Handler utama — dipanggil dari index.js saat event groups.update
 *
 * @param {object} hisoka       - Baileys socket instance
 * @param {object} groupUpdate  - Data baru dari groups.update (satu item)
 * @param {object} oldGroupData - Data lama sebelum di-write (dari groups.read)
 */
async function handleNotifGC(hisoka, groupUpdate, oldGroupData) {
        try {
                const groupId = groupUpdate?.id;
                if (!groupId) return;

                dbg(`─── Event masuk ───`);
                dbg(`Grup      : ${groupId}`);
                dbg(`Author    : ${groupUpdate.author || '(tidak ada)'}`);
                dbg(`Data baru :`, JSON.stringify(groupUpdate, null, 2));
                dbg(`Data lama :`, JSON.stringify(oldGroupData || {}, null, 2));

                if (!isNotifGCEnabled(groupId)) {
                        dbg(`NotifGC nonaktif untuk grup ${groupId} → skip`);
                        return;
                }

                const changes = detectChanges(oldGroupData || {}, groupUpdate);

                dbg(`Perubahan terdeteksi (${changes.length}): ${changes.map(c => c.field).join(', ') || 'tidak ada'}`);

                if (changes.length === 0) {
                        dbg(`Tidak ada perubahan relevan → skip notif`);
                        return;
                }

                const waktu     = getWaktuWIB();
                const author    = groupUpdate.author || null;
                const pengubah  = author ? formatJidToNumber(author) : '(tidak diketahui)';
                const namaGrup  = groupUpdate.subject || oldGroupData?.subject || groupId.split('@')[0];

                let teks = `╭───〔 *🔔 NOTIF INFO GRUP* 〕───╮\n│\n`;
                teks += `│ 📌 *Nama Grup :* ${namaGrup}\n`;
                teks += `│ 👤 *Diubah oleh :* ${pengubah}\n`;
                teks += `│ 🕐 *Waktu :* ${waktu}\n`;
                teks += `│\n`;
                teks += `│ ✏️ *Perubahan Terdeteksi:*\n`;

                for (const change of changes) {
                        teks += `│\n`;
                        if (change.field === 'icon') {
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                teks += `│    → Foto grup baru telah dipasang\n`;
                        } else if (change.field === 'desc') {
                                teks += `│ ${change.emoji} *${change.label}*\n`;
                                const oldShort = String(change.old).substring(0, 100);
                                const newShort = String(change.new).substring(0, 100);
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

                dbg(`Mengirim notif ke ${groupId}...`);
                await hisoka.sendMessage(groupId, { text: teks });

                console.log(
                        `\x1b[32m[NotifGC]\x1b[39m Notif terkirim → ${groupId}` +
                        ` | diubah oleh: ${pengubah}` +
                        ` | field: ${changes.map(c => c.field).join(', ')}`
                );

        } catch (err) {
                console.error(`\x1b[31m[NotifGC] Error handleNotifGC:\x1b[39m`, err?.message || err);
        }
}

module.exports = { handleNotifGC, isNotifGCEnabled };
