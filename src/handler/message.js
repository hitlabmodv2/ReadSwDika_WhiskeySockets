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

const WILY_VERBOSE_LOGS = process.env.WILY_VERBOSE_LOGS === 'true' || process.env.BOT_DEBUG_LOG === 'true';
const wilyLog = (...args) => {
        if (WILY_VERBOSE_LOGS) console.log(...args);
};
const wilyError = (...args) => {
        if (WILY_VERBOSE_LOGS) console.error(...args);
};

const tolak = async (_hydro, m, teks) => await m.reply(teks);

function startTyping(hisoka, m) {
        const jid = m?.from;
        if (!hisoka || !jid) return () => {};
        let active = true;
        try { hisoka.sendPresenceUpdate('composing', jid); } catch (_) {}
        // Refresh setiap 2500ms — WA auto-clear composing setelah ~3s tanpa refresh
        const interval = setInterval(() => {
                if (active) { try { hisoka.sendPresenceUpdate('composing', jid); } catch (_) {} }
        }, 2500);
        const stop = () => {
                if (!active) return;
                active = false;
                clearInterval(interval);
                try { hisoka.sendPresenceUpdate('paused', jid); } catch (_) {}
        };
        setTimeout(stop, 60000);
        return stop;
}

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
                const archiver = _require('archiver');
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

function resolveThumbnailMedia(thumbnailUrl) {
        if (!thumbnailUrl) return null;
        if (/^https?:\/\//i.test(thumbnailUrl)) return { url: thumbnailUrl };

        const thumbnailPath = path.isAbsolute(thumbnailUrl)
                ? thumbnailUrl
                : path.join(process.cwd(), thumbnailUrl);

        if (!fs.existsSync(thumbnailPath)) return null;
        return fs.readFileSync(thumbnailPath);
}

const AI_MEDIA_CACHE_TTL = 30 * 60 * 1000;
const AI_MEDIA_TYPES = ['imageMessage', 'videoMessage', 'stickerMessage', 'documentMessage', 'audioMessage'];

function ensureAIMediaCache(hisoka) {
        if (!hisoka.aiMediaCache) hisoka.aiMediaCache = new Map();
        return hisoka.aiMediaCache;
}

function rememberAIMedia(hisoka, sentMessage, items = []) {
        const id = sentMessage?.key?.id;
        if (!id || !items.length) return;
        const cache = ensureAIMediaCache(hisoka);
        cache.set(id, {
                items: items.filter(item => item?.buffer?.length),
                createdAt: Date.now(),
        });
        setTimeout(() => cache.delete(id), AI_MEDIA_CACHE_TTL).unref?.();
}

function getQuotedStanzaId(m) {
        return m?.content?.contextInfo?.stanzaId ||
                m?.message?.extendedTextMessage?.contextInfo?.stanzaId ||
                m?.message?.imageMessage?.contextInfo?.stanzaId ||
                m?.message?.videoMessage?.contextInfo?.stanzaId ||
                m?.message?.documentMessage?.contextInfo?.stanzaId ||
                m?.quoted?.key?.id ||
                '';
}

function getCachedQuotedMedia(hisoka, m) {
        const id = getQuotedStanzaId(m);
        const cache = hisoka?.aiMediaCache;
        const entry = id && cache?.get(id);
        if (!entry) return null;
        if (Date.now() - entry.createdAt > AI_MEDIA_CACHE_TTL) {
                cache.delete(id);
                return null;
        }
        return entry.items?.[0] || null;
}

function unwrapMessagePayload(message = {}) {
        let payload = message?.message || message?.raw || message || {};
        for (let i = 0; i < 5; i++) {
                const type = getContentType(payload);
                const content = type ? payload[type] : null;
                const nested = content?.message;
                if (nested && ['ephemeralMessage', 'viewOnceMessage', 'viewOnceMessageV2', 'viewOnceMessageV2Extension'].includes(type)) {
                        payload = nested;
                        continue;
                }
                break;
        }
        return payload;
}

function getMediaTypeFromMessage(message = {}) {
        const payload = unwrapMessagePayload(message);
        const type = getContentType(payload) || message?.type || '';
        if (AI_MEDIA_TYPES.includes(type)) return type;
        for (const mediaType of AI_MEDIA_TYPES) {
                if (payload?.[mediaType]) return mediaType;
        }
        if (type === 'albumMessage') return 'albumMessage';
        return type;
}

async function downloadMediaBuffer(hisoka, message = {}) {
        if (typeof message?.downloadMedia === 'function') {
                try {
                        const buffer = await message.downloadMedia();
                        if (buffer?.length > 0) return buffer;
                } catch (_) {}
        }

        const payloads = [
                message?.message,
                message?.raw,
                unwrapMessagePayload(message),
        ].filter(Boolean);

        let lastError = null;

        // Coba dulu TANPA reuploadRequest (direct URL) — hindari DNS error ke web.whatsapp.net
        for (const payload of payloads) {
                try {
                        const buffer = await downloadMediaMessage(
                                { ...message, message: payload },
                                'buffer',
                                {},
                                { logger: hisoka.logger }
                        );
                        if (buffer?.length > 0) return buffer;
                } catch (err) {
                        lastError = err;
                }
        }

        // Fallback: coba dengan reuploadRequest jika direct gagal
        for (const payload of payloads) {
                try {
                        const buffer = await downloadMediaMessage(
                                { ...message, message: payload },
                                'buffer',
                                {},
                                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                        );
                        if (buffer?.length > 0) return buffer;
                } catch (err) {
                        lastError = err;
                }
        }

        throw lastError || new Error('Media tidak ditemukan');
}

async function getQuotedMediaBuffer(hisoka, m) {
        if (!m?.isQuoted || !m.quoted) return null;
        try {
                return await downloadMediaBuffer(hisoka, m.quoted);
        } catch (err) {
                const cached = getCachedQuotedMedia(hisoka, m);
                if (cached?.buffer?.length > 0) return cached.buffer;
                throw err;
        }
}

function getMediaInfo(mediaType, message = {}, cached = null) {
        if (cached) {
                return {
                        mime: cached.mime || 'image/jpeg',
                        label: cached.label || 'gambar',
                };
        }
        if (mediaType === 'stickerMessage') return { mime: 'image/webp', label: 'sticker' };
        if (mediaType === 'videoMessage') return { mime: 'video/mp4', label: 'video' };
        if (mediaType === 'audioMessage') return { mime: 'audio/ogg', label: 'audio' };
        if (mediaType === 'documentMessage') {
                const mime = message?.content?.mimetype ||
                        message?.msg?.mimetype ||
                        message?.message?.documentMessage?.mimetype ||
                        'application/octet-stream';
                return { mime, label: 'file' };
        }
        return { mime: 'image/jpeg', label: 'gambar' };
}

function isMainBot(hisoka) {
    return hisoka?.isMainBot === true;
}

function parseJadibotCommandQuery(raw = '') {
    const text = String(raw || '').trim();
    if (!text) return { number: '', durationInput: '', rawNumberPart: '' };

    let numberPart = '';
    let durationRaw = '';

    // Support comma format: "628xxx,1h" atau "+628xxx,p"
    const commaIdx = text.indexOf(',');
    if (commaIdx !== -1) {
        numberPart = text.slice(0, commaIdx).trim();
        durationRaw = text.slice(commaIdx + 1).trim();
    } else {
        // Space-separated: "628xxx 1h" atau "628xxx permanent"
        const durationMatch = text.match(/\s((?:\d+\s*(?:menit|mnt|min|minute|minutes|m|jam|hour|hours|j|hari|day|days|h|d))|(?:permanent|permanen|perm|perma|selamanya|p))\s*$/i);
        durationRaw = durationMatch ? durationMatch[1].trim() : '';
        numberPart = durationMatch ? text.slice(0, durationMatch.index).trim() : text;
    }

    const rawNumberPart = numberPart;
    // Karakter valid nomor telepon: angka, +, spasi, -, (), .
    const hasInvalidPhoneChars = rawNumberPart ? /[^0-9+\-\s().]/.test(rawNumberPart) : false;
    let number = numberPart.replace(/[^0-9]/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('08')) number = '62' + number.slice(1);
    else if (number.startsWith('8')) number = '62' + number;

    return { number, durationInput: durationRaw, rawNumberPart, hasInvalidPhoneChars };
}

function normalizeJadibotNumber(raw = '') {
    let number = String(raw || '').replace(/[^0-9]/g, '');
    if (number.startsWith('00')) number = number.slice(2);
    if (number.startsWith('08')) number = '62' + number.slice(1);
    else if (number.startsWith('8')) number = '62' + number;
    return number;
}

// Deteksi negara dari nomor WA (E.164 tanpa +)
function getPhoneCountryInfo(number = '') {
    const n = String(number).replace(/[^0-9]/g, '');
    // Sorted longest-first untuk match paling spesifik
    const codes = [
        ['1684','🇦🇸','Samoa Amerika'],['1242','🇧🇸','Bahamas'],['1246','🇧🇧','Barbados'],
        ['1264','🇦🇮','Anguilla'],['1268','🇦🇬','Antigua & Barbuda'],['1284','🇻🇬','British Virgin Islands'],
        ['1340','🇻🇮','US Virgin Islands'],['1345','🇰🇾','Cayman Islands'],['1441','🇧🇲','Bermuda'],
        ['1473','🇬🇩','Grenada'],['1649','🇹🇨','Turks & Caicos'],['1664','🇲🇸','Montserrat'],
        ['1670','🇲🇵','Northern Mariana Islands'],['1671','🇬🇺','Guam'],['1684','🇦🇸','American Samoa'],
        ['1721','🇸🇽','Sint Maarten'],['1758','🇱🇨','Saint Lucia'],['1767','🇩🇲','Dominica'],
        ['1784','🇻🇨','St. Vincent & Grenadines'],['1809','🇩🇴','Dominika Republic'],
        ['1829','🇩🇴','Dominika Republic'],['1849','🇩🇴','Dominika Republic'],
        ['1868','🇹🇹','Trinidad & Tobago'],['1869','🇰🇳','Saint Kitts & Nevis'],
        ['1876','🇯🇲','Jamaika'],['1939','🇵🇷','Puerto Rico'],
        ['7840','🇬🇪','Abkhazia'],['7940','🇬🇪','Abkhazia'],
        ['212','🇲🇦','Maroko'],['213','🇩🇿','Aljazair'],['216','🇹🇳','Tunisia'],['218','🇱🇾','Libya'],
        ['220','🇬🇲','Gambia'],['221','🇸🇳','Senegal'],['222','🇲🇷','Mauritania'],['223','🇲🇱','Mali'],
        ['224','🇬🇳','Guinea'],['225','🇨🇮','Pantai Gading'],['226','🇧🇫','Burkina Faso'],
        ['227','🇳🇪','Niger'],['228','🇹🇬','Togo'],['229','🇧🇯','Benin'],['230','🇲🇺','Mauritius'],
        ['231','🇱🇷','Liberia'],['232','🇸🇱','Sierra Leone'],['233','🇬🇭','Ghana'],
        ['234','🇳🇬','Nigeria'],['235','🇹🇩','Chad'],['236','🇨🇫','Republik Afrika Tengah'],
        ['237','🇨🇲','Kamerun'],['238','🇨🇻','Tanjung Verde'],['239','🇸🇹','São Tomé & Príncipe'],
        ['240','🇬🇶','Guinea Khatulistiwa'],['241','🇬🇦','Gabon'],['242','🇨🇬','Kongo'],
        ['243','🇨🇩','DR Kongo'],['244','🇦🇴','Angola'],['245','🇬🇼','Guinea-Bissau'],
        ['248','🇸🇨','Seychelles'],['249','🇸🇩','Sudan'],['250','🇷🇼','Rwanda'],
        ['251','🇪🇹','Ethiopia'],['252','🇸🇴','Somalia'],['253','🇩🇯','Djibouti'],
        ['254','🇰🇪','Kenya'],['255','🇹🇿','Tanzania'],['256','🇺🇬','Uganda'],
        ['257','🇧🇮','Burundi'],['258','🇲🇿','Mozambik'],['260','🇿🇲','Zambia'],
        ['261','🇲🇬','Madagaskar'],['263','🇿🇼','Zimbabwe'],['264','🇳🇦','Namibia'],
        ['265','🇲🇼','Malawi'],['266','🇱🇸','Lesotho'],['267','🇧🇼','Botswana'],
        ['268','🇸🇿','Eswatini'],['269','🇰🇲','Komoro'],
        ['290','🇸🇭','Saint Helena'],['291','🇪🇷','Eritrea'],
        ['297','🇦🇼','Aruba'],['298','🇫🇴','Faroe Islands'],['299','🇬🇱','Greenland'],
        ['350','🇬🇮','Gibraltar'],['351','🇵🇹','Portugal'],['352','🇱🇺','Luksemburg'],
        ['353','🇮🇪','Irlandia'],['354','🇮🇸','Islandia'],['355','🇦🇱','Albania'],
        ['356','🇲🇹','Malta'],['357','🇨🇾','Siprus'],['358','🇫🇮','Finlandia'],
        ['359','🇧🇬','Bulgaria'],['370','🇱🇹','Lithuania'],['371','🇱🇻','Latvia'],
        ['372','🇪🇪','Estonia'],['373','🇲🇩','Moldova'],['374','🇦🇲','Armenia'],
        ['375','🇧🇾','Belarus'],['376','🇦🇩','Andorra'],['377','🇲🇨','Monako'],
        ['378','🇸🇲','San Marino'],['380','🇺🇦','Ukraina'],['381','🇷🇸','Serbia'],
        ['382','🇲🇪','Montenegro'],['385','🇭🇷','Kroasia'],['386','🇸🇮','Slovenia'],
        ['387','🇧🇦','Bosnia & Herzegovina'],['389','🇲🇰','Makedonia Utara'],
        ['420','🇨🇿','Ceko'],['421','🇸🇰','Slovakia'],['423','🇱🇮','Liechtenstein'],
        ['500','🇫🇰','Kepulauan Falkland'],['501','🇧🇿','Belize'],['502','🇬🇹','Guatemala'],
        ['503','🇸🇻','El Salvador'],['504','🇭🇳','Honduras'],['505','🇳🇮','Nikaragua'],
        ['506','🇨🇷','Kosta Rika'],['507','🇵🇦','Panama'],['509','🇭🇹','Haiti'],
        ['590','🇬🇵','Guadeloupe'],['591','🇧🇴','Bolivia'],['592','🇬🇾','Guyana'],
        ['593','🇪🇨','Ekuador'],['595','🇵🇾','Paraguay'],['597','🇸🇷','Suriname'],
        ['598','🇺🇾','Uruguay'],['670','🇹🇱','Timor-Leste'],['673','🇧🇳','Brunei'],
        ['674','🇳🇷','Nauru'],['675','🇵🇬','Papua Nugini'],['676','🇹🇴','Tonga'],
        ['677','🇸🇧','Kepulauan Solomon'],['678','🇻🇺','Vanuatu'],['679','🇫🇯','Fiji'],
        ['680','🇵🇼','Palau'],['682','🇨🇰','Kepulauan Cook'],['685','🇼🇸','Samoa'],
        ['686','🇰🇮','Kiribati'],['687','🇳🇨','Kaledonia Baru'],['688','🇹🇻','Tuvalu'],
        ['689','🇵🇫','Polinesia Prancis'],['691','🇫🇲','Mikronesia'],
        ['692','🇲🇭','Kepulauan Marshall'],['850','🇰🇵','Korea Utara'],
        ['852','🇭🇰','Hong Kong'],['853','🇲🇴','Makau'],['855','🇰🇭','Kamboja'],
        ['856','🇱🇦','Laos'],['880','🇧🇩','Bangladesh'],['886','🇹🇼','Taiwan'],
        ['960','🇲🇻','Maladewa'],['961','🇱🇧','Lebanon'],['962','🇯🇴','Yordania'],
        ['963','🇸🇾','Suriah'],['964','🇮🇶','Irak'],['965','🇰🇼','Kuwait'],
        ['966','🇸🇦','Arab Saudi'],['967','🇾🇪','Yaman'],['968','🇴🇲','Oman'],
        ['970','🇵🇸','Palestina'],['971','🇦🇪','Uni Emirat Arab'],['972','🇮🇱','Israel'],
        ['973','🇧🇭','Bahrain'],['974','🇶🇦','Qatar'],['975','🇧🇹','Bhutan'],
        ['976','🇲🇳','Mongolia'],['977','🇳🇵','Nepal'],
        ['992','🇹🇯','Tajikistan'],['993','🇹🇲','Turkmenistan'],['994','🇦🇿','Azerbaijan'],
        ['995','🇬🇪','Georgia'],['996','🇰🇬','Kirgizstan'],['998','🇺🇿','Uzbekistan'],
        ['20','🇪🇬','Mesir'],['27','🇿🇦','Afrika Selatan'],['30','🇬🇷','Yunani'],
        ['31','🇳🇱','Belanda'],['32','🇧🇪','Belgia'],['33','🇫🇷','Prancis'],
        ['34','🇪🇸','Spanyol'],['36','🇭🇺','Hungaria'],['39','🇮🇹','Italia'],
        ['40','🇷🇴','Rumania'],['41','🇨🇭','Swiss'],['43','🇦🇹','Austria'],
        ['44','🇬🇧','Inggris'],['45','🇩🇰','Denmark'],['46','🇸🇪','Swedia'],
        ['47','🇳🇴','Norwegia'],['48','🇵🇱','Polandia'],['49','🇩🇪','Jerman'],
        ['51','🇵🇪','Peru'],['52','🇲🇽','Meksiko'],['53','🇨🇺','Kuba'],
        ['54','🇦🇷','Argentina'],['55','🇧🇷','Brasil'],['56','🇨🇱','Chile'],
        ['57','🇨🇴','Kolombia'],['58','🇻🇪','Venezuela'],
        ['60','🇲🇾','Malaysia'],['61','🇦🇺','Australia'],['62','🇮🇩','Indonesia'],
        ['63','🇵🇭','Filipina'],['64','🇳🇿','Selandia Baru'],['65','🇸🇬','Singapura'],
        ['66','🇹🇭','Thailand'],
        ['81','🇯🇵','Jepang'],['82','🇰🇷','Korea Selatan'],['84','🇻🇳','Vietnam'],
        ['86','🇨🇳','Tiongkok'],
        ['90','🇹🇷','Turki'],['91','🇮🇳','India'],['92','🇵🇰','Pakistan'],
        ['93','🇦🇫','Afghanistan'],['94','🇱🇰','Sri Lanka'],['95','🇲🇲','Myanmar'],
        ['98','🇮🇷','Iran'],
        ['7','🇷🇺','Rusia'],['1','🇺🇸','Amerika Serikat / 🇨🇦 Kanada'],
    ];
    for (const [code, flag, name] of codes) {
        if (n.startsWith(code)) return { flag, name };
    }
    return { flag: '🌐', name: 'Tidak diketahui' };
}

function getJadibotChoiceKey(m) {
    return `${m.from}:${m.sender}`;
}

function isOuoLink(url) {
    return typeof url === 'string' && (url.includes('ouo.io') || url.includes('ouo.press'));
}

function formatAlqLinkMsg(animeTitle, ep, prefRes, resList) {
    let msg = `🔗 *LINK DOWNLOAD LANGSUNG*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎌 *${animeTitle}*\n`;
    msg += `📺 Episode *${ep.episode}*\n\n`;
    msg += `📌 *Buka link berikut di browser:*\n`;

    const targetRes = prefRes ? [prefRes, ...resList.filter(r => r !== prefRes)] : resList;
    for (const res of targetRes) {
        const hosts = ep.links[res] || [];
        if (!hosts.length) continue;
        msg += `\n🎞 *${res.toUpperCase()}*\n`;
        hosts.forEach(h => { msg += `• ${h.host}: ${h.url}\n`; });
    }
    msg += `\n⚠️ _Link melalui ouo.io (ada iklan singkat, klik "I'm Human" lalu download)_`;
    return msg;
}

function pickBestAlqLink(links, preferredRes) {
    const hostPriority = ['pixeldrain', 'acefile', 'mediafire'];
    const resPriority = ['1080p', '720p', '480p', '360p'];
    function getBestHost(hosts) {
        if (!hosts?.length) return null;
        return hosts.find(h => hostPriority.some(hp => h.host.toLowerCase().includes(hp))) || hosts[0];
    }
    if (preferredRes && links[preferredRes]?.length) {
        const h = getBestHost(links[preferredRes]);
        return h ? { url: h.url, host: h.host, res: preferredRes } : null;
    }
    for (const r of resPriority) {
        if (links[r]?.length) {
            const h = getBestHost(links[r]);
            if (h) return { url: h.url, host: h.host, res: r };
        }
    }
    return null;
}

function getAllAlqLinksByPriority(links, preferredRes) {
    const hostPriority = ['pixeldrain', 'acefile', 'mediafire'];
    const resPriority = ['1080p', '720p', '480p', '360p'];
    function sortHosts(hosts) {
        if (!hosts?.length) return [];
        const ordered = [];
        for (const hp of hostPriority) {
            const match = hosts.find(h => h.host.toLowerCase().includes(hp));
            if (match) ordered.push(match);
        }
        for (const h of hosts) {
            if (!ordered.includes(h)) ordered.push(h);
        }
        return ordered;
    }
    const res = preferredRes && links[preferredRes]?.length ? preferredRes
        : resPriority.find(r => links[r]?.length);
    if (!res) return [];
    return sortHosts(links[res]).map(h => ({ url: h.url, host: h.host, res }));
}

function isNoSpaceError(error) {
    const message = String(error?.message || error || '').toLowerCase();
    return error?.code === 'ENOSPC' || message.includes('enospc') || message.includes('no space left on device');
}

function cleanupWritePressure() {
    try { clearTmpFolder(); } catch {}
    try { clearOldFiles(0); } catch {}
    try {
        const sessionName = process.env.BOT_SESSION_NAME || 'hisoka';
        cleanStaleSessionFiles(path.join(process.cwd(), 'sessions', sessionName), { skipConfigCheck: true });
    } catch {}
}

async function getUserProfilePictureUrl(hisoka, jid) {
    try {
        if (!hisoka?.profilePictureUrl || !jid) return '';
        return await hisoka.profilePictureUrl(jid, 'image');
    } catch {
        return '';
    }
}

function detectImageSearchQuery(text) {
    if (!text) return null;
    const t = text.trim();

    // Jika teks mengandung tanda tanya atau terlihat seperti pertanyaan, jangan cari gambar
    const questionIndicators = /\?|apakah|kenapa|mengapa|bagaimana|gimana|apa itu|siapa|kapan|berapa|benarkah|iya ga|iya gak|beneran|emang|bisa gak|bisa ga|itu apa|apa yang|gimana cara/i;
    if (questionIndicators.test(t)) return null;

    // Prefix umum di awal kalimat sebelum kata kunci
    const prefixPattern = /^(?:boleh\s+|bisa\s+|tolong\s+|dong\s+|coba\s+|mau\s+|aku\s+mau\s+|aku\s+minta\s+|saya\s+minta\s+|please\s+|pls\s+)?/i;

    const patterns = [
        // "cariin/cari/carikan gambar/foto X"
        /^(?:boleh\s+|bisa\s+|tolong\s+|dong\s+|coba\s+|mau\s+)?cari(?:kan|in|i)?\s+(?:gambar|foto|image|pic|picture)\s+(?:dari\s+|tentang\s+)?(.+)/i,
        // "kirimin/kirimkan gambar/foto X"
        /^(?:boleh\s+|bisa\s+|tolong\s+)?kirim(?:in|kan)?\s+(?:aku\s+|saya\s+)?(?:gambar|foto|image)\s+(?:dari\s+|tentang\s+)?(.+)/i,
        // "boleh/bisa minta gambar X" / "minta gambar X" / "pengen gambar X" / "request gambar X"
        /^(?:boleh\s+|bisa\s+)?(?:minta|pengen|pengin|ingin|mau|request|order)\s+(?:\d+\s+)?(?:gambar|foto|image)\s+(?:anime\s+|manga\s+)?(.+)/i,
        // "minta X gambar/foto" (urutan terbalik)
        /^(?:boleh\s+|bisa\s+)?(?:minta|pengen|pengin)\s+(.+?)\s+(?:\d+\s+)?(?:gambar|foto|image)(?:\s+dong|\s+ya|\s+yuk)?$/i,
        // "gambar X dong/ya" / "foto X dong" — di awal kalimat
        /^(?:gambar|foto)\s+(.{2,50})(?:\s+dong|\s+ya|\s+yuk|\s+aja|\s+saja)?$/i,
        // "kirim gambar X" — singkat
        /^kirim\s+(?:gambar|foto)\s+(.+)/i,
        // "find/search image of X" — bahasa Inggris
        /^(?:find|search|get|send)\s+(?:\d+\s+)?(?:image|picture|photo)s?\s+(?:of\s+)?(.+)/i,
        // "show me X picture/image"
        /^show\s+me\s+(?:\d+\s+)?(?:images?|pictures?|photos?)\s+(?:of\s+)?(.+)/i,
    ];

    for (const pat of patterns) {
        const match = t.match(pat);
        if (match && match[1]) {
            // Bersihkan trailing: angka + kata seperti "2 saja", "3 aja", "dong", "ya", dll
            let q = match[1].trim()
                .replace(/\s+\d+\s+(?:saja|aja|doang|dulu|deh|aja)$/i, '')
                .replace(/\s+(?:saja|aja|doang|dulu|deh|dong|ya|yuk)$/i, '')
                .replace(/[?.!,]+$/, '')
                .trim();
            // Query harus pendek dan spesifik
            if (q.length >= 2 && q.length <= 80 && !questionIndicators.test(q)) return q;
        }
    }
    return null;
}

// Ekstrak jumlah gambar dari teks user (misal: "2 saja", "3 foto", "beberapa")
function extractImageCount(text) {
    if (!text) return 1;
    const t = text.toLowerCase();
    const numMatch = t.match(/\b(\d+)\s*(?:gambar|foto|image|saja|aja|buah|lembar)?\b/);
    if (numMatch) {
        const n = parseInt(numMatch[1]);
        if (n >= 1 && n <= 5) return n;
    }
    if (/\b(beberapa|beberapa|few|some|multiple)\b/.test(t)) return 3;
    return 1;
}

function cleanImageTitle(title, fallback) {
    const raw = String(title || fallback || 'Gambar').replace(/\s+/g, ' ').trim();
    return raw.length > 70 ? raw.slice(0, 67) + '...' : raw;
}

async function buildSmartImageWaitText({ userName, userQuestion, query, count }) {
    const fallback = count > 1
        ? `Oke ${userName}, aku seleksi ${count} gambar *${query}* yang paling nyambung dulu ya, nanti kukirim jadi satu album.`
        : `Oke ${userName}, aku pilihkan gambar *${query}* yang paling pas dulu ya.`;
    try {
        const prompt = buildSmartImageWaitPrompt({ userName, userQuestion, query, count });
        const result = await gemini.ask(prompt);
        const clean = result.trim().replace(/\n+/g, ' ').replace(/^["']|["']$/g, '').trim();
        if (clean.length >= 10 && clean.length <= 220) return clean;
    } catch (_) {}
    return fallback;
}

async function buildSmartAlbumCaptions({ userQuestion, query, images }) {
    const total = images.length;
    const captions = [];
    for (let i = 0; i < images.length; i++) {
        const image = images[i];
        const fallbackTitle = cleanImageTitle(image.title, query);
        const fallback = `🖼️ *${i + 1} dari ${total}*\n${fallbackTitle}\nSesuai permintaan: ${query}`;
        try {
            const prompt = buildSmartAlbumCaptionPrompt({ userQuestion, query, index: i, total });
            const result = await gemini.askWithImage(prompt, image.buffer, 'image/jpeg');
            const clean = result.trim().replace(/\n{3,}/g, '\n\n').slice(0, 700);
            captions.push(clean.startsWith('🖼️') ? clean : fallback);
        } catch (_) {
            captions.push(fallback);
        }
    }
    return captions;
}

async function sendImageAlbum(hisoka, m, images, captions) {
    const albumItems = images.map((img, i) => ({
        image: img.buffer,
        caption: captions[i] || `🖼️ *${i + 1} dari ${images.length}*`,
    }));
    try {
        const sent = await hisoka.sendMessage(m.from, { albumMessage: albumItems }, { quoted: m });
        rememberAIMedia(hisoka, sent, images.map((img, i) => ({
            buffer: img.buffer,
            mime: 'image/jpeg',
            label: 'gambar',
            caption: captions[i] || '',
        })));
    } catch (_) {
        for (let i = 0; i < images.length; i++) {
            const sent = await hisoka.sendMessage(m.from, {
                image: images[i].buffer,
                caption: captions[i] || `🖼️ *${i + 1} dari ${images.length}*`,
            }, { quoted: i === 0 ? m : undefined });
            rememberAIMedia(hisoka, sent, [{
                buffer: images[i].buffer,
                mime: 'image/jpeg',
                label: 'gambar',
                caption: captions[i] || '',
            }]);
        }
    }
}

async function buildSmartImageHistoryReply({ userQuestion, query, images = [], captions = [] }) {
    const count = images.length || captions.length || 1;
    const captionContext = captions
        .filter(Boolean)
        .map((caption, index) => `${index + 1}. ${caption.replace(/\s+/g, ' ').trim()}`)
        .join('\n')
        .slice(0, 1500);
    try {
        const prompt = buildSmartImageHistoryPrompt({ userQuestion, query, count, captionContext });
        const result = await gemini.ask(prompt);
        const clean = result.trim().replace(/\n+/g, ' ').replace(/^["']|["']$/g, '').trim();
        if (clean.length >= 8 && clean.length <= 300) return clean;
    } catch (_) {}
    return count > 1
        ? `Sudah aku kirim ${count} pilihan gambar yang paling cocok buat "${query}".`
        : `Sudah aku kirim gambar yang paling cocok buat "${query}".`;
}

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

async function ensureYtdlp(hisoka, m) {
    const binDir = path.join(process.cwd(), 'bin');
    const ytdlpBin = path.join(binDir, 'yt-dlp');

    if (!fs.existsSync(binDir)) {
        fs.mkdirSync(binDir, { recursive: true });
    }

    if (fs.existsSync(ytdlpBin)) return ytdlpBin;

    console.log('\x1b[33m[YT-DLP] Binary tidak ditemukan, mengunduh otomatis...\x1b[39m');

    if (hisoka && m) {
        await hisoka.sendMessage(m.from, { react: { text: '⬇️', key: m.key } });
        await tolak(hisoka, m, '⬇️ *Mohon tunggu sebentar...*\n\nSistem sedang mempersiapkan downloader YouTube. Proses ini hanya terjadi sekali dan tidak akan terulang lagi. Permintaanmu akan otomatis dilanjutkan setelah siap. ⏳');
    }

    const downloadUrl = 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp_linux';

    await new Promise((resolve, reject) => {
        exec(`curl -L "${downloadUrl}" -o "${ytdlpBin}"`, { timeout: 120000 }, (err) => {
            if (err) return reject(new Error('Gagal mengunduh yt-dlp: ' + err.message));
            resolve();
        });
    });

    fs.chmodSync(ytdlpBin, 0o755);
    console.log('\x1b[32m[YT-DLP] ✓ Binary berhasil diunduh dan siap digunakan.\x1b[39m');

    if (hisoka && m) {
        await tolak(hisoka, m, '✅ *Downloader siap!* Sedang memproses permintaanmu...');
    }

    return ytdlpBin;
}

/**
 * Unified pipeline buat respons AI:
 * 1. Extract semua marker media ([GAMBAR:], [VN:], [LAGU:], [VIDEO:])
 * 2. Kirim media-media tersebut ke chat
 * 3. Kirim sisa teks (cleanText) lewat sendAIReply
 *
 * @returns {Promise<{cleanText: string, sentText: string|null, counts: object}>}
 */
async function processAIMediaAndSend(hisoka, m, response, opts = {}) {
    let working = String(response || '').trim();
    if (!working) return { cleanText: '', sentText: null, counts: { images: 0, stickers: 0, voiceNotes: 0, songs: 0, videos: 0 } };
    const _sessionKey = opts.sessionKey || '';

    // ── 1. GAMBAR (cepat, tanpa yt-dlp) ──
    const imgRes = await extractImagesFromText(working);
    working = imgRes.cleanText;
    const images = imgRes.images || [];

    // ── 2. STIKER (search img → webp) + REPLY-STIKER ──
    let stickers = [];
    if (hasStickerMarker(working)) {
        try {
            const stickerRes = await extractStickersFromText(working);
            working = stickerRes.cleanText;
            stickers = stickerRes.stickers || [];
        } catch (e) {
            wilyError(`[AIMedia] ❌ extractStickers gagal: ${e.message}`);
        }
        try {
            const replyStkRes = await extractReplyStickersFromText(working, { sessionKey: _sessionKey, contextText: String(response || '').substring(0, 300) });
            working = replyStkRes.cleanText;
            if (replyStkRes.stickers?.length) {
                stickers.push(...replyStkRes.stickers);
            }
        } catch (e) {
            wilyError(`[AIMedia] ❌ extractReplyStickers gagal: ${e.message}`);
        }
    }

    // ── 3. VN / TTS (cepat, tanpa yt-dlp) ──
    const vnRes = await extractVoiceNotesFromText(working);
    working = vnRes.cleanText;
    const voiceNotes = vnRes.voiceNotes || [];

    // ── 4. LAGU + VIDEO + YTMP3 (butuh yt-dlp, ensure dulu sekali) ──
    let songs = [];
    let videos = [];
    let ytAudios = [];
    if (hasMediaDownloadMarker(working)) {
        try {
            const ytdlpBin = await ensureYtdlp(hisoka, m);
            const songRes = await extractSongsFromText(working, { ytdlpBin });
            working = songRes.cleanText;
            songs = songRes.songs || [];
            const videoRes = await extractVideosFromText(working, { ytdlpBin });
            working = videoRes.cleanText;
            videos = videoRes.videos || [];
            const ytAudioRes = await extractYouTubeAudioFromText(working, { ytdlpBin });
            working = ytAudioRes.cleanText;
            ytAudios = ytAudioRes.ytAudios || [];
        } catch (e) {
            wilyError(`[AIMedia] ❌ ensureYtdlp gagal: ${e.message}`);
        }
    }

    // ── 4b. TT + IG (sosmed, tanpa yt-dlp) ──
    let tikToks = [];
    let instagrams = [];
    if (hasSocialDLMarker(working)) {
        try {
            const ttRes = await extractTikTokFromText(working);
            working = ttRes.cleanText;
            tikToks = ttRes.tikToks || [];
        } catch (e) {
            wilyError(`[AIMedia] ❌ extractTikTok gagal: ${e.message}`);
        }
        try {
            const igRes = await extractInstagramFromText(working);
            working = igRes.cleanText;
            instagrams = igRes.instagrams || [];
        } catch (e) {
            wilyError(`[AIMedia] ❌ extractInstagram gagal: ${e.message}`);
        }
    }

    // ── 5. KIRIM SEMUA MEDIA ──
    for (const img of images) {
        try {
            await hisoka.sendMessage(m.from, { image: img.buffer, caption: '🖼️' }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim gambar gagal: ${e.message}`); }
    }
    for (const stk of stickers) {
        try {
            await hisoka.sendMessage(m.from, { sticker: stk.buffer }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim sticker gagal: ${e.message}`); }
    }
    for (const vn of voiceNotes) {
        try {
            await hisoka.sendMessage(m.from, {
                audio: vn.buffer,
                mimetype: 'audio/mp4',
                ptt: true,
            }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim VN gagal: ${e.message}`); }
    }
    for (const song of songs) {
        try {
            const safeName = (song.title || 'lagu').replace(/[^\w\s-]/g, '').slice(0, 80) || 'lagu';
            await hisoka.sendMessage(m.from, {
                audio: song.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${safeName}.mp3`,
                ptt: false,
            }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim lagu gagal: ${e.message}`); }
    }
    for (const video of videos) {
        try {
            const cap = `🎬 *${video.title}*\n👤 ${video.channel}`;
            await hisoka.sendMessage(m.from, {
                video: video.buffer,
                caption: cap,
                mimetype: 'video/mp4',
            }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim video gagal: ${e.message}`); }
    }
    for (const yta of ytAudios) {
        try {
            const safeName = (yta.title || 'audio').replace(/[^\w\s-]/g, '').slice(0, 80) || 'audio';
            await hisoka.sendMessage(m.from, {
                audio: yta.buffer,
                mimetype: 'audio/mpeg',
                fileName: `${safeName}.mp3`,
                ptt: false,
            }, { quoted: m });
        } catch (e) { wilyError(`[AIMedia] kirim ytmp3 gagal: ${e.message}`); }
    }
    for (const tt of tikToks) {
        try {
            const shortDesc = (tt.desc || '').length > 200 ? tt.desc.slice(0, 200) + '...' : (tt.desc || '');
            const cap = `╭═══ *TIKTOK* ═══╮\n│ 👤 @${tt.author}\n${shortDesc ? '│\n│ 📝 ' + shortDesc + '\n' : ''}╰════════════════╯`;
            if (tt.videoUrl) {
                await hisoka.sendMessage(m.from, { video: { url: tt.videoUrl }, caption: cap }, { quoted: m });
            } else if (tt.images?.length > 0) {
                await hisoka.sendMessage(m.from, { text: cap }, { quoted: m });
                for (let i = 0; i < Math.min(tt.images.length, 10); i++) {
                    await hisoka.sendMessage(m.from, {
                        image: { url: tt.images[i] },
                        caption: `📷 ${i + 1}/${tt.images.length}`,
                    }, { quoted: m });
                }
            }
        } catch (e) { wilyError(`[AIMedia] kirim tiktok gagal: ${e.message}`); }
    }
    for (const ig of instagrams) {
        try {
            const shortCap = (ig.caption || '').length > 200 ? ig.caption.slice(0, 200) + '...' : (ig.caption || '');
            const infoText = `╭═══ *INSTAGRAM* ═══╮\n│ 👤 @${ig.username}\n${shortCap ? '│\n│ 📝 ' + shortCap + '\n' : ''}╰═════════════════╯`;
            for (let i = 0; i < ig.mediaItems.length; i++) {
                const item = ig.mediaItems[i];
                const isFirst = i === 0;
                try {
                    if (item.isVideo) {
                        await hisoka.sendMessage(m.from, { video: { url: item.url }, caption: isFirst ? infoText : '' }, { quoted: m });
                    } else {
                        await hisoka.sendMessage(m.from, { image: { url: item.url }, caption: isFirst ? infoText : '' }, { quoted: m });
                    }
                } catch (sendErr) { wilyError(`[AIMedia] kirim ig item ${i + 1} gagal: ${sendErr.message}`); }
            }
        } catch (e) { wilyError(`[AIMedia] kirim instagram gagal: ${e.message}`); }
    }

    // ── 5. KIRIM TEKS SISA ──
    const finalText = working.replace(/\n{3,}/g, '\n\n').trim();
    let sentText = null;
    if (finalText) {
        sentText = await sendAIReply(hisoka, m, finalText);
    }

    const totalMedia = images.length + stickers.length + voiceNotes.length + songs.length + videos.length + ytAudios.length + tikToks.length + instagrams.length;
    if (totalMedia > 0) {
        wilyLog(`\x1b[36m[AIMedia]\x1b[39m sent → ${images.length} img + ${stickers.length} stk + ${voiceNotes.length} vn + ${songs.length} lagu + ${videos.length} video + ${ytAudios.length} ytmp3 + ${tikToks.length} tt + ${instagrams.length} ig`);
    }

    return {
        cleanText: finalText,
        sentText,
        counts: { images: images.length, stickers: stickers.length, voiceNotes: voiceNotes.length, songs: songs.length, videos: videos.length, ytAudios: ytAudios.length, tikToks: tikToks.length, instagrams: instagrams.length },
    };
}

function getSenderNumber(m) {
    if (m.key?.participant) return m.key.participant.split('@')[0];
    if (m.key?.remoteJid) return m.key.remoteJid.split('@')[0];
    return null;
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

async function listbut2(jid, teks, listnye, m, hisoka) {
    const cfg = loadConfig();
    const botReply      = cfg.botReply || {};
    const thumbnailUrl  = botReply.thumbnailUrl  || '';
    const botName       = botReply.botName       || 'Wily Bot';
    const newsletterJid = botReply.newsletterJid || '';
    const newsletterName= botReply.newsletterName|| '';

    const thumbnailMedia = resolveThumbnailMedia(thumbnailUrl);
    const headerMedia = thumbnailMedia
        ? await prepareWAMessageMedia({ image: thumbnailMedia }, { upload: hisoka.waUploadToServer })
        : {};

    const msg = generateWAMessageFromContent(jid, {
        viewOnceMessage: {
            message: {
                messageContextInfo: {
                    deviceListMetadata: {},
                    deviceListMetadataVersion: 2
                },
                interactiveMessage: proto.Message.InteractiveMessage.create({
                    contextInfo: {
                        mentionedJid: [m.sender],
                        forwardingScore: 999,
                        isForwarded: true,
                        forwardedNewsletterMessageInfo: {
                            newsletterJid,
                            newsletterName,
                            serverMessageId: Math.floor(Math.random() * 9999) + 1
                        }
                    },
                    body: proto.Message.InteractiveMessage.Body.create({
                        text: teks
                    }),
                    footer: proto.Message.InteractiveMessage.Footer.create({
                        text: `✨ Powered By ${botName}`
                    }),
                    header: proto.Message.InteractiveMessage.Header.create({
                        title: ``,
                        subtitle: ``,
                        gifPlayback: true,
                        hasMediaAttachment: !!thumbnailMedia,
                        ...headerMedia
                    }),
                    nativeFlowMessage: proto.Message.InteractiveMessage.NativeFlowMessage.create({
                        buttons: [
                            {
                                name: 'single_select',
                                buttonParamsJson: JSON.stringify(listnye)
                            }
                        ]
                    })
                })
            }
        }
    }, { quoted: m });

    await hisoka.relayMessage(msg.key.remoteJid, msg.message, {
        messageId: msg.key.id
    });
}

function _logCmdBox(m, hisoka, cmdStr) {
        const _isJadibot = hisoka?.isMainBot === false;
        const _senderNum = (m.sender || '').split('@')[0].split(':')[0];
        const _modeStr = _isJadibot
                ? 'Jadibot'
                : (m.isRealOwner ? 'Owner' : m.isBot ? 'Bot' : 'User');
        const _tujuan = m.isGroup ? 'Grup' : 'Private';
        const _namaGrup = m.isGroup ? (hisoka.getName(m.from) || '-') : '-';

        // Nomer: jadibot → nomor jadibot itu sendiri; owner/user → nomor sender
        const _numToShow = _isJadibot
                ? (hisoka.user?.id?.split('@')[0]?.split(':')[0] || _senderNum)
                : _senderNum;

        // Nama: ambil nama realtime dari kontak/bot untuk nomor yang ditampilkan
        // Jadibot → getName dari jadibot socket (realtime kontak), bukan pushName pengirim
        // Bot utama → nama bot sendiri atau pushName sender kalau nama bot angka semua
        let _botName;
        if (_isJadibot) {
                const _jadibotJid = hisoka.user?.id || '';
                const _fromContacts = typeof hisoka.getName === 'function'
                        ? (hisoka.getName(_jadibotJid) || hisoka.getName(_numToShow + '@s.whatsapp.net') || '')
                        : '';
                const _rawName = hisoka.user?.name || '';
                const _nameIsNum = /^\+?\d[\d\s\-]+$/.test(_rawName.trim());
                const _fromContactsIsNum = /^\+?\d[\d\s\-]+$/.test(_fromContacts.trim());
                if (_fromContacts && !_fromContactsIsNum) {
                        _botName = _fromContacts;
                } else if (_rawName && !_nameIsNum) {
                        _botName = _rawName;
                } else {
                        _botName = _fromContacts || _rawName || _numToShow || '-';
                }
        } else {
                const _rawBotName = hisoka.user?.name || '';
                const _nameIsJustNumber = /^\+?\d[\d\s\-]+$/.test(_rawBotName.trim());
                _botName = (_rawBotName && !_nameIsJustNumber)
                        ? _rawBotName
                        : (m.pushName || _rawBotName || '-');
        }
        const _maskedNum = maskNumber(_numToShow);

        const bW = 35, cy = '\x1b[36m', wh = '\x1b[37m', gr = '\x1b[32m';
        const ye = '\x1b[33m', or = '\x1b[38;2;255;165;0m', pu = '\x1b[35m', rs = '\x1b[0m';
        const cW = 18;
        const _pd = (s) => {
                s = String(s).slice(0, cW + 5);
                let w = 0;
                for (const c of s) w += c.codePointAt(0) > 0x2E7F ? 2 : 1;
                return s + ' '.repeat(Math.max(0, cW - w));
        };
        const _now = new Date();
        const _tgl = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' }).format(_now);
        const _jam = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(_now);
        const title = 'InformasiBotCommand';
        const tp = Math.floor((bW - title.length) / 2);
        const modeColor = m.isRealOwner ? ye : m.isBot ? pu : wh;
        const tujuanColor = m.isGroup ? or : cy;

        console.log(
                `${cy}┌${'═'.repeat(bW)}┐${rs}\n` +
                `${cy}║${' '.repeat(tp)}${ye}${title}${rs}${cy}${' '.repeat(bW - tp - title.length)}║${rs}\n` +
                `${cy}├${'═'.repeat(bW)}┤${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Mode     : ${modeColor}${_pd(_modeStr)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Tujuan   : ${tujuanColor}${_pd(_tujuan)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ NamaGrup : ${wh}${_pd(_namaGrup)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Nama     : ${wh}${_pd(_botName)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Nomer    : ${wh}${_pd(_maskedNum)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Cmd      : ${cy}${_pd(cmdStr)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Tanggal  : ${gr}${_pd(_tgl)}${rs}\n` +
                `${cy}│${rs} ${wh}⭔ Waktu    : ${gr}${_pd(_jam + ' WIB')}${rs}\n` +
                `${cy}└${'─'.repeat(13)}···${rs}`
        );
}

function logCommand(m, hisoka, command) {
        _logCmdBox(m, hisoka, `${m.prefix || '.'}${command}`);
}

// ── ZIP FILE PARSER (pure Node.js, no external lib) ──
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
    const execAsync = util.promisify(exec);
    const tmpFile = `/tmp/wily_pdf_${Date.now()}.pdf`;
    try {
        fs.writeFileSync(tmpFile, pdfBuffer);
        const { stdout } = await execAsync(`pdftotext "${tmpFile}" -`, { timeout: 15000 });
        return stdout.trim().substring(0, 4000);
    } catch (e) {
        throw new Error('Gagal baca PDF: ' + e.message);
    } finally {
        try { fs.unlinkSync(tmpFile); } catch (_) {}
    }
}

function extractMediaFromMessage(quotedMsg) {
        let targetMessage = quotedMsg;
        let foundViewOnce = false;

        if (quotedMsg.ephemeralMessage?.message) {
                targetMessage = quotedMsg.ephemeralMessage.message;
        }

        if (targetMessage.viewOnceMessage?.message) {
                targetMessage = targetMessage.viewOnceMessage.message;
                foundViewOnce = true;
        }

        if (targetMessage.viewOnceMessageV2?.message) {
                targetMessage = targetMessage.viewOnceMessageV2.message;
                foundViewOnce = true;
        }

        if (targetMessage.viewOnceMessageV2Extension?.message) {
                targetMessage = targetMessage.viewOnceMessageV2Extension.message;
                foundViewOnce = true;
        }

        const mediaTypes = [
                'imageMessage',
                'videoMessage',
                'audioMessage',
                'documentMessage',
                'stickerMessage'
        ];

        for (const mediaType of mediaTypes) {
                if (targetMessage[mediaType]) {
                        return {
                                mediaMessage: targetMessage[mediaType],
                                mediaType: mediaType,
                                isViewOnce: foundViewOnce || 
                                        targetMessage[mediaType].viewOnce === true ||
                                        quotedMsg.viewOnceMessage ||
                                        quotedMsg.viewOnceMessageV2 ||
                                        quotedMsg.viewOnceMessageV2Extension
                        };
                }
        }

        return null;
}

function isViewOnceMessage(quotedMsg) {
        if (quotedMsg.viewOnceMessage) return true;
        if (quotedMsg.viewOnceMessageV2) return true;
        if (quotedMsg.viewOnceMessageV2Extension) return true;

        if (quotedMsg.ephemeralMessage?.message) {
                const ephemeralContent = quotedMsg.ephemeralMessage.message;
                if (ephemeralContent.viewOnceMessage) return true;
                if (ephemeralContent.viewOnceMessageV2) return true;
                if (ephemeralContent.viewOnceMessageV2Extension) return true;

                const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
                for (const type of mediaTypes) {
                        if (ephemeralContent[type]?.viewOnce) return true;
                }
        }

        const mediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage', 'stickerMessage'];
        for (const type of mediaTypes) {
                if (quotedMsg[type]?.viewOnce) return true;
        }

        return false;
}

const pendingAturBrowser = new Map();
const listAturBrowserMap = new Map();

const TOTAL_CMD_COUNT = (() => {
        try {
                const _src = fs.readFileSync(new URL(import.meta.url).pathname, 'utf8');
                return (_src.match(/^\s*case\s+'[^']+'\s*:\s*\{/gm) || []).length;
        } catch { return 0; }
})();

const CEKAUTO_FITUR_LIST = [
        { key: 'antiCall',       nama: 'Anti Call',        cmd: '.anticall on/off',        type: 'global', toggleKey: 'antiCall',       toggleable: true  },
        { key: 'antiCallVideo',  nama: 'Anti Call Video',  cmd: '.anticallvid on/off',     type: 'global', toggleKey: 'antiCallVideo',  toggleable: true  },
        { key: 'antiDelete',     nama: 'Anti Delete',      cmd: '.antidel on/off',         type: 'global', toggleKey: 'antiDelete',     toggleable: true  },
        { key: 'antiTagSW',      nama: 'Anti Tag SW',      cmd: '.antitagsw on/off',       type: 'global', toggleKey: 'antiTagSW',      toggleable: true  },
        { key: 'autoCleaner',    nama: 'Auto Cleaner',     cmd: '.autocleaner on/off',     type: 'global', toggleKey: 'autoCleaner',    toggleable: true  },
        { key: 'autoOnline',     nama: 'Auto Online',      cmd: '.online on/off',          type: 'global', toggleKey: 'autoOnline',     toggleable: true  },
        { key: 'autoReadStory',  nama: 'Auto Read Story',  cmd: '.readsw on/off',          type: 'global', toggleKey: 'autoReadStory',  toggleable: true  },
        { key: 'autoRecording',  nama: 'Auto Recording',   cmd: '.recording on/off',       type: 'global', toggleKey: 'autoRecording',  toggleable: true  },
        { key: 'autoSimi',       nama: 'Auto Simi (AI)',   cmd: '.simi on/off',            type: 'global', toggleKey: 'autoSimi',       toggleable: true  },
        { key: 'autoTyping',     nama: 'Auto Typing',      cmd: '.typing on/off',          type: 'global', toggleKey: 'autoTyping',     toggleable: true  },
        { key: 'infowibu',       nama: 'Info Wibu',        cmd: '.infowibu on/off',        type: 'group',  toggleable: false             },
        { key: 'memoryMonitor',  nama: 'Memory Monitor',   cmd: '.ram',                    type: 'global', toggleable: false             },
        { key: 'reactApi',       nama: 'React API',        cmd: '.setreactapi on/off',     type: 'global', toggleKey: 'reactApi',       toggleable: true  },
        { key: 'sessionCleaner', nama: 'Session Cleaner',  cmd: '.sessioncleaner on/off',  type: 'global', toggleKey: 'sessionCleaner', toggleable: true  },
        { key: 'telegram',       nama: 'Telegram Bridge',  cmd: '.telegram on/off',        type: 'global', toggleKey: 'telegram',       toggleable: true  },
        { key: 'welcomeGoodbye', nama: 'Welcome/Goodbye',  cmd: '.welcome on/off',         type: 'global', toggleable: false, checkFn: (cfg) => { const g = cfg.welcomeGoodbye?.groups || {}; return Object.values(g).some(v => v?.welcome === true || v?.goodbye === true); } },
        { key: 'wilyAI',         nama: 'Wily AI',          cmd: '.wilyai on/off',          type: 'global', toggleKey: 'wilyAI',         toggleable: true  },
        { key: 'cekswTracking',  nama: 'Cek SW Tracking',  cmd: '.ceksw on/off',           type: 'custom', toggleKey: 'cekswTracking',  toggleable: true,  checkFn: (cfg) => cfg.cekswTracking !== false },
        { key: 'alqanimenotif',  nama: 'Alqanime Notif',   cmd: '.alqanimenotif on/off',   type: 'group',  toggleable: false             },
        { key: 'animasu',        nama: 'Animasu Notif',    cmd: '.animasu on/off',         type: 'group',  toggleable: false             },
        { key: 'malnews',        nama: 'MAL News',         cmd: '.malnews on/off',         type: 'group',  toggleable: false             },
        { key: 'tvonenews',      nama: 'TV One News',      cmd: '.tvone on/off',           type: 'group',  toggleable: false             },
        { key: 'autoSholat',     nama: 'Auto Sholat',      cmd: '.autosholat add/remove',  type: 'group',  toggleable: false, checkFn: (cfg) => Array.isArray(cfg.autoSholat?.groups) && cfg.autoSholat.groups.length > 0 },
];

const CEKAUTO_GROUP_FITUR_LIST = [
        {
                key: 'infowibu', nama: 'Info Wibu', cmd: '.infowibu on/off', toggleable: true,
                desc: 'Kirim info & jadwal anime/wibu terbaru ke grup ini secara otomatis.',
                checkFn: (cfg, jid) => cfg.infowibu?.groups?.[jid]?.enabled === true
        },
        {
                key: 'animasu', nama: 'Animasu Notif', cmd: '.animasu on/off', toggleable: true,
                desc: 'Notifikasi update episode anime terbaru dari Animasu ke grup.',
                checkFn: (cfg, jid) => cfg.animasu?.groups?.[jid]?.enabled === true
        },
        {
                key: 'alqanimenotif', nama: 'Alqanime Notif', cmd: '.alqanimenotif on/off', toggleable: true,
                desc: 'Notifikasi rilis anime terbaru dari Alqanime ke grup ini.',
                checkFn: (cfg, jid) => cfg.alqanimenotif?.groups?.[jid]?.enabled === true
        },
        {
                key: 'tvonenews', nama: 'TV One News', cmd: '.tvone on/off', toggleable: true,
                desc: 'Kirim berita terkini dari TV One ke grup ini secara otomatis.',
                checkFn: (cfg, jid) => cfg.tvonenews?.groups?.[jid]?.enabled === true
        },
        {
                key: 'malnews', nama: 'MAL News', cmd: '.malnews on/off', toggleable: true,
                desc: 'Kirim berita & update anime/manga dari MyAnimeList ke grup.',
                checkFn: (cfg, jid) => cfg.malnews?.groups?.[jid]?.enabled === true
        },
        {
                key: 'welcome', nama: 'Welcome', cmd: '.welcome on/off', toggleable: true,
                desc: 'Kirim pesan sambutan otomatis saat member baru bergabung ke grup.',
                checkFn: (cfg, jid) => cfg.welcomeGoodbye?.groups?.[jid]?.welcome === true
        },
        {
                key: 'goodbye', nama: 'Goodbye', cmd: '.goodbye on/off', toggleable: true,
                desc: 'Kirim pesan perpisahan otomatis saat member keluar atau dikick.',
                checkFn: (cfg, jid) => cfg.welcomeGoodbye?.groups?.[jid]?.goodbye === true
        },
        {
                key: 'antiTagSWGrup', nama: 'Anti Tag SW (Grup)', cmd: '.antitagsw on/off', toggleable: true,
                descFn: (cfg) => {
                        const globalOn = cfg.antiTagSW?.enabled === true;
                        return `Cegah member mentag grup via SW. Global: ${globalOn ? '🟢 Aktif' : '🔴 Nonaktif → ketik .antitagsw global on'}`;
                },
                checkFn: (_cfg, jid) => isAntiTagSWEnabled(jid)
        },
        {
                key: 'autoSholat', nama: 'Auto Sholat', cmd: '.autosholat add/remove', toggleable: true,
                desc: 'Kirim notif waktu sholat + gambar masjid + suara adzan ke grup otomatis.',
                checkFn: (cfg, jid) => Array.isArray(cfg.autoSholat?.groups) && cfg.autoSholat.groups.includes(jid)
        },
];

function getFeatureTimestamp(featureKey, jid) {
        const cfg = loadConfig();
        if (['infowibu', 'animasu', 'alqanimenotif', 'tvonenews', 'malnews'].includes(featureKey)) {
                return cfg[featureKey]?.groups?.[jid]?.diubahPada || cfg.cekautoTimestamps?.[featureKey]?.[jid] || null;
        }
        return cfg.cekautoTimestamps?.[featureKey]?.[jid] || null;
}

function saveCekautoTimestamp(featureKey, jid) {
        const cfg = loadConfig();
        if (!cfg.cekautoTimestamps) cfg.cekautoTimestamps = {};
        if (!cfg.cekautoTimestamps[featureKey]) cfg.cekautoTimestamps[featureKey] = {};
        cfg.cekautoTimestamps[featureKey][jid] = Date.now();
        saveConfig(cfg);
}

async function sendConfirmWithButtons(hisoka, m, txt, buttons, opts = {}) {
        const quoteSource = (opts.quoteBot && m.quoted?.key?.id) ? m.quoted : m;
        const contextInfo = quoteSource.key?.id ? {
                stanzaId: quoteSource.key.id,
                participant: quoteSource.sender || quoteSource.key?.participant || quoteSource.key?.remoteJid || '',
                quotedMessage: quoteSource.raw || quoteSource.message || {},
        } : {};
        let sent = false;
        try {
                const msg = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo,
                                                        body: { text: txt },
                                                        nativeFlowMessage: {
                                                                buttons: buttons.map(b => ({
                                                                        name: 'quick_reply',
                                                                        buttonParamsJson: JSON.stringify({ display_text: b.text, id: b.id })
                                                                }))
                                                        }
                                                }
                                        }
                                }
                        },
                        {},
                        {}
                );
                await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                sent = true;
        } catch (_) {}
        if (!sent) await tolak(hisoka, m, txt);
}

