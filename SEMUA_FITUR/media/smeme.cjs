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
 *  smeme.cjs — Membuat sticker meme dari gambar atau sticker reply
 *  Format: .smeme teks | .smeme teks atas|teks bawah
 * ───────────────────────────────
 */
'use strict';

const sharp = require('sharp');
const twemoji = require('@twemoji/api');
const axios = require('axios');

const MAX_TEXT_LENGTH = 120;
const MAX_STICKER_BYTES = 500 * 1024;
const TOKEN_GAP = 6;
const TWEMOJI_BASE_URL = 'https://cdn.jsdelivr.net/gh/jdecked/twemoji@17.0.2/assets/svg/';
const emojiSvgCache = new Map();

function escapeXml(value) {
        return String(value)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&apos;');
}

function normalizeText(value) {
        return String(value || '')
                .replace(/\r/g, '')
                .replace(/\n+/g, ' ')
                .replace(/\s+/g, ' ')
                .trim()
                .slice(0, MAX_TEXT_LENGTH);
}

function parseSmemeText(query = '') {
        const parts = String(query).split('|', 2);
        if (parts.length === 1) {
                // Satu teks diperlakukan sebagai teks bawah, seperti caption meme.
                return { top: '', bottom: normalizeText(parts[0]) };
        }
        return {
                top: normalizeText(parts[0]),
                bottom: normalizeText(parts[1]),
        };
}

function getFontSize(text) {
        const length = [...text].length;
        if (length <= 12) return 54;
        if (length <= 20) return 46;
        if (length <= 30) return 38;
        if (length <= 45) return 31;
        return 25;
}

function codePointToEmoji(codePoint) {
        return codePoint
                .split('-')
                .map(part => twemoji.convert.fromCodePoint(part))
                .join('');
}

function splitTextTokens(text) {
        const tokens = [];
        const codePoints = [];
        const markerPrefix = 'SMEME_EMOJI_';
        const marked = twemoji.parse(String(text), {
                callback: codePoint => {
                        const index = codePoints.push(codePoint) - 1;
                        return `${markerPrefix}${index}`;
                },
        });
        const markerPattern = new RegExp(
                `<img\\b[^>]*\\bsrc="${markerPrefix}(\\d+)"[^>]*\\/?>`,
                'g'
        );
        let cursor = 0;
        let match;

        while ((match = markerPattern.exec(marked))) {
                if (match.index > cursor) {
                        tokens.push({ type: 'text', value: marked.slice(cursor, match.index) });
                }
                const index = Number(match[1]);
                tokens.push({ type: 'emoji', codePoint: codePoints[index] || '' });
                cursor = match.index + match[0].length;
        }

        if (cursor < marked.length) {
                tokens.push({ type: 'text', value: marked.slice(cursor) });
        }

        return tokens.filter(token => token.type === 'emoji' ? token.codePoint : token.value);
}

async function getEmojiSvg(codePoint) {
        if (!codePoint) return null;
        if (emojiSvgCache.has(codePoint)) return emojiSvgCache.get(codePoint);

        const request = axios.get(`${TWEMOJI_BASE_URL}${codePoint}.svg`, {
                responseType: 'arraybuffer',
                timeout: 8000,
                maxContentLength: 256 * 1024,
        }).then(response => Buffer.from(response.data))
                .catch(error => {
                        emojiSvgCache.delete(codePoint);
                        console.warn(`[Smeme] Emoji ${codePoint} tidak bisa diambil: ${error.message}`);
                        return null;
                });

        emojiSvgCache.set(codePoint, request);
        return request;
}

function estimateTextWidth(value, fontSize) {
        // DejaVu Sans is the reliable fallback when Impact is not installed.
        // Use a conservative width so the following colored emoji never
        // overlaps the last letter of the meme text.
        return Math.max(fontSize * 0.25, [...String(value)].length * fontSize * 0.68);
}

async function makeTextSvg(top, bottom, watermark, width, height) {
        const lines = [];
        const addText = async (text, y) => {
                if (!text) return;
                const baseFontSize = getFontSize(text);
                const tokens = splitTextTokens(text);
                const preparedTokens = await Promise.all(tokens.map(async token => ({
                        ...token,
                        svg: token.type === 'emoji'
                                ? await getEmojiSvg(token.codePoint)
                                : null,
                })));
                const baseWidth = preparedTokens.reduce(
                        (sum, token) => sum + (token.type === 'emoji'
                                ? baseFontSize
                                : estimateTextWidth(token.value, baseFontSize)),
                        0
                ) + Math.max(0, preparedTokens.length - 1) * TOKEN_GAP;
                const fontSize = Math.max(
                        18,
                        Math.floor(baseFontSize * Math.min(1, (width - 16) / Math.max(baseWidth, 1)))
                );
                for (const token of preparedTokens) {
                        token.width = token.type === 'emoji'
                                ? fontSize
                                : estimateTextWidth(token.value, fontSize);
                }
                const totalWidth = preparedTokens.reduce((sum, token) => sum + token.width, 0);
                let cursor = Math.max(8, (width - totalWidth) / 2);
                const strokeWidth = Math.max(4, Math.round(fontSize / 8));

                for (const token of preparedTokens) {
                        const centerX = cursor + token.width / 2;
                        if (token.type === 'emoji' && token.svg) {
                                const encodedSvg = token.svg.toString('base64');
                                lines.push(
                                        `<image x="${Math.round(cursor)}" y="${Math.round(y - fontSize * 0.5)}" ` +
                                        `width="${Math.round(token.width)}" height="${Math.round(fontSize)}" ` +
                                        `preserveAspectRatio="xMidYMid meet" href="data:image/svg+xml;base64,${encodedSvg}"/>`
                                );
                        } else {
                                const safeText = escapeXml(
                                        token.type === 'emoji'
                                                ? codePointToEmoji(token.codePoint)
                                                : token.value.toUpperCase()
                                );
                                lines.push(
                                        `<text x="${Math.round(centerX)}" y="${y}" text-anchor="middle" ` +
                                        `font-family="Impact, Haettenschweiler, Arial Narrow, Noto Emoji, sans-serif" ` +
                                        `font-size="${fontSize}px" font-weight="900" fill="#ffffff" ` +
                                        `stroke="#000000" stroke-width="${strokeWidth}" ` +
                                        `stroke-linejoin="round" paint-order="stroke" dominant-baseline="middle">${safeText}</text>`
                                );
                        }
                        cursor += token.width + TOKEN_GAP;
                }
        };

        await addText(top, Math.max(42, height * 0.1));
        await addText(bottom, Math.min(height - 30, height * 0.9));

        if (watermark) {
                const safeWatermark = escapeXml(watermark);
                lines.push(
                        `<text x="${width - 10}" y="${height - 9}" text-anchor="end" ` +
                        `font-family="Arial, sans-serif" font-size="15px" font-weight="700" ` +
                        `fill="#ffffff" fill-opacity="0.92" stroke="#000000" stroke-opacity="0.8" ` +
                        `stroke-width="3" stroke-linejoin="round" paint-order="stroke">${safeWatermark}</text>`
                );
        }

        return Buffer.from(
                `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" ` +
                `xmlns="http://www.w3.org/2000/svg">${lines.join('')}</svg>`
        );
}

