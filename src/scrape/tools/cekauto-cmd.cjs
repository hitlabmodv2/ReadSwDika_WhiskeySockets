'use strict';

async function handleCekauto({ hisoka, m, query, tolak, logCommand, sendCekautoMsg, sendCekautoGrupMsg }) {
	if (!m.isOwner) return tolak(hisoka, m, '❌ Fitur ini hanya untuk owner!');
	const subCekauto = (query || '').trim().toLowerCase();
	if (subCekauto === 'gc' || subCekauto === 'grup' || subCekauto === 'group') {
		await sendCekautoGrupMsg(hisoka, m);
		logCommand(m, hisoka, 'cekauto gc');
	} else {
		await sendCekautoMsg(hisoka, m);
		logCommand(m, hisoka, 'cekauto');
	}
}

module.exports = { handleCekauto };
