'use strict';

async function handleSw({ hisoka, m, query, tolak, logCommand, loadConfig, downloadMediaMessage, isJidGroup }) {
	try {
		if (!m.isQuoted) {
			if (query) return;
			await tolak(hisoka, m, `*📖 Cara Penggunaan Get Story/Status*\n\n*Command:* .getsw / .sw\n*Cara:* Reply pesan story/status yang ingin diambil medianya\n\n*Format yang Didukung:*\n• 🖼️ Gambar Story\n• 🎥 Video Story\n• 🎵 Audio Story\n• 📄 Dokumen Story\n\n*Contoh:*\n1. Reply ke pesan story seseorang\n2. Ketik: .getsw\n3. Media dikirim ke owner`);
			return;
		}

		const swQuotedMsg = m.content?.contextInfo?.quotedMessage;
		if (!swQuotedMsg) { await tolak(hisoka, m, '❌ Tidak ada pesan yang di-reply.'); return; }

		let swTargetMsg = swQuotedMsg;
		if (swTargetMsg.ephemeralMessage?.message)             swTargetMsg = swTargetMsg.ephemeralMessage.message;
		if (swTargetMsg.viewOnceMessage?.message)              swTargetMsg = swTargetMsg.viewOnceMessage.message;
		if (swTargetMsg.viewOnceMessageV2?.message)            swTargetMsg = swTargetMsg.viewOnceMessageV2.message;
		if (swTargetMsg.viewOnceMessageV2Extension?.message)   swTargetMsg = swTargetMsg.viewOnceMessageV2Extension.message;

		const swMediaTypes = ['imageMessage','videoMessage','audioMessage','documentMessage','stickerMessage'];
		const swMediaType  = swMediaTypes.find(t => swTargetMsg[t]);
		if (!swMediaType) { await tolak(hisoka, m, '❌ Media tidak ditemukan. Pastikan me-reply story/status yang berisi media.'); return; }

		await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

		const swContextInfo  = m.content?.contextInfo;
		const swParticipant  = swContextInfo?.participant;
		const swStanzaId     = swContextInfo?.stanzaId;
		const swMediaMessage = swTargetMsg[swMediaType];

		let swDownloadMsg = {};
		swDownloadMsg[swMediaType] = swMediaMessage;

		const swDlMsg = m.quoted?.key
			? { ...m.quoted, message: swDownloadMsg }
			: {
				key: {
					remoteJid: m.from, fromMe: swParticipant ? false : (swContextInfo?.fromMe ?? false), id: swStanzaId,
					...(isJidGroup(m.from) && swParticipant ? { participant: swParticipant } : {})
				},
				message: swDownloadMsg
			};

		const swBuffer = await downloadMediaMessage(swDlMsg, 'buffer', {}, { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage });

		const swJakartaTime = new Date().toLocaleString('id-ID', {
			timeZone: 'Asia/Jakarta', weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
			hour: '2-digit', minute: '2-digit', second: '2-digit'
		});
		const swSenderName = m.quoted?.pushName || swContextInfo?.pushName || m.pushName || 'Unknown';
		const swCaption    = swMediaMessage.caption || '';

		const swFormatCaption = (type) => `╭═══『 *📖 GET STORY/STATUS* 』═══╮\n│\n│ *🎯 Type:* ${type}\n│ *⏰ Waktu:* ${swJakartaTime} WIB\n│ *📱 Dari:* ${swSenderName}\n│ *💬 Caption:* ${swCaption || 'No caption'}\n│\n╰═════════════════════╯\n\n_📖 Story berhasil diambil!_`;

		let swSendOptions = {};
		switch (swMediaType) {
			case 'imageMessage':    swSendOptions = { image: swBuffer, caption: swFormatCaption('🖼️ Image') }; break;
			case 'videoMessage':    swSendOptions = { video: swBuffer, caption: swFormatCaption('🎥 Video') }; break;
			case 'audioMessage':    swSendOptions = { audio: swBuffer, mimetype: swMediaMessage.mimetype || 'audio/ogg; codecs=opus', ptt: swMediaMessage.ptt || false }; break;
			case 'documentMessage': swSendOptions = { document: swBuffer, caption: swFormatCaption('📄 Document'), mimetype: swMediaMessage.mimetype || 'application/octet-stream', fileName: swMediaMessage.fileName || 'Story_Document' }; break;
			case 'stickerMessage':  swSendOptions = { sticker: swBuffer }; break;
		}

		const swConfig = loadConfig();
		const swOwners = swConfig.owners || [];
		for (const ownerNum of swOwners) {
			const ownerJid = ownerNum.replace(/[^0-9]/g, '') + '@s.whatsapp.net';
			await hisoka.sendMessage(ownerJid, swSendOptions);
		}

		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'getsw');
	} catch (error) {
		console.error('\x1b[31m[GETSW] Error:\x1b[39m', error.message);
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
		await tolak(hisoka, m, `❌ Gagal mengambil story: ${error.message}`);
	}
}

module.exports = { handleSw };
