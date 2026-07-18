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
 *  hdvid.cjs — Enhance kualitas gambar HD via AI
 *  Upscale gambar lewat alwayscodex ai-enhance
 *  Support: reply gambar / kirim gambar + caption .hd
 * ───────────────────────────────
 */
'use strict';

const crypto = require('crypto');

// ── Upload buffer ke freeimage.host → dapat URL publik ─────────────────────
async function uploadToFreeimage(buffer, mimeType = 'image/jpeg') {
    const b64 = buffer.toString('base64');
    const params = new URLSearchParams();
    params.append('key', '6d207e02198a847aa98d0a2a901485a5');
    params.append('action', 'upload');
    params.append('source', b64);
    params.append('format', 'json');

    const res = await fetch('https://freeimage.host/api/1/upload', {
        method : 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body   : params.toString(),
        signal : AbortSignal.timeout(30000),
    });
    if (!res.ok) throw new Error(`freeimage.host HTTP ${res.status}`);
    const json = await res.json();
    const url = json?.image?.url;
    if (!url) throw new Error('freeimage.host: tidak ada URL di respons');
    return url;
}

// ── Enhance gambar via alwayscodex ai-enhance ──────────────────────────────
async function enhanceImageUrl(publicUrl) {
    const apiUrl = `https://api.alwayscodex.my.id/api/imagehd/ai-enhance?url=${encodeURIComponent(publicUrl)}`;
    const res = await fetch(apiUrl, {
        signal: AbortSignal.timeout(45000),
        headers: { 'User-Agent': 'Mozilla/5.0' },
    });
    if (!res.ok) throw new Error(`alwayscodex HTTP ${res.status}`);
    const ct = res.headers.get('content-type') || '';
    if (!ct.includes('image/')) throw new Error(`Respons bukan gambar: ${ct}`);
    return Buffer.from(await res.arrayBuffer());
}

// ── Main: upload buffer → get URL → enhance ────────────────────────────────
async function enhanceImageBuffer(buffer, mimeType = 'image/jpeg') {
    const publicUrl = await uploadToFreeimage(buffer, mimeType);
    console.log('[HD] Upload OK:', publicUrl);
    return await enhanceImageUrl(publicUrl);
}

// ── Video enhancer (tetap pakai unblurimage.ai) ────────────────────────────
async function hdvideo(buffer) {
    const baseApi       = 'https://api.unblurimage.ai';
    const productSerial = crypto.randomUUID().replace(/-/g, '');
    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function jsonFetch(url, options = {}) {
        const res  = await fetch(url, options);
        const text = await res.text();
        let json;
        try { json = text ? JSON.parse(text) : null; } catch { return { __httpError: true, status: res.status, raw: text }; }
        if (!res.ok) return { __httpError: true, status: res.status, raw: json };
        return json;
    }

    const uploadForm = new FormData();
    uploadForm.set('video_file_name', `cli-${Date.now()}.mp4`);
    const uploadResp = await jsonFetch(`${baseApi}/api/upscaler/v1/ai-video-enhancer/upload-video`, { method: 'POST', body: uploadForm });
    if (uploadResp.__httpError || uploadResp.code !== 100000) throw new Error('Upload video gagal');

    const { url: uploadUrl, object_name } = uploadResp.result || {};
    if (!uploadUrl || !object_name) throw new Error('Upload invalid');

    const putRes = await fetch(uploadUrl, { method: 'PUT', headers: { 'content-type': 'video/mp4' }, body: buffer });
    if (!putRes.ok) throw new Error('PUT video gagal');

    const cdnUrl  = `https://cdn.unblurimage.ai/${object_name}`;
    const jobForm = new FormData();
    jobForm.set('original_video_file', cdnUrl);
    jobForm.set('resolution', '2k');
    jobForm.set('is_preview', 'false');

    const createJobResp = await jsonFetch(`${baseApi}/api/upscaler/v2/ai-video-enhancer/create-job`, {
        method: 'POST', body: jobForm,
        headers: { 'product-serial': productSerial, authorization: '' },
    });
    if (createJobResp.__httpError || createJobResp.code !== 100000) throw new Error('Create job gagal');
    const { job_id } = createJobResp.result || {};
    if (!job_id) throw new Error('Job tidak valid');

    const startTime = Date.now();
    let attempt = 0;
    let result;
    while (true) {
        attempt++;
        const jobResp = await jsonFetch(`${baseApi}/api/upscaler/v2/ai-video-enhancer/get-job/${job_id}`, {
            method: 'GET',
            headers: { 'product-serial': productSerial, authorization: '' },
        });
        if (jobResp.__httpError) throw new Error('Get job gagal');
        if (jobResp.code === 100000) {
            result = jobResp.result || {};
            if (result.output_url) break;
        }
        if (Date.now() - startTime > 600000) throw new Error('Timeout proses video (10 menit)');
        await sleep(attempt === 1 ? 20000 : 10000);
    }
    return result.output_url;
}

