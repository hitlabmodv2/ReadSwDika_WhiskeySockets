'use strict';

async function handleSimi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	try {
		const config   = loadConfig();
		const autoSimi = config.autoSimi || { enabled: false };
		const args     = query ? query.split(' ') : [];
		if (args.length === 0) {
			let text = `╭═══『 *🤖 WILY AI AUTO* 』═══╮\n│\n│ *Status:* ${autoSimi.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *AI Engine:* Gemini Vision (Gratis)\n│ *Mode:* Grup & Private Chat\n│ *Trigger:* Mention bot / Reply pesan bot\n│\n│ *Kemampuan AI:*\n│ ✅ Analisis gambar & sticker\n│ ✅ Baca teks di dalam gambar\n│ ✅ Tahu judul anime/film/series\n│ ✅ Kenali karakter anime/game\n│ ✅ Ingat nama pengguna\n│ ✅ Ngobrol santai & cerdas\n│\n│ *Perintah Manual AI:*\n│ .wily [pertanyaan]\n│ .wily (reply gambar/sticker)\n│\n│ *Pengaturan:*\n│ .autosimi on  - Aktifkan\n│ .autosimi off - Nonaktifkan\n│\n╰══════════════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}
		if (args[0].toLowerCase() === 'on') {
			if (autoSimi.enabled) {
				await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah aktif sebelumnya');
			} else {
				config.autoSimi = { ...autoSimi, enabled: true };
				saveConfig(config);
				await tolak(hisoka, m, '✅ Wily AI Auto diaktifkan!\n\n🤖 Bot akan otomatis membalas dengan AI Gemini ketika di-mention atau di-reply.\n\nFitur: analisis gambar, sticker, teks, dan lainnya!');
			}
		} else if (args[0].toLowerCase() === 'off') {
			if (!autoSimi.enabled) {
				await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah nonaktif sebelumnya');
			} else {
				config.autoSimi = { ...autoSimi, enabled: false };
				saveConfig(config);
				await tolak(hisoka, m, '❌ Wily AI Auto dinonaktifkan');
			}
		} else if (args[0].toLowerCase() === 'key' && args[1]) {
			const newKey = args.slice(1).join(' ').trim();
			if (newKey.length < 20) {
				await tolak(hisoka, m, '❌ API Key tidak valid.');
			} else {
				config.autoSimi = { ...autoSimi, apiKey: newKey };
				saveConfig(config);
				await tolak(hisoka, m, `✅ API Key berhasil diset!\n\nGunakan .autosimi on untuk mengaktifkan.`);
			}
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .autosimi untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'autosimi');
	} catch (error) {
		console.error('\x1b[31m[AutoSimi] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleSimi };
