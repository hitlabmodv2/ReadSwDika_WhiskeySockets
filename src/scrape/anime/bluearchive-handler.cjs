'use strict';

async function handleBa({ hisoka, m, query, tolak, logCommand, logError, path, _require }) {
	try {
		const input = (query || '').trim();
		const pfx = m.prefix || '.';

		if (!input) {
			await tolak(hisoka, m,
				`╭─「 🎮 *BLUE ARCHIVE* 」\n│\n│ Cek info lengkap karakter Blue\n│ Archive secara realtime.\n│ Total: *227 karakter* tersedia.\n│\n├─「 📌 *Cara Pakai* 」\n│ ${pfx}ba <nama karakter>\n│\n├─「 🎯 *Contoh Karakter* 」\n│ • ${pfx}ba shiroko\n│ • ${pfx}ba hina\n│ • ${pfx}ba aru\n│ • ${pfx}ba hoshino\n│ • ${pfx}ba iori\n│ • ${pfx}ba yuuka\n│\n├─「 👙 *Versi Alternatif* 」\n│ Tambah kata di belakang nama:\n│ • ${pfx}ba hina swimsuit\n│ • ${pfx}ba neru bunnygirl\n│ • ${pfx}ba aru newyear\n│ • ${pfx}ba serika swimsuit\n│ • ${pfx}ba chinatsu onsen\n│\n├─「 📊 *Info yang Ditampilkan* 」\n│ 💬 Quote suara karakter (random)\n│ 🏫 Sekolah, Role, Tipe, Posisi\n│ 📋 Profil (usia, hobi, CV, dll)\n│ 🔫 Senjata + stats\n│ 🔥 Skills lengkap\n│ 🎯 Skill priority & investasi\n│ 📖 Bio karakter\n│\n├─「 🔰 *Tipe Karakter* 」\n│ Striker (155) • Special (72)\n│\n├─「 ⚔️ *Role* 」\n│ DPS (122) • Supporter (61)\n│ Tank (20) • Healer (18) • T.S.\n╰────────────────────`
			);
			return;
		}

		const { baChar, formatBaChar } = _require(path.resolve('./src/scrape/anime/bluearchive.cjs'));
		await hisoka.sendMessage(m.from, { react: { text: '🎮', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔎 Mencari data karakter *${input}* di Blue Archive...`);

		const result = await baChar(input);
		const report = formatBaChar(result);

		if (loadingMsg?.key) { try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {} }

		const imgFile = result.img || result.imgSmall || null;
		const imgUrl  = imgFile ? `https://cdn.jsdelivr.net/gh/SchaleDB/SchaleDB@main/images/student/${imgFile}` : null;

		let imgSent = false;
		if (imgUrl) {
			try { await hisoka.sendMessage(m.from, { image: { url: imgUrl }, caption: report }, { quoted: m }); imgSent = true; } catch (_) {}
		}
		if (!imgSent) await tolak(hisoka, m, report);

		await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
		logCommand(m, hisoka, 'bluearchive');
	} catch (error) {
		console.error('\x1b[31m[BlueArchive] Error:\x1b[39m', error.message);
		logError(error, 'command:ba');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		await tolak(hisoka, m, `❌ Karakter tidak ditemukan.\n\n_${error.message}_\n\nContoh: *.ba shiroko*`);
	}
}

module.exports = { handleBa };
