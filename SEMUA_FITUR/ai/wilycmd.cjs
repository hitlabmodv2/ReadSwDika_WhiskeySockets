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
 *  wilycmd.cjs — WilyAI command handler
 *  Perintah utama AI chat WilyBot berbasis Gemini
 * ───────────────────────────────
 */
'use strict';

const WILY_VERBOSE_LOGS = process.env.WILY_VERBOSE_LOGS === 'true' || process.env.BOT_DEBUG_LOG === 'true';
const wilyLog = (...args) => { if (WILY_VERBOSE_LOGS) console.log(...args); };
const wilyError = (...args) => { if (WILY_VERBOSE_LOGS) console.error(...args); };


const _exec = require('child_process').exec;
const _util = require('util');
const _fs = require('fs');

function parseZipBuffer(buffer) {
    const result = { files: [], isPasswordProtected: false, error: null };
    try {
        const LOCAL_FILE_HEADER_SIG = 0x04034b50;
        const CENTRAL_DIR_SIG = 0x02014b50;
        const EOCD_SIG = 0x06054b50;

        let eocdOffset = -1;
        for (let i = buffer.length - 22; i >= 0; i--) {
            if (buffer.readUInt32LE(i) === EOCD_SIG) {
                eocdOffset = i;
                break;
            }
        }
        if (eocdOffset === -1) {
            result.error = 'Bukan file ZIP yang valid';
            return result;
        }

        const centralDirSize = buffer.readUInt32LE(eocdOffset + 12);
        const centralDirOffset = buffer.readUInt32LE(eocdOffset + 16);

        let pos = centralDirOffset;
        while (pos < centralDirOffset + centralDirSize && pos + 46 <= buffer.length) {
            if (buffer.readUInt32LE(pos) !== CENTRAL_DIR_SIG) break;
            const generalFlag = buffer.readUInt16LE(pos + 8);
            const isEncrypted = (generalFlag & 0x01) !== 0;
            if (isEncrypted) result.isPasswordProtected = true;
            const compressedSize = buffer.readUInt32LE(pos + 20);
            const uncompressedSize = buffer.readUInt32LE(pos + 24);
            const fileNameLen = buffer.readUInt16LE(pos + 28);
            const extraFieldLen = buffer.readUInt16LE(pos + 30);
            const commentLen = buffer.readUInt16LE(pos + 32);
            const fileName = buffer.slice(pos + 46, pos + 46 + fileNameLen).toString('utf8');
            const isDir = fileName.endsWith('/');
            if (!isDir) {
                const sizeKb = uncompressedSize > 0 ? (uncompressedSize / 1024).toFixed(1) : (compressedSize / 1024).toFixed(1);
                result.files.push({ name: fileName, size: parseFloat(sizeKb), encrypted: isEncrypted });
            }
            pos += 46 + fileNameLen + extraFieldLen + commentLen;
        }
    } catch (e) {
        result.error = 'Gagal parse ZIP: ' + e.message;
    }
    return result;
}

// ── PDF TEXT EXTRACTOR via pdftotext ──
async function extractPdfText(pdfBuffer) {
    const execAsync = _util.promisify(_exec);
    const tmpFile = `/tmp/wily_pdf_${Date.now()}.pdf`;
    try {
        _fs.writeFileSync(tmpFile, pdfBuffer);
        const { stdout } = await execAsync(`pdftotext "${tmpFile}" -`, { timeout: 15000 });
        return stdout.trim().substring(0, 4000);
    } catch (e) {
        throw new Error('Gagal baca PDF: ' + e.message);
    } finally {
        try { _fs.unlinkSync(tmpFile); } catch (_) {}
    }
}


