'use strict';

async function handleEval({ hisoka, m, query, text, tolak, logCommand, util }) {
	if (!m.isOwner) return;
	let result;
	try {
		const code = query || text;
		if (!code || !code.trim()) {
			await tolak(hisoka, m, '❌ Masukkan kode yang ingin di-eval.');
			return;
		}
		if (/await/i.test(code)) {
			result = await Promise.resolve(eval('(async() => { ' + code + ' })()')).catch(e => e);
		} else {
			try { result = eval(code); } catch (e) { result = e; }
		}
	} catch (error) {
		result = error;
	}

	const evalOut = result instanceof Error
		? `❌ *${result.name}:* ${result.message}`
		: util.format(result);
	await tolak(hisoka, m, evalOut);
	logCommand(m, hisoka, 'eval');
}

async function handleBash({ hisoka, m, query, tolak, logCommand, exec, util }) {
	try {
		exec(query, (error, stdout, stderr) => {
			if (error) {
				return m.throw(util.format(error));
			}
			if (stderr) {
				return m.throw(stderr);
			}
			if (stdout) {
				return tolak(hisoka, m, stdout);
			}
			return m.throw('Command executed successfully, but no output.');
		});
		logCommand(m, hisoka, 'bash');
	} catch (error) {
		await tolak(hisoka, m, util.format(error));
	}
}

module.exports = { handleEval, handleBash };
