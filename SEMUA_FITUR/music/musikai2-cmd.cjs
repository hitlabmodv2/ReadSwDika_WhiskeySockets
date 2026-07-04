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
 *  musikai2-cmd.cjs — Command handler musikai2 (AI musik generator v2)
 * ───────────────────────────────
 */
'use strict';

const path = require('path');

// ─── Factory: _generateMusik2 ─────────────────────────────────────────────────
function _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, logCommand }) {
        return async function _generateMusik2(params) {
                const { ChatMusicAPI2, formatDuration2: fmtDur2 } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));
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

                        if (pendingMusikai2Cache) {
                                const cacheKey = `${m.from}_${Date.now()}`;
                                pendingMusikai2Cache.set(cacheKey, { results, params, ts: Date.now() });
                                setTimeout(() => pendingMusikai2Cache.delete(cacheKey), 10 * 60 * 1000);
                        }

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
                                `│ 🎧 *${results.length} Variasi:*\n` +
                                `${variasiLines}\n` +
                                `╰──────────────────────────────`;

                        await hisoka.sendMessage(m.from, { text: bodyTxt }, { quoted: m }).catch(() => {});

                        // Kirim semua audio langsung
                        for (const r of results) {
                                if (r.audioBuf) {
                                        const trackTitle = (r.track?.title || params.title || 'musik').slice(0, 50);
                                        await hisoka.sendMessage(m.from, {
                                                audio: r.audioBuf,
                                                mimetype: 'audio/mpeg',
                                                ptt: false,
                                                fileName: `${trackTitle}_v${r.index}.mp3`,
                                        }).catch(() => {});
                                }
                        }

                        logCommand(m, hisoka, m.command || 'musikai2');
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
        const _generateMusik2 = _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, logCommand });

        const pfx = m.prefix || '.';
        const input = (query || '').trim();

        if (!input) {
                const menuTxt =
                        `╭──『 🎵 *MUSIK AI 2* 』\n` +
                        `│\n` +
                        `│ Generate lagu original pakai AI (backend 2).\n` +
                        `│ Hasil: *2 variasi audio* langsung dikirim.\n` +
                        `│\n` +
                        `│ *Cara pakai:*\n` +
                        `│ • _${pfx}musikai2 hujan di kota_ — tema bebas\n` +
                        `│ • _${pfx}musikai2 random_ — full random\n` +
                        `│ • _${pfx}musikai2 judul | lirik | genre_ — manual\n` +
                        `│\n` +
                        `│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
                        `╰──────────────────────────────`;
                await hisoka.sendMessage(m.from, { text: menuTxt }, { quoted: m }).catch(() => {});
                return;
        }

        try {
                if (input.toLowerCase() === 'random') {
                        // Langsung generate random — acak bahasa, mode, genre otomatis
                        const { ChatMusicAPI2, _GENRES, _GENRES_JP, _GENRES_EN } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));
                        const api = new ChatMusicAPI2();
                        await api.login();
                        const langs = ['id', 'id', 'id', 'jp', 'en'];
                        const lang = langs[Math.floor(Math.random() * langs.length)];
                        const pool = lang === 'jp' ? _GENRES_JP : lang === 'en' ? _GENRES_EN : _GENRES;
                        const randomGenre = pool[Math.floor(Math.random() * pool.length)];
                        const mode = Math.random() > 0.2 ? 'vocal' : 'instrumental';

                        const loadMsg = await hisoka.sendMessage(m.from,
                                { text: `🤖 *AI meracik lagu random...*\n│ 🎲 Genre: *${randomGenre}*\n│ ⏳ Tunggu ~10-15 detik...` },
                                { quoted: m }
                        ).catch(() => null);

                        const preset = await api.aiRandomPreset(mode, lang);

                        if (loadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik2(preset);
                        return;
                }

                const { ChatMusicAPI2 } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));

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

                        let preset;
                        try {
                                preset = await Promise.race([
                                        api.aiThemePreset(tema, 'vocal'),
                                        new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 20000)),
                                ]);
                        } catch (_geminiErr) {
                                const { ChatMusicAPI: _ChatMusicAPIv1 } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
                                const rnd = new _ChatMusicAPIv1().getRandomPreset();
                                preset = { ...rnd, title: tema.slice(0, 80), genreLabel: rnd.musicStyle };
                        }

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
                        ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n│\n│ API mendeteksi *kata sensitif* dalam lirik.\n│\n│ Hindari kata terkait narkoba, SARA,\n│ kekerasan, atau konten dewasa.\n│\n│ Coba ganti lirikmu & kirim ulang.\n╰──────────────────────────────`
                        : `╭──『 ❌ *GAGAL GENERATE* 』\n│\n│ ${error.message}\n│\n│ Coba: _${m.prefix || '.'}musikai2 random_\n╰──────────────────────────────`;
                await hisoka.sendMessage(m.from, { text: errMsg }, { quoted: m }).catch(() => {});
        }
}

// ─── Callback handler (dipanggil dari message.js) ─────────────────────────────
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

        const _generateMusik2 = _makeGenerateMusik2({ hisoka, m, pendingMusikai2Cache, logCommand });

        // Random / bahasa / mode callbacks — semuanya langsung generate tanpa picker
        if (txt === '__musikai2_random__' ||
            /^__musikai2_rlang__(id|jp|en)$/.test(txt) ||
            /^__musikai2_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(txt) ||
            /^__musikai2_rgenre__(id|jp|en)__(vocal|instrumental)__/.test(txt)) {

                try {
                        const { ChatMusicAPI2, _GENRES, _GENRES_JP, _GENRES_EN } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));
                        const api = new ChatMusicAPI2();
                        await api.login();

                        const langMatch = txt.match(/__(id|jp|en)/);
                        const modeMatch = txt.match(/__(vocal|instrumental)__/);
                        const genreMatch = txt.match(/^__musikai2_rgenre__(?:id|jp|en)__(?:vocal|instrumental)__(.+)$/);

                        const lang = langMatch ? langMatch[1] : 'id';
                        const mode = modeMatch ? modeMatch[1] : (Math.random() > 0.2 ? 'vocal' : 'instrumental');

                        const pool = lang === 'jp' ? _GENRES_JP : lang === 'en' ? _GENRES_EN : _GENRES;
                        const randomGenre = genreMatch && genreMatch[1] !== 'AI_RANDOM'
                                ? genreMatch[1]
                                : pool[Math.floor(Math.random() * pool.length)];

                        const loadMsg = await hisoka.sendMessage(m.from, {
                                text: `🤖 *AI meracik lagu random...*\n│ 🎲 Genre: *${randomGenre}*\n│ ⏳ Tunggu ~10-15 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset(mode, lang);

                        if (genreMatch && genreMatch[1] !== 'AI_RANDOM') {
                                preset.musicStyle = randomGenre;
                                preset.genreLabel = randomGenre;
                        }

                        if (loadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik2(preset);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI2 Random]\x1b[0m', err.message);
                        logError(err, 'callback:musikai2_random');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await hisoka.sendMessage(m.from, {
                                text: `❌ *Gagal generate musik*\n\n_${err.message}_\n\nCoba ketik: _.musikai2 random_`
                        }, { quoted: m }).catch(() => {});
                }
                return true;
        }

        // Genre callback — generate langsung dengan genre terpilih
        if (txt.startsWith('__musikai2_genre__') || txt.startsWith('__musikai2_pickgenre__')) {
                if (txt === '__musikai2_pickgenre__') {
                        // Tidak ada list, langsung generate random
                        try {
                                const { ChatMusicAPI2 } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));
                                const api = new ChatMusicAPI2();
                                await api.login();
                                const loadMsg = await hisoka.sendMessage(m.from, {
                                        text: `🤖 *AI meracik lagu random...*\n│ ⏳ Tunggu ~10-15 detik...`
                                }, { quoted: m }).catch(() => null);
                                const preset = await api.aiRandomPreset('vocal', 'id');
                                if (loadMsg?.key) {
                                        try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                }
                                await _generateMusik2(preset);
                        } catch (err) {
                                await hisoka.sendMessage(m.from, { text: `❌ ${err.message}` }, { quoted: m }).catch(() => {});
                        }
                        return true;
                }

                const selectedGenre = txt.replace('__musikai2_genre__', '').trim();
                try {
                        const { ChatMusicAPI2 } = require(path.resolve('./SEMUA_FITUR/music/chatmusic2.cjs'));
                        const api = new ChatMusicAPI2();

                        const loadMsg = await hisoka.sendMessage(m.from, {
                                text: `✍️ *AI sedang menulis lirik...*\n│ Genre : *${selectedGenre}*\n│ ⏳ Tunggu ~5 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset();
                        preset.musicStyle = selectedGenre;
                        preset.genreLabel = selectedGenre;
                        preset.prompt = `${selectedGenre} indonesia, ${preset.prompt?.split(',').slice(1).join(',') || ''}`.trim();

                        if (loadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik2(preset);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI2 Genre]\x1b[0m', err.message);
                        logError(err, 'callback:musikai2_genre');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await hisoka.sendMessage(m.from, {
                                text: `❌ *Gagal generate musik*\n\n_${err.message}_`
                        }, { quoted: m }).catch(() => {});
                }
                return true;
        }

        // Play audio dari cache
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
                        await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang: _.musikai2 random_`);
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

        // Model change
        if (txt.startsWith('__musikai2_model__')) {
                const raw = txt.replace('__musikai2_model__', '');
                const lastDbl = raw.lastIndexOf('__');
                const key = raw.substring(0, lastDbl);
                const modelId = parseInt(raw.substring(lastDbl + 2), 10);
                const cached = pendingMusikai2Cache.get(key);
                if (!cached) {
                        await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                        await tolak(hisoka, m, `⏰ *Cache expired.* Silakan generate ulang: _.musikai2_`);
                        return true;
                }
                await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                await _generateMusik2({ ...cached.params, modelId });
                return true;
        }

        // Help/menu callbacks — plain text saja
        if (txt === '__musikai2_help__' || txt === '__musikai2_menu__') {
                const pfx = m.prefix || '.';
                await hisoka.sendMessage(m.from, {
                        text:
                                `╭──『 🎵 *MUSIK AI 2* 』\n` +
                                `│\n` +
                                `│ *Cara pakai:*\n` +
                                `│ • _${pfx}musikai2 hujan di kota_ — tema bebas\n` +
                                `│ • _${pfx}musikai2 random_ — full random\n` +
                                `│ • _${pfx}musikai2 judul | lirik | genre_ — manual\n` +
                                `╰──────────────────────────────`,
                }, { quoted: m }).catch(() => {});
                return true;
        }

        return false;
}

module.exports = { handleMusicAI2Callbacks, handleMusikai2Cmd };
