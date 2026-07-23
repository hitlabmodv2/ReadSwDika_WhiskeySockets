/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  anyvoice.cjs — Text-to-Speech untuk .tts
 *
 *  ENGINE: Google Translate TTS (translate.google.com/translate_tts) —
 *  endpoint publik resmi Google, dipanggil tanpa API key/token/login.
 *  TIDAK ada kuota per-jam seketat AnyVoice (sudah dites beberapa request
 *  beruntun, semua sukses), dan suaranya beneran mengucapkan bahasa
 *  Indonesia (tl=id) apa adanya — bukan logat Inggris/Mandarin dipaksa
 *  baca teks Indo.
 *  Batasannya cuma soal teknis: 1 request maks ±200 karakter, jadi teks
 *  panjang dipecah per-kata lalu disambung ulang pakai ffmpeg jadi satu
 *  file, dikonversi ke OGG Opus, dan dikirim sebagai voice note (PTT)
 *  asli — bukan file audio biasa — supaya muncul di WhatsApp persis
 *  seperti bubble VN (bulat, ada gelombang suara, tanpa tombol download).
 *
 *  Fitur daftar-suara-karakter AnyVoice (`.anyvoice list`) sudah dihapus
 *  sesuai permintaan — kuota anonim mereka cuma 2x/jam jadi tidak layak
 *  dijadikan fitur utama. `.tts` sekarang cuma satu jalur ini.
 * ───────────────────────────────
 */
'use strict';

const axios         = require('axios');
const fs            = require('fs');
const path          = require('path');
const { execFile }  = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

/**
 * Hitung waveform (buat bubble VN WhatsApp bergelombang, bukan garis progress polos).
 * Baileys sebenarnya bisa generate ini otomatis, TAPI versi `audio-decode` yang
 * terpasang (3.11.x) return objek {channelData, sampleRate} — bukan AudioBuffer
 * dengan method getChannelData() yang dipanggil kode Baileys — jadi selalu gagal
 * diam-diam dan bubble jatuh ke tampilan garis progress polos, bukan gelombang.
 * Makanya di-generate manual di sini pakai package yang sama, algoritma sama
 * persis dengan punya Baileys (64 sample, dinormalisasi, dikali 100), lalu
 * dikirim langsung lewat properti `waveform` supaya Baileys skip proses otomatisnya.
 */
async function computeWaveform(oggBuffer, logger) {
    try {
        const { default: decoder } = await import('audio-decode');
        const decoded = await decoder(oggBuffer);
        const rawData = typeof decoded.getChannelData === 'function'
            ? decoded.getChannelData(0)
            : decoded.channelData[0];

        const samples = 64;
        const blockSize = Math.floor(rawData.length / samples);
        if (!blockSize) return undefined;

        const filteredData = [];
        for (let i = 0; i < samples; i++) {
            const blockStart = blockSize * i;
            let sum = 0;
            for (let j = 0; j < blockSize; j++) sum += Math.abs(rawData[blockStart + j] || 0);
            filteredData.push(sum / blockSize);
        }
        const multiplier = Math.pow(Math.max(...filteredData) || 1, -1);
        return new Uint8Array(filteredData.map(n => Math.floor(100 * n * multiplier)));
    } catch (err) {
        if (logger) logger('[TTS] Gagal hitung waveform manual: ' + err.message);
        return undefined;
    }
}

const GTTS_URL          = 'https://translate.google.com/translate_tts';
const GTTS_CHUNK_MAXLEN = 190; // aman di bawah limit ±200 karakter/request Google
const MAX_TEXT_LEN      = 800; // aman karena teks dipecah otomatis per ±190 karakter

/** Pecah teks panjang jadi potongan ≤ maxLen, tanpa motong di tengah kata */
function splitTextChunks(text, maxLen = GTTS_CHUNK_MAXLEN) {
    const words = text.trim().split(/\s+/);
    const chunks = [];
    let cur = '';
    for (const w of words) {
        const candidate = cur ? `${cur} ${w}` : w;
        if (candidate.length > maxLen) {
            if (cur) chunks.push(cur);
            cur = w;
        } else {
            cur = candidate;
        }
    }
    if (cur) chunks.push(cur);
    return chunks;
}

/** Download 1 potongan audio dari Google Translate TTS (bahasa Indonesia) */
async function fetchGttsChunk(text) {
    const res = await axios.get(GTTS_URL, {
        params: { ie: 'UTF-8', q: text, tl: 'id', client: 'tw-ob' },
        responseType: 'arraybuffer',
        timeout: 20000,
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Referer'   : 'https://translate.google.com/',
        },
        validateStatus: () => true,
    });
    if (res.status !== 200) {
        throw new Error(`Google TTS membalas status ${res.status} (kemungkinan teks per-potongan masih terlalu panjang)`);
    }
    return Buffer.from(res.data);
}

