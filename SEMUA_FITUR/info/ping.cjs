/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  ping.cjs — .ping realtime (latency WA + status bot)
 * ───────────────────────────────
 */
'use strict';

const BULAN = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];

function greetingNow() {
        const jamNum = parseInt(
                new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', hour12: false }).format(new Date()),
                10
        );
        if (jamNum >= 4 && jamNum < 11)  return { t: 'Pagi',  e: '🌤️' };
        if (jamNum >= 11 && jamNum < 15) return { t: 'Siang', e: '☀️' };
        if (jamNum >= 15 && jamNum < 19) return { t: 'Sore',  e: '🌇' };
        return                                  { t: 'Malam', e: '🌙' };
}

function labelWaLatency(ms) {
        if (ms == null)  return { e: '❓', t: 'Tidak Diketahui' };
        if (ms < 100)    return { e: '🚀', t: 'Sangat Cepat' };
        if (ms < 500)    return { e: '⚡', t: 'Normal' };
        if (ms < 2000)   return { e: '🟡', t: 'Agak Lambat' };
        return                   { e: '🐢', t: 'Lambat' };
}

function fmtDurasi(ms) {
        const totalSec = Math.floor(ms / 1000);
        const d   = Math.floor(totalSec / 86400);
        const h   = Math.floor((totalSec % 86400) / 3600);
        const mnt = Math.floor((totalSec % 3600) / 60);
        return `${d}d ${h}h ${mnt}m`;
}

// ─────────────────────────────────────────────────────────────────────────────
//  HANDLER: .ping
// ─────────────────────────────────────────────────────────────────────────────

async function handlePing({ hisoka, m, tolak, logCommand, getBotStats, os }) {
        try {
                const waLatency = Math.abs(Date.now() - m.messageTimestamp * 1000);
                const speedLbl  = labelWaLatency(waLatency);
                const greet     = greetingNow();

                const now  = new Date();
                const jam  = new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false,
                }).format(now).replace(':', '.');

                const tglParts = new Intl.DateTimeFormat('id-ID', {
                        timeZone: 'Asia/Jakarta', day: 'numeric', month: 'numeric', year: 'numeric',
                }).formatToParts(now);
                const dayNum   = tglParts.find(p => p.type === 'day')?.value || '-';
                const monthNum = parseInt(tglParts.find(p => p.type === 'month')?.value, 10);
                const yearNum  = tglParts.find(p => p.type === 'year')?.value || '-';
                const tgl      = `${dayNum} ${BULAN[monthNum - 1] || '-'} ${yearNum}`;

                const stats   = getBotStats();
                const uptime  = fmtDurasi(stats.currentUptime || 0);
                const session = fmtDurasi(process.uptime() * 1000);
                const restart = `${stats.totalRestarts || 0}x`;

                const cpuCore  = os.cpus().length;
                const totalMem = os.totalmem();
                const freeMem  = os.freemem();
                const usedGB   = (totalMem - freeMem) / (1024 ** 3);
                const totalGB  = totalMem / (1024 ** 3);
                const ramPct   = totalGB > 0 ? Math.round((usedGB / totalGB) * 100) : 0;
                const botMemMB = (process.memoryUsage().rss / (1024 * 1024)).toFixed(2);

                const teks =
                        `╭═════════════════════╮\n` +
                        `║        🏓 PONG! 🏓        \n` +
                        `├═════════════════════┤\n` +
                        `│ 👋 Selamat  » ${greet.t} ${greet.e}\n` +
                        `│ ${speedLbl.e} Speed  » ${speedLbl.t}\n` +
                        `│ ⚡ Latency  » ${waLatency}ms\n` +
                        `│ 🕐 Waktu  » ${jam}\n` +
                        `│ 📅 Tanggal  » ${tgl}\n` +
                        `├═════════════════════┤\n` +
                        `║        📊 BOT STATUS        \n` +
                        `├═════════════════════┤\n` +
                        `│ ⏱️ Uptime  » ${uptime}\n` +
                        `│ 🔄 Session  » ${session}\n` +
                        `│ 🔁 Restart  » ${restart}\n` +
                        `│ 🟢 Status  » Online\n` +
                        `├═════════════════════┤\n` +
                        `║        💻 SYSTEM INFO        \n` +
                        `├═════════════════════┤\n` +
                        `│ 🧠 CPU  » ${cpuCore} Core\n` +
                        `│ 📟 RAM  » ${usedGB.toFixed(1)}/${totalGB.toFixed(1)}GB (${ramPct}%)\n` +
                        `│ 💾 Bot Mem  » ${botMemMB}MB\n` +
                        `│ 🖥️ Platform  » ${os.platform()}\n` +
                        `│ 📦 NodeJS  » ${process.version}\n` +
                        `╰═════════════════════╯`;

                await tolak(hisoka, m, teks);
                logCommand(m, hisoka, m.command || 'ping');
        } catch (err) {
                console.error('\x1b[31m[ping] Error:\x1b[39m', err.message);
                await tolak(hisoka, m, `❌ *Ping gagal*\n\`${err.message}\``);
        }
}

module.exports = { handlePing };
