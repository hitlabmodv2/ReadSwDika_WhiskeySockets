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
 *  eval-cmd.cjs — Eval & bash command handler
 *  Perintah .eval dan .bash untuk eksekusi kode JavaScript/shell (owner only)
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Eval & Bash Command Handler (Owner Only)
 *  Perintah .eval untuk run kode JavaScript langsung di bot
 *  dan .bash untuk eksekusi perintah shell/terminal — hanya
 *  bisa digunakan oleh owner bot.
 * ═══════════════════════════════════════════════════════════════
 */
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
