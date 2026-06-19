'use strict';

async function handlePixiv({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';

		if (!input) {
			await tolak(hisoka, m,
				`╭─「 🎨 *PIXIV SEARCH* 」\n│\n│ Cari ilustrasi anime dari Pixiv.\n│\n│ *Format:*\n│ • ${pfx}pixiv <query>\n│ • ${pfx}pixiv <query>,<jumlah>\n│\n│ *Contoh 1 gambar:*\n│ • ${pfx}pixiv megumin\n│ • ${pfx}pixiv rem re:zero\n│\n│ *Contoh banyak gambar (max 10):*\n│ • ${pfx}pixiv megumin chan,5\n│ • ${pfx}pixiv naruto,10\n│\n│ ℹ️ Hanya konten aman (safe).\n╰──────────────────────`
			);
			return;
		}

		let realQuery = input;
		let imgCount  = 1;
		const lastComma = input.lastIndexOf(',');
		if (lastComma !== -1) {
			const maybeNum = input.slice(lastComma + 1).trim();
			if (/^\d+$/.test(maybeNum)) {
				imgCount  = Math.min(Math.max(1, parseInt(maybeNum)), 10);
				realQuery = input.slice(0, lastComma).trim();
			}
		}
		if (!realQuery) { await tolak(hisoka, m, `❌ Query kosong. Contoh: *.pixiv megumin,5*`); return; }

		const { pixivFetch, pixivFetchMultiple, formatPixivCaption } = _require(path.resolve('./src/scrape/anime/pixiv.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

		const loadMsg = await tolak(hisoka, m,
			imgCount > 1
				? `🔍 Mencari *${imgCount} ilustrasi* "${realQuery}" dari Pixiv...`
				: `🔍 Mencari ilustrasi *${realQuery}* di Pixiv...`
		);

		if (imgCount > 1) {
			const images     = await pixivFetchMultiple(realQuery, { safe: true, count: imgCount });
			const albumItems = images.map((img, i) => ({ image: img.buffer, caption: formatPixivCaption(img, { index: i, total: images.length }) }));
			if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
			try {
				await hisoka.sendMessage(m.from, { albumMessage: albumItems }, { quoted: m });
			} catch (_) {
				for (let i = 0; i < images.length; i++) {
					await hisoka.sendMessage(m.from, { image: images[i].buffer, caption: formatPixivCaption(images[i], { index: i, total: images.length }) }, { quoted: i === 0 ? m : undefined });
				}
			}
		} else {
			const randomIndex = Math.floor(Math.random() * 10);
			const data    = await pixivFetch(realQuery, { safe: true, index: randomIndex });
			const caption = formatPixivCaption(data);
			if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
			await hisoka.sendMessage(m.from, { image: data.buffer, caption }, { quoted: m });
		}

		await hisoka.sendMessage(m.from, { react: { text: '🎨', key: m.key } });
		logCommand(m, hisoka, 'pixiv');
	} catch (error) {
		console.error('\x1b[31m[Pixiv] Error:\x1b[39m', error.message);
		logError(error, 'command:pixiv');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m,
			`❌ *Gagal mencari di Pixiv.*\n\n_${error.message}_\n\nContoh:\n• *.pixiv megumin* — 1 gambar\n• *.pixiv megumin,5* — 5 gambar sekaligus`
		);
	}
}

async function handlePixiv18({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';

		if (!input) {
			await tolak(hisoka, m,
				`╭─「 🔞 *PIXIV R18 SEARCH* 」\n│\n│ Cari ilustrasi R18 dari Pixiv.\n│\n│ *Format:*\n│ • ${pfx}pixivr18 <query>\n│ • ${pfx}pixivr18 <query>,<jumlah>\n│\n│ *Contoh 1 gambar:*\n│ • ${pfx}pixivr18 megumin\n│ • ${pfx}pixivr18 rem re:zero\n│\n│ *Contoh banyak gambar (max 10):*\n│ • ${pfx}pixivr18 megumin,5\n│ • ${pfx}pixivr18 naruto,10\n│\n│ ⚠️ Konten dewasa (R18). 18+ only.\n╰──────────────────────`
			);
			return;
		}

		let realQuery = input;
		let imgCount  = 1;
		const lastComma = input.lastIndexOf(',');
		if (lastComma !== -1) {
			const maybeNum = input.slice(lastComma + 1).trim();
			if (/^\d+$/.test(maybeNum)) {
				imgCount  = Math.min(Math.max(1, parseInt(maybeNum)), 10);
				realQuery = input.slice(0, lastComma).trim();
			}
		}
		if (!realQuery) { await tolak(hisoka, m, `❌ Query kosong. Contoh: *.pixivr18 megumin,5*`); return; }

		const { pixivR18Fetch, pixivR18FetchMultiple, formatPixivR18Caption } = _require(path.resolve('./src/scrape/anime/pixivr18.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

		const loadMsg = await tolak(hisoka, m,
			imgCount > 1
				? `🔍 Mencari *${imgCount} ilustrasi R18* "${realQuery}" dari Pixiv...`
				: `🔍 Mencari ilustrasi R18 *${realQuery}* di Pixiv...`
		);

		if (imgCount > 1) {
			const images     = await pixivR18FetchMultiple(realQuery, { count: imgCount });
			const albumItems = images.map((img, i) => ({ image: img.buffer, caption: formatPixivR18Caption(img, { index: i, total: images.length }) }));
			if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
			try {
				await hisoka.sendMessage(m.from, { albumMessage: albumItems }, { quoted: m });
			} catch (_) {
				for (let i = 0; i < images.length; i++) {
					await hisoka.sendMessage(m.from, { image: images[i].buffer, caption: formatPixivR18Caption(images[i], { index: i, total: images.length }) }, { quoted: i === 0 ? m : undefined });
				}
			}
		} else {
			const randomIndex = Math.floor(Math.random() * 10);
			const data    = await pixivR18Fetch(realQuery, { index: randomIndex });
			const caption = formatPixivR18Caption(data);
			if (loadMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {} }
			await hisoka.sendMessage(m.from, { image: data.buffer, caption }, { quoted: m });
		}

		await hisoka.sendMessage(m.from, { react: { text: '🔞', key: m.key } });
		logCommand(m, hisoka, 'pixivr18');
	} catch (error) {
		console.error('\x1b[31m[PixivR18] Error:\x1b[39m', error.message);
		logError(error, 'command:pixivr18');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m,
			`❌ *Gagal mencari di Pixiv R18.*\n\n_${error.message}_\n\nContoh:\n• *.pixivr18 megumin* — 1 gambar\n• *.pixivr18 megumin,5* — 5 gambar sekaligus`
		);
	}
}

module.exports = { handlePixiv, handlePixiv18 };
