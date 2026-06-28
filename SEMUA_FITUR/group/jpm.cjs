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
 *  jpm.cjs — JPM (Kirim Pesan ke Grup / GC)
 *  .jpm  <pesan> | <delay>     → tampilkan menu pilih GC (realtime)
 *  .jpm << <pesan> | <delay>   → kirim langsung ke SEMUA GC
 *  .jpmstop                    → hentikan proses JPM yang sedang berjalan
 *  .jpmlist                    → tampilkan daftar GC yang diikuti bot
 *
 *  ⚠️  HANYA BOT UTAMA — jadibot tidak bisa pakai fitur ini
 * ───────────────────────────────
 */
'use strict';

// ── Storage flag cancel per hisoka instance ───────────────────────────────────

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
        if (total === 0) return '[' + '░'.repeat(len) + ']';
        const filled = Math.round((done / total) * len);
        return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']';
}

// ── Resolve teks pesan (\n → newline asli) ───────────────────────────────────

function resolveText(raw) {
        return (raw || '')
                .replace(/\\n\\n/g, '\n\n\n')
                .replace(/\\n/g, '\n\n');
}

// ── Resolve media dari pesan ──────────────────────────────────────────────────

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

// ── Kirim satu pesan ke satu GC ───────────────────────────────────────────────

async function kirimSatuGC(hisoka, gid, { pesanKirim, mediaBuffer, mediaType }) {
        if (mediaBuffer && mediaBuffer.length > 0) {
                if (mediaType === 'imageMessage') {
                        await hisoka.sendMessage(gid, { image: mediaBuffer, caption: pesanKirim });
                } else if (mediaType === 'videoMessage') {
                        await hisoka.sendMessage(gid, { video: mediaBuffer, caption: pesanKirim });
                } else {
                        await hisoka.sendMessage(gid, {
                                document: mediaBuffer,
                                caption: pesanKirim,
                                mimetype: 'application/octet-stream',
                        });
                }
        } else {
                await hisoka.sendMessage(gid, { text: pesanKirim });
        }
}

// ── Kirim ke list GC dengan progress + cancel support ────────────────────────

