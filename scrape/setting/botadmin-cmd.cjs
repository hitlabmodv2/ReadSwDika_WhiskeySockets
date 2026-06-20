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
 *  botadmin-cmd.cjs — Bot admin command handler
 *  Perintah manajemen admin bot: tambah, hapus, dan lihat daftar owner
 * ───────────────────────────────
 */
'use strict';

async function handleBotadmin({ hisoka, m, query, tolak, logCommand, isMainBot, kvGet }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	try {
		const arg = (query || '').trim().toLowerCase();
		const rawData = kvGet('botadmin/botadmin', {});
		const entries = Object.entries(rawData);

		if (entries.length === 0) {
			await tolak(hisoka, m,
				`╭══『 🤖 *BOTADMIN* 』══╮\n` +
				`│\n` +
				`│ ⚠️ Belum ada data grup.\n` +
				`│ Restart bot untuk sync ulang.\n` +
				`│\n` +
				`╰══════════════════════════╯`
			);
			return;
		}

		let filtered = entries;
		let filterLabel = 'Semua Grup';
		if (arg === 'admin') {
			filtered = entries.filter(([, v]) => v === true);
			filterLabel = 'Bot Admin ✅';
		} else if (arg === 'bukan' || arg === 'bukan admin') {
			filtered = entries.filter(([, v]) => v !== true);
			filterLabel = 'Bot Bukan Admin ❌';
		}

		const totalAdmin = entries.filter(([, v]) => v === true).length;
		const totalBukan = entries.length - totalAdmin;
		const medals = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];

		const CHUNK = 20;
		const chunks = [];
		for (let i = 0; i < filtered.length; i += CHUNK) {
			chunks.push(filtered.slice(i, i + CHUNK));
		}

		const now = new Date().toLocaleString('id-ID', {
			timeZone: 'Asia/Jakarta',
			hour: '2-digit', minute: '2-digit',
			day: '2-digit', month: 'short', year: 'numeric'
		});

		for (let ci = 0; ci < chunks.length; ci++) {
			const chunk = chunks[ci];
			const offset = ci * CHUNK;
			let baris = '';
			for (let i = 0; i < chunk.length; i++) {
				const [gid, isAdmin] = chunk[i];
				const grupCache = hisoka.groups?.read ? hisoka.groups.read(gid) : null;
				const namaGrup = grupCache?.subject || gid.split('@')[0];
				const idx = offset + i;
				const nomor = idx < medals.length ? medals[idx] : `*${idx + 1}.*`;
				baris +=
					`│ ${nomor} ${namaGrup}\n` +
					`│    ${isAdmin ? '✅ Bot Admin' : '❌ Bukan Admin'}\n` +
					`│    \`${gid}\`\n` +
					`│\n`;
			}

			const header = ci === 0
				? `╭══『 🤖 *BOTADMIN LIST* 』══╮\n` +
				  `│\n` +
				  `│ 🕐 *Update:* ${now} WIB\n` +
				  `│ 📊 *Filter:* ${filterLabel}\n` +
				  `│ 📦 *Total:* ${filtered.length} grup\n` +
				  `│ ✅ *Admin:* ${totalAdmin} | ❌ *Bukan:* ${totalBukan}\n` +
				  `│\n`
				: `╭══『 🤖 *BOTADMIN* (${ci + 1}/${chunks.length}) 』══╮\n│\n`;

			const footer = ci === chunks.length - 1
				? `│ ─────────────────────────────────\n` +
				  `│ 💡 Filter: *.botadmin list admin*\n` +
				  `│           *.botadmin list bukan*\n` +
				  `│           *.botadmin list* (semua)\n` +
				  `╰══════════════════════════╯`
				: `╰══════════════════════════╯`;

			await tolak(hisoka, m, header + baris + footer);
		}

		logCommand(m, hisoka, `botadmin list${arg ? ' ' + arg : ''}`);
	} catch (err) {
		console.error('\x1b[31m[BotAdmin] Error:\x1b[39m', err.message);
		await tolak(hisoka, m, `❌ Error: ${err.message}`);
	}
}

module.exports = { handleBotadmin };
