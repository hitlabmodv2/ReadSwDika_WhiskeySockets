'use strict';

async function handleWhatsmusik({ hisoka, m, query, tolak, logCommand, logError, _require, path, getMediaTypeFromMessage, downloadMediaBuffer, ensureYtdlp }) {
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
			return;
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
}

module.exports = { handleWhatsmusik };
