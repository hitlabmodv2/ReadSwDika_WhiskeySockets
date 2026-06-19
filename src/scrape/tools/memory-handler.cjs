'use strict';

function msToTime(ms) {
	const s = Math.floor(ms / 1000);
	const m = Math.floor(s / 60);
	const h = Math.floor(m / 60);
	const d = Math.floor(h / 24);
	if (d > 0) return `${d}d ${h % 24}h ${m % 60}m`;
	if (h > 0) return `${h}h ${m % 60}m ${s % 60}s`;
	if (m > 0) return `${m}m ${s % 60}s`;
	return `${s}s`;
}

async function handleMemory({ hisoka, m, tolak, logCommand }) {
	if (!m.prefix && m.query) return;
	try {
		const memMonitor = global.memoryMonitor;
		if (!memMonitor) { await tolak(hisoka, m, 'Memory monitor tidak tersedia.'); return; }
		const status = memMonitor.getStatus();
		const uptime = process.uptime();
		let text = `╭═══『 *💾 MEMORY STATUS* 』═══╮\n`;
		text += `│\n│ *📊 Process Memory*\n│ • Current: ${status.currentFormatted}\n│ • Limit: ${status.limitFormatted}\n│ • Usage: ${status.percentage}%\n│\n`;
		text += `│ *🔧 Heap Memory*\n│ • Total: ${status.heap.totalFormatted}\n│ • Used: ${status.heap.usedFormatted}\n│\n`;
		text += `│ *🖥️ System Memory (Server)*\n│ • Total: ${status.system.totalFormatted}\n│ • Used: ${status.system.usedFormatted}\n│ • Free: ${status.system.freeFormatted}\n│\n`;
		text += `│ *⚙️ Monitor Config*\n│ • Enabled: ${status.enabled ? '✅ Yes' : '❌ No'}\n│ • Auto Detect: ${status.autoDetect ? '✅ ' + status.autoDetectPercentage + '%' : '❌ Manual'}\n│ • Check Interval: ${status.checkInterval / 1000}s\n│ • Log Usage: ${status.logUsage ? '✅ Yes' : '❌ No'}\n│ • Uptime: ${msToTime(uptime * 1000)}\n│\n`;
		text += `╰═════════════════════╯`;
		if (parseFloat(status.percentage) >= 80) text += `\n\n⚠️ *Warning:* Memory usage tinggi! Auto-restart akan terjadi jika mencapai limit.`;
		await tolak(hisoka, m, text);
		logCommand(m, hisoka, 'memory');
	} catch (error) {
		console.error('\x1b[31m[Memory] Error:\x1b[39m', error.message);
		await tolak(hisoka, m, `Error: ${error.message}`);
	}
}

module.exports = { handleMemory };
