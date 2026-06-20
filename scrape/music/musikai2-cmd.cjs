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
 *  musikai2-cmd.cjs — MusicAI v2 command handler
 *  Perintah generate musik AI menggunakan model generasi v2
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  MusicAI v2 Command Handler (.musikai2)
 *  Generate lagu/musik orisinal menggunakan model AI generasi
 *  v2 — cukup beri deskripsi/lirik & genre, bot akan hasilkan
 *  dan kirim file audio langsung ke WhatsApp.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const path = require('path');

// ─── Factory: buat _generateMusik2 dengan deps yang sudah di-bind ─────────────
function _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, sendAudioWithButtons, logCommand }) {
        return async function _generateMusik2(params) {
                const { ChatMusicAPI2, formatDuration2: fmtDur2, MODELS2: MusicModels2 } = require(path.resolve('./scrape/music/chatmusic2.cjs'));
                await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});

                const txtLoading =
                        `🎵 *Generate Musik AI 2...*\n` +
                        `│ Judul : *${params.title}*\n` +
                        `│ Genre : *${params.musicStyle || 'pop'}*\n` +
                        `│ Mode  : *${params.isInstrumental ? 'Instrumental' : 'Dengan Vokal'}*\n` +
                        `│\n` +
                        `│ ⏳ Proses ~20-40 detik...`;
                const loadingMsg = await hisoka.sendMessage(m.from, { text: txtLoading }, { quoted: m }).catch(() => null);

                const _editLoading = async (txt) => {
                        if (!loadingMsg?.key) return;
                        try { await hisoka.sendMessage(m.from, { text: txt, edit: loadingMsg.key }); } catch (_) {}
                };

                try {
                        const api = new ChatMusicAPI2();
                        await api.login();
                        await _editLoading(`🎵 Login OK. Mengirim ke AI 2...\n│ Judul : *${params.title}*\n│ ⏳ Tunggu sebentar...`);

                        const taskIds = await api.generate(params);
                        await _editLoading(`🎵 AI sedang menciptakan musik...\n│ Task  : ${taskIds.length} variasi\n│ ⏳ Polling...`);

                        const tracks = await api.waitAll(taskIds, (done, total) => {
                                _editLoading(`🎵 Progress: *${done}/${total}* variasi selesai...\n│ ⏳ Menunggu sisanya...`).catch(() => {});
                        });

                        await _editLoading(`✅ Selesai! Mengunduh cover & audio...`);

                        const downloads = await Promise.allSettled(
                                tracks.map(async (track, i) => {
                                        const [coverBuf, audioBuf] = await Promise.all([
                                                track.cover_image ? api.downloadBuffer(track.cover_image).catch(() => null) : null,
                                                api.downloadBuffer(track.music_file),
                                        ]);
                                        return { track, index: i + 1, coverBuf, audioBuf };
                                })
                        );

                        const results = downloads.filter(r => r.status === 'fulfilled').map(r => r.value);
                        if (!results.length) throw new Error('Semua download gagal');

                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }

                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }).catch(() => {});

                        const cacheKey = `${m.from}_${Date.now()}`;
                        pendingMusikai2Cache.set(cacheKey, { results, params, ts: Date.now() });
                        setTimeout(() => pendingMusikai2Cache.delete(cacheKey), 10 * 60 * 1000);

                        const modeLabel = params.isInstrumental ? '🎹 Instrumental' : '🎤 Dengan Vokal';
                        const variasiLines = results.map(r => {
                                const t = r.track?.title || params.title || 'musik';
                                const dur = r.track?.duration ? ` • ${fmtDur2(r.track.duration)}` : '';
                                return `│ *V${r.index}* — ${t}${dur}`;
                        }).join('\n');

                        const bodyTxt =
                                `╭──『 🎵 *MUSIK AI 2 SELESAI* 』\n` +
                                `│\n` +
                                `│ 🎼 *Judul*  : ${params.title || 'musik'}\n` +
                                `│ 🎸 *Genre*  : ${params.musicStyle || 'pop'}\n` +
                                `│ ${modeLabel}\n` +
                                `│\n` +
                                `│ 🎧 *${results.length} Variasi tersedia:*\n` +
                                `${variasiLines}\n` +
                                `│\n` +
                                `│ Pilih variasi untuk mendengarkan ↓\n` +
                                `╰──────────────────────────────`;

                        const genreLabel = params.musicStyle || 'pop';
                        const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣'];
                        const activeModelId = params.modelId || 6;
                        const activeModel = MusicModels2.find(md => md.id === activeModelId)?.version || 'v5.0';

                        const variasiRows = [];
                        results.forEach((r, i) => {
                                const t = r.track?.title || params.title || 'musik';
                                const dur = r.track?.duration ? fmtDur2(r.track.duration) : null;
                                const modeBadge = params.isInstrumental ? '🎹 Instrumental' : '🎤 Vokal';
                                const durTxt = dur ? `  ·  ⏱ ${dur}` : '';
                                variasiRows.push(
                                        {
                                                header: `${numEmoji[i] || `V${r.index}`}  ───  🎵 MP3  ·  Variasi ${r.index}`,
                                                title: `「 ${t} 」`,
                                                description: `🎸 ${genreLabel}  ·  ${modeBadge}${durTxt}`,
                                                id: `__musikai2_play__${cacheKey}__${r.index}__mp3`,
                                        },
                                        {
                                                header: `${numEmoji[i] || `V${r.index}`}  ───  🎙️ VN  ·  Variasi ${r.index}`,
                                                title: `「 ${t} 」`,
                                                description: `🎸 ${genreLabel}  ·  ${modeBadge}${durTxt}`,
                                                id: `__musikai2_play__${cacheKey}__${r.index}__vn`,
                                        }
                                );
                        });

                        const modelRows = MusicModels2.map(md => ({
                                header: md.id === activeModelId
                                        ? `✅  Aktif Sekarang  ───  ${md.version}`
                                        : `🤖  Ganti ke  ───  ${md.version}`,
                                title: md.id === activeModelId
                                        ? `🔵 Model ${md.version}  (sedang dipakai)`
                                        : `⚪ Model ${md.version}`,
                                description: md.id === activeModelId
                                        ? `✦ Generate ulang dengan model yang sama`
                                        : `✦ Generate ulang lagu ini pakai model ${md.version}`,
                                id: `__musikai2_model__${cacheKey}__${md.id}`,
                        }));

                        const actionRows = [
                                {
                                        header: '🤖  ───────────────────────',
                                        title: '✨ AI Random Sekarang',
                                        description: '✦ AI pilih genre + judul + lirik otomatis, langsung generate!',
                                        id: '__musikai2_random__',
                                },
                                {
                                        header: '🎨  ───────────────────────',
                                        title: 'Pilih Genre Manual',
                                        description: '✦ Pilih sendiri genre-nya, AI buatkan judul & liriknya',
                                        id: '__musikai2_pickgenre__',
                                },
                                {
                                        header: '🎵  ───────────────────────',
                                        title: 'Menu Musik AI 2',
                                        description: '✦ Lihat semua opsi & cara pakai manual',
                                        id: '__musikai2_menu__',
                                },
                        ];

                        const multiSections = [
                                { title: `╔═ 🎧 PILIH VARIASI & FORMAT ══╗`, rows: variasiRows },
                                { title: `╔═ 🤖 MODEL AI  ·  Aktif: ${activeModel} ══╗`, rows: modelRows },
                                { title: `╔═ ✦ AKSI LAINNYA ══════════╗`, rows: actionRows },
                        ];

                        const titleLabel = params.title || 'Hasil Musik';
                        const firstCover = results.find(r => r.coverBuf)?.coverBuf || null;
                        await sendAudioWithButtons(hisoka, m, null, bodyTxt, [],
                                {
                                        listTitle: `🎧 Dengarkan — ${titleLabel}`,
                                        sections: multiSections,
                                        coverBuf: firstCover,
                                        noAudio: true,
                                }
                        );

                        logCommand(m, hisoka, 'musikai2');
                } catch (err) {
                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }
                        throw err;
                }
        };
}

// ─── Command handler: .musikai2 / .aimusik2 ───────────────────────────────────
async function handleMusikai2Cmd({
        hisoka, m, query,
        tolak, logCommand, logError,
        sendConfirmWithButtons,
        pendingMusikai2Cache, sendAudioWithButtons,
}) {
        const _generateMusik2 = _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, sendAudioWithButtons, logCommand });

        const pfx = m.prefix || '.';
        const input = (query || '').trim();

        if (!input) {
                await sendConfirmWithButtons(hisoka, m,
                        `╭──『 🎵 *MUSIK AI 2* 』\n` +
                        `│\n` +
                        `│ Generate lagu original pakai AI (backend 2).\n` +
                        `│ Hasil: *2 variasi audio* + cover art.\n` +
                        `│\n` +
                        `│ *Cara pakai:*\n` +
                        `│ • _${pfx}musikai2 hujan di kota_ — tema bebas\n` +
                        `│ • _${pfx}musikai2 random_ — genre random\n` +
                        `│ • _${pfx}musikai2 judul | lirik | genre_ — manual\n` +
                        `│\n` +
                        `│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
                        `╰──────────────────────────────`,
                        [
                                { text: '🎲 Generate Random', id: '__musikai2_random__' },
                                { text: '📖 Cara Pakai Custom', id: '__musikai2_help__' },
                        ]
                );
                return;
        }

        try {
                if (input.toLowerCase() === 'random') {
                        await sendConfirmWithButtons(hisoka, m,
                                `╭──『 🎲 *MUSIK AI 2 — RANDOM* 』\n│\n│ AI akan memilih genre, judul & lirik\n│ secara otomatis sesuai bahasa pilihan.\n│\n│ Pilih bahasa lirik di bawah ↓\n╰──────────────────────────────`,
                                [
                                        { text: '🇮🇩 Indonesia', id: '__musikai2_rlang__id' },
                                        { text: '🇯🇵 Jepang',   id: '__musikai2_rlang__jp' },
                                        { text: '🇬🇧 English',  id: '__musikai2_rlang__en' },
                                ]
                        );
                        return;
                }

                const { ChatMusicAPI2 } = require(path.resolve('./scrape/music/chatmusic2.cjs'));

                if (!input.includes('|')) {
                        const tema = input.slice(0, 200);
                        await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});
                        const loadingMsg = await hisoka.sendMessage(m.from,
                                { text: `🎵 *AI 2 sedang meracik lagu...*\n│ Tema  : *${tema}*\n│\n│ ⏳ AI memilih genre, judul & lirik yang pas...` },
                                { quoted: m }
                        ).catch(() => null);
                        const _edit = async (txt) => {
                                if (!loadingMsg?.key) return;
                                try { await hisoka.sendMessage(m.from, { text: txt, edit: loadingMsg.key }); } catch (_) {}
                        };

                        const api = new ChatMusicAPI2();
                        await api.login();
                        const preset = await api.aiThemePreset(tema, 'vocal');
                        await _edit(
                                `🎵 *AI 2 selesai meracik!*\n` +
                                `│ Tema  : *${tema}*\n` +
                                `│ Judul : *${preset.title}*\n` +
                                `│ Genre : *${preset.genreLabel}*\n` +
                                `│\n` +
                                `│ ⏳ Mengirim ke server musik...`
                        );

                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }
                        await _generateMusik2({
                                title: preset.title, lyrics: preset.lyrics, musicStyle: preset.musicStyle,
                                genreLabel: preset.genreLabel, prompt: preset.prompt, isInstrumental: preset.isInstrumental,
                        });
                        console.log(`\x1b[35m[MusicAI2/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
                        return;
                }

                const parts = input.split('|').map(s => s.trim());
                await _generateMusik2({
                        title: parts[0] || 'My Song', lyrics: parts[1] || '', musicStyle: parts[2] || 'pop',
                        isInstrumental: !parts[1] ? 1 : 0, prompt: `${parts[2] || 'pop'} indonesia`,
                });
        } catch (error) {
                console.error('\x1b[31m[MusicAI2] Error:\x1b[39m', error.message);
                logError(error, 'command:musikai2');
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                const isSensitive = /sensitive words|prohibited/i.test(error.message);
                const errMsg = isSensitive
                        ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n│\n│ API mendeteksi *kata sensitif* dalam lirik.\n│\n│ 💡 *Solusi:*\n│ Hindari kata-kata terkait narkoba,\n│ SARA, kekerasan, atau konten dewasa.\n│\n│ Coba ganti lirikmu & kirim ulang ↓\n╰──────────────────────────────`
                        : `╭──『 ❌ *GAGAL GENERATE* 』\n│\n│ ${error.message}\n│\n│ Coba lagi atau pilih genre random ↓\n╰──────────────────────────────`;
                await sendConfirmWithButtons(hisoka, m, errMsg,
                        isSensitive
                                ? [{ text: '📖 Lihat Contoh Format', id: '__musikai2_help__' }]
                                : [{ text: '🔁 Coba Random Lagi', id: '__musikai2_random__' }]
                );
        }
}

// ─── Button callback handler (dipanggil dari message.js sebelum switch-case) ──
async function handleMusicAI2Callbacks({
        hisoka, m,
        pendingMusikai2Cache,
        generateWAMessageFromContent,
        sendAudioWithButtons,
        sendConfirmWithButtons,
        logCommand,
        logError,
        tolak,
}) {
        const txt = typeof m.text === 'string' ? m.text : null;
        if (txt === null) return false;

        const _generateMusik2 = _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, sendAudioWithButtons, logCommand });

        // Callback: __musikai2_random__ → pilih bahasa
        if (txt === '__musikai2_random__') {
                const langMsg2 = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo: m.key?.id ? {
                                                                stanzaId: m.key.id,
                                                                participant: m.sender || m.key?.participant || m.key?.remoteJid || '',
                                                                quotedMessage: m.raw || m.message || {},
                                                        } : {},
                                                        body: {
                                                                text:
                                                                        `╭──『 🤖 *AI RANDOM MUSIK 2* 』\n` +
                                                                        `│\n` +
                                                                        `│ AI acak genre, judul & lirik otomatis.\n` +
                                                                        `│\n` +
                                                                        `│ 🌏 Pilih gaya/bahasa musik:\n` +
                                                                        `╰──────────────────────────────`,
                                                        },
                                                        nativeFlowMessage: {
                                                                buttons: [{
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({
                                                                                title: '🌏 Pilih Gaya Musik',
                                                                                sections: [{
                                                                                        title: '🎵 Gaya / Bahasa',
                                                                                        rows: [
                                                                                                {
                                                                                                        header: '🇮🇩 ── Musik Indonesia ──────────',
                                                                                                        title: '🇮🇩 Indonesia',
                                                                                                        description: 'Pop, Indie, Ballad, Folk, Jazz — lirik bahasa Indonesia',
                                                                                                        id: '__musikai2_rlang__id',
                                                                                                },
                                                                                                {
                                                                                                        header: '🇯🇵 ── Musik Jepang ─────────────',
                                                                                                        title: '🇯🇵 Jepang',
                                                                                                        description: 'City Pop, J-Pop, Anime OST, J-Folk — lirik bahasa Jepang',
                                                                                                        id: '__musikai2_rlang__jp',
                                                                                                },
                                                                                                {
                                                                                                        header: '🇬🇧 ── Musik English ───────────',
                                                                                                        title: '🇬🇧 English',
                                                                                                        description: 'Indie Pop, R&B, Folk, Dream Pop — lyrics in English',
                                                                                                        id: '__musikai2_rlang__en',
                                                                                                },
                                                                                        ],
                                                                                }],
                                                                        }),
                                                                }],
                                                        },
                                                },
                                        },
                                },
                        },
                        {}, {}
                );
                await hisoka.relayMessage(langMsg2.key.remoteJid, langMsg2.message, { messageId: langMsg2.key.id });
                return true;
        }

        // Callback: pilih bahasa → tampilkan Vokal / Instrumental
        if (/^__musikai2_rlang__(id|jp|en)$/.test(txt)) {
                const lang2 = txt.replace('__musikai2_rlang__', '');
                const langLabel2 = lang2 === 'jp' ? '🇯🇵 Jepang' : lang2 === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                const { _GENRES: G2, _GENRES_JP: GJP2, _GENRES_EN: GEN2 } = require(path.resolve('./scrape/music/chatmusic2.cjs'));
                const pool2 = lang2 === 'jp' ? GJP2 : lang2 === 'en' ? GEN2 : G2;
                const sampleGenre2 = pool2[Math.floor(Math.random() * pool2.length)];
                const modeMsg2 = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo: m.key?.id ? {
                                                                stanzaId: m.key.id,
                                                                participant: m.sender || m.key?.participant || m.key?.remoteJid || '',
                                                                quotedMessage: m.raw || m.message || {},
                                                        } : {},
                                                        body: {
                                                                text:
                                                                        `╭──『 ${langLabel2} *MUSIK AI 2* 』\n` +
                                                                        `│\n` +
                                                                        `│ AI acak dari pool genre:\n` +
                                                                        `│ contoh: *${sampleGenre2}*, dll\n` +
                                                                        `│\n` +
                                                                        `│ Pilih mode lagu:\n` +
                                                                        `╰──────────────────────────────`,
                                                        },
                                                        nativeFlowMessage: {
                                                                buttons: [{
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({
                                                                                title: '🎵 Pilih Mode Lagu',
                                                                                sections: [{
                                                                                        title: '🎙️ Mode',
                                                                                        rows: [
                                                                                                {
                                                                                                        header: '🎤 ─── Dengan Vokal ──────────',
                                                                                                        title: '🎤 Dengan Vokal',
                                                                                                        description: `Lagu dengan vokal gaya ${langLabel2}`,
                                                                                                        id: `__musikai2_rlang__${lang2}__vocal__`,
                                                                                                },
                                                                                                {
                                                                                                        header: '🎹 ─── Instrumental ──────────',
                                                                                                        title: '🎹 Instrumental',
                                                                                                        description: `Musik tanpa vokal gaya ${langLabel2}`,
                                                                                                        id: `__musikai2_rlang__${lang2}__instrumental__`,
                                                                                                },
                                                                                        ],
                                                                                }],
                                                                        }),
                                                                }],
                                                        },
                                                },
                                        },
                                },
                        },
                        {}, {}
                );
                await hisoka.relayMessage(modeMsg2.key.remoteJid, modeMsg2.message, { messageId: modeMsg2.key.id });
                return true;
        }

        // Callback: vokal/instrumental terpilih → generate AI random musikai2
        if (/^__musikai2_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(txt)) {
                const match2 = txt.match(/^__musikai2_rlang__(id|jp|en)__(vocal|instrumental)__$/);
                const lang2 = match2[1];
                const forceMode2 = match2[2];
                const langLabel2 = lang2 === 'jp' ? '🇯🇵 Jepang' : lang2 === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                const modeLabel2 = forceMode2 === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                try {
                        const _cm2Path = path.resolve('./scrape/music/chatmusic2.cjs');
                        delete require.cache[_cm2Path];
                        const { ChatMusicAPI2, _GENRES: G2, _GENRES_JP: GJP2, _GENRES_EN: GEN2 } = require(_cm2Path);
                        const api2 = new ChatMusicAPI2();
                        const pool2 = lang2 === 'jp' ? GJP2 : lang2 === 'en' ? GEN2 : G2;
                        const randomGenre2 = pool2[Math.floor(Math.random() * pool2.length)];

                        const aiLoadMsg2 = await hisoka.sendMessage(m.from, {
                                text: `🤖 *AI meracik lagu ${langLabel2} ${modeLabel2}...*\n│ 🎲 Genre: *${randomGenre2}*\n│ ✍️ ${forceMode2 === 'vocal' ? 'Menulis lirik' : 'Menyusun komposisi instrumental'}\n│ ⏳ Tunggu ~10-15 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset2 = await api2.aiRandomPreset(forceMode2, lang2);

                        if (aiLoadMsg2?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg2.key }); } catch (_) {}
                        }

                        await _generateMusik2(preset2);
                        console.log(`\x1b[35m[MusicAI2 Random]\x1b[0m ✅ lang=${lang2} mode=${forceMode2} genre="${preset2.musicStyle}"`);
                } catch (err) {
                        console.error(`\x1b[31m[MusicAI2 ${langLabel2} ${modeLabel2}] Error:\x1b[39m`, err.message);
                        logError(err, 'callback:musikai2_random_mode');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await sendConfirmWithButtons(hisoka, m,
                                `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                [
                                        { text: '🔁 Coba Lagi', id: txt },
                                        { text: '↩️ Ganti Bahasa', id: '__musikai2_random__' },
                                ],
                                { quoteBot: true }
                        );
                }
                return true;
        }

        // Callback: play audio musikai2
        if (txt.startsWith('__musikai2_play__')) {
                const raw = txt.replace('__musikai2_play__', '');
                const lastDbl = raw.lastIndexOf('__');
                const lastSeg = raw.substring(lastDbl + 2);
                let key, idx, fmt;
                if (lastSeg === 'mp3' || lastSeg === 'vn') {
                        fmt = lastSeg;
                        const rest = raw.substring(0, lastDbl);
                        const secLast = rest.lastIndexOf('__');
                        key = rest.substring(0, secLast);
                        idx = parseInt(rest.substring(secLast + 2), 10);
                } else {
                        fmt = 'mp3';
                        key = raw.substring(0, lastDbl);
                        idx = parseInt(lastSeg, 10);
                }
                const cached = pendingMusikai2Cache.get(key);
                if (!cached) {
                        await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                        await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang dengan *.musikai2* atau tekan *Random Lagi*.`);
                        return true;
                }
                const r = cached.results.find(rv => rv.index === idx);
                if (!r) {
                        await tolak(hisoka, m, `❌ Variasi ${idx} tidak ditemukan.`);
                        return true;
                }
                const trackTitle = r.track?.title || cached.params.title || 'musik';
                const isVN = fmt === 'vn';
                await hisoka.sendMessage(m.from, { react: { text: isVN ? '🎙️' : '🎵', key: m.key } }).catch(() => {});
                await hisoka.sendMessage(m.from, {
                        audio: r.audioBuf,
                        mimetype: isVN ? 'audio/ogg; codecs=opus' : 'audio/mpeg',
                        ptt: isVN,
                        fileName: isVN ? undefined : `${trackTitle} (v${idx}).mp3`,
                }, { quoted: m }).catch(() => {});
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }).catch(() => {});
                return true;
        }

        // Callback: ganti model AI musikai2
        if (txt.startsWith('__musikai2_model__')) {
                const raw = txt.replace('__musikai2_model__', '');
                const lastDbl = raw.lastIndexOf('__');
                const key = raw.substring(0, lastDbl);
                const modelId = parseInt(raw.substring(lastDbl + 2), 10);
                const cached = pendingMusikai2Cache.get(key);
                if (!cached) {
                        await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                        await tolak(hisoka, m, `⏰ *Cache expired.* Silakan generate ulang dengan *.musikai2*`);
                        return true;
                }
                const { MODELS2: MusicModels2 } = require(path.resolve('./scrape/music/chatmusic2.cjs'));
                const modelVer = MusicModels2.find(md => md.id === modelId)?.version || `id:${modelId}`;
                await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                await _generateMusik2({ ...cached.params, modelId });
                return true;
        }

        // Callback: __musikai2_pickgenre__ → tampilkan daftar genre
        if (txt === '__musikai2_pickgenre__') {
                const genreSections2 = [
                        {
                                title: '🎵 Pop & Ballad',
                                rows: [
                                        { header: '🎵', title: 'Pop', description: 'Musik pop Indonesia ringan & catchy', id: '__musikai2_genre__pop' },
                                        { header: '🎶', title: 'Indie Pop', description: 'Vibes indie yang dreamy & mellow', id: '__musikai2_genre__indie pop' },
                                        { header: '🎼', title: 'Ballad', description: 'Slow ballad penuh perasaan', id: '__musikai2_genre__ballad' },
                                        { header: '🎹', title: 'Piano Ballad', description: 'Ballad dengan dominan piano', id: '__musikai2_genre__piano ballad' },
                                ],
                        },
                        {
                                title: '🎸 Rock & Acoustic',
                                rows: [
                                        { header: '🎸', title: 'Acoustic', description: 'Gitar akustik hangat & intim', id: '__musikai2_genre__acoustic' },
                                        { header: '🪕', title: 'Folk', description: 'Folk Indonesia yang earthy', id: '__musikai2_genre__folk' },
                                        { header: '🎸', title: 'Indie Rock', description: 'Rock alternatif indie vibes', id: '__musikai2_genre__indie rock' },
                                        { header: '🤘', title: 'Rock', description: 'Rock energik dengan gitar listrik', id: '__musikai2_genre__rock' },
                                ],
                        },
                        {
                                title: '🌊 Chill & Lo-Fi',
                                rows: [
                                        { header: '☁️', title: 'Lo-Fi Hip Hop', description: 'Beats lofi santai buat fokus', id: '__musikai2_genre__lofi hiphop' },
                                        { header: '🌙', title: 'Chillwave', description: 'Electronic chill dengan nuansa retro', id: '__musikai2_genre__chillwave' },
                                        { header: '🎷', title: 'Jazz', description: 'Jazz smooth yang elegan', id: '__musikai2_genre__smooth jazz' },
                                        { header: '🛋️', title: 'Bedroom Pop', description: 'Vibes kamar malam yang cozy', id: '__musikai2_genre__bedroom pop' },
                                ],
                        },
                        {
                                title: '💃 R&B & Soul',
                                rows: [
                                        { header: '✨', title: 'R&B', description: 'R&B modern Indonesia', id: '__musikai2_genre__rnb' },
                                        { header: '🕊️', title: 'Neo Soul', description: 'Soul kontemporer yang smooth', id: '__musikai2_genre__neo soul' },
                                        { header: '🌙', title: 'City Pop', description: 'City pop 80s yang nostalgic', id: '__musikai2_genre__city pop' },
                                        { header: '🎻', title: 'Cinematic', description: 'Orkestral sinematik yang dramatis', id: '__musikai2_genre__cinematic' },
                                ],
                        },
                ];
                const msg2 = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo: m.key?.id ? {
                                                                stanzaId: m.key.id,
                                                                participant: m.sender || m.key?.participant || m.key?.remoteJid || '',
                                                                quotedMessage: m.raw || m.message || {},
                                                        } : {},
                                                        body: {
                                                                text:
                                                                        `╭──『 🎨 *MUSIK AI 2 — PILIH GENRE MANUAL* 』\n` +
                                                                        `│\n` +
                                                                        `│ Pilih genre musiknya.\n` +
                                                                        `│ 🤖 AI akan otomatis buatkan:\n` +
                                                                        `│  • Judul yang sesuai genre\n` +
                                                                        `│  • Lirik lengkap (50+ baris)\n` +
                                                                        `│\n` +
                                                                        `│ 💡 Mau AI pilih semua? Tekan\n` +
                                                                        `│    *✨ AI Random Sekarang* di menu!\n` +
                                                                        `╰──────────────────────────────`,
                                                        },
                                                        nativeFlowMessage: {
                                                                buttons: [
                                                                        {
                                                                                name: 'single_select',
                                                                                buttonParamsJson: JSON.stringify({
                                                                                        title: '🎵 Pilih Genre',
                                                                                        sections: genreSections2,
                                                                                }),
                                                                        },
                                                                ],
                                                        },
                                                },
                                        },
                                },
                        },
                        {}, {}
                );
                await hisoka.relayMessage(msg2.key.remoteJid, msg2.message, { messageId: msg2.key.id });
                return true;
        }

        // Callback: user pilih genre dari single_select musikai2
        if (txt.startsWith('__musikai2_genre__')) {
                const selectedGenre2 = txt.replace('__musikai2_genre__', '').trim();
                try {
                        const _cm2PathG = path.resolve('./scrape/music/chatmusic2.cjs');
                        delete require.cache[_cm2PathG];
                        const { ChatMusicAPI2 } = require(_cm2PathG);
                        const api2g = new ChatMusicAPI2();

                        const aiLoadMsg2g = await hisoka.sendMessage(m.from, {
                                text: `✍️ *AI sedang menulis lirik...*\n│ Genre : *${selectedGenre2}*\n│ ⏳ Tunggu ~5 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset2g = await api2g.aiRandomPreset();
                        preset2g.musicStyle = selectedGenre2;
                        preset2g.prompt = `${selectedGenre2} indonesia, ${preset2g.prompt?.split(',').slice(1).join(',') || ''}`.trim();

                        if (aiLoadMsg2g?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg2g.key }); } catch (_) {}
                        }

                        await _generateMusik2(preset2g);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI2] Error:\x1b[39m', err.message);
                        logError(err, 'callback:musikai2_genre');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await sendConfirmWithButtons(hisoka, m,
                                `❌ *Gagal generate musik*\n\n_${err.message}_`,
                                [{ text: '🔁 Coba Random Lagi', id: '__musikai2_random__' }],
                                { quoteBot: true }
                        );
                }
                return true;
        }

        // Callback: help musikai2
        if (txt === '__musikai2_help__') {
                const pfx = m.prefix || '.';
                const helpMsg2 = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo: m.key?.id ? {
                                                                stanzaId: m.key.id,
                                                                participant: m.sender || m.key?.participant || m.key?.remoteJid || '',
                                                                quotedMessage: m.raw || m.message || {},
                                                        } : {},
                                                        body: {
                                                                text:
                                                                        `╭──『 📖 *CARA PAKAI MUSIK AI 2* 』\n` +
                                                                        `│\n` +
                                                                        `│ *Format:*\n` +
                                                                        `│ ${pfx}musikai2 [judul] | [lirik]\n` +
                                                                        `│ ${pfx}musikai2 [judul] | [lirik] | [genre]\n` +
                                                                        `│\n` +
                                                                        `│ *Contoh:*\n` +
                                                                        `│ ${pfx}musikai2 Hujan Malam | Hujan turun\n` +
                                                                        `│   deras malam ini | sad pop\n` +
                                                                        `│\n` +
                                                                        `│ *Kalau gak ada lirik* (instrumental):\n` +
                                                                        `│ ${pfx}musikai2 Senja Sunyi | | lofi\n` +
                                                                        `│\n` +
                                                                        `│ Atau langsung tekan tombol random! ↓\n` +
                                                                        `╰──────────────────────────────`,
                                                        },
                                                        nativeFlowMessage: {
                                                                buttons: [{
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({
                                                                                title: '🎵 Pilih Aksi',
                                                                                sections: [{
                                                                                        title: '🚀 Lanjut',
                                                                                        rows: [
                                                                                                { header: '🎲', title: '✨ AI Random Sekarang', description: 'AI pilih genre + judul + lirik otomatis', id: '__musikai2_random__' },
                                                                                                { header: '🎨', title: 'Pilih Genre Manual', description: 'Pilih sendiri genrenya, AI buatkan lirik', id: '__musikai2_pickgenre__' },
                                                                                                { header: '↩️', title: 'Kembali ke Menu', description: 'Lihat semua opsi Musik AI 2', id: '__musikai2_menu__' },
                                                                                        ],
                                                                                }],
                                                                        }),
                                                                }],
                                                        },
                                                },
                                        },
                                },
                        },
                        {}, {}
                );
                await hisoka.relayMessage(helpMsg2.key.remoteJid, helpMsg2.message, { messageId: helpMsg2.key.id });
                return true;
        }

        // Callback: menu musikai2
        if (txt === '__musikai2_menu__') {
                const pfx = m.prefix || '.';
                const menuMsg2 = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo: m.key?.id ? {
                                                                stanzaId: m.key.id,
                                                                participant: m.sender || m.key?.participant || m.key?.remoteJid || '',
                                                                quotedMessage: m.raw || m.message || {},
                                                        } : {},
                                                        body: {
                                                                text:
                                                                        `╭──『 🎵 *MUSIK AI 2* 』\n` +
                                                                        `│\n` +
                                                                        `│ Generate lagu original pakai AI (backend 2).\n` +
                                                                        `│ Hasil: *2 variasi audio* + cover art.\n` +
                                                                        `│\n` +
                                                                        `│ Tekan *Random* untuk generate langsung,\n` +
                                                                        `│ atau ketik manual:\n` +
                                                                        `│ _${pfx}musikai2 judul | lirik | genre_\n` +
                                                                        `│\n` +
                                                                        `│ ✨ Tiap random = kombinasi unik!\n` +
                                                                        `╰──────────────────────────────`,
                                                        },
                                                        nativeFlowMessage: {
                                                                buttons: [{
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({
                                                                                title: '🎵 Pilih Aksi',
                                                                                sections: [{
                                                                                        title: '🚀 Mulai Generate',
                                                                                        rows: [
                                                                                                { header: '🎲', title: '✨ AI Random Sekarang', description: 'AI pilih genre + judul + lirik otomatis', id: '__musikai2_random__' },
                                                                                                { header: '🎨', title: 'Pilih Genre Manual', description: 'Pilih sendiri genre, AI buatkan judul & lirik', id: '__musikai2_pickgenre__' },
                                                                                                { header: '📖', title: 'Cara Pakai Custom', description: 'Format manual: judul | lirik | genre', id: '__musikai2_help__' },
                                                                                        ],
                                                                                }],
                                                                        }),
                                                                }],
                                                        },
                                                },
                                        },
                                },
                        },
                        {}, {}
                );
                await hisoka.relayMessage(menuMsg2.key.remoteJid, menuMsg2.message, { messageId: menuMsg2.key.id });
                return true;
        }

        return false;
}

module.exports = { handleMusicAI2Callbacks, handleMusikai2Cmd };
