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
 *  setlogsw.cjs — Set tema warna latar belakang log SW
 *  Perintah .setlogsw untuk mengubah warna background kotak log AutoReadStoryWhatsApp
 *  Tersedia 45 warna + mode Random. Picker interaktif via Button (addReply + addSelection).
 * ───────────────────────────────
 */
'use strict';

const fs   = require('fs');
const path = require('path');

const CONFIG_PATH = path.join(process.cwd(), 'config.json');

// ── Tema & warna diambil dari satu file terpusat ──────────────────────────────
const { LOGSW_THEMES, LOGSW_THEME_KEYS: THEME_KEYS } = require(
    path.join(process.cwd(), 'src', 'config', 'logsw-colors.cjs')
);

// ── Kelompok warna untuk section pada selection list ──────────────────────────
const G_STANDAR = ['merah','hijau','biru','kuning','ungu','cyan','putih','hitam'];
const G_CERAH   = ['merah_cerah','hijau_cerah','biru_cerah','kuning_cerah','pink','cyan_cerah','abu'];
const G_256     = ['oranye','emas','toska','navy','coklat','lime','maroon','ungu_tua','salmon','lavender','mint','bata','gelap','neon'];
const G_PREMIUM = ['fuchsia','indigo','turquoise','coral','violet','amber','emerald','langit','lila','orchid','peach','cobalt','crimson','rose','periwinkle'];

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

    // ── Tanpa argumen → tampil picker interaktif ───────────────────────────────
    if (!arg) {
        const totalWarna = THEME_KEYS.length - 1; // tidak hitung 'random'

        const bodyTeks =
            `『 🎨 』 *S E T  L O G  S W*\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
            `✦ *Tema Aktif :* ${curInfo.emoji} ${curInfo.label}\n\n` +
            `✦ Pilih warna latar belakang kotak\n` +
            `   log *AutoReadStoryWhatsApp*\n` +
            `✦ Berlaku realtime setelah dipilih\n\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `🎯 Standar  : *${G_STANDAR.length}* tema\n` +
            `✨ Cerah    : *${G_CERAH.length}* tema\n` +
            `🌈 Ekstra   : *${G_256.length}* tema\n` +
            `💎 Premium  : *${G_PREMIUM.length}* tema\n` +
            `🎲 Special  : Random & Default\n` +
            `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
            `Total *${totalWarna}* pilihan warna tersedia`;

        let sent = false;
        try {
            const btn = new Button()
                .setBody(bodyTeks)
                .setFooter(`⚡ Wily Bot • Set Log SW`)
                .addReply(`🎲 Random`, `${pref}setlogsw random`)
                .addReply(`🔵 Reset Default`, `${pref}setlogsw default`)
                .addSelection(`🎨 Pilih Warna Tema`)
                // ── Standar ──────────────────────────────────────────────────
                .makeSections(`🎯 Standar (${G_STANDAR.length} tema)`);

            for (const k of G_STANDAR) {
                const t   = LOGSW_THEMES[k];
                const tag = k === curTheme ? '✓ Aktif' : t.emoji;
                btn.makeRow(tag, t.label, `Latar belakang ${t.label}`, `${pref}setlogsw ${k}`);
            }

            // ── Cerah ─────────────────────────────────────────────────────
            btn.makeSections(`✨ Cerah — Bright (${G_CERAH.length} tema)`);
            for (const k of G_CERAH) {
                const t   = LOGSW_THEMES[k];
                const tag = k === curTheme ? '✓ Aktif' : t.emoji;
                btn.makeRow(tag, t.label, `Latar belakang ${t.label}`, `${pref}setlogsw ${k}`);
            }

            // ── Ekstra 256-warna ──────────────────────────────────────────
            btn.makeSections(`🌈 Ekstra — 256 Warna (${G_256.length} tema)`);
            for (const k of G_256) {
                const t   = LOGSW_THEMES[k];
                const tag = k === curTheme ? '✓ Aktif' : t.emoji;
                btn.makeRow(tag, t.label, `Latar belakang ${t.label}`, `${pref}setlogsw ${k}`);
            }

            // ── Premium ───────────────────────────────────────────────────
            btn.makeSections(`💎 Premium — Koleksi Cantik (${G_PREMIUM.length} tema)`);
            for (const k of G_PREMIUM) {
                const t   = LOGSW_THEMES[k];
                const tag = k === curTheme ? '✓ Aktif' : t.emoji;
                btn.makeRow(tag, t.label, `Latar belakang ${t.label}`, `${pref}setlogsw ${k}`);
            }

            await btn.run(m.from, hisoka, m);
            sent = true;
        } catch (_) {}

        // fallback teks biasa kalau Button gagal
        if (!sent) {
            const _grp = (keys) => keys
                .map(k => {
                    const t = LOGSW_THEMES[k];
                    const aktif = k === curTheme ? ' ✓' : '';
                    return `${t.emoji} \`${k}\`${aktif}`;
                })
                .join('  ');

            await m.reply(
                `🎨 *Set Tema Warna Log SW*\n\n` +
                `Aktif: ${curInfo.emoji} *${curInfo.label}*\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `*🎯 Standar:*\n${_grp(G_STANDAR)}\n\n` +
                `*✨ Cerah (Bright):*\n${_grp(G_CERAH)}\n\n` +
                `*🌈 Ekstra (256-warna):*\n${_grp(G_256)}\n\n` +
                `*💎 Premium:*\n${_grp(G_PREMIUM)}\n\n` +
                `*🎲 Special:* \`random\`  🔵 \`default\`\n` +
                `━━━━━━━━━━━━━━━━━\n` +
                `\`${pref}setlogsw [nama]\` — pilih warna\n` +
                `\`${pref}setlogsw default\` — reset bawaan\n\n` +
                `_Warna latar belakang terlihat di panel Pterodactyl_`
            );
        }

        logCommand(m, hisoka, 'setlogsw');
        return;
    }

    // ── Validasi nama tema ──────────────────────────────────────────────────────
    if (!LOGSW_THEMES[arg]) {
        return tolak(hisoka, m,
            `❌ *Tema tidak dikenal:* \`${arg}\`\n\n` +
            `Ketik \`${pref}setlogsw\` untuk tampilkan picker lengkap.\n\n` +
            `Tersedia: ${THEME_KEYS.map(k => `${LOGSW_THEMES[k].emoji}\`${k}\``).join(' ')}`
        );
    }

    // ── Sudah aktif ────────────────────────────────────────────────────────────
    if (arg === curTheme) {
        let sent = false;
        try {
            const btn = new Button()
                .setBody(
                    `ℹ️ *Tema sudah aktif!*\n\n` +
                    `${curInfo.emoji} *${curInfo.label}* sedang digunakan.\n\n` +
                    `Pilih tema lain atau buka picker lengkap.`
                )
                .setFooter(`⚡ Wily Bot • Set Log SW`)
                .addReply(`🎨 Buka Picker Lengkap`, `${pref}setlogsw`)
                .addReply(`🎲 Coba Random`, `${pref}setlogsw random`);
            await btn.run(m.from, hisoka, m);
            sent = true;
        } catch (_) {}
        if (!sent) await m.reply(
            `ℹ️ Tema *${curInfo.emoji} ${curInfo.label}* sudah aktif.\n\n` +
            `_Ketik \`${pref}setlogsw\` untuk lihat semua pilihan._`
        );
        return;
    }

    // ── Simpan & konfirmasi ────────────────────────────────────────────────────
    _setTheme(arg);
    const info = LOGSW_THEMES[arg];

    let sent = false;
    try {
        const btn = new Button()
            .setBody(
                `✅ *Tema Log SW Diubah!*\n\n` +
                `${curInfo.emoji} ~~${curInfo.label}~~\n` +
                `       ↓\n` +
                `${info.emoji} *${info.label}*\n\n` +
                `Log berikutnya akan tampil dengan\n` +
                `latar belakang *${info.label}* di panel Pterodactyl.`
            )
            .setFooter(`⚡ Wily Bot • Set Log SW`)
            .addReply(`🔄 Ganti Lagi`, `${pref}setlogsw`)
            .addReply(`🔵 Reset Default`, `${pref}setlogsw default`);
        await btn.run(m.from, hisoka, m);
        sent = true;
    } catch (_) {}

    if (!sent) await m.reply(
        `✅ *Tema Log SW diubah!*\n\n` +
        `${curInfo.emoji} ~~${curInfo.label}~~ → ${info.emoji} *${info.label}*\n\n` +
        `_Log SW berikutnya akan tampil dengan latar belakang baru._`
    );

    logCommand(m, hisoka, 'setlogsw');
}

module.exports = { handleSetlogsw };
