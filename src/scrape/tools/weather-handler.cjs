'use strict';

async function handleWeather({ hisoka, m, query, tolak, logCommand, logError, _require, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';
		if (!input) {
			await tolak(hisoka, m,
				`╭─「 🌦️ *CUACA REALTIME* 」\n│\n│ Cek cuaca daerah secara realtime.\n│\n│ *Contoh:*\n│ • ${pfx}cuaca Subang Jawa Barat\n│ • ${pfx}cuaca Bandung Jawa Barat\n│ • ${pfx}cuaca Jakarta Selatan\n╰────────────────────`
			);
			return;
		}
		const { getWeather, formatWeatherReport, getWeatherMapImage } = _require(path.resolve('./src/scrape/tools/cuaca.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔎', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔎 Mengambil data cuaca & peta hujan realtime untuk *${input}*...`);
		const result = await getWeather(input);
		const report = formatWeatherReport(result);
		const mapBuffer = await getWeatherMapImage(result.location.latitude, result.location.longitude, result.location.rawName || result.location.name).catch(() => null);
		if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }
		if (mapBuffer && mapBuffer.length > 500) {
			await hisoka.sendMessage(m.from, { image: mapBuffer, caption: report }, { quoted: m });
		} else {
			await tolak(hisoka, m, report);
		}
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'cuaca');
	} catch (error) {
		console.error('\x1b[31m[Cuaca] Error:\x1b[39m', error.message);
		logError(error, 'command:cuaca');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m, `❌ Gagal mengambil cuaca.\n\n_${error.message}_\n\nCoba tulis daerah lebih lengkap.\nContoh: *.cuaca Subang Jawa Barat*`);
	}
}

module.exports = { handleWeather };
