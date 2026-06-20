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
 *  setgoodbye.cjs — Set goodbye message handler
 *  Perintah atur pesan selamat tinggal saat anggota keluar dari grup
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Set Goodbye Message Handler
 *  Perintah .goodbye untuk atur/aktifkan pesan perpisahan
 *  otomatis saat anggota keluar atau dikick dari grup —
 *  mendukung variabel nama dan nomor anggota.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleSetgoodbye({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, sendConfirmWithButtons, saveCekautoTimestamp, fs, path }) {
        if (!m.isGroup) return tolak(hisoka, m, '❌ Fitur ini hanya bisa digunakan di dalam grup!');
        if (!m.isAdmin && !m.isOwner) return tolak(hisoka, m, '❌ Hanya admin grup atau owner bot yang bisa menggunakan perintah ini!');

        const isWelcomeCmd = m.command === 'welcome' || m.command === 'setwelcome';
        const featureName = isWelcomeCmd ? 'Welcome' : 'Goodbye';
        const featureKey  = isWelcomeCmd ? 'welcome' : 'goodbye';
        const arg = (query || '').trim().toLowerCase();

        const cfgPath = path.join(process.cwd(), 'config.json');
        const cfg = loadConfig();
        if (!cfg.welcomeGoodbye) cfg.welcomeGoodbye = { enabled: true, groups: {} };
        if (!cfg.welcomeGoodbye.groups) cfg.welcomeGoodbye.groups = {};
        if (!cfg.welcomeGoodbye.groups[m.from]) cfg.welcomeGoodbye.groups[m.from] = {};

        if (!cfg.welcomeGoodbye.enabled) {
                return tolak(hisoka, m, `❌ Fitur Welcome/Goodbye dinonaktifkan secara global.\nUbah *welcomeGoodbye.enabled* di config.json menjadi *true*.`);
        }

        if (arg === 'on') {
                cfg.welcomeGoodbye.groups[m.from][featureKey] = true;
                fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 4));
                saveCekautoTimestamp(featureKey, m.from);
                await sendConfirmWithButtons(hisoka, m,
                        `╭───〔 *✅ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                        `│\n` +
                        `│ 🟢 *Fitur ${featureName} Card AKTIF!*\n` +
                        `│\n` +
                        `│ 🖼️ Bot akan otomatis kirim gambar canvas\n` +
                        `│    saat ada anggota ${isWelcomeCmd ? 'bergabung' : 'keluar'} di grup ini.\n` +
                        `│\n` +
                        `│ 💡 Nonaktifkan: *.${featureKey} off*\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`,
                        [{ text: '➕ Aktifkan Semua Grup', id: `__addallgrp__${featureKey}` }]
                );
                logCommand(m, hisoka, `set${featureKey} on`);
        } else if (arg === 'off') {
                cfg.welcomeGoodbye.groups[m.from][featureKey] = false;
                fs.writeFileSync(cfgPath, JSON.stringify(cfg, null, 4));
                await tolak(hisoka, m,
                        `╭───〔 *❌ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                        `│\n` +
                        `│ 🔴 *Fitur ${featureName} Card NONAKTIF!*\n` +
                        `│\n` +
                        `│ Bot tidak akan kirim gambar canvas\n` +
                        `│    di grup ini.\n` +
                        `│\n` +
                        `│ 💡 Aktifkan: *.${featureKey} on*\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
                logCommand(m, hisoka, `set${featureKey} off`);
        } else {
                const isOn = cfg.welcomeGoodbye.groups[m.from]?.[featureKey] === true;
                const globalOn = cfg.welcomeGoodbye.enabled;
                await tolak(hisoka, m,
                        `╭───〔 *ℹ️ ${featureName.toUpperCase()} CARD* 〕───╮\n` +
                        `│\n` +
                        `│ 🌐 Global   : ${globalOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                        `│ 📌 Grup ini : ${isOn ? '🟢 Aktif' : '🔴 Nonaktif'}\n` +
                        `│\n` +
                        `│ 🖼️ Mengirim gambar canvas keren saat\n` +
                        `│    anggota ${isWelcomeCmd ? 'bergabung' : 'keluar'} dari grup ini.\n` +
                        `│\n` +
                        `│ 📋 Cara penggunaan:\n` +
                        `│ • *.${featureKey} on*  → Aktifkan\n` +
                        `│ • *.${featureKey} off* → Nonaktifkan\n` +
                        `│\n` +
                        `╰────────────────────────────────────╯`
                );
        }
}

module.exports = { handleSetgoodbye };
