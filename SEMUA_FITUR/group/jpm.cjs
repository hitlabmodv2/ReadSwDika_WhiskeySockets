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
 *  jpm.cjs — JPM (Jual/Push Member)
 *  Push pesan private ke member GC aktif atau semua GC
 *  .jpm  → hanya GC tempat command dikirim
 *  .jpm << → kirim ke member dari SEMUA GC yang diikuti bot
 * ───────────────────────────────
 */
'use strict';

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ── Utilitas progress bar ─────────────────────────────────────────────────────

function makeBar(done, total, len = 10) {
        const filled = Math.round((done / total) * len);
        return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']';
}

// ── Resolve teks pesan (handle \n) ───────────────────────────────────────────

function resolveText(raw) {
        return (raw || '')
                .replace(/\\n\\n/g, '\n\n\n')
                .replace(/\\n/g, '\n\n');
}

// ── Ambil member dari satu GC ─────────────────────────────────────────────────

async function getMembers(hisoka, gid) {
        const meta = await hisoka.groupMetadata(gid);
        const botJid = (hisoka.user?.id || '').split(':')[0];
        const members = (meta?.participants || [])
                .map(p => {
                        const raw = p.id || p.jid || '';
                        if (!raw) return null;
                        if (raw.endsWith('@lid')) {
                                const resolved = global.__lookupLidPn ? global.__lookupLidPn(raw) : null;
                                if (resolved) return resolved.endsWith('@s.whatsapp.net') ? resolved : resolved.split('@')[0] + '@s.whatsapp.net';
                                return null;
                        }
                        return raw.endsWith('@s.whatsapp.net') ? raw : raw.split('@')[0] + '@s.whatsapp.net';
                })
                .filter(j => j && j.split('@')[0] !== botJid);
        return { meta, members };
}

// ── Core kirim pesan ke daftar JID ────────────────────────────────────────────

async function kirimKeJidList(hisoka, {
        jidList,
        pesanKirim,
        delayDetik,
        mediaBuffer,
        mediaType,
        onProgress,
}) {
        let berhasil = 0;
        let gagal = 0;
        const total = jidList.length;

        for (const jid of jidList) {
                try {
                        if (mediaBuffer && mediaBuffer.length > 0) {
                                if (mediaType === 'imageMessage') {
                                        await hisoka.sendMessage(jid, { image: mediaBuffer, caption: pesanKirim });
                                } else if (mediaType === 'videoMessage') {
                                        await hisoka.sendMessage(jid, { video: mediaBuffer, caption: pesanKirim });
                                } else {
                                        await hisoka.sendMessage(jid, { document: mediaBuffer, caption: pesanKirim, mimetype: 'application/octet-stream' });
                                }
                        } else {
                                const waMsg = generateWAMessageFromContent(jid, {
                                        conversation: pesanKirim
                                }, { userJid: hisoka.user?.id });
                                await hisoka.relayMessage(jid, waMsg.message, { messageId: waMsg.key.id });
                        }
                        berhasil++;
                } catch (_) {
                        gagal++;
                }

                const sent = berhasil + gagal;
                if (onProgress) {
                        try { await onProgress({ sent, total, berhasil, gagal }); } catch (_) {}
                }

                await new Promise(res => setTimeout(res, delayDetik * 1000));
        }

        return { berhasil, gagal };
}

// ── Handler utama .jpm ────────────────────────────────────────────────────────

