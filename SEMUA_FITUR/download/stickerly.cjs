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
 *  stickerly.cjs — Download stiker dari Stickerly
 *  Fetch pack stiker via Stickerly API v4
 * ───────────────────────────────
 */
const axios = require('axios');

const API_BASE = 'https://api.sticker.ly/v4';
const HEADERS = {
  'user-agent': 'androidapp.stickerly/3.17.0 (Redmi Note 4; U; Android 29; in-ID; id;)',
  'content-type': 'application/json',
  'accept-encoding': 'gzip'
};

function extractPackId(input = '') {
  const value = String(input || '').trim();
  const match = value.match(/(?:sticker\.ly\/s\/|sticker\.ly\/pack\/|\/s\/|\/pack\/)([a-z0-9_-]{4,32})/i);
  if (match) return match[1];
  if (/^[a-z0-9_-]{4,32}$/i.test(value)) return value;
  return null;
}

function resourceUrl(prefix, fileName) {
  if (!prefix || !fileName) return null;
  if (/^https?:\/\//i.test(fileName)) return fileName;
  return `${prefix}${fileName}`;
}

function normalizeNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

class StickerLy {
  async search(query, options = {}) {
    const keyword = String(query || '').trim();
    if (!keyword) throw new Error('Query wajib diisi.');

    const { data } = await axios.post(`${API_BASE}/stickerPack/smartSearch`, {
      keyword,
      enabledKeywordSearch: true,
      filter: {
        extendSearchResult: false,
        sortBy: 'RECOMMENDED',
        languages: ['ALL'],
        minStickerCount: 5,
        searchBy: 'ALL',
        stickerType: 'ALL'
      }
    }, {
      headers: HEADERS,
      timeout: options.timeout || 20000
    });

    const packs = data?.result?.stickerPacks;
    if (!Array.isArray(packs)) return [];

    return packs.slice(0, options.limit || 10).map(pack => {
      const trayIndex = Number.isInteger(pack.trayIndex) ? pack.trayIndex : 0;
      const trayFile = pack.resourceFiles?.[trayIndex] || pack.resourceFiles?.[0] || '';
      return {
        id: pack.packId,
        name: pack.name || 'Tanpa Nama',
        author: pack.authorName || pack.user?.displayName || pack.user?.userName || 'Unknown',
        stickerCount: Array.isArray(pack.resourceFiles) ? pack.resourceFiles.length : normalizeNumber(pack.stickerCount),
        viewCount: normalizeNumber(pack.viewCount),
        exportCount: normalizeNumber(pack.exportCount),
        isPaid: !!pack.isPaid,
        isAnimated: !!(pack.isAnimated || pack.animated),
        thumbnailUrl: resourceUrl(pack.resourceUrlPrefix, trayFile),
        url: pack.shareUrl || (pack.packId ? `https://sticker.ly/s/${pack.packId}` : null)
      };
    }).filter(pack => pack.id || pack.url);
  }

  async detail(input, options = {}) {
    const packId = extractPackId(input);
    if (!packId) throw new Error('URL atau ID Stickerly tidak valid.');

    const { data } = await axios.get(`${API_BASE}/stickerPack/${packId}?needRelation=true`, {
      headers: HEADERS,
      timeout: options.timeout || 20000
    });

    const result = data?.result;
    if (!result) throw new Error('Sticker pack tidak ditemukan.');

    const stickers = Array.isArray(result.stickers) ? result.stickers : [];
    const user = result.user || {};
    const trayIndex = Number.isInteger(result.trayIndex) ? result.trayIndex : 0;
    const traySticker = stickers[trayIndex] || stickers[0] || {};

    return {
      id: result.packId || packId,
      name: result.name || 'StickerLy Pack',
      author: {
        name: user.displayName || result.authorName || user.userName || 'Unknown',
        username: user.userName || '',
        bio: user.bio || '',
        followers: normalizeNumber(user.followerCount),
        following: normalizeNumber(user.followingCount),
        isPrivate: !!user.isPrivate,
        avatar: user.profileUrl || '',
        website: user.website || result.website || '',
        url: user.shareUrl || ''
      },
      stickers: stickers.map(sticker => ({
        id: sticker.sid || '',
        fileName: sticker.fileName,
        isAnimated: !!(sticker.isAnimated || sticker.animated || result.isAnimated || result.animated),
        imageUrl: resourceUrl(result.resourceUrlPrefix, sticker.fileName),
        viewCount: normalizeNumber(sticker.viewCount)
      })).filter(sticker => sticker.fileName && sticker.imageUrl),
      stickerCount: stickers.length,
      viewCount: normalizeNumber(result.viewCount),
      exportCount: normalizeNumber(result.exportCount),
      isPaid: !!result.isPaid,
      isAnimated: !!(result.isAnimated || result.animated),
      thumbnailUrl: resourceUrl(result.resourceUrlPrefix, traySticker.fileName),
      trayIconFileName: traySticker.fileName || '',
      resourceZipUrl: resourceUrl(result.resourceUrlPrefix, result.resourceZip),
      resourceUrlPrefix: result.resourceUrlPrefix || '',
      url: result.shareUrl || `https://sticker.ly/s/${packId}`
    };
  }

  async downloadPackZipBuffer(url, options = {}) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('URL ZIP pack Stickerly tidak valid.');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 30000,
      headers: {
        'user-agent': HEADERS['user-agent'],
        accept: 'application/zip,application/octet-stream,*/*'
      }
    });
    const buffer = Buffer.from(response.data);
    if (buffer.length < 4 || buffer.readUInt32LE(0) !== 0x04034b50) {
      throw new Error('File ZIP pack Stickerly tidak valid.');
    }
    return buffer;
  }

  async downloadStickerBuffer(url, options = {}) {
    if (!/^https?:\/\//i.test(String(url || ''))) throw new Error('URL sticker tidak valid.');
    const response = await axios.get(url, {
      responseType: 'arraybuffer',
      timeout: options.timeout || 20000,
      headers: {
        'user-agent': HEADERS['user-agent'],
        accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8'
      }
    });
    return Buffer.from(response.data);
  }
}

