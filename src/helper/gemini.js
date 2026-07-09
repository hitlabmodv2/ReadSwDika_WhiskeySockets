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
 *  gemini.js — Wrapper Gemini API (ESM)
 *  Text/vision chat, retry otomatis, history management
 *  API: Firebase Vertex AI (Gemmy) — model akurat
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Gemini API Wrapper (ESM)
 *  Wrapper utama untuk Google Gemini API dalam format ESM —
 *  mendukung text & vision chat, retry otomatis saat rate
 *  limit, dan management history percakapan per user.
 *
 *  Model tersedia (akurat):
 *    - gemini-2.5-flash-lite   → ringan, cepat
 *    - gemini-2.5-flash        → seimbang
 *    - gemini-2.5-pro          → pro generasi 2.5
 *    - gemini-3.1-flash-lite   → cepat generasi 3.1
 *    - gemini-3.1-pro-preview  → terdepan, paling canggih (DEFAULT)
 * ═══════════════════════════════════════════════════════════════
 */
import axios from 'axios';
import https from 'https';
import path from 'path';
import { kvGet, kvSet, kvMigrateFromJSON, kvMigrateKey } from '../db/datadb.js';

kvMigrateFromJSON('ai/gemini_tokens', path.join(process.cwd(), 'data', 'gemini_tokens.json'));
kvMigrateKey('gemini_tokens', 'ai/gemini_tokens');

const GEMINI_VERBOSE_LOGS = process.env.WILY_VERBOSE_LOGS === 'true' || process.env.BOT_DEBUG_LOG === 'true';
const GEMINI_TIMING_LOGS  = process.env.GEMINI_TIMING_LOGS !== 'false';
const geminiLog    = (...args) => { if (GEMINI_VERBOSE_LOGS) console.log(...args); };
const geminiError  = (...args) => { if (GEMINI_VERBOSE_LOGS) console.error(...args); };
const geminiTiming = (...args) => { if (GEMINI_TIMING_LOGS) console.log(...args); };

const KEEPALIVE_AGENT = new https.Agent({
    keepAlive: true,
    keepAliveMsecs: 30000,
    maxSockets: 50,
    maxFreeSockets: 10,
    timeout: 60000,
});

// ── Endpoint Firebase Vertex AI (akurat) ──────────────────────
const GEMINI_BASE_URL = 'https://firebasevertexai.googleapis.com/v1beta/projects/gemmy-ai-bdc03/models';
const SIGNUP_URL      = 'https://www.googleapis.com/identitytoolkit/v3/relyingparty/signupNewUser?key=AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ';

// ── Header Firebase Vertex AI ─────────────────────────────────
const GEMINI_HEADERS = {
    'accept-encoding':      'gzip',
    'content-type':         'application/json; charset=UTF-8',
    'x-goog-api-key':       'AIzaSyAxof8_SbpDcww38NEQRhNh0Pzvbphh-IQ',
    'x-goog-api-client':    'gl-kotlin/2.2.21-ai fire/17.7.0',
    'x-firebase-appid':     '1:652803432695:android:c4341db6033e62814f33f2',
    'x-firebase-appversion':'128',
    'user-agent':           'Dalvik/2.1.0 (Linux; U; Android 12; SM-S9280 Build/AP3A.240905.015.A2)',
};

// ── Header signup token (sesuai referensi akurat) ────────────
const SIGNUP_HEADERS = {
    'User-Agent':       'Dalvik/2.1.0 (Linux; U; Android 12; SM-S9280 Build/AP3A.240905.015.A2)',
    'Content-Type':     'application/json',
    'X-Android-Package':'com.jetkite.gemmy',
    'X-Android-Cert':   '037CD2976D308B4EFD63EC63C48DC6E7AB7E5AF2',
    'X-Firebase-GMPID': '1:652803432695:android:c4341db6033e62814f33f2',
};

