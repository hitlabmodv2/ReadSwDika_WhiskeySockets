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
 *  anticall.cjs — Anti call command handler
 *  Perintah .anticall untuk tolak dan blokir panggilan masuk secara otomatis
 * ───────────────────────────────
 */
'use strict';

async function handleAc({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticall, setJadibotUserSetting }) {
	const _isJadibotUserCtx_ac = hisoka?.isMainBot === false && (() => {
		const _sn = (m.sender || '').split('@')[0].split(':')[0];
		const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
		return !!_jn && _sn === _jn;
	})();
	if (!m.isOwner && !_isJadibotUserCtx_ac) return;
	try {
		const isJadibot  = hisoka?.isMainBot === false;
		const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

		const getAntiCall  = () => isJadibot ? getJadibotAnticall(jadibotNum) : (loadConfig().antiCall || { enabled: false, message: '', whitelist: [] });
		const saveAntiCall = (val) => {
			if (isJadibot) setJadibotUserSetting(jadibotNum, 'anticall', val);
			else { const cfg = loadConfig(); cfg.antiCall = val; saveConfig(cfg); }
		};

		const antiCall    = getAntiCall();
		const args        = query ? query.split(' ') : [];
		const argLower    = args[0] ? args[0].toLowerCase() : '';
		const jadibotNote = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

		if (args.length === 0) {
			let text = `╭═══『 *ANTI CALL* 』═══╮\n│\n│ *Status:* ${antiCall.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *Pesan:* ${antiCall.message || '(kosong)'}\n│ *Whitelist:* ${(antiCall.whitelist || []).length} nomor\n│\n│ *Penggunaan:*\n│ .anticall on/off\n│ .anticall msg <pesan>\n│ .anticall list\n│ .anticall add <nomor>\n│ .anticall del <nomor>\n│ .anticall reset\n│\n│ *Info:* Nomor whitelist tidak\n│ akan di-reject panggilannya\n`;
			if (isJadibot) text += `│\n│ _⚙️ Setting jadibot +${jadibotNum}_\n`;
			text += `│\n╰═════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}

		if (argLower === 'on') {
			if (antiCall.enabled) await tolak(hisoka, m, 'ℹ️ Anti Call sudah aktif sebelumnya');
			else { saveAntiCall({ ...antiCall, enabled: true }); await tolak(hisoka, m, '✅ Anti Call diaktifkan - Panggilan suara akan otomatis ditolak' + jadibotNote); }
		} else if (argLower === 'off') {
			if (!antiCall.enabled) await tolak(hisoka, m, 'ℹ️ Anti Call sudah nonaktif sebelumnya');
			else { saveAntiCall({ ...antiCall, enabled: false }); await tolak(hisoka, m, '❌ Anti Call dinonaktifkan' + jadibotNote); }
		} else if (['msg','message','pesan'].includes(argLower)) {
			const newMsg = args.slice(1).join(' ');
			if (!newMsg) await tolak(hisoka, m, `📝 Pesan saat ini:\n\n${antiCall.message || '(kosong)'}\n\nGunakan: .anticall msg <pesan baru>`);
			else { saveAntiCall({ ...antiCall, message: newMsg }); await tolak(hisoka, m, `✅ Pesan Anti Call diubah menjadi:\n\n${newMsg}` + jadibotNote); }
		} else if (argLower === 'list') {
			const whitelist = antiCall.whitelist || [];
			if (whitelist.length === 0) await tolak(hisoka, m, '📋 Whitelist Anti Call kosong\n\nGunakan .anticall add <nomor> untuk menambahkan');
			else {
				let text = `╭═══『 *WHITELIST ANTICALL* 』═══╮\n│\n`;
				whitelist.forEach((num, i) => { text += `│ ${i + 1}. ${num}\n`; });
				text += `│\n╰═════════════════╯`;
				await tolak(hisoka, m, text);
			}
		} else if (argLower === 'add') {
			const number = args[1] ? args[1].replace(/[^0-9]/g, '') : '';
			if (!number) { await tolak(hisoka, m, '❌ Masukkan nomor!\n\nContoh: .anticall add 628123456789'); return; }
			const whitelist = antiCall.whitelist || [];
			if (whitelist.includes(number)) await tolak(hisoka, m, `ℹ️ Nomor ${number} sudah ada di whitelist`);
			else { whitelist.push(number); saveAntiCall({ ...antiCall, whitelist }); await tolak(hisoka, m, `✅ Nomor ${number} ditambahkan ke whitelist Anti Call` + jadibotNote); }
		} else if (['del','delete','hapus'].includes(argLower)) {
			const number = args[1] ? args[1].replace(/[^0-9]/g, '') : '';
			if (!number) { await tolak(hisoka, m, '❌ Masukkan nomor!\n\nContoh: .anticall del 628123456789'); return; }
			const whitelist = antiCall.whitelist || [];
			const idx = whitelist.findIndex(n => n === number);
			if (idx === -1) await tolak(hisoka, m, `ℹ️ Nomor ${number} tidak ditemukan di whitelist`);
			else { whitelist.splice(idx, 1); saveAntiCall({ ...antiCall, whitelist }); await tolak(hisoka, m, `✅ Nomor ${number} dihapus dari whitelist Anti Call` + jadibotNote); }
		} else if (['reset','clear'].includes(argLower)) {
			saveAntiCall({ ...antiCall, whitelist: [] });
			await tolak(hisoka, m, '✅ Whitelist Anti Call direset' + jadibotNote);
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .anticall untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'anticall');
	} catch (error) {
		console.error('\x1b[31m[AntiCall] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

async function handleAcv({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAnticallvid, setJadibotUserSetting }) {
	const _isJadibotUserCtx_acv = hisoka?.isMainBot === false && (() => {
		const _sn = (m.sender || '').split('@')[0].split(':')[0];
		const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
		return !!_jn && _sn === _jn;
	})();
	if (!m.isOwner && !_isJadibotUserCtx_acv) return;
	try {
		const isJadibot  = hisoka?.isMainBot === false;
		const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

		const getAntiCallVid  = () => isJadibot ? getJadibotAnticallvid(jadibotNum) : (loadConfig().antiCallVideo || { enabled: false, message: '', whitelist: [] });
		const saveAntiCallVid = (val) => {
			if (isJadibot) setJadibotUserSetting(jadibotNum, 'anticallvid', val);
			else { const cfg = loadConfig(); cfg.antiCallVideo = val; saveConfig(cfg); }
		};

		const antiCallVideo = getAntiCallVid();
		const args          = query ? query.split(' ') : [];
		const argLower      = args[0] ? args[0].toLowerCase() : '';
		const jadibotNote   = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

		if (args.length === 0) {
			let text = `╭═══『 *ANTI CALL VIDEO* 』═══╮\n│\n│ *Status:* ${antiCallVideo.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *Pesan:* ${antiCallVideo.message || '(kosong)'}\n│ *Whitelist:* ${(antiCallVideo.whitelist || []).length} nomor\n│\n│ *Penggunaan:*\n│ .anticallvid on/off\n│ .anticallvid msg <pesan>\n│ .anticallvid list\n│ .anticallvid add <nomor>\n│ .anticallvid del <nomor>\n│ .anticallvid reset\n│\n│ *Info:* Nomor whitelist tidak\n│ akan di-reject panggilannya\n`;
			if (isJadibot) text += `│\n│ _⚙️ Setting jadibot +${jadibotNum}_\n`;
			text += `│\n╰═════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}

		if (argLower === 'on') {
			if (antiCallVideo.enabled) await tolak(hisoka, m, 'ℹ️ Anti Call Video sudah aktif sebelumnya');
			else { saveAntiCallVid({ ...antiCallVideo, enabled: true }); await tolak(hisoka, m, '✅ Anti Call Video diaktifkan - Panggilan video akan otomatis ditolak' + jadibotNote); }
		} else if (argLower === 'off') {
			if (!antiCallVideo.enabled) await tolak(hisoka, m, 'ℹ️ Anti Call Video sudah nonaktif sebelumnya');
			else { saveAntiCallVid({ ...antiCallVideo, enabled: false }); await tolak(hisoka, m, '❌ Anti Call Video dinonaktifkan' + jadibotNote); }
		} else if (['msg','message','pesan'].includes(argLower)) {
			const newMsg = args.slice(1).join(' ');
			if (!newMsg) await tolak(hisoka, m, `📝 Pesan saat ini:\n\n${antiCallVideo.message || '(kosong)'}\n\nGunakan: .anticallvid msg <pesan baru>`);
			else { saveAntiCallVid({ ...antiCallVideo, message: newMsg }); await tolak(hisoka, m, `✅ Pesan Anti Call Video diubah menjadi:\n\n${newMsg}` + jadibotNote); }
		} else if (argLower === 'list') {
			const whitelist = antiCallVideo.whitelist || [];
			if (whitelist.length === 0) await tolak(hisoka, m, '📋 Whitelist Anti Call Video kosong\n\nGunakan .anticallvid add <nomor> untuk menambahkan');
			else {
				let text = `╭═══『 *WHITELIST ANTICALL VIDEO* 』═══╮\n│\n`;
				whitelist.forEach((num, i) => { text += `│ ${i + 1}. ${num}\n`; });
				text += `│\n╰═════════════════╯`;
				await tolak(hisoka, m, text);
			}
		} else if (argLower === 'add') {
			const number = args[1] ? args[1].replace(/[^0-9]/g, '') : '';
			if (!number) { await tolak(hisoka, m, '❌ Masukkan nomor!\n\nContoh: .anticallvid add 628123456789'); return; }
			const whitelist = antiCallVideo.whitelist || [];
			if (whitelist.includes(number)) await tolak(hisoka, m, `ℹ️ Nomor ${number} sudah ada di whitelist`);
			else { whitelist.push(number); saveAntiCallVid({ ...antiCallVideo, whitelist }); await tolak(hisoka, m, `✅ Nomor ${number} ditambahkan ke whitelist Anti Call Video` + jadibotNote); }
		} else if (['del','delete','hapus'].includes(argLower)) {
			const number = args[1] ? args[1].replace(/[^0-9]/g, '') : '';
			if (!number) { await tolak(hisoka, m, '❌ Masukkan nomor!\n\nContoh: .anticallvid del 628123456789'); return; }
			const whitelist = antiCallVideo.whitelist || [];
			const idx = whitelist.findIndex(n => n === number);
			if (idx === -1) await tolak(hisoka, m, `ℹ️ Nomor ${number} tidak ditemukan di whitelist`);
			else { whitelist.splice(idx, 1); saveAntiCallVid({ ...antiCallVideo, whitelist }); await tolak(hisoka, m, `✅ Nomor ${number} dihapus dari whitelist Anti Call Video` + jadibotNote); }
		} else if (['reset','clear'].includes(argLower)) {
			saveAntiCallVid({ ...antiCallVideo, whitelist: [] });
			await tolak(hisoka, m, '✅ Whitelist Anti Call Video direset' + jadibotNote);
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .anticallvid untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'anticallvid');
	} catch (error) {
		console.error('\x1b[31m[AntiCallVideo] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleAc, handleAcv };