module.exports = { hdvideo, enhanceImageBuffer };

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleHdvideo({ hisoka, m, query, tolak, logCommand, fs, path, quoted, downloadMediaMessage }) {
    try {
        const isMediaMsg    = m.isMedia && (m.type === 'imageMessage' || m.type === 'videoMessage' || m.type === 'stickerMessage');
        const isQuotedMedia = m.isQuoted && quoted && quoted.isMedia &&
            (quoted.type === 'imageMessage' || quoted.type === 'videoMessage' || quoted.type === 'stickerMessage');

        // ── Tidak ada media: tampilkan panduan ─────────────────────────────
        if (!isMediaMsg && !isQuotedMedia) {
            await tolak(hisoka, m,
                `🖼️ *HD Enhancer*\n\n` +
                `Tingkatkan kualitas gambar jadi lebih tajam & jernih via AI.\n\n` +
                `*Cara pakai:*\n` +
                `• Kirim gambar dengan caption *.hd*\n` +
                `• Atau reply ke gambar dengan *.hd*\n\n` +
                `*Untuk video:*\n` +
                `• Ketik *.hdvid* / *.vidhd* / *.hdvideo*`
            );
            logCommand(m, hisoka, m.command || 'hd');
            return;
        }

        // ── Download media ─────────────────────────────────────────────────
        let mediaBuffer, mediaType;
        if (isMediaMsg) {
            mediaBuffer = await m.downloadMedia();
            mediaType   = m.type;
        } else {
            mediaBuffer = await downloadMediaMessage(
                { ...m.quoted, message: m.quoted.raw }, 'buffer', {},
                { logger: hisoka.logger, reuploadRequest: hisoka.updateMediaMessage }
            );
            mediaType = quoted.type;
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            await tolak(hisoka, m, '❌ Gagal download media. Coba kirim ulang!');
            return;
        }

        const isVideo = mediaType === 'videoMessage';
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });

        // ── VIDEO ──────────────────────────────────────────────────────────
        if (isVideo) {
            await tolak(hisoka, m, `⏳ Sedang memproses video ke HD...\nProses ini bisa memakan waktu beberapa menit.`);
            const resultUrl = await hdvideo(mediaBuffer);
            const videoFetch = await fetch(resultUrl);
            if (!videoFetch.ok) throw new Error('Gagal download hasil video HD');
            let videoBuffer = Buffer.from(await videoFetch.arrayBuffer());

            // Watermark timestamp
            const util      = require('util');
            const execAsync = util.promisify(require('child_process').exec);
            const now       = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
            const hariList  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
            const bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
            const txtLine1  = `${hariList[now.getDay()]}, ${now.getDate()} ${bulanList[now.getMonth()]} ${now.getFullYear()}`;
            const txtLine2  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
            const fontBold  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
            const tmpIn     = `/tmp/hdvid_in_${Date.now()}.mp4`;
            const tmpOut    = `/tmp/hdvid_out_${Date.now()}.mp4`;
            fs.writeFileSync(tmpIn, videoBuffer);
            const vf = [
                `drawbox=x=iw-325:y=ih-82:w=315:h=72:color=black@0.55:t=fill`,
                `drawbox=x=iw-325:y=ih-82:w=315:h=72:color=white@0.85:t=2`,
                `drawbox=x=iw-320:y=ih-50:w=305:h=1:color=white@0.5:t=fill`,
                `drawtext=fontfile='${fontBold}':text='${txtLine1}':fontsize=15:fontcolor=white:x=W-320:y=H-75:shadowcolor=black@0.9:shadowx=1:shadowy=1`,
                `drawtext=fontfile='${fontBold}':text='${txtLine2}':fontsize=18:fontcolor=cyan:x=W-320:y=H-46:shadowcolor=black@0.9:shadowx=1:shadowy=1`,
            ].join(',');
            try {
                await execAsync(`ffmpeg -y -i "${tmpIn}" -vf "${vf}" -c:v libx264 -profile:v baseline -level 3.1 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${tmpOut}"`, { timeout: 120000 });
                videoBuffer = fs.readFileSync(tmpOut);
            } finally {
                try { fs.unlinkSync(tmpIn); } catch (_) {}
                try { fs.unlinkSync(tmpOut); } catch (_) {}
            }
            await hisoka.sendMessage(m.from, { video: videoBuffer, mimetype: 'video/mp4', caption: '✅ Video berhasil diproses ke HD!' }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });

        // ── GAMBAR (alwayscodex AI enhance) ────────────────────────────────
        } else {
            const loadMsg = await tolak(hisoka, m, `⏳ Mengunggah gambar untuk dienhance AI...\nMohon tunggu sebentar.`);

            let imgBuffer;
            try {
                const mimeType = mediaType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                imgBuffer = await enhanceImageBuffer(mediaBuffer, mimeType);
                console.log('[HD] ✅ Enhance OK, size:', imgBuffer.length);
            } catch (enhErr) {
                console.error('[HD] enhance failed:', enhErr.message);
                throw new Error(`Gagal enhance gambar: ${enhErr.message}`);
            }

            if (!imgBuffer || imgBuffer.length === 0) throw new Error('Hasil gambar kosong');

            await m.reply({ edit: loadMsg.key, text: '✅ Gambar berhasil di-enhance!' }).catch(() => {});
            await hisoka.sendMessage(m.from, {
                image  : imgBuffer,
                caption: `✅ *Gambar berhasil dienhance AI!*\n🔗 _Powered by AlwaysCodex AI Enhance_`,
                mimetype: 'image/jpeg',
            }, { quoted: m });
            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
        }

        logCommand(m, hisoka, 'hd');

    } catch (error) {
        console.error('\x1b[31m[HD] Error:\x1b[39m', error.message);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
        await tolak(hisoka, m, `❌ Gagal memproses: ${error.message}`);
    }
}

module.exports.handleHdvideo = handleHdvideo;
