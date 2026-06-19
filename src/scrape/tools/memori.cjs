'use strict';

async function handleMemori({ m, hisoka, logCommand, loadUserMemory, memoryToReadable }) {
	if (!m.prefix && m.query) return;
	const mem = loadUserMemory(m.sender);
	await m.reply(memoryToReadable(mem));
	logCommand(m, hisoka, 'memori');
}

async function handleForgetme({ m, hisoka, logCommand, clearUserMemory }) {
	if (!m.prefix && m.query) return;
	clearUserMemory(m.sender);
	await m.reply('> *🧠 Memori AI tentang kamu sudah dihapus*\n\n_AI bakal mulai pelan-pelan kenal kamu lagi dari awal._');
	logCommand(m, hisoka, 'lupakanaku');
}

module.exports = { handleMemori, handleForgetme };
