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
 *  media-helper.cjs — Media processing helper
 *  Fungsi pembantu pengolahan media: compress, convert, resize gambar/video/audio
 * ───────────────────────────────
 */
'use strict';

const {
	downloadMediaMessage,
	getContentType,
} = require('@whiskeysockets/baileys');

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

module.exports = {
	AI_MEDIA_CACHE_TTL,
	AI_MEDIA_TYPES,
	ensureAIMediaCache,
	rememberAIMedia,
	getQuotedStanzaId,
	getCachedQuotedMedia,
	unwrapMessagePayload,
	getMediaTypeFromMessage,
	downloadMediaBuffer,
	getQuotedMediaBuffer,
	getMediaInfo,
};
