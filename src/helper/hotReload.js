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
 *  hotReload.js — Hot reload modul tanpa restart
 *  Watch file perubahan, reload ESM dengan cache-busting
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Hot Reload — Reload Modul Tanpa Restart Bot
 *  Pantau perubahan file scraper/handler, reload otomatis
 *  dengan cache-busting ESM — memungkinkan update fitur
 *  tanpa perlu mematikan dan menyalakan bot kembali.
 * ═══════════════════════════════════════════════════════════════
 */
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';
import { createRequire } from 'module';

// Digunakan untuk membersihkan CJS require.cache saat file .cjs berubah
const _cjsReq = createRequire(import.meta.url);

const ROOT = process.cwd();
const DEBOUNCE_MS = 600;

const _handlers = {};
const _watchers = {};
const _debounceTimers = {};
const _reloadCallbacks = {};

// type: 'esm' → reload via ESM import() cache-busting (default)
// type: 'cjs' → reload via require.cache deletion (untuk file .cjs yang di-require() lazy di message.js)
// SKIP top-level CJS (diload saat startup, butuh restart): wm, cekauto-cmd, interactive-msg,
//   media-helper, log-cmd, jadibot-cmd, alqolam-helpers, wily-helpers, autosimi-cmd,
//   musikai-cmd, musikai2-cmd, alqanime-cmd, cosplay-cmd, komiktap-cmd, setbrowser-cmd, play-cmd
const WATCHED_FILES = [
    // ── Handler ESM ──────────────────────────────
    { key: 'message',      rel: 'message.js' },
    { key: 'antidelete',   rel: 'SEMUA_FITUR/antidel/antidelete.js' },
    { key: 'antitagsw',    rel: 'SEMUA_FITUR/antitagsw/antitagsw.js' },
    { key: 'antitagbot',   rel: 'SEMUA_FITUR/antitag/antitag.js' },

    // ── Helper ESM (aman di-reload) ───────────────
    { key: 'utils',        rel: 'src/helper/utils.js' },
    { key: 'inject',       rel: 'src/helper/inject.js' },
    { key: 'text',         rel: 'src/helper/text.js' },
    { key: 'emoji',        rel: 'src/helper/emoji.js' },
    { key: 'telegram',     rel: 'src/helper/telegram.js' },
    { key: 'phoneRegion',  rel: 'src/helper/phoneRegion.js' },
    { key: 'voCache',      rel: 'src/helper/voCache.js' },
    { key: 'cleaner',      rel: 'src/helper/cleaner.js' },
    { key: 'helperIndex',  rel: 'src/helper/index.js' },
    { key: 'socketCompat', rel: 'src/helper/socketCompat.js' },
    { key: 'aiTools',      rel: 'src/helper/aiTools.js' },
    { key: 'aiPrompt',     rel: 'src/helper/aiPrompt.js' },
    { key: 'aiReact',      rel: 'src/helper/aiReact.js' },
    { key: 'jadibotSettings', rel: 'src/helper/jadibotSettings.js' },
    { key: 'swtrack',      rel: 'src/helper/swtrack.js' },
    { key: 'aiPromptFb',   rel: 'src/helper/AiPromptFb.js' },
    { key: 'aiPromptIg',   rel: 'src/helper/AiPromptIg.js' },
    { key: 'aiStickerStory', rel: 'src/helper/aiStickerStory.js' },
    { key: 'gemini',       rel: 'src/helper/gemini.js' },
    { key: 'imageSearch',  rel: 'src/helper/imageSearch.js' },
    { key: 'stickerMap',   rel: 'src/helper/stickerMap.js' },
    { key: 'stickerMemory', rel: 'src/helper/stickerMemory.js' },
    { key: 'userMemory',   rel: 'src/helper/userMemory.js' },
    { key: 'zipParser',    rel: 'src/helper/zipParser.js' },

    // ── Database ESM ─────────────────────────────
    { key: 'botStats',     rel: 'src/db/botStats.js' },
    { key: 'jsondb',       rel: 'src/db/json.js' },
    { key: 'datadb',       rel: 'src/db/datadb.js' },
    { key: 'errorLog',     rel: 'src/db/errorLog.js' },
    { key: 'userDb',       rel: 'src/db/userDb.js' },

    // ── Menu builders ESM ────────────────────────
    { key: 'menuUtama',    rel: 'SEMUA_FITUR/menu/menu_utama.js' },
    { key: 'menuJadibot',  rel: 'SEMUA_FITUR/menu/menu_jadibot.js' },

    // ── CJS lazy-loaded (cache clear on change) ──
    // Info / utilities
    { key: 'cjs:info',         rel: 'SEMUA_FITUR/info/info.cjs',           type: 'cjs' },
    { key: 'cjs:emojiCmd',     rel: 'SEMUA_FITUR/info/emoji-cmd.cjs',      type: 'cjs' },
    { key: 'cjs:delCmd',       rel: 'SEMUA_FITUR/info/del-cmd.cjs',        type: 'cjs' },
    { key: 'cjs:memoryCmd',    rel: 'SEMUA_FITUR/info/memory-cmd.cjs',     type: 'cjs' },
    { key: 'cjs:quotedCmd',    rel: 'SEMUA_FITUR/info/quoted-cmd.cjs',     type: 'cjs' },
    { key: 'cjs:ping',         rel: 'SEMUA_FITUR/info/ping.cjs',           type: 'cjs' },
    { key: 'cjs:speedtest',    rel: 'SEMUA_FITUR/info/speedtest.cjs',      type: 'cjs' },
    { key: 'cjs:ceksize',      rel: 'SEMUA_FITUR/info/ceksize.cjs',        type: 'cjs' },
    { key: 'cjs:evalCmd',      rel: 'SEMUA_FITUR/info/eval-cmd.cjs',       type: 'cjs' },
    { key: 'cjs:matiCmd',      rel: 'SEMUA_FITUR/info/mati-cmd.cjs',       type: 'cjs' },
    { key: 'cjs:cekjidgc',     rel: 'SEMUA_FITUR/info/cekjidgc.cjs',      type: 'cjs' },
    { key: 'cjs:cekjidgcall',  rel: 'SEMUA_FITUR/info/cekjidgcall.cjs',   type: 'cjs' },
    // Group
    { key: 'cjs:hidetag',      rel: 'SEMUA_FITUR/group/hidetag.cjs',       type: 'cjs' },
    { key: 'cjs:sematkan',     rel: 'SEMUA_FITUR/group/sematkan.cjs',      type: 'cjs' },
    { key: 'cjs:pushkontakgc', rel: 'SEMUA_FITUR/group/pushkontakgc.cjs', type: 'cjs' },
    { key: 'cjs:ghosttag',     rel: 'SEMUA_FITUR/group/ghosttag.cjs',      type: 'cjs' },
    { key: 'cjs:sendstatus',   rel: 'SEMUA_FITUR/group/sendstatus.cjs',    type: 'cjs' },
    { key: 'cjs:setgoodbye',   rel: 'SEMUA_FITUR/group/setgoodbye.cjs',    type: 'cjs' },
    { key: 'cjs:upswgc',       rel: 'SEMUA_FITUR/group/upswgc.cjs',        type: 'cjs' },
    { key: 'cjs:upswgcv2',     rel: 'SEMUA_FITUR/group/upswgcv2.cjs',      type: 'cjs' },
    // Jadibot
    { key: 'cjs:clearsesi',    rel: 'SEMUA_FITUR/jadibot/clearsesi.cjs',   type: 'cjs' },
    { key: 'cjs:ceksesi',      rel: 'SEMUA_FITUR/jadibot/ceksesi.cjs',     type: 'cjs' },
    { key: 'cjs:credsjson',    rel: 'SEMUA_FITUR/jadibot/credsjson.cjs',   type: 'cjs' },
    { key: 'cjs:listbotCmd',   rel: 'SEMUA_FITUR/jadibot/listbot-cmd.cjs', type: 'cjs' },
    // Setting
    { key: 'cjs:anticall',     rel: 'SEMUA_FITUR/setting/anticall.cjs',    type: 'cjs' },
    { key: 'cjs:aturbrowser',  rel: 'SEMUA_FITUR/setting/aturbrowser.cjs', type: 'cjs' },
    { key: 'cjs:autosholat',   rel: 'SEMUA_FITUR/setting/autosholat.cjs',  type: 'cjs' },
    { key: 'cjs:autotyprec',   rel: 'SEMUA_FITUR/setting/autotyprec.cjs',  type: 'cjs' },
    { key: 'cjs:botadminCmd',  rel: 'SEMUA_FITUR/setting/botadmin-cmd.cjs',type: 'cjs' },
    { key: 'cjs:cekerrorCmd',  rel: 'SEMUA_FITUR/setting/cekerror-cmd.cjs',type: 'cjs' },
    { key: 'cjs:ceksetting',   rel: 'SEMUA_FITUR/setting/ceksetting.cjs',  type: 'cjs' },
    { key: 'cjs:ceksw',        rel: 'SEMUA_FITUR/setting/ceksw.cjs',       type: 'cjs' },
    { key: 'cjs:online',       rel: 'SEMUA_FITUR/setting/online.cjs',      type: 'cjs' },
    { key: 'cjs:readchat',     rel: 'SEMUA_FITUR/setting/readchat.cjs',    type: 'cjs' },
    // System
    { key: 'cjs:shutdown',     rel: 'SEMUA_FITUR/system/shutdown.cjs',     type: 'cjs' },
    { key: 'cjs:autocleaner',  rel: 'SEMUA_FITUR/system/autocleaner.cjs',  type: 'cjs' },
    { key: 'cjs:backup',       rel: 'SEMUA_FITUR/system/backup.cjs',       type: 'cjs' },
    { key: 'cjs:sessionclnr',  rel: 'SEMUA_FITUR/system/sessioncleaner.cjs',type:'cjs' },
    // Menu
    { key: 'cjs:menuCmd',      rel: 'SEMUA_FITUR/menu/menu-cmd.cjs',       type: 'cjs' },
    { key: 'cjs:menupages',    rel: 'SEMUA_FITUR/menu/menupages.cjs',      type: 'cjs' },
    { key: 'cjs:menuPages2',   rel: 'SEMUA_FITUR/menu/menu-pages2.cjs',    type: 'cjs' },
    // Media
    { key: 'cjs:stickerCmd',   rel: 'SEMUA_FITUR/media/sticker-cmd.cjs',   type: 'cjs' },
    { key: 'cjs:toImgCmd',     rel: 'SEMUA_FITUR/media/toimg-cmd.cjs',     type: 'cjs' },
    { key: 'cjs:getsw',        rel: 'SEMUA_FITUR/media/getsw.cjs',         type: 'cjs' },
    { key: 'cjs:audioconvert', rel: 'SEMUA_FITUR/media/audioconvert.cjs',  type: 'cjs' },
    { key: 'cjs:viewonce',     rel: 'SEMUA_FITUR/media/viewonce.cjs',      type: 'cjs' },
    // Download
    { key: 'cjs:downloader',   rel: 'SEMUA_FITUR/download/downloader.cjs', type: 'cjs' },
    { key: 'cjs:hdvid',        rel: 'SEMUA_FITUR/download/hdvid.cjs',      type: 'cjs' },
    { key: 'cjs:stickerly',    rel: 'SEMUA_FITUR/download/stickerly.cjs',  type: 'cjs' },
    // Music
    { key: 'cjs:genius',       rel: 'SEMUA_FITUR/music/genius.cjs',        type: 'cjs' },
    { key: 'cjs:infomusik',    rel: 'SEMUA_FITUR/music/infomusik.cjs',     type: 'cjs' },
    { key: 'cjs:whatsmusik',   rel: 'SEMUA_FITUR/music/whatsmusik.cjs',    type: 'cjs' },
    // Anime
    { key: 'cjs:alqanime',     rel: 'SEMUA_FITUR/anime/alqanime.cjs',      type: 'cjs' },
    { key: 'cjs:alqanimeDl',   rel: 'SEMUA_FITUR/anime/alqanime-dl.cjs',   type: 'cjs' },
    { key: 'cjs:alqanimeMonitor',rel:'SEMUA_FITUR/anime/alqanime-monitor.cjs',type:'cjs'},
    { key: 'cjs:animasu',      rel: 'SEMUA_FITUR/anime/animasu.cjs',       type: 'cjs' },
    { key: 'cjs:bluearchive',  rel: 'SEMUA_FITUR/anime/bluearchive.cjs',   type: 'cjs' },
    { key: 'cjs:cosplaytele',  rel: 'SEMUA_FITUR/anime/cosplaytele.cjs',   type: 'cjs' },
    { key: 'cjs:infowibu',     rel: 'SEMUA_FITUR/anime/infowibu.cjs',      type: 'cjs' },
    { key: 'cjs:komiktap',     rel: 'SEMUA_FITUR/anime/komiktap.cjs',      type: 'cjs' },
    { key: 'cjs:kusonime',     rel: 'SEMUA_FITUR/anime/kusonime.cjs',      type: 'cjs' },
    { key: 'cjs:nhentai',      rel: 'SEMUA_FITUR/anime/nhentai.cjs',       type: 'cjs' },
    { key: 'cjs:pixiv',        rel: 'SEMUA_FITUR/anime/pixiv.cjs',         type: 'cjs' },
    { key: 'cjs:pixivr18',     rel: 'SEMUA_FITUR/anime/pixivr18.cjs',      type: 'cjs' },
    // AI
    { key: 'cjs:imageEdit',    rel: 'SEMUA_FITUR/ai/imageEdit.cjs',        type: 'cjs' },
    { key: 'cjs:wilycmd',      rel: 'SEMUA_FITUR/ai/wilycmd.cjs',          type: 'cjs' },
    // Tools
    { key: 'cjs:cuaca',        rel: 'SEMUA_FITUR/tools/cuaca.cjs',         type: 'cjs' },
    { key: 'cjs:tempmail',     rel: 'SEMUA_FITUR/tools/tempmail.cjs',       type: 'cjs' },
    { key: 'cjs:cekhp',        rel: 'SEMUA_FITUR/tools/cekhp.cjs',         type: 'cjs' },
    { key: 'cjs:bandingkanhp', rel: 'SEMUA_FITUR/tools/bandingkanhp.cjs',  type: 'cjs' },
    { key: 'cjs:an1game',      rel: 'SEMUA_FITUR/tools/an1game.cjs',       type: 'cjs' },
    { key: 'cjs:screenshot',   rel: 'SEMUA_FITUR/tools/screenshot.cjs',    type: 'cjs' },
    { key: 'cjs:telegramTools',rel: 'SEMUA_FITUR/tools/telegram.cjs',      type: 'cjs' },
    { key: 'cjs:wilyai',       rel: 'SEMUA_FITUR/tools/wilyai.cjs',        type: 'cjs' },
    // News
    { key: 'cjs:malnews',      rel: 'SEMUA_FITUR/news/malnews.cjs',        type: 'cjs' },
    { key: 'cjs:tvonenews',    rel: 'SEMUA_FITUR/news/tvonenews.cjs',      type: 'cjs' },
    // Reaction / Read
    { key: 'cjs:reactapi',     rel: 'SEMUA_FITUR/reactionsw/reactapi.cjs', type: 'cjs' },
    { key: 'cjs:readsw',       rel: 'SEMUA_FITUR/readsw/readsw.cjs',       type: 'cjs' },

    // ── SKIP ESM (memegang state/timer aktif) ────
    // crashGuard.js    → handle signal proses, berbahaya
    // hotReload.js     → dirinya sendiri
    // memoryMonitor.js → timer RAM aktif
    // jadibot.js       → sesi aktif user lain
    // authState.js     → pegang creds/session WA di memory
    // browserSwitch.js → manage koneksi socket aktif
    // aiHistory.js     → punya _writeLock promise, bahaya direload saat menulis

    // ── SKIP CJS top-level (diload saat startup, butuh restart) ─
    // wm.cjs, cekauto-cmd.cjs, interactive-msg.cjs, media-helper.cjs,
    // log-cmd.cjs, jadibot-cmd.cjs, alqolam-helpers.cjs, wily-helpers.cjs,
    // autosimi-cmd.cjs, musikai-cmd.cjs, musikai2-cmd.cjs, alqanime-cmd.cjs,
    // cosplay-cmd.cjs, komiktap-cmd.cjs, setbrowser-cmd.cjs, play-cmd.cjs
];

