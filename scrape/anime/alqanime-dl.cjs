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
 *  alqanime-dl.cjs — Downloader episode AlqAnime
 *  Download & kirim link episode anime ke WhatsApp
 * ───────────────────────────────
 */
'use strict';

const axios    = require('axios');
const cheerio  = require('cheerio');
const fs       = require('fs');
const path     = require('path');

const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

// ─── Ekstrak URL dari shortlink ouo.io ────────────────────────────────────
// Hanya berfungsi untuk format ouo.io/st/?s=URL (s= param berisi tujuan asli).
// True shortlink (ouo.io/XXXXX) diblok Cloudflare dari semua datacenter IP.
function resolveOuo(url) {
    try {
        const u = new URL(url);
        const real = u.searchParams.get('s');
        if (real) return decodeURIComponent(real);
    } catch (_) {}
    return null; // null = true shortlink, tidak bisa di-bypass
}

// ─── PixelDrain: langsung dari API ────────────────────────────────────────
async function resolvePixelDrain(url) {
    const id = url.match(/pixeldrain\.com\/(?:u|l)\/([^/?#]+)/)?.[1];
    if (!id) throw new Error('PixelDrain: ID tidak ditemukan');
    const directUrl = `https://pixeldrain.com/api/file/${id}`;
    const info = await axios.head(directUrl, { headers: { 'User-Agent': UA }, timeout: 10000 });
    const size = parseInt(info.headers['content-length'] || '0');
    const dispName = info.headers['content-disposition']?.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)?.[1]?.trim() || `pixeldrain_${id}.mp4`;
    return { directUrl, fileName: dispName, host: 'PixelDrain', size };
}

// ─── MediaFire: parse halaman HTML ────────────────────────────────────────
async function resolveMediaFire(url) {
    const res = await axios.get(url, {
        headers: { 'User-Agent': UA, 'Accept': 'text/html' },
        timeout: 20000,
    });
    const $ = cheerio.load(res.data);
    const directUrl = $('a[aria-label="Download file"]').attr('href')
                   || $('#downloadButton').attr('href')
                   || $('a.popsok').attr('href');
    if (!directUrl) throw new Error('MediaFire: link download tidak ditemukan di halaman');
    const info = await axios.head(directUrl, { headers: { 'User-Agent': UA }, timeout: 10000 });
    const size = parseInt(info.headers['content-length'] || '0');
    const dispName = info.headers['content-disposition']?.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)?.[1]?.trim()
                  || $('div.filename').text().trim()
                  || 'mediafire_video.mp4';
    return { directUrl, fileName: dispName, host: 'MediaFire', size };
}

// ─── AceFile: AJAX endpoint + HTML fallback ───────────────────────────────
async function resolveAceFile(url) {
    const fileId = url.match(/acefile\.co\/f\/(\d+)/)?.[1];
    if (!fileId) throw new Error('AceFile: ID tidak ditemukan');

    // Ekstrak nama file dari URL (slug setelah ID)
    const slugRaw = url.match(/acefile\.co\/f\/\d+\/([^/?#]+)/)?.[1] || '';
    const slugName = slugRaw
        ? slugRaw.replace(/-mp4$/, '.mp4').replace(/-mkv$/, '.mkv').replace(/-(\w{2,4})$/, '.$1').replace(/-/g, '_')
        : `acefile_${fileId}.mp4`;

    let directUrl = null;

    // Coba AJAX endpoint utama
    try {
        const res = await axios.post(
            'https://acefile.co/ajax.php',
            new URLSearchParams({ ajax: 'download', id: fileId }),
            {
                headers: {
                    'Content-Type': 'application/x-www-form-urlencoded',
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': url,
                    'User-Agent': UA,
                },
                timeout: 15000,
            }
        );
        directUrl = res.data?.url || res.data?.link || res.data?.download_url || res.data?.file || null;
        if (directUrl && typeof directUrl === 'object') directUrl = null;
    } catch (_) {}

    // Fallback: parse halaman HTML untuk ambil link download
    if (!directUrl) {
        const page = await axios.get(url, {
            headers: { 'User-Agent': UA, 'Accept': 'text/html', 'Referer': 'https://alqanime.net/' },
            timeout: 20000,
        });
        const html = typeof page.data === 'string' ? page.data : '';
        const match = html.match(/href=["'](https?:\/\/[^"']+acefile[^"']*(?:download|dl)[^"']+)["']/i)
                   || html.match(/["'](https?:\/\/(?:cdn|storage|dl|download)\.[^"']+\/[^"']+\.(?:mp4|mkv|avi))["']/i);
        if (match) directUrl = match[1];
    }

    if (!directUrl) throw new Error('AceFile: link download tidak ditemukan. Coba beberapa saat lagi.');

    const info = await axios.head(directUrl, { headers: { 'User-Agent': UA }, timeout: 10000 }).catch(() => ({ headers: {} }));
    const size = parseInt(info.headers['content-length'] || '0');
    const dispName = info.headers['content-disposition']?.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)?.[1]?.trim() || slugName;
    return { directUrl, fileName: dispName, host: 'AceFile', size };
}

// ─── Auto-resolve: deteksi host dan resolve ───────────────────────────────
async function resolveDirectLink(rawUrl) {
    let url = rawUrl.trim();

    // Buka ouo.io wrapper dulu (hanya format st/?s= yang bisa di-ekstrak)
    if (url.includes('ouo.io') || url.includes('ouo.press')) {
        const extracted = resolveOuo(url);
        if (!extracted) {
            // True ouo.io shortlink — diblok Cloudflare dari semua datacenter
            throw new Error('ouo.io:blocked');
        }
        url = extracted;
    }

    if (url.includes('pixeldrain.com'))  return await resolvePixelDrain(url);
    if (url.includes('mediafire.com'))   return await resolveMediaFire(url);
    if (url.includes('acefile.co'))      return await resolveAceFile(url);

    if (url.includes('gofile.io')) {
        throw new Error('GoFile membutuhkan akun premium — tidak bisa didownload otomatis.');
    }
    if (url.includes('terabox') || url.includes('1024terabox') || url.includes('4shared')) {
        throw new Error('Host ini tidak didukung untuk download otomatis.');
    }

    // Fallback: coba HEAD dulu, anggap direct
    const info = await axios.head(url, { headers: { 'User-Agent': UA }, timeout: 10000 }).catch(() => ({ headers: {} }));
    const size = parseInt(info.headers['content-length'] || '0');
    const dispName = info.headers['content-disposition']?.match(/filename[^;=\n]*=["']?([^"'\n;]+)/)?.[1]?.trim() || path.basename(new URL(url).pathname) || 'video.mp4';
    return { directUrl: url, fileName: dispName, host: 'Direct', size };
}

// ─── Format ukuran file ───────────────────────────────────────────────────
function formatSize(bytes) {
    if (!bytes) return '? MB';
    if (bytes < 1024 * 1024)   return `${(bytes / 1024).toFixed(1)} KB`;
    if (bytes < 1024 ** 3)     return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
    return `${(bytes / 1024 ** 3).toFixed(2)} GB`;
}

// ─── Stream download ke file tmp dengan progress callback ─────────────────
async function downloadToTmp(directUrl, destPath, onProgress) {
    const res = await axios.get(directUrl, {
        headers: { 'User-Agent': UA },
        responseType: 'stream',
        timeout: 0,
    });

    const total = parseInt(res.headers['content-length'] || '0');
    let downloaded = 0;
    let lastReport = 0;

    return new Promise((resolve, reject) => {
        const writer = fs.createWriteStream(destPath);
        res.data.on('data', chunk => {
            downloaded += chunk.length;
            const now = Date.now();
            if (onProgress && now - lastReport > 3000) {
                lastReport = now;
                const pct = total ? Math.round((downloaded / total) * 100) : 0;
                onProgress(downloaded, total, pct).catch(() => {});
            }
        });
        res.data.pipe(writer);
        writer.on('finish', resolve);
        writer.on('error', reject);
        res.data.on('error', reject);
    });
}

module.exports = { resolveDirectLink, downloadToTmp, formatSize };

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleAlqdownload({ hisoka, m, query, tolak, logCommand, logError, fs, path }) {
	try {
		const input = (query || '').trim();
		const pfx   = m.prefix || '.';

		if (!input) {
			await tolak(hisoka, m,
				`╭─「 📥 *ALQANIME DOWNLOADER* 」\n│\n│ Download video anime dari alqanime.net\n│ langsung ke WhatsApp.\n│\n` +
				`│ *Format:*\n│ ${pfx}alqdl <link>\n│ ${pfx}alqdl <link> zip\n│\n` +
				`│ *Host yang didukung:*\n│ ✅ PixelDrain\n│ ✅ MediaFire\n│ ✅ AceFile\n│ ✅ ouo.io (wrapper otomatis terbuka)\n│\n` +
				`│ *Contoh:*\n│ ${pfx}alqdl https://pixeldrain.com/u/xxx\n│ ${pfx}alqdl https://pixeldrain.com/u/xxx zip\n│ ${pfx}alqdl https://mediafire.com/...\n│\n` +
				`│ 💡 Salin link dari hasil ${pfx}alq <judul>\n╰──────────────────────`
			);
			return;
		}

		const { resolveDirectLink, downloadToTmp, formatSize } = exports;

		const parts   = input.split(/\s+/);
		const rawUrl  = parts[0];
		const wantZip = parts.slice(1).some(p => p.toLowerCase() === 'zip');

		await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });
		const loadingMsg = await tolak(hisoka, m, `🔍 Memeriksa link...\n🔗 ${rawUrl.slice(0, 60)}...`);

		let resolved;
		try {
			resolved = await resolveDirectLink(rawUrl);
		} catch (resolveErr) {
			await m.reply({ edit: loadingMsg.key, text: `❌ Gagal resolve link:\n${resolveErr.message}` });
			await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
			return;
		}

		const { directUrl, fileName, host, size } = resolved;
		const sizeStr  = formatSize(size);
		const MAX_BYTES = 1.9 * 1024 * 1024 * 1024;

		if (size && size > MAX_BYTES) {
			await m.reply({ edit: loadingMsg.key, text: `❌ File terlalu besar (${sizeStr}). Maksimal ~1.9 GB.` });
			return;
		}

		await m.reply({
			edit: loadingMsg.key,
			text: `📥 *Mulai download...*\n🏠 Host    : ${host}\n📄 File    : ${fileName}\n💾 Ukuran  : ${sizeStr}\n📦 Format  : ${wantZip ? 'ZIP' : 'Video/Dokumen'}\n[░░░░░░░░░░] 0%`,
		});

		const tmpId   = Date.now();
		const tmpDir  = path.join(process.cwd(), 'tmp');
		const tmpFile = path.join(tmpDir, `alqdl_${tmpId}_${fileName}`);

		try {
			await downloadToTmp(directUrl, tmpFile, async (done, total, pct) => {
				const filled  = Math.round(pct / 10);
				const bar     = '█'.repeat(filled) + '░'.repeat(10 - filled);
				const doneStr = formatSize(done);
				try { await m.reply({ edit: loadingMsg.key, text: `📥 *Mengunduh...*\n🏠 Host    : ${host}\n📄 File    : ${fileName}\n💾 Ukuran  : ${sizeStr}\n[${bar}] ${pct}% (${doneStr})` }); } catch (_) {}
			});

			await m.reply({ edit: loadingMsg.key, text: `✅ Download selesai! Mengirim file...` });
			const fileBuf = fs.readFileSync(tmpFile);

			if (wantZip) {
				const archiver    = require('archiver');
				const { PassThrough } = require('stream');
				const zipName = fileName.replace(/\.(mp4|mkv|avi)$/i, '') + '.zip';
				const zipBuf  = await new Promise((res, rej) => {
					const chunks  = [];
					const archive = archiver('zip', { zlib: { level: 6 } });
					const pass    = new PassThrough();
					pass.on('data', c => chunks.push(c));
					pass.on('end',  () => res(Buffer.concat(chunks)));
					pass.on('error', rej);
					archive.pipe(pass);
					archive.append(fileBuf, { name: fileName });
					archive.finalize();
				});
				await hisoka.sendMessage(m.from, { document: zipBuf, mimetype: 'application/zip', fileName: zipName, caption: `📦 *${zipName}*\n💾 ${formatSize(zipBuf.length)}` }, { quoted: m });
			} else {
				const ext     = path.extname(fileName).toLowerCase();
				const isVideo = ['.mp4','.mkv','.avi','.webm'].includes(ext);
				if (isVideo) {
					await hisoka.sendMessage(m.from, { video: fileBuf, mimetype: 'video/mp4', fileName, caption: `🎬 *${fileName}*\n💾 ${sizeStr} | 🏠 ${host}` }, { quoted: m });
				} else {
					await hisoka.sendMessage(m.from, { document: fileBuf, mimetype: 'application/octet-stream', fileName, caption: `📄 *${fileName}*\n💾 ${sizeStr} | 🏠 ${host}` }, { quoted: m });
				}
			}

			await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
			await m.reply({ edit: loadingMsg.key, text: `✅ *Selesai!*\n📄 ${fileName}\n💾 ${sizeStr} | 🏠 ${host}` });
		} finally {
			try { fs.unlinkSync(tmpFile); } catch (_) {}
		}
	} catch (err) {
		console.error('[ALQDL] Error:', err?.message);
		if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'alqdl');
		await tolak(hisoka, m, `❌ Gagal download.\n💬 ${err?.message?.slice(0, 150) || 'Coba lagi nanti'}`);
		await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
	}
}

module.exports.handleAlqdownload = handleAlqdownload;