const stickerly = new StickerLy();

module.exports = {
  StickerLy,
  stickerly,
  extractPackId,
  search: (...args) => stickerly.search(...args),
  detail: (...args) => stickerly.detail(...args),
  downloadPackZipBuffer: (...args) => stickerly.downloadPackZipBuffer(...args),
  downloadStickerBuffer: (...args) => stickerly.downloadStickerBuffer(...args)
};
// ── COMMAND HANDLER ───────────────────────────────────────────────────────────


const { prepareWAMessageMedia, generateWAMessageFromContent, proto } = require('@whiskeysockets/baileys');
const crypto = require('crypto');
const { PassThrough } = require('stream');

async function sendStickerPackCard(hisoka, jid, quoted, pack, zipBuffer) {
        if (!zipBuffer?.length) throw new Error('ZIP pack kosong.');

        const packMedia = await prepareWAMessageMedia({
                sticker: zipBuffer,
                mimetype: 'image/webp'
        }, { upload: hisoka.waUploadToServer });
        const stickerMessage = packMedia.stickerMessage;
        if (!stickerMessage?.directPath) throw new Error('Upload ZIP pack ke WhatsApp gagal.');

        let thumbnailMessage = null;
        if (pack.thumbnailUrl) {
                try {
                        const thumbnailMedia = await prepareWAMessageMedia({
                                image: { url: pack.thumbnailUrl }
                        }, { upload: hisoka.waUploadToServer });
                        thumbnailMessage = thumbnailMedia.imageMessage || null;
                } catch (thumbErr) {
                        console.error('[StickerLy] Thumbnail upload failed:', thumbErr.message);
                }
        }

        const stickers = pack.files.map(item => ({
                fileName: item.fileName,
                isAnimated: !!item.isAnimated,
                emojis: ['✨'],
                accessibilityLabel: item.id || item.fileName || '',
                isLottie: false,
                mimetype: 'image/webp'
        }));

        const stickerPackMessage = proto.Message.StickerPackMessage.fromObject({
                stickerPackId: String(pack.id || crypto.randomBytes(4).toString('hex')),
                name: String(pack.name || 'StickerLy Pack').slice(0, 128),
                publisher: String(pack.author?.name || 'StickerLy').slice(0, 128),
                stickers,
                fileLength: stickerMessage.fileLength,
                fileSha256: stickerMessage.fileSha256,
                fileEncSha256: stickerMessage.fileEncSha256,
                mediaKey: stickerMessage.mediaKey,
                directPath: stickerMessage.directPath,
                caption: pack.url || '',
                contextInfo: {
                        quotedMessage: quoted?.message,
                        stanzaId: quoted?.key?.id,
                        participant: quoted?.sender || quoted?.key?.participant || quoted?.key?.remoteJid
                },
                packDescription: `Stickerly pack: ${pack.url || pack.id}`,
                mediaKeyTimestamp: stickerMessage.mediaKeyTimestamp,
                trayIconFileName: pack.trayIconFileName || pack.files[0]?.fileName || '',
                thumbnailDirectPath: thumbnailMessage?.directPath,
                thumbnailSha256: thumbnailMessage?.fileSha256,
                thumbnailEncSha256: thumbnailMessage?.fileEncSha256,
                thumbnailHeight: thumbnailMessage?.height || 512,
                thumbnailWidth: thumbnailMessage?.width || 512,
                imageDataHash: pack.id ? String(pack.id) : undefined,
                stickerPackSize: stickers.length,
                stickerPackOrigin: proto.Message.StickerPackMessage.StickerPackOrigin.THIRD_PARTY
        });

        const msg = generateWAMessageFromContent(jid, { stickerPackMessage }, { quoted });
        await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
        return msg;
}