// ── Model tersedia (akurat) ───────────────────────────────────
export const GEMINI_MODELS = {
    LITE:        'gemini-2.5-flash-lite',   // ringan, tercepat
    FLASH:       'gemini-2.5-flash',        // seimbang kecepatan & kualitas
    PRO:         'gemini-2.5-pro',          // pro generasi 2.5
    FLASH_NEXT:  'gemini-3.1-flash-lite',   // cepat generasi 3.1
    PRO_NEXT:    'gemini-3.1-pro-preview',  // terdepan — paling canggih
};

// Default: model terdepan (gemini-3.1-pro-preview)
const DEFAULT_MODEL = GEMINI_MODELS.PRO_NEXT;

// Urutan fallback: terdepan → turun bertahap (linear dari canggih ke ringan)
const FALLBACK_MODELS = [
    GEMINI_MODELS.PRO_NEXT,    // gemini-3.1-pro-preview  — paling canggih
    GEMINI_MODELS.PRO,         // gemini-2.5-pro          — pro stabil
    GEMINI_MODELS.FLASH,       // gemini-2.5-flash        — seimbang
    GEMINI_MODELS.FLASH_NEXT,  // gemini-3.1-flash-lite   — 3.1 lite
    GEMINI_MODELS.LITE,        // gemini-2.5-flash-lite   — paling ringan
];

const AUTO_ROTATE_EVERY  = 5;   // rotate token tiap N request (proaktif)
const REQUEST_TIMEOUT_MS = 30000;

class Gemini {
    constructor() {
        // Token dimulai null — request pertama tanpa Bearer (x-goog-api-key sebagai auth)
        this._token    = null;
        this._reqCount = 0;
        this._loadTokenCache();
    }

    // ── Token cache (KV store) ────────────────────────────────
    _loadTokenCache() {
        try {
            const raw = kvGet('ai/gemini_tokens', null);
            if (!raw) return;
            const now    = Date.now();
            const valid  = (raw.pool || []).find(t => t && t.token && t.expiry && now < t.expiry - 300000);
            if (valid) {
                this._token = valid.token;
                geminiLog(`\x1b[32m[Gemini]\x1b[0m ♻️ Token dimuat dari cache DB`);
            }
        } catch (_) {}
    }

    _saveTokenCache() {
        try {
            const entry = this._token ? [{ token: this._token, expiry: Date.now() + 3600 * 1000 }] : [];
            kvSet('ai/gemini_tokens', { pool: entry, savedAt: Date.now() });
        } catch (_) {}
    }

    // ── Signup token baru ─────────────────────────────────────
    async _signup() {
        try {
            const { data } = await axios.post(
                SIGNUP_URL,
                { clientType: 'CLIENT_TYPE_ANDROID' },
                { headers: SIGNUP_HEADERS, timeout: 12000, httpsAgent: KEEPALIVE_AGENT }
            );
            if (!data.idToken) throw new Error('Gagal dapat token Gemini (idToken tidak ada).');
            return { token: data.idToken, expiry: Date.now() + 3600 * 1000 };
        } catch (err) {
            const body   = err.response?.data;
            const detail = body ? (typeof body === 'string' ? body.slice(0, 200) : JSON.stringify(body).slice(0, 200)) : err.message;
            geminiError(`\x1b[31m[Gemini-Signup]\x1b[0m FAIL: ${detail}`);
            throw new Error(`Signup gagal: ${detail}`);
        }
    }

    // ── State token (pola referensi) ─────────────────────────
    // Token dimulai null → request pertama TANPA Bearer (cukup x-goog-api-key)
    // Bearer hanya ditambah setelah signup berhasil (untuk bypass rate-limit)
    // Setiap AUTO_ROTATE_EVERY request → rotate token proaktif

    async getAuthToken() {
        // Signup baru kalau belum ada token
        if (!this._token) {
            try {
                const t = await this._signup();
                this._token = t.token;
                this._reqCount = 0;
                this._saveTokenCache();
            } catch (_) {}
        }
        return this._token || null;
    }