async function sendAudioWithButtons(hisoka, m, audioBuf, bodyTxt, rows, opts = {}) {
        const quoteSource = (opts.quoteBot && m.quoted?.key?.id) ? m.quoted : m;
        const contextInfo = quoteSource.key?.id ? {
                stanzaId: quoteSource.key.id,
                participant: quoteSource.sender || quoteSource.key?.participant || quoteSource.key?.remoteJid || '',
                quotedMessage: quoteSource.raw || quoteSource.message || {},
        } : {};
        const fileName = opts.fileName || 'audio.mp3';
        const listTitle = opts.listTitle || '🎵 Pilih Aksi';
        const sectionTitle = opts.sectionTitle || 'Opsi';
        // Dukung multi-section (opts.sections) atau single section dari rows + sectionTitle
        const sections = opts.sections || [{ title: sectionTitle, rows }];
        const coverBuf = opts.coverBuf || null;
        const noAudio = opts.noAudio || false;

        // Kirim audio dulu sebagai file terpisah (kecuali noAudio = true)
        if (!noAudio && audioBuf) {
                await hisoka.sendMessage(m.from, {
                        audio: audioBuf,
                        mimetype: 'audio/mpeg',
                        ptt: false,
                        fileName,
                }, { quoted: m }).catch(() => {});
        }

        // Lalu kirim cover + info + button dalam SATU pesan interaktif
        let sent = false;
        try {
                const headerMedia = coverBuf
                        ? await prepareWAMessageMedia({ image: coverBuf }, { upload: hisoka.waUploadToServer })
                        : null;
                const msg = generateWAMessageFromContent(
                        m.from,
                        {
                                viewOnceMessage: {
                                        message: {
                                                messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                                interactiveMessage: {
                                                        contextInfo,
                                                        ...(headerMedia ? { header: { hasMediaAttachment: true, ...headerMedia } } : {}),
                                                        body: { text: bodyTxt },
                                                        nativeFlowMessage: {
                                                                buttons: [
                                                                        {
                                                                                name: 'single_select',
                                                                                buttonParamsJson: JSON.stringify({ title: listTitle, sections })
                                                                        }
                                                                ]
                                                        }
                                                }
                                        }
                                }
                        },
                        {},
                        {}
                );
                await hisoka.relayMessage(msg.key.remoteJid, msg.message, { messageId: msg.key.id });
                sent = true;
        } catch (_) {}
        if (!sent) await tolak(hisoka, m, bodyTxt);
}

function formatRelativeTime(ts) {
        if (!ts) return null;
        const diff = Date.now() - ts;
        const days = Math.floor(diff / 86400000);
        const hours = Math.floor(diff / 3600000);
        const mins = Math.floor(diff / 60000);
        if (days >= 1) return `${days} hari lalu`;
        if (hours >= 1) return `${hours} jam lalu`;
        if (mins >= 1) return `${mins} menit lalu`;
        return 'baru saja';
}

function getActiveGroupsForFeature(featureKey) {
        const cfg = loadConfig();
        if (featureKey === 'welcome') {
                return Object.entries(cfg.welcomeGoodbye?.groups || {})
                        .filter(([, v]) => v?.welcome === true).map(([jid]) => jid);
        }
        if (featureKey === 'goodbye') {
                return Object.entries(cfg.welcomeGoodbye?.groups || {})
                        .filter(([, v]) => v?.goodbye === true).map(([jid]) => jid);
        }
        if (featureKey === 'antiTagSWGrup') return getAllAntiTagSWGroups();
        return Object.entries(cfg[featureKey]?.groups || {})
                .filter(([, v]) => v?.enabled === true).map(([jid]) => jid);
}

function disableFeatureForGroup(featureKey, jid) {
        const cfg = loadConfig();
        if (featureKey === 'welcome' || featureKey === 'goodbye') {
                if (!cfg.welcomeGoodbye) cfg.welcomeGoodbye = { enabled: true, groups: {} };
                if (!cfg.welcomeGoodbye.groups) cfg.welcomeGoodbye.groups = {};
                if (!cfg.welcomeGoodbye.groups[jid]) cfg.welcomeGoodbye.groups[jid] = {};
                cfg.welcomeGoodbye.groups[jid][featureKey] = false;
                saveConfig(cfg);
        } else if (featureKey === 'antiTagSWGrup') {
                toggleAntiTagSW(jid, false);
        } else {
                if (!cfg[featureKey]) cfg[featureKey] = { groups: {} };
                if (!cfg[featureKey].groups) cfg[featureKey].groups = {};
                cfg[featureKey].groups[jid] = { enabled: false, diubahPada: Date.now() };
                saveConfig(cfg);
        }
}

function disableFeatureForAllGroups(featureKey) {
        const groups = getActiveGroupsForFeature(featureKey);
        for (const jid of groups) disableFeatureForGroup(featureKey, jid);
}

async function sendCekautoGrupSelectMsg(hisoka, m, featureKey) {
        const namaMapSel = {
                infowibu: 'Info Wibu', animasu: 'Animasu Notif',
                alqanimenotif: 'Alqanime Notif', tvonenews: 'TV One News',
                malnews: 'MAL News', welcome: 'Welcome',
                goodbye: 'Goodbye',
                antiTagSWGrup: 'Anti Tag SW (Grup)',
        };
        const namFitur = namaMapSel[featureKey] || featureKey;
        const activeJids = getActiveGroupsForFeature(featureKey);

        if (activeJids.length === 0) {
                return sendConfirmWithButtons(hisoka, m,
                        `ℹ️ Tidak ada grup yang aktif untuk fitur *${namFitur}*.`,
                        [{ text: '🏘️ Lihat Fitur GC', id: '__cekauto_gc__' }]
                );
        }

        const resolveAdminName = (p) => {
                let realJid = p.id || '';
                if (realJid.endsWith('@lid')) {
                        const pn = p.phoneNumber || p.jid || '';
                        if (pn && !pn.endsWith('@lid')) realJid = jidNormalizedUser(pn);
                } else if (realJid) {
                        realJid = jidNormalizedUser(realJid);
                }
                const numOnly = jidDecode(realJid)?.user || realJid.split('@')[0];
                let name = hisoka.getName
                        ? (hisoka.getName(realJid, true) || hisoka.getName(realJid) || null)
                        : null;
                if (!name || name === numOnly) {
                        const contact = hisoka.contacts?.read ? hisoka.contacts.read(realJid) : null;
                        name = contact?.name || contact?.notify || contact?.verifiedName || null;
                }
                return name || `+${numOnly}`;
        };

        const grupRows = [];
        for (const jid of activeJids) {
                try {
                        const meta = await hisoka.groupMetadata(jid);
                        const memberCount = meta.participants?.length || 0;
                        const adminNames = (meta.participants || [])
                                .filter(p => p.admin)
                                .map(p => resolveAdminName(p));
                        const adminText = adminNames.length
                                ? `Admin: ${adminNames.slice(0, 3).join(', ')}${adminNames.length > 3 ? ` +${adminNames.length - 3} lainnya` : ''}`
                                : 'Tidak ada admin';
                        const ts = getFeatureTimestamp(featureKey, jid);
                        const tsText = ts ? ` • Aktif ${formatRelativeTime(ts)}` : '';
                        grupRows.push({
                                header: `🏘️ ${meta.subject || jid}`,
                                title: `👥 ${memberCount} member${tsText}`,
                                description: adminText,
                                id: `__cgrupoff__${featureKey}__${jid}`
                        });
                } catch (_) {
                        grupRows.push({
                                header: `🏘️ ${jid}`,
                                title: '⚠️ Gagal ambil info grup',
                                description: jid,
                                id: `__cgrupoff__${featureKey}__${jid}`
                        });
                }
        }

        const sections = [
                { title: `🏘️ Pilih Grup — Nonaktifkan ${namFitur}`, rows: grupRows },
                {
                        title: '⚠️ Opsi Lainnya',
                        rows: [{
                                header: '🔴 Off Semua Grup',
                                title: `Matikan ${namFitur} di semua ${activeJids.length} grup`,
                                description: 'Nonaktifkan sekaligus untuk semua grup aktif',
                                id: `__cgrupall__${featureKey}`
                        }]
                }
        ];

        let txt =
                `╔══════════════════════════╗\n` +
                `║  🏘️  *PILIH GRUP*  ║\n` +
                `╚══════════════════════════╝\n\n` +
                `Fitur: *${namFitur}*\n` +
                `Aktif di *${activeJids.length}* grup\n\n` +
                `Pilih grup yang ingin di-nonaktifkan,\natau pilih *Off Semua Grup* untuk sekaligus.\n\n` +
                `┌─────────────────────────────┐\n` +
                `│  🟢 *Grup Aktif*\n` +
                `└─────────────────────────────┘\n` +
                grupRows.map(r => `  🏘️  *${r.header.replace('🏘️ ', '')}*\n     _↳ ${r.title} · ${r.description}_`).join('\n') + '\n\n' +
                `_Gunakan tombol di bawah untuk memilih_`;

        const replyCtx = m.key?.id ? {
                stanzaId: m.key.id,
                participant: m.sender || m.key?.participant || '',
                quotedMessage: m.message || {},
        } : {};

        let botPpMedia = {};
        try {
                const botJid = hisoka.user?.id;
                if (botJid) {
                        const ppUrl = await hisoka.profilePictureUrl(botJid, 'image');
                        if (ppUrl) {
                                botPpMedia = await prepareWAMessageMedia(
                                        { image: { url: ppUrl } },
                                        { upload: hisoka.waUploadToServer }
                                );
                        }
                }
        } catch (_) {}

        const hasPp = Object.keys(botPpMedia).length > 0;
        const selMsg = generateWAMessageFromContent(
                m.from,
                {
                        viewOnceMessage: {
                                message: {
                                        messageContextInfo: { deviceListMetadata: {}, deviceListMetadataVersion: 2 },
                                        interactiveMessage: {
                                                contextInfo: replyCtx,
                                                ...(hasPp ? { header: { hasMediaAttachment: true, ...botPpMedia } } : {}),
                                                body: { text: txt },
                                                nativeFlowMessage: {
                                                        buttons: [
                                                                {
                                                                        name: 'single_select',
                                                                        buttonParamsJson: JSON.stringify({ title: '🏘️ Pilih Grup', sections })
                                                                },
                                                                {
                                                                        name: 'quick_reply',
                                                                        buttonParamsJson: JSON.stringify({ display_text: '🏘️ Lihat Fitur GC', id: '__cekauto_gc__' })
                                                                }
                                                        ]
                                                }
                                        }
                                }
                        }
                },
                {},
                {}
        );
        await hisoka.relayMessage(selMsg.key.remoteJid, selMsg.message, { messageId: selMsg.key.id });
}

async function sendCekautoGrupMsg(hisoka, m) {
        if (!m.isGroup) return m.reply('❌ Perintah ini hanya bisa digunakan di dalam grup!');
        const cfg = loadConfig();
        const jid = m.from;

        const totalAktif = CEKAUTO_GROUP_FITUR_LIST.filter(f => f.checkFn(cfg, jid)).length;
        const totalMati  = CEKAUTO_GROUP_FITUR_LIST.length - totalAktif;

        const allGrupFitur = CEKAUTO_GROUP_FITUR_LIST;
        const aktifGrup   = allGrupFitur.filter(f => f.checkFn(cfg, jid));
        const nonaktifGrup = allGrupFitur.filter(f => !f.checkFn(cfg, jid));
        aktifGrup.sort((a, b) => a.nama.localeCompare(b.nama));
        nonaktifGrup.sort((a, b) => a.nama.localeCompare(b.nama));

        let txt =
                `╔══════════════════════════╗\n` +
                `║  🏘️  *FITUR GRUP*  ║\n` +
                `╚══════════════════════════╝\n\n` +
                `┌─────────────────────────────┐\n` +
                `│  ✅ *AKTIF*  ·  ${totalAktif} fitur aktif\n` +
                `└─────────────────────────────┘\n` +
                (aktifGrup.length
                        ? aktifGrup.map(f => `  🟢  *${f.nama}*`).join('\n') + '\n'
                        : `  _Tidak ada fitur yang aktif_\n`) +
                `\n┌─────────────────────────────┐\n` +
                `│  ❌ *NONAKTIF*  ·  ${totalMati} fitur mati\n` +
                `└─────────────────────────────┘\n` +
                (nonaktifGrup.length
                        ? nonaktifGrup.map(f => `  🔴  *${f.nama}*`).join('\n') + '\n'
                        : `  _Semua fitur aktif_ ✨\n`) +
                `\n╔══════════════════════════╗\n` +
                `║  📦 *Total* : ${CEKAUTO_GROUP_FITUR_LIST.length} fitur terdaftar\n` +
                `╚══════════════════════════╝\n\n` +
                `┌─────────────────────────────┐\n` +
                `│  📋 *DAFTAR PERINTAH*\n` +
                `└─────────────────────────────┘\n` +
                [...CEKAUTO_GROUP_FITUR_LIST]
                        .sort((a, b) => a.nama.localeCompare(b.nama))
                        .map(f => `  • *${f.nama}* → \`${f.cmd}\``)
                        .join('\n');

        await m.reply(txt);
}

