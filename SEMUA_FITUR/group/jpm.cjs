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
 *  jpm.cjs — JPM (Push Pesan ke Member GC)
 *  .jpm  <pesan> | <delay>     → push ke member GC saat ini
 *  .jpm << <pesan> | <delay>   → push ke member SEMUA GC (unik)
 *  .jpmstop                    → hentikan proses JPM yang sedang berjalan
 *
 *  ⚠️  HANYA BOT UTAMA — jadibot tidak bisa pakai fitur ini
 * ───────────────────────────────
 */
'use strict';

const { generateWAMessageFromContent } = require('@whiskeysockets/baileys');

// ── Storage flag cancel per hisoka instance ───────────────────────────────────
// Menyimpan status JPM yang sedang berjalan di tiap bot instance
// Kalau hisoka._jpmRunning === true berarti sedang ada proses aktif
// Kalau hisoka._jpmCancel === true berarti user minta stop

function isJpmRunning(hisoka) {
        return hisoka._jpmRunning === true;
}
function setJpmRunning(hisoka, val) {
        hisoka._jpmRunning = val;
        if (!val) hisoka._jpmCancel = false;
}
function requestJpmCancel(hisoka) {
        hisoka._jpmCancel = true;
}
function isJpmCancelled(hisoka) {
        return hisoka._jpmCancel === true;
}

// ── Utilitas progress bar ─────────────────────────────────────────────────────

function makeBar(done, total, len = 10) {
        if (total === 0) return '[░'.repeat(len) + ']';
        const filled = Math.round((done / total) * len);
        return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']';
}

// ── Resolve teks pesan (\n → newline asli) ───────────────────────────────────

function resolveText(raw) {
        return (raw || '')
                .replace(/\\n\\n/g, '\n\n\n')
                .replace(/\\n/g, '\n\n');
}

// ── Ambil daftar member dari satu GC ─────────────────────────────────────────

async function getMembersFromGC(hisoka, gid) {
        const meta = await hisoka.groupMetadata(gid);
        const botNum = (hisoka.user?.id || '').split(':')[0];
        const members = (meta?.participants || [])
                .map(p => {
                        const raw = p.id || p.jid || '';
                        if (!raw) return null;
                        if (raw.endsWith('@lid')) {
                                // Coba resolve ke phone JID dulu
                                const resolved = global.__lookupLidPn ? global.__lookupLidPn(raw) : null;
                                if (resolved) {
                                        return resolved.endsWith('@s.whatsapp.net') ? resolved : resolved.split('@')[0] + '@s.whatsapp.net';
                                }
                                // Kalau tidak bisa resolve, tetap pakai @lid agar bisa dicoba kirim
                                return raw;
                        }
                        return raw.endsWith('@s.whatsapp.net') ? raw : raw.split('@')[0] + '@s.whatsapp.net';
                })
                .filter(j => {
                        if (!j) return false;
                        // Buang JID bot sendiri (cek dari angka sebelum @ atau sebelum :)
                        const num = j.split('@')[0].split(':')[0];
                        return num !== botNum;
                });
        return { meta, members };
}

