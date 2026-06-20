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
 *  message.js — Handler utama semua command bot
 *  134 command tersedia, guard jadibot & owner
 * ───────────────────────────────
 */
'use strict';

import fs from 'fs';
import path from 'path';
import os from 'os';
import { PassThrough } from 'stream';
import { createRequire } from 'module';
const _require = createRequire(import.meta.url);
const { isJidGroup, downloadMediaMessage, getContentType, generateWAMessageFromContent, generateWAMessageContent, prepareWAMessageMedia, proto, jidDecode, jidNormalizedUser } = _require('@whiskeysockets/baileys');
import crypto from 'crypto';
import { exec } from 'child_process';
import util from 'util';

import { msToTime, loadConfig, saveConfig, getCaseName, getCaseGroups, getAIPersonaName, getAIPersonaGreeting } from '../helper/utils.js';
import { BROWSER_LIST } from '../../name_perangkat_tertautan.js';
import { stopAutoCleaner, restartAutoCleaner, cleanStaleSessionFiles, clearOldFiles, clearTmpFolder } from '../helper/cleaner.js';
import { getUptimeFormatted, getBotStats } from '../db/botStats.js';
import { logError, formatErrorReport, clearErrors, generateErrorFileTxt, getInfoErrorTxtPath, getErrorStats } from '../db/errorLog.js';
import { startJadibot, startJadibotQR, stopJadibot, jadibotMap, jadibotClearSesiMap, jadibotSesiReportMap, jadibotConnectedAt, pendingJadibotChoices, formatPairingCode, maskNumber, parseJadibotDuration, getJadibotExpiry, formatRemainingTime, getJadibotExpirySummary, cleanupExpiredJadibots, removeJadibotExpiry, setPermanentJadibot, ensureJadibotExpiry, extendJadibotExpiry, scheduleJadibotExpiry, startJadibotAutoOnline } from '../helper/jadibot.js';
import { hasViewOnceCache, getViewOnceCache } from '../helper/voCache.js';
import { isAntiTagSWEnabled, toggleAntiTagSW, resetWarnings, getWarnings, getAllAntiTagSWGroups, getAntiTagSWLog, clearAntiTagSWLog, resolveLidFromContacts } from './antitagsw.js';
// yg bawah pindah ke sini
import { injectMessage } from '../helper/inject.js';
import listenEvent from './event.js';
import gemini from '../helper/gemini.js';
import { updateUserName, getUserName } from '../db/userDb.js';
import { loadUserMemory, detectAndUpdateMemory, clearUserMemory, clearAllUserMemory, memoryToReadable } from '../helper/userMemory.js';
import { searchAndGetImage, searchAndGetImages, extractImagesFromText } from '../helper/imageSearch.js';
import { extractSongsFromText, extractVideosFromText, extractReplyStickersFromText, extractTikTokFromText, extractInstagramFromText, extractYouTubeAudioFromText, hasMediaDownloadMarker, hasSocialDLMarker, hasStickerMarker, extractVoiceNotesFromText, extractStickersFromText } from '../helper/aiTools.js';
import { getHistory, addToHistory, clearHistory, clearAllHistory, countHistory, getSessionKey, buildHistoryMeta, wrapCurrentUserMessage } from '../db/aiHistory.js';
import { kvGet } from '../db/datadb.js';
import { sendAIReply } from '../helper/aiReact.js';
import { buildSmartAlbumCaptionPrompt, buildSmartImageHistoryPrompt, buildSmartImageWaitPrompt, buildWilyAICommandPrompt, buildWilyFallbackUserPrompt, buildWilyMediaUserPrompt, buildWilyVisionContextPrompt, buildVideoDownloadCaptionPrompt, buildStickerAnalysisExtractionPrompt } from '../helper/aiPrompt.js';
import { buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount } from '../helper/AiPromptIg.js';
import { buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption, parseFbMetaHtml, formatFbCount } from '../helper/AiPromptFb.js';
import { hashSticker, lookupSticker, saveSticker, incrementStickerSeen, buildStickerContextHint, getStickerMemoryStats } from '../helper/stickerMemory.js';
import { getJadibotAntidel, getJadibotReadsw, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, setJadibotUserSetting, getJadibotNumber, addJadibotEmojis, deleteJadibotEmojis, listJadibotEmojis, getJadibotEmojiMode, setDefaultEmojiMode, setCustomEmojiMode, resetToDefaultEmojis, clearJadibotEmojis } from '../helper/jadibotSettings.js';
import { pruneSwStatsAt, countActiveSW } from '../helper/swtrack.js';
import { getHandler } from '../helper/hotReload.js';
const { makeWmSticker, handleWmCommand } = _require('../scrape/tools/wm.cjs');
const { makeCekautoHelpers: _makeCekautoHelpers } = _require(path.resolve('./src/scrape/tools/cekauto-cmd.cjs'));
const { resolveThumbnailMedia, startTyping, makeInteractiveMsg: _makeInteractiveMsg } = _require(path.resolve('./src/scrape/helper/interactive-msg.cjs'));
const { AI_MEDIA_CACHE_TTL, AI_MEDIA_TYPES, ensureAIMediaCache, rememberAIMedia, getQuotedStanzaId, getCachedQuotedMedia, unwrapMessagePayload, getMediaTypeFromMessage, downloadMediaBuffer, getQuotedMediaBuffer, getMediaInfo } = _require(path.resolve('./src/scrape/helper/media-helper.cjs'));
const { makeLogCmd: _makeLogCmd } = _require(path.resolve('./src/scrape/helper/log-cmd.cjs'));
const { normalizeJadibotNumber } = _require(path.resolve('./src/scrape/tools/jadibot-cmd.cjs'));
const { formatAlqLinkMsg, pickBestAlqLink, getAllAlqLinksByPriority } = _require(path.resolve('./src/scrape/anime/alqolam-helpers.cjs'));
const { detectImageSearchQuery, extractImageCount, cleanImageTitle, makeWilyHelpers: _makeWilyHelpers } = _require(path.resolve('./src/scrape/ai/wily-helpers.cjs'));

const WILY_VERBOSE_LOGS = process.env.WILY_VERBOSE_LOGS === 'true' || process.env.BOT_DEBUG_LOG === 'true';
const wilyLog = (...args) => {
        if (WILY_VERBOSE_LOGS) console.log(...args);
};
const wilyError = (...args) => {
        if (WILY_VERBOSE_LOGS) console.error(...args);
};

const tolak = async (_hydro, m, teks) => await m.reply(teks);

// ── Initialize interactive message helpers ──
const { listbut2, sendConfirmWithButtons, sendAudioWithButtons } = _makeInteractiveMsg({ loadConfig, tolak });

// ── Initialize log command helpers ──
const { logCommand } = _makeLogCmd({ maskNumber });

// ── Initialize AI image/media helpers from wily-helpers.cjs ──
const {
    buildSmartImageWaitText, buildSmartAlbumCaptions, sendImageAlbum,
    buildSmartImageHistoryReply, ensureYtdlp, processAIMediaAndSend,
} = _makeWilyHelpers({
    gemini, buildSmartImageWaitPrompt, buildSmartAlbumCaptionPrompt, buildSmartImageHistoryPrompt,
    rememberAIMedia, sendAIReply, tolak,
    extractImagesFromText, hasStickerMarker, extractStickersFromText, extractReplyStickersFromText,
    extractVoiceNotesFromText, extractSongsFromText, extractVideosFromText, extractYouTubeAudioFromText,
    extractTikTokFromText, extractInstagramFromText, hasMediaDownloadMarker, hasSocialDLMarker,
    wilyLog, wilyError,
});

// ── Initialize cekauto helpers from cekauto-cmd.cjs ──
const {
    CEKAUTO_FITUR_LIST, CEKAUTO_GROUP_FITUR_LIST,
    getFeatureTimestamp, saveCekautoTimestamp, formatRelativeTime,
    getActiveGroupsForFeature, disableFeatureForGroup, disableFeatureForAllGroups,
    sendCekautoGrupSelectMsg, sendCekautoGrupMsg, sendCekautoMsg,
    handleCekauto: _handleCekautoFn,
} = _makeCekautoHelpers({
    loadConfig, saveConfig, getAllAntiTagSWGroups, toggleAntiTagSW, isAntiTagSWEnabled,
    sendConfirmWithButtons, tolak,
});

const pendingPlayChoices = new Map();
const pendingMusikaiCache  = new Map(); // key → { results, params, ts }
const pendingMusikai2Cache = new Map(); // key → { results, params, ts } (musikai2)
const pendingAlqDlChoices = new Map();
const pendingAlqUpdateChoices = new Map();
const pendingCosplayChoices = new Map();
const pendingKomikChoices = new Map();

const aiReplyCooldown = new Map(); // sender → last reply timestamp
const AI_COOLDOWN_MS = 3000; // 3 detik cooldown per user

function isAICooldown(sender) {
    const last = aiReplyCooldown.get(sender);
    if (!last) return false;
    return (Date.now() - last) < AI_COOLDOWN_MS;
}

function setAICooldown(sender) {
    aiReplyCooldown.set(sender, Date.now());
    setTimeout(() => aiReplyCooldown.delete(sender), AI_COOLDOWN_MS + 500);
}

function parseYtdlpError(stderr, fallback) {
    if (!stderr) return fallback || 'Unknown error';
    const errorLine = stderr.split('\n').find(l => l.trim().startsWith('ERROR:'));
    if (errorLine) {
        return errorLine.replace(/^ERROR:\s*/, '').replace(/^\[youtube\]\s*[^:]+:\s*/, '').trim();
    }
    return fallback || stderr.substring(0, 150);
}


function getSenderNumber(m) {
    if (m.key?.participant) return m.key.participant.split('@')[0];
    if (m.key?.remoteJid) return m.key.remoteJid.split('@')[0];
    return null;
}

function getJadibotChoiceKey(m) {
    const sender = m.key?.participant || m.key?.remoteJid || m.sender || '';
    const chat   = m.key?.remoteJid || m.from || '';
    return `${chat}::${sender}`;
}

function isMainBot(hisoka) {
    return hisoka?.isMainBot !== false;
}

function isNoSpaceError(error) {
    if (!error) return false;
    const code = error.code || '';
    const msg  = (error.message || String(error)).toLowerCase();
    return code === 'ENOSPC' || msg.includes('no space left') || msg.includes('enospc');
}

async function cleanupWritePressure() {
    try {
        await clearTmpFolder();
    } catch (_) {}
    try {
        await clearOldFiles();
    } catch (_) {}
}

async function getUserProfilePictureUrl(hisoka, jid) {
    try {
        return await hisoka.profilePictureUrl(jid, 'image');
    } catch (_) {
        return null;
    }
}


class Button {
    constructor() {
        this._title = '';
        this._subtitle = '';
        this._body = '';
        this._footer = '';
        this._beton = [];
        this._data = undefined;
        this._contextInfo = {};
        this._currentSelectionIndex = -1;
        this._currentSectionIndex = -1;
        this._type = 0;
        this._betonOld = [];
        this._params = {};
    }
    setVideo(path, options = {}) {
        Buffer.isBuffer(path) ? this._data = { video: path, ...options } : this._data = { video: { url: path }, ...options };
        return this;
    }
    setImage(path, options = {}) {
        Buffer.isBuffer(path) ? this._data = { image: path, ...options } : this._data = { image: { url: path }, ...options };
        return this;
    }
    setDocument(path, options = {}) {
        Buffer.isBuffer(path) ? this._data = { document: path, ...options } : this._data = { document: { url: path }, ...options };
        return this;
    }
    setMedia(obj) {
        if (typeof obj === 'object' && !Array.isArray(obj)) { this._data = obj; } else { return 'Type of media must be an Object'; }
        return this;
    }
    setTitle(title) { this._title = title; return this; }
    setSubtitle(subtitle) { this._subtitle = subtitle; return this; }
    setBody(body) { this._body = body; return this; }
    setFooter(footer) { this._footer = footer; return this; }
    setContextInfo(obj) {
        if (typeof obj === 'object' && !Array.isArray(obj)) { this._contextInfo = obj; } else { return 'Type of contextInfo must be an Object'; }
        return this;
    }
    setParams(obj) {
        if (typeof obj === 'object' && !Array.isArray(obj)) { this._params = obj; } else { return 'Type of params must be an Object'; }
        return this;
    }
    setButton(name, params) { this._beton.push({ name, buttonParamsJson: JSON.stringify(params) }); return this; }
    setButtonV2(params) { this._betonOld.push(params); return this; }
    makeRow(header = '', title = '', description = '', id = '') {
        if (this._currentSelectionIndex === -1 || this._currentSectionIndex === -1) throw new Error('You need to create a selection and a section first');
        const buttonParams = JSON.parse(this._beton[this._currentSelectionIndex].buttonParamsJson);
        buttonParams.sections[this._currentSectionIndex].rows.push({ header, title, description, id });
        this._beton[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams);
        return this;
    }
    makeSections(title = '', highlight_label = '') {
        if (this._currentSelectionIndex === -1) throw new Error('You need to create a selection first');
        const buttonParams = JSON.parse(this._beton[this._currentSelectionIndex].buttonParamsJson);
        buttonParams.sections.push({ title, highlight_label, rows: [] });
        this._currentSectionIndex = buttonParams.sections.length - 1;
        this._beton[this._currentSelectionIndex].buttonParamsJson = JSON.stringify(buttonParams);
        return this;
    }
    addSelection(title) {
        this._beton.push({ name: 'single_select', buttonParamsJson: JSON.stringify({ title, sections: [] }) });
        this._currentSelectionIndex = this._beton.length - 1;
        this._currentSectionIndex = -1;
        return this;
    }
    addReply(display_text = '', id = '') { this._beton.push({ name: 'quick_reply', buttonParamsJson: JSON.stringify({ display_text, id }) }); return this; }
    addReplyV2(displayText = 'Nixel', buttonId = 'Nixel') { this._betonOld.push({ buttonId, buttonText: { displayText }, type: 1 }); this._type = 1; return this; }
    addCall(display_text = '', id = '') { this._beton.push({ name: 'cta_call', buttonParamsJson: JSON.stringify({ display_text, id }) }); return this; }
    addUrl(display_text = '', url = '', merchant_url = '') { this._beton.push({ name: 'cta_url', buttonParamsJson: JSON.stringify({ display_text, url, merchant_url }) }); return this; }
    addCopy(display_text = '', copy_code = '', id = '') { this._beton.push({ name: 'cta_copy', buttonParamsJson: JSON.stringify({ display_text, copy_code, id }) }); return this; }
    async run(jid, conn, quoted = '') {
        if (this._type === 0) {
            const message = {
                body: { text: this._body },
                footer: { text: this._footer },
                header: {
                    title: this._title,
                    subtitle: this._subtitle,
                    hasMediaAttachment: !!this._data,
                    ...(this._data ? await prepareWAMessageMedia(this._data, { upload: conn.waUploadToServer }) : {})
                }
            };
            const msg = generateWAMessageFromContent(jid, {
                interactiveMessage: {
                    ...message,
                    contextInfo: this._contextInfo,
                    nativeFlowMessage: {
                        messageParamsJson: JSON.stringify(this._params),
                        buttons: this._beton
                    }
                }
            }, { quoted });
            await conn.relayMessage(msg.key.remoteJid, msg.message, {
                messageId: msg.key.id,
                additionalNodes: [{
                    tag: 'biz',
                    attrs: {},
                    content: [{
                        tag: 'interactive',
                        attrs: { type: 'native_flow', v: '1' },
                        content: [{ tag: 'native_flow', attrs: { v: '9', name: 'mixed' } }]
                    }]
                }]
            });
            return msg;
        } else {
            return await conn.sendMessage(jid, {
                ...(this._data ? this._data : {}),
                [this._data ? 'caption' : 'text']: this._body,
                title: (!!this._data ? null : this._title),
                footer: this._footer,
                viewOnce: true,
                contextInfo: this._contextInfo,
                buttons: [
                    ...this._betonOld,
                    ...this._beton.map(b => ({
                        buttonId: 'id',
                        buttonText: { displayText: 'btn' },
                        type: 1,
                        nativeFlowInfo: { name: b.name, paramsJson: b.buttonParamsJson }
                    }))
                ]
            }, { quoted });
        }
    }
}

// ── ZIP FILE PARSER (pure Node.js, no external lib) ──

const pendingAturBrowser = new Map();
const listAturBrowserMap = new Map();

