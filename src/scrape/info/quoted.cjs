'use strict';

async function handleQuoted({ hisoka, m, tolak, logCommand, injectMessage }) {
	if (!m.prefix && m.query) return;
	if (!m.isQuoted) {
		await tolak(hisoka, m, 'No quoted message found.');
		return;
	}

	const message = hisoka.cacheMsg.get(m.quoted.key.id);
	if (!message) {
		await tolak(hisoka, m, 'Quoted message not found.');
		return;
	}

	const IMessage = await injectMessage(hisoka, message);
	if (!IMessage.isQuoted) {
		await tolak(hisoka, m, 'Quoted message not found.');
		return;
	}

	await m.reply({ forward: IMessage.quoted });
	logCommand(m, hisoka, 'quoted');
}

module.exports = { handleQuoted };
