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
 *  mati-cmd.cjs — Shutdown command handler
 *  Perintah .mati untuk matikan atau restart proses bot (owner only)
 * ───────────────────────────────
 */
'use strict';

const CONFIRM_TIMEOUT_MS = 30_000; // 30 detik

async function handleMati({ hisoka, m, tolak, logCommand, Button, pendingShutdownConfirm }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa mematikan bot!');

        // Bersihkan pending lama milik sender ini (kalau ada)
        const _old = pendingShutdownConfirm.get(m.sender);
        if (_old?.timeout) clearTimeout(_old.timeout);

        const _bodyText =
                `╔══════════════════════╗\n` +
                `║  ⛔  *K O N F I R M A S I*  ║\n` +
                `╚══════════════════════╝\n\n` +
                `⚠️ *Yakin ingin mematikan bot?*\n\n` +
                `📌 Bot akan berhenti total.\n` +
                `ℹ️ Untuk aktifkan kembali, jalankan\n` +
                `ulang secara manual dari Replit.\n\n` +
                `⚙️ Diminta oleh: @${m.sender.split('@')[0]}\n` +
                `🕐 Waktu: ${new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })}\n\n` +
                `> ⏳ _Konfirmasi dalam 30 detik atau otomatis batal._`;

        let botMsgId = null;
        try {
                const _btn = new Button()
                        .setBody(_bodyText)
                        .setFooter('⚡ Wily Bot • Shutdown')
                        .addReply('✅ Ya, Matikan Bot', '__mati_yes__')
                        .addReply('❌ Tidak, Batal', '__mati_no__');
                const _sent = await _btn.run(m.from, hisoka, m);
                botMsgId = _sent?.key?.id || null;
        } catch (_) {
                // Fallback teks jika Button tidak didukung
                await tolak(hisoka, m,
                        _bodyText + `\n\n` +
                        `✅ Balas \`ya\` untuk matikan\n` +
                        `❌ Balas \`tidak\` untuk batal`
                );
        }

        const _timeout = setTimeout(() => {
                pendingShutdownConfirm.delete(m.sender);
        }, CONFIRM_TIMEOUT_MS);

        pendingShutdownConfirm.set(m.sender, {
                type: 'mati',
                expiresAt: Date.now() + CONFIRM_TIMEOUT_MS,
                timeout: _timeout,
                botMsgId,
        });

        logCommand(m, hisoka, 'mati');
}

module.exports = { handleMati };
