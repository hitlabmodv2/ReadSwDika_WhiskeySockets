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
 *  downloader.cjs — Centralized download handler
 *  Re-export semua platform downloader, single entry point
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Centralized Download Handler
 *  Re-export semua downloader platform (TikTok, YouTube,
 *  Instagram, Twitter, Facebook, dll) sebagai single entry
 *  point — memudahkan impor di message.js.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

/**
 * Centralized download handler — re-exports semua platform downloader.
 *
 * Usage di message.js:
 *   const { handleTiktokDl, handleInstagramDl, handleFacebookDl,
 *           handlePlay, handleYtmp3, handleYtmp4 } = _require(path.resolve('./scrape/downloader.cjs'));
 */

const { handleTiktokDl }    = require('./tiktok-dl.cjs');
const { handleInstagramDl } = require('./instagram-dl.cjs');
const { handleFacebookDl }  = require('./facebook-dl.cjs');
const { handlePlay, handleYtmp3, handleYtmp4 } = require('./youtube-dl.cjs');
const { handleAllUnduh }    = require('./allunduh.cjs');
const { handleTwitterDl }   = require('./twitter-dl.cjs');

module.exports = {
    handleTiktokDl,
    handleInstagramDl,
    handleFacebookDl,
    handlePlay,
    handleYtmp3,
    handleYtmp4,
    handleAllUnduh,
    handleTwitterDl,
};
