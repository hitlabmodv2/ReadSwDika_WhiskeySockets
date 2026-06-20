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
 *  readsw.cjs — Read SW command handler
 *  Perintah .readsw untuk aktifkan/nonaktifkan auto-baca status WhatsApp
 * ───────────────────────────────
 */
'use strict';

async function handleReadsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadsw, setJadibotUserSetting }) {
	const _sn = (m.sender || '').split('@')[0].split(':')[0];
	const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
	const _isJadibotUser = hisoka?.isMainBot === false && !!_jn && _sn === _jn;
	if (!m.isOwner && !_isJadibotUser) return;

	try {
		const isJadibot  = hisoka?.isMainBot === false;
		const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

		const getReadswConfig = () => isJadibot
			? getJadibotReadsw(jadibotNum)
			: (loadConfig().autoReadStory || { enabled: true, autoReaction: true, randomDelay: true, delayMinMs: 1000, delayMaxMs: 20000, fixedDelayMs: 3000 });

		const saveReadswConfig = (newVal) => {
			if (isJadibot) setJadibotUserSetting(jadibotNum, 'readsw', newVal);
			else { const cfg = loadConfig(); cfg.autoReadStory = newVal; saveConfig(cfg); }
		};

		const storyConfig  = getReadswConfig();
		const args         = query ? query.toLowerCase().split(' ') : [];
		const jadibotNote  = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

		if (args.length === 0) {
			let statusText = '';
			if (!storyConfig.enabled) statusText = '❌ Nonaktif';
			else if (storyConfig.autoReaction !== false) statusText = '✅ Read + Reaction';
			else statusText = '✅ Read Only';
			let text = `╭═══『 *AUTO READ STORY* 』═══╮\n│\n│ *Status:* ${statusText}\n│ *Reaction:* ${storyConfig.autoReaction !== false ? '✅ Aktif' : '❌ Nonaktif'}\n`;
			text += `│ *Random Delay:* ${storyConfig.randomDelay !== false ? '✅' : '❌'}\n│ *Delay Min:* ${(storyConfig.delayMinMs || 1000) / 1000} detik\n`;
			text += `│ *Delay Max:* ${(storyConfig.delayMaxMs || 20000) / 1000} detik\n│ *Fixed Delay:* ${(storyConfig.fixedDelayMs || 3000) / 1000} detik\n│\n`;
			text += `│ *Penggunaan:*\n│ .readsw true - Read + Reaction\n│ .readsw false - Read Only\n│ .readsw off - Nonaktifkan\n│ .readsw delay <min> <max>\n│   (dalam detik, contoh: delay 1 20)\n│\n╰═════════════════════╯`;
			if (isJadibot) text += jadibotNote;
			await tolak(hisoka, m, text);
			return;
		}

		const buildStatusReply = (cfg, action) => {
			const delayMin   = (cfg.delayMinMs || 1000) / 1000;
			const delayMax   = (cfg.delayMaxMs || 20000) / 1000;
			const fixedDelay = (cfg.fixedDelayMs || 3000) / 1000;
			const isRandom   = cfg.randomDelay !== false;
			const modeText   = cfg.autoReaction !== false ? 'Read + Reaction' : 'Read Only';
			let text = `╭═══『 *AUTO READ STORY* 』═══╮\n│\n│ ${action}\n│\n│ *Mode:* ${modeText}\n│ *Delay:* ${isRandom ? `${delayMin}-${delayMax}s (random)` : `${fixedDelay}s (fixed)`}\n│\n╰═════════════════════╯`;
			if (isJadibot) text += jadibotNote;
			return text;
		};

		if (args[0] === 'true' || args[0] === 'on') {
			if (storyConfig.enabled && storyConfig.autoReaction !== false) { await tolak(hisoka, m, 'ℹ️ Auto Read Story + Reaction sudah aktif sebelumnya'); }
			else { const newCfg = { ...storyConfig, enabled: true, autoReaction: true }; saveReadswConfig(newCfg); await tolak(hisoka, m, buildStatusReply(newCfg, '✅ *Diaktifkan!*')); }
		} else if (args[0] === 'false') {
			if (storyConfig.enabled && storyConfig.autoReaction === false) { await tolak(hisoka, m, 'ℹ️ Auto Read Story (tanpa reaction) sudah aktif sebelumnya'); }
			else { const newCfg = { ...storyConfig, enabled: true, autoReaction: false }; saveReadswConfig(newCfg); await tolak(hisoka, m, buildStatusReply(newCfg, '✅ *Diaktifkan (Read Only)!*')); }
		} else if (args[0] === 'off') {
			if (!storyConfig.enabled) { await tolak(hisoka, m, 'ℹ️ Auto Read Story sudah nonaktif sebelumnya'); }
			else { const newCfg = { ...storyConfig, enabled: false }; saveReadswConfig(newCfg); await tolak(hisoka, m, '❌ Auto Read Story dinonaktifkan' + jadibotNote); }
		} else if (args[0] === 'delay' && args[1] && args[2]) {
			const minDelay = parseInt(args[1]), maxDelay = parseInt(args[2]);
			if (isNaN(minDelay) || isNaN(maxDelay)) { await tolak(hisoka, m, '❌ Delay harus berupa angka. Contoh: .readsw delay 1 20'); return; }
			if (minDelay < 1 || maxDelay > 60) { await tolak(hisoka, m, '❌ Delay min harus >= 1 detik dan max <= 60 detik'); return; }
			if (minDelay >= maxDelay) { await tolak(hisoka, m, '❌ Delay min harus lebih kecil dari delay max'); return; }
			const newCfg = { ...storyConfig, delayMinMs: minDelay * 1000, delayMaxMs: maxDelay * 1000, randomDelay: true };
			saveReadswConfig(newCfg);
			await tolak(hisoka, m, buildStatusReply(newCfg, `✅ *Delay diubah!*`));
		} else if (args[0] === 'delay' && args[1] && !args[2]) {
			const fixedDelay = parseInt(args[1]);
			if (isNaN(fixedDelay) || fixedDelay < 1 || fixedDelay > 60) { await tolak(hisoka, m, '❌ Delay harus antara 1-60 detik'); return; }
			const newCfg = { ...storyConfig, fixedDelayMs: fixedDelay * 1000, randomDelay: false };
			saveReadswConfig(newCfg);
			await tolak(hisoka, m, buildStatusReply(newCfg, `✅ *Fixed delay diubah!*`));
		} else {
			await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .readsw untuk melihat bantuan.');
		}
		logCommand(m, hisoka, 'readsw');
	} catch (error) {
		console.error('\x1b[31m[ReadSW] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleReadsw };
