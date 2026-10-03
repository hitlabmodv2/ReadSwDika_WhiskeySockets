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
 *  tmail.cjs — NovaMail adapter untuk Temporary email (.tmail)
 *  Buat & cek email sementara via webnovamail.netlify.app
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Temporary Email (.tmail) via NovaMail
 *  Buat & pantau inbox email sementara menggunakan NovaMail API —
 *  AI (Gemini) secara otomatis memilih & tampilkan
 *  link verifikasi paling penting dari email masuk.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const axios = require('axios');
const path = require('path');

const PROVIDER = 'novamail';
const BASE_URL = 'https://webnovamail.netlify.app';
// NovaMail hanya mengekspos pilihan domain acak pada endpoint publiknya.
const DEFAULT_DOMAINS = ['random'];

const UA = 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36';

let _gemSingleton = null;
function getGem() {
  if (_gemSingleton) return _gemSingleton;
  try {
    const Gem = require(path.join(__dirname, 'gemmyGemini.cjs'));
    _gemSingleton = new Gem();
  } catch (_) {
    _gemSingleton = null;
  }
  return _gemSingleton;
}

class TmailEtokom {
  constructor(opts = {}) {
    this.baseURL = opts.baseURL || BASE_URL;
    this.cookies = new Map();
    this.mailbox = null;
    this.restoreHint = null;
    this.lastSeenIds = new Set();
    this.analyze = opts.analyze !== false; // default ON
    this.aiTimeout = opts.aiTimeout || 25000;
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: opts.timeout || 20000,
      maxRedirects: 5,
      validateStatus: (s) => s >= 200 && s < 400,
      headers: {
        'user-agent': UA,
        'accept-language': 'en-US,en;q=0.9,id;q=0.8',
        'accept': 'application/json, text/plain, */*',
      },
    });

    this.client.interceptors.request.use((config) => {
      const cookieHeader = this._cookieHeader();
      if (cookieHeader) config.headers.Cookie = cookieHeader;
      config.headers.Referer = this.baseURL + '/';
      config.headers.Origin = this.baseURL;
      return config;
    });

    this.client.interceptors.response.use((res) => {
      this._absorbCookies(res.headers['set-cookie']);
      return res;
    }, (err) => {
      if (err.response) this._absorbCookies(err.response.headers['set-cookie']);
      return Promise.reject(err);
    });
  }

  _absorbCookies(setCookie) {
    if (!setCookie) return;
    const arr = Array.isArray(setCookie) ? setCookie : [setCookie];
    for (const raw of arr) {
      const part = String(raw).split(';')[0];
      const eq = part.indexOf('=');
      if (eq <= 0) continue;
      const name = part.slice(0, eq).trim();
      const value = part.slice(eq + 1).trim();
      if (!name) continue;
      if (!value || value === 'deleted') {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  _cookieHeader() {
    if (!this.cookies.size) return '';
    return [...this.cookies.entries()].map(([k, v]) => `${k}=${v}`).join('; ');
  }

  async _request(method, endpoint, body) {
    let res;
    try {
      res = await this.client.request({
        method,
        url: endpoint,
        data: body,
        headers: body ? { 'content-type': 'application/json' } : undefined,
        validateStatus: () => true,
      });
    } catch (err) {
      throw new Error(`NovaMail tidak bisa dihubungi: ${err.message}`);
    }

    const responseError = res.data && typeof res.data === 'object' ? res.data.error : null;
    const upstreamBusy = typeof responseError === 'string' && /\(429\)|rate.?limit|busy|sibuk/i.test(responseError);
    if (res.status === 429 || upstreamBusy) {
      const retryAfter = Number(res.headers['retry-after'] || 30);
      const err = new Error(responseError || `NovaMail sedang rate limit. Coba lagi dalam ${retryAfter} detik.`);
      err.retryAfter = Math.max(1, retryAfter) * 1000;
      err.status = 429;
      throw err;
    }
    if (res.status < 200 || res.status >= 400) {
      const err = new Error(responseError || `NovaMail mengembalikan HTTP ${res.status}.`);
      err.status = res.status;
      throw err;
    }
    return res.data;
  }

  _data(payload) {
    if (!payload || payload.success !== true || !payload.data) {
      throw new Error((payload && payload.error) || 'Respons NovaMail tidak valid.');
    }
    return payload.data;
  }

  _absorbState(data) {
    if (data && typeof data === 'object') {
      if (data.mailbox) this.mailbox = data.mailbox;
    }
    return data;
  }

  _normalizeData(data) {
    if (!data || typeof data !== 'object') return data;
    return {
      ...data,
      messages: Array.isArray(data.messages)
        ? data.messages.map((message) => this._normalizeMessage(message))
        : [],
    };
  }

  /** Buat (atau ambil) email acak dari session NovaMail. */
  async create() {
    const payload = await this._request('GET', '/api/messages');
    const data = this._normalizeData(this._data(payload));
    return this._absorbState(data);
  }

  /** Serialisasi state penting buat disimpan ke file (per user) */
  serialize() {
    return {
      provider: PROVIDER,
      mailbox: this.mailbox,
      cookies: [...this.cookies.entries()],
      savedAt: Date.now(),
    };
  }

  /** Restore state dari objek hasil serialize() */
  restore(state) {
    if (!state || typeof state !== 'object') return this;
    // State lama berasal dari provider berbeda dan tidak boleh dipakai ulang.
    if (state.provider !== PROVIDER) return this;
    if (state.mailbox) {
      this.mailbox = state.mailbox;
      // NovaMail menyediakan restore hint khusus untuk session yang hilang
      // setelah proses bot restart/serverless berpindah instance.
      this.restoreHint = state.mailbox;
    }
    if (Array.isArray(state.cookies)) {
      this.cookies = new Map(state.cookies);
    }
    return this;
  }

  /** Ganti ke alamat email custom (name + domain) */
  async change(name, domain = DEFAULT_DOMAINS[0]) {
    if (!name || !String(name).trim()) throw new Error('Nama email diperlukan.');
    const normalizedDomain = String(domain || DEFAULT_DOMAINS[0]).trim().toLowerCase();
    if (!DEFAULT_DOMAINS.includes(normalizedDomain)) {
      throw new Error('NovaMail hanya mendukung domain random.');
    }
    const payload = await this._request('POST', '/api/change', {
      name: String(name).trim().toLowerCase(),
      domain: normalizedDomain,
    });
    const data = this._normalizeData(this._data(payload));
    return this._absorbState(data);
  }

  /** Hapus mailbox/session aktif lalu buat mailbox acak baru. */
  async delete() {
    const payload = await this._request('POST', '/api/delete');
    const data = this._normalizeData(this._data(payload));
    this.lastSeenIds.clear();
    return this._absorbState(data);
  }

  /** Ambil daftar pesan (inbox) terbaru */
  async inbox() {
    const endpoint = this.restoreHint
      ? `/api/messages?restore=${encodeURIComponent(this.restoreHint)}`
      : '/api/messages';
    this.restoreHint = null;
    const payload = await this._request('GET', endpoint);
    const data = this._normalizeData(this._data(payload));
    return this._absorbState(data);
  }

  /** Lihat detail pesan dan normalkan respons NovaMail ke format bot. */
  async view(id, opts = {}) {
    if (!id) throw new Error('Message ID diperlukan.');
    const payload = await this._request('GET', `/api/view/${encodeURIComponent(id)}`);
    if (!payload || payload.success !== true) {
      throw new Error((payload && payload.error) || 'Isi email tidak tersedia.');
    }
    const parsed = this._normalizeMessage({
      ...(payload.message || {}),
      ...payload,
      id,
    });

    if (this.analyze && opts.analyze !== false) {
      parsed.ai = await this._enrichWithAI(parsed);
    }
    return parsed;
  }

  _normalizeMessage(message = {}) {
    const id = String(message.id || message.message_id || message.uid || '');
    const rawBody = message.body_html || message.html || message.body || message.text || '';
    const bodyHtml = /<([a-z][\s\S]*?)>/i.test(String(rawBody)) ? String(rawBody) : null;
    const bodyText = message.body_text || message.text || (bodyHtml ? stripHtml(bodyHtml) : String(rawBody));
    return {
      id,
      from: message.from || message.from_email || message.from_name || null,
      from_email: message.from_email || null,
      to: message.to || this.mailbox || null,
      subject: message.subject || message.title || null,
      date: message.date || message.created_at || message.received_at || null,
      bodyHtml,
      bodyText: bodyText || '',
      links: mergeLinks(message.links, extractLinks(bodyHtml || bodyText)),
      url: `${this.baseURL}/api/view/${encodeURIComponent(id)}`,
    };
  }

  /** Analisa pakai Gemini — kembalikan { code, primaryUrl, primaryLabel, summary } atau null */
  async _enrichWithAI(parsed) {
    const gem = getGem();
    if (!gem) return null;
    try {
      const aiPromise = gem.analyzeEmail({
        subject: parsed.subject || '',
        from: parsed.from || '',
        body: parsed.bodyText || '',
        links: parsed.links || [],
      });
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('AI timeout')), this.aiTimeout)
      );
      return await Promise.race([aiPromise, timeoutPromise]);
    } catch (_) {
      return null;
    }
  }

  _parseView(html, id) {
    const pick = (re) => {
      const m = html.match(re);
      return m ? m[1].trim() : null;
    };

    const subject = pick(/<h1[^>]*class=["'][^"']*(?:message-subject|email-subject|subject)[^"']*["'][^>]*>([\s\S]*?)<\/h1>/i)
      || pick(/<h[1-3][^>]*id=["']subject["'][^>]*>([\s\S]*?)<\/h[1-3]>/i)
      || pick(/<meta[^>]+name=["']subject["'][^>]+content=["']([^"']+)["']/i)
      || pick(/<title>([^<]*)<\/title>/i);

    const from = pick(/<input[^>]+id=["']from["'][^>]*value=["']([^"']+)["']/i)
      || pick(/data-from=["']([^"']+)["']/i)
      || pick(/<(?:span|p|div)[^>]*class=["'][^"']*(?:from-email|sender-email|from)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|p|div)>/i)
      || pick(/From:\s*<[^>]+>([\s\S]*?)<\/[^>]+>/i);

    const to = pick(/<input[^>]+id=["']to["'][^>]*value=["']([^"']+)["']/i)
      || pick(/data-to=["']([^"']+)["']/i)
      || pick(/<(?:span|p|div)[^>]*class=["'][^"']*(?:to-email|recipient)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|p|div)>/i);

    const date = pick(/<time[^>]*>([\s\S]*?)<\/time>/i)
      || pick(/<(?:span|p|div)[^>]*class=["'][^"']*(?:date|received|message-date)[^"']*["'][^>]*>([\s\S]*?)<\/(?:span|p|div)>/i);

    // 1) Body diembed via srcdoc
    let body = pick(/<iframe[^>]*id=["']myContent["'][^>]*srcdoc=["']([\s\S]*?)["']\s*[>\/]/i)
      || pick(/<iframe[^>]*srcdoc=["']([\s\S]*?)["'][^>]*>/i);
    if (body) {
      body = body.replace(/&quot;/g, '"').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
    }

    // 2) Body diembed via src URL
    const iframeSrc = pick(/<iframe[^>]*id=["']myContent["'][^>]*src=["']([^"']+)["']/i)
      || pick(/<iframe[^>]*src=["']([^"']+)["'][^>]*>/i);

    // 3) Fallback: cari container utama
    if (!body && !iframeSrc) {
      body = pick(/<(?:div|section)[^>]*(?:id|class)=["'][^"']*(?:message-body|email-body|mail-body|content-area|message-content)[^"']*["'][^>]*>([\s\S]*?)<\/(?:div|section)>/i);
      if (!body) {
        const main = pick(/<main\b[^>]*>([\s\S]*?)<\/main>/i)
          || pick(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
        if (main) body = main;
      }
    }

    const text = stripHtml(body || html);

    return {
      id,
      subject: cleanText(subject),
      from: cleanText(from),
      to: cleanText(to),
      date: cleanText(date),
      bodyHtml: body || null,
      bodyText: text,
      iframeSrc: iframeSrc ? (iframeSrc.startsWith('http') ? iframeSrc : this.baseURL + iframeSrc) : null,
      url: `${this.baseURL}/view/${id}`,
    };
  }

  /** Polling realtime — resolve saat ada pesan baru atau timeout */
  async waitMessage(opts = {}) {
    const interval = Math.max(1000, opts.interval || 5000);
    const timeout = Math.max(interval, opts.timeout || 5 * 60 * 1000);
    const onTick = typeof opts.onTick === 'function' ? opts.onTick : null;
    const start = Date.now();
    let lastError = null;

    if (!this.mailbox) {
      try { await this.create(); } catch (e) {
        return { mailbox: this.mailbox, messages: [], error: e.message };
      }
    }
    // baseline
    let first;
    try { first = await this.inbox(); } catch (e) {
      return { mailbox: this.mailbox, messages: [], error: e.message };
    }
    for (const m of first.messages || []) this.lastSeenIds.add(m.id);

    let nextDelay = interval;
    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, nextDelay));
      nextDelay = interval;
      let data;
      try {
        data = await this.inbox();
      } catch (e) {
        lastError = e;
        if (onTick) onTick({ error: e.message });
        if (e.retryAfter) {
          const remaining = Math.max(interval, timeout - (Date.now() - start));
          nextDelay = Math.min(Math.max(interval, e.retryAfter), remaining);
        }
        continue;
      }
      lastError = null;
      const fresh = (data.messages || []).filter((m) => !this.lastSeenIds.has(m.id));
      for (const m of (data.messages || [])) this.lastSeenIds.add(m.id);
      if (onTick) onTick({ mailbox: data.mailbox, total: (data.messages || []).length, fresh: fresh.length });
      if (fresh.length) {
        const detailed = await Promise.all(fresh.map((m) =>
          this.view(m.id).then((d) => ({ ...m, ...d })).catch(() => m)
        ));
        return { mailbox: data.mailbox, messages: detailed };
      }
    }
    return {
      mailbox: this.mailbox,
      messages: [],
      timeout: true,
      error: lastError ? lastError.message : null,
    };
  }

  /**
   * Streaming realtime — terus polling sampai timeout, panggil onMessage
   * setiap kali ada email baru (lengkap dengan body & links).
   */
  async streamMessages(opts = {}) {
    const interval = Math.max(1000, opts.interval || 5000);
    const timeout = Math.max(interval, opts.timeout || 5 * 60 * 1000);
    const onMessage = typeof opts.onMessage === 'function' ? opts.onMessage : () => {};
    const onTick = typeof opts.onTick === 'function' ? opts.onTick : null;
    const start = Date.now();
    let lastError = null;

    if (!this.mailbox) {
      try { await this.create(); } catch (e) {
        return { mailbox: this.mailbox, total: 0, error: e.message };
      }
    }
    let first;
    try { first = await this.inbox(); } catch (e) {
      return { mailbox: this.mailbox, total: 0, error: e.message };
    }
    for (const m of first.messages || []) this.lastSeenIds.add(m.id);

    let totalReceived = 0;
    let nextDelay = interval;
    while (Date.now() - start < timeout) {
      await new Promise((r) => setTimeout(r, nextDelay));
      nextDelay = interval;
      let data;
      try {
        data = await this.inbox();
      } catch (e) {
        lastError = e;
        if (onTick) onTick({ error: e.message });
        if (e.retryAfter) {
          const remaining = Math.max(interval, timeout - (Date.now() - start));
          nextDelay = Math.min(Math.max(interval, e.retryAfter), remaining);
        }
        continue;
      }
      lastError = null;
      const fresh = (data.messages || []).filter((m) => !this.lastSeenIds.has(m.id));
      for (const m of (data.messages || [])) this.lastSeenIds.add(m.id);
      if (onTick) onTick({ mailbox: data.mailbox, total: (data.messages || []).length, fresh: fresh.length });
      for (const m of fresh) {
        let detail;
        try { detail = await this.view(m.id); } catch (_) { detail = {}; }
        const merged = { ...m, ...detail };
        totalReceived++;
        try { await onMessage(merged); } catch (_) {}
      }
    }
    return {
      mailbox: this.mailbox,
      total: totalReceived,
      timeout: true,
      error: lastError ? lastError.message : null,
    };
  }

  static get domains() {
    return [...DEFAULT_DOMAINS];
  }
}

function decodeHtmlEntities(s) {
  if (!s) return s;
  return String(s)
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => { try { return String.fromCodePoint(parseInt(h, 16)); } catch { return _; } })
    .replace(/&#(\d+);/g, (_, d) => { try { return String.fromCodePoint(parseInt(d, 10)); } catch { return _; } })
    .replace(/&nbsp;/gi, ' ')
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&amp;/gi, '&'); // HARUS terakhir biar gak double-decode
}

function extractLinks(html) {
  if (!html) return [];
  // Sebagian email HTML dikirim sebagai quoted-printable: href=3D"https://...".
  const source = decodeQuotedPrintable(String(html));
  const out = [];
  const seen = new Set();
  const re = /<a\b[^>]*href\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = re.exec(source)) !== null) {
    const url = decodeHtmlEntities((m[1] || m[2] || m[3] || '').trim());
    if (!/^https?:\/\//i.test(url)) continue;
    const label = cleanText(m[4]) || '';
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text: label });
  }
  // Plain-text fallback URLs (kalau body cuma teks)
  const plainRe = /(https?:\/\/[^\s<>"')]+)/gi;
  while ((m = plainRe.exec(source)) !== null) {
    const url = decodeHtmlEntities(m[1].replace(/[.,;:!?)]+$/, ''));
    if (seen.has(url)) continue;
    seen.add(url);
    out.push({ url, text: '' });
  }
  return out;
}

function decodeQuotedPrintable(value) {
  return String(value || '')
    .replace(/=\r?\n/g, '')
    // Decode only common URL-safe quoted-printable markers. A broad =HH
    // replacement would corrupt normal query strings such as =ABC123.
    .replace(/=3D/gi, '=')
    .replace(/=3F/gi, '?')
    .replace(/=26/gi, '&')
    .replace(/=2F/gi, '/')
    .replace(/=22/gi, '"')
    .replace(/=20/gi, ' ');
}

function normalizeLinkEntry(entry) {
  if (typeof entry === 'string') {
    return { url: decodeHtmlEntities(decodeQuotedPrintable(entry).trim()), text: '' };
  }
  if (!entry || typeof entry !== 'object') return null;
  const rawUrl = entry.url || entry.href || entry.link || entry.uri;
  if (!rawUrl) return null;
  return {
    url: decodeHtmlEntities(decodeQuotedPrintable(String(rawUrl)).trim()),
    text: cleanText(entry.text || entry.label || entry.title || ''),
  };
}

function mergeLinks(rawLinks, extracted) {
  const out = [];
  const seen = new Set();
  for (const entry of [...(Array.isArray(rawLinks) ? rawLinks : []), ...(extracted || [])]) {
    const link = normalizeLinkEntry(entry);
    if (!link || !/^https?:\/\//i.test(link.url) || seen.has(link.url)) continue;
    seen.add(link.url);
    out.push(link);
  }
  return out;
}

function cleanText(t) {
  if (t == null) return null;
  return String(t).replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim() || null;
}

function stripHtml(html) {
  if (!html) return '';
  return String(html)
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<br\s*\/?>(?!\n)/gi, '\n')
    .replace(/<\/(p|div|tr|li|h[1-6])>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

module.exports = TmailEtokom;
module.exports.TmailEtokom = TmailEtokom;
module.exports.DEFAULT_DOMAINS = DEFAULT_DOMAINS;
