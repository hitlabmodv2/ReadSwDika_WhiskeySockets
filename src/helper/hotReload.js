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
 *  Auto-discover file baru di folder yang diawasi (SEMUA_FITUR,
 *  src/helper, src/db, src/config) — tidak perlu daftar manual lagi.
 *  Watch file perubahan, reload ESM dengan cache-busting,
 *  clear require.cache untuk CJS.
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Hot Reload — Reload Modul Tanpa Restart Bot
 *  Pantau perubahan file scraper/handler SECARA OTOMATIS (recursive
 *  directory watch), reload otomatis dengan cache-busting ESM —
 *  memungkinkan update fitur tanpa perlu mematikan/menyalakan bot,
 *  DAN file baru yang ditambahkan ke folder yang diawasi otomatis
 *  ikut ter-watch tanpa perlu didaftarkan manual.
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
const _debounceTimers = {};
const _reloadCallbacks = {};
const _trackedFiles = new Set(); // rel path yang sudah dikenal (sudah pernah di-load/watch)
const _rootWatchers = {};

// ── File tunggal di luar WATCH_ROOTS (root project) ──────────────
const EXTRA_ESM_FILES = [
    { key: 'message', rel: 'message.js' },
];

// ── Folder yang otomatis di-scan + di-watch (recursive) ──────────
// Semua file .js (ESM) & .cjs (CJS) di dalam folder ini otomatis
// terdaftar tanpa perlu ditambahkan manual satu-satu.
const WATCH_ROOTS = ['SEMUA_FITUR', 'src/helper', 'src/db', 'src/config'];

// ── Key override, supaya key lama (dipakai getHandler() di tempat
//    lain) tetap konsisten walau sistemnya sekarang auto-discovery.
const KEY_OVERRIDES = {
    'SEMUA_FITUR/antidel/antidelete.js': 'antidelete',
    'SEMUA_FITUR/antitagsw/antitagsw.js': 'antitagsw',
    'SEMUA_FITUR/antilink/antilink.js': 'antilink',
    'SEMUA_FITUR/antitag/antitag.js': 'antitagbot',
    'SEMUA_FITUR/event/event.js': 'event',
    'SEMUA_FITUR/helper/emoji.js': 'featureEmoji',
    'SEMUA_FITUR/menu/menu_utama.js': 'menuUtama',
    'SEMUA_FITUR/menu/menu_jadibot.js': 'menuJadibot',
    'src/helper/index.js': 'helperIndex',
    'src/helper/AiPromptFb.js': 'aiPromptFb',
    'src/helper/AiPromptIg.js': 'aiPromptIg',
};

// ── SKIP — file yang TIDAK BOLEH di-hot-reload sama sekali ───────
// ESM yang memegang state/timer/koneksi aktif → reload bisa bikin
// state ganda / socket ganda / crash:
//   crashGuard.js    → handle signal proses, berbahaya
//   hotReload.js     → dirinya sendiri
//   memoryMonitor.js → timer RAM aktif
//   jadibot.js       → sesi aktif user lain
//   authState.js     → pegang creds/session WA di memory
//   browserSwitch.js → manage koneksi socket aktif
//   aiHistory.js     → punya _writeLock promise, bahaya direload saat menulis
// CJS top-level yang di-load saat startup (butuh restart bot):
//   wm, cekauto-cmd, interactive-msg, media-helper, log-cmd, jadibot-cmd,
//   alqolam-helpers, wily-helpers, autosimi-cmd, musikai-cmd, musikai2-cmd,
//   alqanime-cmd, cosplay-cmd, komiktap-cmd, setbrowser-cmd, play-cmd
const EXCLUDED_FILES = new Set([
    'src/helper/crashGuard.js',
    'src/helper/hotReload.js',
    'src/helper/memoryMonitor.js',
    'src/helper/jadibot.js',
    'src/helper/authState.js',
    'src/helper/browserSwitch.js',
    'src/db/aiHistory.js',

    'SEMUA_FITUR/media/wm.cjs',
    'SEMUA_FITUR/setting/cekauto-cmd.cjs',
    'SEMUA_FITUR/helper/interactive-msg.cjs',
    'SEMUA_FITUR/helper/media-helper.cjs',
    'SEMUA_FITUR/helper/log-cmd.cjs',
    'SEMUA_FITUR/jadibot/jadibot-cmd.cjs',
    'SEMUA_FITUR/anime/alqolam-helpers.cjs',
    'SEMUA_FITUR/ai/wily-helpers.cjs',
    'SEMUA_FITUR/ai/autosimi-cmd.cjs',
    'SEMUA_FITUR/music/musikai-cmd.cjs',
    'SEMUA_FITUR/music/musikai2-cmd.cjs',
    'SEMUA_FITUR/music/play-cmd.cjs',
    'SEMUA_FITUR/anime/alqanime-cmd.cjs',
    'SEMUA_FITUR/anime/cosplay-cmd.cjs',
    'SEMUA_FITUR/anime/komiktap-cmd.cjs',
    'SEMUA_FITUR/setting/setbrowser-cmd.cjs',
]);