async function kirimKeGCList(hisoka, { gidList, pesanKirim, delayDetik, mediaBuffer, mediaType, onProgress }) {
        let berhasil = 0, gagal = 0, dibatalkan = false;
        const total = gidList.length;

        for (const gid of gidList) {
                if (isJpmCancelled(hisoka)) { dibatalkan = true; break; }

                try {
                        await kirimSatuGC(hisoka, gid, { pesanKirim, mediaBuffer, mediaType });
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

        return { berhasil, gagal, dibatalkan };
}

// ── Eksekusi JPM ke satu GC ───────────────────────────────────────────────────

async function _runJpmSatu({ hisoka, m, pref, tolak, logCommand, Button, targetGid, isiQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia }) {
        const modeLabel = adaMedia
                ? (mediaType === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video')
                : '💬 Teks';
        const pesanKirim = resolveText(pesanRaw);

        // Ambil nama grup
        let namaGrup = targetGid;
        try {
                const meta = await hisoka.groupMetadata(targetGid);
                namaGrup = meta?.subject || targetGid;
        } catch (_) {}

        setJpmRunning(hisoka, true);
        let progMsg = null;
        try {
                progMsg = await m.reply(
                        `⏳ *JPM dimulai...*\n\n` +
                        `👥 *Grup :* ${namaGrup}\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱️ *Delay :* ${delayDetik} detik\n\n` +
                        `_Mengirim pesan ke grup..._\n` +
                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                );

                const { berhasil, gagal, dibatalkan } = await kirimKeGCList(hisoka, {
                        gidList: [targetGid],
                        pesanKirim,
                        delayDetik,
                        mediaBuffer,
                        mediaType,
                        onProgress: null,
                });

                const doneText = dibatalkan
                        ? `🛑 *JPM dihentikan!*\n\n` +
                          `👥 *Grup :* ${namaGrup}\n` +
                          `📤 *Mode :* ${modeLabel}`
                        : berhasil > 0
                                ? `✅ *JPM berhasil!*\n\n` +
                                  `👥 *Grup :* ${namaGrup}\n` +
                                  `📤 *Mode :* ${modeLabel}\n` +
                                  `⏱️ *Delay :* ${delayDetik} detik`
                                : `❌ *JPM gagal!*\n\n` +
                                  `👥 *Grup :* ${namaGrup}\n` +
                                  `📤 *Mode :* ${modeLabel}`;

                if (progMsg?.key) {
                        await m.reply({ edit: progMsg.key, text: doneText });
                } else {
                        await m.reply(doneText);
                }

                // ── Button ulangi JPM setelah selesai ──────────────────────
                if (!dibatalkan && berhasil > 0 && Button) {
                        try {
                                const btnJpm = new Button()
                                        .setBody(
                                                `╭─「 🔁 *ULANGI JPM?* 」\n│\n` +
                                                `│ 👥 *Grup :* ${namaGrup}\n` +
                                                `│ ✅ *Status :* Berhasil\n│\n` +
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

// ── Eksekusi JPM ke semua GC ──────────────────────────────────────────────────

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

        const gidList = allGroups.map(g => g.id).filter(Boolean);

        setJpmRunning(hisoka, true);
        let progMsg = null;
        try {
                progMsg = await m.reply(
                        `⏳ *JPM Semua GC dimulai...*\n\n` +
                        `🗂️ *Total GC :* ${gidList.length} grup\n` +
                        `📤 *Mode :* ${modeLabel}\n` +
                        `⏱️ *Delay :* ${delayDetik} detik/grup\n\n` +
                        `_Sedang mengirim ke semua GC..._\n` +
                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                );

                const { berhasil, gagal, dibatalkan } = await kirimKeGCList(hisoka, {
                        gidList,
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
                                                        `🗂️ *Total GC :* ${total} grup\n` +
                                                        `📊 *Progress :* ${bar} ${pct}%\n` +
                                                        `📬 *Terkirim :* ${sent}/${total} GC\n` +
                                                        `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                        `📤 *Mode :* ${modeLabel}\n\n` +
                                                        `_Ketik \`${pref}jpmstop\` untuk membatalkan._`
                                        });
                                } catch (_) {}
                        },
                });

                const doneText = dibatalkan
                        ? `🛑 *JPM Semua GC dihentikan!*\n\n` +
                          `🗂️ *Total GC :* ${gidList.length} grup\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `✔️ *Berhasil :* ${berhasil} GC\n` +
                          `❌ *Gagal :* ${gagal} GC\n` +
                          `🔘 *Sisa :* ${gidList.length - (berhasil + gagal)} GC belum terkirim`
                        : `✅ *JPM Semua GC selesai!*\n\n` +
                          `🗂️ *Total GC :* ${gidList.length} grup\n` +
                          `📤 *Mode :* ${modeLabel}\n` +
                          `⏱️ *Delay :* ${delayDetik} detik/grup\n` +
                          `✔️ *Berhasil :* ${berhasil} GC\n` +
                          `❌ *Gagal :* ${gagal} GC`;

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
                                                `│ 🗂️ *Total GC :* ${gidList.length} grup\n` +
                                                `│ ✔️ *Berhasil :* ${berhasil} GC\n` +
                                                `│ ❌ *Gagal :* ${gagal} GC\n│\n` +
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
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');
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
                const pesanRaw   = (parts[0] || '').trim();
                const delayInput = parseInt((parts[1] || '').trim());
                const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;
                if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                if (!delayDetik) return tolak(hisoka, m, `❌ *Delay tidak valid!*\n\n⏱️ Masukkan delay antara *3–10 detik*`);
                return await _runJpmSatu({ hisoka, m, pref, tolak, logCommand, Button, targetGid, isiQuery: subQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia });
        }

        // ─── MODE <<: Semua GC — langsung eksekusi ───────────────────────────
        if (rawQuery.startsWith('<<')) {
                const isiQuery   = rawQuery.slice(2).trim();
                const parts      = isiQuery.split('|');
                const pesanRaw   = (parts[0] || '').trim();
                const delayInput = parseInt((parts[1] || '').trim());
                const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;
                if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                if (parts.length < 2 || !delayDetik) return tolak(hisoka, m,
                        `❌ *Delay tidak valid!*\n\n⏱️ Masukkan delay antara *3–10 detik*\n\n📝 *Contoh:*\n\`${pref}jpm << Halo GC! | 5\``
                );
                return await _runJpmSemua({ hisoka, m, pref, tolak, logCommand, Button, isiQuery, pesanRaw, delayDetik, mediaBuffer, mediaType, adaMedia });
        }

        // ─── MODE UTAMA: Tampilkan menu pilih GC dulu ────────────────────────
        const isiQuery = rawQuery;

        if (!isiQuery && !adaMedia) {
                return tolak(hisoka, m,
                        `❌ *Format salah!*\n\n` +
                        `📌 *Cara pakai:*\n` +
                        `\`${pref}jpm <pesan> | <delay>\`\n\n` +
                        `📌 *Kirim ke SEMUA GC:*\n` +
                        `\`${pref}jpm << <pesan> | <delay>\`\n\n` +
                        `⏱️ *Delay:* 3–10 detik\n\n` +
                        `💡 *Contoh:*\n` +
                        `\`${pref}jpm Halo GC! Ada info nih | 5\`\n` +
                        `\`${pref}jpm << Broadcast ke semua GC | 5\``
                );
        }

        // Validasi format pesan & delay
        const parts      = isiQuery.split('|');
        const pesanRaw   = (parts[0] || '').trim();
        const delayInput = parseInt((parts[1] || '').trim());
        const delayDetik = (!isNaN(delayInput) && delayInput >= 3 && delayInput <= 10) ? delayInput : null;

        if (!adaMedia && !pesanRaw) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
        if (parts.length < 2 || delayDetik === null) {
                return tolak(hisoka, m,
                        `❌ *Delay tidak valid!*\n\n` +
                        `⏱️ Masukkan delay antara *3–10 detik*\n\n` +
                        `📝 *Contoh:*\n\`${pref}jpm Halo GC! | 5\``
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

        const totalGC = allGroups.length;
        const pesanPreview = pesanRaw.length > 28 ? pesanRaw.slice(0, 28) + '...' : pesanRaw;
        const botNum = (hisoka.user?.id || '').split(':')[0];

        // Tampilkan button menu pilih GC (persis seperti ghosttag)
        const btn = new Button()
                .setBody(
                        `╭─「 📤 *JPM — PILIH TARGET GC* 」\n│\n` +
                        `│ 📝 *Pesan  :* ${pesanPreview}\n` +
                        `│ 📤 *Mode   :* ${modeLabel}\n` +
                        `│ ⏱️ *Delay  :* ${delayDetik} detik/GC\n│\n` +
                        `│ 🗂️ *Total GC :* *${totalGC} grup*\n│\n` +
                        `│ ✦ *Semua GC* — kirim ke semua sekaligus\n` +
                        `│ ✦ *Pilih Satu GC* — pilih dari daftar\n│\n` +
                        `╰─────────────────────────`
                )
                .setFooter(`⚡ Wily Bot • JPM System`)
                .addReply('🌐 Kirim ke Semua GC', `${pref}jpm << ${isiQuery}`)
                .addSelection('📂 Pilih Satu GC')
                .makeSections('✦ Daftar Grup');

        for (const g of allGroups) {
                const nama       = (g.subject || g.name || 'Tanpa Nama').slice(0, 24);
                const jml        = (g.participants || []).length;
                const parts2     = (g.participants || []);
                const jmlAdmin   = parts2.filter(p => p.admin).length;
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
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

        if (!isJpmRunning(hisoka)) {
                return m.reply('ℹ️ Tidak ada proses JPM yang sedang berjalan saat ini.');
        }

        requestJpmCancel(hisoka);
        await m.reply('🛑 *Permintaan stop JPM diterima!*\n\n_Proses akan dihentikan setelah GC saat ini selesai diproses..._');
        logCommand(m, hisoka, 'jpmstop');
}

// ── Handler: .jpmlist ─────────────────────────────────────────────────────────

async function handleJpmlist({ hisoka, m, tolak, logCommand }) {
        if (hisoka?.isMainBot === false) return tolak(hisoka, m, '❌ Fitur ini hanya tersedia di *bot utama*. Jadibot tidak mendukung perintah ini.');
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

        // Urutkan GC: member terbanyak dulu
        allGroups.sort((a, b) => {
                const mA = (a.participants || []).length;
                const mB = (b.participants || []).length;
                if (mB !== mA) return mB - mA;
                return (a.subject || '').localeCompare(b.subject || '', 'id');
        });

        const pref = m.prefix || '.';

        const MAKS_BARIS = 50;
        const baris = allGroups.map((g, i) => {
                const nama = (g.subject || 'Tanpa Nama').slice(0, 30);
                const jml  = (g.participants || []).length;
                return `│ ${String(i + 1).padStart(2, ' ')}. ${nama}\n│     👥 ${jml} anggota  •  \`${g.id}\``;
        });

        const header =
                `╭─「 📋 *JPM LIST* 」\n│\n` +
                `│ 🗂️ Total GC : *${allGroups.length} grup*\n` +
                `│\n` +
                `│ Diurutkan: anggota terbanyak dulu\n` +
                `│━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`;

        const footer =
                `│\n` +
                `╰─ 💡 Ketik \`${pref}jpm <pesan> | <delay>\` untuk mulai JPM`;

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

                if (!isLast) await new Promise(res => setTimeout(res, 800));
        }

        logCommand(m, hisoka, 'jpmlist');
}

module.exports = { handleJpm, handleJpmstop, handleJpmlist };