// ── Core: kirim pesan ke daftar JID dengan support cancel ────────────────────

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
        let dibatalkan = false;
        const total = jidList.length;
        const adaMedia = !!(mediaBuffer && mediaBuffer.length > 0);

        for (const jid of jidList) {
                // Cek cancel sebelum tiap kirim
                if (isJpmCancelled(hisoka)) {
                        dibatalkan = true;
                        break;
                }

                try {
                        if (adaMedia) {
                                if (mediaType === 'imageMessage') {
                                        await hisoka.sendMessage(jid, { image: mediaBuffer, caption: pesanKirim });
                                } else if (mediaType === 'videoMessage') {
                                        await hisoka.sendMessage(jid, { video: mediaBuffer, caption: pesanKirim });
                                } else {
                                        await hisoka.sendMessage(jid, {
                                                document: mediaBuffer,
                                                caption: pesanKirim,
                                                mimetype: 'application/octet-stream',
                                        });
                                }
                        } else {
                                const waMsg = generateWAMessageFromContent(
                                        jid,
                                        { conversation: pesanKirim },
                                        { userJid: hisoka.user?.id }
                                );
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

                // Delay sebelum lanjut ke member berikutnya
                await new Promise(res => setTimeout(res, delayDetik * 1000));
        }

        return { berhasil, gagal, dibatalkan };
}

// ── Helper: resolve media dari pesan ─────────────────────────────────────────

async function resolveMedia(m, getQuotedMediaBuffer, hisoka) {
        const mediaTypes = ['imageMessage', 'videoMessage'];
        let mediaBuffer = null, mediaType = null;
        if (m.isMedia && mediaTypes.includes(m.type)) {
                try { mediaBuffer = await m.downloadMedia(); mediaType = m.type; } catch (_) {}
        } else if (m.isQuoted && m.quoted?.isMedia && mediaTypes.includes(m.quoted?.type)) {
                try { mediaBuffer = await getQuotedMediaBuffer(hisoka, m); mediaType = m.quoted.type; } catch (_) {}
        }
        return { mediaBuffer, mediaType, adaMedia: !!(mediaBuffer && mediaBuffer.length > 0) };
}

// ── Helper: kumpulkan member unik dari semua GC ───────────────────────────────

function kumpulkanMemberSemua(allGroups, botNum) {
        const seenJid = new Set();
        const allMembers = [];
        for (const grp of allGroups) {
                for (const p of (grp.participants || [])) {
                        const raw = p.id || p.jid || '';
                        if (!raw) continue;
                        let jid;
                        if (raw.endsWith('@lid')) {
                                const resolved = global.__lookupLidPn ? global.__lookupLidPn(raw) : null;
                                jid = resolved
                                        ? (resolved.endsWith('@s.whatsapp.net') ? resolved : resolved.split('@')[0] + '@s.whatsapp.net')
                                        : raw;
                        } else {
                                jid = raw.endsWith('@s.whatsapp.net') ? raw : raw.split('@')[0] + '@s.whatsapp.net';
                        }
                        const num = jid.split('@')[0].split(':')[0];
                        if (num === botNum) continue;
                        if (seenJid.has(jid)) continue;
                        seenJid.add(jid);
                        allMembers.push(jid);
                }
        }
        return allMembers;
}

// ── Helper: eksekusi JPM ke satu GC ──────────────────────────────────────────

async function _runJpmSatu({ hisoka, m, pref, tolak, logCommand, Button, targetGid, isiQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia }) {
        const modeLabel = adaMedia
                ? (mediaType === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video')
                : '💬 Teks';
        const pesanKirim = resolveText(pesanRaw);

        let metaGC, members;
        try {
                const hasil = await getMembersFromGC(hisoka, targetGid);
                metaGC = hasil.meta;
                members = hasil.members;
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal ambil data member: ${err.message}`);
        }

        if (!members.length) return tolak(hisoka, m,
                '❌ Grup tidak memiliki member atau gagal ambil data member.\n\nPastikan bot masih ada di grup tersebut.'
        );

        const namaGrup = metaGC?.subject || targetGid;
        setJpmRunning(hisoka, true);

        let progMsg = null;
        try {
                progMsg = await m.reply(
                        `⏳ *JPM dimulai...*\n\n` +
                        `👥 *Grup :* ${namaGrup}\n` +
                        `📋 *Total :* ${members.length} orang\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱️ *Delay :* ${delayDetik} detik/pesan\n\n` +
                        `_Sedang mengirim ke semua member..._\n` +
                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                );

                const { berhasil, gagal, dibatalkan } = await kirimKeJidList(hisoka, {
                        jidList: members,
                        pesanKirim,
                        delayDetik,
                        mediaBuffer,
                        mediaType,
                        onProgress: async ({ sent, total, berhasil, gagal }) => {
                                if (!progMsg?.key) return;
                                const bar = makeBar(sent, total);
                                const pct = Math.round((sent / total) * 100);
                                try {
                                        await m.reply({
                                                edit: progMsg.key,
                                                text:
                                                        `📤 *JPM — Mengirim...*\n\n` +
                                                        `👥 *Grup :* ${namaGrup}\n` +
                                                        `📊 *Progress :* ${bar} ${pct}%\n` +
                                                        `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                                        `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                        `📤 *Mode :* ${modeLabel}\n\n` +
                                                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                                        });
                                } catch (_) {}
                        },
                });

                const doneText = dibatalkan
                        ? `🛑 *JPM dihentikan!*\n\n` +
                          `👥 *Grup :* ${namaGrup}\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `✔️ *Berhasil :* ${berhasil} orang\n` +
                          `❌ *Gagal :* ${gagal} orang\n` +
                          `🔘 *Sisa :* ${members.length - (berhasil + gagal)} orang belum terkirim`
                        : `✅ *JPM selesai!*\n\n` +
                          `👥 *Grup :* ${namaGrup}\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `⏱️ *Delay :* ${delayDetik} detik/pesan\n` +
                          `✔️ *Berhasil :* ${berhasil} orang\n` +
                          `❌ *Gagal :* ${gagal} orang`;

                if (progMsg?.key) {
                        await m.reply({ edit: progMsg.key, text: doneText });
                } else {
                        await m.reply(doneText);
                }

                // ── Button ulangi JPM setelah selesai ──────────────────────
                if (!dibatalkan && Button) {
                        try {
                                const btnJpm = new Button()
                                        .setBody(
                                                `╭─「 🔁 *ULANGI JPM?* 」\n│\n` +
                                                `│ 👥 *Grup :* ${namaGrup}\n` +
                                                `│ ✔️ *Berhasil :* ${berhasil} orang\n` +
                                                `│ ❌ *Gagal :* ${gagal} orang\n│\n` +
                                                `│ Tekan tombol di bawah untuk\n` +
                                                `│ menjalankan JPM lagi ke grup ini.\n│\n` +
                                                `╰─────────────────────────`
                                        )
                                        .setFooter(`⚡ Wily Bot • JPM System`)
                                        .addReply('🔄 Ulangi JPM Grup Ini', `${pref}jpm ${targetGid} >> ${isiQuery}`);
                                await btnJpm.run(m.from, hisoka, m);
                        } catch (_) {}
                }
        } finally {
                setJpmRunning(hisoka, false);
        }

        logCommand(m, hisoka, 'jpm');
}

// ── Helper: eksekusi JPM ke semua GC ─────────────────────────────────────────

async function _runJpmSemua({ hisoka, m, pref, tolak, logCommand, Button, isiQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia }) {
        const modeLabel = adaMedia
                ? (mediaType === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video')
                : '💬 Teks';
        const pesanKirim = resolveText(pesanRaw);

        let allGroupsRaw;
        try {
                allGroupsRaw = await hisoka.groupFetchAllParticipating();
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal ambil daftar grup: ${err.message}`);
        }

        const allGroups = Object.values(allGroupsRaw || {});
        if (!allGroups.length) return tolak(hisoka, m, '❌ Bot tidak ada di grup manapun.');

        const botNum = (hisoka.user?.id || '').split(':')[0];
        const allMembers = kumpulkanMemberSemua(allGroups, botNum);

        if (!allMembers.length) return tolak(hisoka, m,
                '❌ Tidak ada member yang bisa dihubungi dari semua GC.'
        );

        setJpmRunning(hisoka, true);

        let progMsg = null;
        try {
                progMsg = await m.reply(
                        `⏳ *JPM Semua GC dimulai...*\n\n` +
                        `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                        `👥 *Total Member :* ${allMembers.length} orang (unik)\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱️ *Delay :* ${delayDetik} detik/pesan\n\n` +
                        `_Sedang mengirim ke semua member..._\n` +
                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                );

                const { berhasil, gagal, dibatalkan } = await kirimKeJidList(hisoka, {
                        jidList: allMembers,
                        pesanKirim,
                        delayDetik,
                        mediaBuffer,
                        mediaType,
                        onProgress: async ({ sent, total, berhasil, gagal }) => {
                                if (!progMsg?.key) return;
                                const bar = makeBar(sent, total);
                                const pct = Math.round((sent / total) * 100);
                                try {
                                        await m.reply({
                                                edit: progMsg.key,
                                                text:
                                                        `📤 *JPM Semua GC — Mengirim...*\n\n` +
                                                        `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                                                        `📊 *Progress :* ${bar} ${pct}%\n` +
                                                        `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                                        `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                        `📤 *Mode :* ${modeLabel}\n\n` +
                                                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                                        });
                                } catch (_) {}
                        },
                });

                const doneText = dibatalkan
                        ? `🛑 *JPM Semua GC dihentikan!*\n\n` +
                          `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `✔️ *Berhasil :* ${berhasil} orang\n` +
                          `❌ *Gagal :* ${gagal} orang\n` +
                          `🔘 *Sisa :* ${allMembers.length - (berhasil + gagal)} orang belum terkirim`
                        : `✅ *JPM Semua GC selesai!*\n\n` +
                          `🗂️ *Total GC :* ${allGroups.length} grup\n` +
                          `👥 *Total Member :* ${allMembers.length} orang (unik)\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `⏱️ *Delay :* ${delayDetik} detik/pesan\n` +
                          `✔️ *Berhasil :* ${berhasil} orang\n` +
                          `❌ *Gagal :* ${gagal} orang`;

                if (progMsg?.key) {
                        await m.reply({ edit: progMsg.key, text: doneText });
                } else {
                        await m.reply(doneText);
                }

                // ── Button ulangi JPM semua GC setelah selesai ─────────────
                if (!dibatalkan && Button) {
                        try {
                                const btnJpmAll = new Button()
                                        .setBody(
                                                `╭─「 🔁 *ULANGI JPM SEMUA GC?* 」\n│\n` +
                                                `│ 🗂️ *Total GC :* ${allGroups.length} grup\n` +
                                                `│ ✔️ *Berhasil :* ${berhasil} orang\n` +
                                                `│ ❌ *Gagal :* ${gagal} orang\n│\n` +
                                                `│ Tekan tombol di bawah untuk\n` +
                                                `│ menjalankan JPM lagi ke semua GC.\n│\n` +
                                                `╰─────────────────────────`
                                        )
                                        .setFooter(`⚡ Wily Bot • JPM System`)
                                        .addReply('🔄 Ulangi JPM Semua GC', `${pref}jpm << ${isiQuery}`);
                                await btnJpmAll.run(m.from, hisoka, m);
                        } catch (_) {}
                }
        } finally {
                setJpmRunning(hisoka, false);
        }

        logCommand(m, hisoka, 'jpm');
}

