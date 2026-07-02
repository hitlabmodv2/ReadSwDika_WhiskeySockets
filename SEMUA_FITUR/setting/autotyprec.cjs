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
 *  autotyprec.cjs — Auto typing/recording toggle
 *  Perintah .typ dan .rec untuk aktifkan animasi sedang mengetik/merekam
 * ───────────────────────────────
 */
'use strict';

async function handleTyp({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoTyping, setJadibotUserSetting }) {
	if (!m.isOwner && hisoka?.isMainBot !== false) return;
	try {
		const _isJadibot  = hisoka?.isMainBot === false;
		const _jadibotNum = _isJadibot ? getJadibotNumber(hisoka) : null;
		const autoTyping  = _isJadibot
			? getJadibotAutoTyping(_jadibotNum)
			: (loadConfig().autoTyping || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });
		const args = query ? query.toLowerCase().split(' ') : [];

		const _saveTyping = (newVal) => {
			if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoTyping', newVal);
			else { const cfg = loadConfig(); cfg.autoTyping = newVal; saveConfig(cfg); }
		};

		if (args.length === 0) {
			let text = `╭═══『 *AUTO TYPING* 』═══╮\n`;
			text += `│\n│ *Status:* ${autoTyping.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n`;
			text += `│ *Delay:* ${autoTyping.delaySeconds || 5} detik\n`;
			text += `│ *Private Chat:* ${autoTyping.privateChat !== false ? '✅' : '❌'}\n`;
			text += `│ *Group Chat:* ${autoTyping.groupChat !== false ? '✅' : '❌'}\n│\n`;
			text += `│ *Penggunaan:*\n│ .typing on/off\n│ .typing set <detik>\n│ .typing private on/off\n│ .typing group on/off\n│\n`;
			text += `╰═════════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}

		if (args[0] === 'on') {
			if (autoTyping.enabled) await tolak(hisoka, m, 'ℹ️ Auto Typing sudah aktif sebelumnya');
			else { _saveTyping({ ...autoTyping, enabled: true }); await tolak(hisoka, m, '✅ Auto Typing diaktifkan'); }
		} else if (args[0] === 'off') {
			if (!autoTyping.enabled) await tolak(hisoka, m, 'ℹ️ Auto Typing sudah nonaktif sebelumnya');
			else { _saveTyping({ ...autoTyping, enabled: false }); await tolak(hisoka, m, '❌ Auto Typing dinonaktifkan'); }
		} else if (args[0] === 'set' && args[1]) {
			const seconds = parseInt(args[1]);
			if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara 1-60 detik'); return; }
			_saveTyping({ ...autoTyping, delaySeconds: seconds });
			const _typingNote = autoTyping.enabled ? ' (berlaku pada pesan masuk berikutnya)' : ' (akan berlaku saat typing dinyalakan)';
			await tolak(hisoka, m, `✅ Delay Auto Typing diset ke ${seconds} detik${_typingNote}`);
		} else if (args[0] === 'private' && args[1]) {
			const enabled = args[1] === 'on';
			_saveTyping({ ...autoTyping, privateChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Auto Typing untuk Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`);
		} else if (args[0] === 'group' && args[1]) {
			const enabled = args[1] === 'on';
			_saveTyping({ ...autoTyping, groupChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Auto Typing untuk Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`);
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .typing untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'typing');
	} catch (error) {
		console.error('\x1b[31m[Typing] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

async function handleRecord({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotAutoRecording, setJadibotUserSetting }) {
	if (!m.isOwner && hisoka?.isMainBot !== false) return;
	try {
		const _isJadibot     = hisoka?.isMainBot === false;
		const _jadibotNum    = _isJadibot ? getJadibotNumber(hisoka) : null;
		const autoRecording  = _isJadibot
			? getJadibotAutoRecording(_jadibotNum)
			: (loadConfig().autoRecording || { enabled: false, delaySeconds: 5, privateChat: true, groupChat: true });
		const args = query ? query.toLowerCase().split(' ') : [];

		const _saveRecording = (newVal) => {
			if (_isJadibot) setJadibotUserSetting(_jadibotNum, 'autoRecording', newVal);
			else { const cfg = loadConfig(); cfg.autoRecording = newVal; saveConfig(cfg); }
		};

		if (args.length === 0) {
			let text = `╭═══『 *AUTO RECORDING* 』═══╮\n`;
			text += `│\n│ *Status:* ${autoRecording.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n`;
			text += `│ *Delay:* ${autoRecording.delaySeconds || 5} detik\n`;
			text += `│ *Private Chat:* ${autoRecording.privateChat !== false ? '✅' : '❌'}\n`;
			text += `│ *Group Chat:* ${autoRecording.groupChat !== false ? '✅' : '❌'}\n│\n`;
			text += `│ *Penggunaan:*\n│ .recording on/off\n│ .recording set <detik>\n│ .recording private on/off\n│ .recording group on/off\n│\n`;
			text += `╰═════════════════════╯`;
			await tolak(hisoka, m, text);
			return;
		}

		if (args[0] === 'on') {
			if (autoRecording.enabled) await tolak(hisoka, m, 'ℹ️ Auto Recording sudah aktif sebelumnya');
			else { _saveRecording({ ...autoRecording, enabled: true }); await tolak(hisoka, m, '✅ Auto Recording diaktifkan'); }
		} else if (args[0] === 'off') {
			if (!autoRecording.enabled) await tolak(hisoka, m, 'ℹ️ Auto Recording sudah nonaktif sebelumnya');
			else { _saveRecording({ ...autoRecording, enabled: false }); await tolak(hisoka, m, '❌ Auto Recording dinonaktifkan'); }
		} else if (args[0] === 'set' && args[1]) {
			const seconds = parseInt(args[1]);
			if (isNaN(seconds) || seconds < 1 || seconds > 60) { await tolak(hisoka, m, '❌ Delay harus antara 1-60 detik'); return; }
			_saveRecording({ ...autoRecording, delaySeconds: seconds });
			const _recNote = autoRecording.enabled ? ' (berlaku pada pesan masuk berikutnya)' : ' (akan berlaku saat recording dinyalakan)';
			await tolak(hisoka, m, `✅ Delay Auto Recording diset ke ${seconds} detik${_recNote}`);
		} else if (args[0] === 'private' && args[1]) {
			const enabled = args[1] === 'on';
			_saveRecording({ ...autoRecording, privateChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Auto Recording untuk Private Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`);
		} else if (args[0] === 'group' && args[1]) {
			const enabled = args[1] === 'on';
			_saveRecording({ ...autoRecording, groupChat: enabled });
			await tolak(hisoka, m, `${enabled ? '✅' : '❌'} Auto Recording untuk Group Chat ${enabled ? 'diaktifkan' : 'dinonaktifkan'}`);
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .recording untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'recording');
	} catch (error) {
		console.error('\x1b[31m[Recording] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleTyp, handleRecord };
