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

import { msToTime, loadConfig, saveConfig, getCaseName, getCaseGroups, getAIPersonaName, getAIPersonaGreeting } from './src/helper/utils.js';
import { BROWSER_LIST } from './name_perangkat_tertautan.js';
import { stopAutoCleaner, restartAutoCleaner, cleanStaleSessionFiles, clearOldFiles, clearTmpFolder } from './src/helper/cleaner.js';
import { getUptimeFormatted, getBotStats } from './src/db/botStats.js';
import { logError, formatErrorReport, clearErrors, generateErrorFileTxt, getInfoErrorTxtPath, getErrorStats } from './src/db/errorLog.js';
import { startJadibot, startJadibotQR, stopJadibot, jadibotMap, jadibotClearSesiMap, jadibotSesiReportMap, jadibotConnectedAt, pendingJadibotChoices, formatPairingCode, maskNumber, parseJadibotDuration, getJadibotExpiry, formatRemainingTime, getJadibotExpirySummary, cleanupExpiredJadibots, removeJadibotExpiry, setPermanentJadibot, ensureJadibotExpiry, extendJadibotExpiry, reduceJadibotExpiry, scheduleJadibotExpiry, startJadibotAutoOnline } from './src/helper/jadibot.js';
import { hasViewOnceCache, getViewOnceCache } from './src/helper/voCache.js';
import { isAntiTagSWEnabled, toggleAntiTagSW, resetWarnings, getWarnings, getAllAntiTagSWGroups, getAntiTagSWLog, clearAntiTagSWLog, resolveLidFromContacts, handleAntitagsw as _handleAntitagswFn, handleAntitagswCallbacks as _handleAntitagswCallbacksFn } from './SEMUA_FITUR/antitagsw/antitagsw.js';
import { handleAntilink as _handleAntilinkFn, handleAntilinkCallbacks as _handleAntilinkCallbacksFn, handleAntilinkStatusReply as _handleAntilinkStatusReplyFn } from './SEMUA_FITUR/antilink/antilink.js';
import handleAntiTagBotAuto, { handleAntitag as _handleAntitagFn } from './SEMUA_FITUR/antitag/antitag.js';
import { handleAd as _handleAdFn } from './SEMUA_FITUR/antidel/antidelete.js';
// yg bawah pindah ke sini
import { injectMessage } from './src/helper/inject.js';
import listenEvent from './SEMUA_FITUR/event/event.js';
import gemini from './src/helper/gemini.js';
import { updateUserName, getUserName } from './src/db/userDb.js';
import { loadUserMemory, detectAndUpdateMemory, clearUserMemory, clearAllUserMemory, memoryToReadable } from './src/helper/userMemory.js';
import { searchAndGetImage, searchAndGetImages, extractImagesFromText } from './src/helper/imageSearch.js';
import { extractSongsFromText, extractVideosFromText, extractReplyStickersFromText, extractTikTokFromText, extractInstagramFromText, extractYouTubeAudioFromText, hasMediaDownloadMarker, hasSocialDLMarker, hasStickerMarker, extractVoiceNotesFromText, extractStickersFromText } from './src/helper/aiTools.js';
import { getHistory, addToHistory, clearHistory, clearAllHistory, countHistory, getSessionKey, buildHistoryMeta, wrapCurrentUserMessage } from './src/db/aiHistory.js';
import { kvGet, kvSet } from './src/db/datadb.js';
import { sendAIReply } from './src/helper/aiReact.js';
import { buildSmartAlbumCaptionPrompt, buildSmartImageHistoryPrompt, buildSmartImageWaitPrompt, buildWilyAICommandPrompt, buildWilyFallbackUserPrompt, buildWilyMediaUserPrompt, buildWilyVisionContextPrompt, buildVideoDownloadCaptionPrompt, buildStickerAnalysisExtractionPrompt } from './src/helper/aiPrompt.js';
import { buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount } from './src/helper/AiPromptIg.js';
import { buildFbVisionPrompt, buildFbCaptionPrompt, buildFbFallbackCaption, parseFbMetaHtml, formatFbCount } from './src/helper/AiPromptFb.js';
import { hashSticker, lookupSticker, saveSticker, incrementStickerSeen, buildStickerContextHint, getStickerMemoryStats } from './src/helper/stickerMemory.js';
import { getJadibotAntidel, getJadibotReadsw, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, getJadibotReadchat, setJadibotUserSetting, getJadibotNumber, addJadibotEmojis, deleteJadibotEmojis, listJadibotEmojis, getJadibotEmojiMode, setDefaultEmojiMode, setCustomEmojiMode, resetToDefaultEmojis, clearJadibotEmojis } from './src/helper/jadibotSettings.js';
import { getMode as getMainEmojiMode } from './src/helper/emoji.js';
import { pruneSwStatsAt, countActiveSW } from './src/helper/swtrack.js';
import { getHandler } from './src/helper/hotReload.js';
const { makeWmSticker, handleWmCommand } = _require('./SEMUA_FITUR/media/wm.cjs');
const { makeCekautoHelpers: _makeCekautoHelpers } = _require(path.resolve('./SEMUA_FITUR/setting/cekauto-cmd.cjs'));
const { resolveThumbnailMedia, startTyping, makeInteractiveMsg: _makeInteractiveMsg } = _require(path.resolve('./SEMUA_FITUR/helper/interactive-msg.cjs'));
const { AI_MEDIA_CACHE_TTL, AI_MEDIA_TYPES, ensureAIMediaCache, rememberAIMedia, getQuotedStanzaId, getCachedQuotedMedia, unwrapMessagePayload, getMediaTypeFromMessage, downloadMediaBuffer, getQuotedMediaBuffer, getMediaInfo } = _require(path.resolve('./SEMUA_FITUR/helper/media-helper.cjs'));
const { makeLogCmd: _makeLogCmd } = _require(path.resolve('./SEMUA_FITUR/helper/log-cmd.cjs'));
const { normalizeJadibotNumber } = _require(path.resolve('./SEMUA_FITUR/jadibot/jadibot-cmd.cjs'));
const { formatAlqLinkMsg, pickBestAlqLink, getAllAlqLinksByPriority } = _require(path.resolve('./SEMUA_FITUR/anime/alqolam-helpers.cjs'));
const { detectImageSearchQuery, extractImageCount, cleanImageTitle, makeWilyHelpers: _makeWilyHelpers } = _require(path.resolve('./SEMUA_FITUR/ai/wily-helpers.cjs'));
const { handleAutoSimi } = _require(path.resolve('./SEMUA_FITUR/ai/autosimi-cmd.cjs'));
const { handleMusicAICallbacks } = _require(path.resolve('./SEMUA_FITUR/music/musikai-cmd.cjs'));
const { handleMusicAI2Callbacks } = _require(path.resolve('./SEMUA_FITUR/music/musikai2-cmd.cjs'));
const { handleAlqUpdateChoice, handleAlqDlChoice } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime-cmd.cjs'));
const { handleCosplayChoice, sendCosplayImages: _sendCosplayImages } = _require(path.resolve('./SEMUA_FITUR/anime/cosplay-cmd.cjs'));
const { handleKomiktapChoice } = _require(path.resolve('./SEMUA_FITUR/anime/komiktap-cmd.cjs'));
const { handleSetbrowserListReply, handleSetbrowserConfirmReply } = _require(path.resolve('./SEMUA_FITUR/setting/setbrowser-cmd.cjs'));
const { handlePlayChoice } = _require(path.resolve('./SEMUA_FITUR/music/play-cmd.cjs'));

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
const { logCommand, _logCmdBox } = _makeLogCmd({ maskNumber });

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
    CEKAUTO_FITUR_LIST,
    saveCekautoTimestamp,
    handleCekauto: _handleCekautoFn,
    handleCekautoCallbacks: _handleCekautoCallbacksFn,
} = _makeCekautoHelpers({
    loadConfig, saveConfig, getAllAntiTagSWGroups, toggleAntiTagSW, isAntiTagSWEnabled,
    sendConfirmWithButtons, tolak,
});

// ── AntiTagSW callbacks (button/session reply) — imported from antitagsw.js ──

