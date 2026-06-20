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
 *  infomusik.cjs — Music info command
 *  Perintah .infomusik untuk tampilkan info detail lagu dari Spotify/YouTube
 * ───────────────────────────────
 */
'use strict';

/**
 * handleInfomusik
 * Handler untuk command: infomusik, infolirik, musicinfo, cekmusik
 */
async function handleInfomusik({ hisoka, m, tolak, logCommand, getMediaTypeFromMessage, downloadMediaMessage, Button, loadConfig, _require, path }) {
        const pfx = m.prefix || '.';
        const audioTypes = ['audioMessage', 'documentMessage', 'videoMessage'];
        const isCurrentAudio = m.isMedia && audioTypes.includes(getMediaTypeFromMessage(m));
        const isQuotedAudio  = m.isQuoted && audioTypes.includes(getMediaTypeFromMessage(m.quoted));

        if (!isCurrentAudio && !isQuotedAudio) {
                await tolak(hisoka, m,
                        `╭═══〔 🎵 *INFO MUSIK* 〕═══╮\n` +
                        `│\n` +
                        `│ Analisis lengkap audio otomatis:\n` +
                        `│ genre, mood, instrumen & lirik!\n` +
                        `│\n` +
                        `│ *Cara pakai:*\n` +
                        `│ • Kirim audio/video + *${pfx}infomusik*\n` +
                        `│ • Reply audio/video/VN → *${pfx}infomusik*\n` +
                        `│\n` +
                        `│ Mendukung: voice note, MP3,\n` +
                        `│ video MP4, file audio, dll.\n` +
                        `│\n` +
                        `╰══════════════════════════════╯`
                );
                return;
        }

        const _isVideo = (msg) => getMediaTypeFromMessage(msg) === 'videoMessage';
        const targetIsVideo = isQuotedAudio ? _isVideo(m.quoted) : _isVideo(m);

        await hisoka.sendMessage(m.from, { react: { text: targetIsVideo ? '🎬' : '🎵', key: m.key } });
        const loadingMsg = await tolak(hisoka, m, targetIsVideo ? '🎬 Mengekstrak & menganalisis audio dari video...' : '🎵 Menganalisis audio, harap tunggu...');

        const targetMsg  = isQuotedAudio ? m.quoted : m;
        const targetMime = targetMsg?.content?.mimetype || targetMsg?.msg?.mimetype || (targetIsVideo ? 'video/mp4' : 'audio/ogg');

        const audioBuffer = await downloadMediaMessage(
                { ...targetMsg, message: targetMsg.raw },
                'buffer',
                {},
                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
        );

        if (!audioBuffer || audioBuffer.length === 0) {
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await m.reply({ edit: loadingMsg.key, text: '❌ Gagal download audio.' });
                return;
        }

        const { analyzeAudio } = _require(path.resolve('./src/scrape/music/whatgenre.cjs'));
        const result = await analyzeAudio(audioBuffer, targetMime);

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        await m.reply({ edit: loadingMsg.key, text: '✅ Analisis selesai!' });

        const splitMarker = /📜 \*LIRIK/;
        const splitIdx    = result.search(splitMarker);
        const partInfo    = splitIdx > 0 ? result.slice(0, splitIdx).trim() : result;
        const partLirik   = splitIdx > 0 ? result.slice(splitIdx).trim()  : '';

        const _cleanCopy = (raw) => raw
                .split('\n')
                .filter(l => !/^[\s\u256d\u256e\u2570\u256f\u2550\u2502\u3014\u3015\u2500\u2508\u254c\s]*$/.test(l))
                .filter(l => !/[\u3014\u3015]/.test(l))
                .map(l => l.replace(/^\s*\u2502\s?/, '').trimEnd())
                .join('\n')
                .replace(/\n{3,}/g, '\n\n')
                .trim();

        const copyLirik = _cleanCopy(partLirik);
        const _genreMatch = partInfo.match(/🎼[^:]+:\s*(.+)/);
        const copyGenre = _genreMatch ? _genreMatch[1].trim() : _cleanCopy(partInfo);

        const _replyCtx = m.key?.id ? {
                stanzaId: m.key.id,
                participant: m.sender || m.key?.participant || '',
                quotedMessage: m.message || {},
        } : {};

        let buttonSent = false;
        try {
                const btn = new Button()
                        .setBody(result)
                        .setFooter((() => { try { return loadConfig()?.botReply?.footer || '🎵 Powered by Gemini AI'; } catch (_) { return '🎵 Powered by Gemini AI'; } })())
                        .setContextInfo(_replyCtx)
                        .addCopy('🎼 Salin Genre', copyGenre, 'copy_infomusik_genre');
                if (copyLirik) {
                        btn.addCopy('📜 Salin Lirik', copyLirik, 'copy_infomusik_lirik');
                }
                await btn.run(m.from, hisoka);
                buttonSent = true;
        } catch (_) {}

        if (!buttonSent) {
                await m.reply(result);
        }

        logCommand(m, hisoka, 'infomusik');
}

module.exports = { handleInfomusik };
