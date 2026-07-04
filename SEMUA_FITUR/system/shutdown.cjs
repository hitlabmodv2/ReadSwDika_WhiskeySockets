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
 *  shutdown.cjs — Shutdown & restart bot
 *  Handle command .mati/.restart, kirim notif sebelum exit
 * ───────────────────────────────
 */
'use strict';

/**
 * ─────────────────────────────────────
 *  Shutdown & Restart Handler
 *  Hanya bisa dipanggil oleh Owner
 * ─────────────────────────────────────
 *
 *  shutdownBot(delay)
 *    → Matikan bot sepenuhnya (process.exit 0)
 *    → Command: .mati / .shutdown / .matiin
 *
 *  restartBot(delay)
 *    → Restart bot via PM2 autorestart (process.exit 1)
 *    → Command: .restart / .rebot / .rb
 * ─────────────────────────────────────
 */

/**
 * Matikan bot sepenuhnya.
 * PM2 TIDAK akan restart karena exit code 0.
 * @param {number} delay - delay dalam ms sebelum shutdown (default 2000)
 */
function shutdownBot(delay = 2000) {
    setTimeout(() => {
        process.exit(0);
    }, delay);
}

/**
 * Restart bot secara otomatis via PM2.
 * PM2 akan restart karena exit code 1 (non-zero).
 * @param {number} delay - delay dalam ms sebelum restart (default 2000)
 */
function restartBot(delay = 2000) {
    setTimeout(() => {
        process.exit(1);
    }, delay);
}

module.exports = { shutdownBot, restartBot };

// ── HANDLER: rb (restart bot) ─────────────────────────────────────────────────

async function handleRb({ hisoka, m, tolak, logCommand }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa merestart bot!');
        const _rstSent = await hisoka.sendMessage(m.from, {
                text:
                        `╔══════════════════════╗\n║  🔄  *R E S T A R T*  ║\n╚══════════════════════╝\n\n` +
                        `♻️ Bot akan direstart sekarang!\n\n` +
                        `⚙️ Direstart oleh: @${m.sender.split('@')[0]}\n` +
                        `🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                        `⏳ Menunggu bot online kembali...`,
                mentions: [m.sender]
        }, { quoted: m });
        try {
                const { kvSet: _rstKvSet } = await import('../../src/db/datadb.js');
                _rstKvSet('system/restart_notify', { from: m.from, key: _rstSent?.key || null, by: m.sender, time: Date.now() });
        } catch (_) {}
        logCommand(m, hisoka, m.command || 'restart');
        restartBot(2000);
}

module.exports.handleRb = handleRb;