async function loadModule(rel) {
    const abs = path.join(ROOT, rel);
    const url = pathToFileURL(abs).href + `?t=${Date.now()}`;
    try {
        const mod = await import(url);
        return mod.default ?? mod;
    } catch (err) {
        console.error(`\x1b[31m[HotReload] Gagal load '${rel}':\x1b[39m`, err.message);
        return null;
    }
}

function clearCjsCache(abs) {
    // Hapus dari require.cache agar _require() berikutnya load ulang dari disk
    try {
        if (_cjsReq.cache[abs]) {
            delete _cjsReq.cache[abs];
            return true;
        }
        return false;
    } catch {
        return false;
    }
}

function watchFile(rel, key, type = 'esm') {
    const abs = path.join(ROOT, rel);

    if (_watchers[key]) {
        try { _watchers[key].close(); } catch {}
    }

    try {
        _watchers[key] = fs.watch(abs, { persistent: false }, (event) => {
            if (event !== 'change' && event !== 'rename') return;

            clearTimeout(_debounceTimers[key]);
            _debounceTimers[key] = setTimeout(async () => {
                console.log(`\x1b[36m[HotReload] Perubahan terdeteksi: ${rel}\x1b[39m`);

                if (type === 'cjs') {
                    // CJS: cukup hapus dari require.cache → _require() berikutnya load fresh
                    const cleared = clearCjsCache(abs);
                    if (cleared) {
                        console.log(`\x1b[32m[HotReload] ✓ CJS cache cleared: ${rel} — efektif di pemanggilan berikutnya!\x1b[39m`);
                    } else {
                        // File belum pernah di-require, tidak masalah
                        console.log(`\x1b[32m[HotReload] ✓ CJS watch aktif: ${rel}\x1b[39m`);
                    }
                    if (typeof _reloadCallbacks[key] === 'function') {
                        try { await _reloadCallbacks[key](rel); } catch (cbErr) {
                            console.error(`\x1b[31m[HotReload] Callback error for '${key}':\x1b[39m`, cbErr.message);
                        }
                    }
                } else {
                    // ESM: reload dengan cache-busting URL
                    const mod = await loadModule(rel);
                    if (mod !== null) {
                        _handlers[key] = mod;
                        console.log(`\x1b[32m[HotReload] ✓ '${rel}' berhasil di-reload tanpa restart bot!\x1b[39m`);
                        if (typeof _reloadCallbacks[key] === 'function') {
                            try { await _reloadCallbacks[key](rel); } catch (cbErr) {
                                console.error(`\x1b[31m[HotReload] Callback error for '${key}':\x1b[39m`, cbErr.message);
                            }
                        }
                    } else {
                        console.error(`\x1b[31m[HotReload] ✗ Gagal reload '${rel}', pakai versi lama.\x1b[39m`);
                    }
                }

                if (event === 'rename') {
                    watchFile(rel, key, type);
                }
            }, DEBOUNCE_MS);
        });
    } catch (err) {
        console.error(`\x1b[31m[HotReload] Tidak bisa watch '${rel}':\x1b[39m`, err.message);
    }
}

