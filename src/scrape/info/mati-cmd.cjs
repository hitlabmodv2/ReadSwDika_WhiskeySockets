'use strict';

async function handleMati({ hisoka, m, tolak, logCommand, _require, path }) {
	if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mematikan bot!');
	if (!m.prefix && m.query) return;
	const { shutdownBot } = _require(path.resolve('./src/scrape/system/shutdown.cjs'));
	await hisoka.sendMessage(m.from, {
		text:
			`╔══════════════════════╗\n` +
			`║  ⛔  *B O T  M A T I*  ║\n` +
			`╚══════════════════════╝\n\n` +
			`🔴 Bot akan dimatikan sekarang!\n\n` +
			`⚙️ Dimatikan oleh: @${m.sender.split('@')[0]}\n` +
			`🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
			`ℹ️ Untuk menjalankan bot kembali,\n` +
			`jalankan ulang dari Replit.`,
		mentions: [m.sender]
	}, { quoted: m });
	logCommand(m, hisoka, 'mati');
	shutdownBot(2000);
}

module.exports = { handleMati };
