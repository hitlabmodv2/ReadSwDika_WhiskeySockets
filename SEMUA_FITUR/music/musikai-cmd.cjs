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
 *  musikai-cmd.cjs — Command handler musikai (AI musik generator)
 * ───────────────────────────────
 */
'use strict';

const path = require('path');

// ─── Factory: _generateMusik ──────────────────────────────────────────────────
function _makeGenerateMusik({ hisoka, m, logCommand }) {
        return async function _generateMusik(params) {
                const { ChatMusicAPI, formatDuration: fmtDur } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
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

                        logCommand(m, hisoka, 'musikai');
                } catch (err) {
                        if (loadingMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                        }
                        throw err;
                }
        };
}

// ─── Command handler: .musikai / .aimusik ─────────────────────────────────────
async function handleMusikaiCmd({
        hisoka, m, query,
        tolak, logCommand, logError,
        sendConfirmWithButtons,
        pendingMusikaiCache, generateWAMessageFromContent, sendAudioWithButtons,
}) {
        const _generateMusik = _makeGenerateMusik({ hisoka, m, logCommand });

        const pfx = m.prefix || '.';
        const input = (query || '').trim();

        if (!input) {
                const menuTxt =
                        `╭──『 🎵 *MUSIK AI* 』\n` +
                        `│\n` +
                        `│ Generate lagu original pakai AI.\n` +
                        `│ Hasil: *2 variasi audio* langsung dikirim.\n` +
                        `│\n` +
                        `│ *Cara pakai:*\n` +
                        `│ • _${pfx}musikai hujan di kota_ — tema bebas\n` +
                        `│ • _${pfx}musikai random_ — full random\n` +
                        `│ • _${pfx}musikai judul | lirik | genre_ — manual\n` +
                        `│\n` +
                        `│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
                        `╰──────────────────────────────`;
                await hisoka.sendMessage(m.from, { text: menuTxt }, { quoted: m }).catch(() => {});
                return;
        }

        try {
                if (input.toLowerCase() === 'random') {
                        // Langsung generate random — acak bahasa, mode, genre otomatis
                        const { ChatMusicAPI, _GENRES, _GENRES_JP, _GENRES_EN } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
                        const api = new ChatMusicAPI();
                        await api.login();
                        const langs = ['id', 'id', 'id', 'jp', 'en']; // bobot lebih banyak id
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

                        await _generateMusik(preset);
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

                        const { ChatMusicAPI } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
                        const api = new ChatMusicAPI();
                        await api.login();

                        let preset;
                        try {
                                preset = await Promise.race([
                                        api.aiThemePreset(tema, 'vocal'),
                                        new Promise((_, rej) => setTimeout(() => rej(new Error('Gemini timeout')), 20000)),
                                ]);
                        } catch (_geminiErr) {
                                const rnd = api.getRandomPreset();
                                preset = { ...rnd, title: tema.slice(0, 80), genreLabel: rnd.musicStyle };
                        }

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
                        ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n│\n│ API mendeteksi *kata sensitif* dalam lirik.\n│\n│ Hindari kata terkait narkoba, SARA,\n│ kekerasan, atau konten dewasa.\n│\n│ Coba ganti lirikmu & kirim ulang.\n╰──────────────────────────────`
                        : `╭──『 ❌ *GAGAL GENERATE* 』\n│\n│ ${error.message}\n│\n│ Coba: _${m.prefix || '.'}musikai random_\n╰──────────────────────────────`;
                await hisoka.sendMessage(m.from, { text: errMsg }, { quoted: m }).catch(() => {});
        }
}