async function sendCekautoMsg(hisoka, m) {
        const cfg = loadConfig();
        const aktif = [];
        const nonaktif = [];

        for (const f of CEKAUTO_FITUR_LIST) {
                const val = cfg[f.key];
                let isOn = false;
                if (f.checkFn) {
                        isOn = f.checkFn(cfg);
                } else if (f.type === 'global') {
                        isOn = val?.enabled === true;
                } else {
                        const groups = val?.groups || {};
                        isOn = Object.values(groups).some(g => g?.enabled === true);
                }
                (isOn ? aktif : nonaktif).push({ nama: f.nama, cmd: f.cmd, key: f.key });
        }

        aktif.sort((a, b) => a.nama.localeCompare(b.nama));
        nonaktif.sort((a, b) => a.nama.localeCompare(b.nama));

        let txt =
                `╔══════════════════════════╗\n` +
                `║  ⚙️  *AUTO FITUR BOT*  ║\n` +
                `╚══════════════════════════╝\n\n`;
        txt += `┌─────────────────────────────┐\n`;
        txt += `│  ✅ *AKTIF*  ·  ${aktif.length} fitur aktif\n`;
        txt += `└─────────────────────────────┘\n`;
        txt += aktif.length
                ? aktif.map(f => `  🟢  *${f.nama}*`).join('\n') + '\n'
                : `  _Tidak ada fitur yang aktif_\n`;
        txt += `\n┌─────────────────────────────┐\n`;
        txt += `│  ❌ *NONAKTIF*  ·  ${nonaktif.length} fitur mati\n`;
        txt += `└─────────────────────────────┘\n`;
        txt += nonaktif.length
                ? nonaktif.map(f => `  🔴  *${f.nama}*`).join('\n') + '\n'
                : `  _Semua fitur aktif_ ✨\n`;
        txt += `\n╔══════════════════════════╗\n`;
        txt += `║  📦 *Total* : ${CEKAUTO_FITUR_LIST.length} fitur terdaftar\n`;
        txt += `╚══════════════════════════╝\n\n`;
        txt += `┌─────────────────────────────┐\n`;
        txt += `│  📋 *DAFTAR PERINTAH*\n`;
        txt += `└─────────────────────────────┘\n`;
        txt += [...CEKAUTO_FITUR_LIST]
                .sort((a, b) => a.nama.localeCompare(b.nama))
                .map(f => `  • *${f.nama}* → \`${f.cmd}\``)
                .join('\n');

        await m.reply(txt);
}

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
                                if (!m.isOwner) return;
                                if (!m.isGroup) return;

                                if (!query) return tolak(hisoka, m,
                                        '❌ *Wajib isi teks/caption!*\n\n' +
                                        '📌 *Cara pakai:*\n' +
                                        '• `.hidetag Halo semua!`\n' +
                                        '• Kirim gambar/video dengan caption `.hidetag Teks kamu`\n' +
                                        '• Quote gambar/video lalu ketik `.hidetag Teks kamu`'
                                );

                                const group = hisoka.groups.read(m.from);
                                if (!group) return tolak(hisoka, m, '❌ Data grup tidak ditemukan.');

                                const participants = (group.participants || [])
                                        .map(v => v.phoneNumber || v.id)
                                        .filter(Boolean);

                                if (!participants.length) return tolak(hisoka, m, '❌ Tidak ada member yang ditemukan.');

                                const htMediaTypes = ['imageMessage', 'videoMessage', 'audioMessage', 'documentMessage'];

                                let htBuffer = null;
                                let htMediaType = null;

                                if (m.isMedia && htMediaTypes.includes(m.type)) {
                                        try { htBuffer = await m.downloadMedia(); htMediaType = m.type; } catch (_) {}
                                } else if (m.isQuoted && m.quoted?.isMedia && htMediaTypes.includes(m.quoted?.type)) {
                                        try { htBuffer = await getQuotedMediaBuffer(hisoka, m); htMediaType = m.quoted.type; } catch (_) {}
                                }

                                let htPayload;
                                if (htBuffer && htBuffer.length > 0 && htMediaType) {
                                        if (htMediaType === 'imageMessage') {
                                                htPayload = { image: htBuffer, caption: query, mentions: participants };
                                        } else if (htMediaType === 'videoMessage') {
                                                htPayload = { video: htBuffer, caption: query, mentions: participants };
                                        } else if (htMediaType === 'audioMessage') {
                                                htPayload = { audio: htBuffer, mentions: participants, mimetype: 'audio/mp4' };
                                        } else {
                                                htPayload = { document: htBuffer, caption: query, mentions: participants, mimetype: 'application/octet-stream' };
                                        }
                                } else {
                                        htPayload = { text: query, mentions: participants };
                                }

                                await hisoka.sendMessage(m.from, htPayload, { quoted: m });

                                logCommand(m, hisoka, 'hidetag');
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
                                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa pakai perintah ini.');

                                if (!query || !query.includes('|')) return tolak(hisoka, m,
                                        '❌ *Format salah!*\n\n' +
                                        '📌 *Cara pakai (teks):*\n' +
                                        '`.pushkontakgc <JID> | <pesan> | <delay>`\n\n' +
                                        '🖼️ *Cara pakai (gambar/video):*\n' +
                                        '_Kirim/reply gambar dengan caption:_\n' +
                                        '`.pushkontakgc <JID> | <caption> | <delay>`\n' +
                                        '_Caption boleh kosong jika tidak perlu_\n\n' +
                                        '📝 *Contoh teks:*\n' +
                                        '`.pushkontakgc 120363192554714254@g.us | Halo kak! | 5`\n\n' +
                                        '⏱ *Delay:* pilih 3–10 detik\n\n' +
                                        '↩️ *Garis baru dalam pesan:*\n' +
                                        '• `\\n` = 1 baris kosong\n' +
                                        '_Contoh:_ `.pushkontakgc 120363192554714254@g.us | Halo kak!\\nLagi apa nih? | 5`\n\n' +
                                        '• `\\n\\n` = 2 baris kosong\n' +
                                        '_Contoh:_ `.pushkontakgc 120363192554714254@g.us | Halo kak!\\n\\nLagi apa nih? | 5`\n\n' +
                                        '💡 *Bisa dipakai dari mana saja:*\n' +
                                        '• Di dalam grup target langsung\n' +
                                        '• Di grup lain (asal JID target benar)\n' +
                                        '• Di chat private bot\n\n' +
                                        '🔍 *Belum tahu JID grupnya?*\n' +
                                        '• Ketik `.cekjidgc` — di dalam grup untuk lihat JID grup tersebut\n' +
                                        '• Ketik `.cekjidgcall` — untuk lihat semua JID grup yang diikuti bot'
                                );

                                const pkgParts = query.split('|');
                                const pkgTargetGid = pkgParts[0].trim();
                                const pkgPesan = (pkgParts[1] || '').trim();
                                const pkgDelayInput = parseInt((pkgParts[2] || '').trim());
                                const pkgDelay = (!isNaN(pkgDelayInput) && pkgDelayInput >= 3 && pkgDelayInput <= 10) ? pkgDelayInput : null;

                                // Deteksi media — dari pesan langsung atau reply
                                const pkgMediaTypes = ['imageMessage', 'videoMessage'];
                                let pkgMediaBuffer = null;
                                let pkgMediaType = null;

                                if (m.isMedia && pkgMediaTypes.includes(m.type)) {
                                        try { pkgMediaBuffer = await m.downloadMedia(); pkgMediaType = m.type; } catch (_) {}
                                } else if (m.isQuoted && m.quoted?.isMedia && pkgMediaTypes.includes(m.quoted?.type)) {
                                        try { pkgMediaBuffer = await getQuotedMediaBuffer(hisoka, m); pkgMediaType = m.quoted.type; } catch (_) {}
                                }

                                const pkgAdaMedia = !!(pkgMediaBuffer && pkgMediaBuffer.length > 0);

                                if (!pkgTargetGid || !pkgTargetGid.endsWith('@g.us')) return tolak(hisoka, m,
                                        '❌ *JID grup tidak valid!*\n\n' +
                                        '_Contoh format yang benar:_\n`120363192554714254@g.us`\n\n' +
                                        '🔍 *Cara cari JID:*\n' +
                                        '• `.cekjidgc` — ketik di dalam grup yang dituju\n' +
                                        '• `.cekjidgcall` — tampilkan semua JID grup bot sekaligus'
                                );
                                if (!pkgAdaMedia && !pkgPesan) return tolak(hisoka, m, '❌ Pesan tidak boleh kosong.');
                                if (pkgParts.length < 3 || pkgDelay === null) return tolak(hisoka, m,
                                        '❌ *Delay tidak valid!*\n\n⏱ Masukkan delay antara *3–10 detik*\n\n📝 *Contoh:*\n`.pushkontakgc 120363192554714254@g.us | Halo kak! | 5`'
                                );

                                const { pushKontakGC } = _require(path.resolve('./src/scrape/tools/pushkontakgc.cjs'));

                                try {
                                        let pkgProgMsg = null;
                                        await pushKontakGC(hisoka, {
                                                targetGid: pkgTargetGid,
                                                pesanKirim: pkgPesan,
                                                delayDetik: pkgDelay,
                                                mediaBuffer: pkgMediaBuffer,
                                                mediaType: pkgMediaType,
                                                onStart: async ({ namaGrup, total, modeMedia, mediaType: mt }) => {
                                                        pkgProgMsg = await m.reply(
                                                                `⏳ *Push Kontak GC dimulai...*\n\n` +
                                                                `👥 *Grup :* ${namaGrup}\n` +
                                                                `📋 *Total :* ${total} orang\n` +
                                                                `📤 *Mode :* ${modeMedia ? (mt === 'imageMessage' ? '🖼️ Gambar' : '🎥 Video') : '💬 Teks'}\n` +
                                                                `⏱ *Delay :* ${pkgDelay} detik/pesan\n\n` +
                                                                `_Sedang mengirim ke semua member..._`
                                                        );
                                                },
                                                onProgress: async ({ sent, total, berhasil, gagal, namaGrup: ng, modeMedia: mm }) => {
                                                        if (!pkgProgMsg?.key) return;
                                                        const filled = Math.round((sent / total) * 10);
                                                        const bar = '[' + '█'.repeat(filled) + '░'.repeat(10 - filled) + ']';
                                                        const pct = Math.round((sent / total) * 100);
                                                        try {
                                                                await m.reply({
                                                                        edit: pkgProgMsg.key,
                                                                        text:
                                                                                `📤 *Push Kontak GC — Mengirim...*\n\n` +
                                                                                `👥 *Grup :* ${ng}\n` +
                                                                                `📊 *Progress :* ${bar} ${pct}%\n` +
                                                                                `📬 *Terkirim :* ${sent}/${total} orang\n` +
                                                                                `✔️ *Berhasil :* ${berhasil} | ❌ *Gagal :* ${gagal}\n` +
                                                                                `📤 *Mode :* ${mm ? '🖼️ Media' : '💬 Teks'}\n\n` +
                                                                                `_Harap tunggu..._`
                                                                });
                                                        } catch (_) {}
                                                },
                                                onDone: async ({ namaGrup, berhasil, gagal, delayDetik: dd, modeMedia }) => {
                                                        const doneText =
                                                                `✅ *Push Kontak GC selesai!*\n\n` +
                                                                `👥 *Grup :* ${namaGrup}\n` +
                                                                `📤 *Mode :* ${modeMedia ? '🖼️ Media' : '💬 Teks'}\n` +
                                                                `⏱ *Delay :* ${dd} detik/pesan\n` +
                                                                `✔️ *Berhasil :* ${berhasil} orang\n` +
                                                                `❌ *Gagal :* ${gagal} orang`;
                                                        if (pkgProgMsg?.key) {
                                                                await m.reply({ edit: pkgProgMsg.key, text: doneText });
                                                        } else {
                                                                await m.reply(doneText);
                                                        }
                                                }
                                        });
                                } catch (err) {
                                        if (err.message === 'EMPTY_MEMBER') return tolak(hisoka, m, '❌ Tidak ada member yang ditemukan di grup tersebut.');
                                        return tolak(hisoka, m, '❌ Gagal ambil data grup. Pastikan bot ada di dalam grup tersebut.');
                                }

                                logCommand(m, hisoka, 'pushkontakgc');
                                break;
                        }

                        case 'clearsesi':
                        case 'cs': {
                                // Izinkan: owner ATAU userjadibot (pemilik sesi jadibot ini)
                                const _csIsJadibot = hisoka?.isMainBot === false;
                                if (!m.isOwner && !_csIsJadibot) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner!');

                                // Pilih fungsi clearCache yang tepat: main bot pakai global, jadibot pakai Map
                                const isJadibotCtx = _csIsJadibot;
                                const jadibotNumCtx = isJadibotCtx ? getJadibotNumber(hisoka) : null;
                                const clearFn = isJadibotCtx
                                        ? jadibotClearSesiMap.get(jadibotNumCtx)
                                        : global.__clearSesiInPlace;

                                if (!clearFn) {
                                        return tolak(hisoka, m, '❌ Fungsi clearSesi tidak tersedia. Coba restart bot terlebih dahulu.');
                                }

                                const sessionLabel = isJadibotCtx
                                        ? `jadibot/${jadibotNumCtx}.json`
                                        : `sessions/hisoka.json`;

                                const fmtMBCS = (b) => (b / 1024 / 1024).toFixed(2) + ' MB';

                                const ICONS = {
                                        'contacts':               '👥',
                                        'groups':                 '👨‍👩‍👦',
                                        'lid-mapping':            '🗺️',
                                        'sender-key':             '🔑',
                                        'app-state-sync-version': '🔄',
                                        'tctoken':                '🎫',
                                        'pre-key (trim)':         '🗝️',
                                };

                                // Pesan awal
                                const csProgMsg = await m.reply(
                                        `🧹 *Clear Sesi — Memulai...*\n\n` +
                                        `📂 *File :* ${sessionLabel}\n` +
                                        `🔍 *Memeriksa dan membersihkan cache...*\n\n` +
                                        `_Harap tunggu..._`
                                );

                                try {
                                        const result = await clearFn(async ({ steps, totalSaved, beforeSize }) => {
                                                if (!csProgMsg?.key) return;

                                                const lines = steps.map(s => {
                                                        const icon = ICONS[s.name] || '📦';
                                                        const kb   = (s.savedBytes / 1024).toFixed(1);
                                                        return `  ${icon} *${s.name}* — ${s.label} (hemat ${kb} KB)`;
                                                }).join('\n');

                                                const pctSaved = Math.min(100, Math.round((totalSaved / beforeSize) * 100));
                                                const bar = '[' + '█'.repeat(Math.round(pctSaved / 10)) + '░'.repeat(10 - Math.round(pctSaved / 10)) + ']';

                                                try {
                                                        await m.reply({
                                                                edit: csProgMsg.key,
                                                                text:
                                                                        `🧹 *Clear Sesi — Sedang berjalan...*\n\n` +
                                                                        `📊 *Progress :* ${bar} ${pctSaved}%\n` +
                                                                        `💾 *Hemat :* ${fmtMBCS(totalSaved)}\n\n` +
                                                                        `*Langkah selesai:*\n` +
                                                                        `${lines}\n\n` +
                                                                        `_Harap tunggu..._`
                                                        });
                                                } catch (_) {}
                                        });

                                        const linesDone = result.steps.map(s => {
                                                const icon = ICONS[s.name] || '📦';
                                                const kb   = (s.savedBytes / 1024).toFixed(1);
                                                return `  ${icon} *${s.name}* — ${s.label} (${kb} KB)`;
                                        }).join('\n');

                                        const doneText =
                                                `✅ *Clear Sesi selesai!*\n\n` +
                                                `📂 *File :* ${sessionLabel}\n` +
                                                `📉 *Sebelum :* ${result.fmtBefore}\n` +
                                                `📈 *Sesudah :* ${result.fmtAfter}\n` +
                                                `💾 *Total hemat :* ${result.fmtSaved}\n\n` +
                                                `*Detail yang dibersihkan:*\n` +
                                                `${linesDone}\n\n` +
                                                `_Bot tetap aktif, tidak perlu pairing ulang_ ✔️`;

                                        if (csProgMsg?.key) {
                                                await m.reply({ edit: csProgMsg.key, text: doneText });
                                        } else {
                                                await m.reply(doneText);
                                        }
                                } catch (err) {
                                        return tolak(hisoka, m, `❌ Gagal clear sesi: ${err.message}`);
                                }

                                logCommand(m, hisoka, 'clearsesi');
                                break;
                        }

                        case 'cekjidgc':
                        case 'jidgc':
                        case 'infogc': {
                                if (!m.isGroup) return tolak(hisoka, m, '❌ Perintah ini hanya bisa dipakai di dalam grup!');

                                let cjgMeta;
                                try {
                                        const { getGCInfo } = _require(path.resolve('./src/scrape/tools/cekjidgc.cjs'));
                                        cjgMeta = await getGCInfo(hisoka, m.from);
                                } catch (err) {
                                        return tolak(hisoka, m, '❌ Gagal ambil info grup: ' + (err.message || 'Unknown error'));
                                }

                                const { teks, jidGrup } = cjgMeta;

                                await new Button()
                                        .setTitle('🏠 Info Grup')
                                        .setBody(teks)
                                        .setFooter('Tap tombol di bawah untuk copy JID')
                                        .addCopy('📋 Copy JID Grup', jidGrup, 'copy_jidgc')
                                        .run(m.from, hisoka, m);

                                logCommand(m, hisoka, 'cekjidgc');
                                break;
                        }

                        case 'cekjidgcall':
                        case 'jidgcall':
                        case 'listjidgc':
                        case 'alljidgc': {
                                if (!m.isOwner) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner bot.');

                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

                                let cjgaResult;
                                try {
                                        const { getAllGCInfo } = _require(path.resolve('./src/scrape/tools/cekjidgcall.cjs'));
                                        cjgaResult = await getAllGCInfo(hisoka);
                                } catch (err) {
                                        if (err.message === 'BOT_NOT_IN_ANY_GROUP') return tolak(hisoka, m, '❌ Bot tidak tergabung di grup manapun saat ini.');
                                        return tolak(hisoka, m, '❌ Gagal fetch daftar grup: ' + (err.message || 'Unknown error'));
                                }

                                const { groups, total } = cjgaResult;

                                // Susun isi body + kumpulkan semua JID untuk 1 tombol copy
                                const SEP = '─────────────────────────────';
                                let bodyText = `╭══ 🏠 *SEMUA JID GRUP BOT* ══╮\n│ 📊 Total: *${total} grup* | Urutan: member terbanyak\n╰══════════════════════════╯\n\n`;
                                const copyLines = [];

                                for (let i = 0; i < groups.length; i++) {
                                        const { nama, jid, count } = groups[i];
                                        bodyText += `*${i + 1}. ${nama}*\n🆔 \`${jid}\`\n👥 ${count} member\n${SEP}\n`;
                                        copyLines.push(`${i + 1}. ${nama}\n🆔 ${jid}\n👥 ${count} member\n${SEP}`);
                                }

                                const copyCode = copyLines.join('\n');

                                await new Button()
                                        .setTitle('🏠 Semua JID Grup Bot')
                                        .setBody(bodyText.trimEnd())
                                        .setFooter(`Total ${total} grup • Tap tombol untuk copy semua JID`)
                                        .addCopy('📋 Copy Semua JID', copyCode, 'copy_all_jidgc')
                                        .run(m.from, hisoka, m);

                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                logCommand(m, hisoka, 'cekjidgcall');
                                break;
                        }

                        case 'memori':
                        case 'memory':
                        case 'mymemory':
                        case 'myprofile': {
                                if (!m.prefix && m.query) break;
                                const mem = loadUserMemory(m.sender);
                                await m.reply(memoryToReadable(mem));
                                logCommand(m, hisoka, 'memori');
                                break;
                        }

                        case 'lupakanaku':
                        case 'resetmemori':
                        case 'resetmemory':
                        case 'forgetme': {
                                if (!m.prefix && m.query) break;
                                clearUserMemory(m.sender);
                                await m.reply('> *🧠 Memori AI tentang kamu sudah dihapus*\n\n_AI bakal mulai pelan-pelan kenal kamu lagi dari awal._');
                                logCommand(m, hisoka, 'lupakanaku');
                                break;
                        }

                        case 'q':
                        case 'quoted': {
                                if (!m.prefix && m.query) break;
                                if (!m.isQuoted) {
                                        await tolak(hisoka, m, 'No quoted message found.');
                                        return;
                                }

                                const message = hisoka.cacheMsg.get(m.quoted.key.id);
                                if (!message) {
                                        await tolak(hisoka, m, 'Quoted message not found.');
                                        return;
                                }

                                const IMessage = await injectMessage(hisoka, message);
                                if (!IMessage.isQuoted) {
                                        await tolak(hisoka, m, 'Quoted message not found.');
                                        return;
                                }

                                await m.reply({ forward: IMessage.quoted });
                                logCommand(m, hisoka, 'quoted');
                                break;
                        }

                                case 'ping':
                                case 'p': {
                                if (!m.prefix && m.query) break;
                                try {
                                        const msg = await tolak(hisoka, m, '⏳ _Checking..._');
                                        const latency = Math.abs(Date.now() - m.messageTimestamp * 1000);
                                        const stats = getBotStats();
                                        const sessionUptime = process.uptime();
                                        
                                        const memUsage = process.memoryUsage();
                                        const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
                                        const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
                                        
                                        const now = new Date();
                                        const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                        const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
                                        
                                        const jakartaHour = parseInt(now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }));
                                        let greetingTime, greetingEmoji;
                                        if (jakartaHour >= 4 && jakartaHour < 11) {
                                                greetingTime = 'Pagi';
                                                greetingEmoji = '🌅';
                                        } else if (jakartaHour >= 11 && jakartaHour < 15) {
                                                greetingTime = 'Siang';
                                                greetingEmoji = '☀️';
                                        } else if (jakartaHour >= 15 && jakartaHour < 18) {
                                                greetingTime = 'Sore';
                                                greetingEmoji = '🌇';
                                        } else {
                                                greetingTime = 'Malam';
                                                greetingEmoji = '🌙';
                                        }
                                        
                                        const speedText = latency < 100 ? 'Cepat' : latency < 500 ? 'Normal' : 'Lambat';
                                        const speedEmoji = latency < 100 ? '🚀' : latency < 500 ? '⚡' : '🐢';
                                        
                                        const sessSeconds = Math.floor(sessionUptime);
                                        const sessMinutes = Math.floor(sessSeconds / 60);
                                        const sessHours = Math.floor(sessMinutes / 60);
                                        const sessDays = Math.floor(sessHours / 24);
                                        const sessFormatted = `${sessDays}d ${sessHours % 24}h ${sessMinutes % 60}m`;
                                        
                                        const cpuCores = os.cpus().length;
                                        const cpuModel = os.cpus()[0]?.model?.split(' ')[0] || 'Unknown';
                                        const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
                                        const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
                                        const usedMemGB = (totalMemGB - freeMemGB).toFixed(1);
                                        const memPercent = ((usedMemGB / totalMemGB) * 100).toFixed(0);
                                        const nodeVersion = process.version;
                                        const platform = process.platform;
                                        
                                        const pingText = `
╭═════════════════════╮
║        🏓 *PONG!* 🏓        
├═════════════════════┤
│ 👋 Selamat  » ${greetingTime} ${greetingEmoji}
│ ${speedEmoji} Speed  » ${speedText}
│ ⚡ Latency  » ${latency}ms
│ 🕐 Waktu  » ${timeStr}
│ 📅 Tanggal  » ${dateStr}
├═════════════════════┤
║        📊 *BOT STATUS*        
├═════════════════════┤
│ ⏱️ Uptime  » ${stats.uptime.days}d ${stats.uptime.hours}h ${stats.uptime.minutes}m
│ 🔄 Session  » ${sessFormatted}
│ 🔁 Restart  » ${stats.totalRestarts}x
│ 🟢 Status  » Online
├═════════════════════┤
║        💻 *SYSTEM INFO*        
├═════════════════════┤
│ 🧠 CPU  » ${cpuCores} Core
│ 📟 RAM  » ${usedMemGB}/${totalMemGB}GB (${memPercent}%)
│ 💾 Bot Mem  » ${memUsedMB}MB
│ 🖥️ Platform  » ${platform}
│ 📦 NodeJS  » ${nodeVersion}
╰═════════════════════╯`;

                                        let ppUrl;
                                        try {
                                                ppUrl = await hisoka.profilePictureUrl(hisoka.user.id, 'image');
                                        } catch {
                                                ppUrl = null;
                                        }

                                        if (ppUrl) {
                                                await hisoka.sendMessage(m.from, {
                                                        image: { url: ppUrl },
                                                        caption: pingText
                                                }, { quoted: m });
                                        } else {
                                                await m.reply({ edit: msg.key, text: pingText });
                                        }
                                        
                                        logCommand(m, hisoka, 'ping');
                                } catch (err) {
                                        console.error('\x1b[31mPing error:\x1b[39m', err.message);
                                }
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
                                if (!m.isOwner) return;
                                let result;
                                try {
                                        const code = query || text;
                                        if (!code || !code.trim()) {
                                                await tolak(hisoka, m, '❌ Masukkan kode yang ingin di-eval.');
                                                break;
                                        }
                                        if (/await/i.test(code)) {
                                                result = await Promise.resolve(eval('(async() => { ' + code + ' })()')).catch(e => e);
                                        } else {
                                                try { result = eval(code); } catch (e) { result = e; }
                                        }
                                } catch (error) {
                                        result = error;
                                }

                                const evalOut = result instanceof Error
                                        ? `❌ *${result.name}:* ${result.message}`
                                        : util.format(result);
                                await tolak(hisoka, m, evalOut);
                                logCommand(m, hisoka, 'eval');
                                break;
                        }

                        case '$':
                        case 'bash': {
                                try {
                                        exec(query, (error, stdout, stderr) => {
                                                if (error) {
                                                        return m.throw(util.format(error));
                                                }
                                                if (stderr) {
                                                        return m.throw(stderr);
                                                }
                                                if (stdout) {
                                                        return tolak(hisoka, m, stdout);
                                                }
                                                return m.throw('Command executed successfully, but no output.');
                                        });
                                        logCommand(m, hisoka, 'bash');
                                } catch (error) {
                                        await tolak(hisoka, m, util.format(error));
                                        return;
                                }
                                break;
                        }

                        case 'mati':
                        case 'shutdown':
                        case 'matiin': {
                                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mematikan bot!');
                                if (!m.prefix && m.query) break;
                                const { shutdownBot } = _require(path.resolve('./src/scrape/system/shutdown.cjs'));
                                await hisoka.sendMessage(m.from, {
                                        text:
                                                `╔══════════════════════╗\n` +
                                                `║  ⛔  *B O T  M A T I*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `🔴 Bot akan dimatikan sekarang!\n\n` +
                                                `⚙️ Dimatikan oleh: @${m.sender.split('@')[0]}\n` +
                                                `🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                                                `ℹ️ Untuk menjalankan bot kembali,\n` +
                                                `jalankan ulang dari Replit.`,
                                        mentions: [m.sender]
                                }, { quoted: m });
                                logCommand(m, hisoka, 'mati');
                                shutdownBot(2000);
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
                                try {
                                        const Tmail = _require(path.resolve('./src/scrape/tools/tmail.cjs'));
                                        const fs = _require('fs');
                                        const TMAIL_DB = path.resolve('./data/tmail/db.json');
                                        if (!global.__tmailSessions) global.__tmailSessions = new Map();
                                        const sessions = global.__tmailSessions;
                                        const userId = m.sender || m.from;
                                        const pfx = m.prefix || '.';
                                        const input = (query || '').trim();

                                        // Persistent storage helpers — biar email user gak ganti tiap restart
                                        const loadDB = () => {
                                                try {
                                                        if (!fs.existsSync(path.dirname(TMAIL_DB))) fs.mkdirSync(path.dirname(TMAIL_DB), { recursive: true });
                                                        if (!fs.existsSync(TMAIL_DB)) return {};
                                                        return JSON.parse(fs.readFileSync(TMAIL_DB, 'utf8') || '{}');
                                                } catch (_) { return {}; }
                                        };
                                        const saveDB = (db) => {
                                                try {
                                                        if (!fs.existsSync(path.dirname(TMAIL_DB))) fs.mkdirSync(path.dirname(TMAIL_DB), { recursive: true });
                                                        fs.writeFileSync(TMAIL_DB, JSON.stringify(db, null, 2));
                                                } catch (_) {}
                                        };
                                        const persistSess = (s) => {
                                                if (!s || !s.mailbox || typeof s.serialize !== 'function') return;
                                                const db = loadDB();
                                                db[userId] = s.serialize();
                                                saveDB(db);
                                        };
                                        const removeSess = () => {
                                                const db = loadDB();
                                                if (db[userId]) { delete db[userId]; saveDB(db); }
                                                sessions.delete(userId);
                                        };

                                        // ===== Arsip permanen email yang pernah masuk =====
                                        // Disimpan terpisah dari sess. Walau user .tmdel, arsip TIDAK terhapus.
                                        const TMAIL_ARCHIVE = path.resolve('./data/tmail/archive.json');
                                        const ARCHIVE_MAX_PER_USER = 50;
                                        const loadArchive = () => {
                                                try {
                                                        if (!fs.existsSync(path.dirname(TMAIL_ARCHIVE))) fs.mkdirSync(path.dirname(TMAIL_ARCHIVE), { recursive: true });
                                                        if (!fs.existsSync(TMAIL_ARCHIVE)) return {};
                                                        return JSON.parse(fs.readFileSync(TMAIL_ARCHIVE, 'utf8') || '{}');
                                                } catch (_) { return {}; }
                                        };
                                        const saveArchive = (db) => {
                                                try {
                                                        if (!fs.existsSync(path.dirname(TMAIL_ARCHIVE))) fs.mkdirSync(path.dirname(TMAIL_ARCHIVE), { recursive: true });
                                                        fs.writeFileSync(TMAIL_ARCHIVE, JSON.stringify(db, null, 2));
                                                } catch (_) {}
                                        };
                                        const archiveEmail = (mailbox, msg) => {
                                                if (!msg || (!msg.id && !msg.subject)) return;
                                                const db = loadArchive();
                                                if (!Array.isArray(db[userId])) db[userId] = [];
                                                const arr = db[userId];
                                                // Dedupe pakai komposit (mailbox + id)
                                                const key = `${mailbox || ''}::${msg.id || msg.subject}`;
                                                if (arr.some((e) => `${e.mailbox || ''}::${e.id || e.subject}` === key)) return;
                                                arr.unshift({
                                                        id: msg.id || null,
                                                        mailbox: mailbox || null,
                                                        from: msg.from || null,
                                                        to: msg.to || null,
                                                        subject: msg.subject || null,
                                                        date: msg.date || null,
                                                        bodyText: msg.bodyText || null,
                                                        bodyHtml: msg.bodyHtml || null,
                                                        links: Array.isArray(msg.links) ? msg.links : [],
                                                        ai: msg.ai || null,
                                                        archivedAt: Date.now(),
                                                });
                                                if (arr.length > ARCHIVE_MAX_PER_USER) arr.length = ARCHIVE_MAX_PER_USER;
                                                db[userId] = arr;
                                                saveArchive(db);
                                        };
                                        const getArchive = () => {
                                                const db = loadArchive();
                                                return Array.isArray(db[userId]) ? db[userId] : [];
                                        };

                                        // Load session: dari memory dulu, kalo gak ada / instance lama (gak punya method baru) baru dari disk
                                        const getSess = () => {
                                                let s = sessions.get(userId);
                                                if (!s || typeof s.serialize !== 'function' || typeof s.restore !== 'function') {
                                                        s = new Tmail();
                                                        const db = loadDB();
                                                        if (db[userId]) s.restore(db[userId]);
                                                        sessions.set(userId, s);
                                                }
                                                return s;
                                        };

                                        // PAKSA server tmail untuk re-bind ke email yang tersimpan.
                                        // Ini fix bug: tanpa ini, server bisa kasih email random baru karena cookies expire.
                                        const ensureBound = async (s) => {
                                                if (!s || !s.mailbox) return null;
                                                const at = s.mailbox.indexOf('@');
                                                if (at <= 0) return null;
                                                const name = s.mailbox.slice(0, at);
                                                const domain = s.mailbox.slice(at + 1);
                                                try {
                                                        const data = await s.change(name, domain);
                                                        // Kalau server tetap return email lain, paksa balik ke milik user
                                                        if (data && data.mailbox && data.mailbox !== `${name}@${domain}`) {
                                                                data.mailbox = `${name}@${domain}`;
                                                        }
                                                        s.mailbox = `${name}@${domain}`;
                                                        return data;
                                                } catch (_) {
                                                        return null;
                                                }
                                        };

                                        const sub = String(m.command || '').toLowerCase();

                                        // Helper: bangun panel interaktif tempmail (dipakai .tempmail & .tmdel)
                                        const buildTmailButtons = (mailbox) => ([
                                                {
                                                        name: 'cta_copy',
                                                        buttonParamsJson: JSON.stringify({
                                                                display_text: '📋 Salin Email',
                                                                copy_code: mailbox,
                                                        }),
                                                },
                                                {
                                                        name: 'quick_reply',
                                                        buttonParamsJson: JSON.stringify({
                                                                display_text: '⏳ Tunggu Realtime',
                                                                id: `${pfx}tmwait`,
                                                        }),
                                                },
                                                {
                                                        name: 'quick_reply',
                                                        buttonParamsJson: JSON.stringify({
                                                                display_text: '📥 Cek Inbox',
                                                                id: `${pfx}tminbox`,
                                                        }),
                                                },
                                                {
                                                        name: 'quick_reply',
                                                        buttonParamsJson: JSON.stringify({
                                                                display_text: '🗑️ Hapus & Ganti',
                                                                id: `${pfx}tmdel`,
                                                        }),
                                                },
                                        ]);

                                        // Helper: kirim panel interaktif sebagai REPLY/quote ke pesan user
                                        const sendTmailPanel = async (title, mailbox) => {
                                                const buttons = buildTmailButtons(mailbox);
                                                let sent = false;
                                                try {
                                                        await m.reply({
                                                                interactiveMessage: {
                                                                        contextInfo: {
                                                                                stanzaId: m.key.id,
                                                                                participant: m.sender,
                                                                                quotedMessage: m.message,
                                                                        },
                                                                        title,
                                                                        footer: `📨 Tempmail · ${mailbox}`,
                                                                        buttons,
                                                                },
                                                        });
                                                        sent = true;
                                                } catch (_) {}
                                                if (!sent) await tolak(hisoka, m, title);
                                        };

                                        // .tmdel — hapus email tersimpan & generate baru
                                        if (sub === 'tmdel') {
                                                await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
                                                const old = (loadDB()[userId] || {}).mailbox || '-';
                                                removeSess();
                                                const s = new Tmail();
                                                sessions.set(userId, s);
                                                const info = await s.create();
                                                persistSess(s);

                                                const teks =
                                                        `╭─「 🗑️ *EMAIL DIGANTI* 」\n` +
                                                        `│\n` +
                                                        `│ 📤 *Lama:* ${old}\n` +
                                                        `│ ✉️ *Baru:* ${info.mailbox}\n` +
                                                        `│ 📥 *Inbox:* ${(info.messages || []).length} pesan\n` +
                                                        `│ 💾 *Status:* Tersimpan baru\n` +
                                                        `│\n` +
                                                        `│ Email baru udah tersimpan, gak bakal\n` +
                                                        `│ ganti lagi sampai kamu *${pfx}tmdel*.\n` +
                                                        `│\n` +
                                                        `│ Perintah:\n` +
                                                        `│ • ${pfx}tminbox — cek inbox\n` +
                                                        `│ • ${pfx}tmread <id> — baca pesan\n` +
                                                        `│ • ${pfx}tmwait — tunggu email baru (realtime)\n` +
                                                        `│ • ${pfx}tmdel — hapus & ganti email baru\n` +
                                                        `╰────────────────────`;

                                                await sendTmailPanel(teks, info.mailbox);
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                logCommand(m, hisoka, 'tmdel');
                                                break;
                                        }

                                        if (sub === 'tempmail' || sub === 'tmail') {
                                                await hisoka.sendMessage(m.from, { react: { text: '📨', key: m.key } });
                                                const s = getSess();
                                                let info;
                                                let reused = false;
                                                if (input) {
                                                        const [rawName, rawDomain] = input.split('@');
                                                        const name = (rawName || '').trim();
                                                        const domain = (rawDomain || '').trim() || Tmail.DEFAULT_DOMAINS[0];
                                                        if (!name) {
                                                                await tolak(hisoka, m, `❌ Nama email kosong.\nContoh: *${pfx}tempmail wilytest@t.etokom.com*`);
                                                                break;
                                                        }
                                                        if (!Tmail.DEFAULT_DOMAINS.includes(domain)) {
                                                                await tolak(hisoka, m,
                                                                        `❌ Domain *${domain}* tidak tersedia.\n\n` +
                                                                        `Domain yang didukung:\n• ` + Tmail.DEFAULT_DOMAINS.join('\n• ')
                                                                );
                                                                break;
                                                        }
                                                        info = await s.change(name, domain);
                                                        persistSess(s);
                                                } else if (s.mailbox) {
                                                        // Udah punya email tersimpan — PAKSA server re-bind ke email yang sama
                                                        const savedMailbox = s.mailbox;
                                                        info = await ensureBound(s);
                                                        if (!info) info = { mailbox: savedMailbox, messages: [] };
                                                        if (!info.mailbox) info.mailbox = savedMailbox;
                                                        reused = true;
                                                        persistSess(s);
                                                } else {
                                                        info = await s.create();
                                                        persistSess(s);
                                                }
                                                const teks =
                                                        `╭─「 📨 *TEMPMAIL ETOKOM* 」\n` +
                                                        `│\n` +
                                                        `│ ✉️ *Email:* ${info.mailbox}\n` +
                                                        `│ 📥 *Inbox:* ${(info.messages || []).length} pesan\n` +
                                                        `│ 💾 *Status:* ${reused ? 'Dipakai ulang (tersimpan)' : 'Tersimpan baru'}\n` +
                                                        `│\n` +
                                                        `│ Perintah:\n` +
                                                        `│ • ${pfx}tminbox — cek inbox\n` +
                                                        `│ • ${pfx}tmread <id> — baca pesan\n` +
                                                        `│ • ${pfx}tmwait — tunggu email baru (realtime)\n` +
                                                        `│ • ${pfx}tmdel — hapus & ganti email baru\n` +
                                                        `│ • ${pfx}tempmail nama@${Tmail.DEFAULT_DOMAINS[0]} — custom\n` +
                                                        `│\n` +
                                                        `│ 🌐 Domain tersedia:\n│ • ` + Tmail.DEFAULT_DOMAINS.join('\n│ • ') + `\n` +
                                                        `╰────────────────────`;

                                                await sendTmailPanel(teks, info.mailbox);
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                logCommand(m, hisoka, 'tempmail');
                                                break;
                                        }

                                        // Deteksi OTP / kode verifikasi dari body
                                        const detectCode = (text) => {
                                                if (!text) return null;
                                                // prefer pattern dengan kata kunci dulu — wajib ada minimal 1 angka
                                                // (biar gak salah tangkap kata "code"/"otp" sebagai kodenya sendiri)
                                                const KEYWORDS = /(?:code|kode|otp|pin|verification|verifikasi|verif|password|sandi|token)/gi;
                                                let m;
                                                while ((m = KEYWORDS.exec(text)) !== null) {
                                                        const after = text.slice(m.index + m[0].length, m.index + m[0].length + 60);
                                                        const c = after.match(/^[\s:#-]*([A-Z0-9]{4,10})/i);
                                                        if (c && /\d/.test(c[1])) return c[1].trim();
                                                }
                                                // fallback: angka 4-8 digit yang berdiri sendiri
                                                const digits = text.match(/(?<![A-Za-z0-9])(\d{4,8})(?![A-Za-z0-9])/);
                                                return digits ? digits[1] : null;
                                        };

                                        // helper format teks pesan lengkap
                                        const formatMail = (msg, mailbox, header = '📩 *PESAN*') => {
                                                const body = (msg.bodyText || '').trim();
                                                const trimmed = body.length > 3500 ? body.slice(0, 3500) + '\n\n_..(dipotong)_' : body;
                                                const links = Array.isArray(msg.links) ? msg.links.slice(0, 10) : [];
                                                const linkBlock = links.length
                                                        ? `\n\n🔗 *Link di pesan:*\n` + links.map((l, i) =>
                                                                `${i + 1}. ${l.url}` + (l.text ? `\n   _${l.text}_` : '')
                                                        ).join('\n')
                                                        : '';
                                                return (
                                                        `${header}\n\n` +
                                                        `📌 *Subjek:* ${msg.subject || '-'}\n` +
                                                        `👤 *Dari:* ${msg.from || msg.from_email || '-'}\n` +
                                                        `📧 *Ke:* ${msg.to || mailbox || '-'}\n` +
                                                        `🕒 *Tanggal:* ${msg.date || msg.receivedAt || '-'}\n` +
                                                        `🆔 *ID:* ${msg.id}\n` +
                                                        `🌐 *URL:* ${msg.url || ''}\n` +
                                                        `${'─'.repeat(20)}\n\n` +
                                                        (trimmed || '_(isi pesan kosong)_') +
                                                        linkBlock
                                                );
                                        };

                                        // Kirim pesan email + tombol interaktif (copy code, open verify link)
                                        // msg.ai sudah diisi otomatis oleh scraper via Gemini AI (akurat verifikasi vs unsubscribe)
                                        const sendMailWithButtons = async (msg, mailbox, header = '📩 *PESAN*') => {
                                                const ai = msg.ai || null;
                                                const code = (ai && ai.code) || detectCode(msg.bodyText || msg.subject || '');
                                                const links = Array.isArray(msg.links) ? msg.links : [];
                                                const primaryUrl = ai && ai.primaryUrl;
                                                const primaryLabel = (ai && ai.primaryLabel) || 'Verifikasi';
                                                const aiSummary = (ai && ai.summary) || '';

                                                let teks = formatMail(msg, mailbox, header);
                                                if (aiSummary) teks += `\n\n🤖 *Ringkasan AI:* ${aiSummary}`;

                                                const buttons = [];

                                                // Pilih SATU link verifikasi paling akurat
                                                // Prioritas: AI primaryUrl → link kata kunci verifikasi → link non-junk pertama
                                                const isJunk = (u, t) => /unsubscribe|opt-?out|preferences|notification-settings|manage|update.?profile/i.test(u + ' ' + (t || ''));
                                                const isVerifyLike = (u, t) => /verify|verifikasi|confirm|konfirmasi|activate|aktivasi|action-code|oobcode|reset|password|login|signin|sign-in|magic|auth|token/i.test(u + ' ' + (t || ''));

                                                let verifyUrl = null;
                                                let verifyLabel = 'Verifikasi';
                                                if (primaryUrl) {
                                                        verifyUrl = primaryUrl;
                                                        verifyLabel = String(primaryLabel || 'Verifikasi').trim() || 'Verifikasi';
                                                } else {
                                                        const candidate = links.find((l) => l.url && !isJunk(l.url, l.text) && isVerifyLike(l.url, l.text))
                                                                || links.find((l) => l.url && !isJunk(l.url, l.text));
                                                        if (candidate) {
                                                                verifyUrl = candidate.url;
                                                                verifyLabel = 'Verifikasi';
                                                        }
                                                }

                                                if (verifyUrl) {
                                                        // 1) Tombol SALIN LINK — copy URL verifikasi ke clipboard
                                                        buttons.push({
                                                                name: 'cta_copy',
                                                                buttonParamsJson: JSON.stringify({
                                                                        display_text: '📋 Salin Link',
                                                                        copy_code: verifyUrl,
                                                                }),
                                                        });
                                                        // 2) Tombol BUKA LINK — buka URL verifikasi langsung di browser
                                                        buttons.push({
                                                                name: 'cta_url',
                                                                buttonParamsJson: JSON.stringify({
                                                                        display_text: `✅ ${verifyLabel.slice(0, 20)}`,
                                                                        url: verifyUrl,
                                                                        merchant_url: verifyUrl,
                                                                }),
                                                        });
                                                } else if (code) {
                                                        // Fallback: gak ada link verifikasi, tapi ada kode OTP
                                                        buttons.push({
                                                                name: 'cta_copy',
                                                                buttonParamsJson: JSON.stringify({
                                                                        display_text: `🔑 Salin Kode: ${code}`,
                                                                        copy_code: code,
                                                                }),
                                                        });
                                                }

                                                // Tampilin kode OTP di teks juga kalau ada (biar user bisa baca tanpa nyalin link)
                                                if (verifyUrl && code) teks += `\n\n🔑 *Kode OTP:* \`${code}\``;

                                                // Arsipkan permanen — bahkan kalau .tmdel, riwayat email gak hilang
                                                try { archiveEmail(mailbox, msg); } catch (_) {}

                                                if (!buttons.length) {
                                                        await tolak(hisoka, m, teks);
                                                        return;
                                                }

                                                try {
                                                        await m.reply({
                                                                interactiveMessage: {
                                                                        contextInfo: {
                                                                                stanzaId: m.key.id,
                                                                                participant: m.sender,
                                                                                quotedMessage: m.message,
                                                                        },
                                                                        title: teks,
                                                                        footer: `📨 Tempmail · ${mailbox || ''}`,
                                                                        buttons,
                                                                },
                                                        });
                                                } catch (err) {
                                                        // fallback teks biasa kalau interactive ditolak
                                                        await tolak(hisoka, m, teks + (code ? `\n\n🔑 *Kode:* \`${code}\`` : ''));
                                                }
                                        };

                                        if (sub === 'tminbox') {
                                                const s = getSess();
                                                if (!s.mailbox) {
                                                        await tolak(hisoka, m, `⚠️ Belum punya email.\nKetik *${pfx}tempmail* dulu untuk bikin email.`);
                                                        break;
                                                }
                                                await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
                                                // PAKSA server pakai email tersimpan biar gak ganti
                                                const savedMb = s.mailbox;
                                                let data = await ensureBound(s);
                                                if (!data) data = { mailbox: savedMb, messages: [] };
                                                if (!data.mailbox) data.mailbox = savedMb;
                                                persistSess(s);
                                                const list = data.messages || [];
                                                const archive = getArchive();

                                                if (!list.length) {
                                                        // Inbox live kosong — tapi cek arsip dulu, mungkin ada riwayat
                                                        if (archive.length) {
                                                                await tolak(hisoka, m,
                                                                        `📭 *Inbox live kosong*, tapi ada *${archive.length}* email arsip.\n` +
                                                                        `✉️ ${data.mailbox}\n\n` +
                                                                        `_Menampilkan riwayat dari arsip permanen..._`
                                                                );
                                                                for (let i = 0; i < archive.length; i++) {
                                                                        const it = archive[i];
                                                                        const header = `🗂️ *ARSIP ${i + 1}/${archive.length}*` +
                                                                                (it.mailbox && it.mailbox !== data.mailbox ? ` _(dari ${it.mailbox})_` : '');
                                                                        await sendMailWithButtons(it, it.mailbox || data.mailbox, header);
                                                                }
                                                                await hisoka.sendMessage(m.from, { react: { text: '🗂️', key: m.key } });
                                                                logCommand(m, hisoka, 'tminbox');
                                                                break;
                                                        }

                                                        const teks =
                                                                `╭─「 📭 *INBOX KOSONG* 」\n` +
                                                                `│\n` +
                                                                `│ ✉️ Mailbox: ${data.mailbox}\n` +
                                                                `│ 📥 Total pesan: *0*\n` +
                                                                `│ 🗂️ Arsip permanen: *0*\n` +
                                                                `│\n` +
                                                                `│ Belum ada email masuk. Coba:\n` +
                                                                `│ • ${pfx}tmwait — tunggu realtime (default 120s)\n` +
                                                                `│ • ${pfx}tmwait 300 — kasih waktu lebih (max 600s)\n` +
                                                                `│ • ${pfx}tmdel — ganti email baru\n` +
                                                                `╰────────────────────`;
                                                        await sendTmailPanel(teks, data.mailbox);
                                                        await hisoka.sendMessage(m.from, { react: { text: '📭', key: m.key } });
                                                        break;
                                                }
                                                // Header ringkasan (sebut arsip kalau ada)
                                                await tolak(hisoka, m,
                                                        `📥 *INBOX (${list.length} pesan live${archive.length ? `, ${archive.length} di arsip` : ''})*\n` +
                                                        `✉️ ${data.mailbox}\n\n` +
                                                        `_Mengambil isi lengkap setiap pesan..._`
                                                );
                                                // Ambil isi lengkap tiap email LIVE lalu kirim 1-1 (otomatis terarsipkan via sendMailWithButtons)
                                                const liveIds = new Set();
                                                for (let i = 0; i < list.length; i++) {
                                                        const it = list[i];
                                                        let detail;
                                                        try { detail = await s.view(it.id); } catch (_) { detail = {}; }
                                                        const merged = { ...it, ...detail };
                                                        if (merged.id) liveIds.add(`${data.mailbox}::${merged.id}`);
                                                        await sendMailWithButtons(merged, data.mailbox, `📩 *PESAN ${i + 1}/${list.length}*`);
                                                }
                                                // Tampilkan arsip yg BUKAN dari mailbox saat ini (riwayat email lama setelah .tmdel)
                                                const oldArchive = archive.filter((e) => !liveIds.has(`${e.mailbox || ''}::${e.id || ''}`)
                                                        && e.mailbox !== data.mailbox);
                                                if (oldArchive.length) {
                                                        await tolak(hisoka, m,
                                                                `🗂️ *Arsip riwayat (${oldArchive.length} pesan dari email sebelumnya)*\n` +
                                                                `_Email ini tetap tersimpan walau kamu sudah .tmdel._`
                                                        );
                                                        for (let i = 0; i < oldArchive.length; i++) {
                                                                const it = oldArchive[i];
                                                                await sendMailWithButtons(it, it.mailbox || '-',
                                                                        `🗂️ *ARSIP ${i + 1}/${oldArchive.length}* _(${it.mailbox || '-'})_`);
                                                        }
                                                }
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                logCommand(m, hisoka, 'tminbox');
                                                break;
                                        }

                                        if (sub === 'tmread') {
                                                if (!input) {
                                                        await tolak(hisoka, m, `❌ Sertakan ID pesan.\nContoh: *${pfx}tmread 12345*`);
                                                        break;
                                                }
                                                const s = getSess();
                                                if (!s.token) await s.create();
                                                await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
                                                const msg = await s.view(input);
                                                await sendMailWithButtons(msg, s.mailbox, '📖 *PESAN LENGKAP*');
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                logCommand(m, hisoka, 'tmread');
                                                break;
                                        }

                                        if (sub === 'tmwait') {
                                                const s = getSess();
                                                if (!s.mailbox) {
                                                        await tolak(hisoka, m,
                                                                `⚠️ Kamu belum punya email.\n\n` +
                                                                `Ketik *${pfx}tempmail* dulu untuk bikin email kamu sendiri, ` +
                                                                `baru pakai *${pfx}tmwait*.\n\n` +
                                                                `_Tiap nomor WA punya email tempmail sendiri-sendiri._`
                                                        );
                                                        break;
                                                }
                                                // PAKSA pakai email tersimpan
                                                await ensureBound(s);
                                                persistSess(s);
                                                const waitMs = (() => {
                                                        const n = parseInt(input);
                                                        if (!isNaN(n) && n >= 10 && n <= 600) return n * 1000;
                                                        return 2 * 60 * 1000;
                                                })();
                                                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                                await tolak(hisoka, m,
                                                        `⏳ *Menunggu email masuk (REALTIME)*\n\n` +
                                                        `✉️ ${s.mailbox}\n` +
                                                        `⏱️ Durasi: ${Math.round(waitMs / 1000)} detik\n` +
                                                        `🔄 Polling tiap 5 detik\n\n` +
                                                        `_Setiap email yang masuk akan dikirim lengkap (subjek, isi, link). Bot terus mendengarkan sampai durasi habis._`
                                                );
                                                let received = 0;
                                                const r = await s.streamMessages({
                                                        timeout: waitMs,
                                                        interval: 5000,
                                                        onMessage: async (msg) => {
                                                                received++;
                                                                await sendMailWithButtons(msg, s.mailbox, `🔔 *EMAIL BARU #${received}*`);
                                                                await hisoka.sendMessage(m.from, { react: { text: '🔔', key: m.key } }).catch(() => {});
                                                        },
                                                });
                                                if (received === 0) {
                                                        const mb = (loadDB()[userId] || {}).mailbox || '-';
                                                        const teks =
                                                                `╭─「 ⌛ *TIDAK ADA EMAIL BARU* 」\n` +
                                                                `│\n` +
                                                                `│ ⏱️ Durasi tunggu: *${Math.round(waitMs / 1000)} detik*\n` +
                                                                `│ ✉️ Mailbox: ${mb}\n` +
                                                                `│ 📭 Email masuk: *0*\n` +
                                                                `│\n` +
                                                                `│ Coba lagi:\n` +
                                                                `│ • ${pfx}tmwait — tunggu lagi (default 120s)\n` +
                                                                `│ • ${pfx}tmwait 300 — kasih waktu lebih (max 600s)\n` +
                                                                `│ • ${pfx}tminbox — cek inbox manual\n` +
                                                                `╰────────────────────`;
                                                        await sendTmailPanel(teks, mb);
                                                        await hisoka.sendMessage(m.from, { react: { text: '⌛', key: m.key } });
                                                } else {
                                                        const mb = (loadDB()[userId] || {}).mailbox || '-';
                                                        const teks =
                                                                `╭─「 ✅ *SELESAI MENDENGARKAN* 」\n` +
                                                                `│\n` +
                                                                `│ 📬 Total email diterima: *${received}*\n` +
                                                                `│ ✉️ Mailbox: ${mb}\n` +
                                                                `│\n` +
                                                                `│ Mau lanjut?\n` +
                                                                `│ • ${pfx}tmwait — dengerin lagi\n` +
                                                                `│ • ${pfx}tminbox — cek inbox\n` +
                                                                `│ • ${pfx}tmdel — ganti email baru\n` +
                                                                `╰────────────────────`;
                                                        await sendTmailPanel(teks, mb);
                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                }
                                                logCommand(m, hisoka, 'tmwait');
                                                break;
                                        }
                                } catch (error) {
                                        console.error('\x1b[31m[Tempmail] Error:\x1b[39m', error.message);
                                        logError(error, 'command:tempmail');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        await tolak(hisoka, m,
                                                `❌ Gagal proses tempmail.\n\n_${error.message}_`
                                        );
                                }
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
                                if (!m.prefix && m.query) break;
                                try {
                                        const _alqPath2 = path.resolve('./src/scrape/anime/alqanime.cjs');
                                        delete _require.cache[_alqPath2];
                                        const { getLatestAlqanime } = _require(_alqPath2);

                                        await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
                                        await tolak(hisoka, m, `📺 Mengambil rilisan terbaru Alqanime...`);

                                        const items = await getLatestAlqanime();

                                        if (!items.length) {
                                                await tolak(hisoka, m, `❌ Gagal ambil data terbaru.`);
                                                break;
                                        }

                                        const showItems = items.slice(0, 15);
                                        let text = `🎌 *Rilisan Terbaru — Alqanime*\n`;
                                        text += `━━━━━━━━━━━━━━━━━━━\n`;
                                        showItems.forEach((a, i) => {
                                                text += `${i + 1}. ${a.title}\n`;
                                        });
                                        text += `━━━━━━━━━━━━━━━━━━━\n`;
                                        text += `🌐 alqanime.net\n\n`;
                                        text += `📌 *Reply pesan ini:*\n`;
                                        text += `• *1* — lihat episode & pilih resolusi\n`;
                                        text += `• *1 720p* — langsung download ep terbaru 720p\n`;
                                        text += `• *batal* — batalkan\n`;
                                        text += `⏳ Menu berlaku *5 menit*`;

                                        const updMenuMsg = await hisoka.sendMessage(m.from, { text }, { quoted: m });
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

                                        const alqUpdKey2 = getJadibotChoiceKey(m);
                                        const oldUpd = pendingAlqUpdateChoices.get(alqUpdKey2);
                                        if (oldUpd?.timeout) clearTimeout(oldUpd.timeout);
                                        const updTimeout = setTimeout(() => pendingAlqUpdateChoices.delete(alqUpdKey2), 5 * 60 * 1000);
                                        pendingAlqUpdateChoices.set(alqUpdKey2, {
                                                items: showItems,
                                                botMsgId: updMenuMsg?.key?.id || '',
                                                expiresAt: Date.now() + 5 * 60 * 1000,
                                                timeout: updTimeout,
                                        });

                                } catch (err) {
                                        console.error('[ALQUPDATE] Error:', err?.message);
                                        logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqanimeupdate');
                                        await tolak(hisoka, m, `❌ Gagal ambil update Alqanime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
                                }
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
                                try {
                                        const input = (query || '').trim();
                                        const pfx = m.prefix || '.';
                                        const isRandom = m.command === 'cosplayrand' || m.command === 'cosplayrandom' || input.toLowerCase() === 'random';

                                        if (!input && !isRandom) {
                                                await tolak(hisoka, m,
                                                        `╭─「 👘 *COSPLAYTELE SEARCH* 」\n` +
                                                        `│\n` +
                                                        `│ Cari foto & video cosplay dari\n` +
                                                        `│ cosplaytele.com secara realtime.\n` +
                                                        `│\n` +
                                                        `│ *Format:*\n` +
                                                        `│ • ${pfx}cosplay <keyword>\n` +
                                                        `│ • ${pfx}cosplay random\n` +
                                                        `│\n` +
                                                        `│ *Contoh:*\n` +
                                                        `│ • ${pfx}cosplay mitsuri\n` +
                                                        `│ • ${pfx}cosplay rem re:zero\n` +
                                                        `│ • ${pfx}cosplay velma\n` +
                                                        `│ • ${pfx}cosplay random\n` +
                                                        `│\n` +
                                                        `│ ℹ️ Hasil dikirim sebagai album\n` +
                                                        `│    (foto + video terpisah).\n` +
                                                        `╰──────────────────────`
                                                );
                                                break;
                                        }

                                        if (isRandom) {
                                                const { cosplayteleRandom, downloadBuffer, formatCosplayteleCaption } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
                                                await hisoka.sendMessage(m.from, { react: { text: '🎲', key: m.key } });
                                                const loadMsg = await tolak(hisoka, m, `🎲 Mengambil cosplay *random* dari cosplaytele.com...`);
                                                try {
                                                        const post = await cosplayteleRandom();
                                                        if (loadMsg?.key) {
                                                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                                        }
                                                        const vidInfo = post.hasVideos ? ` | 🎬 ada video` : '';
                                                        const caption0 =
                                                                `╭─「 🎲 *COSPLAY RANDOM* 」\n` +
                                                                `│ 📌 *${post.title.slice(0, 80)}*\n` +
                                                                `│ 🖼️ ${post.totalImages} foto${vidInfo}\n` +
                                                                `│ 🔗 ${post.link}\n` +
                                                                `│\n` +
                                                                `│ ℹ️ Mengirim ${post.images.length} foto...\n` +
                                                                `╰──────────────────────`;
                                                        await tolak(hisoka, m, caption0);
                                                        await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });
                                                        if (post.images.length > 0) {
                                                                await _sendCosplayImages(hisoka, m, post, downloadBuffer, formatCosplayteleCaption, '[CosplayRandom]');
                                                        }
                                                        if (post.hasVideos && post.cossoraIds?.length > 0) {
                                                                await hisoka.sendMessage(m.from, {
                                                                        text: `╭─「 🎬 *VIDEO COSPLAY* 」\n│ Tonton video dari post ini:\n│\n${post.cossoraIds.map((u, i) => `│ ${i + 1}. ${u}`).join('\n')}\n╰──────────────────────`,
                                                                }, { quoted: m });
                                                        }
                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                        logCommand(m, hisoka, 'cosplayrand');
                                                } catch (err) {
                                                        console.error('[CosplayRandom] Error:', err.message);
                                                        logError(err, 'command:cosplayrand');
                                                        if (loadMsg?.key) {
                                                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                                        }
                                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                                        await tolak(hisoka, m, `❌ Gagal ambil cosplay random.\n_${err.message}_`);
                                                }
                                                break;
                                        }

                                        const { cosplayteleSearch, formatCosplayteleSearchList } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
                                        await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

                                        const loadMsg = await tolak(hisoka, m, `🔍 Mencari cosplay *"${input}"* di cosplaytele.com...`);

                                        const results = await cosplayteleSearch(input, { perPage: 8 });

                                        if (loadMsg?.key) {
                                                try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
                                        }

                                        const listText =
                                                `╭─「 👘 *COSPLAYTELE* 」\n` +
                                                `│ 🔍 Hasil: *"${input}"*\n` +
                                                `│ Ditemukan ${results.length} post\n` +
                                                `│\n` +
                                                results.map((r, i) => {
                                                        const match = r.title.match(/(\d+\s*photos?\s*(?:and\s*\d+\s*videos?)?)/i);
                                                        const count = match ? ` [${match[1]}]` : '';
                                                        const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
                                                        return `│ *${i + 1}.* ${cleanTitle.slice(0, 65)}${count}`;
                                                }).join('\n') + '\n' +
                                                `│\n` +
                                                `│ 📩 *Balas pesan ini* dengan angka\n` +
                                                `│    pilihan kamu (1–${results.length})\n` +
                                                `│ ⏳ Menu berlaku 3 menit\n` +
                                                `╰──────────────────────`;

                                        const menuMsg = await tolak(hisoka, m, listText);
                                        await hisoka.sendMessage(m.from, { react: { text: '👘', key: m.key } });

                                        const cosKey = m.sender;
                                        const cosTimeout = setTimeout(() => pendingCosplayChoices.delete(cosKey), 3 * 60 * 1000);

                                        const old = pendingCosplayChoices.get(cosKey);
                                        if (old?.timeout) clearTimeout(old.timeout);
                                        pendingCosplayChoices.set(cosKey, {
                                                results,
                                                botMsgId: menuMsg?.key?.id || null,
                                                expiresAt: Date.now() + 3 * 60 * 1000,
                                                timeout: cosTimeout,
                                                loading: false,
                                        });

                                        logCommand(m, hisoka, 'cosplay');
                                } catch (error) {
                                        console.error('\x1b[31m[Cosplay] Error:\x1b[39m', error.message);
                                        logError(error, 'command:cosplay');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        await tolak(hisoka, m,
                                                `❌ *Gagal mencari di Cosplaytele.*\n\n` +
                                                `_${error.message}_\n\n` +
                                                `Contoh: *.cosplay mitsuri*`
                                        );
                                }
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
                                try {
                                        const input = (query || '').trim();
                                        const pfx = m.prefix || '.';

                                        if (!input) {
                                                await tolak(hisoka, m,
                                                        `╭─「 📱 *CEK HP REALTIME* 」\n` +
                                                        `│\n` +
                                                        `│ Cek spesifikasi lengkap HP secara\n` +
                                                        `│ realtime dari database GSMArena.\n` +
                                                        `│\n` +
                                                        `│ *Contoh:*\n` +
                                                        `│ • ${pfx}cekhp Samsung Galaxy S24\n` +
                                                        `│ • ${pfx}cekhp iPhone 15 Pro Max\n` +
                                                        `│ • ${pfx}cekhp Xiaomi 14 Ultra\n` +
                                                        `│ • ${pfx}cekhp Redmi Note 13 Pro\n` +
                                                        `╰────────────────────`
                                                );
                                                break;
                                        }

                                        const { cekHP, getHPImage, formatHPSpecs } = _require(path.resolve('./src/scrape/tools/cekhp.cjs'));
                                        await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
                                        const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data spesifikasi *${input}* + estimasi harga pasar Indonesia...`);

                                        const result = await cekHP(input);
                                        let report = formatHPSpecs(result);

                                        // Estimasi harga pasaran Indonesia via Gemini AI — inject langsung di blok harga
                                        let aiPriceBlock = '';
                                        try {
                                                const pi = result.priceInfo;
                                                const aiPrompt =
                                                        `Kamu adalah asisten info harga HP di Indonesia.\n` +
                                                        `HP: ${result.name}\n` +
                                                        `Harga global resmi: ${pi?.raw || 'tidak diketahui'}\n` +
                                                        `${pi?.idr ? `Konversi kurs: Rp ${Math.round(pi.idr).toLocaleString('id-ID')}` : ''}\n\n` +
                                                        `Berikan estimasi harga jual di pasaran Indonesia (marketplace/toko). ` +
                                                        `Pertimbangkan pajak impor, distribusi lokal, kondisi pasar. ` +
                                                        `Jawab HANYA format ini:\n` +
                                                        `▸ *🤖 Estimasi Pasaran Indo:* Rp X.XXX.XXX - Rp Y.YYY.YYY\n` +
                                                        `▸ *Catatan:* (1 kalimat singkat)`;

                                                const aiResp = await gemini.ask(aiPrompt);
                                                if (aiResp && aiResp.trim()) {
                                                        aiPriceBlock = aiResp.trim()
                                                                .split('\n')
                                                                .filter(l => l.trim())
                                                                .slice(0, 2)
                                                                .join('\n');
                                                }
                                        } catch (_) {}
                                        report = report.replace('%%AI_PRICE%%', aiPriceBlock);

                                        const imgBuf = await getHPImage(result.image, result.bigpicUrl).catch(() => null);

                                        if (loadingMsg?.key) {
                                                try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                                        }

                                        if (imgBuf && imgBuf.length > 500) {
                                                await hisoka.sendMessage(m.from, { image: imgBuf, caption: report }, { quoted: m });
                                        } else {
                                                await tolak(hisoka, m, report);
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'cekhp');
                                } catch (error) {
                                        console.error('\x1b[31m[CekHP] Error:\x1b[39m', error.message);
                                        logError(error, 'command:cekhp');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        await tolak(hisoka, m,
                                                `❌ Gagal mengambil data HP.\n\n` +
                                                `_${error.message}_\n\n` +
                                                `Coba tulis nama HP lebih lengkap.\n` +
                                                `Contoh: *.cekhp Samsung Galaxy A55*`
                                        );
                                }
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
                                        break;
                                }

                                try {
                                        if (input.toLowerCase() === 'random') {
                                                await _showGenreSelect();
                                                break;
                                        }

                                        const { ChatMusicAPI } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));

                                        // Tema bebas: input tanpa separator | → AI tentukan genre+judul+lirik
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

                                                const params = {
                                                        title:          preset.title,
                                                        lyrics:         preset.lyrics,
                                                        musicStyle:     preset.musicStyle,
                                                        genreLabel:     preset.genreLabel,
                                                        prompt:         preset.prompt,
                                                        isInstrumental: preset.isInstrumental,
                                                };

                                                // Hapus loading lalu generate
                                                if (loadingMsg?.key) {
                                                        try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
                                                }
                                                await _generateMusik(hisoka, m, params);
                                                console.log(`\x1b[35m[MusicAI/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
                                                break;
                                        }

                                        // Manual: judul | lirik | genre
                                        const parts = input.split('|').map(s => s.trim());
                                        const params = {
                                                title:          parts[0] || 'My Song',
                                                lyrics:         parts[1] || '',
                                                musicStyle:     parts[2] || 'pop',
                                                isInstrumental: !parts[1] ? 1 : 0,
                                                prompt:         `${parts[2] || 'pop'} indonesia`,
                                        };
                                        await _generateMusik(hisoka, m, params);
                                } catch (error) {
                                        console.error('\x1b[31m[MusicAI] Error:\x1b[39m', error.message);
                                        logError(error, 'command:musikai');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        const isSensitive = /sensitive words|prohibited/i.test(error.message);
                                        const errMsg = isSensitive
                                                ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n` +
                                                  `│\n` +
                                                  `│ API mendeteksi *kata sensitif* dalam lirik.\n` +
                                                  `│\n` +
                                                  `│ 💡 *Solusi:*\n` +
                                                  `│ Hindari kata-kata terkait narkoba,\n` +
                                                  `│ SARA, kekerasan, atau konten dewasa.\n` +
                                                  `│\n` +
                                                  `│ Coba ganti lirikmu & kirim ulang ↓\n` +
                                                  `╰──────────────────────────────`
                                                : `╭──『 ❌ *GAGAL GENERATE* 』\n` +
                                                  `│\n` +
                                                  `│ ${error.message}\n` +
                                                  `│\n` +
                                                  `│ Coba lagi atau pilih genre random ↓\n` +
                                                  `╰──────────────────────────────`;
                                        await sendConfirmWithButtons(hisoka, m, errMsg,
                                                isSensitive
                                                        ? [{ text: '📖 Lihat Contoh Format', id: '__musikai_help__' }]
                                                        : [{ text: '🔁 Coba Random Lagi', id: '__musikai_random__' }]
                                        );
                                }
                                break;
                        }
                        case 'musikai2':
                        case 'aimusik2': {
                                const pfx   = m.prefix || '.';
                                const input = (query || '').trim();

                                if (!input) {
                                        await sendConfirmWithButtons(hisoka, m,
                                                `╭──『 🎵 *MUSIK AI 2* 』\n` +
                                                `│\n` +
                                                `│ Generate lagu original pakai AI (backend 2).\n` +
                                                `│ Hasil: *2 variasi audio* + cover art.\n` +
                                                `│\n` +
                                                `│ *Cara pakai:*\n` +
                                                `│ • _${pfx}musikai2 hujan di kota_ — tema bebas\n` +
                                                `│ • _${pfx}musikai2 random_ — genre random\n` +
                                                `│ • _${pfx}musikai2 judul | lirik | genre_ — manual\n` +
                                                `│\n` +
                                                `│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
                                                `╰──────────────────────────────`,
                                                [
                                                        { text: '🎲 Generate Random', id: '__musikai2_random__' },
                                                        { text: '📖 Cara Pakai Custom', id: '__musikai2_help__' },
                                                ]
                                        );
                                        break;
                                }

                                try {
                                        if (input.toLowerCase() === 'random') {
                                                await sendConfirmWithButtons(hisoka, m,
                                                        `╭──『 🎲 *MUSIK AI 2 — RANDOM* 』\n` +
                                                        `│\n` +
                                                        `│ AI akan memilih genre, judul & lirik\n` +
                                                        `│ secara otomatis sesuai bahasa pilihan.\n` +
                                                        `│\n` +
                                                        `│ Pilih bahasa lirik di bawah ↓\n` +
                                                        `╰──────────────────────────────`,
                                                        [
                                                                { text: '🇮🇩 Indonesia', id: '__musikai2_rlang__id' },
                                                                { text: '🇯🇵 Jepang',   id: '__musikai2_rlang__jp' },
                                                                { text: '🇬🇧 English',  id: '__musikai2_rlang__en' },
                                                        ]
                                                );
                                                break;
                                        }

                                        const { ChatMusicAPI2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));

                                        // Tema bebas: input tanpa separator | → AI tentukan genre+judul+lirik
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
                                                const preset = await api.aiThemePreset(tema, 'vocal');
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
                                                await _generateMusik2(hisoka, m, {
                                                        title:          preset.title,
                                                        lyrics:         preset.lyrics,
                                                        musicStyle:     preset.musicStyle,
                                                        genreLabel:     preset.genreLabel,
                                                        prompt:         preset.prompt,
                                                        isInstrumental: preset.isInstrumental,
                                                });
                                                console.log(`\x1b[35m[MusicAI2/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
                                                break;
                                        }

                                        // Manual: judul | lirik | genre
                                        const parts = input.split('|').map(s => s.trim());
                                        await _generateMusik2(hisoka, m, {
                                                title:          parts[0] || 'My Song',
                                                lyrics:         parts[1] || '',
                                                musicStyle:     parts[2] || 'pop',
                                                isInstrumental: !parts[1] ? 1 : 0,
                                                prompt:         `${parts[2] || 'pop'} indonesia`,
                                        });
                                } catch (error) {
                                        console.error('\x1b[31m[MusicAI2] Error:\x1b[39m', error.message);
                                        logError(error, 'command:musikai2');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        const isSensitive = /sensitive words|prohibited/i.test(error.message);
                                        const errMsg = isSensitive
                                                ? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n` +
                                                  `│\n` +
                                                  `│ API mendeteksi *kata sensitif* dalam lirik.\n` +
                                                  `│\n` +
                                                  `│ 💡 *Solusi:*\n` +
                                                  `│ Hindari kata-kata terkait narkoba,\n` +
                                                  `│ SARA, kekerasan, atau konten dewasa.\n` +
                                                  `│\n` +
                                                  `│ Coba ganti lirikmu & kirim ulang ↓\n` +
                                                  `╰──────────────────────────────`
                                                : `╭──『 ❌ *GAGAL GENERATE* 』\n` +
                                                  `│\n` +
                                                  `│ ${error.message}\n` +
                                                  `│\n` +
                                                  `│ Coba lagi atau pilih genre random ↓\n` +
                                                  `╰──────────────────────────────`;
                                        await sendConfirmWithButtons(hisoka, m, errMsg,
                                                isSensitive
                                                        ? [{ text: '📖 Lihat Contoh Format', id: '__musikai2_help__' }]
                                                        : [{ text: '🔁 Coba Random Lagi', id: '__musikai2_random__' }]
                                        );
                                }
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
                                try {
                                        const pfx = m.prefix || '.';
                                        const { identifyWhatsMusic, identifyWhatsMusicFromYoutube, downloadWhatsMusicVoiceNote, formatWhatsMusic, isYoutubeUrl, extractYoutubeUrl } = _require(path.resolve('./src/scrape/music/whatsmusik.cjs'));
                                        const currentType = getMediaTypeFromMessage(m);
                                        const quotedType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';
                                        const currentMime = m.content?.mimetype || m.msg?.mimetype || m.message?.audioMessage?.mimetype || m.message?.videoMessage?.mimetype || m.message?.documentMessage?.mimetype || '';
                                        const quotedMime = m.quoted?.content?.mimetype || m.quoted?.msg?.mimetype || m.quoted?.message?.audioMessage?.mimetype || m.quoted?.message?.videoMessage?.mimetype || m.quoted?.message?.documentMessage?.mimetype || '';
                                        const youtubeInput = extractYoutubeUrl(query || m.quoted?.text || m.quoted?.body || m.quoted?.caption || '');
                                        const hasYoutubeUrl = youtubeInput && isYoutubeUrl(youtubeInput);

                                        const isCurrentAudio = currentType === 'audioMessage' || currentType === 'videoMessage' || (currentType === 'documentMessage' && /^audio\//i.test(currentMime));
                                        const isQuotedAudio = quotedType === 'audioMessage' || quotedType === 'videoMessage' || (quotedType === 'documentMessage' && /^audio\//i.test(quotedMime));

                                        if (!isCurrentAudio && !isQuotedAudio && !hasYoutubeUrl) {
                                                await tolak(hisoka, m,
                                                        `╭─「 🎧 *WHATSMUSIK* 」\n` +
                                                        `│\n` +
                                                        `│ Kenali judul lagu dari audio/voice note/video.\n` +
                                                        `│\n` +
                                                        `│ *Cara pakai:*\n` +
                                                        `│ • Reply audio/voice note dengan ${pfx}whatsmusik\n` +
                                                        `│ • ${pfx}whatsmusik https://youtu.be/xxxx\n` +
                                                        `│ • Bisa juga ${pfx}wmusik / ${pfx}tebaklagu\n` +
                                                        `│\n` +
                                                        `│ *Tips:* pakai potongan lagu/reff 10-35 detik\n` +
                                                        `│ yang jelas, jangan terlalu banyak noise.\n` +
                                                        `╰────────────────────`
                                                );
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '🎧', key: m.key } }).catch(() => {});
                                        const loadingMsg = await tolak(hisoka, m, hasYoutubeUrl
                                                ? '🎧 Mengambil audio YouTube, membaca metadata, lalu mencocokkan lagu...'
                                                : '🎧 Menganalisis beberapa bagian audio dan mencari judul lagu...'
                                        );

                                        let result;
                                        if (hasYoutubeUrl) {
                                                const ytdlpBin = await ensureYtdlp(hisoka, m);
                                                result = await identifyWhatsMusicFromYoutube(youtubeInput, { ytdlpPath: ytdlpBin });
                                        } else {
                                                const targetMessage = isQuotedAudio ? m.quoted : m;
                                                const targetMime = isQuotedAudio ? quotedMime : currentMime;
                                                const audioBuffer = await downloadMediaBuffer(hisoka, targetMessage);
                                                result = await identifyWhatsMusic(audioBuffer, { mimetype: targetMime });
                                        }
                                        const report = formatWhatsMusic(result);

                                        if (loadingMsg?.key) {
                                                try { await m.reply({ edit: loadingMsg.key, text: '✅ Lagu ditemukan! Mengirim detail...' }); } catch (_) {}
                                        }

                                        let sent = false;
                                        if (result.coverHigh || result.cover) {
                                                try {
                                                        await hisoka.sendMessage(m.from, {
                                                                image: { url: result.coverHigh || result.cover },
                                                                caption: report
                                                        }, { quoted: m });
                                                        sent = true;
                                                } catch (_) {}
                                        }
                                        if (!sent) await tolak(hisoka, m, report);

                                        if (result.links?.youtube) {
                                                try {
                                                        const ytdlpBin = await ensureYtdlp(hisoka, m);
                                                        if (loadingMsg?.key) {
                                                                try { await m.reply({ edit: loadingMsg.key, text: '✅ Detail lagu terkirim. Sedang mengambil audio VN realtime...' }); } catch (_) {}
                                                        }
                                                        const vnAudio = await downloadWhatsMusicVoiceNote(result.links.youtube, { ytdlpPath: ytdlpBin, maxDuration: 600 });
                                                        await hisoka.sendMessage(m.from, {
                                                                audio: vnAudio.buffer,
                                                                mimetype: vnAudio.mimetype,
                                                                fileName: vnAudio.fileName,
                                                                ptt: true
                                                        }, { quoted: m });
                                                } catch (vnError) {
                                                        console.error('\x1b[33m[WhatsMusik VN] Gagal kirim voice note:\x1b[39m', vnError.message);
                                                        await tolak(hisoka, m, `⚠️ Detail lagu berhasil, tapi audio VN gagal dikirim: ${vnError.message?.substring(0, 160)}`);
                                                }
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } }).catch(() => {});
                                        logCommand(m, hisoka, 'whatsmusik');
                                } catch (error) {
                                        console.error('\x1b[31m[WhatsMusik] Error:\x1b[39m', error.message);
                                        logError(error, 'command:whatsmusik');
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
                                        await tolak(hisoka, m,
                                                `❌ Gagal mengenali lagu.\n\n` +
                                                `_${error.message}_\n\n` +
                                                `Tips: reply audio lagu yang jelas durasi 8-25 detik.`
                                        );
                                }
                                break;
                        }

                        case 'menu': {
                                if (!m.prefix && m.query) break;
                                try {
                                        // ── JADIBOT: tampilkan menu khusus tanpa thumbnail ──
                                        if (hisoka?.isMainBot === false) {
                                                const _jbCfg       = loadConfig();
                                                const _jbBotReply  = _jbCfg?.botReply || {};
                                                const _jbFooter    = loadConfig()?.botReply?.footer || '';
                                                const jadibotNum = getJadibotNumber(hisoka);

                                                // Hitung fitur yang benar-benar ON secara realtime
                                                const _jbReadsw = getJadibotReadsw(jadibotNum);
                                                const _jbAntidel = getJadibotAntidel(jadibotNum);
                                                const _jbAnticall = getJadibotAnticall(jadibotNum);
                                                const _jbAcv = getJadibotAnticallvid(jadibotNum);
                                                const _jbAo = getJadibotAutoOnline(jadibotNum);
                                                const _jbAt = getJadibotAutoTyping(jadibotNum);
                                                const _jbAr = getJadibotAutoRecording(jadibotNum);
                                                const _jbAutoList = [
                                                        _jbReadsw?.enabled,
                                                        _jbAntidel?.enabled,
                                                        _jbAnticall?.enabled,
                                                        _jbAcv?.enabled,
                                                        _jbAo?.enabled,
                                                        _jbAt?.enabled,
                                                        _jbAr?.enabled,
                                                ];
                                                const _jbTotalAutoFitur = _jbAutoList.length;
                                                const _jbFiturCount = _jbAutoList.filter(Boolean).length;
                                                const _jbAutoTidakAktif = _jbTotalAutoFitur - _jbFiturCount;
                                                const jadibotConnectTs = jadibotConnectedAt.get(jadibotNum) || getJadibotExpiry(jadibotNum)?.connectedAt || Date.now();
                                                const jadibotUptimeMs = Date.now() - jadibotConnectTs;
                                                const jadibotUptimeSec = Math.floor(jadibotUptimeMs / 1000);
                                                const juh = Math.floor(jadibotUptimeSec / 3600);
                                                const jum = Math.floor((jadibotUptimeSec % 3600) / 60);
                                                const jus = Math.floor(jadibotUptimeSec % 60);
                                                const expSum = getJadibotExpirySummary(jadibotNum);
                                                const masaAktifLine = expSum.status === 'permanent'
                                                        ? `♾️ *Masa Aktif* : Permanent`
                                                        : `⏳ *Masa Aktif* : ${expSum.remaining}`;
                                                const _jbNow = new Date();
                                                const _jbTglFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(_jbNow);
                                                const _jbJamFmt = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(_jbNow);
                                                const menuTeks = getHandler('menuJadibot')?.buildMenuJadibot({
                                                        pushName: m.pushName || 'User',
                                                        jadibotNum,
                                                        juh, jum, jus,
                                                        masaAktifLine,
                                                        tglFmt: _jbTglFmt,
                                                        jamFmt: _jbJamFmt,
                                                        totalAutoFitur: _jbTotalAutoFitur,
                                                        fiturCount: _jbFiturCount,
                                                        autoTidakAktif: _jbAutoTidakAktif,
                                                }) ?? '❌ Menu tidak tersedia, coba lagi.';
                                                let jbMenuSent = false;
                                                try {
                                                        const btnJb = new Button()
                                                                .setBody(menuTeks)
                                                                .setFooter(_jbFooter);
                                                        await btnJb.run(m.from, hisoka, { quoted: m });
                                                        jbMenuSent = true;
                                                } catch (_) {}
                                                if (!jbMenuSent) {
                                                        await hisoka.sendMessage(m.from, { text: menuTeks }, { quoted: m });
                                                }
                                                logCommand(m, hisoka, 'menu');
                                                break;
                                        }

                                        // ── MAIN BOT: menu normal dengan thumbnail ──
                                        const cfg      = loadConfig();
                                        const botReply = cfg.botReply || {};
                                        const botName  = botReply.botName     || 'Wily Bot';
                                        const ownerNum = botReply.ownerNumber || '';
                                        const menuFooter = loadConfig()?.botReply?.footer || '';
                                        const uptime   = process.uptime();
                                        const uh = Math.floor(uptime / 3600);
                                        const um = Math.floor((uptime % 3600) / 60);
                                        const us = Math.floor(uptime % 60);
                                        const uptimeStr = `${uh} Jam ${um} Menit ${us} Detik`;
                                        // Hitung fitur yang benar-benar ON secara realtime (bukan total command)
                                        const _mnCfg = loadConfig();
                                        const totalSemuaFitur = CEKAUTO_FITUR_LIST.length;
                                        const totalCmd = CEKAUTO_FITUR_LIST.filter(f => {
                                                if (f.checkFn) return f.checkFn(_mnCfg);
                                                if (f.type === 'global') return _mnCfg[f.key]?.enabled === true;
                                                const groups = _mnCfg[f.key]?.groups || {};
                                                return Object.values(groups).some(g => g?.enabled === true);
                                        }).length;
                                        const totalTidakAktif = totalSemuaFitur - totalCmd;
                                        // Gunakan array mentah dari runtime agar label sesuai BENAR-BENAR
                                        // dengan browser yang dipakai saat socket dibuat (= apa yg WA lihat di Perangkat Tertaut)
                                        const _mnBrowserArr  = global.__activeBrowserArr;
                                        const _mnBrowserKey  = (global.__activeBrowserKey || _mnCfg.browserDevice?.selected || 'v1').toLowerCase();
                                        const _mnBrowserInfo = BROWSER_LIST.find(b => b.key === _mnBrowserKey) || BROWSER_LIST[0];
                                        const _mnBrowserLabel = _mnBrowserArr && _mnBrowserArr.length >= 3
                                                ? `${_mnBrowserArr[0]} + ${_mnBrowserArr[1]} (${_mnBrowserArr[2]})`
                                                : `${_mnBrowserInfo.label} (${_mnBrowserInfo.value[2]})`;
                                        const _mnNow = new Date();
                                        const _mnTgl = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' }).format(_mnNow);
                                        const _mnJam = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(_mnNow);

                                        await hisoka.sendMessage(m.from, { react: { text: `🌊`, key: m.key } }).catch(() => {});

                                        const teks = getHandler('menuUtama')?.buildMenuUtama({
                                                pushName: m.pushName || 'User',
                                                isOwner: m.isOwner,
                                                uptimeStr,
                                                tgl: _mnTgl,
                                                jam: _mnJam,
                                                browserLabel: _mnBrowserLabel,
                                                totalCmdCount: TOTAL_CMD_COUNT,
                                                totalSemuaFitur,
                                                fiturAktif: totalCmd,
                                                fiturTidakAktif: totalTidakAktif,
                                        }) ?? '❌ Menu tidak tersedia, coba lagi.';
                                        const ppUser = await getUserProfilePictureUrl(hisoka, m.sender);
                                        const menuCtxInfo = ppUser
                                                ? {
                                                        externalAdReply: {
                                                                showAdAttribution: false,
                                                                title: `${botName} Menu`,
                                                                body: `Menu untuk ${m.pushName || 'User'}`,
                                                                thumbnailUrl: ppUser,
                                                                sourceUrl: ownerNum ? `https://wa.me/${ownerNum}` : undefined,
                                                                mediaType: 1,
                                                                renderLargerThumbnail: true
                                                        }
                                                }
                                                : {};
                                        let menuSent = false;
                                        try {
                                                const btnMenu = new Button()
                                                        .setBody(teks)
                                                        .setFooter(menuFooter)
                                                        .setContextInfo(menuCtxInfo);
                                                await btnMenu.run(m.from, hisoka, { quoted: m });
                                                menuSent = true;
                                        } catch (_) {}
                                        if (!menuSent) {
                                                await hisoka.sendMessage(
                                                        m.from,
                                                        Object.keys(menuCtxInfo).length ? { text: teks, contextInfo: menuCtxInfo } : { text: teks },
                                                        { quoted: m }
                                                );
                                        }
                                } catch (error) {
                                        if (!isNoSpaceError(error)) throw error;
                                        cleanupWritePressure();
                                        await hisoka.sendMessage(m.from, {
                                                text:
                                                        `*MENU BOT*\n\n` +
                                                        `Menu sedang dikirim mode hemat karena storage/temp sempat penuh.\n\n` +
                                                        `Fitur utama:\n` +
                                                        `.typing\n` +
                                                        `.recording\n` +
                                                        `.online\n` +
                                                        `.readsw\n` +
                                                        `.antidel on/off\n` +
                                                        `.hidetag\n` +
                                                        `.ghosttag\n` +
                                                        `.quoted\n` +
                                                        `.rvo\n` +
                                                        `.s\n` +
                                                        `.toimg\n` +
                                                        `.stickerly\n` +
                                                        `.listgroup\n` +
                                                        `.allunduh\n` +
                                                        `.tt\n` +
                                                        `.ig\n` +
                                                        `.fb\n` +
                                                        `.twdl\n` +
                                                        `.ytmp3\n` +
                                                        `.ytmp4\n` +
                                                        `.play\n` +
                                                        `.cuaca\n` +
                                                        `.jadibot\n` +
                                                        `.stopbot\n` +
                                                        `.listbot\n\n` +
                                                        `Ketik .allmenu untuk daftar lebih lengkap.`
                                        }, { quoted: m });
                                }
                                logCommand(m, hisoka, 'menu');
                                break;
                        }

                        case 'allmenu': {
                                const { handleAllmenu } = _require(path.resolve('./src/scrape/tools/menupages.cjs'));
                                await handleAllmenu({ hisoka, m, query, loadConfig, logCommand, fs, path });
                                break;
                        }
                        case 'settingmenu': {
                                const { handleSettingmenu } = _require(path.resolve('./src/scrape/tools/menu-pages2.cjs'));
                                await handleSettingmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'groupmenu': {
                                const { handleGroupmenu } = _require(path.resolve('./src/scrape/tools/menu-pages2.cjs'));
                                await handleGroupmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'statusmenu': {
                                const { handleStatusmenu } = _require(path.resolve('./src/scrape/tools/menu-pages2.cjs'));
                                await handleStatusmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'downloadmenu': {
                                const { handleDownloadmenu } = _require(path.resolve('./src/scrape/tools/menu-pages2.cjs'));
                                await handleDownloadmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'jadibotmenu': {
                                const { handleJadibotmenu } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleJadibotmenu({ hisoka, m, tolak, logCommand, loadConfig });
                                break;
                        }
                        case 'ownermenu': {
                                const { handleOwnermenu } = _require(path.resolve('./src/scrape/tools/menupages.cjs'));
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
                                await handleVo({ hisoka, m, query, tolak, logCommand, loadConfig, quoted, downloadMediaMessage, isJidGroup, extractMediaFromMessage, hasViewOnceCache, getViewOnceCache });
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
                                try {
                                        if (hisoka.isMainBot === false) return;
                                        const wilyAIConfig = loadConfig().wilyAI || {};
                                        if (wilyAIConfig.enabled === false) return;

                                        const userName = getUserName(m.sender, m.pushName || 'Kak');
                                        const now = new Date();
                                        const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                        const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
                                        const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                        const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                        // Reset history command
                                        const lowerQuery = (query || '').trim().toLowerCase();
                                        if (lowerQuery === 'reset' || lowerQuery === 'clear' || lowerQuery === 'hapus chat' || lowerQuery === 'mulai baru') {
                                                const sessKey = getSessionKey(m);
                                                const historyBeforeReset = getHistory(sessKey);

                                                // Kirim backup history ke semua owner sebelum dihapus (jika ada data)
                                                if (historyBeforeReset.length > 0) {
                                                        try {
                                                                const cfg      = loadConfig();
                                                                const owners   = cfg.owners || [];
                                                                const isGroup  = m.isGroup;
                                                                const nowStr   = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
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
                                                break;
                                        }

                                        // Deteksi media: gambar, sticker, video, dokumen (dari pesan saat ini atau reply)
                                        let imageBuffer = null;
                                        let imageMime = 'image/jpeg';
                                        let hasMedia = false;
                                        let mediaLabel = '';
                                        let isDocumentMode = false;
                                        let documentContext = '';
                                        let quotedTextContext = '';

                                        const curType = getMediaTypeFromMessage(m);
                                        const qtType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

                                        // Helper: download media dari quoted message
                                        const downloadQuotedMedia = async () => await getQuotedMediaBuffer(hisoka, m);

                                        // ── DETEKSI MEDIA DARI PESAN LANGSUNG ──
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
                                                        // Baca semua path yang mungkin untuk mime & filename
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

                                                        // Deteksi tipe file dari MAGIC BYTES (paling akurat, tidak bergantung mime/nama)
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

                                                        // Deteksi via mime/ekstensi sebagai fallback (magic bytes sudah lebih dulu dicek)
                                                        const isZip = isZipMagic || docMime.includes('zip') ||
                                                                ['zip', 'apk', 'jar', 'docx', 'xlsx', 'pptx', 'odt', 'ods', 'odp'].includes(docExt);
                                                        const isPdf = isPdfMagic || docMime.includes('pdf') || docExt === 'pdf';
                                                        const isRar = isRarMagic || docMime.includes('rar') || docExt === 'rar';
                                                        const is7z = is7zMagic || docExt === '7z' || docMime.includes('7z');
                                                        const isText = docMime.startsWith('text/') ||
                                                                ['txt', 'csv', 'json', 'xml', 'html', 'htm', 'js', 'ts', 'py', 'java', 'cpp', 'c', 'css', 'md', 'yaml', 'yml', 'ini', 'conf', 'log', 'sh', 'bat'].includes(docExt);
                                                        const isImage = docMime.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp'].includes(docExt);

                                                        if (isZip && !isRar && !is7z) {
                                                                // ── ZIP / DOCX / APK / JAR ──
                                                                const zipResult = parseZipBuffer(docBuffer);
                                                                if (zipResult.error) {
                                                                        await tolak(hisoka, m, `❌ ${zipResult.error}`);
                                                                        break;
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
                                                                        // Untuk DOCX/XLSX dll, tunjukkan saja ringkasan
                                                                        zipText += `│ _(Format Office — gunakan .wily untuk baca isinya lebih lanjut)_\n`;
                                                                }
                                                                zipText += `│\n╰═══════════════════════╯`;
                                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                await tolak(hisoka, m, zipText);
                                                                logCommand(m, hisoka, 'wily');
                                                                break;
                                                        } else if (isRar) {
                                                                // ── RAR FILE ──
                                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                await tolak(hisoka, m, `╭═══『 *📦 FILE RAR* 』═══╮\n│\n│ ⚠️ Format RAR terdeteksi!\n│\n│ RAR adalah format arsip yang bisa\n│ berpassword atau tidak.\n│\n│ *Catatan:* Format RAR tidak bisa\n│ dibaca isinya langsung oleh bot.\n│ Coba extract dulu atau kirim\n│ sebagai file ZIP.\n│\n╰═══════════════════════╯`);
                                                                logCommand(m, hisoka, 'wily');
                                                                break;
                                                        } else if (is7z) {
                                                                // ── 7Z FILE ──
                                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                await tolak(hisoka, m, `╭═══『 *📦 FILE 7Z* 』═══╮\n│\n│ ⚠️ Format 7-Zip terdeteksi!\n│\n│ Format 7Z tidak bisa dibaca\n│ isinya langsung oleh bot.\n│ Coba kirim sebagai ZIP.\n│\n╰═══════════════════════╯`);
                                                                logCommand(m, hisoka, 'wily');
                                                                break;
                                                        } else if (isPdf) {
                                                                // ── PDF FILE ──
                                                                await tolak(hisoka, m, `📄 Sedang membaca isi PDF...`);
                                                                try {
                                                                        const pdfText = await extractPdfText(docBuffer);
                                                                        if (!pdfText || pdfText.length < 10) {
                                                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                                                await tolak(hisoka, m, `❌ PDF ini tidak mengandung teks yang bisa dibaca (mungkin berupa scan/gambar). Coba kirim sebagai gambar untuk dianalisis.`);
                                                                                break;
                                                                        }
                                                                        isDocumentMode = true;
                                                                        documentContext = `[ISI PDF]\n${pdfText}`;
                                                                        hasMedia = true;
                                                                        mediaLabel = 'PDF';
                                                                        wilyLog(`\x1b[36m[WilyAI]\x1b[39m PDF dibaca: ${pdfText.length} karakter`);
                                                                } catch (pdfErr) {
                                                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                                        await tolak(hisoka, m, `❌ Gagal baca PDF: ${pdfErr.message}`);
                                                                        break;
                                                                }
                                                        } else if (isText) {
                                                                // ── TEKS / CODE / CSV / JSON / dll ──
                                                                const textContent = docBuffer.toString('utf8').substring(0, 5000);
                                                                isDocumentMode = true;
                                                                documentContext = `[ISI FILE ${docExt.toUpperCase() || 'TEKS'}]\n${textContent}`;
                                                                hasMedia = true;
                                                                mediaLabel = `file ${docExt || 'teks'}`;
                                                                wilyLog(`\x1b[36m[WilyAI]\x1b[39m File teks dibaca: ${textContent.length} karakter`);
                                                        } else if (isImage) {
                                                                // ── GAMBAR YANG DIKIRIM SEBAGAI DOKUMEN ──
                                                                imageBuffer = docBuffer;
                                                                imageMime = docMime || 'image/jpeg';
                                                                hasMedia = true;
                                                                mediaLabel = 'gambar';
                                                        } else {
                                                                // ── FILE TIDAK DIKENAL — Beri info ke AI ──
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
                                                        break;
                                                }
                                        }

                                        // ── DETEKSI MEDIA DARI PESAN YANG DI-REPLY ──
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

                                                                // Magic bytes detection
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
                                                                                break;
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
                                                                        break;
                                                                } else if (isRar) {
                                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                        await tolak(hisoka, m, `📦 *File RAR terdeteksi.*\nBot tidak bisa baca isi RAR langsung. Coba extract dulu atau kirim sebagai ZIP.`);
                                                                        logCommand(m, hisoka, 'wily');
                                                                        break;
                                                                } else if (is7z) {
                                                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                                        await tolak(hisoka, m, `📦 *File 7Z terdeteksi.*\nBot tidak bisa baca isi 7Z. Coba kirim sebagai ZIP.`);
                                                                        logCommand(m, hisoka, 'wily');
                                                                        break;
                                                                } else if (isPdf) {
                                                                        await tolak(hisoka, m, `📄 Sedang membaca PDF...`);
                                                                        const pdfText = await extractPdfText(docBuffer);
                                                                        if (!pdfText || pdfText.length < 10) {
                                                                                await tolak(hisoka, m, `❌ PDF tidak mengandung teks yang bisa dibaca.`);
                                                                                break;
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
                                                                break;
                                                        }
                                                } else if (qtType === 'conversation' || qtType === 'extendedTextMessage') {
                                                        // Reply ke pesan teks orang lain — beri konteks pengirim + isi pesan
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
                                                break;
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

                                        // ── SESSION KEY & HISTORY (harus sebelum imgSearch maupun Gemini) ──
                                        const sessKey = getSessionKey(m);
                                        const isReplyToBot = m.isQuoted && m.quoted?.key?.fromMe;
                                        const useHistory = !m.isGroup || isReplyToBot;

                                        // ── DETEKSI PERMINTAAN CARI GAMBAR ──
                                        const imgSearchQuery = !hasMedia ? detectImageSearchQuery(userQuestion) : null;

                                        if (imgSearchQuery) {
                                                // Ekstrak jumlah gambar yang diminta (max 5)
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
                                                break;
                                        }

                                        // ── MEMORY PERCAKAPAN ──
                                        const historyMessages = useHistory ? getHistory(sessKey) : [];
                                        const hasHistory = historyMessages.length > 0;

                                        // Gabungkan konteks dokumen atau teks quoted ke chatContext
                                        let extraContext = `CATATAN: Kalau user minta cari/kirim gambar, jawab secara natural bahwa gambar sedang dipilih dan akan dikirim oleh bot. Jangan pakai kalimat template yang sama berulang-ulang.`;
                                        if (documentContext) extraContext += `\n\n${documentContext}`;
                                        if (quotedTextContext) extraContext += `\n${quotedTextContext}`;

                                        const stopTyping_cmd = startTyping(hisoka, m);
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

                                        // Bangun final user message (gabung pertanyaan + konteks dokumen jika ada)
                                        const finalUserMsg = isDocumentMode && documentContext
                                                ? `${documentContext}\n\n${userQuestion}`
                                                : quotedTextContext
                                                ? `${quotedTextContext}\n\nPertanyaan user: ${userQuestion}`
                                                : userQuestion;

                                        // Bangun contents array untuk Gemini
                                        let contents;
                                        if (!hasHistory) {
                                                // Percakapan baru: sistem prompt + pertanyaan sekarang
                                                if (imageBuffer && imageBuffer.length > 0 && !isDocumentMode) {
                                                        contents = null; // handled below via askWithImage
                                                } else {
                                                        contents = [{ role: 'user', parts: [{ text: systemPrompt + '\n\n' + finalUserMsg }] }];
                                                }
                                        } else {
                                                // Lanjut percakapan: sistem prompt sebagai pembuka, lalu history, lalu pertanyaan sekarang
                                                if (imageBuffer && imageBuffer.length > 0 && !isDocumentMode) {
                                                        contents = null; // handled below, history passed separately
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
                                                // Untuk gambar/video, gabungkan history teks + pesan media terakhir
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
                                                        const models = ['gemini-flash-latest', 'gemini-2.5-flash', 'gemini-pro-latest'];
                                                        let lastErr = null;
                                                        for (const model of models) {
                                                                try {
                                                                        response = await gemini.chat({ model, contents: visionContents });
                                                                        wilyLog(`\x1b[36m[Gemini Vision]\x1b[0m ✅ Berhasil dengan model: ${model}`);
                                                                        break;
                                                                } catch (err) {
                                                                        wilyError(`\x1b[31m[Gemini Vision]\x1b[0m ❌ Model ${model} gagal: ${err.message}`);
                                                                        lastErr = err;
                                                                }
                                                        }
                                                        if (!response) throw lastErr || new Error('Semua model gagal');
                                                } else {
                                                        response = await gemini.askWithImage(systemPrompt + '\n\n' + finalUserMsg, finalBuffer, finalMime);
                                                }
                                        } else {
                                                response = await gemini.chat({ contents });
                                        }

                                        if (response && response.trim()) {
                                                // Kalau user sudah kirim media (foto/video/dokumen), hapus marker [GAMBAR:...] dari respons AI
                                                // agar bot tidak salah kirim gambar baru padahal user cuma minta analisis/identifikasi
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
                                } catch (error) {
                                        console.error(`\x1b[31m[WilyAI]\x1b[0m ❌ code: ${error.code || 'N/A'} | ${error.message}`);
                                        wilyError('\x1b[31m[WilyAI] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        const msg = error.message || '';
                                        let userMsg;
                                        if (/TOO_MANY_ATTEMPTS|rate.?limit|429/i.test(msg)) {
                                                userMsg = '⏳ *Server AI lagi sibuk banget*\n\nLagi banyak yg pake, coba lagi 1-2 menit ya.';
                                        } else if (/timeout|ETIMEDOUT|ECONNRESET|ENETUNREACH/i.test(msg)) {
                                                userMsg = '🌐 *Koneksi ke AI putus*\n\nSinyal lagi naik turun, coba ulang dikit lagi ya.';
                                        } else if (/Auth|Signup|idToken/i.test(msg)) {
                                                userMsg = '🔐 *Auth AI lagi bermasalah*\n\nLagi diperbaiki otomatis, sabar bentar ya kak.';
                                        } else {
                                                userMsg = `❌ *AI gagal jawab*\n\n_${msg.slice(0, 120)}_`;
                                        }
                                        await tolak(hisoka, m, userMsg);
                                }
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
                                if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur ini hanya untuk owner!');
                                const subCekauto = (query || '').trim().toLowerCase();
                                if (subCekauto === 'gc' || subCekauto === 'grup' || subCekauto === 'group') {
                                        await sendCekautoGrupMsg(hisoka, m);
                                        logCommand(m, hisoka, 'cekauto gc');
                                } else {
                                        await sendCekautoMsg(hisoka, m);
                                        logCommand(m, hisoka, 'cekauto');
                                }
                                break;
                        }

                        case 'botadmin': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                try {
                                        const arg = (query || '').trim().toLowerCase();
                                        const rawData = kvGet('botadmin/botadmin', {});
                                        const entries = Object.entries(rawData);

                                        if (entries.length === 0) {
                                                await tolak(hisoka, m,
                                                        `╭══『 🤖 *BOTADMIN* 』══╮\n` +
                                                        `│\n` +
                                                        `│ ⚠️ Belum ada data grup.\n` +
                                                        `│ Restart bot untuk sync ulang.\n` +
                                                        `│\n` +
                                                        `╰══════════════════════════╯`
                                                );
                                                break;
                                        }

                                        // Filter berdasarkan arg
                                        let filtered = entries;
                                        let filterLabel = 'Semua Grup';
                                        if (arg === 'admin') {
                                                filtered = entries.filter(([, v]) => v === true);
                                                filterLabel = 'Bot Admin ✅';
                                        } else if (arg === 'bukan' || arg === 'bukan admin') {
                                                filtered = entries.filter(([, v]) => v !== true);
                                                filterLabel = 'Bot Bukan Admin ❌';
                                        }

                                        const totalAdmin = entries.filter(([, v]) => v === true).length;
                                        const totalBukan = entries.length - totalAdmin;
                                        const medals = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

                                        const CHUNK = 20;
                                        const chunks = [];
                                        for (let i = 0; i < filtered.length; i += CHUNK) {
                                                chunks.push(filtered.slice(i, i + CHUNK));
                                        }

                                        const now = new Date().toLocaleString('id-ID', {
                                                timeZone: 'Asia/Jakarta',
                                                hour: '2-digit', minute: '2-digit',
                                                day: '2-digit', month: 'short', year: 'numeric'
                                        });

                                        for (let ci = 0; ci < chunks.length; ci++) {
                                                const chunk = chunks[ci];
                                                const offset = ci * CHUNK;
                                                let baris = '';
                                                for (let i = 0; i < chunk.length; i++) {
                                                        const [gid, isAdmin] = chunk[i];
                                                        const grupCache = hisoka.groups?.read ? hisoka.groups.read(gid) : null;
                                                        const namaGrup = grupCache?.subject || gid.split('@')[0];
                                                        const idx = offset + i;
                                                        const nomor = idx < medals.length ? medals[idx] : `*${idx + 1}.*`;
                                                        baris +=
                                                                `│ ${nomor} ${namaGrup}\n` +
                                                                `│    ${isAdmin ? '✅ Bot Admin' : '❌ Bukan Admin'}\n` +
                                                                `│    \`${gid}\`\n` +
                                                                `│\n`;
                                                }

                                                const header = ci === 0
                                                        ? `╭══『 🤖 *BOTADMIN LIST* 』══╮\n` +
                                                          `│\n` +
                                                          `│ 🕐 *Update:* ${now} WIB\n` +
                                                          `│ 📊 *Filter:* ${filterLabel}\n` +
                                                          `│ 📦 *Total:* ${filtered.length} grup\n` +
                                                          `│ ✅ *Admin:* ${totalAdmin} | ❌ *Bukan:* ${totalBukan}\n` +
                                                          `│\n`
                                                        : `╭══『 🤖 *BOTADMIN* (${ci + 1}/${chunks.length}) 』══╮\n│\n`;

                                                const footer = ci === chunks.length - 1
                                                        ? `│ ─────────────────────────────────\n` +
                                                          `│ 💡 Filter: *.botadmin list admin*\n` +
                                                          `│           *.botadmin list bukan*\n` +
                                                          `│           *.botadmin list* (semua)\n` +
                                                          `╰══════════════════════════╯`
                                                        : `╰══════════════════════════╯`;

                                                await tolak(hisoka, m, header + baris + footer);
                                        }

                                        logCommand(m, hisoka, `botadmin list${arg ? ' ' + arg : ''}`);
                                } catch (err) {
                                        console.error('\x1b[31m[BotAdmin] Error:\x1b[39m', err.message);
                                        await tolak(hisoka, m, `❌ Error: ${err.message}`);
                                }
                                break;
                        }

                        case 'ceksw': {
                                const { handleCeksw } = _require(path.resolve('./src/scrape/tools/ceksw.cjs'));
                                await handleCeksw({ hisoka, m, query, tolak, logCommand, fs, path, loadConfig, saveConfig, getJadibotNumber, pruneSwStatsAt, countActiveSW });
                                break;
                        }

                        case 'ceksetting': {
                                if (hisoka?.isMainBot !== false) return;
                                const _isJadibotUserCtx_ceks = (() => {
                                        const _sn = (m.sender || '').split('@')[0].split(':')[0];
                                        const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
                                        return !!_jn && _sn === _jn;
                                })();
                                if (!m.isOwner && !_isJadibotUserCtx_ceks) return;
                                try {
                                        const jadibotNum = getJadibotNumber(hisoka);
                                        const readsw    = getJadibotReadsw(jadibotNum);
                                        const antidel   = getJadibotAntidel(jadibotNum);
                                        const anticall  = getJadibotAnticall(jadibotNum);
                                        const acv       = getJadibotAnticallvid(jadibotNum);
                                        const ao        = getJadibotAutoOnline(jadibotNum);
                                        const at        = getJadibotAutoTyping(jadibotNum);
                                        const ar        = getJadibotAutoRecording(jadibotNum);

                                        const yn  = (v) => v ? '✅ ON' : '❌ OFF';
                                        const yns = (v) => v !== false ? '✅' : '❌';

                                        let txt = `╭═══『 *SETTING JADIBOT* 』═══╮\n`;
                                        txt += `│\n`;
                                        txt += `│ 📖 *Read SW*  : ${yn(readsw.enabled)}\n`;
                                        txt += `│   └ Reaction : ${yn(readsw.autoReaction)}\n`;
                                        txt += `│   └ Delay    : ${readsw.randomDelay ? `Random ${readsw.delayMinMs/1000}-${readsw.delayMaxMs/1000}s` : `Fixed ${readsw.fixedDelayMs/1000}s`}\n`;
                                        txt += `│\n`;
                                        txt += `│ 🗑️ *Anti Del* : ${yn(antidel.enabled)}\n`;
                                        txt += `│   └ Private  : ${yn(antidel.privateChat)}\n`;
                                        txt += `│   └ Group    : ${yn(antidel.groupChat)}\n`;
                                        txt += `│   └ Kirim ke : ${antidel.sendTo || 'self'}\n`;
                                        txt += `│\n`;
                                        txt += `│ 📵 *Anti Call*    : ${yn(anticall.enabled)}\n`;
                                        txt += `│ 📵 *Anti VidCall* : ${yn(acv.enabled)}\n`;
                                        txt += `│\n`;
                                        txt += `│ 🌐 *Auto Online*  : ${yn(ao.enabled)}\n`;
                                        txt += `│   └ Interval : ${ao.intervalSeconds || 30} detik\n`;
                                        txt += `│\n`;
                                        txt += `│ ⌨️ *Auto Typing*  : ${yn(at.enabled)}\n`;
                                        txt += `│   └ Private  : ${yns(at.privateChat)}\n`;
                                        txt += `│   └ Group    : ${yns(at.groupChat)}\n`;
                                        txt += `│   └ Delay    : ${at.delaySeconds || 5} detik\n`;
                                        txt += `│\n`;
                                        txt += `│ 🎙️ *Auto Recording*: ${yn(ar.enabled)}\n`;
                                        txt += `│   └ Private  : ${yns(ar.privateChat)}\n`;
                                        txt += `│   └ Group    : ${yns(ar.groupChat)}\n`;
                                        txt += `│   └ Delay    : ${ar.delaySeconds || 5} detik\n`;
                                        txt += `│\n`;
                                        const emojiData = listJadibotEmojis(jadibotNum);
                                        const _eMode = emojiData.mode === 'custom' ? '🎨 Custom' : '🌐 Default (bot utama)';
                                        txt += `│ 😊 *Emoji SW* : ${_eMode}\n`;
                                        txt += `│   └ Total   : ${emojiData.count} emoji tersimpan\n`;
                                        if (emojiData.count > 0 && emojiData.mode === 'custom') txt += `│   └ Daftar : ${emojiData.emojis.slice(0, 20).join(' ')}${emojiData.count > 20 ? ' ...' : ''}\n`;
                                        txt += `│\n`;
                                        txt += `│ *Ubah via:*\n`;
                                        txt += `│ .readsw • .antidel • .anticall\n`;
                                        txt += `│ .anticallvid • .online\n`;
                                        txt += `│ .typing • .recording\n`;
                                        txt += `│ .emojidefault • .emojicustom\n`;
                                        txt += `│ .emojiadd • .emojidel\n`;
                                        txt += `│ .emojiclear • .emojilist\n`;
                                        txt += `│\n`;
                                        txt += `╰══════════════════════╯`;

                                        await tolak(hisoka, m, txt);
                                        logCommand(m, hisoka, 'ceksetting');
                                } catch (err) {
                                        await tolak(hisoka, m, `❌ Error: ${err.message}`);
                                }
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
                                if (!m.prefix && m.query) break;

                                if (m.isQuoted && !m.query) {
                                        try {
                                                const quotedKey = m.quoted.key;
                                                const isOwnMessage = quotedKey.fromMe === true;

                                                if (m.isGroup) {
                                                        const botAdminData = kvGet('botadmin/botadmin', {});
                                                        const isBotGroupAdmin = botAdminData[m.from] === true;

                                                        if (!isOwnMessage && !isBotGroupAdmin) {
                                                                await tolak(hisoka, m, '❌ Bot bukan admin di grup ini!\nHanya bisa hapus pesan bot sendiri.');
                                                                break;
                                                        }
                                                } else {
                                                        if (!isOwnMessage) {
                                                                await tolak(hisoka, m, '❌ Hanya bisa hapus pesan bot sendiri di chat pribadi.');
                                                                break;
                                                        }
                                                }

                                                const deleteKey = {
                                                        remoteJid: m.from,
                                                        fromMe: quotedKey.fromMe,
                                                        id: quotedKey.id,
                                                        ...(m.isGroup && quotedKey.participant ? { participant: quotedKey.participant } : {}),
                                                };
                                                await hisoka.sendMessage(m.from, { delete: deleteKey });
                                                try { await hisoka.sendMessage(m.from, { delete: m.key }); } catch (_) {}
                                        } catch (error) {
                                                await tolak(hisoka, m, `❌ Gagal menghapus pesan: ${error.message}`);
                                        }
                                        break;
                                }

                                // Del emoji: hanya main bot dan owner
                                if (!isMainBot(hisoka)) break;
                                if (!m.isOwner) return;
                                if (!query || !query.toLowerCase().startsWith('emoji')) break;
                                try {
                                        const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
                                        
                                        const emojiInput = query.replace(/^emoji\s*/i, '').trim();
                                        
                                        if (!emojiInput) {
                                                await tolak(hisoka, m, `❌ Format: del emoji 😊,😄\n\nContoh:\ndel emoji 😊\ndel emoji 😊,😄,😁`);
                                                break;
                                        }

                                        const emojisToDelete = emojiInput.split(',').map(e => e.trim()).filter(e => e);
                                        
                                        if (emojisToDelete.length === 0) {
                                                await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                                                break;
                                        }

                                        const results = deleteEmojis(emojisToDelete);
                                        const newList = listEmojis();
                                        
                                        let response = `╭═══『 *DEL EMOJI* 』═══╮\n│\n`;

if (results.deleted.length > 0) {
    response += `│ ✅ *Dihapus (${results.deleted.length}):* ${results.deleted.join(',')}\n`;
}

if (results.notFound.length > 0) {
    response += `│ ⚠️ *Tidak ada (${results.notFound.length}):* ${results.notFound.join(',')}\n`;
}

response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
if (newList.emojis.length > 0) {
    response += `│ *Daftar:* ${newList.emojis.join(',')}\n`;
}
response += `╰═════════════════╯`;
                                        
                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'del emoji');
                                } catch (error) {
                                        console.error('\x1b[31m[DelEmoji] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'list': {
                                const { handleListEmoji } = _require(path.resolve('./src/scrape/tools/info.cjs'));
                                await handleListEmoji({ hisoka, m, query, tolak, logCommand, isMainBot });
                                break;
                        }
                        case 'emojiadd': {
                                if (!m.isOwner && hisoka?.isMainBot !== false) return;
                                try {
                                        const _isJb = hisoka?.isMainBot === false;
                                        const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                                        if (!query) {
                                                await tolak(hisoka, m, `❌ Format salah!\n\nContoh:\n.emojiadd 😊\n.emojiadd 😊,😄,😁`);
                                                break;
                                        }

                                        const emojisToAdd = query.split(',').map(e => e.trim()).filter(e => e);

                                        if (emojisToAdd.length === 0) {
                                                await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan');
                                                break;
                                        }

                                        let results, newList;
                                        if (_isJb) {
                                                results = addJadibotEmojis(_jbNum, emojisToAdd);
                                                newList = listJadibotEmojis(_jbNum);
                                        } else {
                                                const { addEmojis, listEmojis } = await import('../helper/emoji.js');
                                                results = addEmojis(emojisToAdd);
                                                newList = listEmojis();
                                        }

                                        let response = `╭═══『 *ADD EMOJI* 』═══╮\n│\n`;
                                        if (_isJb) response += `│ 👤 *Emoji milik:* +${_jbNum}\n│\n`;
                                        if (results.added.length > 0) response += `│ ✅ *Ditambah (${results.added.length}):* ${results.added.join(' ')}\n`;
                                        if (results.alreadyExists.length > 0) response += `│ ⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(' ')}\n`;
                                        response += `│\n│ 📊 *Total:* ${newList.count} emoji\n`;
                                        if (newList.emojis.length > 0) response += `│ *Daftar:* ${newList.emojis.join(' ')}\n`;
                                        response += `╰═════════════════╯`;

                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojiadd');
                                } catch (error) {
                                        console.error('\x1b[31m[EmojiAdd] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'emojidel': {
                                if (!m.isOwner && hisoka?.isMainBot !== false) return;
                                try {
                                        const _isJb = hisoka?.isMainBot === false;
                                        const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                                        if (!query) {
                                                await tolak(hisoka, m, `❌ Format salah!\n\nContoh:\n.emojidel 😊\n.emojidel 😊,😄,😁`);
                                                break;
                                        }

                                        const emojisToDelete = query.split(',').map(e => e.trim()).filter(e => e);

                                        if (emojisToDelete.length === 0) {
                                                await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                                                break;
                                        }

                                        let results, newList;
                                        if (_isJb) {
                                                results = deleteJadibotEmojis(_jbNum, emojisToDelete);
                                                newList = listJadibotEmojis(_jbNum);
                                        } else {
                                                const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
                                                results = deleteEmojis(emojisToDelete);
                                                newList = listEmojis();
                                        }

                                        let response = `╭═══『 *DEL EMOJI* 』═══╮\n│\n`;
                                        if (_isJb) response += `│ 👤 *Emoji milik:* +${_jbNum}\n│\n`;
                                        if (results.deleted.length > 0) response += `│ ✅ *Dihapus (${results.deleted.length}):* ${results.deleted.join(' ')}\n`;
                                        if (results.notFound.length > 0) response += `│ ⚠️ *Tidak ada (${results.notFound.length}):* ${results.notFound.join(' ')}\n`;
                                        response += `│\n│ 📊 *Sisa:* ${newList.count} emoji\n`;
                                        if (newList.emojis.length > 0) response += `│ *Daftar:* ${newList.emojis.join(' ')}\n`;
                                        response += `╰═════════════════╯`;

                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojidel');
                                } catch (error) {
                                        console.error('\x1b[31m[EmojiDel] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'emojilist': {
                                if (!m.prefix && m.query) break;
                                if (!m.isOwner && hisoka?.isMainBot !== false) return;
                                try {
                                        const _isJb = hisoka?.isMainBot === false;
                                        const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;

                                        let data;
                                        if (_isJb) {
                                                data = listJadibotEmojis(_jbNum);
                                        } else {
                                                const { listEmojis } = await import('../helper/emoji.js');
                                                data = listEmojis();
                                        }

                                        const _modeLabel = _isJb
                                                ? (data.mode === 'custom' ? '🎨 Custom (emoji kamu sendiri)' : '🌐 Default (ikut bot utama)')
                                                : null;

                                        let response = `╭═══『 *LIST EMOJI* 』═══╮\n│\n`;
                                        if (_isJb) {
                                                response += `│ 👤 *Milik:* +${_jbNum}\n`;
                                                response += `│ ⚙️ *Mode:* ${_modeLabel}\n│\n`;
                                        }
                                        response += `│ 📊 *Total:* ${data.count} emoji\n│\n`;
                                        if (data.emojis.length > 0) {
                                                response += `│ *Daftar:* ${data.emojis.join(' ')}\n`;
                                        } else {
                                                response += `│ ❌ Belum ada emoji tersimpan\n`;
                                        }
                                        response += `│\n│ *Command:*\n`;
                                        response += `│ .emojiadd 😊,😄\n`;
                                        response += `│ .emojidel 😊,😄\n`;
                                        if (_isJb) {
                                                response += `│ .emojidefault → pakai emoji bot utama\n`;
                                                response += `│ .emojicustom → pakai emoji kamu sendiri\n`;
                                        }
                                        response += `╰═════════════════╯`;

                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojilist');
                                } catch (error) {
                                        console.error('\x1b[31m[EmojiList] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'emojidefault': {
                                if (hisoka?.isMainBot !== false) return;
                                if (!m.prefix && m.query) break;
                                try {
                                        const _jbNum = getJadibotNumber(hisoka);
                                        const count = resetToDefaultEmojis(_jbNum);
                                        let response = `╭═══『 *DEFAULT EMOJI* 』═══╮\n│\n`;
                                        response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                                        response += `│ ✅ Mode diubah ke *Default*\n`;
                                        response += `│\n│ 🌐 Reaksi SW sekarang pakai\n`;
                                        response += `│ emoji dari *bot utama* (${count} emoji)\n`;
                                        response += `│\n│ 💡 Ketik *.emojicustom* untuk\n`;
                                        response += `│ balik ke emoji kamu sendiri\n│\n`;
                                        response += `│ *.emojilist* — cek daftar emoji\n`;
                                        response += `╰═════════════════════╯`;
                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojidefault');
                                } catch (error) {
                                        console.error('\x1b[31m[EmojiDefault] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'emojicustom': {
                                if (hisoka?.isMainBot !== false) return;
                                if (!m.prefix && m.query) break;
                                try {
                                        const _jbNum = getJadibotNumber(hisoka);
                                        setCustomEmojiMode(_jbNum);
                                        const data = listJadibotEmojis(_jbNum);
                                        let response = `╭═══『 *CUSTOM EMOJI* 』═══╮\n│\n`;
                                        response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                                        response += `│ ✅ Mode diubah ke *Custom*\n`;
                                        response += `│\n│ 🎨 Reaksi SW sekarang pakai\n`;
                                        response += `│ emoji dari *file kamu sendiri*\n`;
                                        response += `│ (${data.count} emoji tersimpan)\n`;
                                        response += `│\n│ 💡 Atur emoji kamu:\n`;
                                        response += `│ .emojiadd 😊,😄 — tambah\n`;
                                        response += `│ .emojidel 😊 — hapus\n`;
                                        response += `│ .emojiclear — reset ke seed WA\n`;
                                        response += `│ .emojilist — lihat daftar\n`;
                                        response += `│ .emojidefault — balik ke default\n`;
                                        response += `╰═════════════════════╯`;
                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojicustom');
                                } catch (error) {
                                        console.error('\x1b[31m[EmojiCustom] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'emojiclear': {
                                if (hisoka?.isMainBot !== false) return;
                                if (!m.prefix && m.query) break;
                                try {
                                        const _jbNum = getJadibotNumber(hisoka);
                                        const seedEmojis = clearJadibotEmojis(_jbNum);
                                        let response = `╭═══『 *CLEAR EMOJI* 』═══╮\n│\n`;
                                        response += `│ 👤 *Milik:* +${_jbNum}\n│\n`;
                                        response += `│ ✅ Emoji berhasil di-reset!\n│\n`;
                                        response += `│ 💚 Sekarang pakai *1 emoji* seed WA:\n`;
                                        response += `│ ${seedEmojis.join(' ')}\n│\n`;
                                        response += `│ ⚙️ Mode otomatis: *Custom*\n│\n`;
                                        response += `│ 💡 Tambah emoji kamu sendiri:\n`;
                                        response += `│ .emojiadd 😊,😄,😁\n│\n`;
                                        response += `│ Balik ke 1900 emoji bot utama:\n`;
                                        response += `│ .emojidefault\n`;
                                        response += `╰═════════════════════╯`;
                                        await tolak(hisoka, m, response);
                                        logCommand(m, hisoka, 'emojiclear');
                                } catch (error) {
                                        console.error('\x1b[31m[ClearEmoji] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
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
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                try {
                                        const config = loadConfig();
                                        const ac = config.autoCleaner || { enabled: true, intervalHours: 6 };
                                        const args = query ? query.toLowerCase().split(' ') : [];

                                        if (args.length === 0) {
                                                const statusText =
                                                        `╔════════════════════════╗\n` +
                                                        `║  🧹 *AUTO CLEANER*  🧹  ║\n` +
                                                        `╚════════════════════════╝\n\n` +
                                                        `📊 *Status:* ${ac.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                                                        `⏱️ *Interval:* Setiap ${ac.intervalHours || 6} jam\n\n` +
                                                        `📋 *Fungsi:*\n` +
                                                        `Hapus otomatis file sementara (hasil download) di folder tmp/ setiap beberapa jam.\n\n` +
                                                        `📋 *Perintah:*\n` +
                                                        `• *.autocleaner on* — Aktifkan\n` +
                                                        `• *.autocleaner off* — Nonaktifkan\n` +
                                                        `• *.autocleaner now* — Jalankan pembersihan sekarang\n` +
                                                        `• *.autocleaner interval <jam>* — Ubah interval (contoh: interval 3)`;
                                                await tolak(hisoka, m, statusText);
                                                break;
                                        }

                                        if (args[0] === 'on') {
                                                if (ac.enabled !== false) {
                                                        await tolak(hisoka, m, 'ℹ️ Auto Cleaner sudah aktif.');
                                                } else {
                                                        config.autoCleaner = { ...ac, enabled: true };
                                                        saveConfig(config);
                                                        restartAutoCleaner();
                                                        await tolak(hisoka, m, `✅ *Auto Cleaner diaktifkan!*\n\nFile tmp/ akan dibersihkan otomatis setiap ${ac.intervalHours || 6} jam.`);
                                                }
                                        } else if (args[0] === 'off') {
                                                if (ac.enabled === false) {
                                                        await tolak(hisoka, m, 'ℹ️ Auto Cleaner sudah nonaktif.');
                                                } else {
                                                        config.autoCleaner = { ...ac, enabled: false };
                                                        saveConfig(config);
                                                        stopAutoCleaner();
                                                        await tolak(hisoka, m, `✅ *Auto Cleaner dinonaktifkan.*\n\nFile tmp/ tidak akan dibersihkan otomatis.`);
                                                }
                                        } else if (args[0] === 'now') {
                                                const result = clearOldFiles(0);
                                                await tolak(hisoka, m, 
                                                        `✅ *Pembersihan selesai!*\n\n` +
                                                        `🗑️ File dihapus: ${result.deleted}\n` +
                                                        `💾 Ruang dibebaskan: ${result.sizeFormatted || '0 B'}`
                                                );
                                        } else if (args[0] === 'interval') {
                                                const jam = parseInt(args[1]);
                                                if (isNaN(jam) || jam < 1 || jam > 168) {
                                                        await tolak(hisoka, m, '❌ Interval harus angka antara 1–168 jam.\n\nContoh: *.autocleaner interval 3*');
                                                } else {
                                                        config.autoCleaner = { ...ac, enabled: true, intervalHours: jam };
                                                        saveConfig(config);
                                                        restartAutoCleaner();
                                                        await tolak(hisoka, m, `✅ *Interval Auto Cleaner diubah!*\n\n⏱️ Sekarang: setiap *${jam} jam*\n\nPerubahan juga tersimpan di config.json.`);
                                                }
                                        } else {
                                                await tolak(hisoka, m, '❌ Perintah tidak valid.\n\nKetik *.autocleaner* untuk melihat bantuan.');
                                        }

                                        logCommand(m, hisoka, 'autocleaner');
                                } catch (error) {
                                        console.error('\x1b[31m[AutoCleaner Cmd] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
                                }
                                break;
                        }

                        case 'sessioncleaner': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                try {
                                        const config = loadConfig();
                                        const sc = config.sessionCleaner || { enabled: true };
                                        const args = query ? query.toLowerCase().split(' ') : [];

                                        if (args.length === 0) {
                                                const statusText =
                                                        `╔══════════════════════════╗\n` +
                                                        `║  🔑 *SESSION CLEANER*  🔑  ║\n` +
                                                        `╚══════════════════════════╝\n\n` +
                                                        `📊 *Status:* ${sc.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n\n` +
                                                        `📋 *Fungsi:*\n` +
                                                        `Hapus otomatis pre-key & session WhatsApp yang sudah usang saat bot mulai. Menghemat memori dan storage.\n\n` +
                                                        `📋 *Perintah:*\n` +
                                                        `• *.sessioncleaner on* — Aktifkan\n` +
                                                        `• *.sessioncleaner off* — Nonaktifkan\n` +
                                                        `• *.sessioncleaner now* — Jalankan pembersihan session sekarang`;
                                                await tolak(hisoka, m, statusText);
                                                break;
                                        }

                                        if (args[0] === 'on') {
                                                if (sc.enabled !== false) {
                                                        await tolak(hisoka, m, 'ℹ️ Session Cleaner sudah aktif.');
                                                } else {
                                                        config.sessionCleaner = { enabled: true };
                                                        saveConfig(config);
                                                        await tolak(hisoka, m, `✅ *Session Cleaner diaktifkan!*\n\nPre-key & session lama akan dibersihkan otomatis saat bot mulai.`);
                                                }
                                        } else if (args[0] === 'off') {
                                                if (sc.enabled === false) {
                                                        await tolak(hisoka, m, 'ℹ️ Session Cleaner sudah nonaktif.');
                                                } else {
                                                        config.sessionCleaner = { enabled: false };
                                                        saveConfig(config);
                                                        await tolak(hisoka, m, `✅ *Session Cleaner dinonaktifkan.*\n\nPre-key & session lama tidak akan dibersihkan otomatis.`);
                                                }
                                        } else if (args[0] === 'now') {
                                                const sessionDir = global.sessionDir || '';
                                                if (!sessionDir) {
                                                        await tolak(hisoka, m, '❌ Direktori session tidak ditemukan.');
                                                        break;
                                                }
                                                cleanStaleSessionFiles(sessionDir, { skipConfigCheck: true });
                                                await tolak(hisoka, m, `✅ *Pembersihan session selesai!*\n\nPre-key & session lama sudah dibersihkan.`);
                                        } else {
                                                await tolak(hisoka, m, '❌ Perintah tidak valid.\n\nKetik *.sessioncleaner* untuk melihat bantuan.');
                                        }

                                        logCommand(m, hisoka, 'sessioncleaner');
                                } catch (error) {
                                        console.error('\x1b[31m[SessionCleaner Cmd] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
                                }
                                break;
                        }

                        case 'setbrowser':
                        case 'aturbrowser': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                try {
                                        const config  = loadConfig();
                                        const args    = (query || '').trim().toLowerCase().split(/\s+/);
                                        const vKey    = args[0] || '';
                                        const konfirm = args[1] || '';

                                        // ── Deteksi reply ke pesan list ──
                                        const _listPending = listAturBrowserMap.get(m.sender);
                                        if (!vKey && m.quoted?.key?.id && _listPending && m.quoted.key.id === _listPending.keyId && Date.now() < _listPending.expiresAt) {
                                                // body kosong tapi reply ke list → abaikan, tampilkan list lagi
                                        } else if (m.quoted?.key?.id && _listPending && m.quoted.key.id === _listPending.keyId && Date.now() < _listPending.expiresAt && BROWSER_LIST.find(b => b.key === vKey)) {
                                                // reply ke list dengan vKey valid → langsung masuk alur pilihan (lanjut ke bawah)
                                        } else if (!vKey) {
                                                // ── Tidak ada argumen → tampilkan daftar ──
                                                // Gunakan global.__activeBrowserKey agar sesuai dengan browser yang BENAR-BENAR terhubung
                                                const currentKey    = (global.__activeBrowserKey || config.browserDevice?.selected || 'v1').toLowerCase();
                                                const _abHasPairNum = !!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '');
                                                const listTeks   = BROWSER_LIST.map(b =>
                                                        `│ ${b.key === currentKey ? '✅' : '▪️'} *${b.key.toUpperCase()}* — ${b.label}`
                                                ).join('\n');
                                                const listMsg = await tolak(hisoka, m,
                                                        `╭═══════════════════════════╮\n` +
                                                        `║  🖥️  *ATUR BROWSER BOT*  🖥️  ║\n` +
                                                        `╚═══════════════════════════╝\n\n` +
                                                        `📱 *Browser Aktif Saat Ini:*\n` +
                                                        `✅ *${global.__activeBrowserArr && global.__activeBrowserArr.length >= 2 ? `${global.__activeBrowserArr[0]} + ${global.__activeBrowserArr[1]} (${global.__activeBrowserArr[2] || ''})`.trim() : (BROWSER_LIST.find(b => b.key === currentKey) || BROWSER_LIST[0]).label}*\n\n` +
                                                        `📋 *Pilihan Browser:*\n` +
                                                        `${listTeks}\n\n` +
                                                        `📌 *Cara ganti:*\n` +
                                                        `↩️ *Reply pesan ini* dengan *v2* untuk pilih\n` +
                                                        `*.setbrowser v2* — ketik manual\n` +
                                                        `*.setbrowser v2 ya* — langsung ganti tanpa konfirmasi\n\n` +
                                                        `┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄┄\n` +
                                                        `╭─────────────────────────╮\n` +
                                                        `│  ⚠️  *HARAP BACA DULU!*  ⚠️  │\n` +
                                                        `╰─────────────────────────╯\n` +
                                                        `ℹ️ *Cara kerja (tanpa downtime):*\n` +
                                                        `  • Koneksi baru dibuka di background\n` +
                                                        `  • *${_abHasPairNum ? 'Pairing code' : 'QR Code'} dikirim ke chat ini*\n` +
                                                        `  • Bot lama tetap aktif sampai terhubung\n` +
                                                        `  • Session lama dihapus setelah sukses\n\n` +
                                                        `🔁 Yang perlu kamu lakukan:\n` +
                                                        `  • Buka *WhatsApp* di HP kamu\n` +
                                                        `  • Masuk ke *Perangkat Tertaut*\n` +
                                                        `  • ${_abHasPairNum ? 'Input *pairing code* yang dikirim bot' : 'Scan *QR Code* yang dikirim bot'}\n\n` +
                                                        `〽️ *Lanjutkan hanya jika siap!*`
                                                );
                                                listAturBrowserMap.set(m.sender, { keyId: listMsg?.key?.id, expiresAt: Date.now() + 120000 });
                                                break;
                                        }

                                        // ── Validasi pilihan ──
                                        const pilihan = BROWSER_LIST.find(b => b.key === vKey);
                                        if (!pilihan) {
                                                await tolak(hisoka, m,
                                                        `❌ *Pilihan tidak valid!*\n\n` +
                                                        `Pilihan tersedia: ${BROWSER_LIST.map(b => `*${b.key.toUpperCase()}*`).join(', ')}\n\n` +
                                                        `Ketik *.setbrowser* untuk lihat semua pilihan.`
                                                );
                                                break;
                                        }

                                        const currentKey = (global.__activeBrowserKey || config.browserDevice?.selected || 'v1').toLowerCase();
                                        if (currentKey === pilihan.key) {
                                                await tolak(hisoka, m, `ℹ️ Browser sudah menggunakan *${pilihan.label}*. Tidak ada perubahan.`);
                                                break;
                                        }

                                        // ── Helper eksekusi dengan animasi edit pesan ──
                                        const _abExec = async (progMsg) => {
                                                const _edit = async (txt) => {
                                                        try { await hisoka.sendMessage(m.from, { edit: progMsg.key, text: txt }); } catch {}
                                                };
                                                const _wait = (ms) => new Promise(r => setTimeout(r, ms));

                                                const _abExecHasPair = !!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '');
                                                await _edit(
                                                        `⏳ *Memulai koneksi baru...*\n` +
                                                        `🖥️ Browser: *${pilihan.label}*\n\n` +
                                                        `🔄 Bot lama tetap aktif sampai koneksi baru berhasil.\n` +
                                                        `📲 *${_abExecHasPair ? 'Pairing code' : 'QR Code'} akan dikirim ke chat ini.*`
                                                );
                                                logCommand(m, hisoka, 'setbrowser');
                                                const { startBrowserSwitch: _abSwitch } = await import('../helper/browserSwitch.js');
                                                _abSwitch(hisoka, pilihan.value, m.from, _edit, pilihan.key).catch(async (e) => {
                                                        await hisoka.sendMessage(m.from, { text: `❌ *Error browser switch:* ${e?.message}` }).catch(() => {});
                                                });
                                        };

                                        // ── Konfirmasi langsung: .setbrowser v2 ya ──
                                        if (konfirm === 'ya' || konfirm === 'yes') {
                                                pendingAturBrowser.delete(m.sender);
                                                const progMsg = await tolak(hisoka, m, `⏳ *Memproses...*`);
                                                await _abExec(progMsg);
                                                break;
                                        }

                                        // ── Konfirmasi pending sudah ada → proses ──
                                        const _abPending = pendingAturBrowser.get(m.sender);
                                        if (_abPending && _abPending.vKey === vKey && Date.now() < _abPending.expiresAt) {
                                                clearTimeout(_abPending.timer);
                                                pendingAturBrowser.delete(m.sender);
                                                const progMsg = await m.reply(`⏳ *Memproses...*`);
                                                await _abExec(progMsg);
                                                break;
                                        }

                                        // ── Step 1: kirim pesan konfirmasi, simpan pending ──
                                        pendingAturBrowser.delete(m.sender);
                                        const konfirmMsg = await tolak(hisoka, m,
                                                `╭══════════════════════════╮\n` +
                                                `║  ⚠️  *KONFIRMASI GANTI BROWSER*  ⚠️  ║\n` +
                                                `╰══════════════════════════╯\n\n` +
                                                `🖥️ *Pilihan:* ${pilihan.label}\n` +
                                                `📦 *Detail:* ${pilihan.value.join(' | ')}\n\n` +
                                                `ℹ️ *Proses (tanpa downtime):*\n` +
                                                `• Koneksi baru dibuka dengan browser baru\n` +
                                                `• *${!!(process.env.BOT_NUMBER_PAIR || config?.botNumber || '').replace(/[^0-9]/g, '') ? 'Pairing code' : 'QR Code'} dikirim ke chat ini*\n` +
                                                `• Bot lama tetap aktif sampai terhubung\n` +
                                                `• Session lama dihapus *setelah* koneksi baru berhasil\n\n` +
                                                `✅ *Reply pesan ini* dengan *ya* untuk lanjut\n` +
                                                `❌ *Reply pesan ini* dengan *tidak* untuk batal\n\n` +
                                                `⏳ *Berlaku 30 detik...*`
                                        );
                                        const _abTimer = setTimeout(() => {
                                                if (pendingAturBrowser.has(m.sender)) {
                                                        pendingAturBrowser.delete(m.sender);
                                                        hisoka.sendMessage(m.from, {
                                                                edit: konfirmMsg?.key,
                                                                text: `⏳ *Konfirmasi kadaluarsa.* Ketik *.setbrowser* lagi untuk memulai ulang.`
                                                        }).catch(() => {});
                                                }
                                        }, 30000);
                                        pendingAturBrowser.set(m.sender, { vKey, expiresAt: Date.now() + 30000, timer: _abTimer, botMsg: konfirmMsg });

                                } catch (error) {
                                        console.error('\x1b[31m[AturBrowser Cmd] Error:\x1b[39m', error.message);
                                        await tolak(hisoka, m, `Terjadi kesalahan: ${error.message}`);
                                }
                                break;
                        }

                        case 'batalbrowser': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                if (pendingAturBrowser.has(m.sender)) {
                                        const _p = pendingAturBrowser.get(m.sender);
                                        clearTimeout(_p?.timer);
                                        pendingAturBrowser.delete(m.sender);
                                        if (_p?.botMsg?.key) {
                                                await hisoka.sendMessage(m.from, { edit: _p.botMsg.key, text: `❌ *Ganti browser dibatalkan.*` }).catch(() => {});
                                        }
                                        await tolak(hisoka, m, `❌ *Ganti browser dibatalkan.*`);
                                } else {
                                        await tolak(hisoka, m, `ℹ️ Tidak ada konfirmasi ganti browser yang aktif.`);
                                }
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
                                await handleStikerpack({ hisoka, m, query, tolak, logCommand, path, zipFiles, sendStickerPackCard });
                                break;
                        }

                        case 'stiker':
                        case 'sticker':
                        case 's': {
                                try {
                                        const os = await import('os');
                                        const execAsync = util.promisify(exec);
                                        const config = loadConfig();
                                        const stickerConfig = config.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' };

                                        const args = query ? query.split(' ') : [];

                                        if (args[0] === 'author' || args[0] === 'pack') {
                                                const type = args[0];
                                                let value = args.slice(1).join(' ').trim();
                                                if (!value) {
                                                        await tolak(hisoka, m, `❌ Masukkan nama ${type}!\n\nContoh: .s ${type} ${type === 'author' ? 'Wily' : 'Bot Pack'}`);
                                                        break;
                                                }
                                                if (value.length > 50) value = value.substring(0, 50);
                                                const freshConfig = loadConfig();
                                                if (!freshConfig.sticker) freshConfig.sticker = { pack: 'WhatsApp Bot', author: 'Wilykun' };
                                                freshConfig.sticker[type] = value;
                                                saveConfig(freshConfig);
                                                await tolak(hisoka, m, `✅ Sticker ${type} berhasil diubah menjadi: *${value}*`);
                                                logCommand(m, hisoka, `sticker-set-${type}`);
                                                break;
                                        }

                                        const stickerCurrentType = getMediaTypeFromMessage(m);
                                        const stickerQuotedType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';
                                        const canUseCurrentMedia = m.isMedia && (stickerCurrentType === 'imageMessage' || stickerCurrentType === 'videoMessage');
                                        const canUseQuotedMedia = m.isQuoted && (stickerQuotedType === 'imageMessage' || stickerQuotedType === 'videoMessage');

                                        if (!canUseCurrentMedia && !canUseQuotedMedia) {
                                                if (query) break;
                                                const freshConfig = loadConfig();
                                                const sc = freshConfig.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' };
                                                const pfxS = m.prefix || '.';
                                                let text = `╭═══『 🎭 *STICKER MAKER* 』═══╮\n│\n`;
                                                text += `│ 📦 *Pack   :* ${sc.pack}\n`;
                                                text += `│ ✍️ *Author :* ${sc.author}\n`;
                                                text += `│\n`;
                                                text += `│ 📋 *Cara Pakai:*\n`;
                                                text += `│ • Kirim/reply 🖼️ *gambar* + ${pfxS}s\n`;
                                                text += `│ • Kirim/reply 🎥 *video* + ${pfxS}s\n`;
                                                text += `│   _(video otomatis jadi animated sticker)_\n`;
                                                text += `│\n`;
                                                text += `│ ⚙️ *Pengaturan:*\n`;
                                                text += `│ • ${pfxS}s author <nama>\n`;
                                                text += `│ • ${pfxS}s pack <nama>\n`;
                                                text += `│\n`;
                                                text += `│ 🏷️ *Alias:* ${pfxS}s · ${pfxS}stiker · ${pfxS}sticker\n`;
                                                text += `╰══════════════════════╯`;
                                                await tolak(hisoka, m, text);
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

                                        let mediaBuffer;
                                        let mediaType;
                                        let videoDuration = 0;

                                        if (canUseCurrentMedia) {
                                                mediaBuffer = await downloadMediaBuffer(hisoka, m);
                                                mediaType = stickerCurrentType;
                                                if (stickerCurrentType === 'videoMessage') {
                                                        videoDuration = m.message?.videoMessage?.seconds ||
                                                                m.content?.seconds ||
                                                                unwrapMessagePayload(m)?.videoMessage?.seconds ||
                                                                0;
                                                }
                                        } else if (canUseQuotedMedia) {
                                                mediaBuffer = await getQuotedMediaBuffer(hisoka, m);
                                                mediaType = stickerQuotedType;
                                                if (stickerQuotedType === 'videoMessage') {
                                                        videoDuration = m.quoted?.message?.videoMessage?.seconds ||
                                                                m.quoted?.content?.seconds ||
                                                                m.quoted?.raw?.videoMessage?.seconds ||
                                                                unwrapMessagePayload(m.quoted)?.videoMessage?.seconds ||
                                                                0;
                                                }
                                        } else {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Reply/kirim *gambar* atau *video* untuk membuat sticker!');
                                                break;
                                        }

                                        // Cek durasi video — tolak jika lebih dari 10 detik
                                        if (mediaType === 'videoMessage' && videoDuration > 10) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, `❌ Video terlalu panjang! (${videoDuration} detik)\nMaksimal *10 detik* untuk sticker animasi.`);
                                                break;
                                        }

                                        if (!mediaBuffer || mediaBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal download media, coba lagi');
                                                break;
                                        }

                                        const freshConfig = loadConfig();
                                        const freshSC = freshConfig.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' };

                                        let stickerBuffer;

                                        if (mediaType === 'videoMessage') {
                                                // VIDEO → Animated Sticker via ffmpeg (lebih akurat & berkualitas)
                                                const tmpDir = os.default.tmpdir();
                                                const tmpIn  = path.join(tmpDir, `stk_in_${Date.now()}.mp4`);
                                                const tmpOut = path.join(tmpDir, `stk_out_${Date.now()}.webp`);
                                                try {
                                                        fs.writeFileSync(tmpIn, mediaBuffer);
                                                        // Trim max 10 detik, animated WebP via libwebp_anim
                                                        // Max 10 detik agar animated sticker bisa bergerak di WA Business & WA Messenger semua versi HP
                                                        const MAX_STICKER_BYTES = 500 * 1024; // 500KB batas WA mobile
                                                        let quality = 80;
                                                        let fps = 15;
                                                        let webpBuf;

                                                        // Loop kompresi otomatis sampai di bawah 500KB (async agar koneksi WA tidak putus)
                                                        while (true) {
                                                                await execAsync(
                                                                        `ffmpeg -y -i "${tmpIn}" ` +
                                                                        `-vf "fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba" ` +
                                                                        `-vcodec libwebp_anim -lossless 0 -quality ${quality} -loop 0 -an "${tmpOut}"`,
                                                                        { timeout: 60000 }
                                                                );
                                                                webpBuf = fs.readFileSync(tmpOut);
                                                                if (webpBuf.length <= MAX_STICKER_BYTES) break;
                                                                // File masih >500KB, turunkan quality & fps secara bertahap
                                                                if (quality > 30) {
                                                                        quality -= 15;
                                                                } else if (fps > 8) {
                                                                        fps -= 3;
                                                                        quality = 50;
                                                                } else {
                                                                        // Sudah minimum, kirim apa adanya
                                                                        break;
                                                                }
                                                        }

                                                        // Tulis langsung webp (WA tetap baca sebagai sticker)
                                                        stickerBuffer = webpBuf;
                                                } finally {
                                                        try { fs.unlinkSync(tmpIn); } catch {}
                                                        try { fs.unlinkSync(tmpOut); } catch {}
                                                }
                                        } else {
                                                // GAMBAR → Static Sticker via wa-sticker-formatter
                                                const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
                                                const sticker = new Sticker(mediaBuffer, {
                                                        pack: freshSC.pack,
                                                        author: freshSC.author,
                                                        type: StickerTypes.FULL,
                                                        categories: ['🎭'],
                                                        id: 'com.wilykun.wabot',
                                                        quality: 90
                                                });
                                                stickerBuffer = await sticker.toBuffer();
                                        }

                                        if (!stickerBuffer || stickerBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal membuat sticker');
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m });
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'sticker');
                                } catch (error) {
                                        console.error('\x1b[31m[Sticker] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal buat sticker: ${error.message}`);
                                }
                                break;
                        }

                        case 'tovn': {
                                try {
                                        const audioTypes = ['audioMessage', 'documentMessage'];
                                        const isAudio = m.isQuoted && audioTypes.includes(quoted.type);
                                        if (!isAudio) {
                                                await tolak(hisoka, m, `❌ Reply pesan audio/MP3 untuk dijadikan voice note!\n\nContoh: reply file MP3 lalu ketik *${pfx}tovn*`);
                                                break;
                                        }

                                        const quotedMime = quoted?.content?.mimetype || quoted?.msg?.mimetype || '';
                                        const isAlreadyVN = quotedMime.includes('ogg') && quoted?.msg?.ptt;
                                        if (isAlreadyVN) {
                                                await tolak(hisoka, m, '❌ File ini sudah berupa voice note!');
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

                                        const audioBuffer = await downloadMediaMessage(
                                                { ...m.quoted, message: m.quoted.raw },
                                                'buffer',
                                                {},
                                                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                                        );

                                        if (!audioBuffer || audioBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal download audio.');
                                                break;
                                        }

                                        const { toVoiceNote } = _require(path.resolve('./src/scrape/tools/audioconvert.cjs'));
                                        const vnBuffer = await toVoiceNote(audioBuffer, quotedMime || 'audio/mpeg');

                                        await hisoka.sendMessage(m.from, {
                                                audio: vnBuffer,
                                                mimetype: 'audio/ogg; codecs=opus',
                                                ptt: true
                                        }, { quoted: m });

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                } catch (error) {
                                        console.error('\x1b[31m[ToVN] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal konversi ke VN: ${error.message}`);
                                }
                                break;
                        }

                        case 'tomp3': {
                                try {
                                        const audioTypes = ['audioMessage', 'documentMessage'];
                                        const isAudio = m.isQuoted && audioTypes.includes(quoted.type);
                                        if (!isAudio) {
                                                await tolak(hisoka, m, `❌ Reply voice note atau audio untuk dijadikan MP3!\n\nContoh: reply voice note lalu ketik *${pfx}tomp3*`);
                                                break;
                                        }

                                        const quotedMime = quoted?.content?.mimetype || quoted?.msg?.mimetype || '';
                                        const isMP3 = quotedMime.includes('mpeg') || quotedMime.includes('mp3');
                                        if (isMP3 && !quoted?.msg?.ptt) {
                                                await tolak(hisoka, m, '❌ File ini sudah berupa MP3!');
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

                                        const audioBuffer = await downloadMediaMessage(
                                                { ...m.quoted, message: m.quoted.raw },
                                                'buffer',
                                                {},
                                                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                                        );

                                        if (!audioBuffer || audioBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal download audio.');
                                                break;
                                        }

                                        const { toMP3 } = _require(path.resolve('./src/scrape/tools/audioconvert.cjs'));
                                        const mp3Buffer = await toMP3(audioBuffer, quotedMime || 'audio/ogg; codecs=opus');

                                        await hisoka.sendMessage(m.from, {
                                                audio: mp3Buffer,
                                                mimetype: 'audio/mpeg',
                                                ptt: false
                                        }, { quoted: m });

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                } catch (error) {
                                        console.error('\x1b[31m[ToMP3] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal konversi ke MP3: ${error.message}`);
                                }
                                break;
                        }

                        case 'infomusik':
                        case 'infolirik':
                        case 'musicinfo':
                        case 'cekmusik': {
                                try {
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
                                                break;
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
                                                break;
                                        }

                                        const { analyzeAudio } = _require(path.resolve('./src/scrape/music/whatgenre.cjs'));
                                        const result = await analyzeAudio(audioBuffer, targetMime);

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        await m.reply({ edit: loadingMsg.key, text: '✅ Analisis selesai!' });

                                        // Split hasil: blok INFO MUSIK vs blok LIRIK
                                        const splitMarker = /📜 \*LIRIK/;
                                        const splitIdx    = result.search(splitMarker);
                                        const partInfo    = splitIdx > 0 ? result.slice(0, splitIdx).trim() : result;
                                        const partLirik   = splitIdx > 0 ? result.slice(splitIdx).trim()  : '';

                                        // Bersihkan simbol box-drawing dari teks yang akan di-copy
                                        const _cleanCopy = (raw) => raw
                                                .split('\n')
                                                .filter(l => !/^[\s\u256d\u256e\u2570\u256f\u2550\u2502\u3014\u3015\u2500\u2508\u254c\s]*$/.test(l))
                                                .filter(l => !/[\u3014\u3015]/.test(l))
                                                .map(l => l.replace(/^\s*\u2502\s?/, '').trimEnd())
                                                .join('\n')
                                                .replace(/\n{3,}/g, '\n\n')
                                                .trim();

                                        const copyLirik = _cleanCopy(partLirik);

                                        // Ekstrak nilai genre saja (misal: "Pop Jazz, Swing") untuk tombol Salin Genre
                                        const _genreMatch = partInfo.match(/🎼[^:]+:\s*(.+)/);
                                        const copyGenre = _genreMatch ? _genreMatch[1].trim() : _cleanCopy(partInfo);

                                        // Kirim hasil reply ke pesan user yang pakai command + dua tombol copy
                                        // Build replyCtx manual (sama seperti sendCekautoMsg)
                                        // agar work untuk semua pesan: orang lain, owner, maupun nomor bot sendiri (fromMe)
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
                                } catch (error) {
                                        console.error('\x1b[31m[InfoMusik] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal analisis audio: ${error.message}`);
                                }
                                break;
                        }

                        case 'toimg': {
                                try {
                                        const sharp = (await import('sharp')).default;
                                        
                                        if (!m.isQuoted || quoted.type !== 'stickerMessage') {
                                                if (query) break;
                                                await tolak(hisoka, m, '❌ Reply sticker untuk dijadikan gambar!');
                                                break;
                                        }
                                        
                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                        
                                        const stickerBuffer = await downloadMediaMessage(
                                                { ...m.quoted, message: m.quoted.raw },
                                                'buffer',
                                                {},
                                                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                                        );
                                        
                                        if (!stickerBuffer || stickerBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal download sticker');
                                                break;
                                        }
                                        
                                        let imageBuffer;
                                        
                                        try {
                                                imageBuffer = await sharp(stickerBuffer)
                                                        .png()
                                                        .toBuffer();
                                        } catch (sharpError) {
                                                console.log('[Toimg] Sharp failed, trying ffmpeg:', sharpError.message);
                                                const ffmpegExec = util.promisify(exec);
                                                const timestamp = Date.now();
                                                const tempInput = `/tmp/toimg_input_${timestamp}.webp`;
                                                const tempOutput = `/tmp/toimg_output_${timestamp}.png`;
                                                
                                                fs.writeFileSync(tempInput, stickerBuffer);
                                                
                                                try {
                                                        await ffmpegExec(
                                                                `ffmpeg -y -i "${tempInput}" -vframes 1 "${tempOutput}"`,
                                                                { timeout: 30000 }
                                                        );
                                                        if (fs.existsSync(tempOutput)) {
                                                                imageBuffer = fs.readFileSync(tempOutput);
                                                        }
                                                } finally {
                                                        if (fs.existsSync(tempInput)) fs.unlinkSync(tempInput);
                                                        if (fs.existsSync(tempOutput)) fs.unlinkSync(tempOutput);
                                                }
                                        }
                                        
                                        if (!imageBuffer || imageBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal convert sticker ke gambar. Sticker mungkin dalam format yang tidak didukung.');
                                                break;
                                        }
                                        
                                        await hisoka.sendMessage(m.from, {
                                                image: imageBuffer,
                                                caption: '✅ Sticker berhasil diconvert ke gambar!'
                                        }, { quoted: m });
                                        
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'toimg');
                                } catch (error) {
                                        console.error('\x1b[31m[Toimg] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Error: ${error.message}`);
                                }
                                break;
                        }

                        case 'wm':
                        case 'swm': {
                                await handleWmCommand({ hisoka, m, query, tolak, logCommand, downloadMediaBuffer, getQuotedMediaBuffer, getMediaTypeFromMessage });
                                break;
                        }

                        case 'jadibot': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;

                                const jbPfx = m.prefix || '.';

                                const sendJbBtn = async (bodyText) => {
                                        await tolak(hisoka, m, bodyText);
                                };

                                const { number: parsedJadibotNumber, durationInput, rawNumberPart, hasInvalidPhoneChars } = parseJadibotCommandQuery(query || '');
                                let number = parsedJadibotNumber;
                                let finalDurationInput = durationInput;

                                // Reply-based jadibot: jika membalas pesan seseorang & query hanya berisi durasi
                                if (m.isQuoted && m.quoted?.sender && !m.quoted?.key?.fromMe) {
                                        const queryTrimmed = (query || '').trim();
                                        // Cek apakah tidak ada nomor valid (nomor terlalu pendek = bukan nomor WA)
                                        const noValidNumber = !parsedJadibotNumber || parsedJadibotNumber.length < 7;
                                        if (noValidNumber && queryTrimmed) {
                                                const trialDuration = parseJadibotDuration(queryTrimmed);
                                                if (trialDuration !== null) {
                                                        // Ambil nomor dari pengirim pesan yang di-reply
                                                        let quotedNum = (m.quoted.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                                                        if (quotedNum.startsWith('00')) quotedNum = quotedNum.slice(2);
                                                        if (quotedNum.startsWith('08')) quotedNum = '62' + quotedNum.slice(1);
                                                        else if (quotedNum.startsWith('8')) quotedNum = '62' + quotedNum;
                                                        number = quotedNum;
                                                        finalDurationInput = queryTrimmed;
                                                }
                                        }
                                }

                                const durationInfo = parseJadibotDuration(finalDurationInput);

                                if (!number) {
                                        const activeList = [...jadibotMap.keys()];
                                        const activeInfo = activeList.length
                                                ? `📊 *Bot aktif sekarang: ${activeList.length}*`
                                                : `📭 Belum ada jadibot aktif.`;
                                        await sendJbBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Nomor tidak boleh kosong!*\n\n` +
                                                `📌 *Format pakai koma (direkomendasikan):*\n` +
                                                `_${jbPfx}jadibot 628xxx,30m_ → 30 menit\n` +
                                                `_${jbPfx}jadibot 628xxx,2j_ → 2 jam\n` +
                                                `_${jbPfx}jadibot 628xxx,3h_ → 3 hari\n` +
                                                `_${jbPfx}jadibot 628xxx,p_ → permanent\n\n` +
                                                `📌 *Format spasi juga bisa:*\n` +
                                                `_${jbPfx}jadibot 628xxx 1 jam_\n` +
                                                `_${jbPfx}jadibot 628xxx 1 hari_\n` +
                                                `_${jbPfx}jadibot 628xxx permanent_\n\n` +
                                                `⏱️ *Singkatan durasi:*\n` +
                                                `• *m* = menit  • *j* = jam  • *h* = hari  • *p* = permanent\n\n` +
                                                `💡 *Reply pesan seseorang:*\n` +
                                                `_${jbPfx}jadibot 1j_ atau _${jbPfx}jadibot 3h_\n\n` +
                                                `⏳ Jika durasi kosong, otomatis *1 hari*.\n\n` +
                                                `${activeInfo}`
                                        );
                                        break;
                                }

                                // Validasi karakter format nomor (huruf/simbol tidak diizinkan)
                                if (hasInvalidPhoneChars) {
                                        const badPart = rawNumberPart || (query || '').split(',')[0].trim()
                                        await sendJbBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Format penulisan nomor salah!*\n\n` +
                                                `📱 Yang kamu tulis: \`${badPart || '-'}\`\n\n` +
                                                `✅ *Format yang diterima:*\n` +
                                                `• \`+62 896-6792-3162\` (dengan spasi & strip)\n` +
                                                `• \`+6289667923162\` (dengan +)\n` +
                                                `• \`6289667923162\` (tanpa +)\n` +
                                                `• \`08xxxxxxxxxx\` (otomatis jadi 62xxx)\n\n` +
                                                `🌏 *Contoh berbagai negara:*\n` +
                                                `🇮🇩 Indo: _${jbPfx}jadibot 6289xxx,1h_\n` +
                                                `🇲🇾 Malay: _${jbPfx}jadibot 601xxx,1h_\n` +
                                                `🇺🇸 USA: _${jbPfx}jadibot 1555xxx,1h_\n` +
                                                `🇸🇬 SG: _${jbPfx}jadibot 6581xxx,1h_\n\n` +
                                                `❌ Tidak boleh ada huruf atau simbol aneh.`
                                        );
                                        break;
                                }

                                // Validasi panjang nomor (min 8 digit setelah normalisasi)
                                if (number.length < 8) {
                                        const badPart = rawNumberPart || number || (query || '').split(',')[0].trim()
                                        await sendJbBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Nomor terlalu pendek!*\n\n` +
                                                `📱 Yang kamu tulis: \`${badPart || '-'}\`\n` +
                                                `Nomor WA harus minimal 8 digit dan\n` +
                                                `menggunakan kode negara.\n\n` +
                                                `✅ *Format yang diterima:*\n` +
                                                `• \`+62 896-6792-3162\` (dengan spasi & strip)\n` +
                                                `• \`+6289667923162\` (dengan +)\n` +
                                                `• \`6289667923162\` (tanpa +)\n` +
                                                `• \`08xxxxxxxxxx\` (otomatis jadi 62xxx)\n\n` +
                                                `🌏 *Contoh berbagai negara:*\n` +
                                                `🇮🇩 Indo: _${jbPfx}jadibot 6289xxx,1h_\n` +
                                                `🇲🇾 Malay: _${jbPfx}jadibot 601xxx,1h_\n` +
                                                `🇺🇸 USA: _${jbPfx}jadibot 1555xxx,1h_\n` +
                                                `🇸🇬 SG: _${jbPfx}jadibot 6581xxx,1h_`
                                        );
                                        break;
                                }

                                if (!durationInfo) {
                                        const badDur = finalDurationInput || '-'
                                        await sendJbBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏰  *MASA BERLAKU*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Format durasi tidak valid!*\n\n` +
                                                `⌨️ Yang kamu tulis: \`${badDur}\`\n\n` +
                                                `📌 *Contoh yang benar:*\n` +
                                                `_${jbPfx}jadibot ${number},30m_ → 30 menit\n` +
                                                `_${jbPfx}jadibot ${number},2j_ → 2 jam\n` +
                                                `_${jbPfx}jadibot ${number},3h_ → 3 hari\n` +
                                                `_${jbPfx}jadibot ${number},p_ → permanent\n\n` +
                                                `⏱️ *Singkatan durasi valid:*\n` +
                                                `• *m* = menit  • *j* = jam\n` +
                                                `• *h* = hari   • *p* = permanent\n\n` +
                                                `✅ Contoh: _${jbPfx}jadibot ${number},1h_`
                                        );
                                        break;
                                }

                                if (number.startsWith('08'))
                                        number = '62' + number.slice(1);

                                if (jadibotMap.has(number)) {
                                        if (!durationInfo.isDefault) {
                                                // User memberi durasi eksplisit → update expiry bot yg sedang aktif
                                                const sock = jadibotMap.get(number)
                                                const sendReplyFn = async (msg) => tolak(hisoka, m, msg)
                                                if (durationInfo.ms === 'permanent') {
                                                        setPermanentJadibot(number, 'active')
                                                        await sendJbBtn(
                                                                `╔══════════════════════╗\n` +
                                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                                `╚══════════════════════╝\n\n` +
                                                                `✅ *Masa berlaku diperbarui!*\n` +
                                                                `📱 +${maskNumber(number)}\n` +
                                                                `⏳ Masa berlaku: *Permanent* ♾️\n\n` +
                                                                `Bot tetap aktif tanpa batas waktu.`
                                                        )
                                                } else {
                                                        removeJadibotExpiry(number)
                                                        ensureJadibotExpiry(number, durationInfo.ms, 'active')
                                                        scheduleJadibotExpiry(number, sendReplyFn)
                                                        const info = getJadibotExpirySummary(number)
                                                        await sendJbBtn(
                                                                `╔══════════════════════╗\n` +
                                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                                `╚══════════════════════╝\n\n` +
                                                                `✅ *Masa berlaku diperbarui!*\n` +
                                                                `📱 +${maskNumber(number)}\n` +
                                                                `⏳ Sisa: *${info.remaining}*\n` +
                                                                `📅 Habis: ${info.expiresAtText}\n\n` +
                                                                `Bot tetap aktif, durasi diperbarui.`
                                                        )
                                                }
                                        } else {
                                                await sendJbBtn(
                                                        `╔══════════════════════╗\n` +
                                                        `║   🤖  *J A D I B O T*  ║\n` +
                                                        `╚══════════════════════╝\n\n` +
                                                        `⚠️ *Nomor sudah aktif!*\n` +
                                                        `+${maskNumber(number)} sedang berjalan sebagai jadibot.\n\n` +
                                                        `💡 Hentikan dulu: *${jbPfx}stopbot ${number}*`
                                                );
                                        }
                                        break;
                                }

                                const mainNum = hisoka.mainBotNumber
                                        || hisoka.user?.id?.split(':')[0]
                                        || '';

                                // Validasi nomor terdaftar di WhatsApp (skip jika sudah ada sesi)
                                const sessionDir = path.join(process.cwd(), 'jadibot', number)
                                const hasExistingSession = fs.existsSync(path.join(sessionDir, 'creds.json'))
                                if (!hasExistingSession) {
                                        try {
                                                await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } })
                                                const waResult = await hisoka.onWhatsApp(number + '@s.whatsapp.net')
                                                const isRegistered = Array.isArray(waResult) && waResult.length > 0 && waResult[0]?.exists
                                                if (!isRegistered) {
                                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } })
                                                        const { flag: cFlag, name: cName } = getPhoneCountryInfo(number)
                                                        await sendJbBtn(
                                                                `╔══════════════════════╗\n` +
                                                                `║   🤖  *J A D I B O T*  ║\n` +
                                                                `╚══════════════════════╝\n\n` +
                                                                `❌ *Nomor tidak terdaftar di WhatsApp!*\n\n` +
                                                                `${cFlag} *Negara:* ${cName}\n` +
                                                                `📱 *Nomor:* +${number}\n\n` +
                                                                `Nomor ini tidak ditemukan atau belum\n` +
                                                                `terdaftar sebagai akun WhatsApp aktif.\n\n` +
                                                                `💡 *Pastikan:*\n` +
                                                                `• Nomor sudah benar termasuk kode negara\n` +
                                                                `• Nomor aktif dan punya akun WhatsApp\n` +
                                                                `• Format: _${jbPfx}jadibot 628xxx,1h_\n\n` +
                                                                `📌 *Contoh kode negara:*\n` +
                                                                `🇮🇩 Indonesia: 62xxx\n` +
                                                                `🇲🇾 Malaysia: 60xxx\n` +
                                                                `🇺🇸 Amerika: 1xxx\n` +
                                                                `🇸🇬 Singapura: 65xxx`
                                                        )
                                                        break
                                                }
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } })
                                        } catch {
                                                // Gagal cek → tetap lanjut agar tidak block user
                                        }
                                }

                                try { await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } }) } catch {}

                                await startJadibot(
                                        number,
                                        async (msg) => {
                                                try {
                                                        const payload = typeof msg === 'string' ? { text: msg } : msg
                                                        return await hisoka.sendMessage(m.from, payload, { quoted: m })
                                                } catch (e) {
                                                        console.error('[JADIBOT][v1-notif] Gagal kirim ke GC:', e?.message)
                                                }
                                        },
                                        mainNum,
                                        async (key, text) => {
                                                try {
                                                        await hisoka.sendMessage(m.from, { edit: key, text })
                                                } catch {}
                                        },
                                        null,
                                        durationInfo.ms,
                                        hisoka,
                                        async (emoji) => {
                                                try { await hisoka.sendMessage(m.from, { react: { text: emoji, key: m.key } }) } catch {}
                                        },
                                        m.sender
                                );
                        }
                                break;

                        case 'upbot': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;

                                const upPfx = m.prefix || '.';
                                const sendUpBtn = async (bodyText) => { await tolak(hisoka, m, bodyText); };

                                const { number: upNumber, durationInput: upDurationInput } = parseJadibotCommandQuery(query || '');
                                let upNum = upNumber;

                                // Support reply ke pesan: ambil nomor dari pengirim
                                if (m.isQuoted && m.quoted?.sender && !m.quoted?.key?.fromMe && (!upNum || upNum.length < 7)) {
                                        let qNum = (m.quoted.sender || '').split('@')[0].split(':')[0].replace(/[^0-9]/g, '');
                                        if (qNum.startsWith('00')) qNum = qNum.slice(2);
                                        if (qNum.startsWith('08')) qNum = '62' + qNum.slice(1);
                                        else if (qNum.startsWith('8')) qNum = '62' + qNum;
                                        upNum = qNum;
                                }

                                if (upNum && upNum.startsWith('08')) upNum = '62' + upNum.slice(1);

                                const upDurationInfo = parseJadibotDuration(upDurationInput);

                                if (!upNum) {
                                        await sendUpBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏫  *U P B O T*   ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Nomor tidak boleh kosong!*\n\n` +
                                                `📌 *Format koma (direkomendasikan):*\n` +
                                                `_${upPfx}upbot 628xxx,30m_ → perpanjang 30 menit\n` +
                                                `_${upPfx}upbot 628xxx,2j_ → perpanjang 2 jam\n` +
                                                `_${upPfx}upbot 628xxx,3h_ → perpanjang 3 hari\n` +
                                                `_${upPfx}upbot 628xxx,p_ → ubah ke permanent\n\n` +
                                                `📌 *Format spasi juga bisa:*\n` +
                                                `_${upPfx}upbot 628xxx 2j_\n\n` +
                                                `⏱️ *Singkatan: m=menit, j=jam, h=hari, p=permanent*`
                                        );
                                        break;
                                }

                                if (!upDurationInfo || upDurationInput === '') {
                                        await sendUpBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏫  *U P B O T*   ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `❌ *Format durasi tidak valid!*\n\n` +
                                                `📌 *Contoh:*\n` +
                                                `_${upPfx}upbot ${upNum},30m_\n` +
                                                `_${upPfx}upbot ${upNum},2j_\n` +
                                                `_${upPfx}upbot ${upNum},3h_\n` +
                                                `_${upPfx}upbot ${upNum},p_\n\n` +
                                                `⏱️ *Singkatan: m=menit, j=jam, h=hari, p=permanent*`
                                        );
                                        break;
                                }

                                if (!jadibotMap.has(upNum)) {
                                        await sendUpBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏫  *U P B O T*   ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `⚠️ *Bot tidak aktif!*\n` +
                                                `+${maskNumber(upNum)} tidak ditemukan dalam daftar jadibot aktif.\n\n` +
                                                `💡 Aktifkan dulu: _${upPfx}jadibot ${upNum},${upDurationInput}_`
                                        );
                                        break;
                                }

                                const upSendReplyFn = async (msg) => tolak(hisoka, m, msg);
                                // Ambil info lama sebelum dihapus
                                const oldCmdInfo = getJadibotExpirySummary(upNum);
                                const oldCmdLabel = oldCmdInfo?.remaining || 'Tidak ada data';
                                const oldCmdExpire = oldCmdInfo?.expiresAtText || '-';
                                if (upDurationInfo.ms === 'permanent') {
                                        setPermanentJadibot(upNum, 'active')
                                        await sendUpBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏫  *U P B O T*   ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `✅ *Durasi diperbarui!*\n` +
                                                `📱 +${maskNumber(upNum)}\n\n` +
                                                `📊 *Perubahan masa berlaku:*\n` +
                                                `⏮️ Sebelumnya : *${oldCmdLabel}*\n` +
                                                `✨ Terbaru    : *Permanent* ♾️\n\n` +
                                                `Bot tetap aktif tanpa batas waktu.`
                                        );
                                } else {
                                        extendJadibotExpiry(upNum, upDurationInfo.ms, 'active')
                                        scheduleJadibotExpiry(upNum, upSendReplyFn)
                                        const upInfo = getJadibotExpirySummary(upNum)
                                        await sendUpBtn(
                                                `╔══════════════════════╗\n` +
                                                `║   ⏫  *U P B O T*   ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `✅ *Durasi diperbarui!*\n` +
                                                `📱 +${maskNumber(upNum)}\n\n` +
                                                `📊 *Perubahan masa berlaku:*\n` +
                                                `⏮️ Sebelumnya : *${oldCmdLabel}*\n` +
                                                `   Exp lama   : ${oldCmdExpire}\n` +
                                                `➕ Ditambah   : *${upDurationInfo.label}*\n` +
                                                `✨ Total baru : *${upInfo.remaining}*\n` +
                                                `   Exp baru   : ${upInfo.expiresAtText}\n\n` +
                                                `Bot tetap aktif, durasi diperpanjang.`
                                        );
                                }
                                break;
                        }

                        case 'stopbot': {
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;
                                const stopChoiceKey = getJadibotChoiceKey(m);
                                const existingStopChoice = pendingJadibotChoices.get(stopChoiceKey);
                                if (existingStopChoice?.timeout) clearTimeout(existingStopChoice.timeout);
                                pendingJadibotChoices.delete(stopChoiceKey);

                                const pfx = m.prefix || '.';
                                const rawQuery = (query || '').trim();

                                const sendStopBtn = async (bodyText) => {
                                        await tolak(hisoka, m, bodyText);
                                };

                                // Handle batal
                                if (rawQuery.toLowerCase() === 'batal') {
                                        await sendStopBtn(
                                                `╔══════════════════════╗\n` +
                                                `║  🛑  *STOP JADIBOT*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `✅ *Dibatalkan!*\n` +
                                                `Bot tidak dihentikan.\n\n` +
                                                `💡 Ketik *${pfx}listbot* untuk lihat bot aktif.`
                                        );
                                        break;
                                }

                                // Handle confirm: ".stopbot <nomor> confirm"
                                const confirmMatch = rawQuery.match(/^(\d+)\s+confirm$/i);
                                if (confirmMatch) {
                                        let number = confirmMatch[1];
                                        if (number.startsWith('08')) number = '62' + number.slice(1);
                                        await stopJadibot(number, async (text) => {
                                                await sendStopBtn(text);
                                        });
                                        break;
                                }

                                // No number — show realtime picker list
                                let number = rawQuery.replace(/[^0-9]/g, '');
                                if (!number) {
                                        const list = [...jadibotMap.keys()];

                                        if (!list.length) {
                                                await sendStopBtn(
                                                        `╔══════════════════════╗\n` +
                                                        `║  🛑  *STOP JADIBOT*  ║\n` +
                                                        `╚══════════════════════╝\n\n` +
                                                        `📭 *Tidak ada jadibot yang aktif.*\n\n` +
                                                        `💡 Ketik *${pfx}jadibot <nomor>* untuk tambah bot.`
                                                );
                                                break;
                                        }

                                        let bodyText =
                                                `╔══════════════════════╗\n` +
                                                `║  🛑  *STOP JADIBOT*  ║\n` +
                                                `╚══════════════════════╝\n\n` +
                                                `📊 *Bot aktif: ${list.length}*\n\n`;

                                        for (const [i, num] of list.entries()) {
                                                const meta = getJadibotExpiry(num);
                                                const sisa = !meta ? 'belum tercatat' : meta.permanent === true ? 'Permanent ♾️' : formatRemainingTime(Number(meta.expiresAt) - Date.now());
                                                bodyText += `${i + 1}. *+${num}*\n   🟢 Aktif · Sisa ${sisa}\n`;
                                        }

                                        bodyText +=
                                                `\n💡 Ketik:\n` +
                                                `*${pfx}stopbot <nomor>*\n` +
                                                `untuk menghentikan bot.`;

                                        await sendStopBtn(bodyText);
                                        break;
                                }

                                if (number.startsWith('08')) number = '62' + number.slice(1);

                                const isRunning = jadibotMap.has(number);
                                const maskedNum = maskNumber(number);

                                await sendStopBtn(
                                        `╔══════════════════════╗\n` +
                                        `║  🛑  *STOP JADIBOT*  ║\n` +
                                        `╚══════════════════════╝\n\n` +
                                        `📱 *Nomor:* +${maskedNum}\n` +
                                        `📶 *Status:* ${isRunning ? '🟢 Aktif' : '🔴 Tidak aktif'}\n\n` +
                                        `⚠️ Yakin ingin menghentikan bot ini?\n\n` +
                                        `✅ Ketik: *${pfx}stopbot ${number} confirm*\n` +
                                        `❌ Batal: *${pfx}stopbot batal*`
                                );
                        }
                                break;

                        case 'backup': {
                                const { runBackup } = _require(path.resolve('./src/scrape/system/backup.cjs'));
                                await runBackup(hisoka, m, query, tolak, loadConfig, logCommand);
                        }
                                break;

                        case 'ceksesi': {
                                // Izinkan: owner ATAU userjadibot (pemilik sesi jadibot ini)
                                const _csekIsJadibot = hisoka?.isMainBot === false;
                                if (!m.isOwner && !_csekIsJadibot) return tolak(hisoka, m, '❌ Perintah ini hanya untuk owner!');

                                // Pilih fungsi getSizeReport yang tepat: main bot pakai global, jadibot pakai Map
                                const _csekJadibotNum  = _csekIsJadibot ? getJadibotNumber(hisoka) : null;
                                const reportFn = _csekIsJadibot
                                        ? jadibotSesiReportMap.get(_csekJadibotNum)
                                        : global.__getSesiReport;

                                if (!reportFn) {
                                        return tolak(hisoka, m, '❌ Fungsi cekSesi tidak tersedia. Coba restart bot terlebih dahulu.');
                                }

                                const sessionLabel = _csekIsJadibot
                                        ? `jadibot/${_csekJadibotNum}.json`
                                        : `sessions/hisoka.json`;

                                try {
                                        const result = reportFn();

                                        const EMOJI_MAP = {
                                                'creds':                  '🛡️',
                                                'contacts':               '👥',
                                                'groups':                 '🫂',
                                                'settings':               '⚙️',
                                                'pre-key':                '🗝️',
                                                'session':                '🔑',
                                                'sender-key':             '📨',
                                                'identity-key':           '🪪',
                                                'device-list':            '📱',
                                                'lid-mapping':            '🗺️',
                                                'app-state-sync-key':     '🔄',
                                                'app-state-sync-version': '📋',
                                                'tctoken':                '🎫',
                                        };
                                        const DESC_MAP = {
                                                'creds':                  'Kredensial utama bot — JANGAN hapus',
                                                'contacts':               'Cache kontak — aman dihapus (auto re-populate)',
                                                'groups':                 'Cache data grup — aman dihapus (auto re-fetch)',
                                                'settings':               'Pengaturan sesi lokal',
                                                'pre-key':                'Kunci E2E — aman trim (sisakan 100 terbaru)',
                                                'session':                'Sesi aktif per kontak — jangan hapus sembarangan',
                                                'sender-key':             'Kunci enkripsi grup — aman dihapus (auto re-gen)',
                                                'identity-key':           'Identitas kontak (Signal) — jangan hapus',
                                                'device-list':            'Daftar perangkat kontak — aman dihapus',
                                                'lid-mapping':            'Cache LID→PN — aman dihapus (auto re-fetch)',
                                                'app-state-sync-key':     'Sync state WA — jangan hapus',
                                                'app-state-sync-version': 'Versi sync state — aman dihapus (auto re-sync)',
                                                'tctoken':                'Token cache — aman dihapus',
                                        };
                                        const SAFE_LABEL = { 'HAPUS': '✂️ HAPUS', 'TRIM': '✂️ TRIM', 'KEEP': '🔒 KEEP' };

                                        const lines = result.rows.map(r => {
                                                const emoji = EMOJI_MAP[r.key] || '📄';
                                                const desc  = DESC_MAP[r.key]  || 'Key sesi lainnya';
                                                const kb    = result.fmtKB(r.bytes);
                                                const tag   = SAFE_LABEL[r.safe] || r.safe;
                                                return `${emoji} *${r.key}*  [${tag}]\n` +
                                                       `│  ├ ${r.count} · ${kb}\n` +
                                                       `│  └ _${desc}_`;
                                        });

                                        const potensial = result.rows
                                                .filter(r => r.safe === 'HAPUS')
                                                .reduce((a, r) => a + r.bytes, 0);
                                        const trimSaved = result.rows
                                                .filter(r => r.safe === 'TRIM')
                                                .reduce((a, r) => {
                                                        const cnt = parseInt(r.count);
                                                        if (cnt <= 100) return a;
                                                        return a + Math.round(r.bytes * (1 - 100 / cnt));
                                                }, 0);

                                        const teks =
                                                `╭─「 🗂️ *CEK SESI* 」\n` +
                                                `│  📂 ${sessionLabel} · ${result.fmtFileSize}\n` +
                                                `│  _💡 Data realtime dari memory (akurat)_\n` +
                                                `│\n` +
                                                `├─ ` + lines.join('\n├─ ') + `\n` +
                                                `│\n` +
                                                `├─ 💾 *Ukuran sesi :* ${result.fmtFileSize}\n` +
                                                `├─ 🧹 *Potensi hemat :* ~${result.fmtMB(potensial + trimSaved)} (ketik .clearsesi)\n` +
                                                `╰─ 🕐 ${new Date().toLocaleString('id-ID')}`;

                                        await m.reply(teks);
                                        logCommand(m, hisoka, 'ceksesi');
                                } catch (e) {
                                        return tolak(hisoka, m, `❌ Gagal baca sesi: ${e.message}`);
                                }
                                break;
                        }

                        case 'cekerror': {
                                if (!m.isOwner) return;

                                const arg = (query || '').trim().toLowerCase();

                                // Hanya respon jika: kosong, 'reset', 'clear', atau angka valid
                                if (arg !== '' && arg !== 'reset' && arg !== 'clear' && !/^\d+$/.test(arg)) return;

                                await hisoka.sendMessage(m.from, { react: { text: `🔍`, key: m.key } });

                                if (arg === 'reset' || arg === 'clear') {
                                        clearErrors();
                                        await tolak(hisoka, m, `╭─「 🗑️ *ERROR LOG* 」\n│\n╰➤ Semua log error berhasil dihapus!\n\n┗━➤ 🚀 *Powered By Wily Bot*`);
                                        logCommand(m, hisoka, 'cekerror');
                                        break;
                                }

                                const limit = parseInt(arg) || 3;
                                const summary = formatErrorReport(Math.min(limit, 50));
                                await tolak(hisoka, m, summary);

                                generateErrorFileTxt();
                                const txtPath   = getInfoErrorTxtPath();
                                const txtExists = fs.existsSync(txtPath);

                                if (txtExists) {
                                        const fileBuffer = fs.readFileSync(txtPath);
                                        const { uniqueErrors, totalOccurred } = getErrorStats();
                                        const dupCount = totalOccurred - uniqueErrors;
                                        await hisoka.sendMessage(m.from, {
                                                document: fileBuffer,
                                                mimetype: 'text/plain',
                                                fileName: 'infoerror.txt',
                                                caption:
                                                        `📄 *infoerror.txt*\n` +
                                                        `├ 🔴 Jenis error unik : *${uniqueErrors}*\n` +
                                                        `├ 🔁 Total kejadian   : *${totalOccurred}*\n` +
                                                        `╰ ♻️ Duplikat digabung : *${dupCount > 0 ? dupCount : 0}*`
                                        }, { quoted: m });
                                }

                                logCommand(m, hisoka, 'cekerror');
                                break;
                        }

                        case 'listbot': {
                                if (!m.prefix && m.query) break;
                                if (!isMainBot(hisoka)) return;
                                if (!m.isOwner) return;

                                const ljPfx = m.prefix || '.';
                                await cleanupExpiredJadibots(async () => {});
                                const list = [...jadibotMap.keys()];
                                const jadibotChoiceKey = getJadibotChoiceKey(m);
                                const oldPending = pendingJadibotChoices.get(jadibotChoiceKey);
                                if (oldPending?.timeout) clearTimeout(oldPending.timeout);
                                pendingJadibotChoices.delete(jadibotChoiceKey);

                                if (!list.length) {
                                        await hisoka.sendMessage(m.from, {
                                                text:
                                                        `*LIST JADIBOT*\n\n` +
                                                        `Belum ada jadibot yang aktif.\n\n` +
                                                        `Tambah jadibot:\n` +
                                                        `${ljPfx}jadibot <nomor>`
                                        }, { quoted: m });
                                        break;
                                }

                                // Sort: paling mau expired di atas, permanent di bawah
                                const sortedList = [...list].sort((a, b) => {
                                        const metaA = getJadibotExpiry(a);
                                        const metaB = getJadibotExpiry(b);
                                        const expA = metaA ? Number(metaA.expiresAt) : Infinity;
                                        const expB = metaB ? Number(metaB.expiresAt) : Infinity;
                                        return expA - expB;
                                });

                                const now = Date.now();

                                const ljNow = new Date();
                                const ljHari = ljNow.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
                                const ljTanggal = ljNow.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
                                const ljWaktu = ljNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

                                const detailLines = sortedList.map((num, i) => {
                                        const info = getJadibotExpirySummary(num);
                                        const meta = getJadibotExpiry(num);
                                        const remainingMs = meta ? Number(meta.expiresAt) - now : Infinity;
                                        const isAlmostExpired = remainingMs !== Infinity && remainingMs < 30 * 60 * 1000;
                                        const statusTag = isAlmostExpired ? ' (Hampir Habis)' : '';
                                        const namaUser = getUserName(`${num}@s.whatsapp.net`, '-');

                                        let expireText = 'Permanent';
                                        if (meta && Number(meta.expiresAt) > 0) {
                                                const expDate = new Date(Number(meta.expiresAt));
                                                const expHari = expDate.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
                                                const expTanggal = expDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
                                                const expWaktu = expDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');
                                                expireText = `${expHari}, ${expTanggal} | ${expWaktu} WIB`;
                                        }

                                        const connectedTs = jadibotConnectedAt.get(num) || Number(meta?.connectedAt) || 0;
                                        let onlineLine = '';
                                        if (connectedTs > 0) {
                                                const onlineMs = now - connectedTs;
                                                const onlineSec = Math.max(0, Math.floor(onlineMs / 1000));
                                                const onlineH = Math.floor(onlineSec / 3600);
                                                const onlineM = Math.floor((onlineSec % 3600) / 60);
                                                const onlineS = onlineSec % 60;
                                                const durasiStr = onlineH > 0
                                                        ? `${onlineH}j ${onlineM}m`
                                                        : onlineM > 0
                                                                ? `${onlineM}m ${onlineS}d`
                                                                : `${onlineS}d`;
                                                const sejakDate = new Date(connectedTs);
                                                const sejakWaktu = sejakDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');
                                                const sejakTgl = sejakDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Jakarta' });
                                                onlineLine = `\n   Online : ${durasiStr} (sejak ${sejakTgl} ${sejakWaktu} WIB)`;
                                        }

                                        return (
                                                `${i + 1}. *+${num}*${statusTag}\n` +
                                                `   Nama   : ${namaUser}\n` +
                                                `   Sisa   : ${info.remaining}\n` +
                                                `   Expire : ${expireText}` +
                                                onlineLine
                                        );
                                }).join('\n\n');

                                const ljBodyText =
                                        `*LIST BOT AKTIF*\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `Total  : *${sortedList.length} bot aktif*\n` +
                                        `Waktu  : ${ljHari}, ${ljTanggal} | ${ljWaktu} WIB\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                                        `${detailLines}\n\n` +
                                        `━━━━━━━━━━━━━━━━━━━━━\n` +
                                        `*Cara pakai — reply pesan ini:*\n\n` +
                                        `Stop bot:\n` +
                                        `   Ketik urutan → contoh: *1*\n\n` +
                                        `Perpanjang durasi:\n` +
                                        `   Ketik *urutan,durasi* → contoh:\n` +
                                        `   • *1,3j*  → perpanjang bot 1 selama 3 jam\n` +
                                        `   • *2,1h*  → perpanjang bot 2 selama 1 hari\n` +
                                        `   • *1,p*   → ubah bot 1 ke permanent\n\n` +
                                        `Singkatan: m=menit, j=jam, h=hari, p=permanent\n` +
                                        `Pilihan berlaku *2 menit*`;

                                const sentList = await hisoka.sendMessage(m.from, { text: ljBodyText }, { quoted: m });
                                const botMsgId = sentList?.key?.id || '';

                                const timeout = setTimeout(() => {
                                        pendingJadibotChoices.delete(jadibotChoiceKey);
                                }, 2 * 60 * 1000);
                                pendingJadibotChoices.set(jadibotChoiceKey, {
                                        numbers: sortedList,
                                        botMsgId,
                                        createdAt: Date.now(),
                                        expiresAt: Date.now() + (2 * 60 * 1000),
                                        timeout
                                });
                                logCommand(m, hisoka, 'listbot');
                        }
                                break;
                        

                        case 'play': {
                                try {
                                        const { handlePlay } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handlePlay(hisoka, m, query, { tolak, logCommand, pendingPlayChoices, Button });
                                } catch (error) {
                                        console.error('\x1b[31m[Play] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        const errMsg = error.message || '';
                                        if (errMsg.includes('ENOSPC') || errMsg.includes('no space left')) {
                                                const { clearTmpFolder } = await import('../helper/cleaner.js');
                                                clearTmpFolder();
                                                await tolak(hisoka, m, `❌ Disk server penuh! Otomatis membersihkan tmp...\nSilakan coba lagi dalam beberapa detik.`);
                                        } else {
                                                await tolak(hisoka, m, `❌ Gagal mencari lagu: ${errMsg?.substring(0, 200)}`);
                                        }
                                }
                                break;
                        }

                        case 'ytmp3': {
                                try {
                                        const { handleYtmp3 } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleYtmp3(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                } catch (error) {
                                        console.error('\x1b[31m[YTMP3] Error:\x1b[39m', error.message);
                                        try {
                                                const possibleFiles = fs.readdirSync(path.join(process.cwd(), 'tmp')).filter(f => f.startsWith('ytmp3_'));
                                                for (const f of possibleFiles) { try { fs.unlinkSync(path.join(process.cwd(), 'tmp', f)); } catch (_) {} }
                                        } catch (_) {}
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        const errMsg = error.message || '';
                                        if (errMsg.includes('ENOSPC') || errMsg.includes('no space left')) {
                                                const { clearTmpFolder } = await import('../helper/cleaner.js');
                                                clearTmpFolder();
                                                await tolak(hisoka, m, `❌ Disk server penuh! Otomatis membersihkan tmp...\nSilakan coba lagi dalam beberapa detik.`);
                                        } else {
                                                await tolak(hisoka, m, `❌ Gagal mengunduh audio: ${errMsg?.substring(0, 200)}`);
                                        }
                                }
                                break;
                        }

                        case 'ytmp4': {
                                try {
                                        const { handleYtmp4 } = _require(path.resolve('./src/scrape/download/downloader.cjs'));
                                        await handleYtmp4(hisoka, m, query, { gemini, tolak, logCommand, buildVideoDownloadCaptionPrompt });
                                } catch (error) {
                                        console.error('\x1b[31m[YTMP4] Error:\x1b[39m', error.message);
                                        try {
                                                const possibleFiles = fs.readdirSync(path.join(process.cwd(), 'tmp')).filter(f => f.startsWith('ytmp4_'));
                                                for (const f of possibleFiles) { try { fs.unlinkSync(path.join(process.cwd(), 'tmp', f)); } catch (_) {} }
                                        } catch (_) {}
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        const errMsg = error.message || '';
                                        if (errMsg.includes('ENOSPC') || errMsg.includes('no space left')) {
                                                const { clearTmpFolder } = await import('../helper/cleaner.js');
                                                clearTmpFolder();
                                                await tolak(hisoka, m, `❌ Disk server penuh! Otomatis membersihkan tmp...\nSilakan coba lagi dalam beberapa detik.`);
                                        } else {
                                                await tolak(hisoka, m, `❌ Gagal mengunduh video: ${errMsg?.substring(0, 200)}`);
                                        }
                                }
                                break;
                        }
                        case 'antitagsw': {
                                if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di grup!');
                                if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

                                const arg = (query || '').trim().toLowerCase();

                                if (arg === 'global on') {
                                        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner bot yang bisa mengubah pengaturan global!');
                                        const config = loadConfig();
                                        if (!config.antiTagSW) config.antiTagSW = {};
                                        config.antiTagSW.enabled = true;
                                        saveConfig(config);
                                        await tolak(hisoka, m,
                                                `╭───〔 *🌐 ANTITAGSW GLOBAL* 〕───╮\n` +
                                                `│\n` +
                                                `│ ✅ *Global AntiTagSW DIAKTIFKAN!*\n` +
                                                `│\n` +
                                                `│ ℹ️ Sekarang admin grup bisa\n` +
                                                `│    mengaktifkan fitur ini di\n` +
                                                `│    masing-masing grup.\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, 'antitagsw global on');
                                } else if (arg === 'global off') {
                                        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner bot yang bisa mengubah pengaturan global!');
                                        const config = loadConfig();
                                        if (!config.antiTagSW) config.antiTagSW = {};
                                        config.antiTagSW.enabled = false;
                                        saveConfig(config);
                                        await tolak(hisoka, m,
                                                `╭───〔 *🌐 ANTITAGSW GLOBAL* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🔴 *Global AntiTagSW DINONAKTIFKAN!*\n` +
                                                `│\n` +
                                                `│ ℹ️ Fitur ini tidak akan aktif\n` +
                                                `│    di semua grup meskipun sudah\n` +
                                                `│    di-on per grup.\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, 'antitagsw global off');
                                } else if (arg === 'on') {
                                        const config = loadConfig();
                                        let globalAutoEnabled = false;
                                        if (!config.antiTagSW?.enabled) {
                                                if (!m.isOwner) {
                                                        return tolak(hisoka, m, '❌ Fitur AntiTagSW dinonaktifkan secara global oleh owner bot.\nMinta owner aktifkan dengan perintah: *.antitagsw global on*');
                                                }
                                                if (!config.antiTagSW) config.antiTagSW = {};
                                                config.antiTagSW.enabled = true;
                                                saveConfig(config);
                                                globalAutoEnabled = true;
                                        }

                                        toggleAntiTagSW(m.from, true);
                                        saveCekautoTimestamp('antiTagSWGrup', m.from);
                                        await sendConfirmWithButtons(hisoka, m,
                                                `╭───〔 *✅ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🟢 *Fitur AntiTagSW AKTIF!*\n` +
                                                (globalAutoEnabled ? `│ 🌐 *Global juga diaktifkan otomatis!*\n` : '') +
                                                `│\n` +
                                                `│ ⚙️ Konfigurasi:\n` +
                                                `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                                                `│\n` +
                                                `│ ℹ️ Anggota yang mentag grup lewat\n` +
                                                `│    STATUS akan diperingatkan & dikick!\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`,
                                                [{ text: '➕ Aktifkan Semua Grup', id: '__addallgrp__antiTagSWGrup' }]
                                        );
                                        logCommand(m, hisoka, 'antitagsw on');
                                } else if (arg === 'off') {
                                        toggleAntiTagSW(m.from, false);
                                        await tolak(hisoka, m, 
                                                `╭───〔 *❌ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🔴 *Fitur AntiTagSW NONAKTIF!*\n` +
                                                `│\n` +
                                                `│ ℹ️ Semua warning di grup ini\n` +
                                                `│    juga telah direset.\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, 'antitagsw off');
                                } else if (arg === 'reset') {
                                        resetWarnings(m.from);
                                        await tolak(hisoka, m, '✅ Semua warning AntiTagSW di grup ini telah direset!');
                                        logCommand(m, hisoka, 'antitagsw reset');

                                } else if (arg.startsWith('warn')) {
                                        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mengubah batas warning!');
                                        const warnNum = parseInt((arg.replace(/^warn\s*/, '') || '').trim(), 10);
                                        if (!warnNum || isNaN(warnNum) || warnNum < 1 || warnNum > 100) {
                                                return tolak(hisoka, m,
                                                        `╭───〔 *⚠️ ANTITAGSW WARN* 〕───╮\n` +
                                                        `│\n` +
                                                        `│ ❌ Angka tidak valid!\n` +
                                                        `│\n` +
                                                        `│ 📌 Format: *.antitagsw warn <angka>*\n` +
                                                        `│ 📌 Contoh: *.antitagsw warn 5*\n` +
                                                        `│\n` +
                                                        `│ ℹ️ Angka valid: *1 - 100*\n` +
                                                        `│\n` +
                                                        `╰────────────────────────────────────╯`
                                                );
                                        }
                                        const config = loadConfig();
                                        if (!config.antiTagSW) config.antiTagSW = {};
                                        const oldMax = config.antiTagSW.maxWarnings ?? 3;
                                        config.antiTagSW.maxWarnings = warnNum;
                                        saveConfig(config);
                                        await tolak(hisoka, m,
                                                `╭───〔 *⚠️ ANTITAGSW WARN* 〕───╮\n` +
                                                `│\n` +
                                                `│ ✅ Batas warning berhasil diubah!\n` +
                                                `│\n` +
                                                `│ 📊 Sebelum : *${oldMax}x*\n` +
                                                `│ 📊 Sekarang: *${warnNum}x*\n` +
                                                `│\n` +
                                                `│ ℹ️ Anggota akan dikick setelah\n` +
                                                `│    melanggar sebanyak *${warnNum}x*\n` +
                                                `│\n` +
                                                `│ 💾 Tersimpan ke config.json\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, `antitagsw warn ${warnNum}`);

                                } else if (arg === 'add') {
                                        const config = loadConfig();
                                        if (!config.antiTagSW?.enabled) {
                                                if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur AntiTagSW dinonaktifkan secara global.\nMinta owner aktifkan dulu: *.antitagsw global on*');
                                                if (!config.antiTagSW) config.antiTagSW = {};
                                                config.antiTagSW.enabled = true;
                                                saveConfig(config);
                                        }
                                        const alreadyAdded = isAntiTagSWEnabled(m.from);
                                        toggleAntiTagSW(m.from, true);
                                        await tolak(hisoka, m,
                                                `╭───〔 *✅ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                                                `│\n` +
                                                `│ ${alreadyAdded ? '🔄 Grup ini *sudah terdaftar* sebelumnya.' : '➕ Grup ini berhasil *ditambahkan!*'}\n` +
                                                `│\n` +
                                                `│ 🌐 Global   : 🟢 Aktif\n` +
                                                `│ 📌 Grup ini : 🟢 *Aktif*\n` +
                                                `│\n` +
                                                `│ ⚙️ Konfigurasi:\n` +
                                                `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                                                `│\n` +
                                                `│ ℹ️ Anggota yang mentag grup lewat\n` +
                                                `│    STATUS akan diperingatkan & dikick!\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, 'antitagsw add');

                                } else if (arg === 'list') {
                                        if (!m.isOwner && !m.isAdmin) return tolak(hisoka, m, '❌ Hanya owner atau admin yang bisa melihat daftar ini!');
                                        const allGroups = getAllAntiTagSWGroups();
                                        if (!allGroups.length) {
                                                return tolak(hisoka, m,
                                                        `╭───〔 *📋 DAFTAR ANTITAGSW* 〕───╮\n` +
                                                        `│\n` +
                                                        `│ ❌ Belum ada grup yang terdaftar.\n` +
                                                        `│\n` +
                                                        `│ Gunakan *.antitagsw add* di grup\n` +
                                                        `│ yang ingin diaktifkan.\n` +
                                                        `│\n` +
                                                        `╰────────────────────────────────────╯`
                                                );
                                        }

                                        // Load botadmin cache sekali
                                        const botAdminCache = kvGet('botadmin/botadmin', {});
                                        const botNum = (hisoka.user?.id || '').split(':')[0].split('@')[0];

                                        // Fetch info tiap grup realtime
                                        const grupInfoList = [];
                                        for (let i = 0; i < allGroups.length; i++) {
                                                const gid = allGroups[i];
                                                let namaGrup = '-';
                                                let totalMember = '?';
                                                let totalAdmin = '?';
                                                let botIsAdmin = botAdminCache[gid] === true;

                                                try {
                                                        const meta = await hisoka.groupMetadata(gid);
                                                        if (meta) {
                                                                namaGrup = meta.subject || '-';
                                                                const participants = meta.participants || [];
                                                                totalMember = participants.length;
                                                                totalAdmin = participants.filter(p => p.admin).length;
                                                                // Cek bot admin realtime dari metadata
                                                                const botP = participants.find(p => {
                                                                        const pNum = (p.jid || p.id || '').split('@')[0].split(':')[0];
                                                                        return pNum === botNum;
                                                                });
                                                                // Jika bot ditemukan di participants → pakai realtime
                                                                // Jika tidak ditemukan (misal format LID) → fallback ke botadmin.json
                                                                botIsAdmin = botP !== undefined ? !!botP.admin : (botAdminCache[gid] === true);
                                                        }
                                                } catch {
                                                        try {
                                                                const cached = hisoka.groups?.read(gid);
                                                                if (cached) {
                                                                        namaGrup = cached.subject || '-';
                                                                        const participants = cached.participants || [];
                                                                        totalMember = participants.length;
                                                                        totalAdmin = participants.filter(p => p.admin).length;
                                                                }
                                                        } catch {}
                                                }

                                                const warnings = getWarnings(gid);
                                                const totalWarned = Object.keys(warnings).length;
                                                grupInfoList.push({ gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin });
                                        }

                                        // Bangun teks list
                                        let listBaris = '';
                                        for (let i = 0; i < grupInfoList.length; i++) {
                                                const { gid, namaGrup, totalMember, totalAdmin, totalWarned, botIsAdmin } = grupInfoList[i];
                                                listBaris +=
                                                        `│ *${i + 1}.* ${namaGrup}\n` +
                                                        `│    🆔 \`${gid}\`\n` +
                                                        `│    👥 Anggota : *${totalMember}* | 🛡️ Admin: *${totalAdmin}*\n` +
                                                        `│    🤖 Bot Admin: ${botIsAdmin ? '✅ Ya' : '❌ Bukan'}\n` +
                                                        `│    ⚠️ Warned  : *${totalWarned} orang*\n` +
                                                        `│\n`;
                                        }

                                        const listText =
                                                `╭───〔 *📋 DAFTAR ANTITAGSW* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🟢 Total aktif: *${allGroups.length} grup*\n` +
                                                `│\n` +
                                                listBaris +
                                                `│ ─────────────────────────────────\n` +
                                                `│ 🗑️ *Cara hapus:*\n` +
                                                `│ Reply pesan ini dengan nomor urut\n` +
                                                `│ Contoh: *1* atau *1,2* atau *1,2,3*\n` +
                                                `│\n` +
                                                `│ Ketik *semua* → hapus semua grup\n` +
                                                `│ Ketik *reset* → reset warning semua\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`;

                                        // Kirim list dan simpan session untuk reply-based deletion
                                        if (!global.__antiTagSWListSessions) global.__antiTagSWListSessions = new Map();
                                        const sentList = await hisoka.sendMessage(m.from, { text: listText }, { quoted: m }).catch(() => null);
                                        if (sentList?.key?.id) {
                                                global.__antiTagSWListSessions.set(sentList.key.id, {
                                                        groups: grupInfoList,
                                                        from: m.from,
                                                        by: m.sender || m.key?.participant || m.from,
                                                        ts: Date.now()
                                                });
                                                // Auto expire 5 menit
                                                setTimeout(() => global.__antiTagSWListSessions?.delete(sentList.key.id), 5 * 60 * 1000);
                                        }
                                        logCommand(m, hisoka, 'antitagsw list');

                                } else if (arg === 'log' || arg.startsWith('log ')) {
                                        // Ambil sub-arg: "log", "log all", "log clear", "log clear all"
                                        const logSub = arg.slice(3).trim(); // '' | 'all' | 'clear' | 'clear all'

                                        if (logSub === 'clear all') {
                                                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa clear semua log!');
                                                clearAntiTagSWLog();
                                                return tolak(hisoka, m, '✅ Semua log AntiTagSW berhasil dihapus!');
                                        }

                                        if (logSub === 'clear') {
                                                clearAntiTagSWLog(m.from);
                                                return tolak(hisoka, m, '✅ Log AntiTagSW grup ini berhasil dihapus!');
                                        }

                                        const showAll = (logSub === 'all') && m.isOwner;
                                        const rawLogs = getAntiTagSWLog(showAll ? null : m.from);

                                        if (!rawLogs.length) {
                                                return tolak(hisoka, m,
                                                        `╭───〔 *📜 LOG ANTITAGSW* 〕───╮\n` +
                                                        `│\n` +
                                                        `│ ℹ️ Belum ada riwayat pelanggaran${showAll ? '' : ' di grup ini'}.\n` +
                                                        `│\n` +
                                                        `│ 📋 Sub-perintah:\n` +
                                                        `│ • *.antitagsw log*       → Log grup ini\n` +
                                                        (m.isOwner ? `│ • *.antitagsw log all*   → Semua grup\n` : '') +
                                                        `│ • *.antitagsw log clear* → Hapus log grup ini\n` +
                                                        (m.isOwner ? `│ • *.antitagsw log clear all* → Hapus semua\n` : '') +
                                                        `│\n` +
                                                        `╰────────────────────────────────────╯`
                                                );
                                        }

                                        const _fmtWaktu = (ts) => new Date(ts).toLocaleString('id-ID', {
                                                timeZone: 'Asia/Jakarta',
                                                day: '2-digit', month: '2-digit', year: '2-digit',
                                                hour: '2-digit', minute: '2-digit'
                                        });
                                        const _fmtAction = (l) => l.action === 'kick' ? `🔴 KICK` : `🟡 WARN ${l.warnCount}/${l.maxWarn}`;

                                        const totalWarn = rawLogs.filter(l => l.action === 'warn').length;
                                        const totalKick = rawLogs.filter(l => l.action === 'kick').length;

                                        if (showAll) {
                                                // ── LOG ALL: dikelompokkan per grup ──
                                                // Kelompokkan log per gid
                                                const byGid = {};
                                                for (const l of rawLogs) {
                                                        if (!byGid[l.gid]) byGid[l.gid] = [];
                                                        byGid[l.gid].push(l);
                                                }
                                                const uniqueGids = Object.keys(byGid);

                                                // Fetch nama grup semua sekaligus (paralel)
                                                const namaGrupCache = {};
                                                await Promise.all(uniqueGids.map(async (gid) => {
                                                        try {
                                                                const mt = await hisoka.groupMetadata(gid);
                                                                namaGrupCache[gid] = mt?.subject || gid.split('@')[0];
                                                        } catch {
                                                                try { namaGrupCache[gid] = hisoka.groups?.read(gid)?.subject || gid.split('@')[0]; }
                                                                catch { namaGrupCache[gid] = gid.split('@')[0]; }
                                                        }
                                                }));

                                                // Kirim per grup (maks 10 grup per pesan, sisanya pesan baru)
                                                const GRUP_PER_MSG = 5;
                                                const header =
                                                        `╭───〔 *📜 LOG ANTITAGSW — SEMUA GRUP* 〕───╮\n` +
                                                        `│\n` +
                                                        `│ 🏘️ Jumlah grup: *${uniqueGids.length}*\n` +
                                                        `│ 📊 Total log  : *${rawLogs.length}*\n` +
                                                        `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n` +
                                                        `│\n` +
                                                        `╰────────────────────────────────────╯`;
                                                // Kirim per batch grup (header digabung ke batch pertama)
                                                for (let gi = 0; gi < uniqueGids.length; gi += GRUP_PER_MSG) {
                                                        const batch = uniqueGids.slice(gi, gi + GRUP_PER_MSG);
                                                        let batchTxt = '';
                                                        for (const gid of batch) {
                                                                const logs = byGid[gid].slice(-10).reverse(); // 10 terbaru per grup
                                                                const gWarn = byGid[gid].filter(l => l.action === 'warn').length;
                                                                const gKick = byGid[gid].filter(l => l.action === 'kick').length;
                                                                batchTxt +=
                                                                        `┌─〔 *🏘️ ${namaGrupCache[gid]}* 〕\n` +
                                                                        `│ 📊 Total: *${byGid[gid].length}* | 🟡 ${gWarn} warn | 🔴 ${gKick} kick\n` +
                                                                        `│ (${logs.length} terbaru)\n` +
                                                                        `│\n`;
                                                                for (let i = 0; i < logs.length; i++) {
                                                                        const l = logs[i];
                                                                        batchTxt +=
                                                                                `│ *${i + 1}.* ${_fmtAction(l)}\n` +
                                                                                `│    👤 ${l.senderJid?.includes('@lid') ? (r=>r?('@'+r.number+(r.name?' ('+r.name+')':'')):'⚠️ ID tidak dikenal (LID)')(resolveLidFromContacts(l.senderJid)) : '@'+l.senderNum}\n` +
                                                                                `│    📡 ${l.method || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n` +
                                                                                `│\n`;
                                                                }
                                                                batchTxt += `└────────────────────────────────\n\n`;
                                                        }
                                                        const finalTxt = gi === 0 ? header + '\n\n' + batchTxt.trim() : batchTxt.trim();
                                                        await tolak(hisoka, m, finalTxt);
                                                        // Delay kecil antar batch agar tidak flood
                                                        if (gi + GRUP_PER_MSG < uniqueGids.length) await new Promise(r => setTimeout(r, 600));
                                                }

                                        } else {
                                                // ── LOG GRUP INI: urut waktu, 25 terbaru ──
                                                const recentLogs = rawLogs.slice(-25).reverse();
                                                let logBaris = '';
                                                for (let i = 0; i < recentLogs.length; i++) {
                                                        const l = recentLogs[i];
                                                        logBaris +=
                                                                `│ *${i + 1}.* ${_fmtAction(l)}\n` +
                                                                `│    👤 ${l.senderJid?.includes('@lid') ? (r=>r?('@'+r.number+(r.name?' ('+r.name+')':'')):'⚠️ ID tidak dikenal (LID)')(resolveLidFromContacts(l.senderJid)) : '@'+l.senderNum}\n` +
                                                                `│    📡 ${l.method || '-'} • 🕐 ${_fmtWaktu(l.ts)}\n` +
                                                                `│\n`;
                                                }
                                                await tolak(hisoka, m,
                                                        `╭───〔 *📜 LOG ANTITAGSW* 〕───╮\n` +
                                                        `│\n` +
                                                        `│ 📊 Total log grup ini: *${rawLogs.length}*\n` +
                                                        `│ 🟡 Warn: *${totalWarn}* | 🔴 Kick: *${totalKick}*\n` +
                                                        `│ (Tampil 25 terbaru)\n` +
                                                        `│\n` +
                                                        logBaris +
                                                        `│ 📋 Sub-perintah:\n` +
                                                        `│ • *.antitagsw log*       → Log grup ini\n` +
                                                        (m.isOwner ? `│ • *.antitagsw log all*   → Semua grup\n` : '') +
                                                        `│ • *.antitagsw log clear* → Hapus log grup ini\n` +
                                                        (m.isOwner ? `│ • *.antitagsw log clear all* → Hapus semua\n` : '') +
                                                        `│\n` +
                                                        `╰────────────────────────────────────╯`
                                                );
                                        }
                                        logCommand(m, hisoka, 'antitagsw log');

                                } else {
                                        const config = loadConfig();
                                        const isEnabled = isAntiTagSWEnabled(m.from);
                                        const globalEnabled = config.antiTagSW?.enabled ?? false;
                                        const warnings = getWarnings(m.from);
                                        const totalWarned = Object.keys(warnings).length;

                                        // Tentukan status label grup
                                        let grupStatus;
                                        if (isEnabled) {
                                                grupStatus = '🟢 Aktif';
                                        } else if (globalEnabled) {
                                                grupStatus = '🔴 Nonaktif *(belum ditambahkan)*';
                                        } else {
                                                grupStatus = '🔴 Nonaktif';
                                        }

                                        const hintAdd = globalEnabled && !isEnabled
                                                ? `│ 💡 Ketik *.antitagsw add* untuk\n│    mengaktifkan di grup ini!\n│\n`
                                                : '';

                                        let statusText =
                                                `╭───〔 *ℹ️ ANTI-TAG SEMUA WARGA* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🌐 Global   : ${globalEnabled ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                                                `│ 📌 Grup ini : ${grupStatus}\n` +
                                                `│\n` +
                                                `│ ⚙️ Konfigurasi:\n` +
                                                `│ • Maks. warning: *${config.antiTagSW?.maxWarnings ?? 3}x*\n` +
                                                `│ • Member warned: *${totalWarned} orang*\n` +
                                                `│\n` +
                                                `│ ℹ️ Mendeteksi tag grup via STATUS\n` +
                                                `│\n` +
                                                hintAdd +
                                                `│ 📋 Cara penggunaan:\n` +
                                                `│ • *.antitagsw add*      → Tambah grup ini\n` +
                                                `│ • *.antitagsw on*       → Aktifkan\n` +
                                                `│ • *.antitagsw off*      → Nonaktifkan\n` +
                                                `│ • *.antitagsw reset*    → Reset warning\n` +
                                                `│ • *.antitagsw list*     → Daftar grup aktif\n` +
                                                `│ • *.antitagsw log*      → Riwayat pelanggaran\n` +
                                                (m.isOwner ?
                                                `│ • *.antitagsw warn <n>* → Set maks warning\n` +
                                                `│ • *.antitagsw log all*  → Log semua grup\n` +
                                                `│ • *.antitagsw global on*  → Aktifkan global\n` +
                                                `│ • *.antitagsw global off* → Nonaktifkan global\n` : '') +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`;

                                        await tolak(hisoka, m, statusText);
                                }
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
                                if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
                                if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

                                const isWelcomeCmd = m.command === 'welcome' || m.command === 'setwelcome';
                                const featureName = isWelcomeCmd ? 'Welcome' : 'Goodbye';
                                const featureKey  = isWelcomeCmd ? 'welcome' : 'goodbye';
                                const arg = (query || '').trim().toLowerCase();

                                const cfgPath = path.join(process.cwd(), 'config.json');
                                const cfg = loadConfig();
                                if (!cfg.welcomeGoodbye) cfg.welcomeGoodbye = { enabled: true, groups: {} };
                                if (!cfg.welcomeGoodbye.groups) cfg.welcomeGoodbye.groups = {};
                                if (!cfg.welcomeGoodbye.groups[m.from]) cfg.welcomeGoodbye.groups[m.from] = {};

                                if (!cfg.welcomeGoodbye.enabled) {
                                        return tolak(hisoka, m, `❌ Fitur Welcome/Goodbye dinonaktifkan secara global.\nUbah *welcomeGoodbye.enabled* di config.json menjadi *true*.`);
                                }

                                if (arg === 'on') {
                                        cfg.welcomeGoodbye.groups[m.from][featureKey] = true;
                                        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 4));
                                        saveCekautoTimestamp(featureKey, m.from);
                                        await sendConfirmWithButtons(hisoka, m,
                                                `╭───〔 *✅ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🟢 *Fitur ${featureName} Card AKTIF!*\n` +
                                                `│\n` +
                                                `│ 🖼️ Bot akan otomatis kirim gambar canvas\n` +
                                                `│    saat ada anggota ${isWelcomeCmd ? 'bergabung' : 'keluar'} di grup ini.\n` +
                                                `│\n` +
                                                `│ 💡 Nonaktifkan: *.${featureKey} off*\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`,
                                                [{ text: '➕ Aktifkan Semua Grup', id: `__addallgrp__${featureKey}` }]
                                        );
                                        logCommand(m, hisoka, `set${featureKey} on`);
                                } else if (arg === 'off') {
                                        cfg.welcomeGoodbye.groups[m.from][featureKey] = false;
                                        fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 4));
                                        await tolak(hisoka, m,
                                                `╭───〔 *❌ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🔴 *Fitur ${featureName} Card NONAKTIF!*\n` +
                                                `│\n` +
                                                `│ Bot tidak akan kirim gambar canvas\n` +
                                                `│    di grup ini.\n` +
                                                `│\n` +
                                                `│ 💡 Aktifkan: *.${featureKey} on*\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                        logCommand(m, hisoka, `set${featureKey} off`);
                                } else {
                                        const isOn = cfg.welcomeGoodbye.groups[m.from]?.[featureKey] === true;
                                        const globalOn = cfg.welcomeGoodbye.enabled;
                                        await tolak(hisoka, m,
                                                `╭───〔 *ℹ️ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                                                `│\n` +
                                                `│ 🌐 Global   : ${globalOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                                                `│ 📌 Grup ini : ${isOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                                                `│\n` +
                                                `│ 🖼️ Mengirim gambar canvas keren saat\n` +
                                                `│    anggota ${isWelcomeCmd ? 'bergabung' : 'keluar'} dari grup ini.\n` +
                                                `│\n` +
                                                `│ 📋 Cara penggunaan:\n` +
                                                `│ • *.${featureKey} on*  → Aktifkan\n` +
                                                `│ • *.${featureKey} off* → Nonaktifkan\n` +
                                                `│\n` +
                                                `╰────────────────────────────────────╯`
                                        );
                                }
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
                                if (!m.isOwner) return;

                                const ssArgs = m.text.trim().split(/ +/);
                                if (ssArgs.length < 3) return;

                                const ssTarget = ssArgs[1];
                                const ssEncoded = ssArgs.slice(2).join(' ');

                                let ssMeta;
                                try {
                                        ssMeta = JSON.parse(decodeURIComponent(ssEncoded));
                                } catch (e) {
                                        return tolak(hisoka, m, '❌ Gagal memparse konten: ' + (e.message || e));
                                }

                                const ssAllGids = hisoka.groups.keys().filter(id => id.endsWith('@g.us'));
                                const ssTargets = ssTarget === 'all' ? ssAllGids : [ssTarget];

                                if (!ssTargets.length) return tolak(hisoka, m, '❌ Tidak ada grup tujuan.');

                                let ssRawContent;
                                let ssAudioCaption = null;
                                let ssTextDirect = null;
                                if (ssMeta.type === 'text') {
                                        ssTextDirect = ssMeta.text;
                                } else if (ssMeta.type === 'image') {
                                        ssRawContent = { image: { url: ssMeta.file } };
                                        if (ssMeta.caption) ssRawContent.caption = ssMeta.caption;
                                } else if (ssMeta.type === 'video') {
                                        ssRawContent = { video: { url: ssMeta.file } };
                                        if (ssMeta.caption) ssRawContent.caption = ssMeta.caption;
                                } else if (ssMeta.type === 'audio') {
                                        ssRawContent = { audio: { url: ssMeta.file }, mimetype: ssMeta.mime || 'audio/ogg; codecs=opus', ptt: false };
                                        // Caption audio dikirim terpisah sebagai teks status
                                        if (ssMeta.caption) ssAudioCaption = ssMeta.caption;
                                } else {
                                        return tolak(hisoka, m, '❌ Tipe konten tidak dikenali.');
                                }

                                await tolak(hisoka, m, `⏳ Mengirim sebagai Group Status ke *${ssTargets.length}* grup, mohon tunggu...`);

                                let ssOk = 0, ssFail = 0;
                                for (const gid of ssTargets) {
                                        try {
                                                let ssInside;
                                                if (ssTextDirect !== null) {
                                                        ssInside = {
                                                                extendedTextMessage: {
                                                                        text: ssTextDirect,
                                                                        backgroundArgb: 4278190080,
                                                                        font: 0
                                                                }
                                                        };
                                                } else {
                                                        ssInside = await generateWAMessageContent(ssRawContent, {
                                                                upload: hisoka.waUploadToServer
                                                        });
                                                }
                                                const ssSecret = crypto.randomBytes(32);
                                                const ssMsg = generateWAMessageFromContent(gid, {
                                                        messageContextInfo: { messageSecret: ssSecret },
                                                        groupStatusMessageV2: {
                                                                message: {
                                                                        ...ssInside,
                                                                        messageContextInfo: { messageSecret: ssSecret }
                                                                }
                                                        }
                                                }, {});
                                                await hisoka.relayMessage(gid, ssMsg.message, { messageId: ssMsg.key.id });

                                                // Kirim caption audio sebagai status teks terpisah
                                                if (ssAudioCaption) {
                                                        await new Promise(r => setTimeout(r, 800));
                                                        const ssCaptionInside = await generateWAMessageContent({ text: ssAudioCaption }, {
                                                                upload: hisoka.waUploadToServer
                                                        });
                                                        const ssCaptionSecret = crypto.randomBytes(32);
                                                        const ssCaptionMsg = generateWAMessageFromContent(gid, {
                                                                messageContextInfo: { messageSecret: ssCaptionSecret },
                                                                groupStatusMessageV2: {
                                                                        message: {
                                                                                ...ssCaptionInside,
                                                                                messageContextInfo: { messageSecret: ssCaptionSecret }
                                                                        }
                                                                }
                                                        }, {});
                                                        await hisoka.relayMessage(gid, ssCaptionMsg.message, { messageId: ssCaptionMsg.key.id });
                                                }

                                                ssOk++;
                                                if (ssTargets.length > 1) await new Promise(r => setTimeout(r, 1000));
                                        } catch (e) {
                                                console.error(`[sendstatus] Gagal ke ${gid}:`, e.message);
                                                ssFail++;
                                        }
                                }

                                if (ssMeta.file && fs.existsSync(ssMeta.file)) {
                                        try { fs.unlinkSync(ssMeta.file); } catch (_) {}
                                }

                                await tolak(hisoka, m, 
                                        `✅ *Selesai Kirim Group Status!*\n\n` +
                                        `📊 *Hasil:*\n` +
                                        `• ✅ Berhasil : ${ssOk} grup\n` +
                                        `• ❌ Gagal    : ${ssFail} grup\n` +
                                        `• 📦 Total    : ${ssTargets.length} grup`
                                );

                                logCommand(m, hisoka, 'sendstatus');
                                break;
                        }

                        case 'gt':
                        case 'gtag':
                        case 'ghosttag': {
                                if (!m.isOwner) return;

                                const gtPrefix = m.prefix || '.';
                                const gtUserJid = hisoka.user?.id;

                                const gtGroupKeys = hisoka.groups.keys().filter(id => id.endsWith('@g.us'));

                                // ── Helper: kirim albumMessage ghosttag ke 1 grup ──
                                async function gtSendOne(jid) {
                                        let participants = [];
                                        try {
                                                const meta = hisoka.groups.read(jid);
                                                participants = (meta?.participants || []).map(v => v.phoneNumber || v.id).filter(Boolean);
                                        } catch (_) {}
                                        if (!participants.length) {
                                                try {
                                                        const fetched = await hisoka.groupMetadata(jid);
                                                        participants = fetched.participants.map(v => v.id).filter(Boolean);
                                                } catch (_) {}
                                        }
                                        if (!participants.length) return 0;
                                        const album = generateWAMessageFromContent(
                                                jid,
                                                {
                                                        albumMessage: {
                                                                expectedImageCount: 0,
                                                                expectedVideoCount: 0,
                                                                contextInfo: { mentionedJid: participants }
                                                        }
                                                },
                                                { userJid: gtUserJid }
                                        );
                                        await hisoka.relayMessage(jid, album.message, { messageId: album.key.id });
                                        return participants.length;
                                }

                                // ── Tampilkan menu button jika tidak ada query / bukan JID / bukan 'all' ──
                                if (!query || (!query.trim().endsWith('@g.us') && query.trim() !== 'all')) {
                                        if (!gtGroupKeys.length) return tolak(hisoka, m, '❌ Bot tidak bergabung di grup manapun.');

                                        const gtBotNum = (hisoka.user?.id || '').split('@')[0].split(':')[0];
                                        const gtTotalMemberAll = gtGroupKeys.reduce((acc, jid) => {
                                                const g = hisoka.groups.read(jid);
                                                return acc + (g?.participants?.length || 0);
                                        }, 0);

                                        const gtSorted = gtGroupKeys
                                                .map(jid => {
                                                        const g = hisoka.groups.read(jid);
                                                        const parts = g?.participants || [];
                                                        const totalMember = parts.length;
                                                        const totalAdmin = parts.filter(p => p.admin).length;
                                                        const isBotAdmin = parts.some(p => {
                                                                const num = (p.jid || p.phoneNumber || p.id || '').split('@')[0].split(':')[0];
                                                                return num === gtBotNum && p.admin;
                                                        });
                                                        return {
                                                                jid,
                                                                name: g?.subject || g?.name || jid,
                                                                totalMember,
                                                                totalAdmin,
                                                                isBotAdmin
                                                        };
                                                })
                                                .sort((a, b) => b.totalMember - a.totalMember || a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'id', { numeric: true }));

                                        const btn = new Button()
                                                .setBody(
                                                        `『 👻 』 *G H O S T  T A G*\n` +
                                                        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                                                        `✦ *Semua Grup* — tag semua grup sekaligus\n` +
                                                        `✦ *Pilih Satu Grup* — pilih dari daftar\n\n` +
                                                        `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                                                        `🗂️ Grup   : *${gtGroupKeys.length}* grup\n` +
                                                        `👥 Member : *${gtTotalMemberAll}* total`
                                                )
                                                .setFooter(`⚡ Wily Bot • Ghost Tag System`)
                                                .addReply('🌐 Tag Semua Grup', `${gtPrefix}ghosttag all`)
                                                .addSelection('📂 Pilih Satu Grup')
                                                .makeSections('✦ Daftar Grup');

                                        for (const { jid, name, totalMember, totalAdmin, isBotAdmin } of gtSorted) {
                                                const adminBadge = isBotAdmin ? '👑 Admin' : '👤 Member';
                                                btn.makeRow(
                                                        adminBadge,
                                                        name,
                                                        `👥 ${totalMember} anggota  •  🛡️ ${totalAdmin} admin`,
                                                        `${gtPrefix}ghosttag ${jid}`
                                                );
                                        }

                                        await btn.run(m.from, hisoka, m);
                                        logCommand(m, hisoka, 'ghosttag');
                                        break;
                                }

                                // ── Mode: semua grup ──
                                if (query.trim() === 'all') {
                                        if (!gtGroupKeys.length) return tolak(hisoka, m, '❌ Bot tidak bergabung di grup manapun.');

                                        await tolak(hisoka, m, `⏳ Mengirim ghost tag ke *${gtGroupKeys.length}* grup, mohon tunggu...`);

                                        let gtOk = 0, gtFail = 0, gtTotalMember = 0;
                                        for (const jid of gtGroupKeys) {
                                                try {
                                                        const count = await gtSendOne(jid);
                                                        if (count > 0) { gtOk++; gtTotalMember += count; }
                                                        else gtFail++;
                                                } catch (_) { gtFail++; }
                                                if (gtGroupKeys.length > 1) await new Promise(r => setTimeout(r, 1000));
                                        }

                                        await tolak(hisoka, m, 
                                                `✅ *Ghost Tag Selesai!*\n\n` +
                                                `📊 *Hasil:*\n` +
                                                `• ✅ Berhasil : ${gtOk} grup\n` +
                                                `• ❌ Gagal    : ${gtFail} grup\n` +
                                                `• 👥 Total    : ${gtTotalMember} member di-tag`
                                        );
                                        logCommand(m, hisoka, 'ghosttag');
                                        break;
                                }

                                // ── Mode: satu grup dari JID ──
                                const gtJid = query.trim();
                                try {
                                        const count = await gtSendOne(gtJid);
                                        if (!count) return tolak(hisoka, m, '❌ Tidak ada member ditemukan atau gagal mengambil data grup.');
                                        await tolak(hisoka, m, `✅ Ghost tag berhasil dikirim ke *${count}* member!`);
                                } catch (e) {
                                        await tolak(hisoka, m, '❌ Gagal mengirim ghost tag: ' + (e.message || e));
                                }

                                logCommand(m, hisoka, 'ghosttag');
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

                        case 'editgambar':
                        case 'editai':
                        case 'aiedit': {
                                try {
                                        const { deepaiEditImage } = _require(path.resolve('./src/scrape/ai/imageEdit.cjs'));

                                        const isMediaMsg   = m.isMedia && m.type === 'imageMessage';
                                        const isQuotedImg  = m.isQuoted && quoted.isMedia && quoted.type === 'imageMessage';

                                        if (!isMediaMsg && !isQuotedImg) {
                                                await tolak(hisoka, m,
                                                        `╭═══『 🎨 *AI Image Editor* 』═══╮\n│\n` +
                                                        `│ Edit gambar pakai teks prompt!\n│\n` +
                                                        `│ *Cara Pakai:*\n` +
                                                        `│ Kirim/reply gambar dengan caption:\n│\n` +
                                                        `│ *.editgambar* [deskripsi edit]\n│\n` +
                                                        `│ *Contoh:*\n` +
                                                        `│ *.editgambar* make it cinematic\n` +
                                                        `│ *.editgambar* ubah jadi malam hari\n` +
                                                        `│ *.editgambar* tambahkan salju\n│\n` +
                                                        `│ Alias: *.editai* / *.aiedit*\n│\n` +
                                                        `╰══════════════════════════╯`
                                                );
                                                break;
                                        }

                                        const prompt = query?.trim() || 'make it look more cinematic';

                                        let mediaBuffer;
                                        if (isMediaMsg) {
                                                mediaBuffer = await m.downloadMedia();
                                        } else {
                                                mediaBuffer = await downloadMediaMessage(
                                                        { ...m.quoted, message: m.quoted.raw },
                                                        'buffer',
                                                        {},
                                                        { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
                                                );
                                        }

                                        if (!mediaBuffer || mediaBuffer.length === 0) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, '❌ Gagal download gambar. Coba lagi!');
                                                break;
                                        }

                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                        await tolak(hisoka, m, `⏳ Sedang mengedit gambar...\nPrompt: _"${prompt}"_\nMohon tunggu sebentar.`);

                                        const result = await deepaiEditImage(mediaBuffer, prompt);

                                        if (!result.status || !result.result_url) {
                                                throw new Error(result.error || 'DeepAI gagal memproses gambar');
                                        }

                                        const imgFetch = await fetch(result.result_url);
                                        if (!imgFetch.ok) throw new Error('Gagal download hasil edit');
                                        const imgBuffer = Buffer.from(await imgFetch.arrayBuffer());

                                        await hisoka.sendMessage(m.from, {
                                                image  : imgBuffer,
                                                caption: `✅ *Gambar berhasil diedit!*\n✏️ Prompt: _"${prompt}"_\n🔗 Powered by DeepAI`,
                                        }, { quoted: m });

                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'editgambar');
                                } catch (error) {
                                        console.error('\x1b[31m[EditGambar] Error:\x1b[39m', error.message);
                                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                        await tolak(hisoka, m, `❌ Gagal mengedit gambar: ${error.message}`);
                                }
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
                                if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa gunakan perintah ini.');
                                if (!m.isGroup) return tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.');

                                const { simulate: simulasiIW } = _require(path.resolve('./src/scrape/anime/infowibu.cjs'));
                                const cfgPathIW = path.join(process.cwd(), 'config.json');
                                const sub = (query || '').trim().toLowerCase();
                                const pfx = m.prefix || '.';

                                // Pastikan struktur infowibu sudah ada di config.json
                                const cfgIW = loadConfig();
                                if (!cfgIW.infowibu)         cfgIW.infowibu         = { enabled: true, groups: {} };
                                if (!cfgIW.infowibu.groups)  cfgIW.infowibu.groups  = {};

                                if (!sub || sub === 'help') {
                                        const aktif = cfgIW.infowibu.groups[m.from]?.enabled === true;
                                        await tolak(hisoka, m,
                                                `╭─「 📺 *INFO WIBU* 」\n` +
                                                `│\n` +
                                                `│ Status di grup ini: ${aktif ? '✅ *Aktif*' : '❌ *Nonaktif*'}\n` +
                                                `│\n` +
                                                `│ *Perintah:*\n` +
                                                `│ • ${pfx}infowibu on — aktifkan\n` +
                                                `│ • ${pfx}infowibu off — nonaktifkan\n` +
                                                `│ • ${pfx}infowibu test — kirim test sekarang\n` +
                                                `│ • ${pfx}infowibu status — lihat semua grup\n` +
                                                `│\n` +
                                                `│ 💡 Bot otomatis kirim notif episode\n` +
                                                `│    baru ke grup yang aktif (realtime).\n` +
                                                `╰──────────────────────`
                                        );
                                        break;
                                }

                                if (sub === 'on') {
                                        const sebelumnyaIW = cfgIW.infowibu.groups[m.from]?.enabled === true;
                                        cfgIW.infowibu.groups[m.from] = { enabled: true, diubahPada: Date.now() };
                                        fs.writeFileSync(cfgPathIW, JSON.stringify(cfgIW, null, 2));
                                        await sendConfirmWithButtons(hisoka, m,
                                                `╭─「 📺 *INFO WIBU* 」\n` +
                                                `│\n` +
                                                `│ Status sebelumnya : ${sebelumnyaIW ? '✅ *ON*' : '❌ *OFF*'}\n` +
                                                `│ Status sekarang   : ✅ *ON*\n` +
                                                `│\n` +
                                                (sebelumnyaIW
                                                        ? `│ ℹ️ Fitur ini sebelumnya sudah aktif,\n│    tidak ada perubahan.\n`
                                                        : `│ ✅ Fitur berhasil diaktifkan!\n│    Bot akan kirim notif episode\n│    baru secara realtime ke grup ini.\n`) +
                                                `│\n` +
                                                `│ Ketik *${pfx}infowibu off* untuk menonaktifkan.\n` +
                                                `╰──────────────────────`,
                                                [{ text: '➕ Aktifkan Semua Grup', id: '__addallgrp__infowibu' }]
                                        );
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'infowibu-on');
                                        break;
                                }

                                if (sub === 'off') {
                                        const sebelumnyaIW = cfgIW.infowibu.groups[m.from]?.enabled === true;
                                        cfgIW.infowibu.groups[m.from] = { enabled: false, diubahPada: Date.now() };
                                        fs.writeFileSync(cfgPathIW, JSON.stringify(cfgIW, null, 2));
                                        await tolak(hisoka, m,
                                                `╭─「 📺 *INFO WIBU* 」\n` +
                                                `│\n` +
                                                `│ Status sebelumnya : ${sebelumnyaIW ? '✅ *ON*' : '❌ *OFF*'}\n` +
                                                `│ Status sekarang   : ❌ *OFF*\n` +
                                                `│\n` +
                                                (sebelumnyaIW
                                                        ? `│ ❌ Fitur berhasil dinonaktifkan.\n│    Bot tidak akan kirim notif lagi\n│    di grup ini.\n`
                                                        : `│ ℹ️ Fitur ini sebelumnya sudah nonaktif,\n│    tidak ada perubahan.\n`) +
                                                `│\n` +
                                                `│ Ketik *${pfx}infowibu on* untuk mengaktifkan kembali.\n` +
                                                `╰──────────────────────`
                                        );
                                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                        logCommand(m, hisoka, 'infowibu-off');
                                        break;
                                }

                                if (sub === 'status') {
                                        const semuaGrup = Object.entries(cfgIW.infowibu.groups || {});
                                        if (!semuaGrup.length) {
                                                await tolak(hisoka, m, '📋 Belum ada grup yang dikonfigurasi.');
                                                break;
                                        }
                                        let txt = `╭─「 📋 *STATUS INFOWIBU* 」\n│\n`;
                                        for (const [jid, data] of semuaGrup) {
                                                const label = jid.replace('@g.us', '');
                                                const icon  = data.enabled ? '✅' : '❌';
                                                txt += `│ ${icon} ${label}\n`;
                                        }
                                        txt += `╰──────────────────────`;
                                        await tolak(hisoka, m, txt);
                                        break;
                                }

                                if (sub === 'test') {
                                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                                        try {
                                                const hasil = await simulasiIW();
                                                if (hasil.urlGambar) {
                                                        await hisoka.sendMessage(m.from, {
                                                                image: { url: hasil.urlGambar },
                                                                caption: hasil.caption,
                                                        }, { quoted: m });
                                                } else {
                                                        await tolak(hisoka, m, hasil.caption);
                                                }
                                                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                                                logCommand(m, hisoka, 'infowibu-test');
                                        } catch (err) {
                                                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                                                await tolak(hisoka, m, `❌ Gagal fetch info wibu: ${err?.message || err}`);
                                        }
                                        break;
                                }

                                await tolak(hisoka, m, `❌ Sub-perintah tidak dikenal. Ketik *${pfx}infowibu* untuk bantuan.`);
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
