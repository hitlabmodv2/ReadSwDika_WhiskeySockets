'use strict';

async function handleVsbandingkan({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';

		if (!input) {
			await tolak(hisoka, m,
				`╭─「 📱 *BANDINGKAN HP* 」\n│\n│ Bandingkan spesifikasi 2 HP secara\n│ side-by-side dari database GSMArena.\n│\n│ *Format:*\n│ ${pfx}bandingkan <HP1> vs <HP2>\n│\n│ *Contoh:*\n│ • ${pfx}bandingkan Redmi Note 13 Pro vs Poco X6 Pro\n│ • ${pfx}bandingkan iPhone 15 vs Samsung S24\n│ • ${pfx}bandingkan Xiaomi 14 vs Pixel 8 Pro\n╰────────────────────`
			);
			return;
		}

		const sepMatch = input.match(/^(.+?)\s+vs\.?\s+(.+)$/i);
		if (!sepMatch) {
			await tolak(hisoka, m,
				`❌ Format salah.\n\nGunakan: *${pfx}bandingkan <HP1> vs <HP2>*\nContoh: *${pfx}bandingkan Redmi Note 13 Pro vs Poco X6 Pro*`
			);
			return;
		}

		const queryA = sepMatch[1].trim();
		const queryB = sepMatch[2].trim();

		const { bandingkanHP }     = _require(path.resolve('./src/scrape/tools/bandingkanhp.cjs'));
		const { buildComparisonPDF } = _require(path.resolve('./src/scrape/tools/bandingkanpdf.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data *${queryA}* dan *${queryB}*...\nMohon tunggu sebentar ⏳`);

		const result = await bandingkanHP(queryA, queryB);

		if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }

		const hasCombined = result.combined && result.combined.length > 500;
		const hasImgA     = result.imgA && result.imgA.length > 500;
		const hasImgB     = result.imgB && result.imgB.length > 500;

		if      (hasCombined) await hisoka.sendMessage(m.from, { image: result.combined, caption: result.text }, { quoted: m });
		else if (hasImgA)     await hisoka.sendMessage(m.from, { image: result.imgA,     caption: result.text }, { quoted: m });
		else if (hasImgB)     await hisoka.sendMessage(m.from, { image: result.imgB,     caption: result.text }, { quoted: m });
		else                  await hisoka.sendMessage(m.from, { text: result.text }, { quoted: m });

		try {
			const pdfBuf = await buildComparisonPDF(result);
			if (pdfBuf && pdfBuf.length > 500) {
				const safeA = (result.a.name || 'A').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
				const safeB = (result.b.name || 'B').replace(/[^a-zA-Z0-9]+/g, '_').slice(0, 30);
				await hisoka.sendMessage(m.from, {
					document: pdfBuf, mimetype: 'application/pdf',
					fileName: `Bandingkan_${safeA}_vs_${safeB}.pdf`,
					caption: `📄 *Versi PDF rapih*\n${result.a.name} vs ${result.b.name}`,
				}, { quoted: m });
			}
		} catch (pdfErr) {
			console.error('\x1b[31m[BandingkanHP][PDF] Error:\x1b[39m', pdfErr.message);
		}

		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'bandingkan');
	} catch (error) {
		console.error('\x1b[31m[BandingkanHP] Error:\x1b[39m', error.message);
		logError(error, 'command:bandingkan');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m,
			`❌ Gagal membandingkan HP.\n\n_${error.message}_\n\nPastikan nama HP ditulis lengkap dan dipisah dengan *vs*.\nContoh: *.bandingkan Redmi Note 13 Pro vs Poco X6 Pro*`
		);
	}
}

module.exports = { handleVsbandingkan };
