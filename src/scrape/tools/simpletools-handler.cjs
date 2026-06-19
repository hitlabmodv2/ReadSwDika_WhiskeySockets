'use strict';
const nodePath = require('path');

async function handleTestnet({ hisoka, m, tolak, logCommand, _require }) {
	if (!m.prefix && m.query) return;
	try {
		const msg    = await m.reply('🌐 _Mengukur kecepatan internet... harap tunggu ~5 detik_');
		const _st    = _require(nodePath.resolve('./src/scrape/tools/speedtest.cjs'));
		const hasil  = await _st.jalankanSpeedtest();
		const caption = _st.buatCaption(hasil);
		const imgBuf = await _st.buatGambar(hasil);
		await hisoka.sendMessage(m.from, { image: imgBuf, mimetype: 'image/png', caption }, { quoted: m });
		await hisoka.sendMessage(m.from, { delete: msg.key });
		logCommand(m, hisoka, 'speedtest');
	} catch (err) {
		console.error('[speedtest] Error:', err.message);
		await m.reply('❌ Speedtest gagal: ' + err.message);
	}
}

async function handleNhrand({ hisoka, m, tolak, logCommand, logError, _require }) {
	if (!m.prefix && m.query) return;
	try {
		const pfx = m.prefix || '.';
		const { nhentaiRandom, nhentaiCover, formatGalleryInfo } = _require(nodePath.resolve('./src/scrape/anime/nhentai.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🎲', key: m.key } });
		await tolak(hisoka, m, `🎲 Mengambil doujin random dari nhentai...`);
		const gallery  = await nhentaiRandom();
		const infoText = formatGalleryInfo(gallery, pfx);
		const coverBuf = await nhentaiCover(gallery).catch(() => null);
		if (coverBuf) {
			await hisoka.sendMessage(m.from, { image: coverBuf, caption: infoText }, { quoted: m });
		} else {
			await tolak(hisoka, m, infoText);
		}
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
	} catch (err) {
		console.error('[NH] Random error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'nhentai-random');
		await tolak(hisoka, m, `❌ Gagal ambil random.\n💬 ${err?.message || 'Coba lagi nanti'}`);
	}
}

async function handleAnimeupdate({ hisoka, m, tolak, logCommand, logError, _require, path }) {
	if (!m.prefix && m.query) return;
	try {
		const _kusoPath2 = path.resolve('./src/scrape/anime/kusonime.cjs');
		delete _require.cache[_kusoPath2];
		const { getLatestUpdates, formatLatestUpdates } = _require(_kusoPath2);
		await hisoka.sendMessage(m.from, { react: { text: '📺', key: m.key } });
		await tolak(hisoka, m, `📺 Mengambil update terbaru Kusonime...`);
		const items = await getLatestUpdates(10);
		await tolak(hisoka, m, formatLatestUpdates(items));
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
	} catch (err) {
		console.error('[KUSOUPDATE] Error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'kusoupdate');
		await tolak(hisoka, m, `❌ Gagal ambil update Kusonime.\n💬 ${err?.message?.slice(0, 100) || 'Coba lagi nanti'}`);
	}
}

async function handleRb({ hisoka, m, tolak, logCommand, _require }) {
	if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa merestart bot!');
	if (!m.prefix && m.query) return;
	const { restartBot } = _require(nodePath.resolve('./src/scrape/system/shutdown.cjs'));
	const _rstSent = await hisoka.sendMessage(m.from, {
		text:
			`╔══════════════════════╗\n║  🔄  *R E S T A R T*  ║\n╚══════════════════════╝\n\n` +
			`♻️ Bot akan direstart sekarang!\n\n` +
			`⚙️ Direstart oleh: @${m.sender.split('@')[0]}\n` +
			`🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
			`⏳ Menunggu bot online kembali...`,
		mentions: [m.sender]
	}, { quoted: m });
	try {
		const { kvSet: _rstKvSet } = await import('../db/datadb.js');
		_rstKvSet('system/restart_notify', { from: m.from, key: _rstSent?.key || null, by: m.sender, time: Date.now() });
	} catch (_) {}
	logCommand(m, hisoka, 'restart');
	restartBot(2000);
}

module.exports = { handleTestnet, handleNhrand, handleAnimeupdate, handleRb };