// ─── Callback handler (dipanggil dari message.js) ─────────────────────────────
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

        const _generateMusik = _makeGenerateMusik({ hisoka, m, logCommand });

        // Random: langsung generate tanpa picker
        if (txt === '__musikai_random__' ||
            txt === '__musikai_random__vocal__' ||
            txt === '__musikai_random__instrumental__' ||
            /^__musikai_rlang__(id|jp|en)$/.test(txt) ||
            /^__musikai_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(txt)) {

                try {
                        const { ChatMusicAPI, _GENRES, _GENRES_JP, _GENRES_EN } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
                        const api = new ChatMusicAPI();
                        await api.login();

                        // Deteksi lang & mode dari txt kalau ada
                        const langMatch = txt.match(/__(id|jp|en)/);
                        const modeMatch = txt.match(/__(vocal|instrumental)__/);
                        const lang = langMatch ? langMatch[1] : 'id';
                        const mode = modeMatch ? modeMatch[1] : (Math.random() > 0.2 ? 'vocal' : 'instrumental');

                        const pool = lang === 'jp' ? _GENRES_JP : lang === 'en' ? _GENRES_EN : _GENRES;
                        const randomGenre = pool[Math.floor(Math.random() * pool.length)];

                        const loadMsg = await hisoka.sendMessage(m.from, {
                                text: `🤖 *AI meracik lagu random...*\n│ 🎲 Genre: *${randomGenre}*\n│ ⏳ Tunggu ~10-15 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset(mode, lang);

                        if (loadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik(preset);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI Random]\x1b[0m', err.message);
                        logError(err, 'callback:musikai_random');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await hisoka.sendMessage(m.from, {
                                text: `❌ *Gagal generate musik*\n\n_${err.message}_\n\nCoba ketik: _.musikai random_`
                        }, { quoted: m }).catch(() => {});
                }
                return true;
        }

        // Genre callback: generate langsung dengan genre yang dipilih
        if (txt.startsWith('__musikai_genre__')) {
                const selectedGenre = txt.replace('__musikai_genre__', '').trim();
                try {
                        const { ChatMusicAPI } = require(path.resolve('./SEMUA_FITUR/music/chatmusic.cjs'));
                        const api = new ChatMusicAPI();

                        const loadMsg = await hisoka.sendMessage(m.from, {
                                text: `✍️ *AI sedang menulis lirik...*\n│ Genre : *${selectedGenre}*\n│ ⏳ Tunggu ~5 detik...`
                        }, { quoted: m }).catch(() => null);

                        const preset = await api.aiRandomPreset();
                        preset.musicStyle = selectedGenre;
                        preset.prompt = `${selectedGenre} indonesia, ${preset.prompt?.split(',').slice(1).join(',') || ''}`.trim();

                        if (loadMsg?.key) {
                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                        }

                        await _generateMusik(preset);
                } catch (err) {
                        console.error('\x1b[31m[MusicAI Genre]\x1b[0m', err.message);
                        logError(err, 'callback:musikai_genre');
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                        await hisoka.sendMessage(m.from, {
                                text: `❌ *Gagal generate musik*\n\n_${err.message}_`
                        }, { quoted: m }).catch(() => {});
                }
                return true;
        }

        // Play audio dari cache
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
                        await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang dengan *.musikai random*`);
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
                await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                await _generateMusik({ ...cached.params, modelId });
                return true;
        }

        // Menu/help callbacks — plain text saja
        if (txt === '__musikai_menu__' || txt === '__musikai_help__' || txt === '__musikai_pickgenre__') {
                const pfx = m.prefix || '.';
                await hisoka.sendMessage(m.from, {
                        text:
                                `╭──『 🎵 *MUSIK AI* 』\n` +
                                `│\n` +
                                `│ *Cara pakai:*\n` +
                                `│ • _${pfx}musikai hujan di kota_ — tema bebas\n` +
                                `│ • _${pfx}musikai random_ — full random\n` +
                                `│ • _${pfx}musikai judul | lirik | genre_ — manual\n` +
                                `╰──────────────────────────────`,
                }, { quoted: m }).catch(() => {});
                return true;
        }

        return false;
}

module.exports = { handleMusicAICallbacks, handleMusikaiCmd };
