/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  Support dari kalian bikin saya
 *  makin semangat update fitur,
 *  fix bug, dan rawat script ini.
 *
 *  Dilarang menjual ulang script ini
 *  Tanpa izin resmi dari developer.
 *  Jika ketahuan = NO UPDATE / NO FIX
 *
 *  Hargai karya, gunakan dengan bijak.
 *  Terima kasih sudah support.
 * ───────────────────────────────
 *
 *  mati-cmd.cjs — Shutdown command handler
 *  Perintah .mati untuk matikan atau restart proses bot (owner only)
 * ───────────────────────────────
 */
'use strict';

async function handleMati({ hisoka, m, tolak, logCommand, _require, path }) {
	if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mematikan bot!');
	if (!m.prefix && m.query) return;
	const { shutdownBot } = _require(path.resolve('./SEMUA_FITUR/system/shutdown.cjs'));
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
