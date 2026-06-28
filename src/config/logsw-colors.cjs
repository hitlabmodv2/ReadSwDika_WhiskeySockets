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
 * ───────────────────────────────
 */
'use strict';

// Warna ANSI untuk tiap nama tema
const LOGSW_ANSI = {
    default : '\x1b[36m',                   // Cyan  (bawaan)
    merah   : '\x1b[31m',                   // Merah
    hijau   : '\x1b[32m',                   // Hijau
    biru    : '\x1b[34m',                   // Biru
    kuning  : '\x1b[33m',                   // Kuning
    ungu    : '\x1b[38;2;180;120;255m',     // Ungu
    oranye  : '\x1b[38;2;255;165;0m',       // Oranye
    pink    : '\x1b[38;2;255;105;180m',     // Pink
};

// Info lengkap tiap tema (label + emoji + preview singkat)
const LOGSW_THEMES = {
    default : { label: 'Default (Cyan)', emoji: '🔵', preview: '┌═══ Cyan ═══┐' },
    merah   : { label: 'Merah',          emoji: '🔴', preview: '┌═══ Merah ══┐' },
    hijau   : { label: 'Hijau',          emoji: '🟢', preview: '┌═══ Hijau ══┐' },
    biru    : { label: 'Biru',           emoji: '🔷', preview: '┌═══ Biru  ══┐' },
    kuning  : { label: 'Kuning',         emoji: '🟡', preview: '┌═══ Kuning ═┐' },
    ungu    : { label: 'Ungu',           emoji: '🟣', preview: '┌═══ Ungu  ══┐' },
    oranye  : { label: 'Oranye',         emoji: '🟠', preview: '┌═══ Oranye ═┐' },
    pink    : { label: 'Pink',           emoji: '🩷', preview: '┌═══ Pink  ══┐' },
    random  : { label: 'Random',         emoji: '🎲', preview: '┌═══ Random ═┐' },
};

// Semua key yang bisa dipilih random (tidak termasuk 'default')
const LOGSW_RANDOM_KEYS = Object.keys(LOGSW_ANSI).filter(k => k !== 'default');

// Semua key valid (termasuk 'random')
const LOGSW_THEME_KEYS = Object.keys(LOGSW_THEMES);

module.exports = { LOGSW_ANSI, LOGSW_THEMES, LOGSW_RANDOM_KEYS, LOGSW_THEME_KEYS };