export async function initHotReload() {
    let ok = 0;
    let fail = 0;
    const failed = [];

    let okCjs = 0;
    for (const { key, rel, type = 'esm' } of WATCHED_FILES) {
        const abs = path.join(ROOT, rel);
        if (type === 'cjs') {
            // CJS: tidak perlu load sekarang — cukup pasang watcher untuk clear cache saat berubah
            if (fs.existsSync(abs)) {
                watchFile(rel, key, 'cjs');
                okCjs++;
            }
            // File tidak ada → skip diam-diam (mungkin fitur opsional)
            continue;
        }
        // ESM: load sekarang + watch
        const mod = await loadModule(rel);
        if (mod !== null) {
            _handlers[key] = mod;
            watchFile(rel, key, 'esm');
            ok++;
        } else {
            failed.push(rel);
            fail++;
        }
    }

    if (fail === 0) {
        console.log(`\x1b[32m→ Reload   :\x1b[39m ${ok} ESM aktif, ${okCjs} CJS watched`);
    } else {
        console.log(`\x1b[33m→ Reload   :\x1b[39m ${ok} ESM aktif, ${okCjs} CJS watched, ${fail} gagal (${failed.join(', ')})`);
    }
}

export function getHandler(key) {
    return _handlers[key];
}

export function onReload(key, callback) {
    _reloadCallbacks[key] = callback;
}

export function stopHotReload() {
    for (const key of Object.keys(_watchers)) {
        try { _watchers[key].close(); } catch {}
        delete _watchers[key];
    }
    for (const key of Object.keys(_debounceTimers)) {
        clearTimeout(_debounceTimers[key]);
        delete _debounceTimers[key];
    }
    console.log('\x1b[33m[HotReload] Semua watcher dihentikan.\x1b[39m');
}
