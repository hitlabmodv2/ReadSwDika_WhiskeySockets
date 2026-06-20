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
 *  emoji.js — Manager emoji reaksi bot
 *  Default emoji set, custom per jadibot user, fallback
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Emoji Reaction Manager
 *  Kelola set emoji reaksi bot (seen, processing, done, error)
 *  — mendukung konfigurasi default, kustom per sesi JadiBot,
 *  dan fallback otomatis bila emoji tidak tersedia.
 * ═══════════════════════════════════════════════════════════════
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EMOJI_JSON_PATH = path.join(__dirname, 'emoji.json');

function loadEmojiData() {
    try {
        if (fs.existsSync(EMOJI_JSON_PATH)) {
            const data = fs.readFileSync(EMOJI_JSON_PATH, 'utf8');
            return JSON.parse(data);
        }
    } catch (error) {
        console.error('Error loading emoji.json:', error.message);
    }
    return { emojis: [] };
}

function saveEmojiData(data) {
    try {
        const tmp = EMOJI_JSON_PATH + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tmp, EMOJI_JSON_PATH);
        // Auto-sync defaultemoji.json ke semua jadibot mode=default
        _syncAllJadibotDefaults(data.emojis || []);
        return true;
    } catch (error) {
        console.error('Error saving emoji.json:', error.message);
        return false;
    }
}

// Sync defaultemoji.json ke semua jadibot yang mode=default — realtime, no conflict
function _syncAllJadibotDefaults(emojis) {
    try {
        if (!Array.isArray(emojis) || emojis.length === 0) return;
        const jadibotDir = path.join(process.cwd(), 'data_jadibot');
        if (!fs.existsSync(jadibotDir)) return;
        const entries = fs.readdirSync(jadibotDir);
        const obj = JSON.stringify({ source: 'main-bot', syncedAt: Date.now(), emojis }, null, 2);
        for (const num of entries) {
            try {
                const numDir = path.join(jadibotDir, num);
                if (!fs.statSync(numDir).isDirectory()) continue;
                // Cek mode — hanya sync kalau mode=default (atau belum ada mode)
                const emojiFile = path.join(numDir, 'emoji.json');
                if (fs.existsSync(emojiFile)) {
                    const userCfg = JSON.parse(fs.readFileSync(emojiFile, 'utf-8'));
                    if (userCfg.mode && userCfg.mode !== 'default') continue;
                }
                // Atomic write ke defaultemoji.json
                const outPath = path.join(numDir, 'defaultemoji.json');
                const tmp = outPath + '.tmp';
                fs.writeFileSync(tmp, obj, 'utf-8');
                fs.renameSync(tmp, outPath);
            } catch (_) {}
        }
    } catch (_) {}
}

function getStatusEmojis() {
    const data = loadEmojiData();
    return data.emojis || [];
}

function addEmojis(emojisToAdd) {
    const data = loadEmojiData();
    const currentEmojis = data.emojis || [];
    
    const results = {
        added: [],
        alreadyExists: []
    };

    for (const emoji of emojisToAdd) {
        const trimmed = emoji.trim();
        if (!trimmed) continue;
        
        if (currentEmojis.includes(trimmed)) {
            results.alreadyExists.push(trimmed);
        } else {
            currentEmojis.push(trimmed);
            results.added.push(trimmed);
        }
    }

    if (results.added.length > 0) {
        data.emojis = currentEmojis;
        saveEmojiData(data);
    }

    return results;
}

function deleteEmojis(emojisToDelete) {
    const data = loadEmojiData();
    let currentEmojis = data.emojis || [];
    
    const results = {
        deleted: [],
        notFound: []
    };

    for (const emoji of emojisToDelete) {
        const trimmed = emoji.trim();
        if (!trimmed) continue;
        
        const index = currentEmojis.indexOf(trimmed);
        if (index > -1) {
            currentEmojis.splice(index, 1);
            results.deleted.push(trimmed);
        } else {
            results.notFound.push(trimmed);
        }
    }

    if (results.deleted.length > 0) {
        data.emojis = currentEmojis;
        saveEmojiData(data);
    }

    return results;
}

function listEmojis() {
    const data = loadEmojiData();
    return {
        emojis: data.emojis || [],
        count: (data.emojis || []).length
    };
}

function getRandomEmoji() {
    const emojis = getStatusEmojis();
    if (emojis.length === 0) return '❤️';
    return emojis[Math.floor(Math.random() * emojis.length)];
}

export {
    getStatusEmojis,
    addEmojis,
    deleteEmojis,
    listEmojis,
    getRandomEmoji
};

export default {
    getStatusEmojis,
    addEmojis,
    deleteEmojis,
    listEmojis,
    getRandomEmoji
};
