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
 *  setlogsw.cjs — Set tema warna log SW
 *  Perintah .setlogsw untuk mengubah warna latar/tema tampilan log AutoReadStoryWhatsApp
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Set Log SW Theme (.setlogsw)
 *  Ubah tema warna kotak log AutoReadStoryWhatsApp & jadibot —
 *  tersedia 8 warna + mode Random. Pilih via button picker atau
 *  langsung ketik nama tema.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// ── Tema & warna diambil dari satu file terpusat ──────────────────────────────
const { LOGSW_THEMES, LOGSW_THEME_KEYS: THEME_KEYS } = require(path.join(process.cwd(), 'src', 'config', 'logsw-colors.cjs'));

// ── Config helpers ─────────────────────────────────────────────────────────────

function _loadConfig() {
    try { return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8')); } catch { return {}; }
}

function _saveConfig(cfg) {
    fs.writeFileSync(CONFIG_PATH, JSON.stringify(cfg, null, 2), 'utf-8');
}

function _getTheme() {
    try { return _loadConfig()?.logsw?.theme || 'default'; } catch { return 'default'; }
}

function _setTheme(name) {
    const cfg = _loadConfig();
    if (!cfg.logsw) cfg.logsw = {};
    cfg.logsw.theme = name;
    _saveConfig(cfg);
}

// ── Handler ────────────────────────────────────────────────────────────────────

async function handleSetlogsw({ hisoka, m, query, tolak, logCommand, Button }) {
    // Hanya bot utama (bukan jadibot) yang boleh mengubah tema log
    if (hisoka?.isMainBot === false) return;
    if (!m.isOwner) return;

    const pref     = m.prefix || '.';
    const arg      = (query || '').trim().toLowerCase();
    const curTheme = _getTheme();
    const curInfo  = LOGSW_THEMES[curTheme] || LOGSW_THEMES.default;

    // ── Tanpa argumen → tampil picker ──────────────────────────────────────────
    if (!arg) {
        const _grp = (keys) => keys
            .map(k => {
                if (!LOGSW_THEMES[k]) return null;
                const t = LOGSW_THEMES[k];
                const aktif = k === curTheme ? ' ✓' : '';
                return `${t.emoji} \`${k}\`${aktif}`;
            })
            .filter(Boolean)
            .join('  ');

        const G_STANDAR = ['default','merah','hijau','biru','kuning','ungu','cyan','putih','hitam'];
        const G_CERAH   = ['merah_cerah','hijau_cerah','biru_cerah','kuning_cerah','pink','cyan_cerah','abu'];
        const G_256     = ['oranye','emas','toska','navy','coklat','lime','maroon','ungu_tua','salmon','lavender','mint','bata','gelap','neon'];

        const bodyTeks =
            `🎨 *Set Tema Warna Log SW*\n\n` +
            `Aktif: ${curInfo.emoji} *${curInfo.label}*\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `*🎯 Standar:*\n${_grp(G_STANDAR)}\n\n` +
            `*✨ Cerah (Bright):*\n${_grp(G_CERAH)}\n\n` +
            `*🌈 Ekstra (256-warna):*\n${_grp(G_256)}\n\n` +
            `*🎲 Special:* \`random\`\n` +
            `━━━━━━━━━━━━━━━━━\n` +
            `Cara pakai:\n` +
            `\`${pref}setlogsw [nama]\`\n` +
            `\`${pref}setlogsw default\` → reset bawaan\n\n` +
            `_Warna latar belakang terlihat di panel Pterodactyl_`;

        let sent = false;
        try {
            const btn = new Button().setBody(bodyTeks);
            for (const [k, t] of Object.entries(LOGSW_THEMES)) {
                btn.addReply(`${t.emoji} ${t.label}`, `${pref}setlogsw ${k}`);
            }
            await btn.run(m.from, hisoka, { quoted: m });
            sent = true;
        } catch (_) {}
        if (!sent) await m.reply(bodyTeks);

        logCommand(m, hisoka, 'setlogsw');
        return;
    }

    // ── Validasi nama tema ──────────────────────────────────────────────────────
    if (!LOGSW_THEMES[arg]) {
        const allKeys = THEME_KEYS.map(k => `${LOGSW_THEMES[k].emoji}\`${k}\``).join(' ');
        return tolak(hisoka, m,
            `❌ *Tema tidak dikenal:* \`${arg}\`\n\n` +
            `Ketik \`${pref}setlogsw\` untuk lihat semua pilihan.\n\n` +
            `Tersedia: ${allKeys}`
        );
    }

    // ── Sudah aktif ────────────────────────────────────────────────────────────
    if (arg === curTheme) {
        return m.reply(
            `ℹ️ Tema *${curInfo.emoji} ${curInfo.label}* sudah aktif saat ini.\n\n` +
            `_Ketik \`${pref}setlogsw\` untuk lihat semua pilihan._`
        );
    }

    // ── Simpan & balas ─────────────────────────────────────────────────────────
    _setTheme(arg);
    const info = LOGSW_THEMES[arg];
    await m.reply(
        `✅ *Tema Log SW diubah!*\n\n` +
        `${curInfo.emoji} ~~${curInfo.label}~~ → ${info.emoji} *${info.label}*\n\n` +
        `_Log SW berikutnya (bot utama & semua jadibot) akan tampil dengan tema baru._`
    );
    logCommand(m, hisoka, 'setlogsw');
}

module.exports = { handleSetlogsw };
