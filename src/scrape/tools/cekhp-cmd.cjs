'use strict';

async function handleCekhp({ hisoka, m, query, tolak, logCommand, logError, _require, path, gemini }) {
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
			return;
		}

		const { cekHP, getHPImage, formatHPSpecs } = _require(path.resolve('./src/scrape/tools/cekhp.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data spesifikasi *${input}* + estimasi harga pasar Indonesia...`);

		const result = await cekHP(input);
		let report = formatHPSpecs(result);

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
}

module.exports = { handleCekhp };
