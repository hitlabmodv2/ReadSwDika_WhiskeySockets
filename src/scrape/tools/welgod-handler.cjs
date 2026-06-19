'use strict';
const nodePath = require('path');
const nodeFs   = require('fs');

async function handleSetwelgod({ hisoka, m, query, tolak, logCommand, loadConfig }) {
	if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
	if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

	const argWg    = (query || '').trim().toLowerCase();
	const cfgPathWg = nodePath.join(process.cwd(), 'config.json');
	const cfgWg    = loadConfig();
	if (!cfgWg.welcomeGoodbye) cfgWg.welcomeGoodbye = { enabled: true, groups: {} };
	if (!cfgWg.welcomeGoodbye.groups) cfgWg.welcomeGoodbye.groups = {};
	if (!cfgWg.welcomeGoodbye.groups[m.from]) cfgWg.welcomeGoodbye.groups[m.from] = {};

	if (!cfgWg.welcomeGoodbye.enabled) {
		return tolak(hisoka, m, `❌ Fitur Welcome/Goodbye dinonaktifkan secara global.\nUbah *welcomeGoodbye.enabled* di config.json menjadi *true*.`);
	}

	if (argWg === 'on') {
		cfgWg.welcomeGoodbye.groups[m.from].welcome = true;
		cfgWg.welcomeGoodbye.groups[m.from].goodbye = true;
		nodeFs.writeFileSync(cfgPathWg, JSON.stringify(cfgWg, null, 4));
		await tolak(hisoka, m,
			`╭───〔 *✅ WELGOD CARD* 〕───╮\n│\n│ 🟢 *Welcome & Goodbye AKTIF!*\n│\n│ 🖼️ Bot akan otomatis kirim canvas\n│    saat ada anggota masuk/keluar grup.\n│\n│ 💡 Nonaktifkan: *.welgod off*\n│\n╰────────────────────────────────────╯`
		);
		logCommand(m, hisoka, 'setwelgod on');
	} else if (argWg === 'off') {
		cfgWg.welcomeGoodbye.groups[m.from].welcome = false;
		cfgWg.welcomeGoodbye.groups[m.from].goodbye = false;
		nodeFs.writeFileSync(cfgPathWg, JSON.stringify(cfgWg, null, 4));
		await tolak(hisoka, m,
			`╭───〔 *❌ WELGOD CARD* 〕───╮\n│\n│ 🔴 *Welcome & Goodbye NONAKTIF!*\n│\n│ Bot tidak akan kirim canvas masuk\n│    maupun keluar di grup ini.\n│\n│ 💡 Aktifkan: *.welgod on*\n│\n╰────────────────────────────────────╯`
		);
		logCommand(m, hisoka, 'setwelgod off');
	} else {
		const wOn      = cfgWg.welcomeGoodbye.groups[m.from]?.welcome === true;
		const gOn      = cfgWg.welcomeGoodbye.groups[m.from]?.goodbye === true;
		const globalOn = cfgWg.welcomeGoodbye.enabled;
		await tolak(hisoka, m,
			`╭───〔 *ℹ️ WELGOD CARD* 〕───╮\n│\n│ 🌐 Global    : ${globalOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│ 👋 Welcome  : ${wOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│ 🚪 Goodbye  : ${gOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n│\n│ 🖼️ Aktifkan keduanya sekaligus untuk\n│    canvas masuk & keluar di grup ini.\n│\n│ 📋 Cara penggunaan:\n│ • *.welgod on*  → Aktifkan keduanya\n│ • *.welgod off* → Nonaktifkan keduanya\n│\n╰────────────────────────────────────╯`
		);
	}
}

module.exports = { handleSetwelgod };
