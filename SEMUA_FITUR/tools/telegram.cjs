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
 *  telegram.cjs — Telegram bridge command
 *  Perintah .tele untuk kirim pesan dan media dari WhatsApp ke Telegram
 * ───────────────────────────────
 */
'use strict';

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleTele({ hisoka, m, query, tolak, logCommand, isMainBot, loadConfig, saveConfig }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	try {
		const config = loadConfig();
		const telegramConfig = config.telegram || { enabled: true, token: '', chatId: '' };
		const telegramQuery  = m.query ? m.query.toLowerCase().trim() : '';
		const args           = telegramQuery ? telegramQuery.split(' ') : [];
		const validCommands  = ['on', 'off', 'true', 'false', 'token', 'chatid', 'chat_id', 'id', 'tutorial', 'help', 'test', 'cek', 'check'];

		const validateToken = async (token) => {
			try {
				const res  = await fetch(`https://api.telegram.org/bot${token}/getMe`);
				const data = await res.json();
				if (data.ok) return { valid: true, botName: data.result.first_name, username: data.result.username };
				return { valid: false, error: data.description };
			} catch (e) { return { valid: false, error: e.message }; }
		};

		const validateChatId = async (token, chatId) => {
			try {
				const res  = await fetch(`https://api.telegram.org/bot${token}/getChat?chat_id=${chatId}`);
				const data = await res.json();
				if (data.ok) return { valid: true, chatType: data.result.type, chatTitle: data.result.first_name || data.result.title };
				return { valid: false, error: data.description };
			} catch (e) { return { valid: false, error: e.message }; }
		};

		const showHelp = async () => {
			const statusText = telegramConfig.enabled ? '✅ Aktif' : '❌ Nonaktif';
			let tokenStatus = '❌ Belum diset', botInfo = '';
			if (telegramConfig.token) {
				const tokenCheck = await validateToken(telegramConfig.token);
				if (tokenCheck.valid) { tokenStatus = `✅ Valid`; botInfo = `\n┃ *Bot:* @${tokenCheck.username}`; }
				else tokenStatus = `❌ Invalid`;
			}
			let chatIdStatus = '❌ Belum diset', chatInfo = '';
			if (telegramConfig.chatId && telegramConfig.token) {
				const chatCheck = await validateChatId(telegramConfig.token, telegramConfig.chatId);
				if (chatCheck.valid) { chatIdStatus = `✅ Valid`; chatInfo = `\n┃ *Chat:* ${chatCheck.chatTitle}`; }
				else chatIdStatus = `❌ Invalid`;
			} else if (telegramConfig.chatId && !telegramConfig.token) {
				chatIdStatus = '⚠️ Set token dulu';
			}
			let text = `╭═══『 *TELEGRAM NOTIF* 』═══╮\n`;
			text += `│\n│ *Status:* ${statusText}\n│ *Token:* ${tokenStatus}${botInfo}\n│ *Chat ID:* ${chatIdStatus}${chatInfo}\n│\n`;
			text += `│ *Penggunaan:*\n│ .telegram on - Aktifkan\n│ .telegram off - Nonaktifkan\n`;
			text += `│ .telegram token <token>\n│ .telegram chatid <id>\n│ .telegram test - Test kirim\n│ .telegram tutorial - Cara dapat\n│\n`;
			text += `│ *Info:*\n│ Fitur ini mengirim story WA\n│ ke bot Telegram kamu\n│\n`;
			text += `│ _Multi-prefix, tanpa titik_\n│ _bot tetap merespon_\n╰═════════════════╯`;
			return text;
		};

		const showTutorial = () => {
			let text = `╭═══『 *TUTORIAL TELEGRAM* 』═══╮\n│\n│ *📱 CARA DAPAT BOT TOKEN:*\n│\n`;
			text += `│ 1. Buka Telegram\n│ 2. Cari @BotFather\n│ 3. Ketik /newbot\n│ 4. Masukkan nama bot\n│ 5. Masukkan username bot\n│    (harus diakhiri 'bot')\n│ 6. Copy token yang diberikan\n│ 7. Gunakan:\n│    .telegram token <token>\n│\n`;
			text += `│ *🆔 CARA DAPAT CHAT ID:*\n│\n│ 1. Buka Telegram\n│ 2. Cari @userinfobot\n│ 3. Klik Start\n│ 4. Bot akan kirim ID kamu\n│ 5. Copy angka ID tersebut\n│ 6. Gunakan:\n│    .telegram chatid <id>\n│\n`;
			text += `│ *⚠️ PENTING:*\n│ Setelah dapat token, kamu\n│ HARUS chat bot kamu dulu\n│ (klik Start) agar bot bisa\n│ mengirim pesan ke kamu!\n│\n╰═════════════════════╯`;
			return text;
		};

		if (args.length === 0 || !validCommands.includes(args[0])) {
			await tolak(hisoka, m, await showHelp());
			return;
		}

		if (args[0] === 'tutorial' || args[0] === 'help') {
			await tolak(hisoka, m, showTutorial());
		} else if (args[0] === 'test' || args[0] === 'cek' || args[0] === 'check') {
			if (!telegramConfig.token || !telegramConfig.chatId) {
				await tolak(hisoka, m, '❌ Token dan Chat ID harus diset dulu!\n\nGunakan .telegram tutorial untuk panduan.');
				return;
			}
			try {
				const testMsg = `✅ *Test Berhasil!*\n\nBot WhatsApp kamu berhasil terhubung ke Telegram.\n\n_Pesan ini dikirim pada ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}_`;
				const res  = await fetch(`https://api.telegram.org/bot${telegramConfig.token}/sendMessage`, {
					method : 'POST',
					headers: { 'Content-Type': 'application/json' },
					body   : JSON.stringify({ chat_id: telegramConfig.chatId, text: testMsg, parse_mode: 'Markdown' })
				});
				const data = await res.json();
				if (data.ok) await tolak(hisoka, m, '✅ Test berhasil! Cek Telegram kamu.');
				else          await tolak(hisoka, m, `❌ Gagal: ${data.description}\n\nPastikan kamu sudah Start bot di Telegram.`);
			} catch (e) { await tolak(hisoka, m, `❌ Error: ${e.message}`); }
		} else if (args[0] === 'on' || args[0] === 'true') {
			if (telegramConfig.enabled) { await tolak(hisoka, m, 'ℹ️ Telegram notifikasi sudah aktif sebelumnya'); }
			else { config.telegram = { ...telegramConfig, enabled: true }; saveConfig(config); await tolak(hisoka, m, '✅ Telegram notifikasi diaktifkan'); }
		} else if (args[0] === 'off' || args[0] === 'false') {
			if (!telegramConfig.enabled) { await tolak(hisoka, m, 'ℹ️ Telegram notifikasi sudah nonaktif sebelumnya'); }
			else { config.telegram = { ...telegramConfig, enabled: false }; saveConfig(config); await tolak(hisoka, m, '❌ Telegram notifikasi dinonaktifkan'); }
		} else if (args[0] === 'token' && args[1]) {
			const token = (m.query || '').replace(/^token\s*/i, '').trim();
			config.telegram = { ...telegramConfig, token }; saveConfig(config);
			await tolak(hisoka, m, '✅ Token Telegram berhasil diupdate');
		} else if ((args[0] === 'chatid' || args[0] === 'chat_id' || args[0] === 'id') && args[1]) {
			const chatIdValue = (m.query || '').replace(/^(chatid|chat_id|id)\s*/i, '').trim();
			config.telegram = { ...telegramConfig, chatId: chatIdValue }; saveConfig(config);
			await tolak(hisoka, m, '✅ Chat ID Telegram berhasil diupdate');
		} else if (args[0] === 'token' && !args[1]) {
			await tolak(hisoka, m, '❌ Format: .telegram token <bot_token>');
		} else if ((args[0] === 'chatid' || args[0] === 'chat_id' || args[0] === 'id') && !args[1]) {
			await tolak(hisoka, m, '❌ Format: .telegram chatid <chat_id>');
		} else {
			await tolak(hisoka, m, await showHelp());
		}

		logCommand(m, hisoka, 'telegram');
	} catch (error) {
		console.error('\x1b[31m[Telegram] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleTele };
