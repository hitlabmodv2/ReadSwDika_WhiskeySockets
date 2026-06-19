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
