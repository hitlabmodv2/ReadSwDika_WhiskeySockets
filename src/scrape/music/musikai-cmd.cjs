'use strict';

async function handleMusikai({ hisoka, m, query, tolak, logCommand, logError, _require, path, sendConfirmWithButtons, _generateMusik, _showGenreSelect }) {
	const pfx = m.prefix || '.';
	const input = (query || '').trim();

	if (!input) {
		await sendConfirmWithButtons(hisoka, m,
			`╭──『 🎵 *MUSIK AI* 』\n` +
			`│\n` +
			`│ Generate lagu original pakai AI.\n` +
			`│ Hasil: *2 variasi audio* + cover art.\n` +
			`│\n` +
			`│ *Cara pakai:*\n` +
			`│ • _${pfx}musikai hujan di kota_ — tema bebas\n` +
			`│ • _${pfx}musikai random_ — genre random\n` +
			`│ • _${pfx}musikai judul | lirik | genre_ — manual\n` +
			`│\n` +
			`│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
			`╰──────────────────────────────`,
			[
				{ text: '🎲 Generate Random', id: '__musikai_random__' },
				{ text: '📖 Cara Pakai Custom', id: '__musikai_help__' },
			]
		);
		return;
	}

	try {
		if (input.toLowerCase() === 'random') {
			await _showGenreSelect();
			return;
		}

		const { ChatMusicAPI } = _require(path.resolve('./src/scrape/music/chatmusic.cjs'));

		if (!input.includes('|')) {
			const tema = input.slice(0, 200);
			await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});
			const loadingMsg = await hisoka.sendMessage(m.from,
				{ text: `🎵 *AI sedang meracik lagu...*\n│ Tema  : *${tema}*\n│\n│ ⏳ AI memilih genre, judul & lirik yang pas...` },
				{ quoted: m }
			).catch(() => null);
			const _edit = async (txt) => {
				if (!loadingMsg?.key) return;
				try { await hisoka.sendMessage(m.from, { text: txt, edit: loadingMsg.key }); } catch (_) {}
			};

			const api = new ChatMusicAPI();
			await api.login();
			const preset = await api.aiThemePreset(tema, 'vocal');
			await _edit(
				`🎵 *AI selesai meracik!*\n` +
				`│ Tema  : *${tema}*\n` +
				`│ Judul : *${preset.title}*\n` +
				`│ Genre : *${preset.genreLabel}*\n` +
				`│\n` +
				`│ ⏳ Mengirim ke server musik...`
			);

			const params = {
				title:          preset.title,
				lyrics:         preset.lyrics,
				musicStyle:     preset.musicStyle,
				genreLabel:     preset.genreLabel,
				prompt:         preset.prompt,
				isInstrumental: preset.isInstrumental,
			};

			if (loadingMsg?.key) {
				try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
			}
			await _generateMusik(hisoka, m, params);
			console.log(`\x1b[35m[MusicAI/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
			return;
		}

		const parts = input.split('|').map(s => s.trim());
		const params = {
			title:          parts[0] || 'My Song',
			lyrics:         parts[1] || '',
			musicStyle:     parts[2] || 'pop',
			isInstrumental: !parts[1] ? 1 : 0,
			prompt:         `${parts[2] || 'pop'} indonesia`,
		};
		await _generateMusik(hisoka, m, params);
	} catch (error) {
		console.error('\x1b[31m[MusicAI] Error:\x1b[39m', error.message);
		logError(error, 'command:musikai');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		const isSensitive = /sensitive words|prohibited/i.test(error.message);
		const errMsg = isSensitive
			? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n` +
			  `│\n` +
			  `│ API mendeteksi *kata sensitif* dalam lirik.\n` +
			  `│\n` +
			  `│ 💡 *Solusi:*\n` +
			  `│ Hindari kata-kata terkait narkoba,\n` +
			  `│ SARA, kekerasan, atau konten dewasa.\n` +
			  `│\n` +
			  `│ Coba ganti lirikmu & kirim ulang ↓\n` +
			  `╰──────────────────────────────`
			: `╭──『 ❌ *GAGAL GENERATE* 』\n` +
			  `│\n` +
			  `│ ${error.message}\n` +
			  `│\n` +
			  `│ Coba lagi atau pilih genre random ↓\n` +
			  `╰──────────────────────────────`;
		await sendConfirmWithButtons(hisoka, m, errMsg,
			isSensitive
				? [{ text: '📖 Lihat Contoh Format', id: '__musikai_help__' }]
				: [{ text: '🔁 Coba Random Lagi', id: '__musikai_random__' }]
		);
	}
}

async function handleMusikai2({ hisoka, m, query, tolak, logCommand, logError, _require, path, sendConfirmWithButtons, _generateMusik2 }) {
	const pfx   = m.prefix || '.';
	const input = (query || '').trim();

	if (!input) {
		await sendConfirmWithButtons(hisoka, m,
			`╭──『 🎵 *MUSIK AI 2* 』\n` +
			`│\n` +
			`│ Generate lagu original pakai AI (backend 2).\n` +
			`│ Hasil: *2 variasi audio* + cover art.\n` +
			`│\n` +
			`│ *Cara pakai:*\n` +
			`│ • _${pfx}musikai2 hujan di kota_ — tema bebas\n` +
			`│ • _${pfx}musikai2 random_ — genre random\n` +
			`│ • _${pfx}musikai2 judul | lirik | genre_ — manual\n` +
			`│\n` +
			`│ ✨ AI pilih genre + judul + lirik otomatis!\n` +
			`╰──────────────────────────────`,
			[
				{ text: '🎲 Generate Random', id: '__musikai2_random__' },
				{ text: '📖 Cara Pakai Custom', id: '__musikai2_help__' },
			]
		);
		return;
	}

	try {
		if (input.toLowerCase() === 'random') {
			await sendConfirmWithButtons(hisoka, m,
				`╭──『 🎲 *MUSIK AI 2 — RANDOM* 』\n` +
				`│\n` +
				`│ AI akan memilih genre, judul & lirik\n` +
				`│ secara otomatis sesuai bahasa pilihan.\n` +
				`│\n` +
				`│ Pilih bahasa lirik di bawah ↓\n` +
				`╰──────────────────────────────`,
				[
					{ text: '🇮🇩 Indonesia', id: '__musikai2_rlang__id' },
					{ text: '🇯🇵 Jepang',   id: '__musikai2_rlang__jp' },
					{ text: '🇬🇧 English',  id: '__musikai2_rlang__en' },
				]
			);
			return;
		}

		const { ChatMusicAPI2 } = _require(path.resolve('./src/scrape/music/chatmusic2.cjs'));

		if (!input.includes('|')) {
			const tema = input.slice(0, 200);
			await hisoka.sendMessage(m.from, { react: { text: '🎵', key: m.key } }).catch(() => {});
			const loadingMsg = await hisoka.sendMessage(m.from,
				{ text: `🎵 *AI 2 sedang meracik lagu...*\n│ Tema  : *${tema}*\n│\n│ ⏳ AI memilih genre, judul & lirik yang pas...` },
				{ quoted: m }
			).catch(() => null);
			const _edit = async (txt) => {
				if (!loadingMsg?.key) return;
				try { await hisoka.sendMessage(m.from, { text: txt, edit: loadingMsg.key }); } catch (_) {}
			};

			const api = new ChatMusicAPI2();
			await api.login();
			const preset = await api.aiThemePreset(tema, 'vocal');
			await _edit(
				`🎵 *AI 2 selesai meracik!*\n` +
				`│ Tema  : *${tema}*\n` +
				`│ Judul : *${preset.title}*\n` +
				`│ Genre : *${preset.genreLabel}*\n` +
				`│\n` +
				`│ ⏳ Mengirim ke server musik...`
			);

			if (loadingMsg?.key) {
				try { await hisoka.sendMessage(m.from, { delete: loadingMsg.key }); } catch (_) {}
			}
			await _generateMusik2(hisoka, m, {
				title:          preset.title,
				lyrics:         preset.lyrics,
				musicStyle:     preset.musicStyle,
				genreLabel:     preset.genreLabel,
				prompt:         preset.prompt,
				isInstrumental: preset.isInstrumental,
			});
			console.log(`\x1b[35m[MusicAI2/Tema]\x1b[0m ✅ tema="${tema}" → judul="${preset.title}" genre="${preset.genreLabel}"`);
			return;
		}

		const parts = input.split('|').map(s => s.trim());
		await _generateMusik2(hisoka, m, {
			title:          parts[0] || 'My Song',
			lyrics:         parts[1] || '',
			musicStyle:     parts[2] || 'pop',
			isInstrumental: !parts[1] ? 1 : 0,
			prompt:         `${parts[2] || 'pop'} indonesia`,
		});
	} catch (error) {
		console.error('\x1b[31m[MusicAI2] Error:\x1b[39m', error.message);
		logError(error, 'command:musikai2');
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } }).catch(() => {});
		const isSensitive = /sensitive words|prohibited/i.test(error.message);
		const errMsg = isSensitive
			? `╭──『 ⚠️ *LIRIK DIBLOKIR* 』\n` +
			  `│\n` +
			  `│ API mendeteksi *kata sensitif* dalam lirik.\n` +
			  `│\n` +
			  `│ 💡 *Solusi:*\n` +
			  `│ Hindari kata-kata terkait narkoba,\n` +
			  `│ SARA, kekerasan, atau konten dewasa.\n` +
			  `│\n` +
			  `│ Coba ganti lirikmu & kirim ulang ↓\n` +
			  `╰──────────────────────────────`
			: `╭──『 ❌ *GAGAL GENERATE* 』\n` +
			  `│\n` +
			  `│ ${error.message}\n` +
			  `│\n` +
			  `│ Coba lagi atau pilih genre random ↓\n` +
			  `╰──────────────────────────────`;
		await sendConfirmWithButtons(hisoka, m, errMsg,
			isSensitive
				? [{ text: '📖 Lihat Contoh Format', id: '__musikai2_help__' }]
				: [{ text: '🔁 Coba Random Lagi', id: '__musikai2_random__' }]
		);
	}
}

module.exports = { handleMusikai, handleMusikai2 };
