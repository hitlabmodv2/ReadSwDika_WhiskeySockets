'use strict';

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
 */

/**
 * ─────────────────────────────────────
 *  Backup Handler
 *  Hanya bisa dipanggil oleh Owner (main bot)
 * ─────────────────────────────────────
 *
 *  runBackup(hisoka, m, query, tolak, loadConfig, logCommand)
 *    → Buat zip backup seluruh file bot (kecuali yang dikecualikan)
 *    → Kirim ke semua owner via WhatsApp
 *    → Command: .backup [nama_file]
 *
 *  File yang DIKECUALIKAN dari backup:
 *    - attached_assets, .git, .agents, sessions, jadibot
 *    - .upm, node_modules, package-lock.json
 *    - .cache, .local
 *    - zipFile.zip, zuhur.jpg, ashar.jpg, push.sh
 *    - .push_history.log, .token.secret
 *    - bin/yt-dlp
 *    - semua file/folder tersembunyi (.*) kecuali .env, .gitignore, .npmrc
 * ─────────────────────────────────────
 */

const fs   = require('fs');
const path = require('path');

/**
 * Jalankan proses backup bot.
 *
 * @param {object}   hisoka      - koneksi Baileys
 * @param {object}   m           - objek pesan
 * @param {string}   query       - argumen dari perintah (nama zip opsional)
 * @param {Function} tolak       - fungsi kirim pesan
 * @param {Function} loadConfig  - fungsi load config.json
 * @param {Function} logCommand  - fungsi log perintah
 */