const WATCHABLE_EXT = new Set(['.js', '.cjs']);

function toRel(abs) {
    return path.relative(ROOT, abs).split(path.sep).join('/');
}

function typeOf(rel) {
    return rel.endsWith('.cjs') ? 'cjs' : 'esm';
}

function deriveKey(rel, type) {
    if (KEY_OVERRIDES[rel]) return KEY_OVERRIDES[rel];
    return (type === 'cjs' ? 'cjs:' : 'auto:') + rel;
}

// Scan 1 folder secara rekursif, kembalikan semua rel path file
// yang bisa diwatch (sudah dikurangi file yang di-exclude).
function scanDir(dir, out = []) {
    const abs = path.join(ROOT, dir);
    if (!fs.existsSync(abs)) return out;

    for (const entry of fs.readdirSync(abs, { withFileTypes: true })) {
        const entryAbs = path.join(abs, entry.name);
        const entryRel = toRel(entryAbs);

        if (entry.isDirectory()) {
            if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
            scanDir(entryRel, out);
        } else if (entry.isFile() && WATCHABLE_EXT.has(path.extname(entry.name))) {
            if (EXCLUDED_FILES.has(entryRel)) continue;
            out.push(entryRel);
        }
    }
    return out;
}

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

async function runCallback(key, rel) {
    if (typeof _reloadCallbacks[key] === 'function') {
        try {
            await _reloadCallbacks[key](rel);
        } catch (cbErr) {
            console.error(`\x1b[31m[HotReload] Callback error for '${key}':\x1b[39m`, cbErr.message);
        }
    }
}

// Proses 1 file yang berubah/baru terdeteksi (dipakai oleh watcher
// recursive folder maupun watcher file tunggal message.js).
async function handleFileEvent(rel) {
    if (EXCLUDED_FILES.has(rel)) return;
    if (!WATCHABLE_EXT.has(path.extname(rel))) return;

    const abs = path.join(ROOT, rel);
    const type = typeOf(rel);
    const key = deriveKey(rel, type);
    const isNew = !_trackedFiles.has(rel);

    if (!fs.existsSync(abs)) {
        // File dihapus/di-rename keluar
        if (isNew) return; // bukan file yang pernah dikenal, abaikan
        _trackedFiles.delete(rel);
        if (type === 'cjs') clearCjsCache(abs);
        else delete _handlers[key];
        console.log(`\x1b[33m[HotReload] File dihapus, dilepas dari watch: ${rel}\x1b[39m`);
        return;
    }

    _trackedFiles.add(rel);

    if (type === 'cjs') {
        const cleared = clearCjsCache(abs);
        if (isNew) {
            console.log(`\x1b[36m[HotReload] File baru terdeteksi (CJS, auto-watched): ${rel}\x1b[39m`);
        } else {
            console.log(`\x1b[36m[HotReload] Perubahan terdeteksi: ${rel}\x1b[39m`);
            if (cleared) {
                console.log(`\x1b[32m[HotReload] ✓ CJS cache cleared: ${rel} — efektif di pemanggilan berikutnya!\x1b[39m`);
            } else {
                console.log(`\x1b[32m[HotReload] ✓ CJS watch aktif: ${rel}\x1b[39m`);
            }
        }
        await runCallback(key, rel);
    } else {
        if (!isNew) console.log(`\x1b[36m[HotReload] Perubahan terdeteksi: ${rel}\x1b[39m`);
        const mod = await loadModule(rel);
        if (mod !== null) {
            _handlers[key] = mod;
            if (isNew) {
                console.log(`\x1b[36m[HotReload] File baru terdeteksi (ESM, auto-watched): ${rel}\x1b[39m`);
            } else {
                console.log(`\x1b[32m[HotReload] ✓ '${rel}' berhasil di-reload tanpa restart bot!\x1b[39m`);
            }
            await runCallback(key, rel);
        } else if (!isNew) {
            console.error(`\x1b[31m[HotReload] ✗ Gagal reload '${rel}', pakai versi lama.\x1b[39m`);
        }
    }
}

function debouncedHandle(rel) {
    clearTimeout(_debounceTimers[rel]);
    _debounceTimers[rel] = setTimeout(() => {
        handleFileEvent(rel).catch((err) => {
            console.error(`\x1b[31m[HotReload] Error handling '${rel}':\x1b[39m`, err.message);
        });
    }, DEBOUNCE_MS);
}