async function handleJpm({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        // Deteksi mode: .jpm << = semua GC, .jpm = GC saat ini
        const rawQuery = (query || '').trim();
        const modeAllGC = rawQuery.startsWith('<<');
        const isiQuery = modeAllGC ? rawQuery.slice(2).trim() : rawQuery;

        // Validasi format
        if (!isiQuery && !m.isMedia && !(m.isQuoted && m.quoted?.isMedia)) {
                const pref = m.prefix || '.';
                return tolak(hisoka, m,
                        `❌ *Format salah!*\n\n` +
                        `📌 *Kirim ke GC aktif (teks):*\n` +
                        `\`${pref}jpm <pesan> | <delay>\`\n\n` +
                        `📌 *Kirim ke SEMUA GC (teks):*\n` +
                        `\`${pref}jpm << <pesan> | <delay>\`\n\n` +
                        `🖼️ *Pakai gambar/video:*\n` +
                        `_Kirim/reply gambar dengan caption:_\n` +
                        `\`${pref}jpm <caption> | <delay>\`\n` +
                        `\`${pref}jpm << <caption> | <delay>\`\n\n` +
                        `⏱ *Delay:* pilih *3–10 detik*\n\n` +
                        `↩️ *Garis baru dalam pesan:*\n` +
                        `• \`\\n\` = 1 baris kosong\n` +
                        `• \`\\n\\n\` = 2 baris kosong\n\n` +
                        `💡 *Contoh:*\n` +
                        `\`${pref}jpm Halo kak! Ada promo nih | 5\`\n` +
                        `\`${pref}jpm << Broadcast semua GC | 5\``
                );
        }

        // Parse pesan & delay
        const parts = isiQuery.split('|');
        const pesanRaw = (parts[0] || '').trim();
        const delayInput = parseInt((parts[1] || '').trim());
        const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;

        // Ambil media kalau ada
        const mediaTypes = ['imageMessage', 'videoMessage'];
        let mediaBuffer = null;
        let mediaType = null;

        if (m.isMedia && mediaTypes.includes(m.type)) {
                try { mediaBuffer = await m.downloadMedia(); mediaType = m.type; } catch (_) {}
        } else if (m.isQuoted && m.quoted?.isMedia && mediaTypes.includes(m.quoted?.type)) {
                try { mediaBuffer = await getQuotedMediaBuffer(hisoka, m); mediaType = m.quoted.type; } catch (_) {}
        }

        const adaMedia = !!(mediaBuffer && mediaBuffer.length > 0);

        if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
        if (parts.length < 2 || delayDetik === null) return tolak(hisoka, m,
                '❌ *Delay tidak valid!*\n\n⏱ Masukkan delay antara *3–10 detik*\n\n📝 *Contoh:*\n`.jpm Halo kak! | 5`'
        );

        const pesanKirim = resolveText(pesanRaw);
        const modeLabel = adaMedia ? (mediaType === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video') : '💬 Teks';

        // ── MODE 1: Satu GC saja ──────────────────────────────────────────────

        if (!modeAllGC) {
                if (!m.isGroup) return tolak(hisoka, m,
                        '❌ Perintah ini harus dijalankan *di dalam grup*!\n\n' +
                        '💡 Untuk kirim ke semua GC, pakai:\n`.jpm << <pesan> | <delay>`'
                );

                let metaGC, members;
                try {
                        const hasil = await getMembers(hisoka, m.from);
                        metaGC = hasil.meta;
                        members = hasil.members;
                } catch (err) {
                        return tolak(hisoka, m, `❌ Gagal ambil data member: ${err.message}`);
                }

                if (!members.length) return tolak(hisoka, m, '❌ Grup tidak memiliki member atau gagal ambil data member.');

                const namaGrup = metaGC?.subject || m.from;
                let progMsg = null;

                progMsg = await m.reply(
                        `⏳ *JPM dimulai...*\n\n` +
                        `👥 *Grup :* ${namaGrup}\n` +
                        `📋 *Total :* ${members.length} orang\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱ *Delay :* ${delayDetik} detik/pesan\n\n` +
                        `_Sedang mengirim ke semua member..._`
                );

                const { berhasil, gagal } = await kirimKeJidList(hisoka, {
                        jidList: members,
                        pesanKirim,
                        delayDetik,
                        mediaBuffer,
                        mediaType,
                        onProgress: async ({ sent, total, berhasil, gagal }) => {
                                if (!progMsg?.key) return;
                                const bar = makeBar(sent, total);
                                const pct = Math.round((sent / total) * 100);
                                await m.reply({
                                        edit: progMsg.key,
                                        text:
                                                `📤 *JPM — Mengirim...*\n\n` +
                                                `👥 *Grup :* ${namaGrup}\n` +
                                                `📊 *Progress :* ${bar} ${pct}%\n` +
                                                `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                                `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                `📤 *Mode :* ${modeLabel}\n\n` +
                                                `_Harap tunggu..._`
                                });
                        }
                });

                const doneText =
                        `✅ *JPM selesai!*\n\n` +
                        `👥 *Grup :* ${namaGrup}\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱ *Delay :* ${delayDetik} detik/pesan\n` +
                        `✔️ *Berhasil :* ${berhasil} orang\n` +
                        `❌ *Gagal :* ${gagal} orang`;

                if (progMsg?.key) {
                        await m.reply({ edit: progMsg.key, text: doneText });
                } else {
                        await m.reply(doneText);
                }

                logCommand(m, hisoka, 'jpm');
                return;
        }

        // ── MODE 2: Semua GC ──────────────────────────────────────────────────

        let allGroupsRaw;
        try {
                allGroupsRaw = await hisoka.groupFetchAllParticipating();
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal ambil daftar grup: ${err.message}`);
        }

        const allGroups = Object.values(allGroupsRaw || {});
        if (!allGroups.length) return tolak(hisoka, m, '❌ Bot tidak ada di grup manapun.');

        // Deduplikasi member lintas grup
        const seenJid = new Set();
        const allMembers = [];
        const botJid = (hisoka.user?.id || '').split(':')[0];

        for (const grp of allGroups) {
                for (const p of (grp.participants || [])) {
                        const raw = p.id || p.jid || '';
                        if (!raw || raw.endsWith('@lid')) continue;
                        const jid = raw.endsWith('@s.whatsapp.net') ? raw : raw.split('@')[0] + '@s.whatsapp.net';
                        if (jid.split('@')[0] === botJid) continue;
                        if (seenJid.has(jid)) continue;
                        seenJid.add(jid);
                        allMembers.push(jid);
                }
        }

        if (!allMembers.length) return tolak(hisoka, m, '❌ Tidak ada member yang bisa dihubungi dari semua GC.');

        let progMsg = await m.reply(
                `⏳ *JPM Semua GC dimulai...*\n\n` +
                `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                `👥 *Total Member :* ${allMembers.length} orang (unik)\n` +
                `📤 *Mode :* ${modeLabel}\n` +
                `⏱ *Delay :* ${delayDetik} detik/pesan\n\n` +
                `_Sedang mengirim ke semua member..._`
        );

        const { berhasil, gagal } = await kirimKeJidList(hisoka, {
                jidList: allMembers,
                pesanKirim,
                delayDetik,
                mediaBuffer,
                mediaType,
                onProgress: async ({ sent, total, berhasil, gagal }) => {
                        if (!progMsg?.key) return;
                        const bar = makeBar(sent, total);
                        const pct = Math.round((sent / total) * 100);
                        await m.reply({
                                edit: progMsg.key,
                                text:
                                        `📤 *JPM Semua GC — Mengirim...*\n\n` +
                                        `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                                        `📊 *Progress :* ${bar} ${pct}%\n` +
                                        `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                        `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                        `📤 *Mode :* ${modeLabel}\n\n` +
                                        `_Harap tunggu..._`
                        });
                }
        });

        const doneText =
                `✅ *JPM Semua GC selesai!*\n\n` +
                `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                `👥 *Total Member :* ${allMembers.length} orang (unik)\n` +
                `📤 *Mode :* ${modeLabel}\n` +
                `⏱ *Delay :* ${delayDetik} detik/pesan\n` +
                `✔️ *Berhasil :* ${berhasil} orang\n` +
                `❌ *Gagal :* ${gagal} orang`;

        if (progMsg?.key) {
                await m.reply({ edit: progMsg.key, text: doneText });
        } else {
                await m.reply(doneText);
        }

        logCommand(m, hisoka, 'jpm');
}

module.exports = { handleJpm };
