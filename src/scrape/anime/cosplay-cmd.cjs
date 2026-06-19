'use strict';

async function handleCosplay({ hisoka, m, query, tolak, logCommand, logError, _require, path, _sendCosplayImages, pendingCosplayChoices }) {
	try {
		const input = (query || '').trim();
		const pfx = m.prefix || '.';
		const isRandom = m.command === 'cosplayrand' || m.command === 'cosplayrandom' || input.toLowerCase() === 'random';

		if (!input && !isRandom) {
			await tolak(hisoka, m,
				`╭─「 👘 *COSPLAYTELE SEARCH* 」\n` +
				`│\n` +
				`│ Cari foto & video cosplay dari\n` +
				`│ cosplaytele.com secara realtime.\n` +
				`│\n` +
				`│ *Format:*\n` +
				`│ • ${pfx}cosplay <keyword>\n` +
				`│ • ${pfx}cosplay random\n` +
				`│\n` +
				`│ *Contoh:*\n` +
				`│ • ${pfx}cosplay mitsuri\n` +
				`│ • ${pfx}cosplay rem re:zero\n` +
				`│ • ${pfx}cosplay velma\n` +
				`│ • ${pfx}cosplay random\n` +
				`│\n` +
				`│ ℹ️ Hasil dikirim sebagai album\n` +
				`│    (foto + video terpisah).\n` +
				`╰──────────────────────`
			);
			return;
		}

		if (isRandom) {
			const { cosplayteleRandom, downloadBuffer, formatCosplayteleCaption } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
			await hisoka.sendMessage(m.from, { react: { text: '🎲', key: m.key } });
			const loadMsg = await tolak(hisoka, m, `🎲 Mengambil cosplay *random* dari cosplaytele.com...`);
			try {
				const post = await cosplayteleRandom();
				if (loadMsg?.key) {
					try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
				}
				const vidInfo = post.hasVideos ? ` | 🎬 ada video` : '';
				const caption0 =
					`╭─「 🎲 *COSPLAY RANDOM* 」\n` +
					`│ 📌 *${post.title.slice(0, 80)}*\n` +
					`│ 🖼️ ${post.totalImages} foto${vidInfo}\n` +
					`│ 🔗 ${post.link}\n` +
					`│\n` +
					`│ ℹ️ Mengirim ${post.images.length} foto...\n` +
					`╰──────────────────────`;
				await tolak(hisoka, m, caption0);
				await hisoka.sendMessage(m.from, { react: { text: '📸', key: m.key } });
				if (post.images.length > 0) {
					await _sendCosplayImages(hisoka, m, post, downloadBuffer, formatCosplayteleCaption, '[CosplayRandom]');
				}
				if (post.hasVideos && post.cossoraIds?.length > 0) {
					await hisoka.sendMessage(m.from, {
						text: `╭─「 🎬 *VIDEO COSPLAY* 」\n│ Tonton video dari post ini:\n│\n${post.cossoraIds.map((u, i) => `│ ${i + 1}. ${u}`).join('\n')}\n╰──────────────────────`,
					}, { quoted: m });
				}
				await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
				logCommand(m, hisoka, 'cosplayrand');
			} catch (err) {
				console.error('[CosplayRandom] Error:', err.message);
				logError(err, 'command:cosplayrand');
				if (loadMsg?.key) {
					try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
				}
				await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
				await tolak(hisoka, m, `❌ Gagal ambil cosplay random.\n_${err.message}_`);
			}
			return;
		}

		const { cosplayteleSearch, formatCosplayteleSearchList } = _require(path.resolve('./src/scrape/anime/cosplaytele.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

		const loadMsg = await tolak(hisoka, m, `🔍 Mencari cosplay *"${input}"* di cosplaytele.com...`);

		const results = await cosplayteleSearch(input, { perPage: 8 });

		if (loadMsg?.key) {
			try { await hisoka.sendMessage(m.from, { delete: loadMsg.key }); } catch (_) {}
		}

		const listText =
			`╭─「 👘 *COSPLAYTELE* 」\n` +
			`│ 🔍 Hasil: *"${input}"*\n` +
			`│ Ditemukan ${results.length} post\n` +
			`│\n` +
			results.map((r, i) => {
				const match = r.title.match(/(\d+\s*photos?\s*(?:and\s*\d+\s*videos?)?)/i);
				const count = match ? ` [${match[1]}]` : '';
				const cleanTitle = r.title.replace(/"[^"]*"/g, '').replace(/\s{2,}/g, ' ').trim();
				return `│ *${i + 1}.* ${cleanTitle.slice(0, 65)}${count}`;
			}).join('\n') + '\n' +
			`│\n` +
			`│ 📩 *Balas pesan ini* dengan angka\n` +
			`│    pilihan kamu (1–${results.length})\n` +
			`│ ⏳ Menu berlaku 3 menit\n` +
			`╰──────────────────────`;

		const menuMsg = await tolak(hisoka, m, listText);
		await hisoka.sendMessage(m.from, { react: { text: '👘', key: m.key } });

		const cosKey = m.sender;
		const cosTimeout = setTimeout(() => pendingCosplayChoices.delete(cosKey), 3 * 60 * 1000);

		const old = pendingCosplayChoices.get(cosKey);
		if (old?.timeout) clearTimeout(old.timeout);
		pendingCosplayChoices.set(cosKey, {
			results,
			botMsgId: menuMsg?.key?.id || null,
			expiresAt: Date.now() + 3 * 60 * 1000,
			timeout: cosTimeout,
			loading: false,
		});

		logCommand(m, hisoka, 'cosplay');
	} catch (error) {
		console.error('\x1b[31m[Cosplay] Error:\x1b[39m', error.message);
		logError(error, 'command:cosplay');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m,
			`❌ *Gagal mencari di Cosplaytele.*\n\n` +
			`_${error.message}_\n\n` +
			`Contoh: *.cosplay mitsuri*`
		);
	}
}

module.exports = { handleCosplay };