const pendingPlayChoices = new Map();
const pendingMusikaiCache  = new Map(); // key → { results, params, ts }
const pendingMusikai2Cache = new Map(); // key → { results, params, ts } (musikai2)
const pendingAlqDlChoices = new Map();
const pendingAlqUpdateChoices = new Map();
const pendingAlqNotifChoices = new Map();
const pendingAntilinkChoices = new Map();
const pendingCosplayChoices = new Map();
const pendingKomikChoices = new Map();
const pendingFontuntikChoices = new Map(); // key → { text, botMsgId, expiresAt, timeout }
const pendingWaifuChoices     = new Map(); // key → { stage, mode, botMsgKey, expiresAt, timeout }
const pendingHentaidadChoices = new Map(); // key → { results, botMsgId, expiresAt, loading, timeout }

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
        this._selfReply = false;
    }
    selfReply() { this._selfReply = true; return this; }
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
            const header = {
                title: this._title,
                subtitle: this._subtitle,
                hasMediaAttachment: !!this._data,
                ...(this._data ? await prepareWAMessageMedia(this._data, { upload: conn.waUploadToServer }) : {})
            };

            // Fungsi pembuat content BARU tiap kali dipanggil
            // → mencegah circular reference akibat Baileys mutasi contextInfo in-place
            const makeContent = () => ({
                interactiveMessage: {
                    body: { text: this._body },
                    footer: { text: this._footer },
                    header,
                    contextInfo: { ...this._contextInfo },
                    nativeFlowMessage: {
                        messageParamsJson: JSON.stringify(this._params),
                        buttons: this._beton
                    }
                }
            });

            // ── Self-reply: generate temp (content baru) → ambil ID →
            //   generate final (content baru lagi) dengan ID sama + quoted=temp
            //   → Baileys inject contextInfo self-reply tanpa circular reference ✓
            let finalQuoted = quoted;
            let forceMessageId;
            if (this._selfReply) {
                const temp = generateWAMessageFromContent(jid, makeContent(), { userJid: conn.user?.id });
                finalQuoted    = temp;
                forceMessageId = temp.key.id;
            }

            const msg = generateWAMessageFromContent(jid, makeContent(), {
                userJid : conn.user?.id,
                quoted  : finalQuoted,
                ...(forceMessageId ? { messageId: forceMessageId } : {})
            });
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

                // Anti-Tag Bot sudah dihandle via dedicated listener di index.js

                // AutoSimi / WilyAutoReply → autosimi-cmd.cjs
                if (await handleAutoSimi({ hisoka, m, messagesType,
                        loadConfig, gemini, getUserName, getAIPersonaName, getAIPersonaGreeting,
                        getMediaTypeFromMessage, getCachedQuotedMedia, getQuotedMediaBuffer, getMediaInfo,
                        detectImageSearchQuery, extractImageCount,
                        buildWilyFallbackUserPrompt, buildWilyMediaUserPrompt, buildWilyAICommandPrompt, buildWilyVisionContextPrompt,
                        buildSmartImageWaitText, buildSmartAlbumCaptions, sendImageAlbum, buildSmartImageHistoryReply,
                        searchAndGetImage, searchAndGetImages,
                        rememberAIMedia, processAIMediaAndSend,
                        addToHistory, getHistory, getSessionKey, buildHistoryMeta, wrapCurrentUserMessage,
                        detectAndUpdateMemory, startTyping,
                        hashSticker, lookupSticker, saveSticker, incrementStickerSeen, buildStickerContextHint,
                        buildStickerAnalysisExtractionPrompt,
                        resolveLidFromContacts,
                        isAICooldown, setAICooldown, tolak, wilyLog, wilyError,
                })) return;
                
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
                            'rvo', 'viewonce', 'vo', 'rvo2',
                            'antidel', 'ad',
                            'readsw',
                            'anticall', 'ac',
                            'anticallvid', 'acv',
                            'autocallaudio', 'aca',
                            'online',
                            'readchat',
                            'typing', 'typ',
                            'recording', 'record',
                            'allunduh', 'tt', 'ig', 'fb', 'facebook', 'fbdl', 'twdl', 'ytmp3', 'ytmp4', 'play',
                            'animgif', 'animegif', 'gifanime',
                            'sticker', 's',
                            'wm', 'swm',
                            'toimg',
                            'hd',
                            'upswgc', 'swgc', 'swgrup', 'swgroup', 'statusgrup', 'statusgroup',
                            'upswgcv2', 'swgcv2', 'swgrupv2', 'swgroupv2', 'statusgrupv2', 'statusgroupv2',
                            'ceksw',
                            'ceksetting',
                            'emoji',
                            'emojiadd', 'emojidel', 'emojilist',
                            'emojidefault', 'emojicustom', 'emojiclear',
                            'ceksesi',
                            'clearsesi', 'cs',
                            'del', 'd', 'delbot',
                            'font', 'fontgen',
                            'fontuntik',
                            'logo'
                        ]);
                        const _rawText = (m.text || '').trim();
                        const _isFontuntikChoice = _rawText.startsWith('fu_');
                        if (!_isFontuntikChoice && !jadibotAllowedCommands.has(m.command)) {
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
                                        await tolak(hisoka, m, '⏳ *Waktu pemilihan sudah habis.*\n> _Ketik_ `.listbot` _lagi untuk refresh._');
                                        return;
                                } else if (lowerChoice === 'batal' || lowerChoice === 'cancel') {
                                        if (pendingJadibot.timeout) clearTimeout(pendingJadibot.timeout);
                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                        await tolak(hisoka, m, '✅ *Dibatalkan.*\n_Bot tidak dihentikan._');
                                        return;
                                } else {
                                        // ── Confirm mode: user sudah pilih nomor/multi, tinggal tap Yes/No ──
                                        if (pendingJadibot.confirmMode) {
                                                const _confirmNum     = pendingJadibot.confirmNumber;
                                                const _confirmTargets = pendingJadibot.confirmTargets;
                                                const _isMulti = Array.isArray(_confirmTargets) && _confirmTargets.length > 0;
                                                const _isYes = rawChoice === '__jbstop_yes__' || ['ya','yes','iya','y'].includes(lowerChoice);
                                                const _isNo  = rawChoice === '__jbstop_no__'  || ['tidak','no','n','batal','cancel'].includes(lowerChoice);
                                                if (_isYes) {
                                                        if (pendingJadibot.timeout) clearTimeout(pendingJadibot.timeout);
                                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                                        if (_isMulti) {
                                                                // Multi-stop
                                                                const _activeNow  = [...jadibotMap.keys()];
                                                                const _stillActive = _confirmTargets.filter(t => _activeNow.includes(t.num));
                                                                if (_stillActive.length === 0) {
                                                                        await tolak(hisoka, m, '❌ *Semua bot sudah tidak aktif.*\n> _Ketik `.listbot` untuk refresh._');
                                                                        return;
                                                                }
                                                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                                                const _label = _stillActive.map(t => `\`+${maskNumber(t.num)}\``).join(' · ');
                                                                await tolak(hisoka, m, `🛑 *Menghentikan ${_stillActive.length} bot...*\n${_label}`);
                                                                for (const { num } of _stillActive) {
                                                                        await stopJadibot(num, async (text) => { await tolak(hisoka, m, text); });
                                                                }
                                                        } else {
                                                                // Single stop
                                                                if (!_confirmNum || ![...jadibotMap.keys()].includes(_confirmNum)) {
                                                                        await tolak(hisoka, m, '❌ *Bot sudah tidak aktif atau tidak ditemukan.*\n> _Ketik `.listbot` untuk refresh._');
                                                                        return;
                                                                }
                                                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                                                await stopJadibot(_confirmNum, async (text) => { await tolak(hisoka, m, text); });
                                                        }
                                                } else if (_isNo) {
                                                        if (pendingJadibot.timeout) clearTimeout(pendingJadibot.timeout);
                                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                                        await tolak(hisoka, m, '❌ *Dibatalkan.*\n_Bot tidak dihentikan._\n\n> _Ketik `.listbot` untuk kembali ke daftar._');
                                                } else {
                                                        await tolak(hisoka, m, '⚠️ Pilih tombol *✅ Ya, Stop* atau *❌ Tidak, Batal* di atas.');
                                                }
                                                return;
                                        }

                                        await cleanupExpiredJadibots(async () => {});
                                        const activeList = [...jadibotMap.keys()];
                                        const maxNum = pendingJadibot.numbers.length;

                                        // Cek format multi-stop: "1,2,3" atau "1.2.3"
                                        // (semua bagian angka murni, min 2 bagian, pemisah , atau .)
                                        const multiParts = rawChoice.split(/[,.]+/).map(s => s.trim()).filter(Boolean);
                                        const isMultiStop = multiParts.length >= 2 && multiParts.every(s => /^\d{1,3}$/.test(s));
                                        if (isMultiStop) {
                                                const seen = new Set();
                                                const validTargets = [];
                                                for (const part of multiParts) {
                                                        if (seen.has(part)) continue;
                                                        seen.add(part);
                                                        const idx = Number(part);
                                                        if (idx < 1 || idx > pendingJadibot.numbers.length) continue;
                                                        const tNum = pendingJadibot.numbers[idx - 1];
                                                        if (!tNum || !activeList.includes(tNum)) continue;
                                                        validTargets.push({ idx, num: tNum });
                                                }
                                                if (validTargets.length === 0) {
                                                        await tolak(hisoka, m,
                                                                `❌ *Tidak ada bot valid untuk dihentikan.*\n` +
                                                                `_Urutan tidak ditemukan atau sudah tidak aktif._\n` +
                                                                `> _Ketik_ \`.listbot\` _untuk refresh._`
                                                        );
                                                        return;
                                                }
                                                // Jangan langsung stop — tampilkan daftar & minta konfirmasi Button Quick Reply
                                                const _multiLines = validTargets.map(t =>
                                                        `  *${t.idx}.* +${maskNumber(t.num)}`
                                                ).join('\n');

                                                pendingJadibot.confirmMode    = true;
                                                pendingJadibot.confirmTargets = validTargets;
                                                pendingJadibot.confirmNumber  = null;

                                                const _multiBody =
                                                        `🛑 *Konfirmasi Stop ${validTargets.length} Jadibot*\n` +
                                                        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                                        `📋 *Bot yang akan dihentikan:*\n` +
                                                        `${_multiLines}\n\n` +
                                                        `⚠️ Yakin ingin menghentikan *${validTargets.length} bot* sekaligus?\n` +
                                                        `> _Tindakan ini tidak bisa dibatalkan setelah dikonfirmasi._`;

                                                try {
                                                        const _confirmBtn = new Button()
                                                                .setBody(_multiBody)
                                                                .setFooter(`⚡ Wily Bot • Stop Jadibot`)
                                                                .addReply(`✅ Ya, Stop ${validTargets.length} Bot`, '__jbstop_yes__')
                                                                .addReply('❌ Tidak, Batal', '__jbstop_no__');
                                                        await _confirmBtn.run(m.from, hisoka, m);
                                                } catch (_) {
                                                        await tolak(hisoka, m,
                                                                _multiBody + `\n\n` +
                                                                `✅ Reply \`ya\` untuk stop semua\n` +
                                                                `❌ Reply \`batal\` untuk batal`
                                                        );
                                                }
                                                return;
                                        }

                                        // Cek format atur durasi (upbot/downbot), satu atau BANYAK target sekaligus
                                        // dipisah "|". Tiap bagian formatnya "idx,durasi":
                                        //   - "3,1d,20m"      → target 3, tambah 1 hari 20 menit (upbot)
                                        //   - "1,-45m"        → target 1, kurangi 45 menit (downbot, prefix "-")
                                        //   - "2,p"           → target 2, ubah ke permanent
                                        //   - "3,1d,20m|1,30d" → banyak target sekaligus, dipisah "|"
                                        const ADJUST_SEGMENT_RE = /^(\d{1,3})\s*[,.]\s*(-)?\s*(.+)$/;
                                        const adjustSegmentsRaw = rawChoice.split('|').map(s => s.trim()).filter(Boolean);
                                        const isAdjustFormat = adjustSegmentsRaw.length >= 1 &&
                                                adjustSegmentsRaw.every(seg => ADJUST_SEGMENT_RE.test(seg));

                                        if (isAdjustFormat) {
                                                const results = [];

                                                for (const seg of adjustSegmentsRaw) {
                                                        const segMatch = seg.match(ADJUST_SEGMENT_RE);
                                                        const idx = Number(segMatch[1]);
                                                        const isMinus = !!segMatch[2];
                                                        const durStr = segMatch[3].trim();
                                                        const durInfo = parseJadibotDuration(durStr);

                                                        if (idx < 1 || idx > pendingJadibot.numbers.length) {
                                                                results.push({ idx, ok: false, error: `Urutan tidak valid _(masukkan 1-${maxNum})_.` });
                                                                continue;
                                                        }
                                                        const targetNum = pendingJadibot.numbers[idx - 1];
                                                        if (!targetNum || !activeList.includes(targetNum)) {
                                                                results.push({ idx, ok: false, error: 'Bot tidak ditemukan atau sudah tidak aktif.' });
                                                                continue;
                                                        }
                                                        if (!durInfo) {
                                                                results.push({ idx, targetNum, ok: false, error: `Format durasi \`${durStr}\` tidak valid.` });
                                                                continue;
                                                        }
                                                        if (isMinus && durInfo.ms === 'permanent') {
                                                                results.push({ idx, targetNum, ok: false, error: `Tidak bisa kurangi ke "permanent". Pakai \`${idx},p\` (tanpa "-") untuk set permanent.` });
                                                                continue;
                                                        }

                                                        const adjSendReply = async (msg) => tolak(hisoka, m, msg);
                                                        const oldInfo = getJadibotExpirySummary(targetNum);
                                                        const oldLabel = oldInfo?.remaining || 'Tidak ada data';
                                                        const oldExpire = oldInfo?.expiresAtText || '-';

                                                        if (isMinus) {
                                                                const downResult = reduceJadibotExpiry(targetNum, durInfo.ms, 'active');
                                                                if (!downResult) {
                                                                        results.push({ idx, targetNum, ok: false, error: 'Data masa berlaku tidak ditemukan.' });
                                                                        continue;
                                                                }
                                                                if (downResult.error === 'permanent') {
                                                                        results.push({ idx, targetNum, ok: false, error: 'Status *Permanent* ♾️, tidak punya batas waktu yang bisa dikurangi.' });
                                                                        continue;
                                                                }
                                                                scheduleJadibotExpiry(targetNum, adjSendReply);
                                                                const newInfo = downResult.expiredNow ? null : getJadibotExpirySummary(targetNum);
                                                                results.push({
                                                                        idx, targetNum, ok: true, kind: 'down',
                                                                        durLabel: durInfo.label, oldLabel, oldExpire,
                                                                        expiredNow: downResult.expiredNow,
                                                                        newLabel: newInfo ? newInfo.remaining : 'Kedaluwarsa',
                                                                        newExpire: newInfo ? newInfo.expiresAtText : '-'
                                                                });
                                                        } else if (durInfo.ms === 'permanent') {
                                                                setPermanentJadibot(targetNum, 'active');
                                                                results.push({ idx, targetNum, ok: true, kind: 'perm', oldLabel });
                                                        } else {
                                                                extendJadibotExpiry(targetNum, durInfo.ms, 'active');
                                                                scheduleJadibotExpiry(targetNum, adjSendReply);
                                                                const newInfo = getJadibotExpirySummary(targetNum);
                                                                results.push({
                                                                        idx, targetNum, ok: true, kind: 'up',
                                                                        durLabel: durInfo.label, oldLabel, oldExpire,
                                                                        newLabel: newInfo.remaining, newExpire: newInfo.expiresAtText
                                                                });
                                                        }
                                                }

                                                const okCount = results.filter(r => r.ok).length;
                                                const failCount = results.length - okCount;
                                                const isMulti = results.length > 1;
                                                await hisoka.sendMessage(m.from, {
                                                        react: { text: failCount === 0 ? '✅' : (okCount === 0 ? '❌' : '⚠️'), key: m.key }
                                                });

                                                if (!isMulti) {
                                                        const r = results[0];
                                                        if (!r.ok) {
                                                                await tolak(hisoka, m, `❌ *Gagal!*\n${r.targetNum ? `+${maskNumber(r.targetNum)} — ` : ''}${r.error}`);
                                                        } else if (r.kind === 'perm') {
                                                                await tolak(hisoka, m,
                                                                        `♾️ *Durasi diperbarui ke Permanent!*\n` +
                                                                        `📱 \`+${maskNumber(r.targetNum)}\`\n\n` +
                                                                        `📊 *Perubahan masa berlaku:*\n` +
                                                                        `⏮️ Sebelumnya : ~${r.oldLabel}~\n` +
                                                                        `✨ Terbaru    : *Permanent* ♾️\n\n` +
                                                                        `> _Bot tetap aktif tanpa batas waktu._`
                                                                );
                                                        } else if (r.kind === 'down') {
                                                                await tolak(hisoka, m,
                                                                        `⏬ *Durasi dikurangi!*\n` +
                                                                        `📱 \`+${maskNumber(r.targetNum)}\`\n\n` +
                                                                        `📊 *Perubahan masa berlaku:*\n` +
                                                                        `⏮️ Sebelumnya : ~${r.oldLabel}~\n` +
                                                                        `   _Exp lama_ : _${r.oldExpire}_\n` +
                                                                        `➖ Dikurangi  : *${r.durLabel}*\n` +
                                                                        `✨ Sisa baru  : *${r.newLabel}*\n` +
                                                                        (r.expiredNow ? '' : `   _Exp baru_ : _${r.newExpire}_\n`) +
                                                                        `\n> _${r.expiredNow ? 'Sisa waktu sudah habis, bot langsung dihentikan & sesi dihapus.' : 'Bot tetap aktif, durasi dikurangi.'}_`
                                                                );
                                                        } else {
                                                                await tolak(hisoka, m,
                                                                        `⏫ *Durasi diperbarui!*\n` +
                                                                        `📱 \`+${maskNumber(r.targetNum)}\`\n\n` +
                                                                        `📊 *Perubahan masa berlaku:*\n` +
                                                                        `⏮️ Sebelumnya : ~${r.oldLabel}~\n` +
                                                                        `   _Exp lama_ : _${r.oldExpire}_\n` +
                                                                        `➕ Ditambah   : *+${r.durLabel}*\n` +
                                                                        `✨ Total baru : *${r.newLabel}*\n` +
                                                                        `   _Exp baru_ : _${r.newExpire}_\n\n` +
                                                                        `> _Bot tetap aktif, durasi diperpanjang._`
                                                                );
                                                        }
                                                } else {
                                                        const lines = results.map(r => {
                                                                if (!r.ok) {
                                                                        return `*${r.idx}.* ❌ ${r.targetNum ? `+${maskNumber(r.targetNum)} — ` : ''}${r.error}`;
                                                                }
                                                                if (r.kind === 'perm') {
                                                                        return `*${r.idx}.* ♾️ +${maskNumber(r.targetNum)} → *Permanent* _(sebelumnya ${r.oldLabel})_`;
                                                                }
                                                                if (r.kind === 'down') {
                                                                        return `*${r.idx}.* ⏬ +${maskNumber(r.targetNum)} ➖ *${r.durLabel}* → sisa *${r.newLabel}*${r.expiredNow ? ' _(dihentikan)_' : ` _(exp: ${r.newExpire})_`}`;
                                                                }
                                                                return `*${r.idx}.* ⏫ +${maskNumber(r.targetNum)} ➕ *${r.durLabel}* → sisa *${r.newLabel}* _(exp: ${r.newExpire})_`;
                                                        });
                                                        await tolak(hisoka, m,
                                                                `📋 *Update ${results.length} target — ${okCount} berhasil${failCount ? `, ${failCount} gagal` : ''}*\n` +
                                                                `━━━━━━━━━━━━━━━━━━━━━━\n` +
                                                                lines.join('\n')
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
                                                // Jangan langsung stop — minta konfirmasi dulu via Button Quick Reply
                                                const _meta  = getJadibotExpiry(selectedNumber);
                                                const _isPerm = _meta?.permanent === true;
                                                const _sisa  = !_meta ? '-' : _isPerm ? 'Permanent ♾️' : (getJadibotExpirySummary(selectedNumber)?.remaining || '-');
                                                const _masked = maskNumber(selectedNumber);

                                                // Update pending state ke confirmMode
                                                pendingJadibot.confirmMode   = true;
                                                pendingJadibot.confirmNumber = selectedNumber;

                                                const _confirmBody =
                                                        `🛑 *Konfirmasi Stop Jadibot*\n` +
                                                        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                                        `📱 *Nomor :* +${_masked}\n` +
                                                        `⏳ *Sisa  :* ${_sisa}\n\n` +
                                                        `⚠️ Yakin ingin menghentikan bot ini?\n` +
                                                        `> _Tindakan ini tidak bisa dibatalkan setelah dikonfirmasi._`;

                                                try {
                                                        const _confirmBtn = new Button()
                                                                .setBody(_confirmBody)
                                                                .setFooter(`⚡ Wily Bot • Stop Jadibot`)
                                                                .addReply('✅ Ya, Stop', '__jbstop_yes__')
                                                                .addReply('❌ Tidak, Batal', '__jbstop_no__');
                                                        await _confirmBtn.run(m.from, hisoka, m);
                                                } catch (_) {
                                                        // Fallback teks jika Button gagal
                                                        await tolak(hisoka, m,
                                                                _confirmBody + `\n\n` +
                                                                `✅ Reply \`ya\` untuk stop\n` +
                                                                `❌ Reply \`batal\` untuk batal`
                                                        );
                                                }
                                                return;
                                        }
                                        // Pilihan tidak dikenali
                                        await tolak(
                                                hisoka,
                                                m,
                                                `❌ *Pilihan tidak valid.*\n\n` +
                                                `📌 *Cara reply listbot:*\n` +
                                                `1. Ketik \`1\` → stop 1 bot\n` +
                                                `2. Ketik \`1,2,3\` atau \`1.2.3\` → stop beberapa\n` +
                                                `3. Ketik \`1,3j\` → perpanjang 3 jam\n` +
                                                `4. Ketik \`1,-3j\` → kurangi 3 jam\n` +
                                                `5. Ketik \`1,p\` → ubah ke permanent\n` +
                                                `6. Ketik \`3,1d,20m|1,30d\` → banyak target sekaligus, dipisah \`|\`\n` +
                                                `7. Ketik \`batal\` → batalkan\n\n` +
                                                `> _Singkatan: m=menit · j=jam · h=hari · p=permanent_`
                                        );
                                        return;
                                }
                        }
                }

                // (pendingCredsJson handler dihapus — flow baru pakai startJadibot otomatis)

                // ── Handle pending alqupdate list choice → alqanime-cmd.cjs ──
                if (await handleAlqUpdateChoice({ hisoka, m, fs, pendingAlqUpdateChoices, pendingAlqDlChoices, getJadibotChoiceKey, getQuotedStanzaId, pickBestAlqLink, getAllAlqLinksByPriority, formatAlqLinkMsg, tolak, logError })) return;


                // ── Handle pending alqdl choice → alqanime-cmd.cjs ──
                if (await handleAlqDlChoice({ hisoka, m, fs, pendingAlqDlChoices, getJadibotChoiceKey, getQuotedStanzaId, pickBestAlqLink, getAllAlqLinksByPriority, formatAlqLinkMsg, tolak, logError })) return;

                // ── Handle reply ke status alqanimenotif (add/del GC) ──
                {
                        const { handleAlqNotifReply } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime-monitor.cjs'));
                        if (await handleAlqNotifReply({ hisoka, m, pendingAlqNotifChoices, getQuotedStanzaId, tolak, logCommand, loadConfig, fs, path })) return;
                }

                // ── Handle pending hentaidad choice → hentaidad.cjs ──
                {
                        const { handleHentaidadChoice } = _require(path.resolve('./SEMUA_FITUR/anime/hentaidad.cjs'));
                        if (await handleHentaidadChoice({ hisoka, m, pendingHentaidadChoices, getQuotedStanzaId, tolak, logCommand, logError })) return;
                }

                // ── Handle pending cosplaytele search choice → cosplay-cmd.cjs ──
                if (await handleCosplayChoice({ hisoka, m, pendingCosplayChoices, getQuotedStanzaId, tolak, logCommand, logError })) return;

                // ── Handle pending komiktap interactive reply → komiktap-cmd.cjs ──
                if (await handleKomiktapChoice({ hisoka, m, pendingKomikChoices, getJadibotChoiceKey, getQuotedStanzaId, tolak, logError })) return;

                // ── Handle reply ke pesan list .setbrowser → setbrowser-cmd.cjs ──
                if (await handleSetbrowserListReply({ hisoka, m, listAturBrowserMap, pendingAturBrowser, isMainBot, loadConfig, getQuotedStanzaId, BROWSER_LIST, logCommand })) return;

                // ── Handle reply ke pesan konfirmasi .setbrowser → setbrowser-cmd.cjs ──
                if (await handleSetbrowserConfirmReply({ hisoka, m, pendingAturBrowser, isMainBot, loadConfig, getQuotedStanzaId, BROWSER_LIST, logCommand })) return;

                // ── Handle pending fontuntik choice → fontuntik.cjs ──
                {
                        const { handleFontuntikChoice } = _require(path.resolve('./SEMUA_FITUR/tools/fontuntik.cjs'));
                        if (await handleFontuntikChoice({ hisoka, m, pendingFontuntikChoices, getJadibotChoiceKey, getQuotedStanzaId, Button, tolak, logCommand })) return;
                }

                // ── Handle pending waifu choice → waifu.cjs ──
                {
                        const { handleWaifuChoice } = _require(path.resolve('./SEMUA_FITUR/anime/waifu.cjs'));
                        if (await handleWaifuChoice({ hisoka, m, pendingWaifuChoices, getJadibotChoiceKey, getQuotedStanzaId, Button, tolak, logCommand })) return;
                }

                // ── Handle pending play choice → play-cmd.cjs ──
                if (await handlePlayChoice({ hisoka, m, pendingPlayChoices, ensureYtdlp, parseYtdlpError, tolak, logCommand })) return;

                // ─── Cekauto callbacks (interaktif button/list reply) ──────────────────
                if (await _handleCekautoCallbacksFn({ hisoka, m, tolak, restartAutoCleaner, stopAutoCleaner })) return;

                // ─── AntiTagSW callbacks (session reply + button callbacks) ──────────
                if (await _handleAntitagswCallbacksFn({ hisoka, m, tolak, toggleAntiTagSW, resetWarnings, getAllAntiTagSWGroups })) return;

                // ─── AntiLink callbacks (session reply dari .antilink list) ────────────
                if (await _handleAntilinkCallbacksFn({ hisoka, m, tolak })) return;

                // ─── AntiLink status reply (add/del GC via .antilink status) ─────────
                if (await _handleAntilinkStatusReplyFn({ hisoka, m, pendingAntilinkChoices, getQuotedStanzaId, tolak, logCommand })) return;

                // ─── MusicAI callbacks → musikai-cmd.cjs & musikai2-cmd.cjs ──────────
                if (await handleMusicAICallbacks({ hisoka, m,
                        pendingMusikaiCache, generateWAMessageFromContent,
                        sendAudioWithButtons, sendConfirmWithButtons,
                        logCommand, logError, tolak,
                })) return;

                if (await handleMusicAI2Callbacks({ hisoka, m,
                        pendingMusikai2Cache, generateWAMessageFromContent,
                        sendAudioWithButtons, sendConfirmWithButtons,
                        logCommand, logError, tolak,
                })) return;
                // ──────────────────────────────────────────────────────────────────────

                switch (m.command) {

                        case 'hidetag':
                        case 'ht':
                        case 'all': {
                                const { handleHidetag } = _require(path.resolve('./SEMUA_FITUR/group/hidetag.cjs'));
                                await handleHidetag({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer });
                                break;
                        }

                        case 'sematkan':
                        case 'pin':
                        case 'pinpesan': {
                                const { handleSematkan } = _require(path.resolve('./SEMUA_FITUR/group/sematkan.cjs'));
                                const _smOk = await handleSematkan(hisoka, m, query, tolak, kvGet);
                                if (_smOk) logCommand(m, hisoka, 'sematkan');
                                break;
                        }

                        case 'pushkontakgc': {
                                const _pkgPath = path.resolve('./SEMUA_FITUR/group/pushkontakgc.cjs');
                                delete _require.cache[_pkgPath];
                                const { handlePushkontakgc } = _require(_pkgPath);
                                await handlePushkontakgc({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer });
                                break;
                        }

                        case 'pushkontakgcstop':
                        case 'pkgstop': {
                                const _pkgPath = path.resolve('./SEMUA_FITUR/group/pushkontakgc.cjs');
                                delete _require.cache[_pkgPath];
                                const { handlePushkontakgcstop } = _require(_pkgPath);
                                await handlePushkontakgcstop({ hisoka, m, tolak, logCommand });
                                break;
                        }

                        case 'savekontak':
                        case 'svgc': {
                                const _svcPath = path.resolve('./SEMUA_FITUR/group/savekontak.cjs');
                                delete _require.cache[_svcPath];
                                const { handleSavekontak } = _require(_svcPath);
                                await handleSavekontak({ hisoka, m, query, tolak, logCommand });
                                break;
                        }

                        case 'savekontakstop':
                        case 'svcstop': {
                                const _svcPath = path.resolve('./SEMUA_FITUR/group/savekontak.cjs');
                                delete _require.cache[_svcPath];
                                const { handleSavekontakstop } = _require(_svcPath);
                                await handleSavekontakstop({ hisoka, m, tolak, logCommand });
                                break;
                        }

                        case 'sv':
                        case 'savekontak1': {
                                const _svcPath = path.resolve('./SEMUA_FITUR/group/savekontak.cjs');
                                delete _require.cache[_svcPath];
                                const { handleSv } = _require(_svcPath);
                                await handleSv({ hisoka, m, query, tolak, logCommand });
                                break;
                        }

                        case 'jpm': {
                                const _jpmPath = path.resolve('./SEMUA_FITUR/group/jpm.cjs');
                                delete _require.cache[_jpmPath];
                                const { handleJpm } = _require(_jpmPath);
                                await handleJpm({ hisoka, m, query, tolak, logCommand, getQuotedMediaBuffer, Button });
                                break;
                        }

                        case 'jpmstop': {
                                const _jpmPath = path.resolve('./SEMUA_FITUR/group/jpm.cjs');
                                delete _require.cache[_jpmPath];
                                const { handleJpmstop } = _require(_jpmPath);
                                await handleJpmstop({ hisoka, m, tolak, logCommand });
                                break;
                        }

                        case 'jpmlist':
                        case 'listjpm':
                        case 'daftargc': {
                                const _jpmPath = path.resolve('./SEMUA_FITUR/group/jpm.cjs');
                                delete _require.cache[_jpmPath];
                                const { handleJpmlist } = _require(_jpmPath);
                                await handleJpmlist({ hisoka, m, tolak, logCommand });
                                break;
                        }

                        case 'clearsesi':
                        case 'cs': {
                                const { handleClearsesi } = _require(path.resolve('./SEMUA_FITUR/jadibot/clearsesi.cjs'));
                                await handleClearsesi({ hisoka, m, query, tolak, logCommand, getJadibotNumber, jadibotClearSesiMap });
                                break;
                        }

                        case 'cekjidgc':
                        case 'jidgc':
                        case 'infogc': {
                                const { handleCekjidgc } = _require(path.resolve('./SEMUA_FITUR/info/cekjidgc.cjs'));
                                await handleCekjidgc({ hisoka, m, tolak, logCommand, Button });
                                break;
                        }

                        case 'cekjidgcall':
                        case 'jidgcall':
                        case 'listjidgc':
                        case 'alljidgc': {
                                const { handleAlljidgc } = _require(path.resolve('./SEMUA_FITUR/info/cekjidgcall.cjs'));
                                await handleAlljidgc({ hisoka, m, tolak, logCommand, Button });
                                break;
                        }

                        case 'memori':
                        case 'mymemory':
                        case 'myprofile': {
                                const { handleMemori } = _require(path.resolve('./SEMUA_FITUR/info/memory-cmd.cjs'));
                                await handleMemori({ hisoka, m, logCommand, loadUserMemory, memoryToReadable });
                                break;
                        }

                        case 'lupakanaku':
                        case 'resetmemori':
                        case 'resetmemory':
                        case 'forgetme': {
                                const { handleLupakanaku } = _require(path.resolve('./SEMUA_FITUR/info/memory-cmd.cjs'));
                                await handleLupakanaku({ hisoka, m, logCommand, clearUserMemory });
                                break;
                        }

                        case 'q':
                        case 'quoted': {
                                const { handleQuoted } = _require(path.resolve('./SEMUA_FITUR/info/quoted-cmd.cjs'));
                                await handleQuoted({ hisoka, m, tolak, logCommand, injectMessage });
                                break;
                        }

                                case 'ping':
                                case 'p': {
                                        const { handlePing } = _require(path.resolve('./SEMUA_FITUR/info/ping.cjs'));
                                        await handlePing({ hisoka, m, tolak, logCommand, getBotStats, os });
                                        break;
                                }

                        case 'cekspeed':
                        case 'testnet': {
                                const { handleTestnet } = _require(path.resolve('./SEMUA_FITUR/info/speedtest.cjs'));
                                await handleTestnet({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'ceksize': {
                                const { handleFilesize } = _require(path.resolve('./SEMUA_FITUR/info/ceksize.cjs'));
                                await handleFilesize({ hisoka, m, tolak, logCommand, _require, path });
                                break;
                        }
                        case '>':
                        case 'eval': {
                                const { handleEval } = _require(path.resolve('./SEMUA_FITUR/info/eval-cmd.cjs'));
                                await handleEval({ hisoka, m, query, text, tolak, logCommand, util });
                                break;
                        }

                        case '$':
                        case 'bash': {
                                const { handleBash } = _require(path.resolve('./SEMUA_FITUR/info/eval-cmd.cjs'));
                                await handleBash({ hisoka, m, query, tolak, logCommand, exec, util });
                                break;
                        }

                        case 'mati':
                        case 'shutdown':
                        case 'matiin': {
                                const { handleMati } = _require(path.resolve('./SEMUA_FITUR/info/mati-cmd.cjs'));
                                await handleMati({ hisoka, m, tolak, logCommand, _require, path });
                                break;
                        }

                        case 'restart':
                        case 'rebot':
                        case 'rb': {
                                const { handleRb } = _require(path.resolve('./SEMUA_FITUR/system/shutdown.cjs'));
                                await handleRb({ hisoka, m, tolak, logCommand, _require });
                                break;
                        }
                        case 'credsjson': {
                                const { handleCredsJson } = _require(path.resolve('./SEMUA_FITUR/jadibot/credsjson.cjs'));
                                await handleCredsJson({ hisoka, m, query, tolak, logCommand, isMainBot, path });
                                break;
                        }

                        case 'sessiondb':
                        case 'sessionstat': {
                                const { handleSessionstat } = _require(path.resolve('./SEMUA_FITUR/jadibot/ceksesi.cjs'));
                                await handleSessionstat({ hisoka, m, fs, path, logCommand });
                                break;
                        }
                        case 'group':
                        case 'listgroup': {
                                const { handleListgroup } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleListgroup({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'contact':
                        case 'listcontact': {
                                const { handleListcontact } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleListcontact({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'cuaca':
                        case 'weather': {
                                const { handleWeather } = _require(path.resolve('./SEMUA_FITUR/tools/cuaca.cjs'));
                                await handleWeather({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'tempmail':
                        case 'tmail':
                        case 'tminbox':
                        case 'tmread':
                        case 'tmwait':
                        case 'tmdel': {
                                const { handleTempmail } = _require(path.resolve('./SEMUA_FITUR/tools/tempmail.cjs'));
                                await handleTempmail({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }

                        case 'animgif':
                        case 'animegif':
                        case 'gifanime': {
                                const { handleAnimgif } = _require(path.resolve('./SEMUA_FITUR/anime/tenor-gif.cjs'));
                                await handleAnimgif(hisoka, m, query, { tolak, logCommand });
                                break;
                        }

                        case 'pixiv': {
                                const { handlePixiv } = _require(path.resolve('./SEMUA_FITUR/anime/pixiv.cjs'));
                                await handlePixiv({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'nhentai':
                        case 'nh': {
                                const { handleNh } = _require(path.resolve('./SEMUA_FITUR/anime/nhentai.cjs'));
                                await handleNh({ hisoka, m, query, tolak, logError, _require, path });
                                break;
                        }
                        case 'nhrand': {
                                const { handleNhrand } = _require(path.resolve('./SEMUA_FITUR/anime/nhentai.cjs'));
                                await handleNhrand({ hisoka, m, tolak, logCommand, logError });
                                break;
                        }
                        case 'nhget':
                        case 'nhdownload':
                        case 'nhdl': {
                                const { handleNhdl } = _require(path.resolve('./SEMUA_FITUR/anime/nhentai.cjs'));
                                await handleNhdl({ hisoka, m, query, tolak, logCommand, logError, path });
                                break;
                        }

                        case 'komiktap':
                        case 'komik': {
                                const { handleKomik } = _require(path.resolve('./SEMUA_FITUR/anime/komiktap.cjs'));
                                await handleKomik({ hisoka, m, query, tolak, logCommand, logError, path, pendingKomikChoices, getJadibotChoiceKey });
                                break;
                        }

                        case 'komikinfo': {
                                const { handleKomikinfo } = _require(path.resolve('./SEMUA_FITUR/anime/komiktap.cjs'));
                                await handleKomikinfo({ hisoka, m, query, tolak, logError, _require, path });
                                break;
                        }
                        case 'komikget':
                        case 'komikdl': {
                                const { handleKomikdl } = _require(path.resolve('./SEMUA_FITUR/anime/komiktap.cjs'));
                                await handleKomikdl({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'komikupdate':
                        case 'komikup': {
                                const { handleKomikup } = _require(path.resolve('./SEMUA_FITUR/anime/komiktap.cjs'));
                                await handleKomikup({ hisoka, m, tolak, logError, _require, path });
                                break;
                        }
                        case 'kusonime':
                        case 'kuso':
                        case 'anime': {
                                const { handleAnime } = _require(path.resolve('./SEMUA_FITUR/anime/kusonime.cjs'));
                                await handleAnime({ hisoka, m, query, tolak, logCommand, logError, path });
                                break;
                        }

                        case 'kusonimeupdate':
                        case 'animeupdate': {
                                const { handleAnimeupdate } = _require(path.resolve('./SEMUA_FITUR/anime/kusonime.cjs'));
                                await handleAnimeupdate({ hisoka, m, tolak, logCommand, logError });
                                break;
                        }
                        case 'alqanime':
                        case 'alq': {
                                const _alqSub = (query || '').trim().toLowerCase();
                                if (['on', 'off', 'status', 'test', 'help', 'test grup', 'add', 'del'].includes(_alqSub) || /^(add|del)\s/.test(_alqSub)) {
                                        const { handleAlqanimeNotif } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime-monitor.cjs'));
                                        await handleAlqanimeNotif({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, pendingAlqNotifChoices, getQuotedStanzaId });
                                } else {
                                        const { handleAlq } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime.cjs'));
                                        await handleAlq({ hisoka, m, query, tolak, logCommand, logError, path, pendingAlqDlChoices, getJadibotChoiceKey });
                                }
                                break;
                        }

                        case 'alqupdate':
                        case 'alqanimeupdate': {
                                const { handleAlqupdate } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime.cjs'));
                                await handleAlqupdate({ hisoka, m, tolak, logCommand, logError, _require, path, getJadibotChoiceKey, pendingAlqUpdateChoices });
                                break;
                        }

                        case 'alqdl':
                        case 'alqdownload': {
                                const { handleAlqdownload } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime-dl.cjs'));
                                await handleAlqdownload({ hisoka, m, query, tolak, logCommand, logError, fs, path });
                                break;
                        }

                        case 'hentaidad':
                        case 'hdad': {
                                const { handleHentaidad } = _require(path.resolve('./SEMUA_FITUR/anime/hentaidad.cjs'));
                                await handleHentaidad({ hisoka, m, tolak, logCommand, logError, pendingHentaidadChoices });
                                break;
                        }

                        case 'anyvoice':
                        case 'tts': {
                                const { handleAnyvoice } = _require(path.resolve('./SEMUA_FITUR/media/anyvoice.cjs'));
                                await handleAnyvoice({ hisoka, m, query, tolak, logCommand, logError });
                                break;
                        }

                        case 'cosplayrand':
                        case 'cosplayrandom':
                        case 'cosplay':
                        case 'ctele': {
                                const { handleCosplay } = _require(path.resolve('./SEMUA_FITUR/anime/cosplaytele.cjs'));
                                await handleCosplay({ hisoka, m, query, tolak, logCommand, logError, _require, path, _sendCosplayImages, pendingCosplayChoices });
                                break;
                        }

                        case 'pixivr18':
                        case 'pixiv18': {
                                const { handlePixiv18 } = _require(path.resolve('./SEMUA_FITUR/anime/pixivr18.cjs'));
                                await handlePixiv18({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'cekhp':
                        case 'spechp':
                        case 'infohp': {
                                const { handleCekhp } = _require(path.resolve('./SEMUA_FITUR/tools/cekhp.cjs'));
                                await handleCekhp({ hisoka, m, query, tolak, logCommand, logError, _require, path, gemini });
                                break;
                        }

                        case 'compare':
                        case 'vsbandingkan': {
                                const { handleVsbandingkan } = _require(path.resolve('./SEMUA_FITUR/tools/bandingkanhp.cjs'));
                                await handleVsbandingkan({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'font':
                        case 'fontgen':
                        case 'fontuntik': {
                                const { handleFontuntik } = _require(path.resolve('./SEMUA_FITUR/tools/fontuntik.cjs'));
                                await handleFontuntik(m, hisoka, { Button, logCommand, tolak, pendingFontuntikChoices, getJadibotChoiceKey });
                                break;
                        }

                        case 'logo': {
                                const { handleFlamingtext } = _require(path.resolve('./SEMUA_FITUR/tools/flamingtext.cjs'));
                                await handleFlamingtext({ hisoka, m, query, tolak, logCommand, logError });
                                break;
                        }

                        case 'anigame':
                        case 'gamean1':
                        case 'an1game': {
                                const { handleAn1game } = _require(path.resolve('./SEMUA_FITUR/tools/an1game.cjs'));
                                await handleAn1game({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, Button });
                                break;
                        }

                        case 'waifu': {
                                const { handleWaifu } = _require(path.resolve('./SEMUA_FITUR/anime/waifu.cjs'));
                                await handleWaifu(m, hisoka, { Button, logCommand, tolak, pendingWaifuChoices, getJadibotChoiceKey });
                                break;
                        }

                        case 'bluearchive':
                        case 'bachar':
                        case 'ba': {
                                const { handleBa } = _require(path.resolve('./SEMUA_FITUR/anime/bluearchive.cjs'));
                                await handleBa({ hisoka, m, query, tolak, logCommand, logError, path, _require });
                                break;
                        }
                        case 'geniussearch':
                        case 'carilagu': {
                                const { handleCarilagu } = _require(path.resolve('./SEMUA_FITUR/music/genius.cjs'));
                                await handleCarilagu({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'musikai':
                        case 'aimusik': {
                                const { handleMusikaiCmd } = _require(path.resolve('./SEMUA_FITUR/music/musikai-cmd.cjs'));
                                await handleMusikaiCmd({ hisoka, m, query, tolak, logCommand, logError, sendConfirmWithButtons, pendingMusikaiCache, generateWAMessageFromContent, sendAudioWithButtons });
                                break;
                        }
                        case 'musikai2':
                        case 'aimusik2': {
                                const { handleMusikai2Cmd } = _require(path.resolve('./SEMUA_FITUR/music/musikai2-cmd.cjs'));
                                await handleMusikai2Cmd({ hisoka, m, query, tolak, logCommand, logError, sendConfirmWithButtons, pendingMusikai2Cache, sendAudioWithButtons });
                                break;
                        }

                        case 'gdetail':
                        case 'detailgenius': {
                                const { handleDetailgenius } = _require(path.resolve('./SEMUA_FITUR/music/genius.cjs'));
                                await handleDetailgenius({ hisoka, m, query, tolak, logCommand, logError, _require, path });
                                break;
                        }
                        case 'whatsmusik':
                        case 'whatmusic':
                        case 'wmusik':
                        case 'tebaklagu':
                        case 'shazam':
                        case 'carijudullagu': {
                                const { handleWhatsmusik } = _require(path.resolve('./SEMUA_FITUR/music/whatsmusik.cjs'));
                                await handleWhatsmusik({ hisoka, m, query, tolak, logCommand, logError, _require, path, getMediaTypeFromMessage, downloadMediaBuffer, ensureYtdlp });
                                break;
                        }

                        case 'menu': {
                                const { handleMenu } = _require(path.resolve('./SEMUA_FITUR/menu/menu-cmd.cjs'));
                                await handleMenu({ hisoka, m, tolak, logCommand, loadConfig, Button, getJadibotNumber, getJadibotReadsw, getJadibotAntidel, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, jadibotConnectedAt, getJadibotExpiry, getJadibotExpirySummary, getHandler, CEKAUTO_FITUR_LIST, BROWSER_LIST, TOTAL_CMD_COUNT, getUserProfilePictureUrl, isNoSpaceError, cleanupWritePressure });
                                break;
                        }

                        case 'allmenu': {
                                const { handleAllmenu } = _require(path.resolve('./SEMUA_FITUR/menu/menupages.cjs'));
                                await handleAllmenu({ hisoka, m, query, loadConfig, logCommand, fs, path });
                                break;
                        }
                        case 'settingmenu': {
                                const { handleSettingmenu } = _require(path.resolve('./SEMUA_FITUR/menu/menu-pages2.cjs'));
                                await handleSettingmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'groupmenu': {
                                const { handleGroupmenu } = _require(path.resolve('./SEMUA_FITUR/menu/menu-pages2.cjs'));
                                await handleGroupmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'statusmenu': {
                                const { handleStatusmenu } = _require(path.resolve('./SEMUA_FITUR/menu/menu-pages2.cjs'));
                                await handleStatusmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'downloadmenu': {
                                const { handleDownloadmenu } = _require(path.resolve('./SEMUA_FITUR/menu/menu-pages2.cjs'));
                                await handleDownloadmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'jadibotmenu': {
                                const { handleJadibotmenu } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleJadibotmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'ownermenu': {
                                const { handleOwnermenu } = _require(path.resolve('./SEMUA_FITUR/menu/menupages.cjs'));
                                await handleOwnermenu({ hisoka, m, query, loadConfig, logCommand, fs, path });
                                break;
                        }
                        case 'info': {
                                const { handleInfo } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleInfo({ hisoka, m, query, tolak, logCommand, loadConfig, fs, path });
                                break;
                        }

                        case 'changelog':
                        case 'update': {
                                const { handleUpdate } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleUpdate({ hisoka, m, tolak, logCommand, path, fs, isMainBot });
                                break;
                        }
                        case 'addown':
                        case 'addowner': {
                                const { handleAddowner } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleAddowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'delown':
                        case 'delowner': {
                                const { handleDelowner } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleDelowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'owner':
                        case 'own': {
                                const { handleOwn } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleOwn({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'memory': {
                                const { handleMemory } = _require(path.resolve('./SEMUA_FITUR/jadibot/ceksesi.cjs'));
                                await handleMemory({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'rvo':
                        case 'viewonce':
                        case 'vo': {
                                const { handleVo } = _require(path.resolve('./SEMUA_FITUR/media/viewonce.cjs'));
                                await handleVo({ hisoka, m, query, tolak, logCommand, quoted, downloadMediaMessage, isJidGroup, hasViewOnceCache, getViewOnceCache });
                                break;
                        }

                        case 'rvo2': {
                                const { handleVo2 } = _require(path.resolve('./SEMUA_FITUR/media/viewonce2.cjs'));
                                await handleVo2({ hisoka, m, query, tolak, logCommand, quoted, downloadMediaMessage, isJidGroup, hasViewOnceCache, getViewOnceCache });
                                break;
                        }

                        case 'getsw':
                        case 'sw': {
                                const { handleSw } = _require(path.resolve('./SEMUA_FITUR/media/getsw.cjs'));
                                await handleSw({ hisoka, m, query, tolak, logCommand, loadConfig, downloadMediaMessage, isJidGroup });
                                break;
                        }

                        case 'ram': {
                                const { handleRam } = _require(path.resolve('./SEMUA_FITUR/jadibot/ceksesi.cjs'));
                                await handleRam({ hisoka, m, tolak, logCommand });
                                break;
                        }
                        case 'ramdisk':
                        case 'diskram': {
                                const { handleRamdisk } = _require(path.resolve('./SEMUA_FITUR/setting/diskram.cjs'));
                                await handleRamdisk({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, Button });
                                break;
                        }

                        case 'typing':
                        case 'typ': {
                                const { handleTyp } = _require(path.resolve('./SEMUA_FITUR/setting/autotyprec.cjs'));
                                await handleTyp({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoTyping, setJadibotUserSetting, Button });
                                break;
                        }
                        case 'recording':
                        case 'record': {
                                const { handleRecord } = _require(path.resolve('./SEMUA_FITUR/setting/autotyprec.cjs'));
                                await handleRecord({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoRecording, setJadibotUserSetting, Button });
                                break;
                        }
                        case 'simi': {
                                const { handleSimi } = _require(path.resolve('./SEMUA_FITUR/tools/wilyai.cjs'));
                                await handleSimi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'wilyai': {
                                const { handleWilyai } = _require(path.resolve('./SEMUA_FITUR/tools/wilyai.cjs'));
                                await handleWilyai({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, countHistory, clearAllHistory, clearAllUserMemory, Button });
                                break;
                        }

                        case 'wily':
                        case 'ai':
                        case 'tanya': {
                                const { handleWily } = _require(path.resolve('./SEMUA_FITUR/ai/wilycmd.cjs'));
                                await handleWily({ hisoka, m, query, tolak, logCommand, loadConfig, gemini, getUserName, getSessionKey, getHistory, addToHistory, clearHistory, buildHistoryMeta, wrapCurrentUserMessage, detectAndUpdateMemory, searchAndGetImages, buildWilyAICommandPrompt, buildWilyMediaUserPrompt, startTyping, getMediaTypeFromMessage, getQuotedMediaBuffer, getCachedQuotedMedia, getMediaInfo, rememberAIMedia, detectImageSearchQuery, extractImageCount, buildSmartImageWaitText, buildSmartAlbumCaptions, sendImageAlbum, buildSmartImageHistoryReply, processAIMediaAndSend });
                                break;
                        }

                        case 'antidel':
                        case 'ad': {
                                await _handleAdFn({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAntidel, setJadibotUserSetting });
                                break;
                        }

                        case 'readsw': {
                                const { handleReadsw } = _require(path.resolve('./SEMUA_FITUR/readsw/readsw.cjs'));
                                await handleReadsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadsw, setJadibotUserSetting, Button, getMainEmojiMode, getJadibotEmojiMode });
                                break;
                        }

                        case 'cekauto':
                        case 'cekfitur':
                        case 'autolist': {
                                await _handleCekautoFn({ hisoka, m, query, tolak, logCommand });
                                break;
                        }

                        case 'botadmin': {
                                const { handleBotadmin } = _require(path.resolve('./SEMUA_FITUR/setting/botadmin-cmd.cjs'));
                                await handleBotadmin({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet });
                                break;
                        }

                        case 'ceksw': {
                                const { handleCeksw } = _require(path.resolve('./SEMUA_FITUR/setting/ceksw.cjs'));
                                await handleCeksw({ hisoka, m, query, tolak, logCommand, fs, path, loadConfig, saveConfig, getJadibotNumber, pruneSwStatsAt, countActiveSW, getJadibotEmojiMode });
                                break;
                        }

                        case 'setlogsw': {
                                const { handleSetlogsw } = _require(path.resolve('./SEMUA_FITUR/setting/setlogsw.cjs'));
                                await handleSetlogsw({ hisoka, m, query, tolak, logCommand, Button });
                                break;
                        }

                        case 'ceksetting': {
                                const { handleCeksetting } = _require(path.resolve('./SEMUA_FITUR/setting/ceksetting.cjs'));
                                await handleCeksetting({ hisoka, m, tolak, logCommand, isMainBot, getJadibotNumber, getJadibotReadsw, getJadibotAntidel, getJadibotAnticall, getJadibotAnticallvid, getJadibotAutoOnline, getJadibotAutoTyping, getJadibotAutoRecording, listJadibotEmojis, getJadibotExpiry, getJadibotExpirySummary, jadibotMap, maskNumber, formatRemainingTime, loadConfig });
                                break;
                        }

                        case 'telegram':
                        case 'tele': {
                                const { handleTele } = _require(path.resolve('./SEMUA_FITUR/tools/telegram.cjs'));
                                await handleTele({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig });
                                break;
                        }

                        case 'add': {
                                const { handleAddEmoji } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleAddEmoji({ hisoka, m, query, tolak, logCommand, isMainBot });
                                break;
                        }
                        case 'd':
                        case 'del': {
                                const { handleDel } = _require(path.resolve('./SEMUA_FITUR/info/del-cmd.cjs'));
                                await handleDel({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet, kvSet });
                                break;
                        }
                        case 'delbot': {
                                const { handleDelbot } = _require(path.resolve('./SEMUA_FITUR/info/delbot-cmd.cjs'));
                                await handleDelbot({ hisoka, m, query, tolak, logCommand, kvGet, kvSet });
                                break;
                        }

                        case 'list': {
                                const { handleListEmoji } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleListEmoji({ hisoka, m, query, tolak, logCommand, isMainBot });
                                break;
                        }
                        case 'emoji': {
                                const { handleEmoji } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmoji({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojiadd': {
                                const { handleEmojiadd } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojiadd({ hisoka, m, query, tolak, logCommand, getJadibotNumber, addJadibotEmojis, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojidel': {
                                const { handleEmojidel } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojidel({ hisoka, m, query, tolak, logCommand, getJadibotNumber, deleteJadibotEmojis, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojilist': {
                                const { handleEmojilist } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojilist({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojidefault': {
                                const { handleEmojidefault } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojicustom': {
                                const { handleEmojicustom } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis, Button });
                                break;
                        }

                        case 'emojiclear': {
                                const { handleEmojiclear } = _require(path.resolve('./SEMUA_FITUR/info/emoji-cmd.cjs'));
                                await handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis, listJadibotEmojis, Button });
                                break;
                        }

                        case 'online': {
                                const { handleOnline } = _require(path.resolve('./SEMUA_FITUR/setting/online.cjs'));
                                await handleOnline({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoOnline, setJadibotUserSetting, startJadibotAutoOnline, Button });
                                break;
                        }

                        case 'readchat': {
                                const { handleReadchat } = _require(path.resolve('./SEMUA_FITUR/setting/readchat.cjs'));
                                await handleReadchat({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadchat, setJadibotUserSetting, Button });
                                break;
                        }
                        case 'anticall':
                        case 'ac': {
                                const { handleAc } = _require(path.resolve('./SEMUA_FITUR/setting/anticall.cjs'));
                                await handleAc({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticall, setJadibotUserSetting });
                                break;
                        }

                        case 'anticallvid':
                        case 'acv': {
                                const { handleAcv } = _require(path.resolve('./SEMUA_FITUR/setting/anticall.cjs'));
                                await handleAcv({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticallvid, setJadibotUserSetting });
                                break;
                        }

                        case 'autocleaner': {
                                const { handleAutocleaner } = _require(path.resolve('./SEMUA_FITUR/system/autocleaner.cjs'));
                                await handleAutocleaner({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, restartAutoCleaner, stopAutoCleaner, clearOldFiles });
                                break;
                        }

                        case 'sessioncleaner': {
                                const { handleSessioncleaner } = _require(path.resolve('./SEMUA_FITUR/system/sessioncleaner.cjs'));
                                await handleSessioncleaner({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, cleanStaleSessionFiles });
                                break;
                        }

                        case 'aturbrowser':
                        case 'setbrowser': {
                                const { handleAturBrowser } = _require(path.resolve('./SEMUA_FITUR/setting/aturbrowser.cjs'));
                                await handleAturBrowser({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, BROWSER_LIST, listAturBrowserMap, pendingAturBrowser });
                                break;
                        }

                        case 'batalbrowser': {
                                const { handleBatalBrowser } = _require(path.resolve('./SEMUA_FITUR/setting/aturbrowser.cjs'));
                                await handleBatalBrowser({ hisoka, m, tolak, logCommand, isMainBot, pendingAturBrowser });
                                break;
                        }

                        case 'setpairing': {
                                const { handleSetpairing } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleSetpairing({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot });
                                break;
                        }
                        case 'tt': {
                                try {
                                        const { handleTiktokDl } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
                                        await handleTiktokDl(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                } catch (error) {
                                        console.error('\x1b[31m[TikTok] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'ig': {
                                try {
                                        const { handleInstagramDl } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
                                        await handleInstagramDl(hisoka, m, query, { gemini, tolak, logCommand, exec, util, buildIgVisionPrompt, buildIgCaptionPrompt, buildIgFallbackCaption, parseIgMetaHtml, formatIgCount });
                                } catch (error) {
                                        console.error('\x1b[31m[Instagram] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'fb':
                        case 'facebook':
                        case 'fbdl': {
                                try {
                                        const { handleFacebookDl } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
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
                                        const _twPath = path.resolve('./SEMUA_FITUR/download/twitter-dl.cjs');
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
                                        const { handleAllUnduh } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
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
                                const { handleStikerpack } = _require(path.resolve('./SEMUA_FITUR/download/stickerly.cjs'));
                                await handleStikerpack({ hisoka, m, query, tolak, logCommand, path });
                                break;
                        }

                        case 'stiker':
                        case 'sticker':
                        case 's': {
                                const { handleSticker } = _require(path.resolve('./SEMUA_FITUR/media/sticker-cmd.cjs'));
                                await handleSticker({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getMediaTypeFromMessage, downloadMediaBuffer, getQuotedMediaBuffer, unwrapMessagePayload, exec, util, path, fs });
                                break;
                        }

                        case 'tovn': {
                                const { handleTovn } = _require(path.resolve('./SEMUA_FITUR/media/audioconvert.cjs'));
                                const pfx = m.prefix || '.';
                                await handleTovn({ hisoka, m, tolak, logCommand, downloadMediaMessage, pfx });
                                break;
                        }

                        case 'tomp3': {
                                const { handleTomp3 } = _require(path.resolve('./SEMUA_FITUR/media/audioconvert.cjs'));
                                const pfx = m.prefix || '.';
                                await handleTomp3({ hisoka, m, tolak, logCommand, downloadMediaMessage, pfx });
                                break;
                        }

                        case 'infomusik':
                        case 'infolirik':
                        case 'musicinfo':
                        case 'cekmusik': {
                                const { handleInfomusik } = _require(path.resolve('./SEMUA_FITUR/music/infomusik.cjs'));
                                await handleInfomusik({ hisoka, m, tolak, logCommand, getMediaTypeFromMessage, downloadMediaMessage, Button, loadConfig, _require, path });
                                break;
                        }

                        case 'toimg': {
                                const { handleToimg } = _require(path.resolve('./SEMUA_FITUR/media/toimg-cmd.cjs'));
                                await handleToimg({ hisoka, m, query, tolak, logCommand, quoted, downloadMediaMessage, exec, util, path, fs });
                                break;
                        }

                        case 'wm':
                        case 'swm': {
                                await handleWmCommand({ hisoka, m, query, tolak, logCommand, downloadMediaBuffer, getQuotedMediaBuffer, getMediaTypeFromMessage });
                                break;
                        }

                        case 'jadibot': {
                                const { handleJadibot } = _require(path.resolve('./SEMUA_FITUR/jadibot/jadibot-cmd.cjs'));
                                await handleJadibot({ hisoka, m, query, tolak, logCommand, isMainBot, path, fs, jadibotMap, parseJadibotDuration, startJadibot, maskNumber, getJadibotExpirySummary, scheduleJadibotExpiry, setPermanentJadibot, removeJadibotExpiry, ensureJadibotExpiry });
                                break;
                        }

                        case 'upbot': {
                                const { handleUpbot } = _require(path.resolve('./SEMUA_FITUR/jadibot/jadibot-cmd.cjs'));
                                await handleUpbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotDuration, getJadibotExpirySummary, getJadibotExpiry, extendJadibotExpiry, setPermanentJadibot, scheduleJadibotExpiry, maskNumber, formatRemainingTime });
                                break;
                        }

                        case 'downbot': {
                                const { handleDownbot } = _require(path.resolve('./SEMUA_FITUR/jadibot/jadibot-cmd.cjs'));
                                await handleDownbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, parseJadibotDuration, maskNumber, getJadibotExpirySummary, getJadibotExpiry, reduceJadibotExpiry, scheduleJadibotExpiry });
                                break;
                        }

                        case 'stopbot': {
                                const { handleStopbot } = _require(path.resolve('./SEMUA_FITUR/jadibot/jadibot-cmd.cjs'));
                                await handleStopbot({ hisoka, m, query, tolak, logCommand, isMainBot, jadibotMap, stopJadibot, getJadibotExpiry, getJadibotChoiceKey, pendingJadibotChoices, maskNumber, formatRemainingTime });
                                break;
                        }

                        case 'backup': {
                                const { runBackup } = _require(path.resolve('./SEMUA_FITUR/system/backup.cjs'));
                                await runBackup(hisoka, m, query, tolak, loadConfig, logCommand);
                        }
                                break;

                        case 'ceksesi': {
                                const { handleCeksesi } = _require(path.resolve('./SEMUA_FITUR/jadibot/ceksesi.cjs'));
                                await handleCeksesi({ hisoka, m, tolak, logCommand, getJadibotNumber, jadibotSesiReportMap });
                                break;
                        }

                        case 'cekerror': {
                                const { handleCekerror } = _require(path.resolve('./SEMUA_FITUR/setting/cekerror-cmd.cjs'));
                                await handleCekerror({ hisoka, m, query, tolak, logCommand, clearErrors, formatErrorReport, generateErrorFileTxt, getInfoErrorTxtPath, getErrorStats, fs });
                                break;
                        }

                        case 'listbot': {
                                const { handleListbot } = _require(path.resolve('./SEMUA_FITUR/jadibot/listbot-cmd.cjs'));
                                await handleListbot({ hisoka, m, tolak, logCommand, isMainBot, jadibotMap, getJadibotExpiry, getJadibotExpirySummary, cleanupExpiredJadibots, pendingJadibotChoices, getJadibotChoiceKey, jadibotConnectedAt, getUserName });
                                break;
                        }

                        case 'play': {
                                const { handlePlay } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
                                await handlePlay(hisoka, m, query, { tolak, logCommand, pendingPlayChoices, Button });
                                break;
                        }

                        case 'ytmp3': {
                                const { handleYtmp3 } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
                                await handleYtmp3(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                break;
                        }

                        case 'ytmp4': {
                                const { handleYtmp4 } = _require(path.resolve('./SEMUA_FITUR/download/downloader.cjs'));
                                await handleYtmp4(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                break;
                        }


                        case 'antitagsw': {
                                await _handleAntitagswFn({
                                        hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig,
                                        getJadibotNumber, jadibotMap, sendConfirmWithButtons,
                                        toggleAntiTagSW, saveCekautoTimestamp, isAntiTagSWEnabled,
                                        getAllAntiTagSWGroups, getWarnings, resetWarnings, kvGet,
                                        clearAntiTagSWLog, getAntiTagSWLog, resolveLidFromContacts,
                                });
                                break;
                        }

                        case 'antilink': {
                                await _handleAntilinkFn({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig, pendingAntilinkChoices });
                                break;
                        }

                        case 'antitag': {
                                await _handleAntitagFn({ hisoka, m, query, tolak, logCommand });
                                break;
                        }

                        case 'welgod':
                        case 'setwelgod': {
                                const { handleSetwelgod } = _require(path.resolve('./SEMUA_FITUR/info/info.cjs'));
                                await handleSetwelgod({ hisoka, m, query, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'welcome':
                        case 'goodbye':
                        case 'setwelcome':
                        case 'setgoodbye': {
                                const { handleSetgoodbye } = _require(path.resolve('./SEMUA_FITUR/group/setgoodbye.cjs'));
                                await handleSetgoodbye({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, sendConfirmWithButtons, fs, path });
                                break;
                        }

                        case 'upswgc':
                        case 'swgc':
                        case 'swgrup':
                        case 'swgroup':
                        case 'statusgrup':
                        case 'statusgroup': {
                                const { handleUpswgc } = _require(path.resolve('./SEMUA_FITUR/group/upswgc.cjs'));
                                return handleUpswgc(hisoka, m, query, tolak);
                        }

                        case 'upswgcv2':
                        case 'swgcv2':
                        case 'swgrupv2':
                        case 'swgroupv2':
                        case 'statusgrupv2':
                        case 'statusgroupv2': {
                                const { handleUpswgcV2 } = _require(path.resolve('./SEMUA_FITUR/group/upswgcv2.cjs'));
                                return handleUpswgcV2(hisoka, m, query, tolak);
                        }

                        case 'sendstatus': {
                                const { handleSendstatus } = _require(path.resolve('./SEMUA_FITUR/group/sendstatus.cjs'));
                                await handleSendstatus({ hisoka, m, query, tolak, logCommand, generateWAMessageContent, generateWAMessageFromContent });
                                break;
                        }

                        case 'ghosttag':
                        case 'gt':
                        case 'gtag': {
                                const { handleGhosttag } = _require(path.resolve('./SEMUA_FITUR/group/ghosttag.cjs'));
                                await handleGhosttag({ hisoka, m, query, tolak, logCommand, generateWAMessageFromContent, Button });
                                break;
                        }

                        case 'hd':
                        case 'remini':
                        case 'hdr':
                        case 'hdvid':
                        case 'vidhd':
                        case 'hdvideo': {
                                const { handleHdvideo } = _require(path.resolve('./SEMUA_FITUR/download/hdvid.cjs'));
                                await handleHdvideo({ hisoka, m, query, tolak, logCommand, fs, path, quoted, downloadMediaMessage });
                                break;
                        }

                        case 'aiedit':
                        case 'editgambar':
                        case 'editai': {
                                const { handleAiedit } = _require(path.resolve('./SEMUA_FITUR/ai/imageEdit.cjs'));
                                await handleAiedit({ hisoka, m, query, tolak, logCommand, downloadMediaMessage });
                                break;
                        }

                        case 'ss':
                        case 'screenshot': {
                                const { handleScreenshot } = _require(path.resolve('./SEMUA_FITUR/tools/screenshot.cjs'));
                                await handleScreenshot({ hisoka, m, query, tolak, logCommand, _require });
                                break;
                        }
                        case 'scrapeweb':
                        case 'webinfo': {
                                const { handleWebinfo } = _require(path.resolve('./SEMUA_FITUR/tools/screenshot.cjs'));
                                await handleWebinfo({ hisoka, m, query, tolak, logCommand, path, _require });
                                break;
                        }
                        case 'autosholat': {
                                const { handleAutosholat } = _require(path.resolve('./SEMUA_FITUR/setting/autosholat.cjs'));
                                await handleAutosholat({ hisoka, m, query, tolak, logCommand, path, loadConfig });
                                break;
                        }

                        case 'infowibu': {
                                const { handleInfowibu } = _require(path.resolve('./SEMUA_FITUR/anime/infowibu.cjs'));
                                await handleInfowibu({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, _require });
                                break;
                        }

                        case 'animasu': {
                                const { handleAnimasu } = _require(path.resolve('./SEMUA_FITUR/anime/animasu.cjs'));
                                await handleAnimasu({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig });
                                break;
                        }

                        case 'alqanimenotif': {
                                const { handleAlqanimeNotif } = _require(path.resolve('./SEMUA_FITUR/anime/alqanime-monitor.cjs'));
                                await handleAlqanimeNotif({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path, loadConfig, pendingAlqNotifChoices, getQuotedStanzaId });
                                break;
                        }

                        case 'tvone': {
                                const { handleTvone } = _require(path.resolve('./SEMUA_FITUR/news/tvonenews.cjs'));
                                await handleTvone({ hisoka, m, query, tolak, logCommand, sendConfirmWithButtons, fs, path });
                                break;
                        }

                        case 'malnews': {
                                const { handleMalnews } = _require(path.resolve('./SEMUA_FITUR/news/malnews.cjs'));
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
