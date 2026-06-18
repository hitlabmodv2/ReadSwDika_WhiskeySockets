'use strict';

/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *
 *  sematkan.cjs — Sematkan (pin) pesan di grup WhatsApp
 *
 *  Cara pakai:
 *    Reply pesan → .sematkan          → sematkan 24 jam
 *    Reply pesan → .sematkan 7        → sematkan 7 hari
 *    Reply pesan → .sematkan 30       → sematkan 30 hari
 *
 *  Bot wajib admin di grup.
 *  Cek admin: botadmin.json (realtime) → fallback live groupMetadata.
 *
 *  FIX LID: Semua grup pakai addressingMode:lid, participant di key
 *  adalah LID JID (@lid). Harus resolve ke phone number (@s.whatsapp.net)
 *  via hisoka.resolveLidToPN() sebelum kirim pin ke WhatsApp server.
 * ───────────────────────────────
 */

const LOG = '[Sematkan]';

// ── Peta durasi pin ───────────────────────────────────────────────────────────
// type 1  → 24 jam
// type 7  → 7 hari
// type 30 → 30 hari
const DURASI_TYPE_MAP = {
    '1': 1, '24': 1, '24h': 1, '1d': 1,
    '7': 7, '7d': 7, '7hari': 7, 'seminggu': 7,
    '30': 30, '30d': 30, '30hari': 30, 'sebulan': 30,
};

function parseDurasi(query) {
    const q = (query || '').trim().toLowerCase().replace(/\s+/g, '');
    if (!q) return 1;
    if (DURASI_TYPE_MAP[q] !== undefined) return DURASI_TYPE_MAP[q];
    const num = parseInt(q, 10);
    if (num === 7)  return 7;
    if (num === 30) return 30;
    return 1;
}

function durasiLabel(type) {
    if (type === 7)  return '7 hari';
    if (type === 30) return '30 hari';
    return '24 jam';
}

// ── Cek LID JID ───────────────────────────────────────────────────────────────
function isLidJid(jid) {
    return typeof jid === 'string' && jid.endsWith('@lid');
}

// ── Resolve key: LID participant → phone number ───────────────────────────────
// Grup pakai addressingMode:lid → m.quoted.key.participant berupa @lid
// WhatsApp server butuh @s.whatsapp.net untuk pin, bukan @lid
async function resolveKeyForPin(hisoka, rawKey) {
    // Buat salinan key (jangan mutasi original)
    const key = { ...rawKey };

    if (!key.participant) {
        console.log(`${LOG} Key tidak punya participant — tidak perlu resolve`);
        return key;
    }

    if (!isLidJid(key.participant)) {
        console.log(`${LOG} Participant sudah phone number: ${key.participant}`);
        return key;
    }

    // Participant adalah LID — resolve ke phone number
    console.log(`${LOG} LID participant terdeteksi: ${key.participant} — resolve ke phone number…`);

    try {
        // resolveLidToPN menerima key object, mengembalikan phone number JID string
        const resolved = await hisoka.resolveLidToPN(key);
        console.log(`${LOG} Hasil resolve: ${key.participant} → ${resolved}`);

        if (resolved && !isLidJid(resolved)) {
            key.participant = resolved;
            console.log(`${LOG} ✅ Participant berhasil di-resolve: ${resolved}`);
        } else {
            // Fallback manual: cari di groups store
            console.log(`${LOG} resolveLidToPN masih LID (${resolved}), coba fallback groups store…`);
            if (hisoka.groups && key.remoteJid) {
                const group = hisoka.groups.read?.(key.remoteJid) || null;
                const participants = group?.participants || [];
                const match = participants.find(p =>
                    p.id === key.participant ||
                    p.lid === key.participant ||
                    (p.id || '').split('@')[0] === (key.participant || '').split('@')[0]
                );
                if (match?.phoneNumber) {
                    key.participant = match.phoneNumber;
                    console.log(`${LOG} ✅ Participant resolve via groups store: ${key.participant}`);
                } else if (match?.id && !isLidJid(match.id)) {
                    key.participant = match.id;
                    console.log(`${LOG} ✅ Participant resolve via groups store (id): ${key.participant}`);
                } else {
                    console.warn(`${LOG} ⚠️ Participant tidak bisa di-resolve, pin pakai LID: ${key.participant}`);
                }
            }
        }
    } catch (err) {
        console.error(`${LOG} Gagal resolve LID participant:`, err.message);
    }

    return key;
}

// ── Cek apakah bot admin di grup ──────────────────────────────────────────────
async function checkBotAdmin(hisoka, groupJid, kvGet) {
    // 1. Cek dari cache botadmin.json
    const botAdminData = kvGet('botadmin/botadmin', {});
    if (groupJid in botAdminData) {
        const fromCache = botAdminData[groupJid] === true;
        console.log(`${LOG} Admin check (cache) → grup: ${groupJid} → isAdmin: ${fromCache}`);
        return fromCache;
    }

    // 2. Fallback: fetch live dari groupMetadata
    console.log(`${LOG} Tidak ada di cache botadmin — fetch live groupMetadata untuk: ${groupJid}`);
    try {
        const groupMeta = await hisoka.groupMetadata(groupJid);
        const botRaw    = hisoka.user?.id || '';
        const botNum    = botRaw.split('@')[0].split(':')[0];
        const botP      = (groupMeta?.participants || []).find(p => {
            const pNum = (p.id || p.jid || p.phoneNumber || '').split('@')[0].split(':')[0];
            return pNum === botNum;
        });
        const isAdmin = !!(botP?.admin);
        console.log(`${LOG} Admin check (live) → botNum: ${botNum} → isAdmin: ${isAdmin}`);
        return isAdmin;
    } catch (err) {
        console.error(`${LOG} Gagal fetch groupMetadata:`, err.message);
        return false;
    }
}

// ── Handler utama ─────────────────────────────────────────────────────────────
/**
 * @param {object}   hisoka  - Baileys socket
 * @param {object}   m       - message object
 * @param {string}   query   - argumen setelah command (.sematkan 7 → '7')
 * @param {Function} tolak   - fungsi reply dari message handler
 * @param {Function} kvGet   - fungsi baca data/kv
 * @returns {Promise<boolean>} true = sukses (untuk logCommand di caller)
 */
async function handleSematkan(hisoka, m, query, tolak, kvGet) {
    const pfx = m.prefix || '.';

    console.log(`${LOG} ─────────────────────────────────`);
    console.log(`${LOG} Command: ${pfx}sematkan | query: "${query || ''}" | dari: ${m.sender} | grup: ${m.from || '-'}`);

    // ── 1. Harus di grup ──────────────────────────────────────────────────────
    if (!m.isGroup) {
        console.log(`${LOG} Bukan grup — ditolak`);
        await tolak(hisoka, m, '❌ Fitur ini hanya bisa dipakai di dalam *grup*.');
        return false;
    }

    // ── 2. Harus reply pesan ──────────────────────────────────────────────────
    if (!m.isQuoted || !m.quoted?.key) {
        console.log(`${LOG} Tidak ada pesan yang di-reply — ditolak`);
        await tolak(hisoka, m,
            `╭─「 📌 *SEMATKAN PESAN* 」\n` +
            `│\n` +
            `│ ❌ *Harus reply pesan yang mau disematkan!*\n` +
            `│\n` +
            `│ *Cara pakai:*\n` +
            `│ • Reply pesan → *${pfx}sematkan*\n` +
            `│ • Reply pesan → *${pfx}sematkan 7* (7 hari)\n` +
            `│ • Reply pesan → *${pfx}sematkan 30* (30 hari)\n` +
            `│\n` +
            `│ ⏱️ *Durasi tersedia:*\n` +
            `│ • 1 / 24 / 24h = 24 jam (default)\n` +
            `│ • 7 / 7d       = 7 hari\n` +
            `│ • 30 / 30d     = 30 hari\n` +
            `╰──────────────────────`
        );
        return false;
    }

    // ── 3. Cek bot admin ──────────────────────────────────────────────────────
    const isBotAdmin = await checkBotAdmin(hisoka, m.from, kvGet);
    if (!isBotAdmin) {
        console.log(`${LOG} Bot bukan admin di grup ${m.from} — ditolak`);
        await tolak(hisoka, m,
            `╭─「 📌 *SEMATKAN PESAN* 」\n` +
            `│\n` +
            `│ ❌ *Bot harus jadi admin grup!*\n` +
            `│\n` +
            `│ Jadikan bot sebagai admin terlebih dahulu,\n` +
            `│ lalu coba lagi.\n` +
            `╰──────────────────────`
        );
        return false;
    }

    // ── 4. Parse durasi ───────────────────────────────────────────────────────
    const durasiType = parseDurasi(query);
    const durasiStr  = durasiLabel(durasiType);
    const rawKey     = m.quoted.key;
    const senderNum  = (m.sender || '').split('@')[0].split(':')[0];

    console.log(`${LOG} Raw key: ${JSON.stringify(rawKey)}`);
    console.log(`${LOG} Durasi: ${durasiStr} (type=${durasiType})`);

    // ── 5. Resolve LID participant → phone number ─────────────────────────────
    // Penting: semua grup pakai addressingMode:lid, participant bisa @lid
    // WhatsApp server butuh phone number JID untuk pin
    const pinKey = await resolveKeyForPin(hisoka, rawKey);
    console.log(`${LOG} Pin key final: ${JSON.stringify(pinKey)}`);

    // ── 6. Kirim pin via Baileys ──────────────────────────────────────────────
    try {
        await hisoka.sendMessage(m.from, {
            pin  : pinKey,
            type : durasiType,
        });

        console.log(`${LOG} ✅ Berhasil disematkan — durasi: ${durasiStr} | grup: ${m.from}`);

        await tolak(hisoka, m,
            `╭─「 📌 *PESAN DISEMATKAN* 」\n` +
            `│\n` +
            `│ ✅ Pesan berhasil disematkan!\n` +
            `│\n` +
            `│ ⏱️ Durasi : *${durasiStr}*\n` +
            `│ 👤 Oleh   : @${senderNum}\n` +
            `╰──────────────────────`
        );

        return true;
    } catch (err) {
        console.error(`${LOG} ❌ Gagal menyematkan pesan:`, err.message);
        await tolak(hisoka, m,
            `╭─「 📌 *SEMATKAN PESAN* 」\n` +
            `│\n` +
            `│ ❌ *Gagal menyematkan pesan!*\n` +
            `│\n` +
            `│ ⚠️ Error : ${err.message}\n` +
            `│\n` +
            `│ 💡 Pastikan bot masih jadi admin\n` +
            `│    dan coba lagi.\n` +
            `╰──────────────────────`
        );
        return false;
    }
}

module.exports = { handleSematkan };
