'use strict';

async function handleInfo({ hisoka, m, query, tolak, logCommand, loadConfig, fs, path }) {
	if (!m.prefix && m.query) return;
	try {
		const config        = loadConfig();
		const autoTyping    = config.autoTyping    || {};
		const autoRecording = config.autoRecording || {};
		const autoOnline    = config.autoOnline    || {};
		const autoReadStory = config.autoReadStory || {};
		const antiDelete    = config.antiDelete    || {};
		const antiCall      = config.antiCall      || {};
		const antiCallVideo = config.antiCallVideo || {};
		const telegram      = config.telegram      || {};
		const autoSimi      = config.autoSimi      || {};

		const statusIcon = (enabled) => enabled ? '✅' : '❌';

		const features = [
			{ name: 'Auto Typing',    icon: '📝', enabled: autoTyping.enabled,    details: autoTyping.enabled    ? [`├ Private: ${statusIcon(autoTyping.privateChat !== false)}`, `├ Group: ${statusIcon(autoTyping.groupChat !== false)}`, `└ Delay: ${autoTyping.delaySeconds || 5}s`] : [] },
			{ name: 'Auto Recording', icon: '🎤', enabled: autoRecording.enabled, details: autoRecording.enabled ? [`├ Private: ${statusIcon(autoRecording.privateChat !== false)}`, `├ Group: ${statusIcon(autoRecording.groupChat !== false)}`, `└ Delay: ${autoRecording.delaySeconds || 5}s`] : [] },
			{ name: 'Auto Online',    icon: '🟢', enabled: autoOnline.enabled,    details: autoOnline.enabled    ? [`└ Interval: ${autoOnline.intervalSeconds || 30}s`] : [] },
			{ name: 'Auto Read Story',icon: '👁️', enabled: autoReadStory.enabled, details: autoReadStory.enabled ? [`├ Reaction: ${statusIcon(autoReadStory.autoReaction !== false)}`, `└ Random Delay: ${statusIcon(autoReadStory.randomDelay !== false)}`] : [] },
			{ name: 'Auto Simi',      icon: '🤖', enabled: autoSimi.enabled,      details: autoSimi.enabled      ? [`└ Group Only: ✅`] : [] },
			{ name: 'Anti Delete',    icon: '🗑️', enabled: antiDelete.enabled,   details: antiDelete.enabled    ? [`├ Private: ${statusIcon(antiDelete.privateChat)}`, `└ Group: ${statusIcon(antiDelete.groupChat)}`] : [] },
			{ name: 'Telegram Notif', icon: '📲', enabled: telegram.enabled,      details: telegram.enabled      ? [`└ Chat ID: ${telegram.chatId ? '✅ Terset' : '❌ Belum'}`] : [] },
			{ name: 'Anti Call',      icon: '📞', enabled: antiCall.enabled,      details: antiCall.enabled      ? [`└ Whitelist: ${(antiCall.whitelist || []).length} nomor`] : [] },
			{ name: 'Anti Call Video',icon: '📹', enabled: antiCallVideo.enabled, details: antiCallVideo.enabled ? [`└ Whitelist: ${(antiCallVideo.whitelist || []).length} nomor`] : [] },
		];

		const activeFeatures   = features.filter(f => f.enabled);
		const inactiveFeatures = features.filter(f => !f.enabled);
		const sortedFeatures   = [...activeFeatures, ...inactiveFeatures];
		const userName         = m.pushName || 'Kak';

		let text = `Halo ${userName}! Berikut info bot:\n\n╭═══『 *INFO BOT* 』═══╮\n│\n`;
		for (const feature of sortedFeatures) {
			text += `│ ${feature.icon} *${feature.name}*\n│ ${statusIcon(feature.enabled)} ${feature.enabled ? 'Aktif' : 'Nonaktif'}\n`;
			for (const detail of feature.details) text += `│ ${detail}\n`;
			text += `│\n`;
		}
		text += `╰═════════════════════╯\n\n_Gunakan command masing-masing fitur untuk mengubah pengaturan, ${userName}_`;

		const imagePath = path.join(process.cwd(), 'img', 'menu.png');
		if (fs.existsSync(imagePath)) {
			await hisoka.sendMessage(m.from, { image: fs.readFileSync(imagePath), caption: text }, { quoted: m });
		} else {
			await tolak(hisoka, m, text);
		}
		logCommand(m, hisoka, 'info');
	} catch (error) {
		console.error('\x1b[31m[Info] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
	}
}

module.exports = { handleInfo };