/**
 * Generate voice note bahasa Indonesia lewat Google Translate TTS.
 * Teks dipecah jadi beberapa potongan ≤190 karakter, tiap potongan didownload
 * terpisah, lalu disambung + dikonversi ke OGG Opus dalam satu langkah ffmpeg
 * (pakai concat demuxer, supaya sambungannya mulus tanpa glitch).
 * Hasil buffer OGG/Opus ini siap dikirim langsung sebagai `ptt: true`
 * (voice note asli WhatsApp — bulat, ada gelombang, tanpa tombol download).
 */
async function generateIndoVoiceNote(text) {
    const chunks = splitTextChunks(text);
    if (!chunks.length) throw new Error('Teks kosong');

    const tmpDir = path.join(process.cwd(), 'tmp');
    if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });

    const id = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const chunkPaths = [];
    const listPath   = path.join(tmpDir, `gtts_list_${id}.txt`);
    const outputPath = path.join(tmpDir, `gtts_out_${id}.ogg`);

    try {
        for (let i = 0; i < chunks.length; i++) {
            const buf = await fetchGttsChunk(chunks[i]);
            const p   = path.join(tmpDir, `gtts_part_${id}_${i}.mp3`);
            fs.writeFileSync(p, buf);
            chunkPaths.push(p);
        }

        const listContent = chunkPaths.map(p => `file '${p.replace(/'/g, "'\\''")}'`).join('\n');
        fs.writeFileSync(listPath, listContent);

        await execFileAsync('ffmpeg', [
            '-y',
            '-hide_banner',
            '-loglevel', 'error',
            '-f', 'concat',
            '-safe', '0',
            '-i', listPath,
            '-vn',
            '-ac', '1',
            '-ar', '48000',
            '-c:a', 'libopus',
            '-b:a', '48k',
            '-vbr', 'on',
            '-compression_level', '10',
            outputPath,
        ], { timeout: 60000 });

        if (!fs.existsSync(outputPath) || fs.statSync(outputPath).size < 512) {
            throw new Error('Hasil konversi ffmpeg kosong/gagal');
        }

        const oggBuf = fs.readFileSync(outputPath);

        let duration = null;
        try {
            const { stdout } = await execFileAsync('ffprobe', [
                '-v', 'error', '-show_entries', 'format=duration',
                '-of', 'default=noprint_wrappers=1:nokey=1', outputPath,
            ]);
            duration = Math.round(parseFloat(stdout));
        } catch { /* durasi opsional, tidak fatal kalau gagal */ }

        return { buffer: oggBuf, duration, chunkCount: chunks.length };
    } finally {
        for (const p of chunkPaths) { try { if (fs.existsSync(p)) fs.unlinkSync(p); } catch {} }
        try { if (fs.existsSync(listPath)) fs.unlinkSync(listPath); } catch {}
        try { if (fs.existsSync(outputPath)) fs.unlinkSync(outputPath); } catch {}
    }
}

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────

async function handleAnyvoice({ hisoka, m, query, tolak, logCommand, logError }) {
    try {
        logCommand(m, hisoka, m.command || 'tts');

        const trimmed = (query || '').trim();

        if (!trimmed) {
            await tolak(hisoka, m, `🗣️ *TTS*\n> _Contoh: .tts halo, apa kabar semuanya?_`);
            return;
        }
        if (trimmed.length > MAX_TEXT_LEN) {
            await tolak(hisoka, m, `❌ *Teks terlalu panjang.*\n> _Maks ${MAX_TEXT_LEN} karakter, punyamu ${trimmed.length}_`);
            return;
        }

        await hisoka.sendMessage(m.from, { react: { text: '🔊', key: m.key } });

        const { buffer } = await generateIndoVoiceNote(trimmed);
        const waveform   = await computeWaveform(buffer);

        // Kirim sebagai voice note (PTT) asli — bulat, gelombang suara, auto-play
        // di WhatsApp, bukan file audio biasa dengan tombol download.
        // `waveform` di-hitung manual (lihat computeWaveform) karena auto-generate
        // bawaan Baileys gagal diam-diam di versi audio-decode yang terpasang.
        await hisoka.sendMessage(m.from, {
            audio   : buffer,
            mimetype: 'audio/ogg; codecs=opus',
            ptt     : true,
            ...(waveform ? { waveform } : {}),
        }, { quoted: m });

        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
    } catch (err) {
        console.error('[TTS] Error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'tts');
        await tolak(hisoka, m, `❌ Gagal generate suara.\n💬 ${err?.message || 'Coba lagi nanti.'}`);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
}

module.exports = { handleAnyvoice };
