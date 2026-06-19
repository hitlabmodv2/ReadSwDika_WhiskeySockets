'use strict';

async function handleSessionstat({ hisoka, m, fs, path, logCommand }) {
	if (!m.prefix && m.query) return;
	if (!m.isOwner) return;
	try {
		const readSessionStats = (sessionDir) => {
			const credsPath = path.join(sessionDir, 'creds.json');
			if (!fs.existsSync(credsPath)) return null;
			const files        = fs.readdirSync(sessionDir);
			const preKeys      = files.filter(f => f.startsWith('pre-key-')    && f.endsWith('.json')).length;
			const sessionFiles = files.filter(f => f.startsWith('session-')    && f.endsWith('.json')).length;
			const senderKeys   = files.filter(f => f.startsWith('sender-key-') && f.endsWith('.json')).length;
			let totalSize = 0;
			for (const f of files) { try { totalSize += fs.statSync(path.join(sessionDir, f)).size; } catch {} }
			return { preKeys, sessionFiles, senderKeys, totalFiles: files.length, totalSize };
		};
		const formatSize = (bytes) => {
			if (bytes < 1024)            return `${bytes} B`;
			if (bytes < 1024 * 1024)     return `${(bytes / 1024).toFixed(1)} KB`;
			return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
		};
		const mainStats = readSessionStats(global.sessionDir);
		const now = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

		let out = `╭═══════════════════════╮\n║   🗄️ *SESSION STATS*   \n╠═══════════════════════╣\n│ 🕐 _Realtime: ${now} WIB_\n╠═══════════════════════╣\n║   📦 *MAIN SESSION*   \n╠═══════════════════════╣\n`;
		if (!mainStats) {
			out += `│ ⚠️ creds.json belum ada\n`;
		} else {
			out += `│ ✅ Creds      » Tersimpan\n│ 🔑 Pre-Keys   » ${mainStats.preKeys} file\n│ 📋 Sessions   » ${mainStats.sessionFiles} file\n│ 🗝️ Sender-Keys » ${mainStats.senderKeys} file\n│ 📁 Total Files» ${mainStats.totalFiles}\n│ 💾 Total Size » ${formatSize(mainStats.totalSize)}\n`;
		}

		const jadibotDir = path.join(process.cwd(), 'jadibot');
		if (fs.existsSync(jadibotDir)) {
			const jadibotSessions = fs.readdirSync(jadibotDir).filter(n => fs.existsSync(path.join(jadibotDir, n, 'creds.json')));
			if (jadibotSessions.length > 0) {
				out += `╠═══════════════════════╣\n║   🤖 *JADIBOT SESSIONS*   \n╠═══════════════════════╣\n│ 📱 Total » ${jadibotSessions.length} sesi\n├───────────────────────┤\n`;
				let totalSize = 0;
				for (const num of jadibotSessions) {
					const jStats = readSessionStats(path.join(jadibotDir, num));
					if (jStats) {
						totalSize += jStats.totalSize;
						const shortNum = num.replace(/^62/, '0').slice(0, 12) + '..';
						out += `│  📞 ${shortNum} » ${jStats.totalFiles} files (${formatSize(jStats.totalSize)})\n`;
					}
				}
				out += `├───────────────────────┤\n│ 💾 Total Size » ${formatSize(totalSize)}\n`;
			}
		}
		out += `╰═══════════════════════╯`;
		await m.reply(out);
		logCommand(m, hisoka, 'dbstats');
	} catch (err) {
		await m.reply(`❌ Error baca DB stats:\n${err.message}`);
	}
}

module.exports = { handleSessionstat };
