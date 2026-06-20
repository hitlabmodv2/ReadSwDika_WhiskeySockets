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
 *  musikai-cmd.cjs — MusicAI command handler
 *  Perintah .musikai untuk generate lagu/musik menggunakan AI
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  MusicAI v1 Command Handler (.musikai)
 *  Generate lagu/musik orisinal menggunakan AI — cukup beri
 *  deskripsi tema/lirik, bot akan buat dan kirim audio hasil
 *  generate langsung ke chat WhatsApp.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const path = require('path');

// ─── Factory: buat _generateMusik dengan deps yang sudah di-bind ──────────────
function _makeGenerateMusik({ hisoka, m, pendingMusikaiCache, sendAudioWithButtons, logCommand }) {
        return async function _generateMusik(params) {
                const { ChatMusicAPI, formatDuration: fmtDur, MODELS: MusicModels } = require(path.resolve('./scrape/music/chatmusic.cjs'));
                await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});

                const txtLoading =
                        `🎵 *Generate Musik AI...*\n` +
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
                        const api = new ChatMusicAPI();
                        await api.login();
                        await _editLoading(`🎵 Login OK. Mengirim ke AI...\n│ Judul : *${params.title}*\n│ ⏳ Tunggu sebentar...`);

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
                        pendingMusikaiCache.set(cacheKey, { results, params, ts: Date.now() });
                        setTimeout(() => pendingMusikaiCache.delete(cacheKey), 10 * 60 * 1000);

                        const modeLabel = params.isInstrumental ? '🎹 Instrumental' : '🎤 Dengan Vokal';
                        const variasiLines = results.map(r => {
                                const t = r.track?.title || params.title || 'musik';
                                const dur = r.track?.duration ? ` • ${fmtDur(r.track.duration)}` : '';
                                return `│ *V${r.index}* — ${t}${dur}`;
                        }).join('\n');

                        const bodyTxt =
                                `╭──『 🎵 *MUSIK AI SELESAI* 』\n` +
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
                        const activeModel = MusicModels.find(md => md.id === activeModelId)?.version || 'v5.0';

                        const variasiRows = [];
                        results.forEach((r, i) => {
                                const t = r.track?.title || params.title || 'musik';
                                const dur = r.track?.duration ? fmtDur(r.track.duration) : null;
                                const modeBadge = params.isInstrumental ? '🎹 Instrumental' : '🎤 Vokal';
                                const durTxt = dur ? `  ·  ⏱ ${dur}` : '';
                                variasiRows.push(
                                        {
                                                header: `${numEmoji[i] || `V${r.index}`}  ───  🎵 MP3  ·  Variasi ${r.index}`,
                                                title: `「 ${t} 」`,
                                                description: `🎸 ${genreLabel}  ·  ${modeBadge}${durTxt}`,
                                                id: `__musikai_play__${cacheKey}__${r.index}__mp3`,
                                        },
                                        {
                                                header: `${numEmoji[i] || `V${r.index}`}  ───  🎙️ VN  ·  Variasi ${r.index}`,
                                                title: `「 ${t} 」`,
                                                description: `🎸 ${genreLabel}  ·  ${modeBadge}${durTxt}`,
                                                id: `__musikai_play__${cacheKey}__${r.index}__vn`,
                                        }
                                );
                        });

                        const modelRows = MusicModels.map(md => ({
                                header: md.id === activeModelId
                                        ? `✅  Aktif Sekarang  ───  ${md.version}`
                                        : `🤖  Ganti ke  ───  ${md.version}`,
                                title: md.id === activeModelId
                                        ? `🔵 Model ${md.version}  (sedang dipakai)`
                                        : `⚪ Model ${md.version}`,
                                description: md.id === activeModelId
                                        ? `✦ Generate ulang dengan model yang sama`
                                        : `✦ Generate ulang lagu ini pakai model ${md.version}`,
                                id: `__musikai_model__${cacheKey}__${md.id}`,
                        }));

                        const actionRows = [
                                {
                                        header: '🤖  ───────────────────────',
                                        title: '✨ AI Random Sekarang',
                                        description: '✦ AI pilih genre + judul + lirik otomatis, langsung generate!',
                                        id: '__musikai_random__',
                                },
                                {
                                        header: '🎨  ───────────────────────',
                                        title: 'Pilih Genre Manual',
                                        description: '✦ Pilih sendiri genre-nya, AI buatkan judul & liriknya',
                                        id: '__musikai_pickgenre__',
                                },
                                {
                                        header: '🎵  ───────────────────────',
                                        title: 'Menu Musik AI',
                                        description: '✦ Lihat semua opsi & cara pakai manual',
                                        id: '__musikai_menu__',
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

                        logCommand(m, hisoka, 'musikai');
                } catch (err) {
                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }
                        throw err;
                }
        };
}

