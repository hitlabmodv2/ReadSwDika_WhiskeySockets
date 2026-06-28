/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  logsw-colors.cjs — Definisi warna tema log SW
 *  File terpusat untuk semua warna ANSI & info tema .setlogsw
 *  Dipakai oleh: src/helper/swtrack.js & SEMUA_FITUR/setting/setlogsw.cjs
 *
 *  FORMAT WARNA: '\x1b[BG_CODE m\x1b[TEXT_CODE m'
 *    BG standar  : 40–47 (gelap), 100–107 (cerah/bright)
 *    BG 256-warna: \x1b[48;5;N m  (N = 0–255)
 *    Teks putih  : \x1b[97m   Teks hitam: \x1b[30m
 * ───────────────────────────────
 */
'use strict';

// ─────────────────────────────────────────────────────────────────────────────
//  LOGSW_ANSI — Warna latar belakang (background) + teks kontras
//  Format: '\x1b[<bg>m\x1b[<fg>m'  |  terlihat jelas di panel Pterodactyl
// ─────────────────────────────────────────────────────────────────────────────
const LOGSW_ANSI = {

    // ── No background (default lama, teks saja) ──────────────────────────────
    default      : '\x1b[36m',                        // Cyan teks — bawaan

    // ── Background standar ANSI (support semua panel/terminal) ───────────────
    merah        : '\x1b[41m\x1b[97m',               // Merah BG  + teks putih
    hijau        : '\x1b[42m\x1b[30m',               // Hijau BG  + teks hitam
    biru         : '\x1b[44m\x1b[97m',               // Biru  BG  + teks putih
    kuning       : '\x1b[43m\x1b[30m',               // Kuning BG + teks hitam
    ungu         : '\x1b[45m\x1b[97m',               // Ungu  BG  + teks putih
    cyan         : '\x1b[46m\x1b[30m',               // Cyan  BG  + teks hitam
    putih        : '\x1b[47m\x1b[30m',               // Putih BG  + teks hitam
    hitam        : '\x1b[40m\x1b[97m',               // Hitam BG  + teks putih

    // ── Background cerah/bright ANSI ─────────────────────────────────────────
    merah_cerah  : '\x1b[101m\x1b[30m',              // Merah cerah BG  + teks hitam
    hijau_cerah  : '\x1b[102m\x1b[30m',              // Hijau cerah BG  + teks hitam
    biru_cerah   : '\x1b[104m\x1b[97m',              // Biru cerah  BG  + teks putih
    kuning_cerah : '\x1b[103m\x1b[30m',              // Kuning cerah BG + teks hitam
    pink         : '\x1b[105m\x1b[30m',              // Pink/Magenta BG + teks hitam
    cyan_cerah   : '\x1b[106m\x1b[30m',              // Cyan cerah   BG + teks hitam
    abu          : '\x1b[100m\x1b[97m',              // Abu-abu gelap BG + teks putih

    // ── Background 256-warna (didukung Pterodactyl & semua terminal modern) ──
    oranye       : '\x1b[48;5;208m\x1b[30m',         // Oranye      BG + teks hitam
    emas         : '\x1b[48;5;220m\x1b[30m',         // Emas/Gold   BG + teks hitam
    toska        : '\x1b[48;5;43m\x1b[30m',          // Toska/Teal  BG + teks hitam
    navy         : '\x1b[48;5;17m\x1b[97m',          // Navy Blue   BG + teks putih
    coklat       : '\x1b[48;5;130m\x1b[97m',         // Coklat      BG + teks putih
    lime         : '\x1b[48;5;154m\x1b[30m',         // Lime Green  BG + teks hitam
    maroon       : '\x1b[48;5;88m\x1b[97m',          // Maroon      BG + teks putih
    ungu_tua     : '\x1b[48;5;57m\x1b[97m',          // Ungu Tua    BG + teks putih
    salmon       : '\x1b[48;5;209m\x1b[30m',         // Salmon      BG + teks hitam
    lavender     : '\x1b[48;5;183m\x1b[30m',         // Lavender    BG + teks hitam
    mint         : '\x1b[48;5;121m\x1b[30m',         // Mint        BG + teks hitam
    bata         : '\x1b[48;5;167m\x1b[97m',         // Merah Bata  BG + teks putih
    gelap        : '\x1b[48;5;235m\x1b[97m',         // Gelap       BG + teks putih
    neon         : '\x1b[48;5;46m\x1b[30m',          // Neon Green  BG + teks hitam

    // ── Koleksi Pastel (warna lembut/soft) ───────────────────────────────────
    mauve        : '\x1b[48;5;182m\x1b[30m',         // Mauve        BG + teks hitam
    merah_muda   : '\x1b[48;5;218m\x1b[30m',         // Merah Muda   BG + teks hitam
    krem         : '\x1b[48;5;230m\x1b[30m',         // Krem/Ivory   BG + teks hitam
    biru_muda    : '\x1b[48;5;153m\x1b[30m',         // Biru Muda    BG + teks hitam
    ungu_muda    : '\x1b[48;5;177m\x1b[30m',         // Ungu Muda    BG + teks hitam
    melon        : '\x1b[48;5;193m\x1b[30m',         // Melon        BG + teks hitam
    kuning_muda  : '\x1b[48;5;228m\x1b[30m',         // Kuning Muda  BG + teks hitam
    ungu_pastel  : '\x1b[48;5;189m\x1b[30m',         // Ungu Pastel  BG + teks hitam
    pink_pastel  : '\x1b[48;5;224m\x1b[30m',         // Pink Pastel  BG + teks hitam
    biru_es      : '\x1b[48;5;195m\x1b[30m',         // Biru Es      BG + teks hitam

    // ── Koleksi Alam (warna terinspirasi alam) ────────────────────────────────
    hijau_hutan  : '\x1b[48;5;22m\x1b[97m',          // Hijau Hutan  BG + teks putih
    coklat_tua   : '\x1b[48;5;94m\x1b[97m',          // Coklat Tua   BG + teks putih
    hijau_zaitun : '\x1b[48;5;100m\x1b[30m',         // Hijau Zaitun BG + teks hitam
    hijau_lumut  : '\x1b[48;5;58m\x1b[97m',          // Hijau Lumut  BG + teks putih
    teal_tua     : '\x1b[48;5;30m\x1b[97m',          // Teal Tua     BG + teks putih
    anggur       : '\x1b[48;5;90m\x1b[97m',          // Anggur/Grape BG + teks putih
    api          : '\x1b[48;5;196m\x1b[97m',         // Api/Fire Red  BG + teks putih
    biru_langit  : '\x1b[48;5;39m\x1b[30m',          // Biru Langit  BG + teks hitam
    biru_pupil   : '\x1b[48;5;33m\x1b[97m',          // Biru Pupil   BG + teks putih
    slate_biru   : '\x1b[48;5;60m\x1b[97m',          // Slate Biru   BG + teks putih

    // ── Koleksi Premium (warna cantik pilihan) ────────────────────────────────
    fuchsia      : '\x1b[48;5;129m\x1b[30m',         // Fuchsia/Pink Ungu BG + teks hitam
    indigo       : '\x1b[48;5;54m\x1b[97m',          // Indigo      BG + teks putih
    turquoise    : '\x1b[48;5;45m\x1b[30m',          // Turquoise   BG + teks hitam
    coral        : '\x1b[48;5;203m\x1b[30m',         // Coral       BG + teks hitam
    violet       : '\x1b[48;5;93m\x1b[97m',          // Violet      BG + teks putih
    amber        : '\x1b[48;5;214m\x1b[30m',         // Amber       BG + teks hitam
    emerald      : '\x1b[48;5;28m\x1b[97m',          // Emerald     BG + teks putih
    langit       : '\x1b[48;5;117m\x1b[30m',         // Langit/Sky  BG + teks hitam
    lila         : '\x1b[48;5;141m\x1b[30m',         // Lila/Lilac  BG + teks hitam
    orchid       : '\x1b[48;5;170m\x1b[30m',         // Orchid      BG + teks hitam
    peach        : '\x1b[48;5;217m\x1b[30m',         // Peach       BG + teks hitam
    cobalt       : '\x1b[48;5;27m\x1b[97m',          // Cobalt Blue BG + teks putih
    crimson      : '\x1b[48;5;160m\x1b[97m',         // Crimson     BG + teks putih
    rose         : '\x1b[48;5;211m\x1b[30m',         // Rose Pink   BG + teks hitam
    periwinkle   : '\x1b[48;5;105m\x1b[97m',         // Periwinkle  BG + teks putih
};

// ─────────────────────────────────────────────────────────────────────────────
//  LOGSW_THEMES — Info lengkap tiap tema (label + emoji)
// ─────────────────────────────────────────────────────────────────────────────
const LOGSW_THEMES = {
    // Standar
    default      : { label: 'Default (Cyan Teks)',  emoji: '🔵' },
    merah        : { label: 'Merah',                emoji: '🔴' },
    hijau        : { label: 'Hijau',                emoji: '🟢' },
    biru         : { label: 'Biru',                 emoji: '🔷' },
    kuning       : { label: 'Kuning',               emoji: '🟡' },
    ungu         : { label: 'Ungu',                 emoji: '🟣' },
    cyan         : { label: 'Cyan',                 emoji: '🩵' },
    putih        : { label: 'Putih',                emoji: '⬜' },
    hitam        : { label: 'Hitam',                emoji: '⬛' },
    // Cerah
    merah_cerah  : { label: 'Merah Cerah',          emoji: '🌶️' },
    hijau_cerah  : { label: 'Hijau Cerah',          emoji: '💚' },
    biru_cerah   : { label: 'Biru Cerah',           emoji: '💙' },
    kuning_cerah : { label: 'Kuning Cerah',         emoji: '⭐' },
    pink         : { label: 'Pink',                 emoji: '🩷' },
    cyan_cerah   : { label: 'Cyan Cerah',           emoji: '🫧' },
    abu          : { label: 'Abu-Abu',              emoji: '🩶' },
    // 256-warna
    oranye       : { label: 'Oranye',               emoji: '🟠' },
    emas         : { label: 'Emas / Gold',          emoji: '🏅' },
    toska        : { label: 'Toska / Teal',         emoji: '🌊' },
    navy         : { label: 'Navy Blue',            emoji: '🌌' },
    coklat       : { label: 'Coklat',               emoji: '🤎' },
    lime         : { label: 'Lime Green',           emoji: '🍏' },
    maroon       : { label: 'Maroon',               emoji: '🍷' },
    ungu_tua     : { label: 'Ungu Tua',             emoji: '🔮' },
    salmon       : { label: 'Salmon',               emoji: '🍑' },
    lavender     : { label: 'Lavender',             emoji: '💜' },
    mint         : { label: 'Mint',                 emoji: '🌿' },
    bata         : { label: 'Merah Bata',           emoji: '🧱' },
    gelap        : { label: 'Gelap / Dark',         emoji: '🌑' },
    neon         : { label: 'Neon Green',           emoji: '💡' },
    // Pastel
    mauve        : { label: 'Mauve',                emoji: '🪷' },
    merah_muda   : { label: 'Merah Muda',           emoji: '🌷' },
    krem         : { label: 'Krem / Ivory',         emoji: '🥛' },
    biru_muda    : { label: 'Biru Muda',            emoji: '🩦' },
    ungu_muda    : { label: 'Ungu Muda',            emoji: '🟪' },
    melon        : { label: 'Melon',                emoji: '🍈' },
    kuning_muda  : { label: 'Kuning Muda',          emoji: '🌼' },
    ungu_pastel  : { label: 'Ungu Pastel',          emoji: '🌂' },
    pink_pastel  : { label: 'Pink Pastel',          emoji: '🩰' },
    biru_es      : { label: 'Biru Es',              emoji: '🧊' },
    // Alam
    hijau_hutan  : { label: 'Hijau Hutan',          emoji: '🌲' },
    coklat_tua   : { label: 'Coklat Tua',           emoji: '🪵' },
    hijau_zaitun : { label: 'Hijau Zaitun',         emoji: '🫒' },
    hijau_lumut  : { label: 'Hijau Lumut',          emoji: '🪴' },
    teal_tua     : { label: 'Teal Tua',             emoji: '🐊' },
    anggur       : { label: 'Anggur / Grape',       emoji: '🍇' },
    api          : { label: 'Api / Fire Red',       emoji: '🔥' },
    biru_langit  : { label: 'Biru Langit',          emoji: '🌈' },
    biru_pupil   : { label: 'Biru Pupil',           emoji: '🌐' },
    slate_biru   : { label: 'Slate Biru',           emoji: '🌫️' },
    // Premium
    fuchsia      : { label: 'Fuchsia',              emoji: '🌸' },
    indigo       : { label: 'Indigo',               emoji: '🔹' },
    turquoise    : { label: 'Turquoise',            emoji: '💠' },
    coral        : { label: 'Coral',                emoji: '🪸' },
    violet       : { label: 'Violet',               emoji: '🎆' },
    amber        : { label: 'Amber',                emoji: '🍯' },
    emerald      : { label: 'Emerald',              emoji: '💎' },
    langit       : { label: 'Langit / Sky',         emoji: '🌤️' },
    lila         : { label: 'Lila / Lilac',         emoji: '🪻' },
    orchid       : { label: 'Orchid',               emoji: '🌺' },
    peach        : { label: 'Peach',                emoji: '🥭' },
    cobalt       : { label: 'Cobalt Blue',          emoji: '🌀' },
    crimson      : { label: 'Crimson',              emoji: '🩸' },
    rose         : { label: 'Rose Pink',            emoji: '🌹' },
    periwinkle   : { label: 'Periwinkle',           emoji: '🫐' },
    // Special
    random       : { label: 'Random',               emoji: '🎲' },
};

// ─────────────────────────────────────────────────────────────────────────────
//  LOGSW_FG — Warna teks/foreground untuk isi nilai field di dalam kotak log
//  Dipakai untuk field-field VALUE (Mode, TipeStory, Selamat, dll.)
//  yang tampil di ATAS latar gelap terminal (bukan di atas background tema).
//  Semua warna dipilih agar jelas terlihat di Pterodactyl (dark background).
// ─────────────────────────────────────────────────────────────────────────────
const LOGSW_FG = {
    default      : '\x1b[36m',            // Cyan — sama dengan default lama
    merah        : '\x1b[91m',            // Merah terang
    hijau        : '\x1b[92m',            // Hijau terang
    biru         : '\x1b[94m',            // Biru terang
    kuning       : '\x1b[93m',            // Kuning terang
    ungu         : '\x1b[95m',            // Magenta/Ungu terang
    cyan         : '\x1b[96m',            // Cyan terang
    putih        : '\x1b[97m',            // Putih terang
    hitam        : '\x1b[37m',            // Abu-abu (hitam terlalu gelap di terminal gelap)
    merah_cerah  : '\x1b[91m',
    hijau_cerah  : '\x1b[92m',
    biru_cerah   : '\x1b[94m',
    kuning_cerah : '\x1b[93m',
    pink         : '\x1b[95m',
    cyan_cerah   : '\x1b[96m',
    abu          : '\x1b[37m',
    oranye       : '\x1b[38;5;214m',      // Oranye terang
    emas         : '\x1b[38;5;220m',      // Emas/Gold
    toska        : '\x1b[38;5;43m',       // Toska/Teal
    navy         : '\x1b[94m',            // Biru terang (navy terlalu gelap sbg teks)
    coklat       : '\x1b[38;5;136m',      // Coklat agak terang
    lime         : '\x1b[38;5;154m',      // Lime Green
    maroon       : '\x1b[38;5;160m',      // Merah maroon terang
    ungu_tua     : '\x1b[38;5;135m',      // Ungu agak terang
    salmon       : '\x1b[38;5;209m',      // Salmon
    lavender     : '\x1b[38;5;183m',      // Lavender
    mint         : '\x1b[38;5;121m',      // Mint
    bata         : '\x1b[38;5;167m',      // Merah Bata
    gelap        : '\x1b[37m',            // Abu-abu (gelap terlalu gelap sbg teks)
    neon         : '\x1b[38;5;46m',       // Neon Green
    // Pastel
    mauve        : '\x1b[38;5;182m',      // Mauve
    merah_muda   : '\x1b[38;5;218m',      // Merah Muda
    krem         : '\x1b[38;5;229m',      // Krem agak terang
    biru_muda    : '\x1b[38;5;153m',      // Biru Muda
    ungu_muda    : '\x1b[38;5;177m',      // Ungu Muda
    melon        : '\x1b[38;5;193m',      // Melon
    kuning_muda  : '\x1b[38;5;228m',      // Kuning Muda
    ungu_pastel  : '\x1b[38;5;189m',      // Ungu Pastel
    pink_pastel  : '\x1b[38;5;224m',      // Pink Pastel
    biru_es      : '\x1b[38;5;195m',      // Biru Es
    // Alam
    hijau_hutan  : '\x1b[38;5;34m',       // Hijau Hutan terang
    coklat_tua   : '\x1b[38;5;130m',      // Coklat Tua
    hijau_zaitun : '\x1b[38;5;100m',      // Hijau Zaitun
    hijau_lumut  : '\x1b[38;5;64m',       // Hijau Lumut
    teal_tua     : '\x1b[38;5;37m',       // Teal Tua terang
    anggur       : '\x1b[38;5;90m',       // Anggur/Grape
    api          : '\x1b[38;5;196m',      // Api/Fire Red
    biru_langit  : '\x1b[38;5;39m',       // Biru Langit
    biru_pupil   : '\x1b[38;5;33m',       // Biru Pupil
    slate_biru   : '\x1b[38;5;67m',       // Slate Biru
    // Premium
    fuchsia      : '\x1b[38;5;213m',      // Fuchsia terang
    indigo       : '\x1b[38;5;99m',       // Indigo/blue-purple
    turquoise    : '\x1b[38;5;45m',       // Turquoise
    coral        : '\x1b[38;5;203m',      // Coral
    violet       : '\x1b[38;5;135m',      // Violet terang
    amber        : '\x1b[38;5;214m',      // Amber/oranye emas
    emerald      : '\x1b[38;5;40m',       // Emerald hijau
    langit       : '\x1b[38;5;117m',      // Sky blue
    lila         : '\x1b[38;5;141m',      // Lilac
    orchid       : '\x1b[38;5;170m',      // Orchid
    peach        : '\x1b[38;5;217m',      // Peach
    cobalt       : '\x1b[38;5;75m',       // Cobalt terang
    crimson      : '\x1b[38;5;196m',      // Crimson terang
    rose         : '\x1b[38;5;211m',      // Rose pink
    periwinkle   : '\x1b[38;5;105m',      // Periwinkle
};

// ─────────────────────────────────────────────────────────────────────────────
//  Helpers
// ─────────────────────────────────────────────────────────────────────────────

// Key yang bisa dipilih random (semua LOGSW_ANSI kecuali 'default')
const LOGSW_RANDOM_KEYS = Object.keys(LOGSW_ANSI).filter(k => k !== 'default');

// Semua key valid termasuk 'random'
const LOGSW_THEME_KEYS = Object.keys(LOGSW_THEMES);

module.exports = { LOGSW_ANSI, LOGSW_FG, LOGSW_THEMES, LOGSW_RANDOM_KEYS, LOGSW_THEME_KEYS };
