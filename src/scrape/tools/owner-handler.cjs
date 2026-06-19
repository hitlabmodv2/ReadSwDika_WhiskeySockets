'use strict';

async function handleAddowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	try {
		if (!query) { await tolak(hisoka, m, 'Mohon masukkan nomor yang ingin ditambahkan.\n\nContoh:\n.addowner 6289667923162\n.addowner +62 896-6792-3162'); return; }
		const cleanNumber = query.replace(/[\s\-\+\(\)]/g, '').replace(/^0/, '62');
		if (!/^\d{10,15}$/.test(cleanNumber)) { await tolak(hisoka, m, 'Format nomor tidak valid, Kak. Pastikan nomor telepon benar.'); return; }
		const config = loadConfig();
		const owners = config.owners || [];
		if (owners.includes(cleanNumber)) { await tolak(hisoka, m, `Nomor ${cleanNumber} sudah terdaftar sebagai owner, Kak.`); return; }
		owners.push(cleanNumber);
		config.owners = owners;
		saveConfig(config);
		await tolak(hisoka, m, `✅ Berhasil menambahkan owner baru!\n\n📞 Nomor: ${cleanNumber}\n👥 Total Owner: ${owners.length}`);
		logCommand(m, hisoka, 'addowner');
	} catch (error) {
		console.error('\x1b[31m[AddOwner] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
	}
}

async function handleDelowner({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
	if (!isMainBot(hisoka)) return;
	if (!m.isOwner) return;
	try {
		if (!query) { await tolak(hisoka, m, 'Mohon masukkan nomor yang ingin dihapus.\n\nContoh:\n.delowner 6289667923162'); return; }
		const cleanNumber = query.replace(/[\s\-\+\(\)]/g, '').replace(/^0/, '62');
		const config = loadConfig();
		const owners = config.owners || [];
		if (!owners.includes(cleanNumber)) { await tolak(hisoka, m, `Nomor ${cleanNumber} tidak terdaftar sebagai owner, Kak.`); return; }
		if (owners.length <= 1) { await tolak(hisoka, m, 'Tidak bisa menghapus owner terakhir, Kak. Minimal harus ada 1 owner.'); return; }
		const newOwners = owners.filter(o => o !== cleanNumber);
		config.owners = newOwners;
		saveConfig(config);
		await tolak(hisoka, m, `✅ Berhasil menghapus owner!\n\n📞 Nomor: ${cleanNumber}\n👥 Sisa Owner: ${newOwners.length}`);
		logCommand(m, hisoka, 'delowner');
	} catch (error) {
		console.error('\x1b[31m[DelOwner] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
	}
}

async function handleOwn({ hisoka, m, tolak, logCommand, loadConfig }) {
	if (!m.prefix && m.query) return;
	try {
		const config = loadConfig();
		const owners = config.owners || [];
		if (!owners.length) { await tolak(hisoka, m, 'Belum ada owner yang terdaftar.'); return; }
		let text = `╭═══『 *DAFTAR OWNER* 』═══╮\n│\n│ 👥 *Total:* ${owners.length} owner\n│\n`;
		owners.forEach((owner, index) => { text += `│ ${index + 1}. 📞 ${owner}\n`; });
		text += `│\n╰═════════════════════╯\n\n*Command:*\n.addowner <nomor> - Tambah owner\n.delowner <nomor> - Hapus owner`;
		await tolak(hisoka, m, text);
		logCommand(m, hisoka, 'listowner');
	} catch (error) {
		console.error('\x1b[31m[ListOwner] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan: ${error.message}`);
	}
}

async function handleRam({ hisoka, m, tolak, logCommand }) {
	if (!m.prefix && m.query) return;
	try {
		const { formatBytes, getCurrentMemoryUsage, getSystemMemoryInfo } = await import('../helper/memoryMonitor.js');
		const memUsage  = getCurrentMemoryUsage();
		const systemMem = getSystemMemoryInfo();
		const memLimit  = global.memoryMonitor?.memoryLimit || systemMem.total;
		const percentage       = ((memUsage.rss / memLimit) * 100).toFixed(1);
		const systemPercentage = ((systemMem.used / systemMem.total) * 100).toFixed(1);
		let text = `╭═══『 *RAM STATUS* 』═══╮\n│\n│ *Process Memory*\n│ ${formatBytes(memUsage.rss)} / ${formatBytes(memLimit)}\n│ Usage: ${percentage}%\n│\n│ *System Memory*\n│ ${formatBytes(systemMem.used)} / ${formatBytes(systemMem.total)}\n│ Usage: ${systemPercentage}%\n│\n╰═════════════════════╯`;
		await tolak(hisoka, m, text);
		logCommand(m, hisoka, 'cekram');
	} catch (error) {
		console.error('\x1b[31m[CekRAM] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleAddowner, handleDelowner, handleOwn, handleRam };
