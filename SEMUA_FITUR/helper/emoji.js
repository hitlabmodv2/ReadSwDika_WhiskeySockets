/**
 * ───────────────────────────────
 *  emoji.js — Re-export dari src/helper/emoji.js
 *  Agar SEMUA_FITUR/helper/emoji.js dapat diimport oleh file .cjs
 * ───────────────────────────────
 */

export {
    getStatusEmojis,
    addEmojis,
    deleteEmojis,
    listEmojis,
    getRandomEmoji,
    getMode,
    setCustomMode,
    setDefaultMode,
    resetCustomEmojis
} from '../../src/helper/emoji.js';

export { default } from '../../src/helper/emoji.js';
