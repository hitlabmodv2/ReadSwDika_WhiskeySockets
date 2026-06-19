'use strict';

async function handleKomikup({ hisoka, m, tolak, logError, _require, path }) {
	if (!m.prefix && m.query) return;
	try {
		const { komiktapLatestUpdates } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
		const ax = _require('axios');

		await hisoka.sendMessage(m.from, { react: { text: '🔄', key: m.key } });
		await tolak(hisoka, m, `🔄 Mengambil update terbaru dari Komiktap...`);

		const items = await komiktapLatestUpdates();
		if (!items.length) { await tolak(hisoka, m, `❌ Tidak ada data update saat ini.`); return; }

		const coverDls = await Promise.allSettled(
			items.map(r => {
				if (!r.cover) return Promise.reject(new Error('no cover'));
				return ax.get(r.cover, {
					responseType: 'arraybuffer', timeout: 12000,
					headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
				}).then(res => Buffer.from(res.data));
			})
		);

		const albumUpd = [];
		coverDls.forEach((res, i) => {
			const r = items[i];
			const typeTxt = r.type ? ` • ${r.type}` : '';
			const statusTxt = r.status ? ` [${r.status}]` : '';
			const lastTxt = r.lastChap ? `\n📖 ${r.lastChap}` : '';
			const cap = `*${i + 1}.* ${r.title}${statusTxt}${typeTxt}${lastTxt}`;
			if (res.status === 'fulfilled') albumUpd.push({ image: res.value, caption: cap });
		});

		if (albumUpd.length > 0) {
			try {
				await m.reply({ albumMessage: albumUpd });
			} catch {
				const BATCH = 10;
				for (let _b = 0; _b < albumUpd.length; _b += BATCH) {
					const _batch = albumUpd.slice(_b, _b + BATCH);
					try {
						await (_b === 0 ? m.reply({ albumMessage: _batch }) : hisoka.sendMessage(m.from, { albumMessage: _batch }));
					} catch {
						for (const item of _batch) {
							try { await m.reply({ image: item.image, caption: item.caption }); } catch (_) {}
						}
					}
				}
			}
		}

		let updText = `╭─「 🔄 *UPDATE TERBARU KOMIKTAP* 」\n│\n`;
		items.forEach((r, i) => {
			const typeTxt = r.type ? ` • ${r.type}` : '';
			const lastTxt = r.lastChap ? `  _${r.lastChap}_` : '';
			updText += `│ *${i + 1}.* ${r.title.slice(0, 50)}${typeTxt}${lastTxt}\n`;
		});
		updText += `│\n│ 🔗 ${m.prefix || '.'}komik <judul> untuk cari & download\n╰──────────────────────`;
		await m.reply(updText);
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
	} catch (err) {
		console.error('[KOMIKUPDATE] Error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-update');
		await tolak(hisoka, m, `❌ Gagal ambil update.\n💬 ${err?.message || 'Coba lagi nanti'}`);
	}
}

async function handleKomikinfo({ hisoka, m, query, tolak, logError, _require, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';
		if (!input || !input.startsWith('http')) {
			await tolak(hisoka, m,
				`╭─「 📖 *KOMIKINFO* 」\n│\n│ Kirim URL manga dari komiktap.info\n│\n│ *Contoh:*\n│ ${pfx}komikinfo https://komiktap.info/manga/naruto/\n╰──────────────────────`
			);
			return;
		}
		const { komiktapDetail, formatDetailText } = _require(path.resolve('./src/scrape/anime/komiktap.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '📖', key: m.key } });
		await tolak(hisoka, m, `📖 Mengambil detail manga...`);
		const detail = await komiktapDetail(input);
		const text   = formatDetailText(detail, pfx);
		if (detail.cover) {
			try {
				const imgRes = await _require('axios').get(detail.cover, {
					responseType: 'arraybuffer', timeout: 10000,
					headers: { 'User-Agent': 'Mozilla/5.0', 'Referer': 'https://komiktap.info/' },
				});
				await hisoka.sendMessage(m.from, { image: Buffer.from(imgRes.data), caption: text }, { quoted: m });
			} catch {
				await tolak(hisoka, m, text);
			}
		} else {
			await tolak(hisoka, m, text);
		}
		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
	} catch (err) {
		console.error('[KOMIKTAP] Detail error:', err?.message);
		logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'komiktap-detail');
		await tolak(hisoka, m, `❌ Gagal ambil detail manga.\n💬 ${err?.message || 'Coba lagi nanti'}`);
	}
}

module.exports = { handleKomikup, handleKomikinfo };
