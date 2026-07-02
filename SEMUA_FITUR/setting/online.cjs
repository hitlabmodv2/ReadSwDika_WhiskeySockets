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
 *  online.cjs — Auto online command handler
 *  Perintah .online untuk aktifkan/nonaktifkan status kehadiran selalu online
 * ───────────────────────────────
 */
'use strict';

async function handleOnline({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoOnline, setJadibotUserSetting, startJadibotAutoOnline }) {
	if (hisoka?.isMainBot === false) {
		const _sn = (m.sender || '').split('@')[0].split(':')[0];
		const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
		const _isJadibotUser = !!_jn && _sn === _jn;
		if (!m.isOwner && !_isJadibotUser) return;
		try {
			const jadibotNum = getJadibotNumber(hisoka);
			const autoOnline = getJadibotAutoOnline(jadibotNum);
			const args       = query ? query.toLowerCase().split(' ') : [];

			if (args.length === 0) {
				let text = `╭═══『 *AUTO ONLINE JADIBOT* 』═══╮\n│\n│ *Status:* ${autoOnline.enabled ? '✅ ONLINE (terlihat online)' : '🙈 OFFLINE (tersembunyi)'}\n│ *Kirim ulang setiap:* ${autoOnline.intervalSeconds || 30} detik\n│\n`;
				text += `│ *Penggunaan:*\n│ .online on  → Jadibot terlihat online\n│ .online off → Jadibot tersembunyi/offline\n│ .online set <dtk> → Atur seberapa sering\n│   status dikirim ulang ke WA (10-300 dtk)\n│   Makin kecil = makin stabil, makin boros\n│\n`;
				text += `│ *Catatan:* Setting ini khusus untuk\n│ jadibot ini saja, tidak mempengaruhi\n│ bot utama atau jadibot lain.\n│\n╰══════════════════════╯`;
				await tolak(hisoka, m, text);
				return;
			}

			if (args[0] === 'on') {
				if (autoOnline.enabled) { await tolak(hisoka, m, 'ℹ️ Auto Online jadibot sudah aktif sebelumnya'); }
				else { setJadibotUserSetting(jadibotNum, 'autoOnline', { ...autoOnline, enabled: true }); startJadibotAutoOnline(hisoka, jadibotNum); await tolak(hisoka, m, '✅ Auto Online jadibot diaktifkan - Anda terlihat online'); }
			} else if (args[0] === 'off') {
				if (!autoOnline.enabled) { await tolak(hisoka, m, 'ℹ️ Auto Online jadibot sudah nonaktif sebelumnya'); }
				else { setJadibotUserSetting(jadibotNum, 'autoOnline', { ...autoOnline, enabled: false }); startJadibotAutoOnline(hisoka, jadibotNum); await tolak(hisoka, m, '🙈 Auto Online jadibot dinonaktifkan - Mode stealth aktif'); }
			} else if (args[0] === 'set' && args[1]) {
				const seconds = parseInt(args[1]);
				if (isNaN(seconds) || seconds < 10 || seconds > 300) { await tolak(hisoka, m, '❌ Interval harus antara 10-300 detik'); return; }
				const updatedAO = { ...autoOnline, intervalSeconds: seconds };
				setJadibotUserSetting(jadibotNum, 'autoOnline', updatedAO);
				let _timerStatus = '';
				if (updatedAO.enabled) { startJadibotAutoOnline(hisoka, jadibotNum); _timerStatus = ' (timer restarted)'; }
				else _timerStatus = ' (akan aktif saat online dinyalakan)';
				await tolak(hisoka, m, `✅ Interval Auto Online diset ke ${seconds} detik${_timerStatus}`);
			} else {
				await tolak(hisoka, m, '❌ Perintah tidak valid. Ketik .online untuk bantuan.');
			}
			logCommand(m, hisoka, 'online');
		} catch (error) {
			console.error('\x1b[31m[Online-Jadibot] Error:\x1b[39m', error.message);
			await tolak(hisoka, m, `Error: ${error.message}`);
		}
		return;
	}

	if (!m.isOwner) return;
	try {
		const config     = loadConfig();
		const autoOnline = config.autoOnline || { enabled: false, intervalSeconds: 30 };
		const args       = query ? query.toLowerCase().split(' ') : [];

		if (args.length === 0) {
			let text = `╭═══『 *AUTO PRESENCE* 』═══╮\n│\n│ *Mode:* ${autoOnline.enabled ? '✅ ONLINE' : '🙈 OFFLINE (Stealth)'}\n│ *Interval:* ${autoOnline.intervalSeconds || 30} detik\n│ *Running:* ${global.autoOnlineInterval ? '✅ Yes' : '❌ No'}\n│\n`;
			text += `│ *Penggunaan:*\n│ .online on - Terlihat Online\n│ .online off - Terlihat Offline\n│ .online set <detik> - Set interval\n│\n`;
			text += `│ *Info:* Mode OFFLINE mengirim\n│ unavailable setiap ${autoOnline.intervalSeconds || 30}s agar\n│ tetap tersembunyi walaupun WA\n│ dibuka di HP\n│\n╰═════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}

		if (args[0] === 'on') {
			if (autoOnline.enabled) { await tolak(hisoka, m, 'ℹ️ Auto Online sudah aktif sebelumnya'); }
			else {
				config.autoOnline = { ...autoOnline, enabled: true }; saveConfig(config);
				if (global.startAutoOnline) global.startAutoOnline();
				else if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('available');
				await tolak(hisoka, m, '✅ Auto Online diaktifkan - Anda terlihat online');
			}
		} else if (args[0] === 'off') {
			if (!autoOnline.enabled) { await tolak(hisoka, m, 'ℹ️ Auto Online sudah nonaktif sebelumnya - Anda terlihat offline'); }
			else {
				config.autoOnline = { ...autoOnline, enabled: false }; saveConfig(config);
				if (global.startAutoOnline) global.startAutoOnline();
				else {
					if (global.autoOnlineInterval) { clearInterval(global.autoOnlineInterval); global.autoOnlineInterval = null; }
					if (global.hisokaClient) global.hisokaClient.sendPresenceUpdate('unavailable');
				}
				console.log(`\x1b[33m[AutoOnline]\x1b[39m Switched to OFFLINE mode`);
				await tolak(hisoka, m, '🙈 Auto Online dinonaktifkan - Mode stealth aktif, status terus tersembunyi');
			}
		} else if (args[0] === 'set' && args[1]) {
			const seconds = parseInt(args[1]);
			if (isNaN(seconds) || seconds < 10 || seconds > 300) { await tolak(hisoka, m, '❌ Interval harus antara 10-300 detik'); return; }
			config.autoOnline = { ...autoOnline, intervalSeconds: seconds }; saveConfig(config);
			let timerStatus = '';
			if (config.autoOnline.enabled) {
				if (global.startAutoOnline) { global.startAutoOnline(); timerStatus = ' (timer restarted)'; }
				else timerStatus = ' (akan aktif saat reconnect)';
			}
			await tolak(hisoka, m, `✅ Interval Auto Online diset ke ${seconds} detik${timerStatus}`);
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .online untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'online');
	} catch (error) {
		console.error('\x1b[31m[Online] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleOnline };
