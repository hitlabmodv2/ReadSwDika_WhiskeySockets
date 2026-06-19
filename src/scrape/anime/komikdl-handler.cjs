'use strict';

async function handleKomikdl({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';

		if (!input || !input.startsWith('http')) {
			await tolak(hisoka, m,
				`╭─「 📥 *KOMIKGET* 」\n│\n│ *Format:*\n│ ${pfx}komikget <url chapter>\n│ ${pfx}komikget <url chapter> <jumlah hal>\n│\n│ *Contoh:*\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/\n│ ${pfx}komikget https://komiktap.info/naruto-chapter-1/ 15\n│\n│ ℹ️ Default 20 hal, max 50 hal\n│ ⏳ Proses ~30–90 detik\n╰──────────────────────`
			);
			return;
		}

		const { komiktapPdf, komiktapChapterImages, makeProgressBar } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));

		const parts      = input.split(/\s+/);
		const chapterUrl = parts[0];
		let maxPg = 20;
		if (parts[1] && /^\d+$/.test(parts[1])) maxPg = Math.min(Math.max(1, parseInt(parts[1])), 50);

		await hisoka.sendMessage(m.from, { react: { text: '📥', key: m.key } });
		await tolak(hisoka, m, `📥 Mengambil daftar gambar chapter...`);

		const images    = await komiktapChapterImages(chapterUrl);
		const totalAvail = images.length;
		const dlCount   = Math.min(totalAvail, maxPg);
		const chapterName = chapterUrl.replace(/.*\/([^/]+)\/?$/, '$1').replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

		const _buildDlProg = (bar, pct, done, total, status) =>
			`${bar} ${pct}%\n╭─「 📥 *MENGUNDUH PDF* 」\n│ 📖 ${chapterName}\n│ 📄 ${done}/${total} halaman\n│ ${status}\n╰──────────────────────`;

		const loadingMsg = await m.reply(_buildDlProg('⬛⬛⬛⬛⬛⬛⬛⬛⬛⬛', 0, 0, dlCount, '⏳ Memulai download...'));

		let lastPct = 0;
		const onProgress = async (done, total) => {
			const { pct, bar } = makeProgressBar(done, total);
			if (pct - lastPct < 10 && pct < 100) return;
			lastPct = pct;
			try { await m.reply({ edit: loadingMsg.key, text: _buildDlProg(bar, pct, done, total, `⏳ Mengunduh halaman ${done}...`) }); } catch (_) {}
		};

		const pdfBuf = await komiktapPdf(chapterUrl, maxPg, onProgress);

		try { await m.reply({ edit: loadingMsg.key, text: _buildDlProg('██████████', 100, dlCount, dlCount, '📦 Mengemas & mengirim PDF...') }); } catch (_) {}

		const safeName  = chapterName.slice(0, 60) || 'komiktap_chapter';
		const sizeMB    = (pdfBuf.length / 1024 / 1024).toFixed(1);
		const pdfCaption =
			`╭─「 📚 *KOMIKTAP* 」\n│\n│ 📖 *${chapterName}*\n│ 📄 ${dlCount}/${totalAvail} halaman\n│ 💾 ${sizeMB} MB\n│ 🔗 ${chapterUrl}\n╰──────────────────────`;

		await m.reply({ document: pdfBuf, mimetype: 'application/pdf', fileName: `${safeName}.pdf`, caption: pdfCaption });
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
	} catch (err) {
		console.error('[KOMIKTAP] Download error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-download');
		await tolak(hisoka, m, `❌ Gagal download chapter.\n💬 ${err?.message || 'Coba lagi nanti'}`);
	}
}

module.exports = { handleKomikdl };