// Watch 1 folder root secara recursive — meng-cover SEMUA file di
// dalamnya termasuk file baru yang belum pernah ada saat startup.
function watchRoot(rootRel) {
    const abs = path.join(ROOT, rootRel);
    if (!fs.existsSync(abs)) return;

    if (_rootWatchers[rootRel]) {
        try { _rootWatchers[rootRel].close(); } catch {}
    }

    try {
        _rootWatchers[rootRel] = fs.watch(abs, { recursive: true, persistent: true }, (event, filename) => {
            if (!filename) return;
            const rel = toRel(path.join(abs, filename));
            if (!WATCHABLE_EXT.has(path.extname(rel))) return;
            debouncedHandle(rel);
        });
        return true;
    } catch (err) {
        console.error(`\x1b[31m[HotReload] Gagal watch folder '${rootRel}' (recursive):\x1b[39m`, err.message);
        return false;
    }
}

function watchSingleFile(rel) {
    const abs = path.join(ROOT, rel);
    if (!fs.existsSync(abs)) return;

    try {
        fs.watch(abs, { persistent: false }, (event) => {
            if (event !== 'change' && event !== 'rename') return;
            debouncedHandle(rel);
        });
    } catch (err) {
        console.error(`\x1b[31m[HotReload] Tidak bisa watch '${rel}':\x1b[39m`, err.message);
    }
}

export async function initHotReload() {
    let okEsm = 0;
    let okCjs = 0;
    let fail = 0;
    const failed = [];

    // 1) File tunggal di root project (message.js, dst)
    for (const { key, rel } of EXTRA_ESM_FILES) {
        const abs = path.join(ROOT, rel);
        if (!fs.existsSync(abs)) continue;
        const mod = await loadModule(rel);
        if (mod !== null) {
            _handlers[key] = mod;
            _trackedFiles.add(rel);
            watchSingleFile(rel);
            okEsm++;
        } else {
            failed.push(rel);
            fail++;
        }
    }

    // 2) Auto-discover semua file di WATCH_ROOTS
    const discovered = [];
    for (const root of WATCH_ROOTS) discovered.push(...scanDir(root));

    for (const rel of discovered) {
        const type = typeOf(rel);
        const key = deriveKey(rel, type);

        if (type === 'cjs') {
            // CJS: lazy — tidak perlu load sekarang, cukup ditandai known
            // supaya nanti kalau berubah, cache-nya bisa dibersihkan.
            _trackedFiles.add(rel);
            okCjs++;
            continue;
        }

        const mod = await loadModule(rel);
        if (mod !== null) {
            _handlers[key] = mod;
            _trackedFiles.add(rel);
            okEsm++;
        } else {
            failed.push(rel);
            fail++;
        }
    }

    // 3) Pasang 1 recursive watcher per folder root — otomatis
    //    mendeteksi file baru + perubahan file lama, real-time.
    let watchedRoots = 0;
    for (const root of WATCH_ROOTS) {
        if (watchRoot(root)) watchedRoots++;
    }

    if (fail === 0) {
        console.log(`\x1b[32m→ Reload   :\x1b[39m ${okEsm} ESM aktif, ${okCjs} CJS watched, ${watchedRoots} folder auto-scan`);
    } else {
        console.log(`\x1b[33m→ Reload   :\x1b[39m ${okEsm} ESM aktif, ${okCjs} CJS watched, ${watchedRoots} folder auto-scan, ${fail} gagal (${failed.join(', ')})`);
    }
}

export function getHandler(key) {
    return _handlers[key];
}

export function onReload(key, callback) {
    _reloadCallbacks[key] = callback;
}

export function stopHotReload() {
    for (const key of Object.keys(_rootWatchers)) {
        try { _rootWatchers[key].close(); } catch {}
        delete _rootWatchers[key];
    }
    for (const key of Object.keys(_debounceTimers)) {
        clearTimeout(_debounceTimers[key]);
        delete _debounceTimers[key];
    }
    console.log('\x1b[33m[HotReload] Semua watcher dihentikan.\x1b[39m');
}

export function getWatchedFiles() {
    return Array.from(_trackedFiles);
}

export function getReloadStats() {
    const files = Array.from(_trackedFiles);
    let esmCount = 0;
    let cjsCount = 0;

    for (const rel of files) {
        if (typeOf(rel) === 'cjs') cjsCount++;
        else esmCount++;
    }

    const activeRoots = WATCH_ROOTS.filter((root) => fs.existsSync(path.join(ROOT, root)));

    return {
        total: files.length,
        esmCount,
        cjsCount,
        roots: activeRoots,
        excludedCount: EXCLUDED_FILES.size,
    };
}