function zipFiles(files) {
        return new Promise((resolve, reject) => {
                const archiver = require('archiver');
                const archive = archiver('zip', { zlib: { level: 0 } });
                const output = new PassThrough();
                const chunks = [];

                output.on('data', chunk => chunks.push(chunk));
                output.on('end', () => resolve(Buffer.concat(chunks)));
                output.on('error', reject);
                archive.on('error', reject);
                archive.pipe(output);

                for (const file of files) {
                        archive.append(file.buffer, {
                                name: file.fileName,
                                store: true
                        });
                }

                archive.finalize();
        });
}

async function handleStikerpack({ hisoka, m, query, tolak, logCommand, path }) {
        try {
                const input = (query || '').trim();
                const pfx   = m.prefix || '.';

                if (!input) {
                        await tolak(hisoka, m,
                                `╭═══『 🧩 *STICKERLY PACK* 』═══╮\n│\n│ Download 1 pack sticker Stickerly.\n│\n` +
                                `│ *Cara Pakai:*\n│ • ${pfx}stickerly anime\n│ • ${pfx}stickerly https://sticker.ly/s/4XBX01\n` +
                                `│ • ${pfx}stickerly search kucing\n│\n│ Jika pakai keyword, bot ambil pack hasil teratas.\n` +
                                `│ Default: kirim sticker langsung agar pasti masuk.\n│ Eksperimen kartu: ${pfx}stickerly native anime\n╰══════════════════════╯`
                        );
                        return;
                }

                const { search, detail, downloadStickerBuffer, extractPackId } = module.exports;
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

                const isSearchOnly = /^search\s+/i.test(input);
                const isNativeSend = /^(native|card|kartu)\s+/i.test(input);
                const cleanInput   = isSearchOnly
                        ? input.replace(/^search\s+/i, '').trim()
                        : isNativeSend
                                ? input.replace(/^(native|card|kartu)\s+/i, '').trim()
                                : input;

                if (!cleanInput) {
                        await tolak(hisoka, m, `❌ Masukkan kata kunci pencarian.\n\nContoh: ${pfx}stickerly search anime`);
                        return;
                }

                if (isSearchOnly) {
                        const packs = await search(cleanInput, { limit: 8 });
                        if (!packs.length) {
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                await tolak(hisoka, m, `❌ Pack Stickerly untuk *${cleanInput}* tidak ditemukan.`);
                                return;
                        }
                        let resultText = `╭═══『 🔎 *HASIL STICKERLY* 』═══╮\n│\n`;
                        packs.forEach((pack, index) => {
                                resultText += `│ ${index + 1}. *${pack.name}*\n│    👤 ${pack.author}\n│    🧩 ${pack.stickerCount} sticker${pack.isAnimated ? ' · animated' : ''}\n│    🔗 ${pack.url}\n│\n`;
                        });
                        resultText += `│ Pakai: ${pfx}stickerly <link di atas>\n╰══════════════════════╯`;
                        await tolak(hisoka, m, resultText);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, 'stickerly-search');
                        return;
                }

                let packInput = cleanInput;
                if (!extractPackId(cleanInput)) {
                        const packs = await search(cleanInput, { limit: 1 });
                        if (!packs.length) {
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                await tolak(hisoka, m, `❌ Pack Stickerly untuk *${cleanInput}* tidak ditemukan.`);
                                return;
                        }
                        packInput = packs[0].url || packs[0].id;
                }

                const pack     = await detail(packInput);
                const stickers = pack.stickers;

                if (!stickers.length) {
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                        await tolak(hisoka, m, '❌ Sticker di pack ini kosong.');
                        return;
                }

                const infoText =
                        `╭═══『 🧩 *STICKERLY PACK* 』═══╮\n│ 📦 *Pack:* ${pack.name}\n│ 👤 *Author:* ${pack.author.name}\n` +
                        `│ 🧩 *Sticker:* ${stickers.length}/${pack.stickerCount}\n│ 👁️ *Views:* ${pack.viewCount.toLocaleString('id-ID')}\n` +
                        `│ 📤 *Export:* ${pack.exportCount.toLocaleString('id-ID')}\n│ 🔗 ${pack.url}\n│\n` +
                        `│ ${isNativeSend ? 'Mengirim kartu paket sticker native eksperimen...' : 'Mengirim sticker langsung agar pasti masuk...'}\n╰══════════════════════╯`;

                const loadingMsg = await tolak(hisoka, m, infoText);

                if (isNativeSend) {
                        const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
                        const nativeFiles = [];
                        for (const [index, item] of pack.stickers.entries()) {
                                const rawBuffer  = await downloadStickerBuffer(item.imageUrl);
                                const fileName   = `sticker_${String(index + 1).padStart(3, '0')}.webp`;
                                const isWebp     = /\.webp(?:\?|$)/i.test(item.imageUrl) || rawBuffer.slice(8, 12).toString() === 'WEBP';
                                let stickerBuffer = rawBuffer;
                                if (!item.isAnimated && !isWebp) {
                                        const sticker = new Sticker(rawBuffer, { pack: pack.name, author: pack.author.name, type: StickerTypes.FULL, categories: ['✨'], id: `stickerly.${pack.id}`, quality: 85 });
                                        stickerBuffer = await sticker.toBuffer();
                                }
                                nativeFiles.push({ id: item.id, fileName, isAnimated: !!item.isAnimated, buffer: stickerBuffer });
                        }
                        const zipBuffer = await zipFiles(nativeFiles);
                        await sendStickerPackCard(hisoka, m.from, m, { ...pack, files: nativeFiles, trayIconFileName: nativeFiles[0]?.fileName || '' }, zipBuffer);
                        const doneText = `✅ Kartu paket Stickerly eksperimen sudah dikirim.\n\n📦 *${pack.name}*\n🧩 *${pack.stickerCount}* sticker\n\nCatatan: beberapa WhatsApp menolak kartu pack custom. Kalau panel tidak bisa dibuka, pakai:\n${pfx}stickerly ${pack.url}`;
                        if (loadingMsg?.key) await m.reply({ edit: loadingMsg.key, text: doneText }); else await tolak(hisoka, m, doneText);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, 'stickerly');
                        return;
                }

                const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
                let sent = 0, failed = 0;
                for (const item of stickers) {
                        try {
                                const rawBuffer  = await downloadStickerBuffer(item.imageUrl);
                                const isWebp     = /\.webp(?:\?|$)/i.test(item.imageUrl);
                                let stickerBuffer = rawBuffer;
                                if (!item.isAnimated && !isWebp) {
                                        const sticker = new Sticker(rawBuffer, { pack: pack.name, author: pack.author.name, type: StickerTypes.FULL, categories: ['🎭'], id: `stickerly.${pack.id}`, quality: 85 });
                                        stickerBuffer = await sticker.toBuffer();
                                }
                                await hisoka.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });
                                sent++;
                                if (sent % 5 === 0) await new Promise(resolve => setTimeout(resolve, 700));
                        } catch (sendErr) { failed++; console.error('[StickerLy] Failed sticker:', sendErr.message); }
                }
                const doneText = failed
                        ? `✅ Stickerly selesai.\nTerkirim: *${sent}* sticker\nGagal: *${failed}* sticker`
                        : `✅ Stickerly selesai. *${sent}* sticker berhasil dikirim.`;
                if (loadingMsg?.key) await m.reply({ edit: loadingMsg.key, text: doneText }); else await tolak(hisoka, m, doneText);
                await hisoka.sendMessage(m.from, { react: { text: sent ? '✅' : '❌', key: m.key } });
                logCommand(m, hisoka, 'stickerly');
        } catch (error) {
                console.error('\x1b[31m[StickerLy] Error:\x1b[39m', error.message);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, `❌ Gagal mengambil Stickerly: ${error.message}`);
        }
}

module.exports.handleStikerpack = handleStikerpack;
