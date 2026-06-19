'use strict';
const nodePath = require('path');
const nodeFs   = require('fs');

async function handleListgroup({ hisoka, m, tolak, logCommand }) {
	if (!m.prefix && m.query) return;
	const groups = Object.values(await hisoka.groupFetchAllParticipating());
	groups.map(g => hisoka.groups.write(g.id, g));
	const { isJidGroup } = await import('@whiskeysockets/baileys');
	let text = `*Total ${groups.length} groups*\n\n`;
	text += `*Total Participants in all groups:* ${Array.from(groups).reduce((a, b) => a + b.participants.length, 0)}\n\n`;
	groups.filter(group => isJidGroup(group.id)).forEach((group, i) => {
		text += `${i + 1}. *${group.subject}* - ${group.participants.length} participants\n`;
	});
	await tolak(hisoka, m, text.trim());
	logCommand(m, hisoka, 'groups');
}

async function handleListcontact({ hisoka, m, tolak, logCommand }) {
	if (!m.prefix && m.query) return;
	const contacts = Array.from(hisoka.contacts.values()).filter(c => c.id);
	let text = '*Total:*\n\n';
	text += `- All Contacts: ${contacts.length}\n`;
	text += `- Saved Contacts: ${contacts.filter(v => v.isContact).length}\n`;
	text += `- Not Saved Contacts: ${contacts.filter(v => !v.isContact).length}\n`;
	await tolak(hisoka, m, text.trim());
	logCommand(m, hisoka, 'contacts');
}

async function handleUpdate({ hisoka, m, tolak, logCommand, path, fs, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	try {
		const changelogPath = path.join(process.cwd(), 'changelog.txt');
		if (!fs.existsSync(changelogPath)) { await tolak(hisoka, m, '❌ File changelog.txt tidak ditemukan.'); return; }
		const isiChangelog = fs.readFileSync(changelogPath, 'utf8').trim();
		await hisoka.sendMessage(m.from, { react: { text: '📋', key: m.key } }).catch(() => {});
		await hisoka.sendMessage(m.from, { text: isiChangelog }, { quoted: m });
		logCommand(m, hisoka, 'infoupdate');
	} catch (error) {
		console.error('\x1b[31m[InfoUpdate] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Gagal membaca changelog: ${error.message}`);
	}
}

module.exports = { handleListgroup, handleListcontact, handleUpdate };
