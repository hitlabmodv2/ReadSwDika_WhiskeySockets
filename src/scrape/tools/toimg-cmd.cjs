'use strict';

async function handleToimg({ hisoka, m, query, tolak, logCommand, quoted, downloadMediaMessage, exec, util, path, fs }) {
	try {
		const sharp = (await import('sharp')).default;
		
		if (!m.isQuoted || quoted.type !== 'stickerMessage') {
			if (query) return;
			await tolak(hisoka, m, '❌ Reply sticker untuk dijadikan gambar!');
			return;
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
			return;
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
			return;
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
}

module.exports = { handleToimg };