// ─── Factory: buat _showGenreSelect dengan deps yang sudah di-bind ────────────
function _makeShowGenreSelect({ hisoka, m, generateWAMessageFromContent }) {
        return async function _showGenreSelect() {
                const genreSections = [
                        {
                                title: '🎵 Pop & Ballad',
                                rows: [
                                        { header: '🎵', title: 'Pop', description: 'Musik pop Indonesia ringan & catchy', id: '__musikai_genre__pop' },
                                        { header: '🎶', title: 'Indie Pop', description: 'Vibes indie yang dreamy & mellow', id: '__musikai_genre__indie pop' },
                                        { header: '🎼', title: 'Ballad', description: 'Slow ballad penuh perasaan', id: '__musikai_genre__ballad' },
                                        { header: '🎹', title: 'Piano Ballad', description: 'Ballad dengan dominan piano', id: '__musikai_genre__piano ballad' },
                                ],
                        },
                        {
                                title: '🎸 Rock & Acoustic',
                                rows: [
                                        { header: '🎸', title: 'Acoustic', description: 'Gitar akustik hangat & intim', id: '__musikai_genre__acoustic' },
                                        { header: '🪕', title: 'Folk', description: 'Folk Indonesia yang earthy', id: '__musikai_genre__folk' },
                                        { header: '🎸', title: 'Indie Rock', description: 'Rock alternatif indie vibes', id: '__musikai_genre__indie rock' },
                                        { header: '🤘', title: 'Rock', description: 'Rock energik dengan gitar listrik', id: '__musikai_genre__rock' },
                                ],
                        },
                        {
                                title: '🌊 Chill & Lo-Fi',
                                rows: [
                                        { header: '☁️', title: 'Lo-Fi Hip Hop', description: 'Beats lofi santai buat fokus', id: '__musikai_genre__lofi hiphop' },
                                        { header: '🌙', title: 'Chillwave', description: 'Electronic chill dengan nuansa retro', id: '__musikai_genre__chillwave' },
                                        { header: '🎷', title: 'Jazz', description: 'Jazz smooth yang elegan', id: '__musikai_genre__smooth jazz' },
                                        { header: '🛋️', title: 'Bedroom Pop', description: 'Vibes kamar malam yang cozy', id: '__musikai_genre__bedroom pop' },
                                ],
                        },
                        {
                                title: '💃 R&B & Soul',
                                rows: [
                                        { header: '✨', title: 'R&B', description: 'R&B modern Indonesia', id: '__musikai_genre__rnb' },
                                        { header: '🕊️', title: 'Neo Soul', description: 'Soul kontemporer yang smooth', id: '__musikai_genre__neo soul' },
                                        { header: '🌙', title: 'City Pop', description: 'City pop 80s yang nostalgic', id: '__musikai_genre__city pop' },
                                        { header: '🎻', title: 'Cinematic', description: 'Orkestral sinematik yang dramatis', id: '__musikai_genre__cinematic' },
                                ],
                        },
                ];
                const msg = generateWAMessageFromContent(
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
                                                                        `╭──『 🎨 *MUSIK AI — PILIH GENRE MANUAL* 』\n` +
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
                                                                                        sections: genreSections,
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
                await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
        };
}

// ─── Command handler: .musikai / .aimusik ─────────────────────────────────────
async function handleMusikaiCmd({
        hisoka, m, query,
        tolak, logCommand, logError,
        sendConfirmWithButtons,
        pendingMusikaiCache, generateWAMessageFromContent, sendAudioWithButtons,
}) {
        const _generateMusik = _makeGenerateMusik({ hisoka, m, pendingMusikaiCache, sendAudioWithButtons, logCommand });
        const _showGenreSelect = _makeShowGenreSelect({ hisoka, m, generateWAMessageFromContent });

        const pfx = m.prefix || '.';
        const input = (query || '').trim();

        if (!input) {
                await sendConfirmWithButtons(hisoka, m,
                        `╭──『 🎵 *MUSIK AI* 』\n` +
                        `│\n` +
                        `│ Generate lagu original pakai AI.\n` +
                        `│ Hasil: *2 variasi audio* + cover art.\n` +
                        `│\n` +
                        `│ *Cara pakai:*\n` +
                        `│ • _${pfx}musikai hujan di kota_ — tema bebas\n` +
                        `│ • _${pfx}musikai random_ — genre random\n` +
                        `│ • _${pfx}musikai judul | lirik | genre_ — manual\n` +
                        `│\n` +
                        `│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
                        `╰──────────────────────────────`,
                        [
                                { text: '🎲 Generate Random', id: '__musikai_random__' },
                                { text: '📖 Cara Pakai Custom', id: '__musikai_help__' },
                        ]
                );
                return;
        }

        try {
                if (input.toLowerCase() === 'random') {
                        await _showGenreSelect();
                        return;
                }

                if (!input.includes('|')) {
                        const tema = input.slice(0, 200);
                        await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});
                        const loadingMsg = await hisoka.sendMessage(m.from,
                                { text: `🎵 *AI sedang meracik lagu...*\n│ Tema  : *${tema}*\n│\n│ ⏳ AI memilih genre, judul & lirik yang pas...` },
                                { quoted: m }
                        ).catch(() => null);
                        const _edit = async (txt) => {
                                if (!loadingMsg?.key) return;
                                try { await hisoka.sendMessage(m.from, { text: txt, edit: loadingMsg.key }); } catch (_) {}
                        };

                        const { ChatMusicAPI } = require(path.resolve('./scrape/music/chatmusic.cjs'));
                        const api = new ChatMusicAPI();
                        await api.login();
                        const preset = await api.aiThemePreset(tema, 'vocal');
                        await _edit(
                                `🎵 *AI selesai meracik!*\n` +
                                `│ Tema  : *${tema}*\n` +
                                `│ Judul : *${preset.title}*\n` +
                                `│ Genre : *${preset.genreLabel}*\n` +
                                `│\n` +
                                `│ ⏳ Mengirim ke server musik...`
                        );

                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }
                        await _generateMusik({
                                title: preset.title, lyrics: preset.lyrics, musicStyle: preset.musicStyle,
                                genreLabel: preset.genreLabel, prompt: preset.prompt, isInstrumental: preset.isInstrumental,
                        });
                        console.log(`\x1b[35m[MusicAI/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
                        return;
                }

                const parts = input.split('|').map(s => s.trim());
                await _generateMusik({
                        title: parts[0] || 'My Song', lyrics: parts[1] || '', musicStyle: parts[2] || 'pop',
                        isInstrumental: !parts[1] ? 1 : 0, prompt: `${parts[2] || 'pop'} indonesia`,
                });
        } catch (error) {
                console.error('\x1b[31m[MusicAI] Error:\x1b[39m', error.message);
                logError(error, 'command:musikai');
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                const isSensitive = /sensitive words|prohibited/i.test(error.message);
                const errMsg = isSensitive
                        ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n│\n│ API mendeteksi *kata sensitif* dalam lirik.\n│\n│ 💡 *Solusi:*\n│ Hindari kata-kata terkait narkoba,\n│ SARA, kekerasan, atau konten dewasa.\n│\n│ Coba ganti lirikmu & kirim ulang ↓\n╰──────────────────────────────`
                        : `╭──『 ❌ *GAGAL GENERATE* 』\n│\n│ ${error.message}\n│\n│ Coba lagi atau pilih genre random ↓\n╰──────────────────────────────`;
                await sendConfirmWithButtons(hisoka, m, errMsg,
                        isSensitive
                                ? [{ text: '📖 Lihat Contoh Format', id: '__musikai_help__' }]
                                : [{ text: '🔁 Coba Random Lagi', id: '__musikai_random__' }]
                );
        }
}

// ─── Button callback handler (dipanggil dari message.js sebelum switch-case) ──
async function handleMusicAICallbacks({
        hisoka, m,
        pendingMusikaiCache,
        generateWAMessageFromContent,
        sendAudioWithButtons,
        sendConfirmWithButtons,
        logCommand,
        logError,
        tolak,
}) {
        const txt = typeof m.text === 'string' ? m.text : null;
        if (txt === null) return false;

        const _generateMusik = _makeGenerateMusik({ hisoka, m, pendingMusikaiCache, sendAudioWithButtons, logCommand });
        const _showGenreSelect = _makeShowGenreSelect({ hisoka, m, generateWAMessageFromContent });

        // 🤖 Random: tampilkan pilihan Bahasa dulu
        if (txt === '__musikai_random__') {
                const langMsg = generateWAMessageFromContent(
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
                                                                        `╭──『 🤖 *AI RANDOM MUSIK* 』\n` +
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
                                                                                                        id: '__musikai_rlang__id',
                                                                                                },
                                                                                                {
                                                                                                        header: '🇯🇵 ── Musik Jepang ─────────────',
                                                                                                        title: '🇯🇵 Jepang',
                                                                                                        description: 'City Pop, J-Pop, Anime OST, J-Folk — lirik bahasa Jepang',
                                                                                                        id: '__musikai_rlang__jp',
                                                                                                },
                                                                                                {
                                                                                                        header: '🇬🇧 ── Musik English ───────────',
                                                                                                        title: '🇬🇧 English',
                                                                                                        description: 'Indie Pop, R&B, Folk, Dream Pop — lyrics in English',
                                                                                                        id: '__musikai_rlang__en',
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
                await hisoka.relayMessage(langMsg.key.remoteJid, langMsg.message, { messageId: langMsg.key.id });
                return true;
        }

        // 🌏 Pilih bahasa → tampilkan Vokal / Instrumental
        if (/^__musikai_rlang__(id|jp|en)$/.test(txt)) {
                const lang = txt.replace('__musikai_rlang__', '');
                const langLabel = lang === 'jp' ? '🇯🇵 Jepang' : lang === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                const { _GENRES, _GENRES_JP, _GENRES_EN } = require(path.resolve('./scrape/music/chatmusic.cjs'));
                const pool = lang === 'jp' ? _GENRES_JP : lang === 'en' ? _GENRES_EN : _GENRES;
                const sampleGenre = pool[Math.floor(Math.random() * pool.length)];
                const modeMsg = generateWAMessageFromContent(
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
                                                                        `╭──『 ${langLabel} *MUSIK AI* 』\n` +
                                                                        `│\n` +
                                                                        `│ AI acak dari pool genre:\n` +
                                                                        `│ contoh: *${sampleGenre}*, dll\n` +
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
                                                                                                        header: '🎤 ─── Dengan Vokal ───────────',
                                                                                                        title: '🎤 Vokal',
                                                                                                        description: `Lirik ${langLabel} — AI pilih genre & tulis lirik otomatis`,
                                                                                                        id: `__musikai_rlang__${lang}__vocal__`,
                                                                                                },
                                                                                                {
                                                                                                        header: '🎹 ─── Instrumental ──────────',
                                                                                                        title: '🎹 Instrumental',
                                                                                                        description: `Musik tanpa vokal gaya ${langLabel}`,
                                                                                                        id: `__musikai_rlang__${lang}__instrumental__`,
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
                await hisoka.relayMessage(modeMsg.key.remoteJid, modeMsg.message, { messageId: modeMsg.key.id });
                return true;
        }

        // 🎤/🎹 Generate AI random dengan bahasa + mode terpilih
        if (/^__musikai_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(txt)) {
                const match = txt.match(/^__musikai_rlang__(id|jp|en)__(vocal|instrumental)__$/);
                const lang = match[1];
                const forceMode = match[2];
                const langLabel = lang === 'jp' ? '🇯🇵 Jepang' : lang === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                const modeLabel = forceMode === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                try {
                        const _chatmusicPath = path.resolve('./scrape/music/chatmusic.cjs');
                        delete require.cache[_chatmusicPath];
                        const { ChatMusicAPI, _GENRES, _GENRES_JP, _GENRES_EN } = require(_chatmusicPath);
                        const api = new ChatMusicAPI();
                        const pool = lang === 'jp' ? _GENRES_JP : lang === 'en' ? _GENRES_EN : _GENRES;
                        const randomGenre = pool[Math.floor(Math.random() * pool.length)];

                        const aiLoadMsg = await hisoka.sendMessage(m.from, {
                                text: `🤖 *AI meracik lagu ${langLabel} ${modeLabel}...*\n│ 🎲 Genre: *${randomGenre}*\n│ ✍️ ${forceMode === 'vocal' ? 'Menulis lirik' : 'Menyusun komposisi instrumental'}\n│ ⏳ Tunggu ~10-15 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset(forceMode, lang);

                        if (aiLoadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik(preset);
                        console.log(`\x1b[35m[MusicAI Random]\x1b[0m ✅ lang=${lang} mode=${forceMode} genre="${preset.musicStyle}"`);
                } catch (err) {
                        console.error(`\x1b[31m[MusicAI ${langLabel} ${modeLabel}] Error:\x1b[39m`, err.message);
                        logError(err, 'callback:musikai_random_mode');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await sendConfirmWithButtons(hisoka, m,
                                `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                [
                                        { text: '🔁 Coba Lagi', id: txt },
                                        { text: '↩️ Ganti Bahasa', id: '__musikai_random__' },
                                ],
                                { quoteBot: true }
                        );
                }
                return true;
        }

        // Legacy fallback: __musikai_random__vocal__ / __musikai_random__instrumental__
        if (txt === '__musikai_random__vocal__' || txt === '__musikai_random__instrumental__') {
                const forceMode = txt === '__musikai_random__vocal__' ? 'vocal' : 'instrumental';
                const modeLabel = forceMode === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                try {
                        const _chatmusicPath = path.resolve('./scrape/music/chatmusic.cjs');
                        delete require.cache[_chatmusicPath];
                        const { ChatMusicAPI, _GENRES } = require(_chatmusicPath);
                        const api = new ChatMusicAPI();
                        const randomGenre = _GENRES[Math.floor(Math.random() * _GENRES.length)];

                        const aiLoadMsg = await hisoka.sendMessage(m.from, {
                                text: `🤖 *AI meracik lagu 🇮🇩 Indonesia ${modeLabel}...*\n│ 🎲 Genre: *${randomGenre}*\n│ ✍️ ${forceMode === 'vocal' ? 'Menulis lirik lengkap' : 'Menyusun komposisi instrumental'}\n│ ⏳ Tunggu ~10-15 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset(forceMode, 'id');

                        if (aiLoadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik(preset);
                } catch (err) {
                        console.error(`\x1b[31m[MusicAI Random ${modeLabel}] Error:\x1b[39m`, err.message);
                        logError(err, 'callback:musikai_random_mode');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await sendConfirmWithButtons(hisoka, m,
                                `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                [
                                        { text: '🔁 Coba Lagi', id: txt },
                                        { text: '↩️ Ganti Bahasa', id: '__musikai_random__' },
                                ],
                                { quoteBot: true }
                        );
                }
                return true;
        }

        // 🎨 Pilih Genre Manual: tampilkan daftar genre
        if (txt === '__musikai_pickgenre__') {
                await _showGenreSelect();
                return true;
        }

        // Callback: user pilih genre dari single_select
        if (txt.startsWith('__musikai_genre__')) {
                const selectedGenre = txt.replace('__musikai_genre__', '').trim();
                try {
                        const _chatmusicPath2 = path.resolve('./scrape/music/chatmusic.cjs');
                        delete require.cache[_chatmusicPath2];
                        const { ChatMusicAPI } = require(_chatmusicPath2);
                        const api = new ChatMusicAPI();

                        const aiLoadMsg = await hisoka.sendMessage(m.from, {
                                text: `✍️ *AI sedang menulis lirik...*\n│ Genre : *${selectedGenre}*\n│ ⏳ Tunggu ~5 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset();
                        preset.musicStyle = selectedGenre;
                        preset.prompt = `${selectedGenre} indonesia, ${preset.prompt?.split(',').slice(1).join(',') || ''}`.trim();

                        if (aiLoadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik(preset);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI] Error:\x1b[39m', err.message);
                        logError(err, 'callback:musikai_genre');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await sendConfirmWithButtons(hisoka, m,
                                `❌ *Gagal generate musik*\n\n_${err.message}_`,
                                [{ text: '🔁 Coba Random Lagi', id: '__musikai_random__' }],
                                { quoteBot: true }
                        );
                }
                return true;
        }

        // Callback: user pilih variasi untuk diputar (format mp3 / vn)
        if (txt.startsWith('__musikai_play__')) {
                const raw = txt.replace('__musikai_play__', '');
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
                const cached = pendingMusikaiCache.get(key);
                if (!cached) {
                        await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                        await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang dengan *.musikai* atau tekan *Random Lagi*.`);
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

        // Callback: user pilih model AI → generate ulang dengan model berbeda
        if (txt.startsWith('__musikai_model__')) {
                const raw = txt.replace('__musikai_model__', '');
                const lastDbl = raw.lastIndexOf('__');
                const key = raw.substring(0, lastDbl);
                const modelId = parseInt(raw.substring(lastDbl + 2), 10);
                const cached = pendingMusikaiCache.get(key);
                if (!cached) {
                        await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                        await tolak(hisoka, m, `⏰ *Cache expired.* Silakan generate ulang dengan *.musikai*`);
                        return true;
                }
                const { MODELS: MusicModels } = require(path.resolve('./scrape/music/chatmusic.cjs'));
                const modelVer = MusicModels.find(md => md.id === modelId)?.version || `id:${modelId}`;
                await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                await _generateMusik({ ...cached.params, modelId });
                return true;
        }

        if (txt === '__musikai_help__') {
                const pfx = m.prefix || '.';
                await sendConfirmWithButtons(hisoka, m,
                        `╭──『 📖 *CARA PAKAI MUSIK AI* 』\n` +
                        `│\n` +
                        `│ *Format:*\n` +
                        `│ ${pfx}musikai [judul] | [lirik]\n` +
                        `│ ${pfx}musikai [judul] | [lirik] | [genre]\n` +
                        `│\n` +
                        `│ *Contoh:*\n` +
                        `│ ${pfx}musikai Hujan Malam | Hujan turun\n` +
                        `│   deras malam ini | sad pop\n` +
                        `│\n` +
                        `│ *Kalau gak ada lirik* (instrumental):\n` +
                        `│ ${pfx}musikai Senja Sunyi | | lofi\n` +
                        `│\n` +
                        `│ *Genre contoh:*\n` +
                        `│ pop, rock, jazz, rnb, lofi, acoustic,\n` +
                        `│ ballad, indie, dance, folk, soul, funk\n` +
                        `│\n` +
                        `│ Atau langsung tekan tombol random! ↓\n` +
                        `╰──────────────────────────────`,
                        [
                                { text: '🎲 Generate Random Sekarang', id: '__musikai_random__' },
                                { text: '↩️ Kembali ke Menu', id: '__musikai_menu__' },
                        ],
                        { quoteBot: true }
                );
                return true;
        }

        if (txt === '__musikai_menu__') {
                const pfx = m.prefix || '.';
                await sendConfirmWithButtons(hisoka, m,
                        `╭──『 🎵 *MUSIK AI* 』\n` +
                        `│\n` +
                        `│ Generate lagu original pakai AI.\n` +
                        `│ Hasil: *2 variasi audio* + cover art.\n` +
                        `│\n` +
                        `│ Tekan *Random* untuk generate langsung,\n` +
                        `│ atau ketik manual:\n` +
                        `│ _${pfx}musikai judul | lirik | genre_\n` +
                        `│\n` +
                        `│ ✨ Tiap random = kombinasi unik!\n` +
                        `╰──────────────────────────────`,
                        [
                                { text: '🎲 Generate Random', id: '__musikai_random__' },
                                { text: '📖 Cara Pakai Custom', id: '__musikai_help__' },
                        ],
                        { quoteBot: true }
                );
                return true;
        }

        return false;
}

module.exports = { handleMusicAICallbacks, handleMusikaiCmd };
