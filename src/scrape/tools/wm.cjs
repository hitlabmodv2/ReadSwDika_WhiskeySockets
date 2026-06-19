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
 *  wm.cjs — Buat stiker custom metadata (.wm/.swm)
 *  Set pack name & author stiker tanpa overlay visual
 * ───────────────────────────────
 */
'use strict';

async function makeWmSticker(imageBuffer, { packName = 'Wily Bot', authorName = 'Wilykun' } = {}) {
        const { Sticker, StickerTypes } = await import('wa-sticker-formatter');
        const sticker = new Sticker(imageBuffer, {
                pack: packName,
                author: authorName,
                type: StickerTypes.FULL,
                categories: ['🎭'],
                id: 'com.wilykun.wm',
                quality: 90
        });
        return await sticker.toBuffer();
}

module.exports = { makeWmSticker };