// ── Handler: .jpm ─────────────────────────────────────────────────────────────

async function handleJpm({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer, Button }) {
        // ✅ Hanya bot utama — jadibot tidak bisa pakai
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');

        // ✅ Hanya owner
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        // ✅ Cegah jalankan 2 proses sekaligus
        if (isJpmRunning(hisoka)) return tolak(hisoka, m,
                '⚠️ *JPM sedang berjalan!*\n\n' +
                'Tunggu hingga selesai atau ketik `.jpmstop` untuk membatalkan.'
        );

        const rawQuery = (query || '').trim();
        const pref = m.prefix || '.';
        const { mediaBuffer, mediaType, adaMedia } = await resolveMedia(m, getQuotedMediaBuffer, hisoka);

        // ─── MODE: Eksekusi ke GC spesifik (dipanggil dari button) ──────────
        // Format: .jpm <GID>@g.us >> <pesan> | <delay>
        const gcSpecMatch = rawQuery.match(/^(\S+@g\.us)\s*>>\s*([\s\S]*)$/);
        if (gcSpecMatch) {
                const targetGid = gcSpecMatch[1];
                const subQuery  = gcSpecMatch[2].trim();
                const parts = subQuery.split('|');
                const pesanRaw  = (parts[0] || '').trim();
                const delayInput = parseInt((parts[1] || '').trim());
                const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;
                if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                if (!delayDetik) return tolak(hisoka, m, `❌ *Delay tidak valid!*\n\n⏱️ Masukkan delay antara *3–10 detik*`);
                return await _runJpmSatu({ hisoka, m, pref, tolak, logCommand, Button, targetGid, isiQuery: subQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia });
        }

        // ─── MODE << : Semua GC — langsung eksekusi ──────────────────────────
        if (rawQuery.startsWith('<<')) {
                const isiQuery = rawQuery.slice(2).trim();
                if (!isiQuery && !adaMedia) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                const parts = isiQuery.split('|');
                const pesanRaw  = (parts[0] || '').trim();
                const delayInput = parseInt((parts[1] || '').trim());
                const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;
                if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                if (parts.length < 2 || !delayDetik) return tolak(hisoka, m,
                        `❌ *Delay tidak valid!*\n\n⏱️ Masukkan delay antara *3–10 detik*\n\n📝 *Contoh:*\n\`${pref}jpm << Halo kak! | 5\``
                );
                return await _runJpmSemua({ hisoka, m, pref, tolak, logCommand, Button, isiQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia });
        }

        // ─── MODE UTAMA: Tampilkan menu pilih GC dulu (seperti ghosttag) ─────
        const isiQuery = rawQuery;

        // Kalau tidak ada konten → tampilkan panduan
        if (!isiQuery && !adaMedia) {
                return tolak(hisoka, m,
                        `❌ *Format salah!*\n\n` +
                        `📌 *Cara pakai:*\n` +
                        `\`${pref}jpm <pesan> | <delay>\`\n\n` +
                        `📌 *Push ke SEMUA GC:*\n` +
                        `\`${pref}jpm << <pesan> | <delay>\`\n\n` +
                        `⏱️ *Delay:* 3–10 detik\n\n` +
                        `💡 *Contoh:*\n` +
                        `\`${pref}jpm Halo kak! Ada promo nih | 5\`\n` +
                        `\`${pref}jpm << Broadcast semua GC | 5\``
                );
        }

        // Validasi format pesan & delay
        const parts = isiQuery.split('|');
        const pesanRaw  = (parts[0] || '').trim();
        const delayInput = parseInt((parts[1] || '').trim());
        const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;

        if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
        if (parts.length < 2 || delayDetik === null) {
                return tolak(hisoka, m,
                        `❌ *Delay tidak valid!*\n\n` +
                        `⏱️ Masukkan delay antara *3–10 detik*\n\n` +
                        `📝 *Contoh:*\n\`${pref}jpm Halo kak! | 5\``
                );
        }

        const modeLabel = adaMedia
                ? (mediaType === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video')
                : '💬 Teks';

        // Ambil semua GC realtime
        let allGroupsRaw;
        try {
                allGroupsRaw = await hisoka.groupFetchAllParticipating();
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal ambil daftar grup: ${err.message}`);
        }

        const allGroups = Object.values(allGroupsRaw || {});
        if (!allGroups.length) return tolak(hisoka, m, '❌ Bot tidak ada di grup manapun.');

        // Urutkan: member terbanyak dulu
        allGroups.sort((a, b) => (b.participants?.length || 0) - (a.participants?.length || 0));

        const totalMemberAll = allGroups.reduce((acc, g) => acc + (g.participants?.length || 0), 0);
        const pesanPreview = pesanRaw.length > 28 ? pesanRaw.slice(0, 28) + '...' : pesanRaw;

        // Tampilkan button menu pilih GC (persis seperti ghosttag)
        const btn = new Button()
                .setBody(
                        `╭─「 📤 *JPM — PILIH TARGET GC* 」\n│\n` +
                        `│ 📝 *Pesan  :* ${pesanPreview}\n` +
                        `│ 📤 *Mode   :* ${modeLabel}\n` +
                        `│ ⏱️ *Delay  :* ${delayDetik} detik/pesan\n│\n` +
                        `│ 🗂️ *Total GC     :* *${allGroups.length} grup*\n` +
                        `│ 👥 *Total Member :* *${totalMemberAll} orang*\n│\n` +
                        `│ ✦ *Semua GC* — kirim ke semua sekaligus\n` +
                        `│ ✦ *Pilih Satu GC* — pilih dari daftar\n│\n` +
                        `╰─────────────────────────`
                )
                .setFooter(`⚡ Wily Bot • JPM System`)
                .addReply('🌐 Kirim ke Semua GC', `${pref}jpm << ${isiQuery}`)
                .addSelection('📂 Pilih Satu GC')
                .makeSections('✦ Daftar Grup');

        const botNum = (hisoka.user?.id || '').split(':')[0];
        for (const g of allGroups) {
                const nama  = (g.subject || g.name || 'Tanpa Nama').slice(0, 24);
                const jml   = (g.participants || []).length;
                const parts2 = (g.participants || []);
                const jmlAdmin = parts2.filter(p => p.admin).length;
                const isBotAdmin = parts2.some(p => {
                        const num = (p.jid || p.phoneNumber || p.id || '').split('@')[0].split(':')[0];
                        return num === botNum && p.admin;
                });
                const adminBadge = isBotAdmin ? '👑 Admin' : '👤 Member';
                btn.makeRow(
                        adminBadge,
                        nama,
                        `👥 ${jml} anggota  •  🛡️ ${jmlAdmin} admin`,
                        `${pref}jpm ${g.id} >> ${isiQuery}`
                );
        }

        await btn.run(m.from, hisoka, m);
        logCommand(m, hisoka, 'jpm');
}

// ── Handler: .jpmstop ─────────────────────────────────────────────────────────

async function handleJpmstop({ hisoka, m, tolak, logCommand }) {
        // ✅ Hanya bot utama — jadibot tidak bisa pakai
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');

        // ✅ Hanya owner
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        if (!isJpmRunning(hisoka)) {
                return m.reply('ℹ️ Tidak ada proses JPM yang sedang berjalan saat ini.');
        }

        requestJpmCancel(hisoka);
        await m.reply('🛑 *Permintaan stop JPM diterima!*\n\n_Proses akan dihentikan setelah member saat ini selesai diproses..._');
        logCommand(m, hisoka, 'jpmstop');
}

// ── Handler: .jpmlist ─────────────────────────────────────────────────────────

async function handleJpmlist({ hisoka, m, tolak, logCommand }) {
        // ✅ Hanya bot utama — jadibot tidak bisa pakai
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');

        // ✅ Hanya owner
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        await m.reply('⏳ _Mengambil data semua GC..._');

        let allGroupsRaw;
        try {
                allGroupsRaw = await hisoka.groupFetchAllParticipating();
        } catch (err) {
                return tolak(hisoka, m, `❌ Gagal ambil daftar grup: ${err.message}`);
        }

        const allGroups = Object.values(allGroupsRaw || {});
        if (!allGroups.length) return tolak(hisoka, m, '❌ Bot tidak ada di grup manapun.');

        // Hitung unique member lintas semua GC (sama seperti .jpm <<)
        const botNum = (hisoka.user?.id || '').split(':')[0];
        const seenJid = new Set();

        for (const grp of allGroups) {
                for (const p of (grp.participants || [])) {
                        const raw = p.id || p.jid || '';
                        if (!raw) continue;

                        let jid;
                        if (raw.endsWith('@lid')) {
                                const resolved = global.__lookupLidPn ? global.__lookupLidPn(raw) : null;
                                jid = resolved
                                        ? (resolved.endsWith('@s.whatsapp.net') ? resolved : resolved.split('@')[0] + '@s.whatsapp.net')
                                        : raw;
                        } else {
                                jid = raw.endsWith('@s.whatsapp.net') ? raw : raw.split('@')[0] + '@s.whatsapp.net';
                        }

                        const num = jid.split('@')[0].split(':')[0];
                        if (num === botNum) continue;
                        seenJid.add(jid);
                }
        }

        const totalUnique = seenJid.size;

        // Urutkan GC: member terbanyak dulu
        allGroups.sort((a, b) => {
                const mA = (a.participants || []).length;
                const mB = (b.participants || []).length;
                if (mB !== mA) return mB - mA;
                return (a.subject || '').localeCompare(b.subject || '', 'id');
        });

        const pref = m.prefix || '.';

        // Bangun teks daftar GC
        // Jika terlalu panjang, pecah menjadi beberapa pesan
        const MAKS_BARIS = 50;
        const baris = allGroups.map((g, i) => {
                const nama = (g.subject || 'Tanpa Nama').slice(0, 30);
                const jml  = (g.participants || []).length;
                return `│ ${String(i + 1).padStart(2, ' ')}. ${nama}\n│     👥 ${jml} member  •  \`${g.id}\``;
        });

        const header =
                `╭─「 📋 *JPM LIST* 」\n│\n` +
                `│ 🗂️ Total GC    : *${allGroups.length} grup*\n` +
                `│ 👥 Member unik : *${totalUnique} orang*\n` +
                `│ _(jika \`${pref}jpm <<\` dijalankan)_\n│\n` +
                `│ Diurutkan: member terbanyak dulu\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        const footer =
                `│\n` +
                `╰─ 💡 Pakai \`${pref}jpm <pesan> | <delay>\` untuk push ke GC saat ini\n` +
                `    Pakai \`${pref}jpm << <pesan> | <delay>\` untuk broadcast semua GC`;

        // Kirim dalam batch kalau grup > 50
        const chunks = [];
        for (let i = 0; i < baris.length; i += MAKS_BARIS) {
                chunks.push(baris.slice(i, i + MAKS_BARIS));
        }

        for (let ci = 0; ci < chunks.length; ci++) {
                const isFirst = ci === 0;
                const isLast  = ci === chunks.length - 1;
                const bagian  = chunks.length > 1 ? ` _(${ci + 1}/${chunks.length})_` : '';

                let teks = '';
                if (isFirst) teks += header;
                else         teks += `╭─「 📋 *JPM LIST${bagian}* 」\n│\n`;

                teks += chunks[ci].join('\n│\n');

                if (isLast)  teks += '\n' + footer;
                else         teks += `\n│\n╰─ _Lanjut ke pesan berikutnya..._`;

                await m.reply(teks);

                // Jeda antar pesan supaya tidak flood
                if (!isLast) await new Promise(res => setTimeout(res, 800));
        }

        logCommand(m, hisoka, 'jpmlist');
}

module.exports = { handleJpm, handleJpmstop, handleJpmlist };
