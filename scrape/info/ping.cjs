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
 *  ping.cjs — Ping command handler
 *  Perintah .ping untuk cek latensi respons dan status aktif bot
 * ───────────────────────────────
 */
'use strict';

async function handlePing({ hisoka, m, tolak, logCommand, getBotStats, os }) {
	if (!m.prefix && m.query) return;
	try {
		const msg = await tolak(hisoka, m, '⏳ _Checking..._');
		const latency = Math.abs(Date.now() - m.messageTimestamp * 1000);
		const stats = getBotStats();
		const sessionUptime = process.uptime();
		
		const memUsage = process.memoryUsage();
		const memUsedMB = (memUsage.heapUsed / 1024 / 1024).toFixed(2);
		const memTotalMB = (memUsage.heapTotal / 1024 / 1024).toFixed(2);
		
		const now = new Date();
		const timeStr = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
		const dateStr = now.toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Jakarta' });
		
		const jakartaHour = parseInt(now.toLocaleTimeString('id-ID', { hour: '2-digit', hour12: false, timeZone: 'Asia/Jakarta' }));
		let greetingTime, greetingEmoji;
		if (jakartaHour >= 4 && jakartaHour < 11) {
			greetingTime = 'Pagi';
			greetingEmoji = '🌅';
		} else if (jakartaHour >= 11 && jakartaHour < 15) {
			greetingTime = 'Siang';
			greetingEmoji = '☀️';
		} else if (jakartaHour >= 15 && jakartaHour < 18) {
			greetingTime = 'Sore';
			greetingEmoji = '🌇';
		} else {
			greetingTime = 'Malam';
			greetingEmoji = '🌙';
		}
		
		const speedText = latency < 100 ? 'Cepat' : latency < 500 ? 'Normal' : 'Lambat';
		const speedEmoji = latency < 100 ? '🚀' : latency < 500 ? '⚡' : '🐢';
		
		const sessSeconds = Math.floor(sessionUptime);
		const sessMinutes = Math.floor(sessSeconds / 60);
		const sessHours = Math.floor(sessMinutes / 60);
		const sessDays = Math.floor(sessHours / 24);
		const sessFormatted = `${sessDays}d ${sessHours % 24}h ${sessMinutes % 60}m`;
		
		const cpuCores = os.cpus().length;
		const cpuModel = os.cpus()[0]?.model?.split(' ')[0] || 'Unknown';
		const totalMemGB = (os.totalmem() / 1024 / 1024 / 1024).toFixed(1);
		const freeMemGB = (os.freemem() / 1024 / 1024 / 1024).toFixed(1);
		const usedMemGB = (totalMemGB - freeMemGB).toFixed(1);
		const memPercent = ((usedMemGB / totalMemGB) * 100).toFixed(0);
		const nodeVersion = process.version;
		const platform = process.platform;
		
		const pingText = `
╭═════════════════════╮
║        🏓 *PONG!* 🏓        
├═════════════════════┤
│ 👋 Selamat  » ${greetingTime} ${greetingEmoji}
│ ${speedEmoji} Speed  » ${speedText}
│ ⚡ Latency  » ${latency}ms
│ 🕐 Waktu  » ${timeStr}
│ 📅 Tanggal  » ${dateStr}
├═════════════════════┤
║        📊 *BOT STATUS*        
├═════════════════════┤
│ ⏱️ Uptime  » ${stats.uptime.days}d ${stats.uptime.hours}h ${stats.uptime.minutes}m
│ 🔄 Session  » ${sessFormatted}
│ 🔁 Restart  » ${stats.totalRestarts}x
│ 🟢 Status  » Online
├═════════════════════┤
║        💻 *SYSTEM INFO*        
├═════════════════════┤
│ 🧠 CPU  » ${cpuCores} Core
│ 📟 RAM  » ${usedMemGB}/${totalMemGB}GB (${memPercent}%)
│ 💾 Bot Mem  » ${memUsedMB}MB
│ 🖥️ Platform  » ${platform}
│ 📦 NodeJS  » ${nodeVersion}
╰═════════════════════╯`;

		let ppUrl;
		try {
			ppUrl = await hisoka.profilePictureUrl(hisoka.user.id, 'image');
		} catch {
			ppUrl = null;
		}

		if (ppUrl) {
			await hisoka.sendMessage(m.from, {
				image: { url: ppUrl },
				caption: pingText
			}, { quoted: m });
		} else {
			await m.reply({ edit: msg.key, text: pingText });
		}
		
		logCommand(m, hisoka, 'ping');
	} catch (err) {
		console.error('\x1b[31mPing error:\x1b[39m', err.message);
	}
}

module.exports = { handlePing };
