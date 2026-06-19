'use strict';

async function handleVo({ hisoka, m, query, tolak, logCommand, loadConfig, quoted, downloadMediaMessage, isJidGroup, extractMediaFromMessage, hasViewOnceCache, getViewOnceCache }) {
	try {
		if (!m.isQuoted) {
			if (query) return;
			await tolak(hisoka, m, `*📱 Cara Penggunaan View Once*

*Command:* .rvo / .viewonce / .vo
*Action:* Reply pesan view once yang ingin dibuka

*Format yang Didukung:*
• 🖼️ Gambar View Once
• 🎥 Video View Once
• 🎵 Audio View Once
• 📄 Dokumen View Once
• 🏷️ Sticker View Once

*Contoh Penggunaan:*
1. Reply pesan view once
2. Ketik: .rvo
3. Media akan dikirim ulang tanpa view once`);
			return;
		}

		const quotedMsg = m.content?.contextInfo?.quotedMessage;
		if (!quotedMsg) { await tolak(hisoka, m, 'Tidak ada pesan yang di-reply.'); return; }

		const mediaInfo = extractMediaFromMessage(quotedMsg);
		if (!mediaInfo) { await tolak(hisoka, m, 'Media tidak ditemukan dalam pesan yang di-reply.'); return; }

		await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

		const contextInfo       = m.content?.contextInfo;
		const quotedParticipant = contextInfo?.participant;
		const quotedStanzaId    = contextInfo?.stanzaId;

		let buffer = null, cachedMeta = null;
		if (quotedStanzaId && hasViewOnceCache(quotedStanzaId)) {
			const cached = getViewOnceCache(quotedStanzaId);
			if (cached) { buffer = cached.buffer; cachedMeta = cached.meta; }
		}

		if (!buffer) {
			let downloadMessage = {};
			downloadMessage[mediaInfo.mediaType] = mediaInfo.mediaMessage;
			const dlMsg = m.quoted?.key
				? { ...m.quoted, message: downloadMessage }
				: {
					key: {
						remoteJid: m.from, fromMe: quotedParticipant ? false : (contextInfo?.fromMe ?? false), id: quotedStanzaId,
						...(isJidGroup(m.from) && quotedParticipant ? { participant: quotedParticipant } : {})
					},
					message: downloadMessage
				};
			buffer = await downloadMediaMessage(dlMsg, 'buffer', {}, { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage });
		}

		const jakartaTime = new Date().toLocaleString('id-ID', {
			timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long',
			day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit'
		});
		const caption    = cachedMeta?.caption || mediaInfo.mediaMessage.caption || '';
		const senderName = cachedMeta?.senderName || m.quoted?.pushName || m.pushName || 'Unknown';
		const voLabel    = mediaInfo.isViewOnce ? 'View Once' : 'Media';

		const formatCaption = (type, originalCaption = '') =>
			`╭═══『 *📱 ${voLabel.toUpperCase()} MEDIA* 』═══╮\n│\n│ *🎯 Type:* ${type}\n│ *⏰ Waktu:* ${jakartaTime} WIB\n│ *💬 Caption:* ${originalCaption || 'No caption'}\n│ *📱 Sender:* ${senderName}\n│ *✅ Status:* Berhasil dibuka\n│\n╰═════════════════════╯\n\n_📱 ${voLabel} berhasil dibuka!_`;

		let sendOptions = {};
		switch (mediaInfo.mediaType) {
			case 'imageMessage':    sendOptions = { image: buffer, caption: formatCaption('🖼️ Image', caption) }; break;
			case 'videoMessage':    sendOptions = { video: buffer, caption: formatCaption('🎥 Video', caption) }; break;
			case 'audioMessage':    sendOptions = { audio: buffer, mimetype: cachedMeta?.mimetype || mediaInfo.mediaMessage.mimetype || 'audio/ogg; codecs=opus', ptt: cachedMeta?.ptt || mediaInfo.mediaMessage.ptt || false }; break;
			case 'documentMessage': sendOptions = { document: buffer, caption: formatCaption('📄 Document', caption), mimetype: cachedMeta?.mimetype || mediaInfo.mediaMessage.mimetype || 'application/octet-stream', fileName: cachedMeta?.fileName || mediaInfo.mediaMessage.fileName || 'ViewOnce_Document' }; break;
			case 'stickerMessage':  sendOptions = { sticker: buffer }; break;
			default: throw new Error(`Unsupported media type: ${mediaInfo.mediaType}`);
		}

		if (hisoka?.isMainBot === false) {
			const rvoConfig = loadConfig();
			const ownerList = rvoConfig.owners || [];
			for (const ownerNum of ownerList) {
				const ownerJid = ownerNum.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
				await hisoka.sendMessage(ownerJid, sendOptions);
			}
		} else {
			await hisoka.sendMessage(m.from, sendOptions, { quoted: m });
		}

		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'rvo');
	} catch (error) {
		console.error('\x1b[31m[RVO] Error:\x1b[39m', error.message);
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
		await tolak(hisoka, m, `Gagal membuka view once: ${error.message}`);
	}
}

module.exports = { handleVo };