async function handleWily({
        hisoka, m, query, tolak, logCommand, loadConfig, gemini,
        getUserName, getSessionKey, getHistory, addToHistory, clearHistory, buildHistoryMeta, wrapCurrentUserMessage,
        detectAndUpdateMemory,
        searchAndGetImages,
        buildWilyAICommandPrompt, buildWilyMediaUserPrompt,
        startTyping,
        getMediaTypeFromMessage, getQuotedMediaBuffer, getCachedQuotedMedia, getMediaInfo, rememberAIMedia,
        detectImageSearchQuery, extractImageCount,
        buildSmartImageWaitText, buildSmartAlbumCaptions, sendImageAlbum, buildSmartImageHistoryReply,
        processAIMediaAndSend,
}) {
        if (hisoka.isMainBot === false) return;
        const wilyAIConfig = loadConfig().wilyAI || {};
        if (wilyAIConfig.enabled === false) return;

        const userName = 'kamu';
        const now = new Date();
        const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
        const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
        const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
        const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

        const lowerQuery = (query || '').trim().toLowerCase();
        if (lowerQuery === 'reset' || lowerQuery === 'clear' || lowerQuery === 'hapus chat' || lowerQuery === 'mulai baru') {
                const sessKey = getSessionKey(m);
                const historyBeforeReset = getHistory(sessKey);

                if (historyBeforeReset.length > 0) {
                        try {
                                const cfg     = loadConfig();
                                const owners  = cfg.owners || [];
                                const isGroup = m.isGroup;
                                const nowStr  = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
                                const exportData = {
                                        sessionKey  : sessKey,
                                        exportedAt  : nowStr,
                                        triggeredBy : m.sender,
                                        chat        : isGroup ? m.from : 'private',
                                        totalMessages: historyBeforeReset.length,
                                        messages    : historyBeforeReset,
                                };
                                const jsonBuf  = Buffer.from(JSON.stringify(exportData, null, 2), 'utf-8');
                                const safeKey  = sessKey.replace(/[^a-z0-9_]/gi, '_').slice(0, 60);
                                const fileName = `history_${safeKey}_${Date.now()}.json`;
                                const caption  =
                                        `╭─「 📋 *BACKUP HISTORY AI* 」\n` +
                                        `│\n` +
                                        `├─ 🔑 *Session :* ${sessKey}\n` +
                                        `├─ 💬 *Chat    :* ${isGroup ? 'Group' : 'Private'}\n` +
                                        `├─ 📨 *Dari    :* ${m.pushName || m.sender}\n` +
                                        `├─ 🗂️ *Pesan   :* ${historyBeforeReset.length} entri\n` +
                                        `│\n` +
                                        `├─ ℹ️ Dikirim otomatis sebelum .wily reset\n` +
                                        `│\n` +
                                        `╰─ 🕐 ${nowStr}`;

                                for (const ownerNum of owners) {
                                        const ownerJid = `${ownerNum}@s.whatsapp.net`;
                                        try {
                                                await hisoka.sendMessage(ownerJid, {
                                                        document : jsonBuf,
                                                        fileName : fileName,
                                                        mimetype : 'application/json',
                                                        caption  : caption,
                                                });
                                        } catch (e) {
                                                console.error('[WilyReset] Gagal kirim backup ke', ownerNum, e.message);
                                        }
                                }
                        } catch (backupErr) {
                                console.error('[WilyReset] Backup error:', backupErr.message);
                        }
                }

                clearHistory(sessKey);
                await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
                await tolak(hisoka, m,
                        historyBeforeReset.length > 0
                        ? `🗑️ Memory percakapan dihapus ${userName}!\n\n📋 _Backup ${historyBeforeReset.length} pesan sudah dikirim ke owner._\n\nKita mulai dari awal ya 😊`
                        : `🗑️ Memory percakapan dihapus ${userName}! Kita mulai dari awal ya 😊`
                );
                logCommand(m, hisoka, 'wily');
                return;
        }

        // Typing indicator dinyalakan di sini (bukan cuma pas panggil Gemini) supaya akurat merefleksikan
        // bot sedang proses — termasuk saat download media, baca dokumen, dan cari gambar (semua bisa lama).
        // Tanpa ini, user lihat bot "diam" tanpa typing selama proses-proses tsb padahal bot lagi kerja.
        const stopTyping_cmd = startTyping(hisoka, m);
        try {

        let imageBuffer = null;
        let imageMime = 'image/jpeg';
        let hasMedia = false;
        let mediaLabel = '';
        let isDocumentMode = false;
        let documentContext = '';
        let quotedTextContext = '';

        const curType = getMediaTypeFromMessage(m);
        const qtType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

        const downloadQuotedMedia = async () => await getQuotedMediaBuffer(hisoka, m);

        if ((curType === 'imageMessage' || curType === 'stickerMessage') && m.isMedia) {
                try {
                        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                        imageBuffer = await m.downloadMedia();
                        if (imageBuffer && imageBuffer.length > 0) {
                                imageMime = curType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                hasMedia = true;
                                mediaLabel = curType === 'stickerMessage' ? 'sticker' : 'gambar';
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Media dari pesan: ${curType}, ${imageBuffer.length} bytes`);
                        }
                } catch (dlErr) {
                        wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal download media: ${dlErr.message}`);
                }
        } else if (curType === 'videoMessage' && m.isMedia) {
                try {
                        await hisoka.sendMessage(m.from, { react: { text: '🎬', key: m.key } });
                        imageBuffer = await m.downloadMedia();
                        if (imageBuffer && imageBuffer.length > 0) {
                                imageMime = 'video/mp4';
                                hasMedia = true;
                                mediaLabel = 'video';
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Video dari pesan: ${imageBuffer.length} bytes`);
                        }
                } catch (dlErr) {
                        wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal download video: ${dlErr.message}`);
                }
        } else if (curType === 'documentMessage' && m.isMedia) {
                await hisoka.sendMessage(m.from, { react: { text: '📄', key: m.key } });
                try {
                        const docBuffer = await m.downloadMedia();
                        const docMime = (
                                m.msg?.mimetype ||
                                m.message?.documentMessage?.mimetype ||
                                m.content?.mimetype ||
                                ''
                        ).toLowerCase();
                        const docFileName = (
                                m.msg?.fileName ||
                                m.message?.documentMessage?.fileName ||
                                m.content?.fileName ||
                                ''
                        ).toLowerCase();
                        const docExt = docFileName.split('.').pop() || '';
                        const docSizeKB = docBuffer ? (docBuffer.length / 1024).toFixed(1) : 0;
                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m Dokumen: mime="${docMime}" name="${docFileName}" ext="${docExt}" size=${docSizeKB}KB`);

                        const isZipMagic = docBuffer && docBuffer.length >= 4 &&
                                docBuffer[0] === 0x50 && docBuffer[1] === 0x4B &&
                                (docBuffer[2] === 0x03 || docBuffer[2] === 0x05 || docBuffer[2] === 0x07);
                        const isPdfMagic = docBuffer && docBuffer.length >= 4 &&
                                docBuffer[0] === 0x25 && docBuffer[1] === 0x50 &&
                                docBuffer[2] === 0x44 && docBuffer[3] === 0x46;
                        const isRarMagic = docBuffer && docBuffer.length >= 7 &&
                                docBuffer[0] === 0x52 && docBuffer[1] === 0x61 &&
                                docBuffer[2] === 0x72 && docBuffer[3] === 0x21;
                        const is7zMagic = docBuffer && docBuffer.length >= 6 &&
                                docBuffer[0] === 0x37 && docBuffer[1] === 0x7A &&
                                docBuffer[2] === 0xBC && docBuffer[3] === 0xAF;

                        const isZip = isZipMagic || docMime.includes('zip') ||
                                ['zip', 'apk', 'jar', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(docExt);
                        const isPdf = isPdfMagic || docMime.includes('pdf') || docExt === 'pdf';
                        const isRar = isRarMagic || docMime.includes('rar') || docExt === 'rar';
                        const is7z = is7zMagic || docExt === '7z' || docMime.includes('7z');
                        const isText = docMime.startsWith('text/') ||
                                ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'css', 'md', 'yaml', 'yml', 'ini', 'conf', 'log', 'sh', 'bat'].includes(docExt);
                        const isImage = docMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(docExt);

                        if (isZip && !isRar && !is7z) {
                                const zipResult = parseZipBuffer(docBuffer);
                                if (zipResult.error) {
                                        await tolak(hisoka, m, `❌ ${zipResult.error}`);
                                        return;
                                }
                                const isDocxLike = ['docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(docExt);
                                const isApk = docExt === 'apk';
                                const archiveLabel = isApk ? '📱 FILE APK' : isDocxLike ? `📝 FILE ${docExt.toUpperCase()}` : '📦 FILE ZIP';
                                const passwordNote = zipResult.isPasswordProtected
                                        ? `🔐 *Status:* *BERPASSWORD* (terenkripsi)`
                                        : `🔓 *Status:* *Tidak berpassword*`;
                                let zipText = `╭═══『 *${archiveLabel}* 』═══╮\n│\n`;
                                zipText += `│ 📁 *Total File:* ${zipResult.files.length} file\n`;
                                zipText += `│ ${passwordNote}\n│\n`;
                                if (!isDocxLike) {
                                        zipText += `│ *DAFTAR ISI:*\n`;
                                        const displayFiles = zipResult.files.slice(0, 30);
                                        for (const f of displayFiles) {
                                                const lockIcon = f.encrypted ? '🔐' : '📄';
                                                const sizeStr = f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} MB` : `${f.size} KB`;
                                                zipText += `│ ${lockIcon} ${f.name} _(${sizeStr})_\n`;
                                        }
                                        if (zipResult.files.length > 30) {
                                                zipText += `│ _(... dan ${zipResult.files.length - 30} file lainnya)_\n`;
                                        }
                                } else {
                                        zipText += `│ _(Format Office — gunakan .wily untuk baca isinya lebih lanjut)_\n`;
                                }
                                zipText += `│\n╰═══════════════════════╯`;
                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await tolak(hisoka, m, zipText);
                                logCommand(m, hisoka, 'wily');
                                return;
                        } else if (isRar) {
                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await tolak(hisoka, m, `╭═══『 *📦 FILE RAR* 』═══╮\n│\n│ ⚠️ Format RAR terdeteksi!\n│\n│ RAR adalah format arsip yang bisa\n│ berpassword atau tidak.\n│\n│ *Catatan:* Format RAR tidak bisa\n│ dibaca isinya langsung oleh bot.\n│ Coba extract dulu atau kirim\n│ sebagai file ZIP.\n│\n╰═══════════════════════╯`);
                                logCommand(m, hisoka, 'wily');
                                return;
                        } else if (is7z) {
                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await tolak(hisoka, m, `╭═══『 *📦 FILE 7Z* 』═══╮\n│\n│ ⚠️ Format 7-Zip terdeteksi!\n│\n│ Format 7Z tidak bisa dibaca\n│ isinya langsung oleh bot.\n│ Coba kirim sebagai ZIP.\n│\n╰═══════════════════════╯`);
                                logCommand(m, hisoka, 'wily');
                                return;
                        } else if (isPdf) {
                                await tolak(hisoka, m, `📄 Sedang membaca isi PDF...`);
                                try {
                                        const pdfText = await extractPdfText(docBuffer);
                                        if (!pdfText || pdfText.length < 10) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, `❌ PDF ini tidak mengandung teks yang bisa dibaca (mungkin berupa scan/gambar). Coba kirim sebagai gambar untuk dianalisis.`);
                                                return;
                                        }
                                        isDocumentMode = true;
                                        documentContext = `[ISI PDF]\n${pdfText}`;
                                        hasMedia = true;
                                        mediaLabel = 'PDF';
                                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m PDF dibaca: ${pdfText.length} karakter`);
                                } catch (pdfErr) {
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal baca PDF: ${pdfErr.message}`);
                                        return;
                                }
                        } else if (isText) {
                                const textContent = docBuffer.toString('utf8').substring(0, 5000);
                                isDocumentMode = true;
                                documentContext = `[ISI FILE ${docExt.toUpperCase() || 'TEKS'}]\n${textContent}`;
                                hasMedia = true;
                                mediaLabel = `file ${docExt || 'teks'}`;
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m File teks dibaca: ${textContent.length} karakter`);
                        } else if (isImage) {
                                imageBuffer = docBuffer;
                                imageMime = docMime || 'image/jpeg';
                                hasMedia = true;
                                mediaLabel = 'gambar';
                        } else {
                                isDocumentMode = true;
                                documentContext = `[INFO FILE]\nNama: ${docFileName || 'tidak diketahui'}\nEkstensi: ${docExt || 'tidak ada'}\nUkuran: ${docSizeKB} KB\nMIME Type: ${docMime || 'tidak diketahui'}`;
                                hasMedia = true;
                                mediaLabel = `file ${docExt || 'tidak dikenal'}`;
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m File tidak dikenal — metadata diteruskan ke AI`);
                        }
                } catch (docErr) {
                        wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal proses dokumen: ${docErr.message}`);
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                        await tolak(hisoka, m, `❌ Gagal proses file: ${docErr.message}`);
                        return;
                }
        }

        if (!hasMedia && m.isQuoted) {
                if (qtType === 'imageMessage' || qtType === 'stickerMessage' || qtType === 'albumMessage') {
                        try {
                                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                                const cached = getCachedQuotedMedia(hisoka, m);
                                imageBuffer = await downloadQuotedMedia();
                                if (imageBuffer && imageBuffer.length > 0) {
                                        const info = getMediaInfo(qtType, m.quoted, cached);
                                        imageMime = info.mime;
                                        hasMedia = true;
                                        mediaLabel = info.label;
                                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m Media dari quoted: ${qtType}, ${imageBuffer.length} bytes`);
                                }
                        } catch (dlErr) {
                                wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal download quoted media: ${dlErr.message}`);
                        }
                } else if (qtType === 'videoMessage') {
                        try {
                                await hisoka.sendMessage(m.from, { react: { text: '🎬', key: m.key } });
                                imageBuffer = await downloadQuotedMedia();
                                if (imageBuffer && imageBuffer.length > 0) {
                                        imageMime = 'video/mp4';
                                        hasMedia = true;
                                        mediaLabel = 'video';
                                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m Video dari quoted: ${imageBuffer.length} bytes`);
                                }
                        } catch (dlErr) {
                                wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal download quoted video: ${dlErr.message}`);
                        }
                } else if (qtType === 'documentMessage') {
                        await hisoka.sendMessage(m.from, { react: { text: '📄', key: m.key } });
                        try {
                                const docBuffer = await downloadQuotedMedia();
                                const qtMime = (
                                        m.quoted?.msg?.mimetype ||
                                        m.quoted?.message?.documentMessage?.mimetype ||
                                        m.quoted?.content?.mimetype || ''
                                ).toLowerCase();
                                const qtFileName = (
                                        m.quoted?.msg?.fileName ||
                                        m.quoted?.message?.documentMessage?.fileName ||
                                        m.quoted?.content?.fileName || ''
                                ).toLowerCase();
                                const qtExt = qtFileName.split('.').pop() || '';
                                const qtSizeKB = docBuffer ? (docBuffer.length / 1024).toFixed(1) : 0;
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Quoted doc: mime="${qtMime}" name="${qtFileName}" size=${qtSizeKB}KB`);

                                const qtIsZip = docBuffer && docBuffer.length >= 4 &&
                                        docBuffer[0] === 0x50 && docBuffer[1] === 0x4B &&
                                        (docBuffer[2] === 0x03 || docBuffer[2] === 0x05 || docBuffer[2] === 0x07);
                                const qtIsPdf = docBuffer && docBuffer.length >= 4 &&
                                        docBuffer[0] === 0x25 && docBuffer[1] === 0x50 &&
                                        docBuffer[2] === 0x44 && docBuffer[3] === 0x46;
                                const qtIsRar = docBuffer && docBuffer.length >= 4 &&
                                        docBuffer[0] === 0x52 && docBuffer[1] === 0x61 &&
                                        docBuffer[2] === 0x72 && docBuffer[3] === 0x21;
                                const qtIs7z = docBuffer && docBuffer.length >= 6 &&
                                        docBuffer[0] === 0x37 && docBuffer[1] === 0x7A &&
                                        docBuffer[2] === 0xBC && docBuffer[3] === 0xAF;

                                const isZip = qtIsZip || qtMime.includes('zip') ||
                                        ['zip', 'apk', 'jar', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(qtExt);
                                const isPdf = qtIsPdf || qtMime.includes('pdf') || qtExt === 'pdf';
                                const isRar = qtIsRar || qtMime.includes('rar') || qtExt === 'rar';
                                const is7z = qtIs7z || qtExt === '7z';
                                const isText = qtMime.startsWith('text/') ||
                                        ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'css', 'md', 'yaml', 'yml', 'ini', 'conf', 'log', 'sh', 'bat'].includes(qtExt);

                                if (isZip && !isRar && !is7z) {
                                        const zipResult = parseZipBuffer(docBuffer);
                                        if (zipResult.error) {
                                                await tolak(hisoka, m, `❌ ${zipResult.error}`);
                                                return;
                                        }
                                        const isDocxLike = ['docx', 'xlsx', 'pptx', 'odt'].includes(qtExt);
                                        const archiveLabel = qtExt === 'apk' ? '📱 FILE APK' : isDocxLike ? `📝 FILE ${qtExt.toUpperCase()}` : '📦 FILE ZIP';
                                        const passwordNote = zipResult.isPasswordProtected ? `🔐 *BERPASSWORD*` : `🔓 *Tidak berpassword*`;
                                        let zipText = `╭═══『 *${archiveLabel}* 』═══╮\n│\n│ 📁 *Total File:* ${zipResult.files.length}\n│ ${passwordNote}\n│\n│ *DAFTAR ISI:*\n`;
                                        for (const f of zipResult.files.slice(0, 30)) {
                                                const lockIcon = f.encrypted ? '🔐' : '📄';
                                                const sizeStr = f.size >= 1024 ? `${(f.size / 1024).toFixed(1)} MB` : `${f.size} KB`;
                                                zipText += `│ ${lockIcon} ${f.name} _(${sizeStr})_\n`;
                                        }
                                        if (zipResult.files.length > 30) zipText += `│ _(... dan ${zipResult.files.length - 30} lainnya)_\n`;
                                        zipText += `│\n╰═══════════════════════╯`;
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        await tolak(hisoka, m, zipText);
                                        logCommand(m, hisoka, 'wily');
                                        return;
                                } else if (isRar) {
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        await tolak(hisoka, m, `📦 *File RAR terdeteksi.*\nBot tidak bisa baca isi RAR langsung. Coba extract dulu atau kirim sebagai ZIP.`);
                                        logCommand(m, hisoka, 'wily');
                                        return;
                                } else if (is7z) {
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        await tolak(hisoka, m, `📦 *File 7Z terdeteksi.*\nBot tidak bisa baca isi 7Z. Coba kirim sebagai ZIP.`);
                                        logCommand(m, hisoka, 'wily');
                                        return;
                                } else if (isPdf) {
                                        await tolak(hisoka, m, `📄 Sedang membaca PDF...`);
                                        const pdfText = await extractPdfText(docBuffer);
                                        if (!pdfText || pdfText.length < 10) {
                                                await tolak(hisoka, m, `❌ PDF tidak mengandung teks yang bisa dibaca.`);
                                                return;
                                        }
                                        isDocumentMode = true;
                                        documentContext = `[ISI PDF]\n${pdfText}`;
                                        hasMedia = true;
                                        mediaLabel = 'PDF';
                                } else if (isText) {
                                        const textContent = docBuffer.toString('utf8').substring(0, 5000);
                                        isDocumentMode = true;
                                        documentContext = `[ISI FILE ${qtExt.toUpperCase() || 'TEKS'}]\n${textContent}`;
                                        hasMedia = true;
                                        mediaLabel = `file ${qtExt || 'teks'}`;
                                } else {
                                        isDocumentMode = true;
                                        documentContext = `[INFO FILE]\nNama: ${qtFileName || 'tidak diketahui'}\nEkstensi: ${qtExt || 'tidak ada'}\nUkuran: ${qtSizeKB} KB\nMIME Type: ${qtMime || 'tidak diketahui'}`;
                                        hasMedia = true;
                                        mediaLabel = `file ${qtExt || 'tidak dikenal'}`;
                                }
                        } catch (docErr) {
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                await tolak(hisoka, m, `❌ Gagal proses file: ${docErr.message}`);
                                return;
                        }
                } else if (qtType === 'conversation' || qtType === 'extendedTextMessage') {
                        const senderName = m.quoted?.pushName || m.quoted?.key?.participant?.split('@')[0] || 'seseorang';
                        const quotedText = m.quoted?.text || m.quoted?.body || '';
                        if (quotedText) {
                                quotedTextContext = `\n📩 KONTEKS PESAN YANG DI-REPLY:\nPengirim: ${senderName}\nIsi pesan: "${quotedText.substring(0, 500)}"`;
                        }
                }
        }

        let userQuestion = query?.trim() || '';

        if (!userQuestion && !hasMedia && !quotedTextContext) {
                let helpText = `╭═══『 *🤖 WILY AI* 』═══╮\n`;
                helpText += `│\n`;
                helpText += `│ Halo ${userName}! Aku Wily Bot AI 🤖\n`;
                helpText += `│ AI cerdas berbasis Gemini Vision\n`;
                helpText += `│\n`;
                helpText += `│ *CARA PAKAI:*\n`;
                helpText += `│\n`;
                helpText += `│ 💬 *Tanya sesuatu:*\n`;
                helpText += `│ .wily [pertanyaan kamu]\n`;
                helpText += `│\n`;
                helpText += `│ 🖼️ *Analisis gambar/sticker:*\n`;
                helpText += `│ Kirim/reply gambar + .wily\n`;
                helpText += `│\n`;
                helpText += `│ 🎬 *Analisis video:*\n`;
                helpText += `│ Kirim/reply video + .wily\n`;
                helpText += `│\n`;
                helpText += `│ 📄 *Baca PDF:*\n`;
                helpText += `│ Kirim/reply PDF + .wily [pertanyaan]\n`;
                helpText += `│\n`;
                helpText += `│ 📦 *Cek isi ZIP:*\n`;
                helpText += `│ Kirim/reply file ZIP + .wily\n`;
                helpText += `│\n`;
                helpText += `│ 🔍 *Cari & kirim gambar:*\n`;
                helpText += `│ .wily cari gambar naruto\n`;
                helpText += `│\n`;
                helpText += `│ 💬 *Reply pesan + tanya:*\n`;
                helpText += `│ Reply pesan siapapun + .wily [pertanyaan]\n`;
                helpText += `│\n`;
                helpText += `│ 🧠 *Memory percakapan:*\n`;
                helpText += `│ • Private: langsung lanjut otomatis\n`;
                helpText += `│ • Grup: reply pesan bot untuk lanjut\n`;
                helpText += `│ • .wily reset - hapus memory\n`;
                helpText += `│\n`;
                helpText += `│ *KEMAMPUAN AI:*\n`;
                helpText += `│ ✅ Ingat percakapan sebelumnya\n`;
                helpText += `│ ✅ Cari dan kirim gambar otomatis\n`;
                helpText += `│ ✅ Baca teks di dalam gambar\n`;
                helpText += `│ ✅ Tahu judul anime/film/series\n`;
                helpText += `│ ✅ Kenali karakter/artis dari foto\n`;
                helpText += `│ ✅ Baca isi file PDF\n`;
                helpText += `│ ✅ Cek isi file ZIP + deteksi password\n`;
                helpText += `│ ✅ Analisis video\n`;
                helpText += `│ ✅ Jawab pertanyaan umum\n`;
                helpText += `│\n`;
                helpText += `╰══════════════════════╯`;
                await tolak(hisoka, m, helpText);
                return;
        }

        const hasSticker = hasMedia && mediaLabel === 'sticker';

        if (!userQuestion && hasMedia) {
                userQuestion = buildWilyMediaUserPrompt({
                        mediaLabel,
                        hasSticker,
                        isDocumentMode,
                        mode: 'command',
                });
        }
        if (!userQuestion && quotedTextContext) {
                userQuestion = `Bantu aku tentang pesan ini.`;
        }

        const sessKey = getSessionKey(m);
        const isReplyToBot = m.isQuoted && m.quoted?.key?.fromMe;
        const useHistory = !m.isGroup || isReplyToBot;

        const imgSearchQuery = !hasMedia ? detectImageSearchQuery(userQuestion) : null;

        if (imgSearchQuery) {
                const imgCount = Math.min(extractImageCount(userQuestion), 5);
                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
                await tolak(hisoka, m, await buildSmartImageWaitText({
                        userName,
                        userQuestion,
                        query: imgSearchQuery,
                        count: imgCount,
                }));
                let imgBotReply = '';
                try {
                        const imgResults = await searchAndGetImages(imgSearchQuery, imgCount);
                        let captions = [];
                        if (imgResults.length > 1) {
                                captions = await buildSmartAlbumCaptions({
                                        userQuestion,
                                        query: imgSearchQuery,
                                        images: imgResults,
                                });
                                await sendImageAlbum(hisoka, m, imgResults, captions);
                        } else {
                                const r = imgResults[0];
                                captions = await buildSmartAlbumCaptions({
                                        userQuestion,
                                        query: imgSearchQuery,
                                        images: imgResults,
                                });
                                const sentImage = await hisoka.sendMessage(m.from, {
                                        image: r.buffer,
                                        caption: captions[0] || `🖼️ *${r.title || imgSearchQuery}*`
                                }, { quoted: m });
                                rememberAIMedia(hisoka, sentImage, [{
                                        buffer: r.buffer,
                                        mime: 'image/jpeg',
                                        label: 'gambar',
                                        caption: captions[0] || r.title || imgSearchQuery,
                                }]);
                        }
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m Image search: "${imgSearchQuery}" → ${imgResults.length} gambar`);
                        imgBotReply = await buildSmartImageHistoryReply({
                                userQuestion,
                                query: imgSearchQuery,
                                images: imgResults,
                                captions,
                        });
                } catch (searchErr) {
                        wilyError(`\x1b[31m[WilyAI]\x1b[39m Image search error: ${searchErr.message}`);
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                        imgBotReply = `Maaf aku gagal cariin gambar "${imgSearchQuery}" tadi. Coba minta lagi dengan kata kunci yang lebih spesifik ya!`;
                        await tolak(hisoka, m, `❌ Maaf ${userName}, gagal cariin gambar "${imgSearchQuery}".\n\nCoba kata kunci yang lebih spesifik ya!`);
                }
                if (useHistory && imgBotReply) {
                        addToHistory(sessKey, userQuestion, imgBotReply, buildHistoryMeta(m, { mediaLabel: 'gambar' }));
                }
                logCommand(m, hisoka, 'wily');
                return;
        }

        const historyMessages = useHistory ? getHistory(sessKey) : [];
        const hasHistory = historyMessages.length > 0;

        let extraContext = `CATATAN: Kalau user minta cari/kirim gambar, jawab secara natural bahwa gambar sedang dipilih dan akan dikirim oleh bot. Jangan pakai kalimat template yang sama berulang-ulang.`;
        if (documentContext) extraContext += `\n\n${documentContext}`;
        if (quotedTextContext) extraContext += `\n${quotedTextContext}`;

        const aiCmdUserMemory = detectAndUpdateMemory(m.sender, userQuestion);
        const systemPrompt = buildWilyAICommandPrompt({
                userName, currentTime, currentDate, timeOfDay,
                hasHistory,
                chatContext: extraContext,
                isPrivate: !m.isGroup,
                isOwner: m.isOwner,
                hasImage: hasMedia && !isDocumentMode,
                isImageReply: false,
                hasSticker,
                isStickerReply: false,
                userMessage: userQuestion,
                isDocumentMode,
                history: historyMessages,
                userMemory: aiCmdUserMemory,
                sessionKey: sessKey,
        });

        const finalUserMsg = isDocumentMode && documentContext
                ? `${documentContext}\n\n${userQuestion}`
                : quotedTextContext
                ? `${quotedTextContext}\n\nPertanyaan user: ${userQuestion}`
                : userQuestion;

        let contents;
        if (!hasHistory) {
                if (imageBuffer && imageBuffer.length > 0 && !isDocumentMode) {
                        contents = null;
                } else {
                        contents = [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + finalUserMsg }] }];
                }
        } else {
                if (imageBuffer && imageBuffer.length > 0 && !isDocumentMode) {
                        contents = null;
                } else {
                        const cmdMsgMeta = buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : null });
                        contents = [
                                { role: 'user', parts: [{ text: systemPrompt }] },
                                { role: 'model', parts: [{ text: `Halo ${userName}! Aku Wily Bot, siap membantu kamu 🤖` }] },
                                ...historyMessages,
                                { role: 'user', parts: [{ text: wrapCurrentUserMessage(finalUserMsg, cmdMsgMeta) }] },
                        ];
                }
                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Melanjutkan percakapan (${historyMessages.length / 2} pesan sebelumnya) untuk ${m.sender}`);
        }

        console.log(`\x1b[36m[WilyAI]\x1b[0m ← ${m.sender} | "${userQuestion.substring(0, 80)}${userQuestion.length > 80 ? '...' : ''}" | media: ${hasMedia ? mediaLabel : 'teks'} | history: ${historyMessages.length / 2 || 0} pesan`);

        let response;

        if (imageBuffer && imageBuffer.length > 0 && !isDocumentMode) {
                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Vision request - buffer: ${imageBuffer.length} bytes, mime: ${imageMime}`);
                let finalBuffer = imageBuffer;
                let finalMime = imageMime;
                if (imageMime === 'image/webp') {
                        try {
                                const sharp = (await import('sharp')).default;
                                finalBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
                                finalMime = 'image/jpeg';
                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m Sticker dikonversi ke JPEG: ${finalBuffer.length} bytes`);
                        } catch (sharpErr) {
                                wilyError(`\x1b[31m[WilyAI]\x1b[39m Gagal konversi sticker: ${sharpErr.message}`);
                        }
                }
                if (hasHistory) {
                        const visionMsgMeta = buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : 'gambar' });
                        const visionContents = [
                                { role: 'user', parts: [{ text: systemPrompt }] },
                                { role: 'model', parts: [{ text: `Halo ${userName}! Aku Wily Bot, siap membantu kamu 🤖` }] },
                                ...historyMessages,
                                {
                                        role: 'user',
                                        parts: [
                                                { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                { text: wrapCurrentUserMessage(finalUserMsg, visionMsgMeta) },
                                        ],
                                },
                        ];
                        // gemini.chat() sudah punya fallback chain otomatis (gemini-3.1-pro-preview → ... → gemini-2.5-flash-lite)
                        response = await gemini.chat({ contents: visionContents });
                } else {
                        response = await gemini.askWithImage(systemPrompt + '\n\n' + finalUserMsg, finalBuffer, finalMime);
                }
        } else {
                response = await gemini.chat({ contents });
        }

        if (response && response.trim()) {
                let finalResponse = response.trim();
                if (hasMedia) {
                        const stripped = finalResponse.replace(/\[GAMBAR:[^\]]{1,200}\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
                        if (stripped !== finalResponse) {
                                console.log(`\x1b[36m[WilyAI]\x1b[0m ⚠️ Marker [GAMBAR:] dihapus dari respons karena user sudah kirim media`);
                        }
                        finalResponse = stripped;
                }
                const wilyMediaResult = await processAIMediaAndSend(hisoka, m, finalResponse, { sessionKey: sessKey });
                const wilyClean = wilyMediaResult.sentText;
                const wc = wilyMediaResult.counts;
                const mediaSummary = [
                        wc.images ? `${wc.images} gambar` : null,
                        wc.voiceNotes ? `${wc.voiceNotes} VN` : null,
                        wc.songs ? `${wc.songs} lagu` : null,
                        wc.videos ? `${wc.videos} video` : null,
                ].filter(Boolean).join(' + ');
                console.log(`\x1b[36m[WilyAI]\x1b[0m → balas ${finalResponse.length} karakter${mediaSummary ? ` + ${mediaSummary}` : ''} ke ${m.sender}`);
                if (useHistory) {
                        addToHistory(sessKey, userQuestion, wilyClean || response.trim(), buildHistoryMeta(m));
                }
        } else {
                console.log(`\x1b[36m[WilyAI]\x1b[0m ⚠️ AI respons kosong untuk ${m.sender}`);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, '❌ AI tidak merespons, coba lagi.');
        }

        logCommand(m, hisoka, 'wily');

        } finally {
                // Jaminan: typing SELALU dimatikan di sini, apapun jalur keluarnya (sukses,
                // early return di tengah proses, atau error) — supaya status typing akurat
                // realtime dan tidak nyangkut nyala terus di WhatsApp user.
                stopTyping_cmd();
        }
}

module.exports = { handleWily };