async function renderMemeSticker(imageBuffer, text, watermark = '') {
        const image = sharp(imageBuffer, { animated: false }).rotate().ensureAlpha();
        const { data, info } = await image
                .resize(512, 512, {
                        fit: 'contain',
                        background: { r: 0, g: 0, b: 0, alpha: 0 },
                })
                .png()
                .toBuffer({ resolveWithObject: true });

        const overlay = await makeTextSvg(text.top, text.bottom, watermark, info.width, info.height);
        const rendered = await sharp(data)
                .composite([{ input: overlay }])
                .webp({ quality: 88, effort: 4 })
                .toBuffer();

        if (rendered.length <= MAX_STICKER_BYTES) return rendered;
        return sharp(data)
                .composite([{ input: overlay }])
                .webp({ quality: 65, effort: 6 })
                .toBuffer();
}

function isSupportedType(type) {
        return type === 'imageMessage' || type === 'stickerMessage';
}

async function handleSmeme({
        hisoka,
        m,
        query,
        tolak,
        logCommand,
        loadConfig,
        getMediaTypeFromMessage,
        downloadMediaBuffer,
        getQuotedMediaBuffer,
}) {
        const pfx = m.prefix || '.';
        try {
                const text = parseSmemeText(query);
                if (!text.top && !text.bottom) {
                        await tolak(
                                hisoka,
                                m,
                                `╭═══『 🖼️ *SMEME* 』═══╮\n│\n` +
                                `│ Buat sticker meme dari gambar/sticker.\n│\n` +
                                `│ 📋 *Cara pakai:*\n` +
                                `│ • Kirim gambar + caption:\n│   ${pfx}smeme teks\n` +
                                `│ • Reply gambar/sticker:\n│   ${pfx}smeme teks atas|teks bawah\n│\n` +
                                `│ Contoh: ${pfx}smeme Wily|kun\n` +
                                `│ Teks pertama = atas, kedua = bawah.\n` +
                                `│ WM otomatis dari config.json.\n` +
                                `╰══════════════════════╯`
                        );
                        logCommand(m, hisoka, m.command || 'smeme');
                        return;
                }

                const currentType = getMediaTypeFromMessage(m);
                const quotedType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';
                const useCurrent = m.isMedia && isSupportedType(currentType);
                const useQuoted = m.isQuoted && isSupportedType(quotedType);

                if (!useCurrent && !useQuoted) {
                        await tolak(hisoka, m, `❌ Kirim atau reply *gambar/sticker* dengan caption *${pfx}smeme teks*.`);
                        return;
                }

                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                const source = useCurrent
                        ? await downloadMediaBuffer(hisoka, m)
                        : await getQuotedMediaBuffer(hisoka, m);

                if (!source?.length) {
                        throw new Error('Media tidak berhasil diunduh');
                }

                const config = loadConfig();
                const stickerConfig = config.sticker || {};
                const watermark = [stickerConfig.pack, stickerConfig.author]
                        .map(value => String(value || '').trim())
                        .filter(Boolean)
                        .join(' · ')
                        .slice(0, 80);
                const stickerBuffer = await renderMemeSticker(source, text, watermark);
                const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
                const sticker = new Sticker(stickerBuffer, {
                        pack: stickerConfig.pack || 'WhatsApp Bot',
                        author: stickerConfig.author || 'Wilykun',
                        type: StickerTypes.FULL,
                        categories: ['😂'],
                        id: 'com.wilykun.smeme',
                        quality: 90,
                });

                await hisoka.sendMessage(
                        m.from,
                        { sticker: await sticker.toBuffer() },
                        { quoted: m }
                );
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, m.command || 'smeme');
        } catch (error) {
                console.error('\x1b[31m[Smeme] Error:\x1b[39m', error.message);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                await tolak(hisoka, m, `❌ Gagal membuat smeme: ${error.message}`);
        }
}

module.exports = {
        handleSmeme,
        parseSmemeText,
        renderMemeSticker,
};