async function runBackup(hisoka, m, query, tolak, loadConfig, logCommand) {
    const archiver = require('archiver');
    const config   = loadConfig();
    const owners   = config.owners || [];

    const EXCLUDED = new Set([
        'attached_assets', '.git', '.agents', 'sessions', 'jadibot',
        '.upm', 'node_modules', 'package-lock.json',
        '.cache', '.local',
        'zipFile.zip', 'zuhur.jpg', 'ashar.jpg', 'push.sh',
        '.push_history.log', '.token.secret'
    ]);

    const EXCLUDED_FILES = new Set([
        'bin/yt-dlp'
    ]);

    const HIDDEN_WHITELIST = new Set(['.env', '.gitignore', '.npmrc']);

    const isHidden = (name) => name.startsWith('.') && !HIDDEN_WHITELIST.has(name);

    const rootDir = process.cwd();

    const allItems      = fs.readdirSync(rootDir);
    const includedItems = allItems.filter(i => !EXCLUDED.has(i) && !isHidden(i));
    const excludedItems = allItems.filter(i => EXCLUDED.has(i) || isHidden(i));

    function countFilesRecursive(dir, relBase = '') {
        let count = 0;
        try {
            const items = fs.readdirSync(dir, { withFileTypes: true });
            for (const item of items) {
                if (EXCLUDED.has(item.name)) continue;
                if (!relBase && isHidden(item.name)) continue;
                const relPath = relBase ? `${relBase}/${item.name}` : item.name;
                if (EXCLUDED_FILES.has(relPath)) continue;
                if (item.isDirectory()) {
                    count += countFilesRecursive(path.join(dir, item.name), relPath);
                } else {
                    count++;
                }
            }
        } catch {}
        return count;
    }

    const totalFiles = countFilesRecursive(rootDir);

    const includedFolders = includedItems.filter(i => {
        try { return fs.statSync(path.join(rootDir, i)).isDirectory(); } catch { return false; }
    });
    const includedFiles = includedItems.filter(i => {
        try { return fs.statSync(path.join(rootDir, i)).isFile(); } catch { return false; }
    });

    function getFolderStats(dirPath) {
        try {
            const items   = fs.readdirSync(dirPath, { withFileTypes: true });
            const files   = items.filter(i => i.isFile()).length;
            const folders = items.filter(i => i.isDirectory()).length;
            return { files, folders };
        } catch { return { files: 0, folders: 0 }; }
    }

    const folderLines = includedFolders.map((f, i) => {
        const isLast = i === includedFolders.length - 1;
        const prefix = isLast ? '└─' : '├─';
        const { files, folders } = getFolderStats(path.join(rootDir, f));
        const detail = [
            files   ? `${files} file`   : '',
            folders ? `${folders} folder` : ''
        ].filter(Boolean).join(', ') || 'kosong';
        return `${prefix} 📂 *${f}/* → _${detail}_`;
    });

    const fileLines = includedFiles.map((f, i) => {
        const isLast = i === includedFiles.length - 1;
        const prefix = isLast ? '└─' : '├─';
        return `${prefix} 📄 ${f}`;
    });

    await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

    await tolak(hisoka, m,
        `╭─「 🗜️ *BACKUP BOT* 」\n` +
        `│\n` +
        `│ ⏳ _Sedang memproses backup..._\n` +
        `│\n` +
        `├─ 📁 *Folder (${includedFolders.length})*\n` +
        folderLines.map(l => `│  ${l}`).join('\n') + '\n' +
        `│\n` +
        `├─ 📄 *File Root (${includedFiles.length})*\n` +
        fileLines.map(l => `│  ${l}`).join('\n') + '\n' +
        `│\n` +
        `├─ 🗂️ *Total keseluruhan:* ${totalFiles} file\n` +
        `│\n` +
        `├─ 🚫 *Dikecualikan (${excludedItems.length}):*\n` +
        `│  ├─ ${allItems.filter(i => EXCLUDED.has(i)).join(', ')}\n` +
        `│  ├─ _semua file tersembunyi (.*)_\n` +
        `│  └─ bin/yt-dlp _(auto-download)_\n` +
        `│\n` +
        `╰─ _Membuat zip, harap tunggu..._`
    );

    const BOT_ENV_PREFIXES = ['BOT_', 'WILY_', 'GEMINI_', 'REACT_'];
    const BOT_ENV_EXACT    = new Set(['NODE_ENV']);
    const envEntries = Object.entries(process.env)
        .filter(([k]) => BOT_ENV_PREFIXES.some(p => k.startsWith(p)) || BOT_ENV_EXACT.has(k))
        .sort(([a], [b]) => a.localeCompare(b));
    const envContent = envEntries.length
        ? envEntries.map(([k, v]) => `${k}=${v}`).join('\n') + '\n'
        : '# Tidak ada variabel lingkungan bot yang ditemukan\n';
    const envBuffer = Buffer.from(envContent, 'utf8');

    const rawZipName = query
        ? query.trim().replace(/[\\/:*?"<>|]/g, '').replace(/\s+/g, '_').slice(0, 80)
        : `Readsw_${Date.now()}`;
    const zipName = rawZipName.endsWith('.zip') ? rawZipName : `${rawZipName}.zip`;
    const zipPath = path.join('/tmp', zipName);
    const output  = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    await new Promise((resolve, reject) => {
        output.on('close', resolve);
        archive.on('error', reject);
        archive.pipe(output);

        function addToArchive(arc, absPath, relPath) {
            const stat = fs.statSync(absPath);
            if (stat.isDirectory()) {
                const children = fs.readdirSync(absPath);
                for (const child of children) {
                    const childRel = `${relPath}/${child}`;
                    if (EXCLUDED_FILES.has(childRel)) continue;
                    addToArchive(arc, path.join(absPath, child), childRel);
                }
            } else {
                arc.file(absPath, { name: relPath });
            }
        }

        for (const item of includedItems) {
            const fullPath = path.join(rootDir, item);
            addToArchive(archive, fullPath, item);
        }

        archive.append(envBuffer, { name: '.env' });
        archive.finalize();
    });

    const zipBuffer  = fs.readFileSync(zipPath);
    const zipSizeMB  = (zipBuffer.length / 1024 / 1024).toFixed(2);

    const envInfoLine = envEntries.length
        ? `🔑 *.env* → ${envEntries.length} variabel (${envEntries.map(([k]) => k).join(', ')})`
        : `🔑 *.env* → tidak ada variabel bot`;

    const zipCaption =
        `╭─「 📦 *BACKUP SELESAI* 」\n` +
        `│\n` +
        `├─ 🗜️ *File :* ${zipName}\n` +
        `├─ 📏 *Ukuran :* ${zipSizeMB} MB\n` +
        `├─ 🗂️ *Total :* ${totalFiles} file\n` +
        `│\n` +
        `├─ 📁 *Folder (${includedFolders.length})*\n` +
        includedFolders.map(f => {
            const { files, folders } = getFolderStats(path.join(rootDir, f));
            const detail = [files ? `${files} file` : '', folders ? `${folders} folder` : ''].filter(Boolean).join(', ') || 'kosong';
            return `│  └─ ${f}/ → ${detail}`;
        }).join('\n') + '\n' +
        `│\n` +
        `├─ ${envInfoLine}\n` +
        `│\n` +
        `├─ 🚫 *Exclude :* ${allItems.filter(i => EXCLUDED.has(i)).join(', ')}, semua file tersembunyi (.*), bin/yt-dlp\n` +
        `│\n` +
        `╰─ 🕐 ${new Date().toLocaleString('id-ID')}`;

    const sentTo = [];
    for (const ownerNum of owners) {
        const ownerJid = `${ownerNum}@s.whatsapp.net`;
        try {
            await hisoka.sendMessage(ownerJid, {
                document: zipBuffer,
                fileName: zipName,
                mimetype: 'application/zip',
                caption: zipCaption,
            });
            sentTo.push(ownerNum);
        } catch (e) {
            console.error('[Backup] Gagal kirim ke', ownerNum, e.message);
        }
    }

    try { fs.unlinkSync(zipPath); } catch {}

    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

    await tolak(hisoka, m,
        sentTo.length
        ? `╭─「 ✅ *BACKUP BERHASIL* 」\n` +
          `│\n` +
          `├─ 📏 *Ukuran :* ${zipSizeMB} MB\n` +
          `├─ 🗂️ *Total file :* ${totalFiles}\n` +
          `│\n` +
          `├─ 📨 *Terkirim ke ${sentTo.length} owner:*\n` +
          sentTo.map((n, i) => `│  ${i + 1}. +${n}`).join('\n') + '\n' +
          `│\n` +
          `╰─ 🕐 ${new Date().toLocaleString('id-ID')}`
        : `╭─「 ⚠️ *BACKUP* 」\n│\n├─ Zip dibuat tapi gagal kirim ke semua owner.\n╰─ Cek nomor owner di config.json`
    );

    logCommand(m, hisoka, 'backup');
}

module.exports = { runBackup };
