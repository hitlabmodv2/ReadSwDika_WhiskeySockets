/**
 * ───────────────────────────────
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  anyvoice.cjs — Scraper AnyVoice (anyvoice.net)
 *  Text-to-Speech AI pakai endpoint publik anonim situs (tanpa login/token),
 *  jadi cuma bisa dipakai sesuai kuota gratis yang mereka sediakan.
 * ───────────────────────────────
 */
'use strict';

const axios = require('axios');

const BASE    = 'https://anyvoice.net';
const HEADERS = {
    'User-Agent'   : 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Accept'       : 'application/json, text/plain, */*',
    'Referer'      : 'https://anyvoice.net/',
};

let voiceCache      = null;
let voiceCacheAt    = 0;
const VOICE_CACHE_TTL = 10 * 60 * 1000; // 10 menit

/** Ambil daftar voice publik dari /api/voices (endpoint publik, tanpa token) */
async function fetchVoices() {
    if (voiceCache && (Date.now() - voiceCacheAt) < VOICE_CACHE_TTL) return voiceCache;

    const res = await axios.get(`${BASE}/api/voices`, { headers: HEADERS, timeout: 20000 });
    const items = Array.isArray(res.data?.items) ? res.data.items : [];

    // Voice publik saja, urut dari yang paling banyak dipakai
    const voices = items
        .filter(v => v.type === 'Public')
        .sort((a, b) => (b.usedCount || 0) - (a.usedCount || 0))
        .map(v => ({
            id       : v.id,
            name     : v.name,
            language : v.language || '-',
            tag      : Array.isArray(v.tag) ? v.tag.slice(0, 3) : [],
            usedCount: v.usedCount || 0,
        }));

    voiceCache   = voices;
    voiceCacheAt = Date.now();
    return voices;
}

/**
 * Generate suara lewat endpoint anonim /api/tts/anonymous.
 * Endpoint ini publik (dipakai situsnya sendiri untuk user belum login),
 * jadi tunduk ke kuota gratis mereka — kalau limit habis, situs balas 429.
 */
async function generateTts(text, voiceId, language) {
    const res = await axios.post(
        `${BASE}/api/tts/anonymous`,
        { text, voiceId, language: language || 'en' },
        {
            headers: { ...HEADERS, 'Content-Type': 'application/json' },
            timeout: 30000,
            validateStatus: () => true,
        }
    );

    if (res.status === 429) {
        const err = new Error('Kuota gratis AnyVoice untuk hari ini sudah habis. Coba lagi nanti.');
        err.quotaExhausted = true;
        throw err;
    }
    if (res.status < 200 || res.status >= 300 || !res.data?.audio_url) {
        throw new Error(res.data?.message || `AnyVoice membalas status ${res.status}`);
    }

    return res.data; // { audio_url, duration, temporary, expires_in }
}

/** Download buffer audio hasil generate */
async function downloadAudio(url) {
    const res = await axios.get(url, {
        responseType: 'arraybuffer',
        timeout     : 30000,
        headers     : { ...HEADERS, Referer: BASE + '/' },
    });
    return Buffer.from(res.data);
}

/** Format daftar voice jadi teks bernomor */
function formatVoiceList(voices) {
    let text = `🗣️ *ANYVOICE — Daftar Suara*\n_${voices.length} suara publik tersedia_\n\n`;
    voices.slice(0, 30).forEach((v, i) => {
        const tagText = v.tag.length ? ` _(${v.tag.join(', ')})_` : '';
        text += `${i + 1}. *${v.name}* — \`${v.language}\`${tagText}\n`;
    });
    text += `\n> 💬 *Reply* pesan ini dengan format: *nomor teks*\n` +
            `> _Contoh: balas dengan_ *1 Halo, apa kabar semuanya?*`;
    return text;
}

const MAX_TEXT_LEN = 300;

// ── COMMAND HANDLER UTAMA ──────────────────────────────────────────────────────

async function handleAnyvoice({ hisoka, m, query, tolak, logCommand, logError, pendingAnyvoiceChoices }) {
    try {
        logCommand(m, hisoka, m.command || 'anyvoice');

        const trimmed = (query || '').trim();

        // Mode 1: kosong / "list" → tampilkan daftar voice
        if (!trimmed || trimmed.toLowerCase() === 'list') {
            await hisoka.sendMessage(m.from, { react: { text: '🔍', key: m.key } });

            const voices = await fetchVoices();
            if (!voices.length) {
                await tolak(hisoka, m, `❌ Gagal mengambil daftar suara. Coba lagi nanti.`);
                await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                return;
            }

            const sent = await hisoka.sendMessage(m.from, { text: formatVoiceList(voices) }, { quoted: m });

            const TTL = 3 * 60 * 1000;
            const key = m.sender;
            const timeout = setTimeout(() => pendingAnyvoiceChoices.delete(key), TTL);
            pendingAnyvoiceChoices.set(key, {
                voices,
                botMsgId : sent?.key?.id || null,
                expiresAt: Date.now() + TTL,
                loading  : false,
                timeout,
            });

            await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
            return;
        }

        // Mode 2: langsung kasih teks → pakai voice default (paling populer)
        if (trimmed.length > MAX_TEXT_LEN) {
            await tolak(hisoka, m, `❌ *Teks terlalu panjang.*\n> _Maks ${MAX_TEXT_LEN} karakter, punyamu ${trimmed.length}_`);
            return;
        }

        await hisoka.sendMessage(m.from, { react: { text: '🔊', key: m.key } });
        await tolak(hisoka, m, `🔊 *Generate suara...*\n> _Harap tunggu sebentar_`);

        const voices = await fetchVoices();
        if (!voices.length) {
            await tolak(hisoka, m, `❌ Gagal mengambil daftar suara. Coba lagi nanti.`);
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
            return;
        }
        const defaultVoice = voices[0];

        await sendGeneratedVoice({ hisoka, m, text: trimmed, voice: defaultVoice, tolak });
    } catch (err) {
        console.error('[ANYVOICE] Error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'anyvoice');
        await tolak(hisoka, m, `❌ Gagal generate suara.\n💬 ${err?.message || 'Coba lagi nanti.'}`);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }
}

/** Generate + download + kirim sebagai voice note, dengan kartu hasil */
async function sendGeneratedVoice({ hisoka, m, text, voice, tolak }) {
    const result = await generateTts(text, voice.id, voice.language);
    const buf    = await downloadAudio(result.audio_url);

    await hisoka.sendMessage(m.from, {
        audio   : buf,
        mimetype: 'audio/mpeg',
        ptt     : true,
    }, { quoted: m });

    const teksSingkat = text.length > 60 ? text.slice(0, 60) + '…' : text;
    await hisoka.sendMessage(m.from, {
        text:
            `🗣️ *ANYVOICE*\n\n` +
            `📌 *Suara:* ${voice.name} \`(${voice.language})\`\n` +
            `💬 *Teks:* _"${teksSingkat}"_\n` +
            `⏱️ *Durasi:* \`${result.duration || '?'} detik\`\n\n` +
            `✅ *Status: Terkirim*` +
            (result.quotaExhausted ? `\n> ⚠️ _Ini generate gratis terakhir kamu untuk saat ini_` : ''),
    }, { quoted: m });

    await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
}

// ── CHOICE HANDLER — dipanggil dari message.js sebelum switch-case ────────────

async function handleAnyvoiceChoice({ hisoka, m, pendingAnyvoiceChoices, getQuotedStanzaId, tolak, logCommand, logError }) {
    if (!pendingAnyvoiceChoices.has(m.sender)) return false;

    const pending   = pendingAnyvoiceChoices.get(m.sender);
    const rawChoice = String(m.text || '').trim();
    const isReply   = m.isQuoted && pending.botMsgId && getQuotedStanzaId(m) === pending.botMsgId;
    const match     = rawChoice.match(/^(\d+)\s+([\s\S]+)/);

    if (!isReply || !match) return false;

    if (pending.expiresAt <= Date.now()) {
        pendingAnyvoiceChoices.delete(m.sender);
        await tolak(hisoka, m, `⏳ *Menu sudah kedaluwarsa.*\n> Ketik \`.anyvoice list\` lagi untuk memulai`);
        return true;
    }

    if (pending.loading) {
        await tolak(hisoka, m, `⏳ *Sedang memproses...*\n> _Tunggu sebentar, jangan kirim ulang_`);
        return true;
    }

    const idx  = parseInt(match[1]) - 1;
    const text = match[2].trim();

    if (idx < 0 || idx >= pending.voices.length) {
        await tolak(hisoka, m, `❌ *Pilih angka yang valid.*\n> _Ketik angka *1*–*${pending.voices.length}*, diikuti teksnya_`);
        return true;
    }
    if (text.length > MAX_TEXT_LEN) {
        await tolak(hisoka, m, `❌ *Teks terlalu panjang.*\n> _Maks ${MAX_TEXT_LEN} karakter, punyamu ${text.length}_`);
        return true;
    }

    pending.loading = true;
    if (pending.timeout) clearTimeout(pending.timeout);
    pendingAnyvoiceChoices.delete(m.sender);

    const voice = pending.voices[idx];

    try {
        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
        await sendGeneratedVoice({ hisoka, m, text, voice, tolak });
    } catch (err) {
        console.error('[ANYVOICE] Choice error:', err?.message);
        if (typeof logError === 'function') logError(err instanceof Error ? err : new Error(String(err?.message || err)), 'anyvoice-choice');
        await tolak(hisoka, m, `❌ Gagal generate suara.\n💬 ${err?.message || 'Coba lagi nanti.'}`);
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
    }

    return true;
}

module.exports = { handleAnyvoice, handleAnyvoiceChoice };