    // ── Satu kali request ke Firebase Vertex AI ───────────────
    // token = null  → request tanpa Bearer (x-goog-api-key sebagai satu-satunya auth)
    // token = string → tambah Authorization header (bypass rate-limit layer ke-2)
    async _callOnce({ token, model, contents, config }) {
        const generationConfig = {
            maxOutputTokens: 2048,
            temperature:     0.7,
            topP:            0.9,
            ...config,
        };

        const reqHeaders = { ...GEMINI_HEADERS };
        if (token) reqHeaders['authorization'] = `Bearer ${token}`;

        const { data } = await axios.post(
            `${GEMINI_BASE_URL}/${model}:generateContent`,
            { contents, generationConfig },
            { headers: reqHeaders, timeout: REQUEST_TIMEOUT_MS, httpsAgent: KEEPALIVE_AGENT }
        );

        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error('Gemini: response kosong. Raw: ' + JSON.stringify(data).slice(0, 200));
        return text;
    }

    // ── Request dengan token rotation otomatis (pola referensi) ──
    async _requestWithRotation({ model, contents, config }) {
        this._reqCount = (this._reqCount || 0) + 1;

        // Rotate proaktif setiap AUTO_ROTATE_EVERY request
        if (this._reqCount >= AUTO_ROTATE_EVERY && this._token) {
            try {
                const t = await this._signup();
                this._token = t.token;
                this._reqCount = 0;
                this._saveTokenCache();
                geminiLog(`\x1b[36m[Gemini]\x1b[0m ♻️ Token dirotasi (auto, setiap ${AUTO_ROTATE_EVERY} req)`);
            } catch (_) {
                this._reqCount = 0; // reset counter, lanjut tanpa rotate
            }
        }

        return this._callOnce({ token: this._token || null, model, contents, config });
    }

    // ── Chat utama — support history + fallback model ─────────
    /**
     * @param {Object} opts
     * @param {Array}  opts.contents  - array pesan { role, parts }
     * @param {string} [opts.model]   - model pilihan (default: gemini-3.1-pro-preview)
     * @param {Object} [opts.*]       - generationConfig override (temperature, maxOutputTokens, dll)
     */
    async chat({ contents, model = DEFAULT_MODEL, ...config }) {
        if (!Array.isArray(contents)) throw new Error('Contents harus berupa array.');

        const modelChain = [model, ...FALLBACK_MODELS.filter(m => m !== model)];
        const tStart     = Date.now();
        const promptSize = JSON.stringify(contents).length;
        let   lastErr    = null;

        for (const m of modelChain) {
            try {
                // ── Attempt 1: request normal (token dari state, mungkin null) ──
                const text    = await this._requestWithRotation({ model: m, contents, config });
                const elapsed = Date.now() - tStart;
                const slow    = elapsed > 8000 ? ' 🐢' : elapsed > 4000 ? ' ⏱️' : '';
                geminiTiming(`\x1b[36m[Gemini]\x1b[0m ✓ ${m} • ${elapsed}ms • in:${(promptSize / 1024).toFixed(1)}KB out:${text.length}c${slow}`);
                return text;

            } catch (err) {
                lastErr = err;
                const status  = err.response?.status;
                const body    = err.response?.data;
                const bodyStr = body ? (typeof body === 'string' ? body : JSON.stringify(body)) : '';

                // ── 401/403: Bearer ditolak → drop token, retry TANPA Bearer langsung ──
                if (status === 401 || status === 403 || /UNAUTHENTICATED|invalid.?token|expired/i.test(bodyStr)) {
                    if (this._token) {
                        geminiError(`\x1b[33m[Gemini]\x1b[0m 🔒 Bearer ditolak (${m}) → drop token, retry tanpa Bearer`);
                        this._token = null;
                        this._saveTokenCache();
                        try {
                            const text    = await this._callOnce({ token: null, model: m, contents, config });
                            const elapsed = Date.now() - tStart;
                            geminiTiming(`\x1b[36m[Gemini]\x1b[0m ✓ ${m} (no-bearer) • ${elapsed}ms`);
                            return text;
                        } catch (retryErr) {
                            lastErr = retryErr;
                            const rs = retryErr.response?.status;
                            if (rs === 404 || /NOT_FOUND/i.test(JSON.stringify(retryErr.response?.data || ''))) continue;
                        }
                    }
                    // Token sudah null dan masih 401 → auth utama error, berhenti total
                    break;
                }

                // ── 429: Rate limit → signup token baru, retry langsung ──
                if (status === 429 || /RESOURCE_EXHAUSTED|quota/i.test(bodyStr)) {
                    geminiError(`\x1b[33m[Gemini]\x1b[0m ⏳ Rate-limit (${m}) → signup token baru`);
                    try {
                        const t = await this._signup();
                        this._token = t.token;
                        this._reqCount = 0;
                        this._saveTokenCache();
                    } catch (_) { this._token = null; }
                    try {
                        const text    = await this._callOnce({ token: this._token, model: m, contents, config });
                        const elapsed = Date.now() - tStart;
                        geminiTiming(`\x1b[36m[Gemini]\x1b[0m ✓ ${m} (rate-limit retry) • ${elapsed}ms`);
                        return text;
                    } catch (retryErr) { lastErr = retryErr; continue; }
                }

                // ── 404: Model tidak ada → fallback ke model berikutnya ──
                if (status === 404 || /NOT_FOUND|not found/i.test(bodyStr)) {
                    geminiError(`\x1b[33m[Gemini]\x1b[0m 🚫 Model ${m} tidak tersedia → fallback`);
                    continue;
                }

                // ── Network error → fallback ke model berikutnya ──
                if (!status || status >= 500 || err.code === 'ECONNRESET' || err.code === 'ETIMEDOUT' || err.code === 'ECONNABORTED') {
                    geminiError(`\x1b[33m[Gemini]\x1b[0m 🌐 Network/server error (${status || err.code}) → fallback`);
                    continue;
                }

                // Error lain → langsung lempar tanpa coba model lain
                throw new Error(bodyStr ? bodyStr.slice(0, 300) : err.message);
            }
        }

        const errBody = lastErr?.response?.data;
        throw new Error(errBody
            ? (typeof errBody === 'string' ? errBody.slice(0, 300) : JSON.stringify(errBody).slice(0, 300))
            : (lastErr?.message || 'Gemini: semua model gagal.'));
    }

    // ── Chat teks sederhana (single-turn) ─────────────────────
    async ask(prompt, model = DEFAULT_MODEL) {
        return this.chat({
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            model,
        });
    }

    // ── Chat dengan gambar (vision) ───────────────────────────
    async askWithImage(prompt, imageBuffer, mimeType = 'image/jpeg', model = DEFAULT_MODEL) {
        if (!imageBuffer || imageBuffer.length === 0) {
            throw new Error('Image buffer kosong atau tidak valid');
        }
        const base64 = imageBuffer.toString('base64');
        return this.chat({
            contents: [{
                role:  'user',
                parts: [
                    { inlineData: { mimeType, data: base64 } },
                    { text: prompt },
                ],
            }],
            model,
        });
    }
}

const gemini = new Gemini();

export default gemini;

/**
 * ── Export model constants (pakai di wilycmd / handler lain) ──
 *
 * import gemini, { GEMINI_MODELS } from '../helper/gemini.js';
 *
 * GEMINI_MODELS.LITE        → 'gemini-2.5-flash-lite'
 * GEMINI_MODELS.FLASH       → 'gemini-2.5-flash'
 * GEMINI_MODELS.PRO         → 'gemini-2.5-pro'
 * GEMINI_MODELS.FLASH_NEXT  → 'gemini-3.1-flash-lite'
 * GEMINI_MODELS.PRO_NEXT    → 'gemini-3.1-pro-preview'  ← DEFAULT
 */
