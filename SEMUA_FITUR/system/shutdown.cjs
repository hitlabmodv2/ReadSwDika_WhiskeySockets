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

const CONFIRM_TIMEOUT_MS = 30_000; // 30 detik

async function handleRb({ hisoka, m, tolak, logCommand, Button, pendingShutdownConfirm }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa merestart bot!');

        // Bersihkan pending lama milik sender ini (kalau ada)
        const _old = pendingShutdownConfirm.get(m.sender);
        if (_old?.timeout) clearTimeout(_old.timeout);

        const _bodyText =
                `╔══════════════════════╗\n` +
                `║  🔄  *K O N F I R M A S I*  ║\n` +
                `╚══════════════════════╝\n\n` +
                `⚠️ *Yakin ingin merestart bot?*\n\n` +
                `📌 Bot akan direstart otomatis.\n` +
                `ℹ️ Semua jadibot aktif tetap berjalan.\n` +
                `Bot akan kembali online dalam ~10 detik.\n\n` +
                `⚙️ Diminta oleh: @${m.sender.split('@')[0]}\n` +
                `🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                `> ⏳ _Konfirmasi dalam 30 detik atau otomatis batal._`;

        let botMsgId = null;
        try {
                const _btn = new Button()
                        .setBody(_bodyText)
                        .setFooter('⚡ Wily Bot • Restart')
                        .addReply('✅ Ya, Restart Bot', '__restart_yes__')
                        .addReply('❌ Tidak, Batal', '__restart_no__');
                const _sent = await _btn.run(m.from, hisoka, m);
                botMsgId = _sent?.key?.id || null;
        } catch (_) {
                // Fallback teks jika Button tidak didukung
                await tolak(hisoka, m,
                        _bodyText + `\n\n` +
                        `✅ Balas \`ya\` untuk restart\n` +
                        `❌ Balas \`tidak\` untuk batal`
                );
        }

        const _timeout = setTimeout(() => {
                pendingShutdownConfirm.delete(m.sender);
        }, CONFIRM_TIMEOUT_MS);

        pendingShutdownConfirm.set(m.sender, {
                type: 'restart',
                expiresAt: Date.now() + CONFIRM_TIMEOUT_MS,
                timeout: _timeout,
                botMsgId,
        });

        logCommand(m, hisoka, m.command || 'restart');
}

module.exports.handleRb = handleRb;
