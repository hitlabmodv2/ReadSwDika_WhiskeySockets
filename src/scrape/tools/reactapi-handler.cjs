'use strict';

async function handleReactinfo({ hisoka, m, tolak, logCommand, loadConfig }) {
	if (!m.prefix && m.query) return;
	try {
		const config      = loadConfig();
		const reactConfig = config.reactApi || {};
		const apiKey      = process.env.REACT_API_KEY || reactConfig.apiKey;
		if (!apiKey) { await tolak(hisoka, m, 'Mohon maaf, API key untuk fitur react belum dikonfigurasi.'); return; }

		const loadingMsg = await tolak(hisoka, m, '⏳ Mengambil informasi saldo...');
		const axios      = (await import('axios')).default;
		const baseUrl    = reactConfig.apiUrl || 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post';
		const balanceUrl = baseUrl.replace('/react-to-post', '/balance') || 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/balance';
		const headers    = { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

		try {
			const response = await axios.get(balanceUrl, { headers, timeout: 15000 });
			const data     = response.data;
			const balance  = data.balance || data.coins || data.coin || data.saldo || 0;
			const used     = data.used || data.totalUsed || data.coins_used || 0;
			const plan     = data.plan || data.subscription || data.package || 'Standard';
			const expiry   = data.expiry || data.expired || data.expiryDate || '-';
			let hasil = `╭═══ *INFO SALDO REACT* ═══╮\n│\n│ 💰 *Saldo Coin:* ${balance} coin\n│ 📊 *Total Terpakai:* ${used} coin\n│ 📦 *Paket:* ${plan}\n`;
			if (expiry !== '-') hasil += `│ 📅 *Berlaku Hingga:* ${expiry}\n`;
			hasil += `│\n│ ✅ Status: Aktif\n│\n╰════════════════════════╯`;
			await m.reply({ edit: loadingMsg.key, text: hasil.trim() });
		} catch (balanceError) {
			const maskedKey = apiKey.slice(0, 10) + '...' + apiKey.slice(-5);
			let hasil = `╭═══ *INFO REACT API* ═══╮\n│\n│ 🔑 *API Key:* ${maskedKey}\n│ ✅ *Status:* ${reactConfig.enabled ? 'Aktif' : 'Nonaktif'}\n│ 🌐 *Server:* Terhubung\n│\n│ ℹ️ *Info:*\n│ Endpoint cek saldo tidak tersedia\n│ atau sedang dalam pemeliharaan.\n│ Silakan coba fitur .react\n│\n╰════════════════════════╯`;
			await m.reply({ edit: loadingMsg.key, text: hasil.trim() });
		}
		logCommand(m, hisoka, 'cekreact');
	} catch (error) {
		console.error('\x1b[31m[CekReact] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan saat mengecek saldo: ${error.message}`);
	}
}

async function handleReactapi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig }) {
	try {
		if (!m.isOwner) { await tolak(hisoka, m, 'Mohon maaf, perintah ini hanya dapat digunakan oleh owner bot.'); return; }
		if (!query) {
			const config      = loadConfig();
			const reactConfig = config.reactApi || {};
			const currentKey  = process.env.REACT_API_KEY || reactConfig.apiKey;
			const maskedKey   = currentKey ? currentKey.slice(0, 10) + '...' + currentKey.slice(-5) : 'Belum diatur';
			await tolak(hisoka, m, `╭═══ *SETTING REACT API* ═══╮\n│\n│ 📌 *Cara Penggunaan:*\n│ .setreactapi [api_key]\n│\n│ 📊 *Status Saat Ini:*\n│ ├ Status: ${reactConfig.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ ├ API Key: ${maskedKey}\n│ └ Server: Default\n│\n╰════════════════════════════╯`);
			return;
		}
		const newApiKey = query.trim();
		const config    = loadConfig();
		if (!config.reactApi) config.reactApi = { enabled: true, apiKey: '', apiUrl: 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post' };
		config.reactApi.apiKey = newApiKey;
		saveConfig(config);
		const maskedKey = newApiKey.slice(0, 10) + '...' + newApiKey.slice(-5);
		await tolak(hisoka, m, `╭═══ *API KEY UPDATED* ═══╮\n│\n│ ✅ *Berhasil Diperbarui!*\n│\n│ 🔑 Key: ${maskedKey}\n│ 📊 Status: Aktif\n│\n│ 💡 Fitur react siap digunakan\n│\n╰═════════════════════════╯`);
		logCommand(m, hisoka, 'setreactapi');
	} catch (error) {
		console.error('\x1b[31m[SetReactAPI] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan saat mengatur API key: ${error.message}`);
	}
}

module.exports = { handleReactinfo, handleReactapi };