const TOTAL_CMD_COUNT = (() => {
        try {
                const _src = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
                return (_src.match(/^\s*case\s+'[^']+'\s*:\s*\{/gm) || []).length;
        } catch { return 0; }
})();

export default async function ({ message, type: messagesType }, hisoka) {
        let m;
        try {
                m = await injectMessage(hisoka, message);

                if (!m || !m.message) return;

                // Blokir semua pesan dari channel/saluran WhatsApp — bot tidak merespons di saluran
                if (m.from?.endsWith('@newsletter')) return;

                await listenEvent(m, hisoka);

                const quoted = m.isMedia ? m : m.isQuoted ? m.quoted : m;
                const text = m.text;
                const query = m.query || quoted.query;

                if (!m.key) return;

                // Simpan nama user ke DB per-user
                if (m.sender && m.pushName) {
                        updateUserName(m.sender, m.pushName);
                }
                // Blokir SEMUA pesan yang dikirim oleh bot sendiri (fromMe + ID 3EB0)
                // — bot tidak boleh memproses pesannya sendiri sebagai command apapun
                if (m.isBot) return;
                // Blokir pesan dari device lain (sinkronisasi) kecuali ada command
                if (messagesType === 'append' && !m.command) return;

                // AutoSimi (Gemini AI - tanpa API key, vision support)
                if (!m.text?.startsWith('.')) {
                        try {
                                const config = loadConfig();
                                const autoSimi = config.autoSimi || {};

                                if (autoSimi.enabled) {
                                        const botId = hisoka.user?.id || '';
                                        const botNumber = botId.split(':')[0] || botId.split('@')[0];
                                        const botJid = botNumber + '@s.whatsapp.net';
                                        const botLid = hisoka.user?.lid || '';

                                        const mentionedJids = m.mentions ||
                                                m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
                                                m.message?.imageMessage?.contextInfo?.mentionedJid ||
                                                m.message?.videoMessage?.contextInfo?.mentionedJid ||
                                                m.message?.stickerMessage?.contextInfo?.mentionedJid ||
                                                m.content?.contextInfo?.mentionedJid ||
                                                [];

                                        const isBotMentioned = mentionedJids.some(jid => {
                                                if (!jid) return false;
                                                const jidNumber = jid.split(':')[0]?.split('@')[0] || jid.split('@')[0];
                                                return jid === botJid ||
                                                        jid === botId ||
                                                        jid === botLid ||
                                                        jid?.includes(botNumber) ||
                                                        jidNumber === botNumber;
                                        }) || m.text?.includes('@' + botNumber);

                                        const quotedCtxParticipantAutoSimi = (m.content?.contextInfo?.participant || '').split('@')[0].split(':')[0];
                                        const _quotedStanzaIdAS = m.content?.contextInfo?.stanzaId || '';
                                        const _cachedQuotedAS = _quotedStanzaIdAS ? hisoka.cacheMsg?.get(_quotedStanzaIdAS) : null;
                                        const botLidNum = (botLid || '').split('@')[0].split(':')[0];
                                        const isReplyToBot = m.isQuoted && (
                                                m.quoted?.key?.fromMe === true ||
                                                (botNumber && quotedCtxParticipantAutoSimi === botNumber) ||
                                                (botLidNum && quotedCtxParticipantAutoSimi === botLidNum) ||
                                                (_cachedQuotedAS?.key?.fromMe === true)
                                        );

                                        if ((isBotMentioned || isReplyToBot) && !m.key?.fromMe) {
                                                if (isAICooldown(m.sender)) return;

                                                let userMessage = m.text?.trim() || '';
                                                if (userMessage) {
                                                        userMessage = userMessage.replace(/@\d+/g, '').replace(/@bot/gi, '').trim();
                                                }

                                                // Deteksi media di pesan saat ini atau di pesan yang di-reply
                                                let imageBuffer = null;
                                                let imageMime = 'image/jpeg';
                                                let hasMedia = false;
                                                let mediaLabel = '';

                                                const currentType = getMediaTypeFromMessage(m);
                                                const quotedType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

                                                // Coba ambil gambar/sticker dari pesan saat ini
                                                if (currentType === 'imageMessage' || currentType === 'stickerMessage') {
                                                        try {
                                                                imageBuffer = await m.downloadMedia();
                                                                imageMime = currentType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                                hasMedia = true;
                                                                mediaLabel = currentType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        } catch (_) {
                                                                // Download gagal, tetap tandai media agar AI bisa merespons dengan konteks
                                                                hasMedia = true;
                                                                mediaLabel = currentType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        }
                                                } else if (currentType === 'videoMessage') {
                                                        hasMedia = true;
                                                        mediaLabel = 'video';
                                                }

                                                // Kalau tidak ada di pesan saat ini, coba dari pesan yang di-reply
                                                if (!imageBuffer && m.isQuoted) {
                                                        const qt = quotedType;
                                                        if (qt === 'imageMessage' || qt === 'stickerMessage' || qt === 'albumMessage') {
                                                                try {
                                                                        const cached = getCachedQuotedMedia(hisoka, m);
                                                                        imageBuffer = await getQuotedMediaBuffer(hisoka, m);
                                                                        if (imageBuffer?.length > 0) {
                                                                                const info = getMediaInfo(qt, m.quoted, cached);
                                                                                imageMime = info.mime;
                                                                                hasMedia = true;
                                                                                mediaLabel = info.label;
                                                                        } else {
                                                                                hasMedia = true;
                                                                                mediaLabel = qt === 'stickerMessage' ? 'sticker' : 'gambar';
                                                                        }
                                                                } catch (_) {
                                                                        hasMedia = true;
                                                                        mediaLabel = qt === 'stickerMessage' ? 'sticker' : 'gambar';
                                                                }
                                                        } else if (qt === 'videoMessage') {
                                                                hasMedia = true;
                                                                mediaLabel = 'video';
                                                        }
                                                }

                                                const hasSticker = mediaLabel === 'sticker';
                                                const isImageReply = isReplyToBot && hasMedia && mediaLabel !== 'video';
                                                const isStickerReply = isReplyToBot && hasSticker;

                                                // Kalau tidak ada teks dan tidak ada gambar, kasih pesan default
                                                if (!userMessage && !hasMedia) {
                                                        userMessage = buildWilyFallbackUserPrompt(currentType);
                                                }

                                                if (!userMessage && hasMedia) {
                                                        userMessage = buildWilyMediaUserPrompt({
                                                                mediaLabel,
                                                                hasSticker,
                                                                isStickerReply,
                                                                mode: 'short',
                                                        });
                                                }

                                                // ── DETEKSI PERMINTAAN CARI GAMBAR di AutoSimi ──
                                                if (userMessage && !hasMedia) {
                                                        const autoImgQuery = detectImageSearchQuery(userMessage);
                                                        if (autoImgQuery) {
                                                                try {
                                                                        await tolak(hisoka, m, await buildSmartImageWaitText({
                                                                                userName: getUserName(m.sender, m.pushName || 'Kak'),
                                                                                userQuestion: userMessage,
                                                                                query: autoImgQuery,
                                                                                count: 1,
                                                                        }));
                                                                        const imgResult = await searchAndGetImage(autoImgQuery);
                                                                        const sentImage = await hisoka.sendMessage(m.from, {
                                                                                image: imgResult.buffer,
                                                                                caption: `🖼️ *${imgResult.title || autoImgQuery}*\n🔗 ${imgResult.url}`
                                                                        }, { quoted: m });
                                                                        rememberAIMedia(hisoka, sentImage, [{
                                                                                buffer: imgResult.buffer,
                                                                                mime: 'image/jpeg',
                                                                                label: 'gambar',
                                                                                caption: imgResult.title || autoImgQuery,
                                                                        }]);
                                                                        console.log(`\x1b[36m[AutoGemini]\x1b[39m Image search: "${autoImgQuery}" by ${m.pushName}`);
                                                                } catch (se) {
                                                                        console.error(`\x1b[31m[AutoGemini]\x1b[39m Image search error: ${se.message}`);
                                                                        await tolak(hisoka, m, `❌ Maaf, gagal nyariin gambar "${autoImgQuery}". Coba lagi nanti ya!`);
                                                                }
                                                                return;
                                                        }
                                                }

                                                const now = new Date();
                                                const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                                const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
                                                const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                                const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                                const userName = getUserName(m.sender, m.pushName || 'Kak');

                                                const quotedBotText = isReplyToBot ? (m.quoted?.text || m.quoted?.caption || '') : '';
                                                const stopTyping_p1 = startTyping(hisoka, m);
                                                const userMemory = detectAndUpdateMemory(m.sender, userMessage);
                                                const systemPrompt = buildWilyAICommandPrompt({
                                                        userName, currentTime, currentDate, timeOfDay,
                                                        personaName: getAIPersonaName(),
                                                        hasHistory: false,
                                                        quotedBotText,
                                                        isPrivate: !m.isGroup,
                                                        isOwner: m.isOwner,
                                                        hasImage: hasMedia,
                                                        isImageReply,
                                                        hasSticker,
                                                        isStickerReply,
                                                        userMessage,
                                                        userMemory,
                                                        sessionKey: getSessionKey(m),
                                                });

                                                // ── STIKER MEMORY: cek DB sebelum kirim ke AI ──
                                                let _stickerHash1 = null;
                                                let _stickerKnown1 = null;
                                                if (hasSticker && imageBuffer?.length > 0) {
                                                        _stickerHash1 = hashSticker(imageBuffer);
                                                        _stickerKnown1 = lookupSticker(_stickerHash1);
                                                        if (_stickerKnown1) {
                                                                const hint = buildStickerContextHint(_stickerKnown1);
                                                                if (hint) userMessage = hint + '\n\n' + (userMessage || '');
                                                                incrementStickerSeen(_stickerHash1);
                                                        }
                                                }

                                                let response;

                                                if (imageBuffer && imageBuffer.length > 0) {
                                                        // Konversi webp (sticker) ke jpeg agar Gemini bisa baca
                                                        let finalBuffer = imageBuffer;
                                                        let finalMime = imageMime;
                                                        if (imageMime === 'image/webp') {
                                                                try {
                                                                        const sharp = (await import('sharp')).default;
                                                                        finalBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
                                                                        finalMime = 'image/jpeg';
                                                                } catch (_) {}
                                                        }
                                                        const autoVContents = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                { role: 'user', parts: [
                                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                                        { text: userMessage || 'Analisis gambar/sticker ini.' },
                                                                ]},
                                                        ];
                                                        const autoVModels = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest'];
                                                        for (const model of autoVModels) {
                                                                try { response = await gemini.chat({ model, contents: autoVContents }); break; } catch (_) {}
                                                        }
                                                } else {
                                                        const autoContents = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                { role: 'user', parts: [{ text: userMessage }] },
                                                        ];
                                                        response = await gemini.chat({ contents: autoContents });
                                                }

                                                if (response && response.trim()) {
                                                        setAICooldown(m.sender);
                                                        await processAIMediaAndSend(hisoka, m, response.trim(), { sessionKey: getSessionKey(m) });
                                                        console.log(`\x1b[36m[AutoGemini]\x1b[39m Reply to ${userName} (${m.pushName}) in "${m.isGroup ? hisoka.getName(m.from) : 'DM'}" | Trigger: ${isBotMentioned ? 'mention' : 'reply'} | Media: ${hasMedia ? mediaLabel : 'none'}`);

                                                        // ── STIKER MEMORY: simpan analisis stiker baru ke DB (background) ──
                                                        if (hasSticker && imageBuffer?.length > 0 && _stickerHash1 && !_stickerKnown1) {
                                                                (async () => {
                                                                        try {
                                                                                let fbuf = imageBuffer;
                                                                                if (imageMime === 'image/webp') {
                                                                                        try { const sh = (await import('sharp')).default; fbuf = await sh(imageBuffer).jpeg({ quality: 85 }).toBuffer(); } catch (_) {}
                                                                                }
                                                                                const rawJson = await gemini.askWithImage(buildStickerAnalysisExtractionPrompt(), fbuf, 'image/jpeg');
                                                                                const parsed = JSON.parse(rawJson.trim().replace(/```json|```/g, '').trim());
                                                                                saveSticker(_stickerHash1, parsed);
                                                                                console.log(`\x1b[32m[StickerMemory]\x1b[39m Saved: ${_stickerHash1.substring(0, 8)}… → ${parsed.emotion} / ${parsed.category}`);
                                                                        } catch (_) {}
                                                                })();
                                                        }
                                                }
                                        }
                                }

                                // ── WILY AUTO REPLY (tanpa autoSimi) ──
                                // Kalau autoSimi mati tapi wilyAI.autoReply aktif,
                                // bot tetap reply otomatis saat seseorang reply pesan bot
                                if (!autoSimi.enabled) {
                                        const wilyAICfg = config.wilyAI || {};
                                        const isWilyOn = wilyAICfg.enabled !== false;
                                        const isAutoReplyOn = wilyAICfg.autoReply !== false;
                                        const wilyScope = wilyAICfg.scope || 'all';
                                        const scopeAllowPM = wilyScope === 'pm' || wilyScope === 'all';
                                        const scopeAllowGC = wilyScope === 'gc' || wilyScope === 'all';
                                        const wilyBotNum = (hisoka.user?.id || '').split(':')[0]?.split('@')[0] || '';
                                        const wilyBotJid = wilyBotNum + '@s.whatsapp.net';
                                        const wilyBotLidRaw = hisoka.user?.lid || '';
                                        const wilyBotLidNum = wilyBotLidRaw.split('@')[0].split(':')[0];

                                        // Deteksi mention bot (support caption gambar/video/dll)
                                        // Kumpulkan dari SEMUA sumber (bukan || karena [] truthy di JS)
                                        const wilyMentionedJids = Array.from(new Set([
                                                ...(Array.isArray(m.mentions) ? m.mentions : []),
                                                ...(m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.message?.imageMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.message?.videoMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.message?.documentMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.message?.audioMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.message?.stickerMessage?.contextInfo?.mentionedJid || []),
                                                ...(m.content?.contextInfo?.mentionedJid || []),
                                        ])).filter(Boolean);
                                        const isWilyMentioned = wilyMentionedJids.some(jid => {
                                                if (!jid) return false;
                                                const n = jid.split(':')[0]?.split('@')[0] || jid.split('@')[0];
                                                return jid === wilyBotJid ||
                                                        jid === wilyBotLidRaw ||
                                                        n === wilyBotNum ||
                                                        jid?.includes(wilyBotNum) ||
                                                        (wilyBotLidNum && n === wilyBotLidNum); // LID format @lid
                                        }) || !!(m.text?.includes('@' + wilyBotNum));
                                        if (m.isGroup && !m.key?.fromMe && (wilyMentionedJids.length > 0)) {
                                                wilyLog(`\x1b[33m[MentionDebug]\x1b[39m base=${isWilyMentioned} | jids=${JSON.stringify(wilyMentionedJids)} | botNum=${wilyBotNum} | botLidRaw=${wilyBotLidRaw} | botLidNum=${wilyBotLidNum}`);
                                        }

                                        const wilyQuotedParticipant = (m.content?.contextInfo?.participant || '').split('@')[0].split(':')[0];
                                        const _wilyQuotedStanzaId = m.content?.contextInfo?.stanzaId || '';
                                        const _wilyCachedQuoted = _wilyQuotedStanzaId ? hisoka.cacheMsg?.get(_wilyQuotedStanzaId) : null;
                                        const isReplyToBotMsg = m.isQuoted && (
                                                m.quoted?.key?.fromMe === true ||
                                                (wilyBotNum && wilyQuotedParticipant === wilyBotNum) ||
                                                (wilyBotLidNum && wilyQuotedParticipant === wilyBotLidNum) ||
                                                (_wilyCachedQuoted?.key?.fromMe === true)
                                        );

                                        // Fallback: resolve LID mentions ke nomor regular,
                                        // kasus: mention pakai @LIDnumber bukan @628xxx
                                        const _wilyLidResolved = !isWilyMentioned && wilyMentionedJids
                                                .filter(jid => jid?.endsWith('@lid'))
                                                .some(lidJid => {
                                                        try {
                                                                const resolved = resolveLidFromContacts(lidJid);
                                                                return resolved?.number && (
                                                                        resolved.number === wilyBotNum ||
                                                                        resolved.jid?.includes(wilyBotNum)
                                                                );
                                                        } catch (_) { return false; }
                                                });

                                        // Fallback 2: teks pesan hanya berisi @mention (tanpa teks lain)
                                        // dan nomor bot ada di teks asli (sebelum strip)
                                        const _wilyOrigText = m.text?.trim() || '';
                                        const _wilyTextOnlyMention = _wilyOrigText !== '' &&
                                                _wilyOrigText.replace(/@\d+/g, '').trim() === '';
                                        const _wilyTextHasBotNum = _wilyTextOnlyMention &&
                                                _wilyOrigText.includes(wilyBotNum);

                                        // Fallback 3: @everyone / @semua / @all — bot ikut merespons saat ada tagall di grup
                                        const _wilyTagAll = m.isGroup && !!(
                                                m.text?.match(/@(everyone|semua|all|group|grup)\b/i) ||
                                                wilyMentionedJids.some(jid =>
                                                        jid === '0@s.whatsapp.net' ||
                                                        jid?.startsWith('0@') ||
                                                        jid === 'everyone@broadcast'
                                                )
                                        );

                                        const isWilyMentionedFinal = isWilyMentioned || _wilyLidResolved || _wilyTextHasBotNum || _wilyTagAll;

                                        // WilyAutoReply — respek scope: pm=hanya DM, gc=hanya grup, all=keduanya
                                        const isPrivateDM = !m.isGroup && m.from !== 'status@broadcast';
                                        const isStickerMsg = getMediaTypeFromMessage(m) === 'stickerMessage';
                                        // Grup: trigger saat bot di-mention (pesan apapun) ATAU saat ada yang reply pesan bot (pesan apapun)
                                        const triggerGroup = scopeAllowGC && m.isGroup && (isWilyMentionedFinal || isReplyToBotMsg);
                                        // Private: semua pesan yang masuk ke DM (teks, sticker, gambar, video, dll) langsung trigger bot
                                        const triggerPM    = scopeAllowPM && isPrivateDM;
                                        const isLoadedCommand = m.command && !m.isBot && hisoka.loadedCommands?.some(c => c.toLowerCase() === m.command);
                                        if (isLoadedCommand) {
                                                // Command bot harus tetap lanjut ke switch-case, jangan ditahan auto-reply AI/cooldown.
                                        } else if (isWilyOn && isAutoReplyOn && hisoka.isMainBot !== false && (triggerGroup || triggerPM) && !m.key?.fromMe && m.from !== 'status@broadcast') {
                                                if (isAICooldown(m.sender)) {
                                                        return;
                                                }

                                                // Mulai typing SEGERA setelah cooldown check — sebelum download media
                                                const _stopTypingWily = startTyping(hisoka, m);

                                                const userName = getUserName(m.sender, m.pushName || 'Kak');
                                                const now = new Date();
                                                const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                                const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
                                                const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                                const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                                let userMessage = m.text?.trim() || '';
                                                const _wilyMsgBeforeStrip = userMessage;
                                                if (userMessage) {
                                                        userMessage = userMessage.replace(/@\d+/g, '').replace(/@bot/gi, '').trim();
                                                }
                                                // Deteksi: pesan asli hanya berisi @mention tanpa teks lain
                                                const _wilyWasMentionOnly = _wilyMsgBeforeStrip !== '' &&
                                                        userMessage === '' &&
                                                        _wilyMsgBeforeStrip.replace(/@\d+/g, '').trim() === '';

                                                // Deteksi media dari pesan saat ini atau pesan yang di-reply
                                                let imageBuffer = null;
                                                let imageMime = 'image/jpeg';
                                                let hasMedia = false;
                                                let mediaLabel = '';
                                                const curType = getMediaTypeFromMessage(m);
                                                const qtType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

                                                if (curType === 'imageMessage' || curType === 'stickerMessage') {
                                                        try {
                                                                imageBuffer = await m.downloadMedia();
                                                                imageMime = curType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                                hasMedia = true;
                                                                mediaLabel = curType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        } catch (_) {
                                                                // Jika download gagal, tetap tandai hasMedia agar AI tahu ada media
                                                                hasMedia = true;
                                                                mediaLabel = curType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        }
                                                } else if (curType === 'videoMessage') {
                                                        // Deteksi pesan video — bot balas dengan konteks video
                                                        hasMedia = true;
                                                        mediaLabel = 'video';
                                                } else if (m.isQuoted && (qtType === 'imageMessage' || qtType === 'stickerMessage' || qtType === 'albumMessage')) {
                                                        try {
                                                                const cached = getCachedQuotedMedia(hisoka, m);
                                                                imageBuffer = await getQuotedMediaBuffer(hisoka, m);
                                                                if (imageBuffer?.length > 0) {
                                                                        const info = getMediaInfo(qtType, m.quoted, cached);
                                                                        imageMime = info.mime;
                                                                        hasMedia = true;
                                                                        mediaLabel = info.label;
                                                                } else {
                                                                        hasMedia = true;
                                                                        mediaLabel = qtType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                                }
                                                        } catch (_) {
                                                                hasMedia = true;
                                                                mediaLabel = qtType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        }
                                                } else if (m.isQuoted && qtType === 'videoMessage') {
                                                        hasMedia = true;
                                                        mediaLabel = 'video';
                                                }

                                                // Deteksi skenario: user reply pesan bot + kirim gambar sekaligus
                                                const isImageReply = isReplyToBotMsg && hasMedia && mediaLabel !== 'video';
                                                const hasSticker = mediaLabel === 'sticker';
                                                const isStickerReply = isReplyToBotMsg && hasSticker;

                                                if (!userMessage && !hasMedia) {
                                                        const _wilyFallbackType = _wilyTagAll ? 'tagall'
                                                                : _wilyWasMentionOnly ? 'mention-only'
                                                                : curType;
                                                        userMessage = buildWilyFallbackUserPrompt(_wilyFallbackType);
                                                }

                                                if (!userMessage && hasMedia) {
                                                        userMessage = buildWilyMediaUserPrompt({
                                                                mediaLabel,
                                                                hasSticker,
                                                                isStickerReply,
                                                                isImageReply,
                                                                mode: 'identify',
                                                        });
                                                }

                                                // Smart intent untuk gambar+reply dengan pesan pendek
                                                if (isImageReply && userMessage) {
                                                        const shortMsg = userMessage.trim().toLowerCase();
                                                        const intentMap = {
                                                                'ini apa': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                                'apa ini': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                                'apaan ini': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                                'translate': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                                'terjemahin': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                                'terjemahkan': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                                'baca ini': 'Baca dan ekstrak semua teks yang ada di gambar ini.',
                                                                'bacain': 'Baca dan ekstrak semua teks yang ada di gambar ini.',
                                                                'sama ga': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya. Samakah? Jelaskan perbedaan/persamaannya.',
                                                                'sama gak': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya. Samakah? Jelaskan perbedaan/persamaannya.',
                                                                'beda ga': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya dan jelaskan perbedaannya.',
                                                                'beda gak': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya dan jelaskan perbedaannya.',
                                                                'bagus ga': 'Evaluasi dan beri pendapat tentang gambar ini.',
                                                                'bagus gak': 'Evaluasi dan beri pendapat tentang gambar ini.',
                                                                'mirip ga': 'Bandingkan gambar ini dengan konteks percakapan sebelumnya. Miripkah?',
                                                                'mirip gak': 'Bandingkan gambar ini dengan konteks percakapan sebelumnya. Miripkah?',
                                                                'ini bener': 'Periksa kebenaran atau keakuratan apa yang ada di gambar ini.',
                                                                'bener ga': 'Periksa kebenaran atau keakuratan apa yang ada di gambar ini.',
                                                                'jelaskan': 'Jelaskan secara detail apa yang ada di gambar ini.',
                                                                'explain': 'Explain everything in this image in detail.',
                                                                'analisis': 'Analisis gambar ini secara menyeluruh dan mendalam.',
                                                                'analisa': 'Analisis gambar ini secara menyeluruh dan mendalam.',
                                                        };
                                                        for (const [key, intent] of Object.entries(intentMap)) {
                                                                if (shortMsg.includes(key)) {
                                                                        userMessage = intent;
                                                                        break;
                                                                }
                                                        }
                                                }

                                                if (!userMessage) userMessage = 'Halo!';

                                                // Cek apakah ini permintaan cari gambar
                                                const autoImgQuery = !hasMedia ? detectImageSearchQuery(userMessage) : null;
                                                if (autoImgQuery) {
                                                        try {
                                                                const imgCount = Math.min(extractImageCount(userMessage), 5);
                                                                await tolak(hisoka, m, await buildSmartImageWaitText({
                                                                        userName,
                                                                        userQuestion: userMessage,
                                                                        query: autoImgQuery,
                                                                        count: imgCount,
                                                                }));
                                                                let historyReply = '';
                                                                if (imgCount > 1) {
                                                                        const imgResults = await searchAndGetImages(autoImgQuery, imgCount);
                                                                        const captions = await buildSmartAlbumCaptions({
                                                                                userQuestion: userMessage,
                                                                                query: autoImgQuery,
                                                                                images: imgResults,
                                                                        });
                                                                        await sendImageAlbum(hisoka, m, imgResults, captions);
                                                                        historyReply = await buildSmartImageHistoryReply({
                                                                                userQuestion: userMessage,
                                                                                query: autoImgQuery,
                                                                                images: imgResults,
                                                                                captions,
                                                                        });
                                                                } else {
                                                                        const imgResult = await searchAndGetImage(autoImgQuery);
                                                                        const captions = await buildSmartAlbumCaptions({
                                                                                userQuestion: userMessage,
                                                                                query: autoImgQuery,
                                                                                images: [imgResult],
                                                                        });
                                                                        const sentImage = await hisoka.sendMessage(m.from, {
                                                                                image: imgResult.buffer,
                                                                                caption: captions[0] || `🖼️ *${imgResult.title || autoImgQuery}*`
                                                                        }, { quoted: m });
                                                                        rememberAIMedia(hisoka, sentImage, [{
                                                                                buffer: imgResult.buffer,
                                                                                mime: 'image/jpeg',
                                                                                label: 'gambar',
                                                                                caption: captions[0] || imgResult.title || autoImgQuery,
                                                                        }]);
                                                                        historyReply = await buildSmartImageHistoryReply({
                                                                                userQuestion: userMessage,
                                                                                query: autoImgQuery,
                                                                                images: [imgResult],
                                                                                captions,
                                                                        });
                                                                }
                                                                if (isAutoReplyOn && historyReply) {
                                                                        addToHistory(getSessionKey(m), userMessage, historyReply, buildHistoryMeta(m, { mediaLabel: 'gambar' }));
                                                                }
                                                        } catch (se) {
                                                                await tolak(hisoka, m, `❌ Maaf gagal cariin gambar "${autoImgQuery}". Coba lagi ya!`);
                                                        }
                                                        return;
                                                }

                                                // Load history untuk konteks
                                                const sessKey = getSessionKey(m);
                                                const histMsgs = getHistory(sessKey);
                                                const quotedBotText = (m.isQuoted && m.quoted?.key?.fromMe)
                                                        ? (m.quoted?.text || m.quoted?.caption || m.quoted?.body || '')
                                                        : '';
                                                const stopTyping_p2 = startTyping(hisoka, m);
                                                const userMemory = detectAndUpdateMemory(m.sender, userMessage);
                                                const systemPrompt = buildWilyAICommandPrompt({
                                                        userName, currentTime, currentDate, timeOfDay,
                                                        personaName: getAIPersonaName(),
                                                        hasHistory: histMsgs.length > 0,
                                                        quotedBotText,
                                                        isPrivate: !m.isGroup,
                                                        isOwner: m.isOwner,
                                                        hasImage: hasMedia,
                                                        isImageReply,
                                                        hasSticker,
                                                        isStickerReply,
                                                        userMessage,
                                                        history: histMsgs,
                                                        userMemory,
                                                        sessionKey: sessKey,
                                                });
                                                const currentMsgMeta = buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : null });
                                                let contents;
                                                if (histMsgs.length > 0) {
                                                        contents = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                ...histMsgs,
                                                                { role: 'user', parts: [{ text: wrapCurrentUserMessage(userMessage, currentMsgMeta) }] },
                                                        ];
                                                } else {
                                                        contents = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                { role: 'user', parts: [{ text: userMessage }] },
                                                        ];
                                                }

                                                // Bangun teks tambahan konteks untuk vision model pada skenario image-reply
                                                const visionContextText = buildWilyVisionContextPrompt({
                                                        isImageReply,
                                                        isStickerReply,
                                                        quotedBotText,
                                                        hasSticker,
                                                        mediaLabel,
                                                        userMessage,
                                                });

                                                // ── STIKER MEMORY: cek DB sebelum kirim ke AI ──
                                                let _stickerHash2 = null;
                                                let _stickerKnown2 = null;
                                                if (hasSticker && imageBuffer?.length > 0) {
                                                        _stickerHash2 = hashSticker(imageBuffer);
                                                        _stickerKnown2 = lookupSticker(_stickerHash2);
                                                        if (_stickerKnown2) {
                                                                const hint2 = buildStickerContextHint(_stickerKnown2);
                                                                if (hint2) userMessage = hint2 + '\n\n' + (userMessage || '');
                                                                incrementStickerSeen(_stickerHash2);
                                                        }
                                                }

                                                let response;
                                                try {
                                                        if (imageBuffer && imageBuffer.length > 0) {
                                                                let finalBuffer = imageBuffer;
                                                                let finalMime = imageMime;
                                                                if (imageMime === 'image/webp') {
                                                                        try {
                                                                                const sharp = (await import('sharp')).default;
                                                                                finalBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
                                                                                finalMime = 'image/jpeg';
                                                                        } catch (_) {}
                                                                }
                                                                const vModels = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest'];
                                                                if (histMsgs.length > 0) {
                                                                        const vContents = [
                                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                                ...histMsgs,
                                                                                { role: 'user', parts: [
                                                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                                                        { text: wrapCurrentUserMessage(visionContextText, currentMsgMeta) },
                                                                                ]},
                                                                        ];
                                                                        for (const model of vModels) {
                                                                                try { response = await gemini.chat({ model, contents: vContents }); break; } catch (_) {}
                                                                        }
                                                                } else {
                                                                        const vContentsNoHist = [
                                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                                { role: 'user', parts: [
                                                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                                                        { text: visionContextText },
                                                                                ]},
                                                                        ];
                                                                        for (const model of vModels) {
                                                                                try { response = await gemini.chat({ model, contents: vContentsNoHist }); break; } catch (_) {}
                                                                        }
                                                                }
                                                        } else {
                                                                response = await gemini.chat({ contents });
                                                        }

                                                        if (response && response.trim()) {
                                                                setAICooldown(m.sender);
                                                                let autoFinalResponse = response.trim();
                                                                if (hasMedia) {
                                                                        autoFinalResponse = autoFinalResponse.replace(/\[GAMBAR:[^\]]{1,200}\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
                                                                }
                                                                const mediaResult = await processAIMediaAndSend(hisoka, m, autoFinalResponse, { sessionKey: sessKey });
                                                                const cleanResp = mediaResult.sentText;
                                                                addToHistory(sessKey, userMessage, cleanResp || response.trim(), buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : null }));
                                                                const triggerType = isWilyMentioned ? 'Mention' : isReplyToBotMsg ? 'Reply' : 'DM';
                                                                wilyLog(`\x1b[36m[WilyAutoReply]\x1b[39m ${userName} | ${m.isGroup ? 'Grup' : 'Private'} | Trigger: ${triggerType} | Media: ${hasMedia ? mediaLabel : 'tidak ada'}`);

                                                                // ── STIKER MEMORY: simpan analisis stiker baru ke DB (background) ──
                                                                if (hasSticker && imageBuffer?.length > 0 && _stickerHash2 && !_stickerKnown2) {
                                                                        (async () => {
                                                                                try {
                                                                                        let fbuf2 = imageBuffer;
                                                                                        if (imageMime === 'image/webp') {
                                                                                                try { const sh = (await import('sharp')).default; fbuf2 = await sh(imageBuffer).jpeg({ quality: 85 }).toBuffer(); } catch (_) {}
                                                                                        }
                                                                                        const rawJson2 = await gemini.askWithImage(buildStickerAnalysisExtractionPrompt(), fbuf2, 'image/jpeg');
                                                                                        const parsed2 = JSON.parse(rawJson2.trim().replace(/```json|```/g, '').trim());
                                                                                        saveSticker(_stickerHash2, parsed2);
                                                                                        console.log(`\x1b[32m[StickerMemory]\x1b[39m Saved: ${_stickerHash2.substring(0, 8)}… → ${parsed2.emotion} / ${parsed2.category}`);
                                                                                } catch (_) {}
                                                                        })();
                                                                }
                                                        }
                                                } catch (arErr) {
                                                        wilyError('\x1b[31m[WilyAutoReply] Error:\x1b[39m', arErr.message);
                                                } finally {
                                                        _stopTypingWily();
                                                }
                                        }

                                        // ── WILY PRIVATE CHAT AUTO REPLY ──
                                        // Dinonaktifkan — private reply pesan bot sudah dihandle oleh WilyAutoReply di atas
                                        // Bot hanya merespons di private jika user REPLY pesan bot (bukan semua pesan DM)
                                        const isPrivateReplyToBot = m.isQuoted && m.quoted?.key?.fromMe;
                                        if (false) {
                                                const pvUserName = getUserName(m.sender, m.pushName || 'Kak');
                                                const pvNow = new Date();
                                                const pvHours = parseInt(pvNow.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                                const pvTimeOfDay = pvHours < 5 ? 'dini hari' : pvHours < 11 ? 'pagi' : pvHours < 15 ? 'siang' : pvHours < 18 ? 'sore' : 'malam';
                                                const pvCurrentTime = pvNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                                const pvCurrentDate = pvNow.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                                let pvUserMsg = m.text?.trim() || '';

                                                // Deteksi media
                                                let pvImageBuffer = null;
                                                let pvImageMime = 'image/jpeg';
                                                let pvHasMedia = false;
                                                let pvMediaLabel = '';
                                                const pvCurType = m.type || '';
                                                const pvQtType = m.isQuoted ? (m.quoted?.type || '') : '';

                                                if (pvCurType === 'imageMessage' || pvCurType === 'stickerMessage') {
                                                        try {
                                                                pvImageBuffer = await m.downloadMedia();
                                                                pvImageMime = pvCurType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                                pvHasMedia = true;
                                                                pvMediaLabel = pvCurType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        } catch (_) {}
                                                } else if (m.isQuoted && (pvQtType === 'imageMessage' || pvQtType === 'stickerMessage')) {
                                                        try {
                                                                pvImageBuffer = await downloadMediaMessage(
                                                                        { ...m.quoted, message: m.quoted.raw },
                                                                        'buffer', {},
                                                                        { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                                                                );
                                                                if (pvImageBuffer?.length > 0) {
                                                                        pvImageMime = pvQtType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                                        pvHasMedia = true;
                                                                        pvMediaLabel = pvQtType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                                }
                                                        } catch (_) {}
                                                }

                                                const pvHasSticker = pvHasMedia && pvMediaLabel === 'sticker';
                                                const pvIsStickerReply = !!(m.isQuoted && m.quoted?.key?.fromMe && pvHasSticker);
                                                if (!pvUserMsg && pvHasMedia) {
                                                        pvUserMsg = buildWilyMediaUserPrompt({
                                                                mediaLabel: pvMediaLabel,
                                                                hasSticker: pvHasSticker,
                                                                isStickerReply: pvIsStickerReply,
                                                                mode: 'private',
                                                        });
                                                }
                                                if (!pvUserMsg) {
                                                        pvUserMsg = buildWilyFallbackUserPrompt(pvCurType);
                                                }

                                                // Cek permintaan cari gambar
                                                if (!pvHasMedia) {
                                                        const pvImgQ = detectImageSearchQuery(pvUserMsg);
                                                        if (pvImgQ) {
                                                                try {
                                                                        await tolak(hisoka, m, await buildSmartImageWaitText({
                                                                                userName: pvUserName,
                                                                                userQuestion: pvUserMsg,
                                                                                query: pvImgQ,
                                                                                count: 1,
                                                                        }));
                                                                        const pvImgResult = await searchAndGetImage(pvImgQ);
                                                                        await hisoka.sendMessage(m.from, {
                                                                                image: pvImgResult.buffer,
                                                                                caption: `🖼️ *${pvImgResult.title || pvImgQ}*\n🔗 ${pvImgResult.url}`
                                                                        }, { quoted: m });
                                                                } catch (_) {
                                                                        await tolak(hisoka, m, `❌ Maaf gagal cariin gambar "${pvImgQ}". Coba lagi ya!`);
                                                                }
                                                                return;
                                                        }
                                                }

                                                const pvSessKey = getSessionKey(m);
                                                const pvHistMsgs = getHistory(pvSessKey);
                                                // Kalau user reply pesan bot, kirim konteks pesan yang di-reply ke AI
                                                const pvQuotedBotText = (m.isQuoted && m.quoted?.key?.fromMe)
                                                        ? (m.quoted?.text || m.quoted?.caption || '')
                                                        : '';
                                                const stopTyping_pv = startTyping(hisoka, m);
                                                const pvUserMemory = detectAndUpdateMemory(m.sender, pvUserMsg);
                                                const pvSystemPrompt = buildWilyAICommandPrompt({
                                                        userName: pvUserName, currentTime: pvCurrentTime, currentDate: pvCurrentDate, timeOfDay: pvTimeOfDay,
                                                        personaName: getAIPersonaName(),
                                                        hasHistory: pvHistMsgs.length > 0,
                                                        quotedBotText: pvQuotedBotText,
                                                        isPrivate: true,
                                                        isOwner: m.isOwner,
                                                        hasImage: pvHasMedia,
                                                        isImageReply: false,
                                                        hasSticker: pvHasSticker,
                                                        isStickerReply: pvIsStickerReply,
                                                        userMessage: pvUserMsg,
                                                        history: pvHistMsgs,
                                                        userMemory: pvUserMemory,
                                                        sessionKey: pvSessKey,
                                                });

                                                let pvContents;
                                                if (pvHistMsgs.length > 0) {
                                                        pvContents = [
                                                                { role: 'user', parts: [{ text: pvSystemPrompt }] },
                                                                { role: 'model', parts: [{ text: `Halo ${pvUserName}! Aku Wily Bot 🤖` }] },
                                                                ...pvHistMsgs,
                                                                { role: 'user', parts: [{ text: pvUserMsg }] },
                                                        ];
                                                } else {
                                                        pvContents = [{ role: 'user', parts: [{ text: pvSystemPrompt + '\n\n' + pvUserMsg }] }];
                                                }

                                                try {
                                                        let pvResponse;
                                                        if (pvImageBuffer && pvImageBuffer.length > 0) {
                                                                let pvFinalBuf = pvImageBuffer;
                                                                let pvFinalMime = pvImageMime;
                                                                if (pvImageMime === 'image/webp') {
                                                                        try {
                                                                                const sharp = (await import('sharp')).default;
                                                                                pvFinalBuf = await sharp(pvImageBuffer).jpeg({ quality: 90 }).toBuffer();
                                                                                pvFinalMime = 'image/jpeg';
                                                                        } catch (_) {}
                                                                }
                                                                pvResponse = await gemini.askWithImage(pvSystemPrompt + '\n\n' + pvUserMsg, pvFinalBuf, pvFinalMime);
                                                        } else {
                                                                pvResponse = await gemini.chat({ contents: pvContents });
                                                        }

                                                        if (pvResponse && pvResponse.trim()) {
                                                                const pvMediaResult = await processAIMediaAndSend(hisoka, m, pvResponse.trim(), { sessionKey: pvSessKey });
                                                                const pvClean = pvMediaResult.sentText;
                                                                addToHistory(pvSessKey, pvUserMsg, pvClean || pvResponse.trim(), buildHistoryMeta(m, { mediaLabel: pvHasMedia ? pvMediaLabel : null }));
                                                                console.log(`\x1b[36m[WilyPrivate]\x1b[39m ${pvUserName} | DM | Media: ${pvHasMedia ? pvMediaLabel : 'tidak ada'}`);
                                                        }
                                                } catch (pvErr) {
                                                        console.error('\x1b[31m[WilyPrivate] Error:\x1b[39m', pvErr.message);
                                                }
                                        }
                                }

                        } catch (autoSimiError) {
                                console.error('\x1b[31m[AutoGemini] Error:\x1b[39m', autoSimiError.message);
                        }
                }
                
                // === GUARD SELF-MODE ===
                // Pisahkan 3 identitas jelas: owner asli, bot sendiri, userjadibot
                if (hisoka?.isMainBot === false) {
                        // ── JADIBOT: izinkan isOwner (owner config) ATAU pemilik sesi jadibot ini
                        const _senderNum = String(m.sender || '').split('@')[0].split(':')[0];
                        const _jadibotUserNum = String(hisoka.jadibotUserNumber || '').split('@')[0].split(':')[0];
                        const _isJadibotUser = !!_jadibotUserNum && _senderNum === _jadibotUserNum;
                        if (!m.isOwner && !_isJadibotUser) {
                            return;
                        }
                        const jadibotAllowedCommands = new Set([
                            'p', 'ping',
                            'menu',
                            'rvo', 'viewonce', 'vo',
                            'antidel', 'ad',
                            'readsw',
                            'anticall', 'ac',
                            'anticallvid', 'acv',
                            'autocallaudio', 'aca',
                            'online',
                            'typing', 'typ',
                            'recording', 'record',
                            'allunduh', 'tt', 'ig', 'fb', 'twdl', 'ytmp3', 'ytmp4', 'play',
                            'sticker', 's',
                            'wm', 'swm',
                            'toimg',
                            'hd',
                            'upswgc', 'swgc', 'swgrup', 'swgroup', 'statusgrup', 'statusgroup',
                            'upswgcv2', 'swgcv2', 'swgrupv2', 'swgroupv2', 'statusgrupv2', 'statusgroupv2',
                            'ceksw',
                            'ceksetting',
                            'emojiadd', 'emojidel', 'emojilist',
                            'emojidefault', 'emojicustom', 'emojiclear',
                            'ceksesi',
                            'clearsesi', 'cs',
                            'del', 'd'
                        ]);
                        if (!jadibotAllowedCommands.has(m.command)) {
                            return;
                        }
                } else {
                        // ── BOT UTAMA: self mode
                        // Jika sender adalah nomor jadibot aktif → skip, biarkan jadibotnya merespon
                        const _senderPhoneNum = String(m.sender || '').split('@')[0].split(':')[0];
                        if (m.command && jadibotMap.has(_senderPhoneNum)) {
                            return;
                        }

                        // Hanya isRealOwner yang boleh jalankan command di bot utama
                        // Pengecualian: pilihan play (1/2) tetap diproses meski ada di pendingPlayChoices
                        const _isPendingPlay = pendingPlayChoices.has(m.sender);
                        const _choice = (m.text || '').trim();
                        const _isPlayChoice = _isPendingPlay && (_choice === '1' || _choice === '2');

                        if (m.command && !m.isRealOwner && !_isPlayChoice) {
                            return;
                        }
                }

                // Log CMD setelah semua guard lolos — jadibot & bot utama sama-sama tercatat
                // Skip status/story WA (status@broadcast) — bukan command sungguhan
                // Hanya log jika command benar-benar terdaftar di _commandSet
                const _isKnownCmd = hisoka._commandSet?.has(m.command);
                if (m.command && m.from !== 'status@broadcast' && _isKnownCmd) {
                        _logCmdBox(m, hisoka, `${m.prefix || '.'}${m.command}`);
                }

                if (hisoka?.isMainBot === true && m.isOwner) {
                        const jadibotChoiceKey = getJadibotChoiceKey(m);
                        const pendingJadibot = pendingJadibotChoices.get(jadibotChoiceKey);
                        if (pendingJadibot) {
                                const now = Date.now();
                                const rawChoice = String(m.text || '').trim();
                                const lowerChoice = rawChoice.toLowerCase();

                                // Harus reply ke pesan listbot, bukan sembarang pesan
                                const quotedId = getQuotedStanzaId(m);
                                // Jika botMsgId tidak tertangkap (kosong), izinkan reply apapun ke chat ini
                                const isReplyToList = m.isQuoted && (
                                        !pendingJadibot.botMsgId || quotedId === pendingJadibot.botMsgId
                                );

                                if (!rawChoice || ['jadibot', 'stopbot', 'listbot', 'jadibotmenu'].includes(m.command)) {
                                        // pesan command, abaikan
                                } else if (!isReplyToList) {
                                        // bukan reply ke pesan listbot, biarkan lanjut normal
                                } else if (pendingJadibot.expiresAt && pendingJadibot.expiresAt <= now) {
                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                        await tolak(hisoka, m, '⏳ Waktu pemilihan sudah habis. Ketik *.listbot* lagi.');
                                        return;
                                } else if (lowerChoice === 'batal' || lowerChoice === 'cancel') {
                                        if (pendingJadibot.timeout) clearTimeout(pendingJadibot.timeout);
                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                        await tolak(hisoka, m, '✅ Dibatalkan. Bot tidak dihentikan.');
                                        return;
                                } else {
                                        await cleanupExpiredJadibots(async () => {});
                                        const activeList = [...jadibotMap.keys()];
                                        const maxNum = pendingJadibot.numbers.length;

                                        // Cek format perpanjang: "1,3j" atau "2,p" atau "1, 2h"
                                        const upbotMatch = rawChoice.match(/^(\d{1,3})\s*,\s*(.+)$/);
                                        if (upbotMatch) {
                                                const upIdx = Number(upbotMatch[1]);
                                                const upDurStr = upbotMatch[2].trim();
                                                const upDurInfo = parseJadibotDuration(upDurStr);

                                                if (upIdx < 1 || upIdx > pendingJadibot.numbers.length) {
                                                        await tolak(hisoka, m, `❌ Nomor urutan tidak valid.\nMasukkan angka *1* sampai *${maxNum}*.`);
                                                        return;
                                                }
                                                if (!upDurInfo) {
                                                        await tolak(hisoka, m,
                                                                `❌ *Format durasi tidak valid!*\n\n` +
                                                                `⏱️ Singkatan: *m*=menit, *j*=jam, *h*=hari, *p*=permanent\n\n` +
                                                                `📌 Contoh:\n` +
                                                                `• *${upIdx},30m* → 30 menit\n` +
                                                                `• *${upIdx},2j* → 2 jam\n` +
                                                                `• *${upIdx},3h* → 3 hari\n` +
                                                                `• *${upIdx},p* → permanent`
                                                        );
                                                        return;
                                                }

                                                const targetNum = pendingJadibot.numbers[upIdx - 1];
                                                if (!targetNum || !activeList.includes(targetNum)) {
                                                        await tolak(hisoka, m, `❌ Bot urutan *${upIdx}* tidak ditemukan atau sudah tidak aktif.\nKetik *.listbot* untuk refresh.`);
                                                        return;
                                                }

                                                // Update expiry tanpa stop bot
                                                const upSendReply = async (msg) => tolak(hisoka, m, msg);
                                                // Ambil info lama sebelum dihapus
                                                const oldUpInfo = getJadibotExpirySummary(targetNum);
                                                const oldUpLabel = oldUpInfo?.remaining || 'Tidak ada data';
                                                const oldUpExpire = oldUpInfo?.expiresAtText || '-';
                                                if (upDurInfo.ms === 'permanent') {
                                                        removeJadibotExpiry(targetNum);
                                                        await hisoka.sendMessage(m.from, { react: { text: '♾️', key: m.key } });
                                                        await tolak(hisoka, m,
                                                                `╔══════════════════════╗\n` +
                                                                `║   ⏫  *U P B O T*   ║\n` +
                                                                `╚══════════════════════╝\n\n` +
                                                                `✅ *Durasi diperbarui!*\n` +
                                                                `📱 +${maskNumber(targetNum)}\n\n` +
                                                                `📊 *Perubahan masa berlaku:*\n` +
                                                                `⏮️ Sebelumnya : *${oldUpLabel}*\n` +
                                                                `✨ Terbaru    : *Permanent* ♾️\n\n` +
                                                                `Bot tetap aktif tanpa batas waktu.`
                                                        );
                                                } else {
                                                        extendJadibotExpiry(targetNum, upDurInfo.ms, 'active');
                                                        scheduleJadibotExpiry(targetNum, upSendReply);
                                                        const upInfo = getJadibotExpirySummary(targetNum);
                                                        await hisoka.sendMessage(m.from, { react: { text: '⏫', key: m.key } });
                                                        await tolak(hisoka, m,
                                                                `╔══════════════════════╗\n` +
                                                                `║   ⏫  *U P B O T*   ║\n` +
                                                                `╚══════════════════════╝\n\n` +
                                                                `✅ *Durasi diperbarui!*\n` +
                                                                `📱 +${maskNumber(targetNum)}\n\n` +
                                                                `📊 *Perubahan masa berlaku:*\n` +
                                                                `⏮️ Sebelumnya : *${oldUpLabel}*\n` +
                                                                `   Exp lama   : ${oldUpExpire}\n` +
                                                                `➕ Ditambah   : *${upDurInfo.label}*\n` +
                                                                `✨ Total baru : *${upInfo.remaining}*\n` +
                                                                `   Exp baru   : ${upInfo.expiresAtText}\n\n` +
                                                                `Bot tetap aktif, durasi diperpanjang.`
                                                        );
                                                }
                                                return;
                                        }

                                        // Format stop: hanya angka atau nomor WA
                                        let selectedNumber = '';
                                        const indexChoice = rawChoice.match(/^\d{1,3}$/) ? Number(rawChoice) : 0;
                                        if (indexChoice >= 1 && indexChoice <= pendingJadibot.numbers.length) {
                                                selectedNumber = pendingJadibot.numbers[indexChoice - 1];
                                        } else {
                                                selectedNumber = normalizeJadibotNumber(rawChoice);
                                        }
                                        if (selectedNumber && pendingJadibot.numbers.includes(selectedNumber) && activeList.includes(selectedNumber)) {
                                                if (pendingJadibot.timeout) clearTimeout(pendingJadibot.timeout);
                                                pendingJadibotChoices.delete(jadibotChoiceKey);
                                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                                await stopJadibot(selectedNumber, async (text) => {
                                                        await tolak(hisoka, m, text);
                                                });
                                                return;
                                        }
                                        // Pilihan tidak dikenali
                                        await tolak(
                                                hisoka,
                                                m,
                                                `❌ Pilihan tidak valid.\n\n` +
                                                `📌 *Cara reply listbot:*\n` +
                                                `• Ketik *1* → stop bot urutan 1\n` +
                                                `• Ketik *1,3j* → perpanjang bot 1 selama 3 jam\n` +
                                                `• Ketik *1,p* → ubah bot 1 ke permanent\n` +
                                                `• Ketik *batal* → batalkan\n\n` +
                                                `⏱️ Singkatan: m=menit, j=jam, h=hari, p=permanent`
                                        );
                                        return;
                                }
                        }
                }

                // (pendingCredsJson handler dihapus — flow baru pakai startJadibot otomatis)

                // ── Handle pending alqupdate list choice ──
                {
                        const alqUpdKey = getJadibotChoiceKey(m);
                        if (pendingAlqUpdateChoices.has(alqUpdKey)) {
                                const pendingUpd = pendingAlqUpdateChoices.get(alqUpdKey);
                                const quotedId   = getQuotedStanzaId(m);
                                const isReplyToMenu = m.isQuoted && (!pendingUpd.botMsgId || quotedId === pendingUpd.botMsgId);
                                const rawChoice  = String(m.text || '').trim();

                                if (isReplyToMenu && rawChoice && !m.prefix) {
                                        if (pendingUpd.expiresAt <= Date.now()) {
                                                pendingAlqUpdateChoices.delete(alqUpdKey);
                                                await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.alqupdate` lagi.');
                                                return;
                                        }
                                        if (/^(batal|cancel)$/i.test(rawChoice)) {
                                                if (pendingUpd.timeout) clearTimeout(pendingUpd.timeout);
                                                pendingAlqUpdateChoices.delete(alqUpdKey);
                                                await tolak(hisoka, m, '✅ Dibatalkan.');
                                                return;
                                        }

                                        const updMatch = rawChoice.match(/^(\d+)(?:\s+(360p|480p|720p|1080p))?$/i);
                                        if (updMatch) {
                                                if (pendingUpd.timeout) clearTimeout(pendingUpd.timeout);
                                                pendingAlqUpdateChoices.delete(alqUpdKey);

                                                const chosenIdx = parseInt(updMatch[1], 10) - 1;
                                                const prefRes   = (updMatch[2] || '').toLowerCase() || null;
                                                const items     = pendingUpd.items;

                                                if (chosenIdx < 0 || chosenIdx >= items.length) {
                                                        await tolak(hisoka, m, `❌ Nomor tidak valid. Pilih 1–${items.length}.`);
                                                        return;
                                                }

                                                const chosen = items[chosenIdx];
                                                await hisoka.sendMessage(m.from, { react: { text: '📡', key: m.key } });
                                                await tolak(hisoka, m, `📡 Mengambil detail *${chosen.title}*...`);

                                                try {
                                                        const _alqPath = path.resolve('./src/scrape/anime/alqanime.cjs');
                                                        delete _require.cache[_alqPath];
                                                        const { getDetailAlqanime } = _require(_alqPath);
                                                        const detail = await getDetailAlqanime(chosen.url);
                                                        const eps    = detail.episodes || [];

                                                        if (!eps.length) {
                                                                await tolak(hisoka, m, `❌ Tidak ada episode/link download ditemukan untuk *${detail.title}*.`);
                                                                return;
                                                        }

                                                        // Jika ada resolusi pilihan dan hanya 1 episode terbaru → langsung download
                                                        if (prefRes && eps.length === 1) {
                                                                const ep   = eps[0];
                                                                const link = pickBestAlqLink(ep.links, prefRes);
                                                                if (!link) {
                                                                        await tolak(hisoka, m, `❌ Resolusi *${prefRes.toUpperCase()}* tidak tersedia. Coba resolusi lain.`);
                                                                        return;
                                                                }

                                                                const _dlPath = path.resolve('./src/scrape/anime/alqanime-dl.cjs');
                                                                delete _require.cache[_dlPath];
                                                                const { resolveDirectLink: alqResolve, downloadToTmp: alqDownload, formatSize: alqSize } = _require(_dlPath);

                                                                const allLinks = getAllAlqLinksByPriority(ep.links, prefRes);
                                                                const progMsg = await tolak(hisoka, m,
                                                                        `📥 *Mempersiapkan download...*\n🎌 ${detail.title}\n📺 Ep ${ep.episode} — ${link.res.toUpperCase()} (${link.host})`
                                                                );
                                                                const tmpDir  = path.join(process.cwd(), 'tmp');
                                                                let resolved;
                                                                let allOuo = true;
                                                                for (const candidate of allLinks) {
                                                                        try {
                                                                                await m.reply({ edit: progMsg.key, text: `🔍 Mencoba host *${candidate.host}*...` });
                                                                                resolved = await alqResolve(candidate.url);
                                                                                allOuo = false;
                                                                                break;
                                                                        } catch (re) {
                                                                                if (!re.message?.includes('ouo.io:blocked')) allOuo = false;
                                                                        }
                                                                }
                                                                if (!resolved) {
                                                                        if (allOuo) {
                                                                                const epResList = ['360p','480p','720p','1080p'].filter(r => ep.links[r]?.length);
                                                                                await hisoka.sendMessage(m.from, { react: { text: '🔗', key: m.key } });
                                                                                await m.reply({ edit: progMsg.key, text: `🔗 *Link ouo.io — buka manual di browser*\n_Bot tidak bisa download otomatis karena ouo.io memblokir server._` });
                                                                                await hisoka.sendMessage(m.from, { text: formatAlqLinkMsg(detail.title, ep, prefRes, epResList) }, { quoted: m });
                                                                        } else {
                                                                                await m.reply({ edit: progMsg.key, text: `❌ Semua host gagal. Coba lagi nanti.` });
                                                                        }
                                                                        return;
                                                                }
                                                                const { directUrl, fileName, host, size } = resolved;
                                                                const sizeStr = alqSize(size);
                                                                const MAX_BYTES = 1.9 * 1024 * 1024 * 1024;
                                                                if (size && size > MAX_BYTES) {
                                                                        await m.reply({ edit: progMsg.key, text: `❌ File terlalu besar (${sizeStr}). Maks ~1.9 GB.` });
                                                                        return;
                                                                }
                                                                await m.reply({ edit: progMsg.key, text: `📥 *Download Ep ${ep.episode}*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[░░░░░░░░░░] 0%` });
                                                                const tmpFile = path.join(tmpDir, `alqupd_${Date.now()}_${fileName}`);
                                                                try {
                                                                        await alqDownload(directUrl, tmpFile, async (done, total, pct) => {
                                                                                const bar = '█'.repeat(Math.round(pct / 10)) + '░'.repeat(10 - Math.round(pct / 10));
                                                                                try { await m.reply({ edit: progMsg.key, text: `📥 *Download Ep ${ep.episode}*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[${bar}] ${pct}% (${alqSize(done)})` }); } catch (_) {}
                                                                        });
                                                                        await m.reply({ edit: progMsg.key, text: `📤 Mengirim file...` });
                                                                        const fileBuf = fs.readFileSync(tmpFile);
                                                                        const ext     = path.extname(fileName).toLowerCase();
                                                                        const isVid   = ['.mp4', '.mkv', '.avi', '.webm'].includes(ext);
                                                                        if (isVid) {
                                                                                await hisoka.sendMessage(m.from, { video: fileBuf, mimetype: 'video/mp4', fileName, caption: `🎬 *${detail.title}*\n📺 Episode ${ep.episode}\n💾 ${sizeStr} | 🏠 ${host}` }, { quoted: m });
                                                                        } else {
                                                                                await hisoka.sendMessage(m.from, { document: fileBuf, mimetype: 'application/octet-stream', fileName, caption: `📄 *${fileName}*\n💾 ${sizeStr}` }, { quoted: m });
                                                                        }
                                                                        await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}` });
                                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                } finally {
                                                                        try { if (fs.existsSync(tmpFile)) fs.unlinkSync(tmpFile); } catch (_) {}
                                                                }
                                                                return;
                                                        }

                                                        // Tampilkan episode menu & daftarkan ke pendingAlqDlChoices
                                                        const allRes = new Set();
                                                        for (const ep of eps) for (const r of Object.keys(ep.links)) if (r !== 'batch') allRes.add(r);
                                                        const resList = ['360p','480p','720p','1080p'].filter(r => allRes.has(r));

                                                        let dlMenu = `📥 *PILIH EPISODE & RESOLUSI*\n`;
                                                        dlMenu += `━━━━━━━━━━━━━━━━━━━\n`;
                                                        dlMenu += `🎌 *${detail.title}*\n\n`;
                                                        dlMenu += `*Daftar Episode (${eps.length}):*\n`;
                                                        const maxShow = Math.min(eps.length, 15);
                                                        eps.slice(0, maxShow).forEach((ep, i) => {
                                                                const epRes = Object.keys(ep.links).filter(r => r !== 'batch');
                                                                dlMenu += `${i + 1}. Ep ${ep.episode}`;
                                                                if (epRes.length) dlMenu += ` _(${epRes.join('/')})_`;
                                                                dlMenu += `\n`;
                                                        });
                                                        if (eps.length > maxShow) dlMenu += `_...dan ${eps.length - maxShow} episode lainnya_\n`;
                                                        dlMenu += `\n`;
                                                        if (resList.length) dlMenu += `📺 Resolusi: *${resList.join(' | ')}*\n`;
                                                        dlMenu += `\n━━━━━━━━━━━━━━━━━━━\n`;
                                                        dlMenu += `📌 *Reply pesan ini:*\n`;
                                                        dlMenu += `• *1 720p* — 1 episode, kirim video\n`;
                                                        dlMenu += `• *1-3 480p* — batch ep 1-3 (ZIP)\n`;
                                                        dlMenu += `• *all 360p* — semua episode (ZIP)\n`;
                                                        dlMenu += `⏳ Menu berlaku *5 menit*`;

                                                        const menuMsg = await hisoka.sendMessage(m.from, { text: dlMenu }, { quoted: m });
                                                        const oldAlq  = pendingAlqDlChoices.get(alqUpdKey);
                                                        if (oldAlq?.timeout) clearTimeout(oldAlq.timeout);
                                                        const alqTimeout = setTimeout(() => pendingAlqDlChoices.delete(alqUpdKey), 5 * 60 * 1000);
                                                        pendingAlqDlChoices.set(alqUpdKey, {
                                                                animeTitle: detail.title,
                                                                episodes: eps,
                                                                botMsgId: menuMsg?.key?.id || '',
                                                                expiresAt: Date.now() + 5 * 60 * 1000,
                                                                timeout: alqTimeout,
                                                        });
                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                } catch (err) {
                                                        console.error('[ALQUPDATE_CHOICE] Error:', err?.message);
                                                        logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqupdate_choice');
                                                        await tolak(hisoka, m, `❌ Gagal ambil detail.\n💬 ${err?.message?.slice(0, 120) || 'Coba lagi nanti'}`);
                                                }
                                                return;
                                        }
                                }
                        }
                }

                // ── Handle pending alqanime download choice ──
                {
                        const alqKey = getJadibotChoiceKey(m);
                        if (pendingAlqDlChoices.has(alqKey)) {
                                const pendingAlq = pendingAlqDlChoices.get(alqKey);
                                const quotedId   = getQuotedStanzaId(m);
                                const isReplyToMenu = m.isQuoted && (!pendingAlq.botMsgId || quotedId === pendingAlq.botMsgId);
                                const rawChoice  = String(m.text || '').trim();

                                if (isReplyToMenu && rawChoice && !m.prefix) {
                                        // Kedaluwarsa
                                        if (pendingAlq.expiresAt <= Date.now()) {
                                                pendingAlqDlChoices.delete(alqKey);
                                                await tolak(hisoka, m, '⏳ Menu download sudah kedaluwarsa. Ketik `.alq` lagi.');
                                                return;
                                        }
                                        // Batalkan
                                        if (/^(batal|cancel)$/i.test(rawChoice)) {
                                                if (pendingAlq.timeout) clearTimeout(pendingAlq.timeout);
                                                pendingAlqDlChoices.delete(alqKey);
                                                await tolak(hisoka, m, '✅ Download dibatalkan.');
                                                return;
                                        }
                                        // Cegah double-process
                                        if (pendingAlq.downloading) {
                                                await tolak(hisoka, m, '⏳ Sedang memproses download sebelumnya, harap tunggu...');
                                                return;
                                        }

                                        // Parse pilihan: "1 720p", "1-3 480p", "1,3,5 360p", "all 360p"
                                        const choiceMatch = rawChoice.match(/^(all|\d[\d,\-\s]*)(?:\s+(360p|480p|720p|1080p))?$/i);
                                        if (!choiceMatch) {
                                                // Format tidak dikenali, biarkan lanjut normal
                                        } else {
                                                // Tandai sedang proses
                                                pendingAlq.downloading = true;
                                                if (pendingAlq.timeout) clearTimeout(pendingAlq.timeout);
                                                pendingAlqDlChoices.delete(alqKey);

                                                const episodes  = pendingAlq.episodes;
                                                const prefRes   = (choiceMatch[2] || '').toLowerCase() || null;
                                                const idxPart   = choiceMatch[1].trim().toLowerCase();
                                                const isBatch_pre = idxPart === 'all';

                                                // Kumpulkan indeks episode (0-based)
                                                const epIndices = [];
                                                if (isBatch_pre) {
                                                        for (let i = 0; i < episodes.length; i++) epIndices.push(i);
                                                } else if (idxPart.includes('-')) {
                                                        const [a, b] = idxPart.split('-').map(n => parseInt(n.trim(), 10));
                                                        for (let i = a; i <= b; i++) if (i >= 1 && i <= episodes.length) epIndices.push(i - 1);
                                                } else {
                                                        idxPart.split(',').forEach(n => {
                                                                const idx = parseInt(n.trim(), 10) - 1;
                                                                if (idx >= 0 && idx < episodes.length) epIndices.push(idx);
                                                        });
                                                }

                                                // Deduplicate & cap
                                                const uniqueIdx = [...new Set(epIndices)].slice(0, 10);
                                                const isBatch   = uniqueIdx.length > 1;

                                                if (!uniqueIdx.length) {
                                                        await tolak(hisoka, m, `❌ Episode tidak ditemukan. Pilih angka 1-${episodes.length}.`);
                                                        return;
                                                }

                                                const _dlPath2 = path.resolve('./src/scrape/anime/alqanime-dl.cjs');
                                                delete _require.cache[_dlPath2];
                                                const { resolveDirectLink: alqResolve, downloadToTmp: alqDownload, formatSize: alqSize } = _require(_dlPath2);

                                                await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
                                                const progMsg = await tolak(hisoka, m,
                                                        `📥 *Mempersiapkan ${isBatch ? uniqueIdx.length + ' episode' : '1 episode'}...*\n` +
                                                        `🎌 ${pendingAlq.animeTitle}\n` +
                                                        `📺 Resolusi: ${prefRes ? prefRes.toUpperCase() : 'Auto'}`
                                                );

                                                const tmpFiles = [];
                                                const MAX_BYTES = 1.9 * 1024 * 1024 * 1024;
                                                const tmpDir    = path.join(process.cwd(), 'tmp');

                                                try {
                                                        for (let i = 0; i < uniqueIdx.length; i++) {
                                                                const ep    = episodes[uniqueIdx[i]];
                                                                const link  = pickBestAlqLink(ep.links, prefRes);
                                                                const batchLbl = isBatch ? ` (${i + 1}/${uniqueIdx.length})` : '';

                                                                if (!link) {
                                                                        throw new Error(`Ep ${ep.episode}: tidak ada link untuk resolusi ${prefRes || 'apapun'}`);
                                                                }

                                                                // Resolve direct link — coba semua host secara berurutan
                                                                const allLinks = getAllAlqLinksByPriority(ep.links, prefRes);
                                                                let resolved;
                                                                let allOuoBatch = true;
                                                                for (const candidate of allLinks) {
                                                                        try {
                                                                                await m.reply({ edit: progMsg.key, text: `🔍 Ep ${ep.episode}${batchLbl}: mencoba *${candidate.host}* (${candidate.res.toUpperCase()})...` });
                                                                                resolved = await alqResolve(candidate.url);
                                                                                allOuoBatch = false;
                                                                                break;
                                                                        } catch (re) {
                                                                                if (!re.message?.includes('ouo.io:blocked')) allOuoBatch = false;
                                                                        }
                                                                }
                                                                if (!resolved) {
                                                                        if (allOuoBatch) {
                                                                                const epResList = ['360p','480p','720p','1080p'].filter(r => ep.links[r]?.length);
                                                                                await hisoka.sendMessage(m.from, { text: formatAlqLinkMsg(pendingAlq.animeTitle, ep, prefRes, epResList) }, { quoted: m });
                                                                                tmpFiles.push({ file: null, fileName: 'link_only', ep: ep.episode, host: 'ouo.io', sizeStr: '-' });
                                                                                continue;
                                                                        }
                                                                        throw new Error(`Ep ${ep.episode}: semua host gagal.`);
                                                                }

                                                                const { directUrl, fileName, host, size } = resolved;
                                                                const sizeStr = alqSize(size);

                                                                if (size && size > MAX_BYTES) {
                                                                        throw new Error(`Ep ${ep.episode} terlalu besar (${sizeStr}). Maks ~1.9 GB.`);
                                                                }

                                                                await m.reply({
                                                                        edit: progMsg.key,
                                                                        text: `📥 *Download Ep ${ep.episode}${batchLbl}*\n` +
                                                                              `📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[░░░░░░░░░░] 0%`,
                                                                });

                                                                const tmpFile = path.join(tmpDir, `alqdl_${Date.now()}_${i}_${fileName}`);
                                                                tmpFiles.push({ file: tmpFile, fileName, ep: ep.episode, host, sizeStr });

                                                                await alqDownload(directUrl, tmpFile, async (done, total, pct) => {
                                                                        const filled = Math.round(pct / 10);
                                                                        const bar = '█'.repeat(filled) + '░'.repeat(10 - filled);
                                                                        try {
                                                                                await m.reply({
                                                                                        edit: progMsg.key,
                                                                                        text: `📥 *Download Ep ${ep.episode}${batchLbl}*\n` +
                                                                                              `📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}\n[${bar}] ${pct}% (${alqSize(done)})`,
                                                                                });
                                                                        } catch (_) {}
                                                                });

                                                                await m.reply({
                                                                        edit: progMsg.key,
                                                                        text: `✅ Ep ${ep.episode}${batchLbl} selesai!${isBatch && i < uniqueIdx.length - 1 ? ' Lanjut...' : ''}`,
                                                                });
                                                        }

                                                        // Cek apakah semua entri adalah ouo.io link-only (tidak ada file yang perlu di-ZIP/kirim)
                                                        const realFiles = tmpFiles.filter(f => f.file !== null);

                                                        if (realFiles.length === 0) {
                                                                // Semua sudah dikirim sebagai link teks — tandai selesai
                                                                await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n🔗 ${tmpFiles.length} link berhasil dikirim` });
                                                        } else if (isBatch && realFiles.length > 0) {
                                                                // Buat ZIP dari file yang berhasil didownload
                                                                await m.reply({ edit: progMsg.key, text: `📦 Membuat ZIP dari ${realFiles.length} episode...` });
                                                                const archiver = _require('archiver');
                                                                const { PassThrough } = _require('stream');
                                                                const safeName = pendingAlq.animeTitle.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_').slice(0, 30);
                                                                const zipName  = `${safeName}_${realFiles.length}eps.zip`;

                                                                const zipBuf = await new Promise((res, rej) => {
                                                                        const chunks  = [];
                                                                        const archive = archiver('zip', { zlib: { level: 1 } });
                                                                        const pass    = new PassThrough();
                                                                        pass.on('data', c => chunks.push(c));
                                                                        pass.on('end',  () => res(Buffer.concat(chunks)));
                                                                        pass.on('error', rej);
                                                                        archive.pipe(pass);
                                                                        for (const { file, fileName: fn } of realFiles) {
                                                                                if (fs.existsSync(file)) archive.append(fs.createReadStream(file), { name: fn });
                                                                        }
                                                                        archive.finalize();
                                                                });

                                                                await m.reply({ edit: progMsg.key, text: `📤 Mengirim ZIP (${alqSize(zipBuf.length)})...` });
                                                                await hisoka.sendMessage(m.from, {
                                                                        document: zipBuf,
                                                                        mimetype: 'application/zip',
                                                                        fileName: zipName,
                                                                        caption: `📦 *${pendingAlq.animeTitle}*\n🎬 ${realFiles.length} episode | 💾 ${alqSize(zipBuf.length)}\n📺 Resolusi: ${prefRes ? prefRes.toUpperCase() : 'Auto'}`,
                                                                }, { quoted: m });
                                                                await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📦 ${zipName}\n💾 ${alqSize(zipBuf.length)} | 🎬 ${realFiles.length} episode` });

                                                        } else {
                                                                // Single episode — file real
                                                                const { file: tmpFile, fileName: fn, ep: epLbl, host: fHost, sizeStr: fSize } = realFiles[0];
                                                                const fileBuf = fs.readFileSync(tmpFile);
                                                                const ext     = path.extname(fn).toLowerCase();
                                                                const isVid   = ['.mp4', '.mkv', '.avi', '.webm'].includes(ext);

                                                                await m.reply({ edit: progMsg.key, text: `📤 Mengirim file...` });

                                                                if (isVid) {
                                                                        await hisoka.sendMessage(m.from, {
                                                                                video: fileBuf, mimetype: 'video/mp4', fileName: fn,
                                                                                caption: `🎬 *${pendingAlq.animeTitle}*\n📺 Episode ${epLbl}\n💾 ${fSize} | 🏠 ${fHost}`,
                                                                        }, { quoted: m });
                                                                } else {
                                                                        await hisoka.sendMessage(m.from, {
                                                                                document: fileBuf, mimetype: 'application/octet-stream', fileName: fn,
                                                                                caption: `📄 *${fn}*\n💾 ${fSize}`,
                                                                        }, { quoted: m });
                                                                }
                                                                await m.reply({ edit: progMsg.key, text: `✅ *Selesai!*\n📄 ${fn}\n💾 ${fSize} | 🏠 ${fHost}` });
                                                        }

                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                                                } catch (dlErr) {
                                                        console.error('[ALQDL_AUTO] Error:', dlErr?.message);
                                                        logError(dlErr instanceof Error ? dlErr : new Error(String(dlErr?.message || dlErr)), 'alqdl_auto');
                                                        try { await m.reply({ edit: progMsg.key, text: `❌ Gagal download.\n💬 ${dlErr?.message?.slice(0, 150) || 'Coba lagi nanti'}` }); } catch (_) {}
                                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                                } finally {
                                                        for (const { file } of tmpFiles) {
                                                                try { if (fs.existsSync(file)) fs.unlinkSync(file); } catch (_) {}
                                                        }
                                                }

                                                return;
                                        }
                                }
                        }
                }

                // ── Helper: kirim semua gambar cosplay dalam 1 album (fallback batch 10) ──
                async function _sendCosplayImages(sock, msg, post, dlFn, capFn, tag) {
                        const total = post.images.length;
                        const CONCUR = 5;
                        const allItems = [];
                        for (let i = 0; i < total; i += CONCUR) {
                                const chunk = post.images.slice(i, i + CONCUR);
                                const results = await Promise.allSettled(chunk.map(async (url, ci) => {
                                        const buf = await dlFn(url);
                                        return { image: buf, caption: capFn(post, { imgIndex: i + ci, imgTotal: total }) };
                                }));
                                for (const r of results) {
                                        if (r.status === 'fulfilled') allItems.push(r.value);
                                        else console.error(`${tag} Gagal unduh:`, r.reason?.message);
                                }
                        }
                        if (allItems.length === 0) return;
                        try {
                                await sock.sendMessage(msg.from, { albumMessage: allItems }, { quoted: msg });
                        } catch (_) {
                                const BATCH = 10;
                                for (let b = 0; b < allItems.length; b += BATCH) {
                                        const batch = allItems.slice(b, b + BATCH);
                                        try {
                                                await sock.sendMessage(msg.from, { albumMessage: batch }, { quoted: b === 0 ? msg : undefined });
                                        } catch (_2) {
                                                for (const item of batch) {
                                                        try { await sock.sendMessage(msg.from, { image: item.image, caption: item.caption }, { quoted: msg }); } catch (_3) {}
                                                }
                                        }
                                }
                        }
                }

                // ── Handle pending cosplaytele search choice ──
                if (pendingCosplayChoices.has(m.sender)) {
                        const pendingCos = pendingCosplayChoices.get(m.sender);
                        const rawChoice  = String(m.text || '').trim();
                        const isReply    = m.isQuoted && pendingCos.botMsgId && getQuotedStanzaId(m) === pendingCos.botMsgId;
                        const isValid    = isReply && /^\d+$/.test(rawChoice);

                        if (isValid) {
                                if (pendingCos.expiresAt <= Date.now()) {
                                        pendingCosplayChoices.delete(m.sender);
                                        await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.cosplay <keyword>` lagi.');
                                        return;
                                }
                                if (/^(batal|cancel)$/i.test(rawChoice)) {
                                        if (pendingCos.timeout) clearTimeout(pendingCos.timeout);
                                        pendingCosplayChoices.delete(m.sender);
                                        await tolak(hisoka, m, '✅ Dibatalkan.');
                                        return;
                                }
                                if (pendingCos.loading) {
                                        await tolak(hisoka, m, '⏳ Sedang memproses pilihan sebelumnya...');
                                        return;
                                }

                                const idx = parseInt(rawChoice) - 1;
                                if (idx < 0 || idx >= pendingCos.results.length) {
                                        await tolak(hisoka, m, `❌ Pilih angka 1–${pendingCos.results.length}.`);
                                        return;
                                }

                                pendingCos.loading = true;
                                if (pendingCos.timeout) clearTimeout(pendingCos.timeout);
                                pendingCosplayChoices.delete(m.sender);

                                const chosen = pendingCos.results[idx];
                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                const loadMsg = await tolak(hisoka, m,
                                        `⏳ Mengambil media dari *${chosen.title.slice(0, 60)}*...\nMohon tunggu ✨`
                                );

                                try {
                                        const { cosplayteleGetPost, downloadBuffer, formatCosplayteleCaption } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
                                        const post = await cosplayteleGetPost(chosen.id);

                                        if (loadMsg?.key) {
                                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                        }

                                        const vidInfo = post.hasVideos ? ` | 🎬 ada video` : '';
                                        const caption0 = `╭─「 👘 *COSPLAYTELE* 」\n` +
                                                `│ 📌 *${post.title.slice(0, 80)}*\n` +
                                                `│ 🖼️ ${post.totalImages} foto${vidInfo}\n` +
                                                `│ 🔗 ${post.link}\n` +
                                                `│\n` +
                                                `│ ℹ️ Mengirim ${post.images.length} foto...\n` +
                                                `╰──────────────────────`;

                                        await tolak(hisoka, m, caption0);
                                        await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });

                                        if (post.images.length > 0) {
                                                await _sendCosplayImages(hisoka, m, post, downloadBuffer, formatCosplayteleCaption, '[Cosplay]');
                                        }

                                        if (post.hasVideos && post.cossoraIds?.length > 0) {
                                                const vidLinks = post.cossoraIds.map((u, i) => `🎬 Video ${i + 1}: ${u}`).join('\n');
                                                await hisoka.sendMessage(m.from, {
                                                        text: `╭─「 🎬 *VIDEO COSPLAY* 」\n│ Tonton video dari post ini:\n│\n${post.cossoraIds.map((u, i) => `│ ${i + 1}. ${u}`).join('\n')}\n╰──────────────────────`,
                                                }, { quoted: m });
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'cosplay');

                                        // ── Tampilkan ulang menu agar bisa pilih lagi ──
                                        const _reResults = pendingCos.results;
                                        const _reListText =
                                                `╭─「 👘 *COSPLAYTELE* 」\n` +
                                                `│ ✅ Selesai! Mau lihat yang lain?\n` +
                                                `│\n` +
                                                _reResults.map((r, i) => {
                                                        const match = r.title.match(/(\d+\s*photos?\s*(?:and\s*\d+\s*videos?)?)/i);
                                                        const count = match ? ` [${match[1]}]` : '';
                                                        const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
                                                        return `│ *${i + 1}.* ${cleanTitle.slice(0, 65)}${count}`;
                                                }).join('\n') + '\n' +
                                                `│\n` +
                                                `│ 📩 *Balas pesan ini* dengan angka\n` +
                                                `│    pilihan kamu (1–${_reResults.length})\n` +
                                                `│ ⏳ Menu berlaku 3 menit\n` +
                                                `╰──────────────────────`;
                                        const _reMenuMsg = await tolak(hisoka, m, _reListText);
                                        const _reKey = m.sender;
                                        const _reTimeout = setTimeout(() => pendingCosplayChoices.delete(_reKey), 3 * 60 * 1000);
                                        pendingCosplayChoices.set(_reKey, {
                                                results: _reResults,
                                                botMsgId: _reMenuMsg?.key?.id || null,
                                                expiresAt: Date.now() + 3 * 60 * 1000,
                                                timeout: _reTimeout,
                                                loading: false,
                                        });
                                } catch (err) {
                                        console.error('[Cosplay] Error fetch post:', err.message);
                                        logError(err, 'cosplay:fetch');
                                        if (loadMsg?.key) {
                                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                        }
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        await tolak(hisoka, m, `❌ Gagal mengambil media.\n_${err.message}_`);
                                }
                                return;
                        }
                }

                // ── Helper: build chapter page text (100 per page) ──
                const _CHAP_PER_PAGE = 100;
                function _buildChapPageText(chapters, page = 1) {
                        const total = chapters.length;
                        const totalPages = Math.ceil(total / _CHAP_PER_PAGE);
                        const p = Math.max(1, Math.min(page, totalPages));
                        const start = (p - 1) * _CHAP_PER_PAGE;
                        const slice = chapters.slice(start, start + _CHAP_PER_PAGE);
                        let txt = `╭─「 📋 *DAFTAR CHAPTER* (${total} chapter) 」\n│ 📄 Hal. *${p}/${totalPages}*  •  Ch. ${start + 1}–${Math.min(start + _CHAP_PER_PAGE, total)}\n│\n`;
                        slice.forEach((ch, j) => {
                                txt += `│ *${start + j + 1}.* ${ch.name}${ch.date ? `  _${ch.date}_` : ''}\n`;
                        });
                        txt += `│\n`;
                        // Nav bar
                        const nav = [];
                        if (p > 1)          nav.push(`*a* ← hal.${p-1}`);
                        if (p < totalPages) nav.push(`hal.${p+1} → *d*`);
                        if (totalPages > 1) {
                                txt += `│ 🎮 ${nav.join('   ')}`;
                                if (p > 1)          txt += `   *q* awal`;
                                if (p < totalPages) txt += `   *e* akhir`;
                                txt += `   *w* daftar hal.\n│\n`;
                        }
                        txt += `│ 💡 Ketik nomor chapter  •  *p${p < totalPages ? p+1 : 1}* = loncat hal.\n╰──────────────────────`;
                        return txt;
                }
                function _buildChapOverview(chapters) {
                        const total = chapters.length;
                        const totalPages = Math.ceil(total / _CHAP_PER_PAGE);
                        let txt = `╭─「 🗂️ *SEMUA HALAMAN* (${total} chapter) 」\n│\n`;
                        for (let pg = 1; pg <= totalPages; pg++) {
                                const s = (pg - 1) * _CHAP_PER_PAGE + 1;
                                const e = Math.min(pg * _CHAP_PER_PAGE, total);
                                txt += `│ *p${pg}* → Ch. ${s}–${e}\n`;
                        }
                        txt += `│\n│ 💡 Ketik *p<N>* untuk loncat, misal *p1* atau *p${totalPages}*\n╰──────────────────────`;
                        return txt;
                }

                // ── Handle pending komiktap interactive reply ──
                {
                        const komikKey = getJadibotChoiceKey(m);
                        const quotedId = getQuotedStanzaId(m);

                        // Cari session: pertama coba exact key (sender yg buat command),
                        // lalu fallback cari siapapun di chat yg sama berdasarkan botMsgId
                        let _komikEntry = pendingKomikChoices.has(komikKey)
                                ? { key: komikKey, session: pendingKomikChoices.get(komikKey) }
                                : null;
                        if (!_komikEntry && m.isQuoted && quotedId) {
                                for (const [_k, _s] of pendingKomikChoices.entries()) {
                                        if (_k.startsWith(m.from + ':') && _s.botMsgId && _s.botMsgId === quotedId) {
                                                _komikEntry = { key: _k, session: _s };
                                                break;
                                        }
                                }
                        }

                        if (_komikEntry) {
                                const matchedKey   = _komikEntry.key;
                                const pendingKomik = _komikEntry.session;
                                const rawChoice    = String(m.text || '').trim();
                                // search phase: wajib reply ke menu bot
                                // detail phase: angka chapter / navigasi (a d q e w p<N>) — tanpa perlu quote
                                const _isNavCmd = /^(a|d|q|e|w|p\d+|batal|cancel|x)$/i.test(rawChoice);
                                const isReplyToMenu =
                                        (m.isQuoted && (!pendingKomik.botMsgId || quotedId === pendingKomik.botMsgId)) ||
                                        (pendingKomik.phase === 'detail' && !m.prefix && (/^\d+$/.test(rawChoice) || _isNavCmd));

                                // Override helpers to use matchedKey instead of komikKey
                                const _komikDelete = () => pendingKomikChoices.delete(matchedKey);
                                const _komikSet    = (val) => pendingKomikChoices.set(matchedKey, val);

                                if (isReplyToMenu && rawChoice && !m.prefix) {
                                        if (pendingKomik.expiresAt <= Date.now()) {
                                                _komikDelete();
                                                await tolak(hisoka, m, '⏳ Menu sudah kedaluwarsa. Ketik `.komik <judul>` lagi.');
                                                return;
                                        }
                                        if (/^(batal|cancel|x)$/i.test(rawChoice)) {
                                                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                                                _komikDelete();
                                                await tolak(hisoka, m, '✅ Dibatalkan.');
                                                return;
                                        }

                                        // ── Navigasi halaman chapter: a/d/q/e/w/p<N> ──
                                        if (pendingKomik.phase === 'detail' && _isNavCmd) {
                                                const chapters   = pendingKomik.chapters || [];
                                                const totalPages = Math.ceil(chapters.length / _CHAP_PER_PAGE);
                                                const curPage    = pendingKomik.chapPage || 1;
                                                const lc = rawChoice.toLowerCase();

                                                let targetPage = curPage;
                                                if (lc === 'd') targetPage = Math.min(curPage + 1, totalPages);
                                                else if (lc === 'a') targetPage = Math.max(curPage - 1, 1);
                                                else if (lc === 'q') targetPage = 1;
                                                else if (lc === 'e') targetPage = totalPages;
                                                else if (/^p\d+$/i.test(lc)) targetPage = Math.max(1, Math.min(parseInt(lc.slice(1), 10), totalPages));

                                                if (lc === 'w') {
                                                        // Tampilkan overview semua halaman (edit pesan yg sama)
                                                        const overviewText = _buildChapOverview(chapters);
                                                        if (pendingKomik.chapMsgKey) {
                                                                try { await hisoka.sendMessage(m.from, { edit: pendingKomik.chapMsgKey, text: overviewText }); } catch { await tolak(hisoka, m, overviewText); }
                                                        } else { await tolak(hisoka, m, overviewText); }
                                                } else {
                                                        if (targetPage === curPage && lc !== 'q' && lc !== 'e') {
                                                                await tolak(hisoka, m, targetPage === 1 ? `⚠️ Sudah di halaman pertama.` : `⚠️ Sudah di halaman terakhir (${totalPages}).`);
                                                                return;
                                                        }
                                                        const newText = _buildChapPageText(chapters, targetPage);
                                                        if (pendingKomik.chapMsgKey) {
                                                                try { await hisoka.sendMessage(m.from, { edit: pendingKomik.chapMsgKey, text: newText }); } catch { await tolak(hisoka, m, newText); }
                                                        } else { await tolak(hisoka, m, newText); }
                                                }

                                                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                                                const _navTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                                                _komikSet({ ...pendingKomik, chapPage: lc === 'w' ? curPage : targetPage, timeout: _navTimeout, expiresAt: Date.now() + 10 * 60 * 1000 });
                                                return;
                                        }

                                        if (pendingKomik.loading) {
                                                await tolak(hisoka, m, '⏳ Sedang memproses, harap tunggu...');
                                                return;
                                        }

                                        const { komiktapDetail, komiktapPdf, komiktapChapterImages, makeProgressBar, formatDetailText } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));

                                        // ── FASE 1: user balas nomor dari daftar pencarian ──
                                        if (pendingKomik.phase === 'search') {
                                                const idx = parseInt(rawChoice, 10);
                                                const results = pendingKomik.results || [];
                                                if (isNaN(idx) || idx < 1 || idx > results.length) {
                                                        await tolak(hisoka, m, `❌ Nomor tidak valid. Balas dengan angka 1–${results.length}.`);
                                                        return;
                                                }

                                                pendingKomik.loading = true;
                                                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);

                                                try {
                                                        const pfx = m.prefix || '.';
                                                        await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
                                                        await tolak(hisoka, m, `📖 Mengambil detail *${results[idx - 1].title}*...`);

                                                        const detail = await komiktapDetail(results[idx - 1].url);
                                                        const chapters = detail.chapters;

                                                        // Pesan 1: cover + info manga
                                                        const infoText = formatDetailText(detail, pfx);
                                                        if (detail.cover) {
                                                                try {
                                                                        const imgRes = await _require('axios').get(detail.cover, {
                                                                                responseType: 'arraybuffer', timeout: 10000,
                                                                                headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
                                                                        });
                                                                        await hisoka.sendMessage(m.from, { image: Buffer.from(imgRes.data), caption: infoText }, { quoted: m });
                                                                } catch {
                                                                        await hisoka.sendMessage(m.from, { text: infoText }, { quoted: m });
                                                                }
                                                        } else {
                                                                await hisoka.sendMessage(m.from, { text: infoText }, { quoted: m });
                                                        }

                                                                        // Pesan 2: chapter list pagination (100 per halaman, auto-edit)
                                                        const chapPage1Text = _buildChapPageText(chapters, 1);
                                                        const chapListMsg = await hisoka.sendMessage(m.from, { text: chapPage1Text }, { quoted: m });

                                                        // Simpan phase 2 — botMsgId kosong agar menerima reply/pesan biasa
                                                        if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);
                                                        const newTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                                                        _komikSet({
                                                                phase: 'detail',
                                                                detail,
                                                                chapters,
                                                                botMsgId: '',
                                                                chapMsgKey: chapListMsg?.key || null,
                                                                chapPage: 1,
                                                                expiresAt: Date.now() + 10 * 60 * 1000,
                                                                timeout: newTimeout,
                                                                loading: false,
                                                        });

                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                                                } catch (err) {
                                                        console.error('[KOMIK] Detail error:', err?.message);
                                                        _komikDelete();
                                                        await tolak(hisoka, m, `❌ Gagal ambil detail.\n💬 ${err?.message || 'Coba lagi nanti'}`);
                                                }
                                                return;
                                        }

                                        // ── FASE 2: user balas nomor chapter → download PDF ──
                                        if (pendingKomik.phase === 'detail') {
                                                const idx = parseInt(rawChoice, 10);
                                                const chapters = pendingKomik.chapters || [];
                                                if (isNaN(idx) || idx < 1 || idx > chapters.length) {
                                                        await tolak(hisoka, m, `❌ Nomor tidak valid. Balas dengan angka 1–${chapters.length}.`);
                                                        return;
                                                }

                                                pendingKomik.loading = true;
                                                if (pendingKomik.timeout) clearTimeout(pendingKomik.timeout);

                                                const chapter = chapters[idx - 1];
                                                const savedDetail = pendingKomik.detail;
                                                const savedChapters = pendingKomik.chapters;

                                                try {
                                                        await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });

                                                        const images = await komiktapChapterImages(chapter.url);
                                                        const totalAvail = images.length;
                                                        const dlCount = Math.min(totalAvail, 20);

                                                        const mangaTitle = savedDetail?.title || chapter.name;
                                                        const _buildDlProgress = (bar, pct, done, total, status) =>
                                                                `${bar} ${pct}%\n` +
                                                                `╭─「 📥 *MENGUNDUH PDF* 」\n` +
                                                                `│ 📖 ${mangaTitle}\n` +
                                                                `│ 📑 ${chapter.name}\n` +
                                                                `│ 📄 ${done}/${total} halaman\n` +
                                                                `│ ${status}\n` +
                                                                `╰──────────────────────`;

                                                        const loadingMsg = await m.reply(_buildDlProgress('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 0, 0, dlCount, '⏳ Memulai download...'));

                                                        let lastPct = 0;
                                                        const onProgress = async (done, total) => {
                                                                const { pct, bar } = makeProgressBar(done, total);
                                                                if (pct - lastPct < 10 && pct < 100) return;
                                                                lastPct = pct;
                                                                try {
                                                                        await m.reply({ edit: loadingMsg.key, text: _buildDlProgress(bar, pct, done, total, `⏳ Mengunduh halaman ${done}...`) });
                                                                } catch (_) {}
                                                        };

                                                        const pdfBuf = await komiktapPdf(chapter.url, 20, onProgress);

                                                        try {
                                                                await m.reply({ edit: loadingMsg.key, text: _buildDlProgress('██████████', 100, dlCount, dlCount, '📦 Mengemas & mengirim PDF...') });
                                                        } catch (_) {}

                                                        const safeName = `${mangaTitle} - ${chapter.name}`.replace(/[^\w\s,!'-]/g, '').replace(/\s+/g, ' ').trim().slice(0, 60);
                                                        const sizeMB = (pdfBuf.length / 1024 / 1024).toFixed(1);
                                                        const pdfCaption =
                                                                `╭─「 📚 *KOMIKTAP* 」\n│\n` +
                                                                `│ 📖 *${mangaTitle}*\n` +
                                                                `│ 📑 *${chapter.name}*\n` +
                                                                `│ 📄 ${dlCount}/${totalAvail} halaman\n` +
                                                                `│ 💾 ${sizeMB} MB\n` +
                                                                `│ 🔗 ${chapter.url}\n│\n` +
                                                                `│ 💡 _Ketik nomor chapter lain untuk download lagi_\n` +
                                                                `╰──────────────────────`;

                                                        await m.reply({
                                                                document: pdfBuf,
                                                                mimetype: 'application/pdf',
                                                                fileName: `${safeName}.pdf`,
                                                                caption: pdfCaption,
                                                        });

                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                                                        // Restore session — user bisa pilih chapter lain tanpa .komik lagi
                                                        const restoreTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                                                        _komikSet({
                                                                phase: 'detail',
                                                                detail: savedDetail,
                                                                chapters: savedChapters,
                                                                botMsgId: '', // allow any reply
                                                                expiresAt: Date.now() + 10 * 60 * 1000,
                                                                timeout: restoreTimeout,
                                                                loading: false,
                                                        });

                                                } catch (err) {
                                                        console.error('[KOMIK] PDF error:', err?.message);
                                                        logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-interactive-pdf');
                                                        // Restore session even on error
                                                        const restoreTimeout = setTimeout(() => _komikDelete(), 10 * 60 * 1000);
                                                        _komikSet({
                                                                phase: 'detail',
                                                                detail: savedDetail,
                                                                chapters: savedChapters,
                                                                botMsgId: '',
                                                                expiresAt: Date.now() + 10 * 60 * 1000,
                                                                timeout: restoreTimeout,
                                                                loading: false,
                                                        });
                                                        await tolak(hisoka, m, `❌ Gagal download chapter.\n💬 ${err?.message || 'Coba lagi nanti'}`);
                                                }
                                                return;
                                        }
                                }
                        }
                }

                // ── Handle reply ke pesan list .setbrowser ──
                if (isMainBot(hisoka) && m.isOwner && m.isQuoted && !m.prefix && listAturBrowserMap.has(m.sender)) {
                        const _labPending = listAturBrowserMap.get(m.sender);
                        const _labQuotedId = getQuotedStanzaId(m);
                        const _labRaw = (m.text || '').trim().toLowerCase();
                        const _labIsReply = _labPending && (!_labPending.keyId || _labQuotedId === _labPending.keyId) && Date.now() < _labPending.expiresAt;
                        if (_labIsReply && BROWSER_LIST.find(b => b.key === _labRaw)) {
                                const _labConfig  = loadConfig();
                                const _labCurKey  = (global.__activeBrowserKey || _labConfig.browserDevice?.selected || 'v1').toLowerCase();
                                const _labPilihan = BROWSER_LIST.find(b => b.key === _labRaw);
                                if (_labCurKey === _labRaw) {
                                        await m.reply(`ℹ️ Browser sudah menggunakan *${_labPilihan.label}*. Tidak ada perubahan.`);
                                        return;
                                }
                                listAturBrowserMap.delete(m.sender);
                                pendingAturBrowser.delete(m.sender);
                                const _labKonfirmMsg = await m.reply(
                                        `╭══════════════════════════╮\n` +
                                        `║  ⚠️  *KONFIRMASI GANTI BROWSER*  ⚠️  ║\n` +
                                        `╰══════════════════════════╯\n\n` +
                                        `🖥️ *Pilihan:* ${_labPilihan.label}\n` +
                                        `📦 *Detail:* ${_labPilihan.value.join(' | ')}\n\n` +
                                        `ℹ️ *Proses (tanpa downtime):*\n` +
                                        `• Koneksi baru dibuka dengan browser baru\n` +
                                        `• *${!!(process.env.BOT_NUMBER_PAIR || loadConfig()?.botNumber || '').replace(/[^0-9]/g, '') ? 'Pairing code' : 'QR Code'} dikirim ke chat ini*\n` +
                                        `• Bot lama tetap aktif sampai terhubung\n` +
                                        `• Session lama dihapus *setelah* koneksi baru berhasil\n\n` +
                                        `✅ *Reply pesan ini* dengan *ya* untuk lanjut\n` +
                                        `❌ *Reply pesan ini* dengan *tidak* untuk batal\n\n` +
                                        `⏳ *Berlaku 30 detik...*`
                                );
                                const _labTimer = setTimeout(() => {
                                        if (pendingAturBrowser.has(m.sender)) {
                                                pendingAturBrowser.delete(m.sender);
                                                hisoka.sendMessage(m.from, {
                                                        edit: _labKonfirmMsg?.key,
                                                        text: `⏳ *Konfirmasi kadaluarsa.* Ketik *.setbrowser* lagi untuk memulai ulang.`
                                                }).catch(() => {});
                                        }
                                }, 30000);
                                pendingAturBrowser.set(m.sender, { vKey: _labRaw, expiresAt: Date.now() + 30000, timer: _labTimer, botMsg: _labKonfirmMsg });
                                return;
                        }
                }

                // ── Handle reply ke pesan konfirmasi .setbrowser ──
                if (isMainBot(hisoka) && m.isOwner && m.isQuoted && !m.prefix && pendingAturBrowser.has(m.sender)) {
                        const _cabPending  = pendingAturBrowser.get(m.sender);
                        const _cabQuotedId = getQuotedStanzaId(m);
                        const _cabRaw      = (m.text || '').trim().toLowerCase();
                        const _cabIsReply  = _cabPending?.botMsg?.key?.id && _cabQuotedId === _cabPending.botMsg.key.id && Date.now() < _cabPending.expiresAt;
                        if (_cabIsReply) {
                                if (/^(ya|yes)$/i.test(_cabRaw)) {
                                        clearTimeout(_cabPending.timer);
                                        pendingAturBrowser.delete(m.sender);
                                        const _cabConfig  = loadConfig();
                                        const _cabPilihan = BROWSER_LIST.find(b => b.key === _cabPending.vKey);
                                        if (!_cabPilihan) { await m.reply(`❌ Pilihan tidak valid.`); return; }
                                        const _cabProgMsg = await m.reply(`⏳ *Memproses...*`);
                                        const _cabEdit = async (txt) => { try { await hisoka.sendMessage(m.from, { edit: _cabProgMsg.key, text: txt }); } catch {} };
                                        const _cabWait = (ms) => new Promise(r => setTimeout(r, ms));
                                        const _cabHasPair = !!(process.env.BOT_NUMBER_PAIR || _cabConfig?.botNumber || '').replace(/[^0-9]/g, '');
                                        await _cabEdit(
                                                `⏳ *Memulai koneksi baru...*\n` +
                                                `🖥️ Browser: *${_cabPilihan.label}*\n\n` +
                                                `🔄 Bot lama tetap aktif sampai koneksi baru berhasil.\n` +
                                                `📲 *${_cabHasPair ? 'Pairing code' : 'QR Code'} akan dikirim ke chat ini.*`
                                        );
                                        logCommand(m, hisoka, 'setbrowser');
                                        const { startBrowserSwitch: _cabSwitch } = await import('../helper/browserSwitch.js');
                                        _cabSwitch(hisoka, _cabPilihan.value, m.from, _cabEdit, _cabPilihan.key).catch(async (e) => {
                                                await hisoka.sendMessage(m.from, { text: `❌ *Error browser switch:* ${e?.message}` }).catch(() => {});
                                        });
                                        return;
                                } else if (/^(tidak|batal|no|cancel)$/i.test(_cabRaw)) {
                                        clearTimeout(_cabPending.timer);
                                        pendingAturBrowser.delete(m.sender);
                                        if (_cabPending?.botMsg?.key) {
                                                await hisoka.sendMessage(m.from, { edit: _cabPending.botMsg.key, text: `❌ *Ganti browser dibatalkan.*` }).catch(() => {});
                                        }
                                        await m.reply(`❌ *Ganti browser dibatalkan.*`);
                                        return;
                                }
                        }
                }

                // Handle pending play choice (user balas 1 atau 2)
                if (pendingPlayChoices.has(m.sender)) {
                        const choice = (m.text || '').trim();
                        if (choice === '1' || choice === '2') {
                                const pending = pendingPlayChoices.get(m.sender);

                                // Cek kalau pilihan yang SAMA sedang diunduh (biar tidak double)
                                if (!pending.downloading) pending.downloading = new Set();
                                if (pending.downloading.has(choice)) {
                                        await m.reply(`⏳ Sedang mengunduh *${choice === '1' ? 'Audio MP3' : 'Video MP4'}*... harap tunggu.`);
                                        return;
                                }

                                // Tandai format ini sedang diunduh, tapi format lain tetap bisa jalan
                                pending.downloading.add(choice);

                                // Reset timeout — perpanjang selama masih ada yang berjalan
                                if (pending.timeout) {
                                        clearTimeout(pending.timeout);
                                        pending.timeout = null;
                                }

                                // Jalankan download secara async tanpa await di sini
                                // supaya pesan handler selesai dan tombol lain bisa langsung diproses
                                (async () => {
                                        try {
                                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                                const loadingMsg = await tolak(hisoka, m, `⏳ Mengunduh ${choice === '1' ? 'audio MP3' : 'video MP4'}...`);

                                                const ytdlpBin = await ensureYtdlp(hisoka, m);
                                                const tmpId = Date.now();

                                                if (choice === '1') {
                                                        const tmpFile = path.join(process.cwd(), 'tmp', `play_${tmpId}.mp3`);
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
                                                                ptt: false
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

                                                        const tmpFile = path.join(process.cwd(), 'tmp', `play_${tmpId}.mp4`);
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
                                                                caption: `🎬 *${pending.title}*`
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
                                                // Hapus format ini dari set downloading
                                                if (pendingPlayChoices.has(m.sender)) {
                                                        const p = pendingPlayChoices.get(m.sender);
                                                        if (p.downloading) p.downloading.delete(choice);
                                                        // Kalau sudah tidak ada yang berjalan, set timeout cleanup
                                                        if (!p.downloading || p.downloading.size === 0) {
                                                                if (p.timeout) clearTimeout(p.timeout);
                                                                p.timeout = setTimeout(() => {
                                                                        pendingPlayChoices.delete(m.sender);
                                                                }, 2 * 60 * 1000);
                                                        }
                                                }
                                        }
                                })();

                                return;
                        }

                        // Pending ada tapi bukan pilihan 1/2 — abaikan (biarkan lanjut ke switch)
                }

                // Handle cekauto interactive list toggle
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__cauto__')) {
                        const parts = m.text.split('__').filter(Boolean);
                        if (parts.length === 3 && parts[0] === 'cauto') {
                                const configKey = parts[1];
                                const action = parts[2];
                                if ((action === 'on' || action === 'off') && configKey) {
                                        try {
                                                const cfgToggle = loadConfig();

                                                if (configKey === 'cekswTracking') {
                                                        cfgToggle.cekswTracking = action === 'on';
                                                        saveConfig(cfgToggle);
                                                } else if (configKey === 'autoCleaner') {
                                                        const currentVal = cfgToggle[configKey] || {};
                                                        cfgToggle[configKey] = { ...currentVal, enabled: action === 'on' };
                                                        saveConfig(cfgToggle);
                                                        if (action === 'on') restartAutoCleaner();
                                                        else stopAutoCleaner();
                                                } else if (configKey === 'autoOnline') {
                                                        const currentVal = cfgToggle[configKey] || {};
                                                        cfgToggle[configKey] = { ...currentVal, enabled: action === 'on' };
                                                        saveConfig(cfgToggle);
                                                        if (global.startAutoOnline) {
                                                                global.startAutoOnline();
                                                        } else if (action === 'off') {
                                                                if (global.autoOnlineInterval) {
                                                                        clearInterval(global.autoOnlineInterval);
                                                                        global.autoOnlineInterval = null;
                                                                }
                                                                if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('unavailable');
                                                        } else if (action === 'on' && global.hisokaClient) {
                                                                global.hisokaClient.sendPresenceUpdate('available');
                                                        }
                                                } else {
                                                        const currentVal = cfgToggle[configKey] || {};
                                                        cfgToggle[configKey] = { ...currentVal, enabled: action === 'on' };
                                                        saveConfig(cfgToggle);
                                                }

                                                const namaMap = {
                                                        antiCall: 'Anti Call', antiCallVideo: 'Anti Call Video',
                                                        antiDelete: 'Anti Delete', antiTagSW: 'Anti Tag SW',
                                                        autoCleaner: 'Auto Cleaner', autoOnline: 'Auto Online',
                                                        autoReadStory: 'Auto Read Story', autoRecording: 'Auto Recording',
                                                        autoSimi: 'Auto Simi', autoTyping: 'Auto Typing',
                                                        reactApi: 'React API', sessionCleaner: 'Session Cleaner',
                                                        telegram: 'Telegram Bridge', wilyAI: 'Wily AI',
                                                        cekswTracking: 'Cek SW Tracking',
                                                };
                                                const nama = namaMap[configKey] || configKey;
                                                const icon = action === 'on' ? '✅' : '❌';
                                                await hisoka.sendMessage(m.from, { react: { text: icon, key: m.key } });
                                                await sendCekautoMsg(hisoka, m);
                                        } catch (cautoErr) {
                                                await tolak(hisoka, m, `❌ Gagal toggle fitur: ${cautoErr.message}`);
                                        }
                                        return;
                                }
                        }
                }

                // Handle cekauto grup interactive list toggle
                if (m.isOwner && m.isGroup && typeof m.text === 'string' && m.text.startsWith('__cgrup__')) {
                        const parts = m.text.split('__').filter(Boolean);
                        if (parts.length === 3 && parts[0] === 'cgrup') {
                                const featureKey = parts[1];
                                const action = parts[2];
                                if ((action === 'on' || action === 'off') && featureKey) {
                                        try {
                                                const cfgGrup = loadConfig();
                                                const jidGrup = m.from;
                                                const enable = action === 'on';

                                                if (featureKey === 'welcome' || featureKey === 'goodbye') {
                                                        if (!cfgGrup.welcomeGoodbye) cfgGrup.welcomeGoodbye = { enabled: true, groups: {} };
                                                        if (!cfgGrup.welcomeGoodbye.groups) cfgGrup.welcomeGoodbye.groups = {};
                                                        if (!cfgGrup.welcomeGoodbye.groups[jidGrup]) cfgGrup.welcomeGoodbye.groups[jidGrup] = {};
                                                        cfgGrup.welcomeGoodbye.groups[jidGrup][featureKey] = enable;
                                                        saveConfig(cfgGrup);
                                                        if (enable) saveCekautoTimestamp(featureKey, jidGrup);
                                                } else if (featureKey === 'antiTagSWGrup') {
                                                        toggleAntiTagSW(jidGrup, enable);
                                                        if (enable) saveCekautoTimestamp('antiTagSWGrup', jidGrup);
                                                } else {
                                                        if (!cfgGrup[featureKey]) cfgGrup[featureKey] = {};
                                                        if (!cfgGrup[featureKey].groups) cfgGrup[featureKey].groups = {};
                                                        cfgGrup[featureKey].groups[jidGrup] = { enabled: enable, diubahPada: Date.now() };
                                                        saveConfig(cfgGrup);
                                                }

                                                const namaMapGrup = {
                                                        infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                                                        alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                                                        malnews: 'MAL News', welcome: 'Welcome',
                                                        goodbye: 'Goodbye',
                                                        antiTagSWGrup: 'Anti Tag SW (Grup)',
                                                };
                                                const icon = enable ? '✅' : '❌';
                                                await hisoka.sendMessage(m.from, { react: { text: icon, key: m.key } });
                                                await sendCekautoGrupMsg(hisoka, m);
                                        } catch (cgrupErr) {
                                                await tolak(hisoka, m, `❌ Gagal toggle fitur grup: ${cgrupErr.message}`);
                                        }
                                        return;
                                }
                        }
                }

                // Handle cekauto grup — pilih grup untuk di-off (tampil list semua grup aktif)
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__cgrupsel__')) {
                        const parts = m.text.split('__').filter(Boolean);
                        if (parts.length === 2 && parts[0] === 'cgrupsel') {
                                const featureKey = parts[1];
                                try {
                                        await sendCekautoGrupSelectMsg(hisoka, m, featureKey);
                                } catch (e) {
                                        await tolak(hisoka, m, `❌ Gagal ambil daftar grup: ${e.message}`);
                                }
                                return;
                        }
                }

                // Handle cekauto grup — aktifkan SEMUA fitur untuk grup ini sekaligus
                if (m.isOwner && m.isGroup && typeof m.text === 'string' && m.text === '__cgrup_allon__') {
                        try {
                                const cfgAll = loadConfig();
                                const jidAll = m.from;

                                for (const f of CEKAUTO_GROUP_FITUR_LIST) {
                                        if (!f.toggleable) continue;
                                        if (f.key === 'welcome' || f.key === 'goodbye') {
                                                if (!cfgAll.welcomeGoodbye) cfgAll.welcomeGoodbye = { enabled: true, groups: {} };
                                                if (!cfgAll.welcomeGoodbye.groups) cfgAll.welcomeGoodbye.groups = {};
                                                if (!cfgAll.welcomeGoodbye.groups[jidAll]) cfgAll.welcomeGoodbye.groups[jidAll] = {};
                                                cfgAll.welcomeGoodbye.groups[jidAll][f.key] = true;
                                        } else if (f.key === 'antiTagSWGrup') {
                                                toggleAntiTagSW(jidAll, true);
                                        } else {
                                                if (!cfgAll[f.key]) cfgAll[f.key] = {};
                                                if (!cfgAll[f.key].groups) cfgAll[f.key].groups = {};
                                                cfgAll[f.key].groups[jidAll] = { enabled: true, diubahPada: Date.now() };
                                        }
                                        saveCekautoTimestamp(f.key, jidAll);
                                }
                                saveConfig(cfgAll);

                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                await sendCekautoGrupMsg(hisoka, m);
                        } catch (e) {
                                await tolak(hisoka, m, `❌ Gagal aktifkan semua fitur: ${e.message}`);
                        }
                        return;
                }

                // Handle cekauto grup — matikan SEMUA fitur untuk grup ini sekaligus
                if (m.isOwner && m.isGroup && typeof m.text === 'string' && m.text === '__cgrup_alloff__') {
                        try {
                                const cfgOff = loadConfig();
                                const jidOff = m.from;

                                for (const f of CEKAUTO_GROUP_FITUR_LIST) {
                                        if (!f.toggleable) continue;
                                        if (f.key === 'welcome' || f.key === 'goodbye') {
                                                if (cfgOff.welcomeGoodbye?.groups?.[jidOff]) {
                                                        cfgOff.welcomeGoodbye.groups[jidOff][f.key] = false;
                                                }
                                        } else if (f.key === 'antiTagSWGrup') {
                                                toggleAntiTagSW(jidOff, false);
                                        } else {
                                                if (cfgOff[f.key]?.groups?.[jidOff]) {
                                                        cfgOff[f.key].groups[jidOff] = { enabled: false, diubahPada: Date.now() };
                                                }
                                        }
                                }
                                saveConfig(cfgOff);

                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                await sendCekautoGrupMsg(hisoka, m);
                        } catch (e) {
                                await tolak(hisoka, m, `❌ Gagal matikan semua fitur: ${e.message}`);
                        }
                        return;
                }

                // Handle cekauto grup — off fitur untuk grup tertentu
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__cgrupoff__')) {
                        const raw = m.text.slice('__cgrupoff__'.length);
                        const sepIdx = raw.indexOf('__');
                        if (sepIdx !== -1) {
                                const featureKey = raw.slice(0, sepIdx);
                                const targetJid = raw.slice(sepIdx + 2);
                                if (featureKey && targetJid) {
                                        try {
                                                disableFeatureForGroup(featureKey, targetJid);
                                                const namaMapOff = {
                                                        infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                                                        alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                                                        malnews: 'MAL News', welcome: 'Welcome',
                                                        goodbye: 'Goodbye',
                                                        antiTagSWGrup: 'Anti Tag SW (Grup)',
                                                };
                                                let grupNama = targetJid;
                                                try {
                                                        const meta = await hisoka.groupMetadata(targetJid);
                                                        grupNama = meta.subject || targetJid;
                                                } catch (_) {}
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                const txtOff =
                                                        `╭══『 ❌ *FITUR DINONAKTIFKAN* 』══╮\n` +
                                                        `│\n` +
                                                        `│ 📌 Fitur : *${namaMapOff[featureKey] || featureKey}*\n` +
                                                        `│ 🏘️ Grup  : *${grupNama}*\n` +
                                                        `│\n` +
                                                        `│ ✅ Fitur berhasil dinonaktifkan\n` +
                                                        `│    untuk grup ini.\n` +
                                                        `│\n` +
                                                        `│ 💡 Gunakan tombol di bawah untuk\n` +
                                                        `│    melihat grup lain yang masih\n` +
                                                        `│    aktif, atau aktifkan kembali\n` +
                                                        `│    fitur ini jika berubah pikiran.\n` +
                                                        `│\n` +
                                                        `╰══════════════════════════════╯`;
                                                await sendConfirmWithButtons(hisoka, m, txtOff, [
                                                        { text: '🏘️ Lihat Sisa Grup Aktif', id: `__cgrupsel__${featureKey}` },
                                                        { text: '↩️ Aktifkan Kembali', id: `__cgrupre__${featureKey}__${targetJid}` },
                                                ], { quoteBot: true });
                                        } catch (e) {
                                                await tolak(hisoka, m, `❌ Gagal nonaktifkan fitur: ${e.message}`);
                                        }
                                        return;
                                }
                        }
                }

                // Handle cekauto grup — off fitur untuk SEMUA grup sekaligus
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__cgrupall__')) {
                        const featureKey = m.text.slice('__cgrupall__'.length).trim();
                        if (featureKey) {
                                try {
                                        const sebelumnya = getActiveGroupsForFeature(featureKey);
                                        disableFeatureForAllGroups(featureKey);
                                        const namaMapAll = {
                                                infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                                                alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                                                malnews: 'MAL News', welcome: 'Welcome',
                                                goodbye: 'Goodbye',
                                                antiTagSWGrup: 'Anti Tag SW (Grup)',
                                        };
                                        const grupNamaList = [];
                                        for (const gjid of sebelumnya) {
                                                try {
                                                        const meta = await hisoka.groupMetadata(gjid);
                                                        grupNamaList.push(meta.subject || gjid);
                                                } catch (_) {
                                                        grupNamaList.push(gjid);
                                                }
                                        }
                                        const grupLines = grupNamaList.map(n => `│  🔴 ${n}`).join('\n');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        const txtAll =
                                                `╭══『 🔴 *OFF SEMUA GRUP* 』══╮\n` +
                                                `│\n` +
                                                `│ Fitur: *${namaMapAll[featureKey] || featureKey}*\n` +
                                                `│ Dinonaktifkan di *${sebelumnya.length}* grup:\n` +
                                                `│\n` +
                                                grupLines + '\n' +
                                                `│\n` +
                                                `│ ✅ Semua grup berhasil di-off!\n` +
                                                `│\n` +
                                                `╰══════════════════════════════╯`;
                                        await sendConfirmWithButtons(hisoka, m, txtAll, [
                                                { text: '🏘️ Cek Status Fitur', id: `__cgrupsel__${featureKey}` },
                                                { text: '🏘️ Lihat Fitur GC', id: '__cekauto_gc__' },
                                        ]);
                                } catch (e) {
                                        await tolak(hisoka, m, `❌ Gagal off semua grup: ${e.message}`);
                                }
                                return;
                        }
                }

                // Handle cekauto grup — aktifkan kembali fitur untuk grup tertentu
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__cgrupre__')) {
                        const raw = m.text.slice('__cgrupre__'.length);
                        const sepIdx = raw.indexOf('__');
                        if (sepIdx !== -1) {
                                const featureKey = raw.slice(0, sepIdx);
                                const targetJid = raw.slice(sepIdx + 2);
                                if (featureKey && targetJid) {
                                        try {
                                                const cfgRe = loadConfig();
                                                if (featureKey === 'welcome' || featureKey === 'goodbye') {
                                                        if (!cfgRe.welcomeGoodbye) cfgRe.welcomeGoodbye = { enabled: true, groups: {} };
                                                        if (!cfgRe.welcomeGoodbye.groups) cfgRe.welcomeGoodbye.groups = {};
                                                        if (!cfgRe.welcomeGoodbye.groups[targetJid]) cfgRe.welcomeGoodbye.groups[targetJid] = {};
                                                        cfgRe.welcomeGoodbye.groups[targetJid][featureKey] = true;
                                                        saveConfig(cfgRe);
                                                        saveCekautoTimestamp(featureKey, targetJid);
                                                } else if (featureKey === 'antiTagSWGrup') {
                                                        toggleAntiTagSW(targetJid, true);
                                                        saveCekautoTimestamp('antiTagSWGrup', targetJid);
                                                } else {
                                                        if (!cfgRe[featureKey]) cfgRe[featureKey] = { groups: {} };
                                                        if (!cfgRe[featureKey].groups) cfgRe[featureKey].groups = {};
                                                        cfgRe[featureKey].groups[targetJid] = { enabled: true, diubahPada: Date.now() };
                                                        saveConfig(cfgRe);
                                                }
                                                const namaMapRe = {
                                                        infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                                                        alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                                                        malnews: 'MAL News', welcome: 'Welcome',
                                                        goodbye: 'Goodbye',
                                                        antiTagSWGrup: 'Anti Tag SW (Grup)',
                                                };
                                                let grupNamaRe = targetJid;
                                                try {
                                                        const meta = await hisoka.groupMetadata(targetJid);
                                                        grupNamaRe = meta.subject || targetJid;
                                                } catch (_) {}
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                const txtRe =
                                                        `╭══『 ✅ *FITUR DIAKTIFKAN* 』══╮\n` +
                                                        `│\n` +
                                                        `│ Fitur: *${namaMapRe[featureKey] || featureKey}*\n` +
                                                        `│ Grup: *${grupNamaRe}*\n` +
                                                        `│\n` +
                                                        `│ ✅ Berhasil diaktifkan kembali!\n` +
                                                        `│\n` +
                                                        `╰══════════════════════════════╯`;
                                                await sendConfirmWithButtons(hisoka, m, txtRe, [
                                                        { text: '🏘️ Lihat Status Grup', id: `__cgrupsel__${featureKey}` },
                                                        { text: '❌ Nonaktifkan Lagi', id: `__cgrupoff__${featureKey}__${targetJid}` },
                                                ], { quoteBot: true });
                                        } catch (e) {
                                                await tolak(hisoka, m, `❌ Gagal aktifkan fitur: ${e.message}`);
                                        }
                                        return;
                                }
                        }
                }

                // Handle cekauto gc shortcut dari main menu
                if (m.isOwner && typeof m.text === 'string' && m.text === '__cekauto_gc__') {
                        if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
                        try { await sendCekautoGrupMsg(hisoka, m); } catch (e) { await tolak(hisoka, m, `❌ ${e.message}`); }
                        return;
                }

                if (m.isOwner && typeof m.text === 'string' && m.text === '__cekauto_main__') {
                        try { await sendCekautoMsg(hisoka, m); } catch (e) { await tolak(hisoka, m, `❌ ${e.message}`); }
                        return;
                }

                // Handle add all grup — aktifkan fitur untuk SEMUA grup sekaligus
                if (m.isOwner && typeof m.text === 'string' && m.text.startsWith('__addallgrp__')) {
                        const featureKey = m.text.slice('__addallgrp__'.length).trim();
                        if (featureKey) {
                                try {
                                        const namaMapAddAll = {
                                                infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                                                alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                                                malnews: 'MAL News', anigame: 'AN1.COM Game Notif',
                                                welcome: 'Welcome', goodbye: 'Goodbye',
                                                antiTagSWGrup: 'Anti Tag SW (Grup)',
                                        };
                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                        const allGroupsObj = await hisoka.groupFetchAllParticipating();
                                        const allJids = Object.keys(allGroupsObj || {}).filter(Boolean);
                                        let count = 0;
                                        if (featureKey === 'antiTagSWGrup') {
                                                for (const jid of allJids) {
                                                        toggleAntiTagSW(jid, true);
                                                        saveCekautoTimestamp('antiTagSWGrup', jid);
                                                        count++;
                                                }
                                        } else if (featureKey === 'welcome' || featureKey === 'goodbye') {
                                                const cfgWG = loadConfig();
                                                if (!cfgWG.welcomeGoodbye) cfgWG.welcomeGoodbye = { enabled: true, groups: {} };
                                                if (!cfgWG.welcomeGoodbye.groups) cfgWG.welcomeGoodbye.groups = {};
                                                for (const jid of allJids) {
                                                        if (!cfgWG.welcomeGoodbye.groups[jid]) cfgWG.welcomeGoodbye.groups[jid] = {};
                                                        cfgWG.welcomeGoodbye.groups[jid][featureKey] = true;
                                                        saveCekautoTimestamp(featureKey, jid);
                                                        count++;
                                                }
                                                saveConfig(cfgWG);
                                        } else {
                                                // infowibu, animasu, alqanimenotif, tvonenews, malnews
                                                const cfgFeat = loadConfig();
                                                if (!cfgFeat[featureKey]) cfgFeat[featureKey] = { groups: {} };
                                                if (!cfgFeat[featureKey].groups) cfgFeat[featureKey].groups = {};
                                                for (const jid of allJids) {
                                                        cfgFeat[featureKey].groups[jid] = { enabled: true, diubahPada: Date.now() };
                                                        count++;
                                                }
                                                saveConfig(cfgFeat);
                                        }
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        await sendConfirmWithButtons(hisoka, m,
                                                `╭══『 ✅ *ADD ALL GRUP* 』══╮\n` +
                                                `│\n` +
                                                `│ Fitur: *${namaMapAddAll[featureKey] || featureKey}*\n` +
                                                `│ Total: *${count}* grup berhasil diaktifkan!\n` +
                                                `│\n` +
                                                `│ ✅ Semua grup sudah aktif secara realtime!\n` +
                                                `│\n` +
                                                `╰══════════════════════════════╯`,
                                                [
                                                        { text: '🏘️ Lihat Status Grup', id: `__cgrupsel__${featureKey}` },
                                                        { text: '🏘️ Lihat Fitur GC', id: '__cekauto_gc__' },
                                                ]
                                        );
                                } catch (e) {
                                        await tolak(hisoka, m, `❌ Gagal add all grup: ${e.message}`);
                                }
                                return;
                        }
                }

                // ─── AntiTagSW reply-based delete dari .antitagsw list ───────────────
                if (global.__antiTagSWListSessions?.size && m.quoted?.key?.id && (m.isOwner || m.isAdmin)) {
                        const sessId = m.quoted.key.id;
                        const sess = global.__antiTagSWListSessions?.get(sessId);
                        if (sess && sess.from === m.from) {
                                const rawReply = (m.text || m.body || '').trim().toLowerCase();
                                if (rawReply) {
                                        global.__antiTagSWListSessions.delete(sessId);
                                        try {
                                                const { groups: sessGroups } = sess;

                                                if (rawReply === 'semua') {
                                                        // Hapus semua
                                                        const total = sessGroups.length;
                                                        for (const g of sessGroups) toggleAntiTagSW(g.gid, false);
                                                        await tolak(hisoka, m,
                                                                `╭───〔 *🗑️ HAPUS SEMUA* 〕───╮\n` +
                                                                `│\n` +
                                                                `│ ✅ Semua grup dihapus!\n` +
                                                                `│ 🗑️ Total: *${total} grup*\n` +
                                                                `│ ⚠️ Semua warning juga direset.\n` +
                                                                `│\n` +
                                                                `╰────────────────────────────────────╯`
                                                        );
                                                } else if (rawReply === 'reset') {
                                                        // Reset semua warning, grup tetap
                                                        for (const g of sessGroups) resetWarnings(g.gid);
                                                        await tolak(hisoka, m,
                                                                `╭───〔 *🔄 RESET WARNING* 〕───╮\n` +
                                                                `│\n` +
                                                                `│ ✅ Warning direset!\n` +
                                                                `│ 📊 Total: *${sessGroups.length} grup*\n` +
                                                                `│ 🟢 Grup tetap terdaftar.\n` +
                                                                `│\n` +
                                                                `╰────────────────────────────────────╯`
                                                        );
                                                } else {
                                                        // Parse angka: "1", "1,2", "1, 2, 3", dll
                                                        const nums = rawReply.split(/[,\s]+/)
                                                                .map(n => parseInt(n.trim(), 10))
                                                                .filter(n => !isNaN(n) && n >= 1 && n <= sessGroups.length);
                                                        const uniq = [...new Set(nums)];

                                                        if (!uniq.length) {
                                                                await tolak(hisoka, m,
                                                                        `❌ Nomor tidak valid!\n` +
                                                                        `Masukkan angka 1-${sessGroups.length}, contoh: *1* atau *1,2,3*\n` +
                                                                        `Atau ketik *semua* / *reset*`
                                                                );
                                                        } else {
                                                                const dihapus = [];
                                                                for (const n of uniq) {
                                                                        const g = sessGroups[n - 1];
                                                                        if (g) {
                                                                                toggleAntiTagSW(g.gid, false);
                                                                                dihapus.push(`${n}. *${g.namaGrup}*`);
                                                                        }
                                                                }
                                                                const listDihapus = dihapus.map(d => `│ ✅ ${d}`).join('\n');
                                                                await tolak(hisoka, m,
                                                                        `╭───〔 *🗑️ ANTITAGSW REMOVED* 〕───╮\n` +
                                                                        `│\n` +
                                                                        `│ ✅ *${dihapus.length} grup* berhasil dihapus!\n` +
                                                                        `│\n` +
                                                                        listDihapus + `\n` +
                                                                        `│\n` +
                                                                        `│ ⚠️ Warning di grup tersebut direset.\n` +
                                                                        `│\n` +
                                                                        `╰────────────────────────────────────╯`
                                                                );
                                                        }
                                                }
                                        } catch (e) {
                                                await tolak(hisoka, m, `❌ Gagal proses: ${e.message}`);
                                        }
                                        return;
                                }
                        }
                }

                // ─── AntiTagSW delete callback ────────────────────────────────────────
                if ((m.isOwner || m.isAdmin) && typeof m.text === 'string' && m.text.startsWith('__antitagsw_del__')) {
                        const targetGid = m.text.slice('__antitagsw_del__'.length).trim();
                        if (targetGid) {
                                try {
                                        let namaGrup = targetGid;
                                        try { const mt = await hisoka.groupMetadata(targetGid); namaGrup = mt?.subject || targetGid; } catch { try { namaGrup = hisoka.groups?.read(targetGid)?.subject || targetGid; } catch {} }
                                        toggleAntiTagSW(targetGid, false);
                                        await tolak(hisoka, m,
                                                `╭───〔 *🗑️ ANTITAGSW REMOVED* 〕───╮\n` +
                                                `│\n` +
                                                `│ ✅ Grup berhasil dihapus!\n` +
                                                `│\n` +
                                                `│ 📌 *${namaGrup}*\n` +
                                                `│ 🆔 \`${targetGid}\`\n` +
                                                `│\n` +
                                                `│ ⚠️ Warning di grup ini juga direset.\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                } catch (e) {
                                        await tolak(hisoka, m, `❌ Gagal hapus grup: ${e.message}`);
                                }
                                return;
                        }
                }

                if ((m.isOwner || m.isAdmin) && typeof m.text === 'string' && m.text === '__antitagsw_delall__') {
                        try {
                                const allG = getAllAntiTagSWGroups();
                                const total = allG.length;
                                for (const gid of allG) toggleAntiTagSW(gid, false);
                                await tolak(hisoka, m,
                                        `╭───〔 *🗑️ ANTITAGSW HAPUS SEMUA* 〕───╮\n` +
                                        `│\n` +
                                        `│ ✅ Semua grup berhasil dihapus!\n` +
                                        `│\n` +
                                        `│ 🗑️ Total dihapus: *${total} grup*\n` +
                                        `│ ⚠️ Semua warning juga direset.\n` +
                                        `│\n` +
                                        `│ 💡 Gunakan *.antitagsw add* untuk\n` +
                                        `│    mendaftarkan ulang grup.\n` +
                                        `│\n` +
                                        `╰────────────────────────────────────╯`
                                );
                        } catch (e) {
                                await tolak(hisoka, m, `❌ Gagal hapus semua: ${e.message}`);
                        }
                        return;
                }

                if ((m.isOwner || m.isAdmin) && typeof m.text === 'string' && m.text === '__antitagsw_resetall__') {
                        try {
                                const allG = getAllAntiTagSWGroups();
                                for (const gid of allG) resetWarnings(gid);
                                await tolak(hisoka, m,
                                        `╭───〔 *🔄 ANTITAGSW RESET SEMUA* 〕───╮\n` +
                                        `│\n` +
                                        `│ ✅ Semua warning berhasil direset!\n` +
                                        `│\n` +
                                        `│ 📊 Total grup direset: *${allG.length} grup*\n` +
                                        `│ 🟢 Grup tetap terdaftar di AntiTagSW.\n` +
                                        `│\n` +
                                        `╰────────────────────────────────────╯`
                                );
                        } catch (e) {
                                await tolak(hisoka, m, `❌ Gagal reset semua: ${e.message}`);
                        }
                        return;
                }

                // ─── MusicAI generate helper ──────────────────────────────────────────
                const _generateMusik = async (hisoka, m, params) => {
                        const { ChatMusicAPI, buildCaption } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
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

                                // Hapus loading
                                if (loadingMsg?.key) {
                                        try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                                }

                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }).catch(() => {});

                                // Simpan audio ke cache sementara (10 menit)
                                const { formatDuration: fmtDur } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
                                const cacheKey = `${m.from}_${Date.now()}`;
                                pendingMusikaiCache.set(cacheKey, { results, params, ts: Date.now() });
                                setTimeout(() => pendingMusikaiCache.delete(cacheKey), 10 * 60 * 1000);

                                // Buat info tiap variasi untuk body
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

                                // ── Multi-section single_select ─────────────────────────────────
                                const { MODELS: MusicModels } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
                                const genreLabel = params.musicStyle || 'pop';
                                const numEmoji = ['1️⃣','2️⃣','3️⃣','4️⃣'];
                                const activeModelId = params.modelId || 6;
                                const activeModel = MusicModels.find(md => md.id === activeModelId)?.version || 'v5.0';

                                // Section 1 — Pilih variasi + format
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

                                // Section 2 — Ganti Model AI
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

                                // Section 3 — Aksi lainnya
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

                // ─── MusicAI2 generate helper ─────────────────────────────────────────
                const _generateMusik2 = async (hisoka, m, params) => {
                        const { ChatMusicAPI2, buildCaption2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));
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

                                const { formatDuration2: fmtDur2, MODELS2: MusicModels2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));
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

                // ─── Button callbacks: MusicAI ─────────────────────────────────────────

                // Helper: tampilkan pilihan genre dulu (single_select), belum generate
                const _showGenreSelect = async () => {
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

                // 🤖 Random: tampilkan pilihan Bahasa dulu (Indo / Jepang / English)
                if (typeof m.text === 'string' && m.text === '__musikai_random__') {
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
                        return;
                }

                // 🌏 Pilih bahasa → tampilkan Vokal / Instrumental
                if (typeof m.text === 'string' && /^__musikai_rlang__(id|jp|en)$/.test(m.text)) {
                        const lang = m.text.replace('__musikai_rlang__', '');
                        const langLabel = lang === 'jp' ? '🇯🇵 Jepang' : lang === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                        const { _GENRES, _GENRES_JP, _GENRES_EN } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
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
                        return;
                }

                // 🎤/🎹 Generate AI random dengan bahasa + mode terpilih
                if (typeof m.text === 'string' && /^__musikai_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(m.text)) {
                        const match = m.text.match(/^__musikai_rlang__(id|jp|en)__(vocal|instrumental)__$/);
                        const lang = match[1];
                        const forceMode = match[2];
                        const langLabel = lang === 'jp' ? '🇯🇵 Jepang' : lang === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                        const modeLabel = forceMode === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                        try {
                                const _chatmusicPath = path.resolve('./src/scrape/music/chatmusic.cjs');
                                delete _require.cache[_chatmusicPath];
                                const { ChatMusicAPI, _GENRES, _GENRES_JP, _GENRES_EN } = _require(_chatmusicPath);
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

                                await _generateMusik(hisoka, m, preset);
                                console.log(`\x1b[35m[MusicAI Random]\x1b[0m ✅ lang=${lang} mode=${forceMode} genre="${preset.musicStyle}"`);
                        } catch (err) {
                                console.error(`\x1b[31m[MusicAI ${langLabel} ${modeLabel}] Error:\x1b[39m`, err.message);
                                logError(err, 'callback:musikai_random_mode');
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                await sendConfirmWithButtons(hisoka, m,
                                        `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                        [
                                                { text: '🔁 Coba Lagi', id: m.text },
                                                { text: '↩️ Ganti Bahasa', id: '__musikai_random__' },
                                        ],
                                        { quoteBot: true }
                                );
                        }
                        return;
                }

                // Legacy fallback: __musikai_random__vocal__ / __musikai_random__instrumental__ → default ke Indonesia
                if (typeof m.text === 'string' && (m.text === '__musikai_random__vocal__' || m.text === '__musikai_random__instrumental__')) {
                        const forceMode = m.text === '__musikai_random__vocal__' ? 'vocal' : 'instrumental';
                        const modeLabel = forceMode === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                        try {
                                const _chatmusicPath = path.resolve('./src/scrape/music/chatmusic.cjs');
                                delete _require.cache[_chatmusicPath];
                                const { ChatMusicAPI, _GENRES } = _require(_chatmusicPath);
                                const api = new ChatMusicAPI();
                                const randomGenre = _GENRES[Math.floor(Math.random() * _GENRES.length)];

                                const aiLoadMsg = await hisoka.sendMessage(m.from, {
                                        text: `🤖 *AI meracik lagu 🇮🇩 Indonesia ${modeLabel}...*\n│ 🎲 Genre: *${randomGenre}*\n│ ✍️ ${forceMode === 'vocal' ? 'Menulis lirik lengkap' : 'Menyusun komposisi instrumental'}\n│ ⏳ Tunggu ~10-15 detik...`
                                }, { quoted: m }).catch(() => null);

                                const preset = await api.aiRandomPreset(forceMode, 'id');

                                if (aiLoadMsg?.key) {
                                        try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg.key }); } catch (_) {}
                                }

                                await _generateMusik(hisoka, m, preset);
                        } catch (err) {
                                console.error(`\x1b[31m[MusicAI Random ${modeLabel}] Error:\x1b[39m`, err.message);
                                logError(err, 'callback:musikai_random_mode');
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                await sendConfirmWithButtons(hisoka, m,
                                        `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                        [
                                                { text: '🔁 Coba Lagi', id: m.text },
                                                { text: '↩️ Ganti Bahasa', id: '__musikai_random__' },
                                        ],
                                        { quoteBot: true }
                                );
                        }
                        return;
                }

                // 🎨 Pilih Genre Manual: tampilkan daftar genre dulu
                if (typeof m.text === 'string' && m.text === '__musikai_pickgenre__') {
                        await _showGenreSelect();
                        return;
                }

                // Callback setelah user pilih genre dari single_select
                if (typeof m.text === 'string' && m.text.startsWith('__musikai_genre__')) {
                        const selectedGenre = m.text.replace('__musikai_genre__', '').trim();
                        try {
                                const _chatmusicPath2 = path.resolve('./src/scrape/music/chatmusic.cjs');
                                delete _require.cache[_chatmusicPath2];
                                const { ChatMusicAPI } = _require(_chatmusicPath2);
                                const api = new ChatMusicAPI();

                                // Kasih tahu user AI sedang buat lirik
                                const aiLoadMsg = await hisoka.sendMessage(m.from, {
                                        text: `✍️ *AI sedang menulis lirik...*\n│ Genre : *${selectedGenre}*\n│ ⏳ Tunggu ~5 detik...`
                                }, { quoted: m }).catch(() => null);

                                // Generate preset pakai Gemmy AI (judul + lirik otomatis)
                                const preset = await api.aiRandomPreset();
                                preset.musicStyle = selectedGenre;
                                preset.prompt = `${selectedGenre} indonesia, ${preset.prompt?.split(',').slice(1).join(',') || ''}`.trim();

                                // Hapus pesan loading AI
                                if (aiLoadMsg?.key) {
                                        try { await hisoka.sendMessage(m.from, { delete: aiLoadMsg.key }); } catch (_) {}
                                }

                                await _generateMusik(hisoka, m, preset);
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
                        return;
                }

                // Callback: user pilih variasi untuk diputar (format mp3 / vn)
                if (typeof m.text === 'string' && m.text.startsWith('__musikai_play__')) {
                        const raw = m.text.replace('__musikai_play__', '');
                        const lastDbl = raw.lastIndexOf('__');
                        const lastSeg = raw.substring(lastDbl + 2);
                        let key, idx, fmt;
                        if (lastSeg === 'mp3' || lastSeg === 'vn') {
                                // Format baru: cacheKey__idx__fmt
                                fmt = lastSeg;
                                const rest = raw.substring(0, lastDbl);
                                const secLast = rest.lastIndexOf('__');
                                key = rest.substring(0, secLast);
                                idx = parseInt(rest.substring(secLast + 2), 10);
                        } else {
                                // Format lama (backward compat): cacheKey__idx
                                fmt = 'mp3';
                                key = raw.substring(0, lastDbl);
                                idx = parseInt(lastSeg, 10);
                        }
                        const cached = pendingMusikaiCache.get(key);
                        if (!cached) {
                                await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                                await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang dengan *.musikai* atau tekan *Random Lagi*.`);
                                return;
                        }
                        const r = cached.results.find(rv => rv.index === idx);
                        if (!r) {
                                await tolak(hisoka, m, `❌ Variasi ${idx} tidak ditemukan.`);
                                return;
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
                        return;
                }

                // Callback: user pilih model AI → generate ulang dengan model berbeda
                if (typeof m.text === 'string' && m.text.startsWith('__musikai_model__')) {
                        const raw = m.text.replace('__musikai_model__', '');
                        const lastDbl = raw.lastIndexOf('__');
                        const key = raw.substring(0, lastDbl);
                        const modelId = parseInt(raw.substring(lastDbl + 2), 10);
                        const cached = pendingMusikaiCache.get(key);
                        if (!cached) {
                                await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                                await tolak(hisoka, m, `⏰ *Cache expired.* Silakan generate ulang dengan *.musikai*`);
                                return;
                        }
                        const { MODELS: MusicModels } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
                        const modelVer = MusicModels.find(md => md.id === modelId)?.version || `id:${modelId}`;
                        await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                        const newParams = { ...cached.params, modelId };
                        await _generateMusik(hisoka, m, newParams, `🤖 Generate ulang dengan model *${modelVer}*...`);
                        return;
                }

                if (typeof m.text === 'string' && m.text === '__musikai_help__') {
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
                        return;
                }

                if (typeof m.text === 'string' && m.text === '__musikai_menu__') {
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
                        return;
                }

                // ─── Button callbacks: MusicAI2 ────────────────────────────────────────

                // Helper: genre select single_select untuk musikai2
                const _showGenreSelect2 = async () => {
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
                };

                // Callback: __musikai2_random__ → pilih bahasa (native single_select)
                if (typeof m.text === 'string' && m.text === '__musikai2_random__') {
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
                        return;
                }

                // Callback: pilih bahasa → tampilkan Vokal / Instrumental (native single_select)
                if (typeof m.text === 'string' && /^__musikai2_rlang__(id|jp|en)$/.test(m.text)) {
                        const lang2      = m.text.replace('__musikai2_rlang__', '');
                        const langLabel2 = lang2 === 'jp' ? '🇯🇵 Jepang' : lang2 === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                        const { _GENRES: G2, _GENRES_JP: GJP2, _GENRES_EN: GEN2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));
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
                        return;
                }

                // Callback: vokal/instrumental terpilih → generate AI random musikai2
                if (typeof m.text === 'string' && /^__musikai2_rlang__(id|jp|en)__(vocal|instrumental)__$/.test(m.text)) {
                        const match2     = m.text.match(/^__musikai2_rlang__(id|jp|en)__(vocal|instrumental)__$/);
                        const lang2      = match2[1];
                        const forceMode2 = match2[2];
                        const langLabel2 = lang2 === 'jp' ? '🇯🇵 Jepang' : lang2 === 'en' ? '🇬🇧 English' : '🇮🇩 Indonesia';
                        const modeLabel2 = forceMode2 === 'vocal' ? '🎤 Vokal' : '🎹 Instrumental';
                        try {
                                const _cm2Path = path.resolve('./src/scrape/music/chatmusic2.cjs');
                                delete _require.cache[_cm2Path];
                                const { ChatMusicAPI2, _GENRES: G2, _GENRES_JP: GJP2, _GENRES_EN: GEN2 } = _require(_cm2Path);
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

                                await _generateMusik2(hisoka, m, preset2);
                                console.log(`\x1b[35m[MusicAI2 Random]\x1b[0m ✅ lang=${lang2} mode=${forceMode2} genre="${preset2.musicStyle}"`);
                        } catch (err) {
                                console.error(`\x1b[31m[MusicAI2 ${langLabel2} ${modeLabel2}] Error:\x1b[39m`, err.message);
                                logError(err, 'callback:musikai2_random_mode');
                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                await sendConfirmWithButtons(hisoka, m,
                                        `❌ *Gagal generate musik*\n\n_${err.message}_\n\n_Coba lagi dalam beberapa saat_`,
                                        [
                                                { text: '🔁 Coba Lagi', id: m.text },
                                                { text: '↩️ Ganti Bahasa', id: '__musikai2_random__' },
                                        ],
                                        { quoteBot: true }
                                );
                        }
                        return;
                }

                // Callback: play audio musikai2
                if (typeof m.text === 'string' && m.text.startsWith('__musikai2_play__')) {
                        const raw    = m.text.replace('__musikai2_play__', '');
                        const lastDbl = raw.lastIndexOf('__');
                        const lastSeg = raw.substring(lastDbl + 2);
                        let key, idx, fmt;
                        if (lastSeg === 'mp3' || lastSeg === 'vn') {
                                fmt = lastSeg;
                                const rest    = raw.substring(0, lastDbl);
                                const secLast = rest.lastIndexOf('__');
                                key  = rest.substring(0, secLast);
                                idx  = parseInt(rest.substring(secLast + 2), 10);
                        } else {
                                fmt = 'mp3';
                                key  = raw.substring(0, lastDbl);
                                idx  = parseInt(lastSeg, 10);
                        }
                        const cached = pendingMusikai2Cache.get(key);
                        if (!cached) {
                                await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                                await tolak(hisoka, m, `⏰ *Cache sudah expired (10 menit).*\n\nSilakan generate ulang dengan *.musikai2* atau tekan *Random Lagi*.`);
                                return;
                        }
                        const r = cached.results.find(rv => rv.index === idx);
                        if (!r) {
                                await tolak(hisoka, m, `❌ Variasi ${idx} tidak ditemukan.`);
                                return;
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
                        return;
                }

                // Callback: ganti model AI musikai2
                if (typeof m.text === 'string' && m.text.startsWith('__musikai2_model__')) {
                        const raw      = m.text.replace('__musikai2_model__', '');
                        const lastDbl  = raw.lastIndexOf('__');
                        const key      = raw.substring(0, lastDbl);
                        const modelId  = parseInt(raw.substring(lastDbl + 2), 10);
                        const cached   = pendingMusikai2Cache.get(key);
                        if (!cached) {
                                await hisoka.sendMessage(m.from, { react: { text: '⏰', key: m.key } }).catch(() => {});
                                await tolak(hisoka, m, `⏰ *Cache expired.* Silakan generate ulang dengan *.musikai2*`);
                                return;
                        }
                        const { MODELS2: MusicModels2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));
                        const modelVer = MusicModels2.find(md => md.id === modelId)?.version || `id:${modelId}`;
                        await hisoka.sendMessage(m.from, { react: { text: '🤖', key: m.key } }).catch(() => {});
                        await _generateMusik2(hisoka, m, { ...cached.params, modelId });
                        return;
                }

                // Callback: __musikai2_pickgenre__ → tampilkan daftar genre (native single_select)
                if (typeof m.text === 'string' && m.text === '__musikai2_pickgenre__') {
                        await _showGenreSelect2();
                        return;
                }

                // Callback: user pilih genre dari single_select musikai2
                if (typeof m.text === 'string' && m.text.startsWith('__musikai2_genre__')) {
                        const selectedGenre2 = m.text.replace('__musikai2_genre__', '').trim();
                        try {
                                const _cm2PathG = path.resolve('./src/scrape/music/chatmusic2.cjs');
                                delete _require.cache[_cm2PathG];
                                const { ChatMusicAPI2 } = _require(_cm2PathG);
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

                                await _generateMusik2(hisoka, m, preset2g);
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
                        return;
                }

                // Callback: help musikai2 (native single_select)
                if (typeof m.text === 'string' && m.text === '__musikai2_help__') {
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
                        return;
                }

                // Callback: menu musikai2 (native single_select)
                if (typeof m.text === 'string' && m.text === '__musikai2_menu__') {
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
                        return;
                }
                // ──────────────────────────────────────────────────────────────────────

                switch (m.command) {

                        case 'hidetag':
                        case 'ht':
                        case 'all': {
                                const { handleHidetag } = _require(path.resolve('./src/scrape/tools/hidetag.cjs'));
                                await handleHidetag({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer });
                                break;
                        }

                        case 'sematkan':
                        case 'pin':
                        case 'pinpesan': {
                                const { handleSematkan } = _require(path.resolve('./src/scrape/tools/sematkan.cjs'));
                                const _smOk = await handleSematkan(hisoka, m, query, tolak, kvGet);
                                if (_smOk) logCommand(m, hisoka, 'sematkan');
                                break;
                        }

                        case 'pushkontakgc': {
                                const { handlePushkontakgc } = _require(path.resolve('./src/scrape/tools/pushkontakgc.cjs'));
                                await handlePushkontakgc({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer });
                                break;
                        }

                        case 'clearsesi':
                        case 'cs': {
                                const { handleClearsesi } = _require(path.resolve('./src/scrape/tools/clearsesi.cjs'));
                                await handleClearsesi({ hisoka, m, query, tolak, logCommand, getJadibotNumber, jadibotClearSesiMap });
                                break;
                        }

                        case 'cekjidgc':
                        case 'jidgc':
                        case 'infogc': {
                                const { handleCekjidgc } = _require(path.resolve('./src/scrape/tools/cekjidgc.cjs'));
                                await handleCekjidgc({ hisoka, m, tolak, logCommand, Button });
                                break;
                        }

                        case 'cekjidgcall':
                        case 'jidgcall':
                        case 'listjidgc':
                        case 'alljidgc': {
                                const { handleAlljidgc } = _require(path.resolve('./src/scrape/tools/cekjidgcall.cjs'));
                                await handleAlljidgc({ hisoka, m, tolak, logCommand, Button });
                                break;
                        }

                        case 'memori':
                        case 'memory':
                        case 'mymemory':
                        case 'myprofile': {
                                const { handleMemori } = _require(path.resolve('./src/scrape/tools/memory-cmd.cjs'));
                                await handleMemori({ hisoka, m, logCommand, loadUserMemory, memoryToReadable });
                                break;
                        }

                        case 'lupakanaku':
                        case 'resetmemori':
                        case 'resetmemory':
                        case 'forgetme': {
                                const { handleLupakanaku } = _require(path.resolve('./src/scrape/tools/memory-cmd.cjs'));
                                await handleLupakanaku({ hisoka, m, logCommand, clearUserMemory });
                                break;
                        }

                        case 'q':
                        case 'quoted': {
                                const { handleQuoted } = _require(path.resolve('./src/scrape/tools/quoted-cmd.cjs'));
                                await handleQuoted({ hisoka, m, tolak, logCommand, injectMessage });
                                break;
                        }

                                case 'ping':
                                case 'p': {
                                        const { handlePing } = _require(path.resolve('./src/scrape/tools/ping.cjs'));
                                        await handlePing({ hisoka, m, tolak, logCommand, getBotStats, os });
                                        break;
                                }

                        case 'cekspeed':
                        case 'testnet': {
                                const { handleTestnet } = _require(path.resolve('./src/scrape/tools/speedtest.cjs'));
                                await handleTestnet({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'disksize':
                        case 'filesize': {
                                const { handleFilesize } = _require(path.resolve('./src/scrape/tools/ceksize.cjs'));
                                await handleFilesize({ hisoka, m, tolak, logCommand, _require, path });
                                break;
                        }
                        case '>':
                        case 'eval': {
                                const { handleEval } = _require(path.resolve('./src/scrape/tools/eval-cmd.cjs'));
                                await handleEval({ hisoka, m, query, text, tolak, logCommand, util });
                                break;
                        }

                        case '$':
                        case 'bash': {
                                const { handleBash } = _require(path.resolve('./src/scrape/tools/eval-cmd.cjs'));
                                await handleBash({ hisoka, m, query, tolak, logCommand, exec, util });
                                break;
                        }

                        case 'mati':
                        case 'shutdown':
                        case 'matiin': {
                                const { handleMati } = _require(path.resolve('./src/scrape/tools/mati-cmd.cjs'));
                                await handleMati({ hisoka, m, tolak, logCommand, _require, path });
                                break;
                        }

                        case 'restart':
                        case 'rebot':
                        case 'rb': {
                                const { handleRb } = _require(path.resolve('./src/scrape/system/shutdown.cjs'));
                                await handleRb({ hisoka, m, tolak, logCommand, _require });
                                break;
                        }
                        case 'credsjson': {
                                const { handleCredsJson } = _require(path.resolve('./src/scrape/tools/credsjson.cjs'));
                                await handleCredsJson({ hisoka, m, query, tolak, logCommand, isMainBot, path });
                                break;
                        }

                        case 'sessiondb':
                        case 'sessionstat': {
                                const { handleSessionstat } = _require(path.resolve('./src/scrape/tools/ceksesi.cjs'));
                                await handleSessionstat({ hisoka, m, fs, path, logCommand });
                                break;
                        }
                        case 'group':
                        case 'listgroup': {
                                const { handleListgroup } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleListgroup({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'contact':
                        case 'listcontact': {
                                const { handleListcontact } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleListcontact({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'cuaca':
                        case 'weather': {
                                const { handleWeather } = _require(path.resolve('./src/scrape/tools/cuaca.cjs'));
                                await handleWeather({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'tempmail':
                        case 'tmail':
                        case 'tminbox':
                        case 'tmread':
                        case 'tmwait':
                        case 'tmdel': {
                                const { handleTempmail } = _require(path.resolve('./src/scrape/tools/tempmail.cjs'));
                                await handleTempmail({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }

                        case 'pixiv': {
                                const { handlePixiv } = _require(path.resolve('./src/scrape/anime/pixiv.cjs'));
                                await handlePixiv({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'nhentai':
                        case 'nh': {
                                const { handleNh } = _require(path.resolve('./src/scrape/anime/nhentai.cjs'));
                                await handleNh({ hisoka, m, query, tolak, logError, _require, path });
                                break;
                        }
                        case 'nhrand': {
                                const { handleNhrand } = _require(path.resolve('./src/scrape/anime/nhentai.cjs'));
                                await handleNhrand({ hisoka, m, tolak, logCommand, logError });
                                break;
                        }
                        case 'nhget':
                        case 'nhdownload':
                        case 'nhdl': {
                                const { handleNhdl } = _require(path.resolve('./src/scrape/anime/nhentai.cjs'));
                                await handleNhdl({ hisoka, m, query, tolak, logCommand, logError, path });
                                break;
                        }

                        case 'komiktap':
                        case 'komik': {
                                const { handleKomik } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
                                await handleKomik({ hisoka, m, query, tolak, logCommand, logError, path, pendingKomikChoices, getJadibotChoiceKey });
                                break;
                        }

                        case 'komikinfo': {
                                const { handleKomikinfo } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
                                await handleKomikinfo({ hisoka, m, query, tolak, logError, _require, path });
                                break;
                        }
                        case 'komikget':
                        case 'komikdl': {
                                const { handleKomikdl } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
                                await handleKomikdl({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'komikupdate':
                        case 'komikup': {
                                const { handleKomikup } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
                                await handleKomikup({ hisoka, m, tolak, logError, _require, path });
                                break;
                        }
                        case 'kusonime':
                        case 'kuso':
                        case 'anime': {
                                const { handleAnime } = _require(path.resolve('./src/scrape/anime/kusonime.cjs'));
                                await handleAnime({ hisoka, m, query, tolak, logCommand, logError, path });
                                break;
                        }

                        case 'kusonimeupdate':
                        case 'animeupdate': {
                                const { handleAnimeupdate } = _require(path.resolve('./src/scrape/anime/kusonime.cjs'));
                                await handleAnimeupdate({ hisoka, m, tolak, logCommand, logError });
                                break;
                        }
                        case 'alqanime':
                        case 'alq': {
                                const { handleAlq } = _require(path.resolve('./src/scrape/anime/alqanime.cjs'));
                                await handleAlq({ hisoka, m, query, tolak, logCommand, logError, path, pendingAlqDlChoices, getJadibotChoiceKey });
                                break;
                        }

                        case 'alqupdate':
                        case 'alqanimeupdate': {
                                const { handleAlqupdate } = _require(path.resolve('./src/scrape/anime/alqanime.cjs'));
                                await handleAlqupdate({ hisoka, m, tolak, logCommand, logError, _require, path, getJadibotChoiceKey, pendingAlqUpdateChoices });
                                break;
                        }

                        case 'alqdl':
                        case 'alqdownload': {
                                const { handleAlqdownload } = _require(path.resolve('./src/scrape/anime/alqanime-dl.cjs'));
                                await handleAlqdownload({ hisoka, m, query, tolak, logCommand, logError, fs, path });
                                break;
                        }

                        case 'cosplayrand':
                        case 'cosplayrandom':
                        case 'cosplay':
                        case 'ctele': {
                                const { handleCosplay } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
                                await handleCosplay({ hisoka, m, query, tolak, logCommand, logError, _require, path, _sendCosplayImages, pendingCosplayChoices });
                                break;
                        }

                        case 'pixivr18':
                        case 'pixiv18': {
                                const { handlePixiv18 } = _require(path.resolve('./src/scrape/anime/pixivr18.cjs'));
                                await handlePixiv18({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'cekhp':
                        case 'spechp':
                        case 'infohp': {
                                const { handleCekhp } = _require(path.resolve('./src/scrape/tools/cekhp.cjs'));
                                await handleCekhp({ hisoka, m, query, tolak, logCommand, logError, _require, path, gemini });
                                break;
                        }

                        case 'compare':
                        case 'vsbandingkan': {
                                const { handleVsbandingkan } = _require(path.resolve('./src/scrape/tools/bandingkanhp.cjs'));
                                await handleVsbandingkan({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'anigame':
                        case 'gamean1':
                        case 'an1game': {
                                const { handleAn1game } = _require(path.resolve('./src/scrape/tools/an1game.cjs'));
                                await handleAn1game({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, Button });
                                break;
                        }

                        case 'bluearchive':
                        case 'bachar':
                        case 'ba': {
                                const { handleBa } = _require(path.resolve('./src/scrape/anime/bluearchive.cjs'));
                                await handleBa({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'geniussearch':
                        case 'carilagu': {
                                const { handleCarilagu } = _require(path.resolve('./src/scrape/music/genius.cjs'));
                                await handleCarilagu({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'musikai':
                        case 'aimusik': {
                                const { handleMusikai } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
                                await handleMusikai({ hisoka, m, query, tolak, logCommand, logError, _require, path, sendConfirmWithButtons, _generateMusik, _showGenreSelect });
                                break;
                        }
                        case 'musikai2':
                        case 'aimusik2': {
                                const { handleMusikai2 } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));
                                await handleMusikai2({ hisoka, m, query, tolak, logCommand, logError, _require, path, sendConfirmWithButtons, _generateMusik2 });
                                break;
                        }

                        case 'gdetail':
                        case 'detailgenius': {
                                const { handleDetailgenius } = _require(path.resolve('./src/scrape/music/genius.cjs'));
                                await handleDetailgenius({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'whatsmusik':
                        case 'whatmusic':
                        case 'wmusik':
                        case 'tebaklagu':
                        case 'shazam':
                        case 'carijudullagu': {
                                const { handleWhatsmusik } = _require(path.resolve('./src/scrape/music/whatsmusik.cjs'));
                                await handleWhatsmusik({ hisoka, m, query, tolak, logCommand, logError, _require, path, getMediaTypeFromMessage, downloadMediaBuffer, ensureYtdlp });
                                break;
                        }

                        case 'menu': {
                                const { handleMenu } = _require(path.resolve('./src/scrape/menu/menu-cmd.cjs'));
                                await handleMenu({ hisoka, m, tolak, logCommand, loadConfig, Button, getJadibotNumber, getJadibotReadsw, getJadibotAntidel, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, jadibotConnectedAt, getJadibotExpiry, getJadibotExpirySummary, getHandler, CEKAUTO_FITUR_LIST, BROWSER_LIST, TOTAL_CMD_COUNT, getUserProfilePictureUrl, isNoSpaceError, cleanupWritePressure });
                                break;
                        }

                        case 'allmenu': {
                                const { handleAllmenu } = _require(path.resolve('./src/scrape/menu/menupages.cjs'));
                                await handleAllmenu({ hisoka, m, query, loadConfig, logCommand, fs, path });
                                break;
                        }
                        case 'settingmenu': {
                                const { handleSettingmenu } = _require(path.resolve('./src/scrape/menu/menu-pages2.cjs'));
                                await handleSettingmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'groupmenu': {
                                const { handleGroupmenu } = _require(path.resolve('./src/scrape/menu/menu-pages2.cjs'));
                                await handleGroupmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'statusmenu': {
                                const { handleStatusmenu } = _require(path.resolve('./src/scrape/menu/menu-pages2.cjs'));
                                await handleStatusmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'downloadmenu': {
                                const { handleDownloadmenu } = _require(path.resolve('./src/scrape/menu/menu-pages2.cjs'));
                                await handleDownloadmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'jadibotmenu': {
                                const { handleJadibotmenu } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleJadibotmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'ownermenu': {
                                const { handleOwnermenu } = _require(path.resolve('./src/scrape/menu/menupages.cjs'));
                                await handleOwnermenu({ hisoka, m, query, loadConfig, logCommand, fs, path });
                                break;
                        }
                        case 'info': {
                                const { handleInfo } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleInfo({ hisoka, m, query, tolak, logCommand, loadConfig, fs, path });
                                break;
                        }

                        case 'changelog':
                        case 'update': {
                                const { handleUpdate } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleUpdate({ hisoka, m, tolak, logCommand, path, fs, isMainBot });
                                break;
                        }
                        case 'addown':
                        case 'addowner': {
                                const { handleAddowner } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleAddowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'delown':
                        case 'delowner': {
                                const { handleDelowner } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleDelowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'owner':
                        case 'own': {
                                const { handleOwn } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleOwn({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'memory': {
                                const { handleMemory } = _require(path.resolve('./src/scrape/tools/ceksesi.cjs'));
                                await handleMemory({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'rvo':
                        case 'viewonce':
                        case 'vo': {
                                const { handleVo } = _require(path.resolve('./src/scrape/tools/viewonce.cjs'));
                                await handleVo({ hisoka, m, query, tolak, logCommand, loadConfig, quoted, downloadMediaMessage, isJidGroup, hasViewOnceCache, getViewOnceCache });
                                break;
                        }

                        case 'getsw':
                        case 'sw': {
                                const { handleSw } = _require(path.resolve('./src/scrape/tools/getsw.cjs'));
                                await handleSw({ hisoka, m, query, tolak, logCommand, loadConfig, downloadMediaMessage, isJidGroup });
                                break;
                        }

                        case 'ram': {
                                const { handleRam } = _require(path.resolve('./src/scrape/tools/ceksesi.cjs'));
                                await handleRam({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'typ': {
                                const { handleTyp } = _require(path.resolve('./src/scrape/tools/autotyprec.cjs'));
                                await handleTyp({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoTyping, setJadibotUserSetting });
                                break;
                        }
                        case 'recording':
                        case 'record': {
                                const { handleRecord } = _require(path.resolve('./src/scrape/tools/autotyprec.cjs'));
                                await handleRecord({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoRecording, setJadibotUserSetting });
                                break;
                        }
                        case 'simi': {
                                const { handleSimi } = _require(path.resolve('./src/scrape/tools/wilyai.cjs'));
                                await handleSimi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'wilyai': {
                                const { handleWilyai } = _require(path.resolve('./src/scrape/tools/wilyai.cjs'));
                                await handleWilyai({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, countHistory, clearAllHistory, clearAllUserMemory });
                                break;
                        }

                        case 'wily':
                        case 'ai':
                        case 'tanya': {
                                const { handleWily } = _require(path.resolve('./src/scrape/ai/wilycmd.cjs'));
                                await handleWily({ hisoka, m, query, tolak, logCommand, loadConfig, gemini, getUserName, getSessionKey, getHistory, addToHistory, clearHistory, buildHistoryMeta, wrapCurrentUserMessage, detectAndUpdateMemory, searchAndGetImages, buildWilyAICommandPrompt, buildWilyMediaUserPrompt, startTyping, getMediaTypeFromMessage, getQuotedMediaBuffer, getCachedQuotedMedia, getMediaInfo, rememberAIMedia, detectImageSearchQuery, extractImageCount, buildSmartImageWaitText, buildSmartAlbumCaptions, sendImageAlbum, buildSmartImageHistoryReply, processAIMediaAndSend });
                                break;
                        }

                        case 'antidel':
                        case 'ad': {
                                const { handleAd } = _require(path.resolve('./src/scrape/tools/antidel.cjs'));
                                await handleAd({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAntidel, setJadibotUserSetting });
                                break;
                        }

                        case 'readsw': {
                                const { handleReadsw } = _require(path.resolve('./src/scrape/tools/readsw.cjs'));
                                await handleReadsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadsw, setJadibotUserSetting });
                                break;
                        }

                        case 'cekauto':
                        case 'cekfitur':
                        case 'autolist': {
                                const { handleCekauto } = _require(path.resolve('./src/scrape/tools/cekauto-cmd.cjs'));
                                await _handleCekautoFn({ hisoka, m, query, tolak, logCommand });
                                break;
                        }

                        case 'botadmin': {
                                const { handleBotadmin } = _require(path.resolve('./src/scrape/tools/botadmin-cmd.cjs'));
                                await handleBotadmin({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet });
                                break;
                        }

                        case 'ceksw': {
                                const { handleCeksw } = _require(path.resolve('./src/scrape/tools/ceksw.cjs'));
                                await handleCeksw({ hisoka, m, query, tolak, logCommand, fs, path, loadConfig, saveConfig, getJadibotNumber, pruneSwStatsAt, countActiveSW });
                                break;
                        }

                        case 'ceksetting': {
                                const { handleCeksetting } = _require(path.resolve('./src/scrape/tools/ceksetting.cjs'));
                                await handleCeksetting({ hisoka, m, tolak, logCommand, isMainBot, getJadibotNumber, getJadibotExpiry, getJadibotExpirySummary, jadibotMap, maskNumber, formatRemainingTime, loadConfig });
                                break;
                        }

                        case 'telegram':
                        case 'tele': {
                                const { handleTele } = _require(path.resolve('./src/scrape/tools/telegram.cjs'));
                                await handleTele({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig });
                                break;
                        }

                        case 'add': {
                                const { handleAddEmoji } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleAddEmoji({ hisoka, m, query, tolak, logCommand, isMainBot });
                                break;
                        }
                        case 'd':
                        case 'del': {
                                const { handleDel } = _require(path.resolve('./src/scrape/tools/del-cmd.cjs'));
                                await handleDel({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet });
                                break;
                        }

                        case 'list': {
                                const { handleListEmoji } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleListEmoji({ hisoka, m, query, tolak, logCommand, isMainBot });
                                break;
                        }
                        case 'emojiadd': {
                                const { handleEmojiadd } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleEmojiadd({ hisoka, m, query, tolak, logCommand, getJadibotNumber, addJadibotEmojis, listJadibotEmojis });
                                break;
                        }

                        case 'emojidel': {
                                const { handleEmojidel } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleEmojidel({ hisoka, m, query, tolak, logCommand, getJadibotNumber, deleteJadibotEmojis, listJadibotEmojis });
                                break;
                        }

                        case 'emojilist': {
                                const { handleEmojilist } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleEmojilist({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis });
                                break;
                        }

                        case 'emojidefault': {
                                const { handleEmojidefault } = _require(path.resolve('./src/scrape/tools/emoji-cmd.cjs'));
                                await handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis });
                                break;
                        }

                        case 'emojicustom': {
                                const { handleEmojicustom } = _require(path.resolve('./src/scrape/tools/emoji-cmd.cjs'));
                                await handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis });
                                break;
                        }

                        case 'emojiclear': {
                                const { handleEmojiclear } = _require(path.resolve('./src/scrape/tools/emoji-cmd.cjs'));
                                await handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis });
                                break;
                        }

                        case 'online': {
                                const { handleOnline } = _require(path.resolve('./src/scrape/tools/online.cjs'));
                                await handleOnline({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoOnline, setJadibotUserSetting, startJadibotAutoOnline });
                                break;
                        }

                        case 'anticall':
                        case 'ac': {
                                const { handleAc } = _require(path.resolve('./src/scrape/tools/anticall.cjs'));
                                await handleAc({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticall, setJadibotUserSetting });
                                break;
                        }

                        case 'anticallvid':
                        case 'acv': {
                                const { handleAcv } = _require(path.resolve('./src/scrape/tools/anticall.cjs'));
                                await handleAcv({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticallvid, setJadibotUserSetting });
                                break;
                        }

                        case 'autocleaner': {
                                const { handleAutocleaner } = _require(path.resolve('./src/scrape/system/autocleaner.cjs'));
                                await handleAutocleaner({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, restartAutoCleaner, stopAutoCleaner, clearOldFiles });
                                break;
                        }

                        case 'sessioncleaner': {
                                const { handleSessioncleaner } = _require(path.resolve('./src/scrape/system/sessioncleaner.cjs'));
                                await handleSessioncleaner({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, cleanStaleSessionFiles });
                                break;
                        }

                        case 'aturbrowser':
                        case 'setbrowser': {
                                const { handleAturBrowser } = _require(path.resolve('./src/scrape/tools/aturbrowser.cjs'));
                                await handleAturBrowser({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, BROWSER_LIST, listAturBrowserMap, pendingAturBrowser });
                                break;
                        }

                        case 'batalbrowser': {
                                const { handleBatalBrowser } = _require(path.resolve('./src/scrape/tools/aturbrowser.cjs'));
                                await handleBatalBrowser({ hisoka, m, tolak, logCommand, isMainBot, pendingAturBrowser });
                                break;
                        }

                        case 'react':
                        case 'reaksi': {
                                const { handleReaksi } = _require(path.resolve('./src/scrape/tools/reactapi.cjs'));
                                await handleReaksi({ hisoka, m, query, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'cekreact':
                        case 'reactinfo': {
                                const { handleReactinfo } = _require(path.resolve('./src/scrape/tools/reactapi.cjs'));
                                await handleReactinfo({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'setreactapi':
                        case 'reactapi': {
                                const { handleReactapi } = _require(path.resolve('./src/scrape/tools/reactapi.cjs'));
                                await handleReactapi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig });
                                break;
                        }
                        case 'setpairing': {
                                const { handleSetpairing } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleSetpairing({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'tt': {
                                try {
                                        const { handleTiktokDl } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleTiktokDl(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                } catch (error) {
                                        console.error('\x1b[31m[TikTok] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'ig': {
                                try {
                                        const { handleInstagramDl } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleInstagramDl(hisoka, m, query, { gemini, tolak, logCommand, exec, util, buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount });
                                } catch (error) {
                                        console.error('\x1b[31m[Instagram] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'fb': {
                                try {
                                        const { handleFacebookDl } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleFacebookDl(hisoka, m, query, { gemini, tolak, logCommand, buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption, parseFbMetaHtml, formatFbCount });
                                } catch (error) {
                                        console.error('\x1b[31m[Facebook] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'twdl':
                        case 'xdl':
                        case 'twitterdl':
                        case 'twitter': {
                                try {
                                        const _twPath = path.resolve('./src/scrape/download/twitter-dl.cjs');
                                        delete _require.cache[_twPath];
                                        const { handleTwitterDl } = _require(_twPath);
                                        await handleTwitterDl(hisoka, m, query, { tolak, logCommand });
                                } catch (error) {
                                        console.error('\x1b[31m[TwitterDl] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'allunduh':
                        case 'unduhsemua':
                        case 'dl': {
                                try {
                                        const { handleAllUnduh } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleAllUnduh(hisoka, m, query, {
                                                gemini, tolak, logCommand, exec, util,
                                                buildVideoDownloadCaptionPrompt,
                                                buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount,
                                                buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption, parseFbMetaHtml, formatFbCount,
                                        });
                                } catch (error) {
                                        console.error('\x1b[31m[AllUnduh] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'stickerly':
                        case 'stikerly':
                        case 'stickly':
                        case 'stickerpack':
                        case 'stikerpack': {
                                const { handleStikerpack } = _require(path.resolve('./src/scrape/download/stickerly.cjs'));
                                await handleStikerpack({ hisoka, m, query, tolak, logCommand, path });
                                break;
                        }

                        case 'stiker':
                        case 'sticker':
                        case 's': {
                                const { handleSticker } = _require(path.resolve('./src/scrape/tools/sticker-cmd.cjs'));
                                await handleSticker({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getMediaTypeFromMessage, downloadMediaBuffer, getQuotedMediaBuffer, unwrapMessagePayload, exec, util, path, fs });
                                break;
                        }

                        case 'tovn': {
                                const { handleTovn } = _require(path.resolve('./src/scrape/tools/audioconvert.cjs'));
                                const pfx = m.prefix || '.';
                                await handleTovn({ hisoka, m, tolak, logCommand, downloadMediaMessage, pfx });
                                break;
                        }

                        case 'tomp3': {
                                const { handleTomp3 } = _require(path.resolve('./src/scrape/tools/audioconvert.cjs'));
                                const pfx = m.prefix || '.';
                                await handleTomp3({ hisoka, m, tolak, logCommand, downloadMediaMessage, pfx });
                                break;
                        }

                        case 'infomusik':
                        case 'infolirik':
                        case 'musicinfo':
                        case 'cekmusik': {
                                const { handleInfomusik } = _require(path.resolve('./src/scrape/music/infomusik.cjs'));
                                await handleInfomusik({ hisoka, m, tolak, logCommand, getMediaTypeFromMessage, downloadMediaMessage, Button, loadConfig, _require, path });
                                break;
                        }

                        case 'toimg': {
                                const { handleToimg } = _require(path.resolve('./src/scrape/tools/toimg-cmd.cjs'));
                                await handleToimg({ hisoka, m, query, tolak, logCommand, quoted, downloadMediaMessage, exec, util, path, fs });
                                break;
                        }

                        case 'wm':
                        case 'swm': {
                                await handleWmCommand({ hisoka, m, query, tolak, logCommand, downloadMediaBuffer, getQuotedMediaBuffer, getMediaTypeFromMessage });
                                break;
                        }

                        case 'jadibot': {
                                const { handleJadibot } = _require(path.resolve('./src/scrape/tools/jadibot-cmd.cjs'));
                                await handleJadibot({ hisoka, m, query, tolak, logCommand, isMainBot, path, fs, jadibotMap, parseJadibotDuration, startJadibot, maskNumber, getJadibotExpirySummary, scheduleJadibotExpiry, setPermanentJadibot, removeJadibotExpiry, ensureJadibotExpiry });
                                break;
                        }

                        case 'upbot': {
                                const { handleUpbot } = _require(path.resolve('./src/scrape/tools/jadibot-cmd.cjs'));
                                await handleUpbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotDuration, getJadibotExpirySummary, getJadibotExpiry, extendJadibotExpiry, setPermanentJadibot, scheduleJadibotExpiry, maskNumber, formatRemainingTime });
                                break;
                        }

                        case 'stopbot': {
                                const { handleStopbot } = _require(path.resolve('./src/scrape/tools/jadibot-cmd.cjs'));
                                await handleStopbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, stopJadibot, getJadibotExpiry, getJadibotChoiceKey, pendingJadibotChoices, maskNumber, formatRemainingTime });
                                break;
                        }

                        case 'backup': {
                                const { runBackup } = _require(path.resolve('./src/scrape/system/backup.cjs'));
                                await runBackup(hisoka, m, query, tolak, loadConfig, logCommand);
                        }
                                break;

                        case 'ceksesi': {
                                const { handleCeksesi } = _require(path.resolve('./src/scrape/tools/ceksesi.cjs'));
                                await handleCeksesi({ hisoka, m, tolak, logCommand, getJadibotNumber, jadibotSesiReportMap });
                                break;
                        }

                        case 'cekerror': {
                                const { handleCekerror } = _require(path.resolve('./src/scrape/tools/cekerror-cmd.cjs'));
                                await handleCekerror({ hisoka, m, query, tolak, logCommand, clearErrors, formatErrorReport, generateErrorFileTxt, getInfoErrorTxtPath, getErrorStats, fs });
                                break;
                        }

                        case 'listbot': {
                                const { handleListbot } = _require(path.resolve('./src/scrape/tools/listbot-cmd.cjs'));
                                await handleListbot({ hisoka, m, tolak, logCommand, isMainBot, jadibotMap, getJadibotExpiry, getJadibotExpirySummary, cleanupExpiredJadibots, pendingJadibotChoices, getJadibotChoiceKey, jadibotConnectedAt, getUserName });
                                break;
                        }

                        case 'play': {
                                const { handlePlay } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                await handlePlay(hisoka, m, query, { tolak, logCommand, pendingPlayChoices, Button });
                                break;
                        }

                        case 'ytmp3': {
                                const { handleYtmp3 } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                await handleYtmp3(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                break;
                        }

                        case 'ytmp4': {
                                const { handleYtmp4 } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                await handleYtmp4(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                break;
                        }
                        case 'antitagsw': {
                                const { handleAntitagsw } = _require(path.resolve('./src/scrape/tools/antitagsw.cjs'));
                                await handleAntitagsw({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, getJadibotNumber, jadibotMap, sendConfirmWithButtons });
                                break;
                        }

                        case 'welgod':
                        case 'setwelgod': {
                                const { handleSetwelgod } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleSetwelgod({ hisoka, m, query, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'welcome':
                        case 'goodbye':
                        case 'setwelcome':
                        case 'setgoodbye': {
                                const { handleSetgoodbye } = _require(path.resolve('./src/scrape/tools/setgoodbye.cjs'));
                                await handleSetgoodbye({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, sendConfirmWithButtons, fs, path });
                                break;
                        }

                        case 'upswgc':
                        case 'swgc':
                        case 'swgrup':
                        case 'swgroup':
                        case 'statusgrup':
                        case 'statusgroup': {
                                const { handleUpswgc } = _require(path.resolve('./src/scrape/tools/upswgc.cjs'));
                                return handleUpswgc(hisoka, m, query, tolak);
                        }

                        case 'upswgcv2':
                        case 'swgcv2':
                        case 'swgrupv2':
                        case 'swgroupv2':
                        case 'statusgrupv2':
                        case 'statusgroupv2': {
                                const { handleUpswgcV2 } = _require(path.resolve('./src/scrape/tools/upswgcv2.cjs'));
                                return handleUpswgcV2(hisoka, m, query, tolak);
                        }

                        case 'sendstatus': {
                                const { handleSendstatus } = _require(path.resolve('./src/scrape/tools/sendstatus.cjs'));
                                await handleSendstatus({ hisoka, m, query, tolak, logCommand, generateWAMessageContent, generateWAMessageFromContent });
                                break;
                        }

                        case 'ghosttag':
                        case 'gt':
                        case 'gtag': {
                                const { handleGhosttag } = _require(path.resolve('./src/scrape/tools/ghosttag.cjs'));
                                await handleGhosttag({ hisoka, m, query, tolak, logCommand, generateWAMessageFromContent, Button });
                                break;
                        }

                        case 'hd':
                        case 'remini':
                        case 'hdr':
                        case 'hdvid':
                        case 'vidhd':
                        case 'hdvideo': {
                                const { handleHdvideo } = _require(path.resolve('./src/scrape/download/hdvid.cjs'));
                                await handleHdvideo({ hisoka, m, query, tolak, logCommand, fs, path, quoted, downloadMediaMessage });
                                break;
                        }

                        case 'aiedit':
                        case 'editgambar':
                        case 'editai': {
                                const { handleAiedit } = _require(path.resolve('./src/scrape/ai/imageEdit.cjs'));
                                await handleAiedit({ hisoka, m, query, tolak, logCommand, downloadMediaMessage });
                                break;
                        }

                        case 'ss':
                        case 'screenshot': {
                                const { handleScreenshot } = _require(path.resolve('./src/scrape/tools/screenshot.cjs'));
                                await handleScreenshot({ hisoka, m, query, tolak, logCommand, _require });
                                break;
                        }
                        case 'scrapeweb':
                        case 'webinfo': {
                                const { handleWebinfo } = _require(path.resolve('./src/scrape/tools/screenshot.cjs'));
                                await handleWebinfo({ hisoka, m, query, tolak, logCommand, path, _require });
                                break;
                        }
                        case 'autosholat': {
                                const { handleAutosholat } = _require(path.resolve('./src/scrape/tools/autosholat.cjs'));
                                await handleAutosholat({ hisoka, m, query, tolak, logCommand, path, loadConfig });
                                break;
                        }

                        case 'infowibu': {
                                const { handleInfowibu } = _require(path.resolve('./src/scrape/anime/infowibu.cjs'));
                                await handleInfowibu({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, _require });
                                break;
                        }

                        case 'animasu': {
                                const { handleAnimasu } = _require(path.resolve('./src/scrape/anime/animasu.cjs'));
                                await handleAnimasu({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig });
                                break;
                        }

                        case 'alqanimenotif': {
                                const { handleAlqanimeNotif } = _require(path.resolve('./src/scrape/anime/alqanime-monitor.cjs'));
                                await handleAlqanimeNotif({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig });
                                break;
                        }

                        case 'tvone': {
                                const { handleTvone } = _require(path.resolve('./src/scrape/news/tvonenews.cjs'));
                                await handleTvone({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path });
                                break;
                        }

                        case 'malnews': {
                                const { handleMalnews } = _require(path.resolve('./src/scrape/news/malnews.cjs'));
                                await handleMalnews({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path });
                                break;
                        }

                        default:
                                break;
                }
        } catch (error) {
                const errMsg = error?.message || String(error);
                const cmdSrc = `command:${m?.command || '?'}`;
                console.error(`\x1b[31m[Handler] Error on command "${m?.command || '?'}":\x1b[39m`, errMsg);
                if (isNoSpaceError(error)) cleanupWritePressure();
                logError(error, cmdSrc);
                try {
                        if (m?.reply && m?.command) {
                                const errorText = isNoSpaceError(error)
                                        ? `❌ Perintah *.${m.command}* sempat gagal karena ruang tulis sementara penuh.\n\nPembersihan otomatis sudah dijalankan. Coba ketik perintahnya lagi.`
                                        : `❌ Terjadi error pada perintah *.${m.command}*\n\n_${errMsg}_\n\nBot tetap berjalan, coba lagi atau gunakan perintah lain.`;
                                await hisoka.sendMessage(m.from, { text: errorText }, { quoted: m });
                        }
                } catch (_) {}
        }
}
