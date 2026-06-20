'use strict';

const path = require('path');
const fs   = require('fs');
const { exec } = require('child_process');

/**
 * Handle pending play choice (user balas 1=MP3 atau 2=MP4).
 * Dipanggil dari message.js sebelum switch-case.
 * @returns {boolean} true jika pesan sudah diproses (return langsung)
 */
async function handlePlayChoice({
        hisoka, m,
        pendingPlayChoices,
        ensureYtdlp, parseYtdlpError,
        tolak, logCommand,
}) {
        if (!pendingPlayChoices.has(m.sender)) return false;

        const choice = (m.text || '').trim();
        if (choice !== '1' && choice !== '2') return false;

        const pending = pendingPlayChoices.get(m.sender);

        if (!pending.downloading) pending.downloading = new Set();
        if (pending.downloading.has(choice)) {
                await m.reply(`⏳ Sedang mengunduh *${choice === '1' ? 'Audio MP3' : 'Video MP4'}*... harap tunggu.`);
                return true;
        }

        pending.downloading.add(choice);

        if (pending.timeout) {
                clearTimeout(pending.timeout);
                pending.timeout = null;
        }

        // Jalankan async tanpa await supaya format lain bisa langsung diproses
        (async () => {
                try {
                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                        const loadingMsg = await tolak(hisoka, m, `⏳ Mengunduh ${choice === '1' ? 'audio MP3' : 'video MP4'}...`);

                        const ytdlpBin = await ensureYtdlp(hisoka, m);
                        const tmpId = Date.now();

                        if (choice === '1') {
                                const tmpFile     = path.join(process.cwd(), 'tmp', `play_${tmpId}.mp3`);
                                const tmpTemplate = path.join(process.cwd(), 'tmp', `play_${tmpId}.%(ext)s`);

                                await new Promise((resolve, reject) => {
                                        const cmd = `"${ytdlpBin}" --js-runtimes node --no-playlist -x --audio-format mp3 --audio-quality 5 -o "${tmpTemplate}" "${pending.url}"`;
                                        exec(cmd, { timeout: 120000 }, (err, stdout, stderr) => {
                                                if (err) return reject(new Error(parseYtdlpError(stderr, err.message)));
                                                resolve();
                                        });
                                });

                                const audioBuffer = fs.readFileSync(tmpFile);
                                await hisoka.sendMessage(m.from, {
                                        audio: audioBuffer,
                                        mimetype: 'audio/mpeg',
                                        fileName: `${pending.title.replace(/[^\w\s]/gi, '')}.mp3`,
                                        ptt: false,
                                }, { quoted: m });

                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await m.reply({ edit: loadingMsg.key, text: `✅ *Audio MP3 berhasil dikirim!*\n📌 ${pending.title}` });
                                try { fs.unlinkSync(tmpFile); } catch (_) {}

                        } else {
                                if (pending.seconds > 300) {
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await m.reply({ edit: loadingMsg.key, text: `❌ Durasi terlalu panjang untuk video! (${pending.duration})\nMaksimal 5 menit untuk MP4.\n\nGunakan pilihan *1* untuk Audio MP3.` });
                                        return;
                                }

                                const tmpFile     = path.join(process.cwd(), 'tmp', `play_${tmpId}.mp4`);
                                const tmpTemplate = path.join(process.cwd(), 'tmp', `play_${tmpId}.%(ext)s`);

                                await new Promise((resolve, reject) => {
                                        const cmd = `"${ytdlpBin}" --js-runtimes node --no-playlist -f "bestvideo[height<=360]+bestaudio/best[height<=360]" --merge-output-format mp4 --postprocessor-args "ffmpeg:-c:v libx264 -c:a aac -movflags +faststart -preset fast -crf 28" -o "${tmpTemplate}" "${pending.url}"`;
                                        exec(cmd, { timeout: 240000 }, (err, stdout, stderr) => {
                                                if (err) return reject(new Error(parseYtdlpError(stderr, err.message)));
                                                resolve();
                                        });
                                });

                                const videoBuffer = fs.readFileSync(tmpFile);
                                await hisoka.sendMessage(m.from, {
                                        video: videoBuffer,
                                        mimetype: 'video/mp4',
                                        caption: `🎬 *${pending.title}*`,
                                }, { quoted: m });

                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await m.reply({ edit: loadingMsg.key, text: `✅ *Video MP4 berhasil dikirim!*\n📌 ${pending.title}` });
                                try { fs.unlinkSync(tmpFile); } catch (_) {}
                        }

                        logCommand(m, hisoka, 'play');
                } catch (error) {
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                        await tolak(hisoka, m, `❌ Gagal mengunduh: ${error.message?.substring(0, 200)}`);
                } finally {
                        if (pendingPlayChoices.has(m.sender)) {
                                const p = pendingPlayChoices.get(m.sender);
                                if (p.downloading) p.downloading.delete(choice);
                                if (!p.downloading || p.downloading.size === 0) {
                                        if (p.timeout) clearTimeout(p.timeout);
                                        p.timeout = setTimeout(() => {
                                                pendingPlayChoices.delete(m.sender);
                                        }, 2 * 60 * 1000);
                                }
                        }
                }
        })();

        return true;
}

module.exports = { handlePlayChoice };
