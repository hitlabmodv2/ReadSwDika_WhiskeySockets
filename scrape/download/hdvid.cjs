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
 *  hdvid.cjs — Enhance kualitas video/gambar HD
 *  Upscale & sharpen via AI, dukung gambar & video
 * ───────────────────────────────
 */
// Source: https://github.com/hitlabmodv2/MD-FURINA/blob/main/scrape/hdvid.js

const crypto = require('crypto');

async function hdvideo(buffer) {
  try {
    const baseApi = 'https://api.unblurimage.ai';
    const productSerial = crypto.randomUUID().replace(/-/g, '');

    const sleep = ms => new Promise(r => setTimeout(r, ms));

    async function jsonFetch(url, options = {}) {
      const res = await fetch(url, options);
      const text = await res.text();
      let json;
      try {
        json = text ? JSON.parse(text) : null;
      } catch {
        return { __httpError: true, status: res.status, raw: text };
      }
      if (!res.ok) return { __httpError: true, status: res.status, raw: json };
      return json;
    }

    const uploadForm = new FormData();
    uploadForm.set('video_file_name', `cli-${Date.now()}.mp4`);

    const uploadResp = await jsonFetch(`${baseApi}/api/upscaler/v1/ai-video-enhancer/upload-video`, {
      method: 'POST',
      body: uploadForm
    });

    if (uploadResp.__httpError || uploadResp.code !== 100000) throw new Error('Upload gagal');

    const { url: uploadUrl, object_name } = uploadResp.result || {};
    if (!uploadUrl || !object_name) throw new Error('Upload invalid');

    const putRes = await fetch(uploadUrl, {
      method: 'PUT',
      headers: { 'content-type': 'video/mp4' },
      body: buffer
    });

    if (!putRes.ok) throw new Error('Upload video gagal');

    const cdnUrl = `https://cdn.unblurimage.ai/${object_name}`;

    const jobForm = new FormData();
    jobForm.set('original_video_file', cdnUrl);
    jobForm.set('resolution', '2k');
    jobForm.set('is_preview', 'false');

    const createJobResp = await jsonFetch(`${baseApi}/api/upscaler/v2/ai-video-enhancer/create-job`, {
      method: 'POST',
      body: jobForm,
      headers: {
        'product-serial': productSerial,
        authorization: ''
      }
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
        headers: {
          'product-serial': productSerial,
          authorization: ''
        }
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
  } catch (e) {
    throw e;
  }
}

module.exports = { hdvideo };

// ── COMMAND HANDLER ───────────────────────────────────────────────────────────

async function handleHdvideo({ hisoka, m, query, tolak, logCommand, fs, path, quoted, downloadMediaMessage }) {
        try {
                const { hdvideo }           = module.exports;
                const { sparkpixHdUpscale } = require(path.resolve('./scrape/ai/sparkpix.cjs'));
                const { hdr: iloveimgHdr }  = require(path.resolve('./scrape/ai/iloveimg.cjs'));

                const isMediaMsg    = m.isMedia && (m.type === 'imageMessage' || m.type === 'videoMessage' || m.type === 'stickerMessage');
                const isQuotedMedia = m.isQuoted && quoted && quoted.isMedia && (quoted.type === 'imageMessage' || quoted.type === 'videoMessage' || quoted.type === 'stickerMessage');

                if (!isMediaMsg && !isQuotedMedia) {
                        await tolak(hisoka, m,
                                `╭═══『 🖼️ *HD Upscaler* 』═══╮\n│\n│ Tingkatkan kualitas gambar/video\n│ menjadi lebih tajam & jernih!\n│\n` +
                                `│ *Cara Pakai:*\n│ • Kirim gambar dengan caption:\n│   *.hd* [resolusi]\n│\n│ *Pilihan Resolusi:*\n│ *.hd 4k* → 4K (default)\n` +
                                `│ *.hd 6k* → 6K\n│ *.hd 8k* → 8K (terbaik)\n│\n│ *Video:*\n│ *.hdvid* / *.vidhd* / *.hdvideo*\n│\n╰══════════════════════════╯`
                        );
                        return;
                }

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
                        await tolak(hisoka, m, '❌ Gagal download media. Coba lagi!');
                        return;
                }

                const isVideo = mediaType === 'videoMessage';
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                await tolak(hisoka, m, `⏳ Sedang memproses ${isVideo ? 'video' : 'gambar'} ke kualitas HD...\nMohon tunggu, proses ini membutuhkan waktu.`);

                if (isVideo) {
                        const resultUrl = await hdvideo(mediaBuffer);
                        const videoFetch = await fetch(resultUrl);
                        if (!videoFetch.ok) throw new Error('Gagal mengunduh hasil video HD');
                        let videoBuffer = Buffer.from(await videoFetch.arrayBuffer());

                        const { execSync } = require('child_process');
                        const util     = require('util');
                        const exec     = require('child_process').exec;
                        const execAsync = util.promisify(exec);
                        const now       = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Jakarta' }));
                        const hariList  = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
                        const bulanList = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
                        const txtLine1  = `${hariList[now.getDay()]}, ${now.getDate()} ${bulanList[now.getMonth()]} ${now.getFullYear()}`;
                        const txtLine2  = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')}:${String(now.getSeconds()).padStart(2,'0')} WIB`;
                        const fontBold  = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf';
                        const tmpWmIn   = `/tmp/hdvid_wm_in_${Date.now()}.mp4`;
                        const tmpWmOut  = `/tmp/hdvid_wm_out_${Date.now()}.mp4`;
                        fs.writeFileSync(tmpWmIn, videoBuffer);
                        const vf = [
                                `drawbox=x=iw-325:y=ih-82:w=315:h=72:color=black@0.55:t=fill`,
                                `drawbox=x=iw-325:y=ih-82:w=315:h=72:color=white@0.85:t=2`,
                                `drawbox=x=iw-320:y=ih-50:w=305:h=1:color=white@0.5:t=fill`,
                                `drawtext=fontfile='${fontBold}':text='${txtLine1}':fontsize=15:fontcolor=white:x=W-320:y=H-75:shadowcolor=black@0.9:shadowx=1:shadowy=1`,
                                `drawtext=fontfile='${fontBold}':text='${txtLine2}':fontsize=18:fontcolor=cyan:x=W-320:y=H-46:shadowcolor=black@0.9:shadowx=1:shadowy=1`
                        ].join(',');
                        try {
                                await execAsync(`ffmpeg -y -i "${tmpWmIn}" -vf "${vf}" -c:v libx264 -profile:v baseline -level 3.1 -preset fast -crf 23 -pix_fmt yuv420p -c:a aac -b:a 128k -movflags +faststart "${tmpWmOut}"`, { timeout: 120000 });
                                videoBuffer = fs.readFileSync(tmpWmOut);
                        } finally {
                                try { fs.unlinkSync(tmpWmIn); } catch (_) {}
                                try { fs.unlinkSync(tmpWmOut); } catch (_) {}
                        }
                        await hisoka.sendMessage(m.from, { video: videoBuffer, mimetype: 'video/mp4', caption: '✅ Video berhasil diproses ke kualitas HD!' }, { quoted: m });
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                } else {
                        const resInput = (query || '4k').trim().toLowerCase().split(/\s+/)[0];
                        const { resolution } = (() => {
                                const v = resInput;
                                if (['6k','3','3x'].includes(v)) return { resolution: '6K' };
                                if (['8k','4','4x'].includes(v)) return { resolution: '8K' };
                                return { resolution: '4K' };
                        })();

                        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                        await tolak(hisoka, m, `⏳ Sedang upscale gambar ke *${resolution}*...\nMohon tunggu sebentar.`);

                        let imgBuffer = null, usedService = 'SparkPix';
                        try {
                                const result = await sparkpixHdUpscale(mediaBuffer, { resolution: resInput });
                                if (result.status && result.result_url) {
                                        const imgFetch = await fetch(result.result_url);
                                        if (imgFetch.ok) imgBuffer = Buffer.from(await imgFetch.arrayBuffer());
                                }
                        } catch (_) {}

                        if (!imgBuffer) {
                                usedService = 'iLoveIMG';
                                const scaleMap  = { '6k': 4, '3': 4, '3x': 4, '8k': 8, '4': 8, '4x': 8 };
                                const iloveScale = scaleMap[resInput] || 2;
                                imgBuffer = Buffer.from(await iloveimgHdr(mediaBuffer, iloveScale));
                        }

                        if (!imgBuffer || imgBuffer.length === 0) throw new Error('Semua API gagal memproses gambar');
                        await hisoka.sendMessage(m.from, { image: imgBuffer, caption: `✅ *Gambar berhasil diupscale ke ${resolution}!*\n🔗 Powered by ${usedService}` }, { quoted: m });
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                }

                logCommand(m, hisoka, 'hd');
        } catch (error) {
                console.error('\x1b[31m[HD] Error:\x1b[39m', error.message);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                await tolak(hisoka, m, `❌ Gagal memproses media HD: ${error.message}`);
        }
}

module.exports.handleHdvideo = handleHdvideo;
