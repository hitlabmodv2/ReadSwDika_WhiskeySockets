/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206739
 *  Telegram    : @Wilykun1994
 * ───────────────────────────────
 *  Script ini khusus donasi/VIP
 *  Support dari kalian semangatin saya
 *  makin rajin update fitur, fix bug,
 *  dan rawat script ini.
 *
 *  Dilarang menjual ulang script ini
 *  Tanpa izin resmi dari developer.
 *  Jika ketahuan = NO UPDATE / NO FIX
 *
 *  Hargai karya, gunakan dengan bijak.
 *  Terima kasih sudah support.
 * ───────────────────────────────
 *
 *  savekontak.cjs — Scraper & Simpan Kontak WA
 *
 *  .savekontak / .svgc
 *      Scrape semua nomor member GC → kirim sebagai vCard ke DM kamu
 *      Bisa dipakai di dalam grup langsung, atau dari mana saja + JID
 *
 *  .savekontakstop / .svcstop
 *      Batalkan proses scrape yang sedang berjalan
 *
 *  .sv <nomor>
 *      Simpan 1 kontak spesifik (nomor langsung, reply pesan, atau mention)
 *      Kirim vCard → langsung bisa disimpan ke phonebook HP
 * ───────────────────────────────
 */
'use strict';

// ══════════════════════════════════════════════════════════════════════════════
//  FLAG RUNNING — cegah double-run per instance hisoka
// ══════════════════════════════════════════════════════════════════════════════

function isSvkcRunning(hisoka)     { return hisoka._svkcRunning === true; }
function setSvkcRunning(hisoka, v) { hisoka._svkcRunning = v; if (!v) hisoka._svkcCancel = false; }
function requestSvkcCancel(hisoka) { hisoka._svkcCancel = true; }
function isSvkcCancelled(hisoka)   { return hisoka._svkcCancel === true; }

// ══════════════════════════════════════════════════════════════════════════════
//  PROGRESS BAR
// ══════════════════════════════════════════════════════════════════════════════

function makeBar(done, total, len = 10) {
        if (total === 0) return '[' + '░'.repeat(len) + ']';
        const filled = Math.round((done / total) * len);
        return '[' + '█'.repeat(filled) + '░'.repeat(len - filled) + ']';
}

// ══════════════════════════════════════════════════════════════════════════════
//  RESOLVE JID → NOMOR WA
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ambil nomor mentah dari JID.
 * - JID biasa : "628xxx@s.whatsapp.net" → "628xxx"
 * - JID LID   : coba resolve via __lookupLidPn, kalau gagal skip (return null)
 */
function resolveJidToNumber(jid) {
        if (!jid) return null;
        if (jid.endsWith('@lid')) {
                const resolved = global.__lookupLidPn ? global.__lookupLidPn(jid) : null;
                if (!resolved) return null; // LID tak ter-resolve → skip
                return resolved.split('@')[0].split(':')[0];
        }
        return jid.split('@')[0].split(':')[0];
}

// ══════════════════════════════════════════════════════════════════════════════
//  BUILD vCARD STRING
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Sanitasi string nama agar aman untuk format vCard.
 * Hapus karakter yang bisa rusak struktur vCard: ; : \ newline
 */
function sanitizeVCardName(str) {
        if (!str || typeof str !== 'string') return null;
        const clean = str
                .replace(/[;:\\]/g, '')   // hapus karakter vCard reserved
                .replace(/[\r\n]+/g, ' ') // ganti newline jadi spasi
                .trim();
        return clean.length > 0 ? clean : null;
}

/**
 * Buat format vCard v3.0 yang kompatibel dengan WhatsApp.
 * @param {string} nomor          — nomor tanpa + (contoh: "628123456789")
 * @param {string|null} namaDepan — nama depan (boleh null)
 * @param {string|null} namaBelakang — nama belakang (boleh null)
 *
 * Format vCard:
 *   N:NamaBelakang;NamaDepan;;;   ← untuk phonebook (sorting by last name)
 *   FN:NamaDepan NamaBelakang     ← nama tampilan penuh
 */
function buildVCard(nomor, namaDepan, namaBelakang) {
        const dep = sanitizeVCardName(namaDepan);
        const bel = sanitizeVCardName(namaBelakang);

        let displayName, nField;
        if (dep && bel) {
                displayName = `${dep} ${bel}`;
                nField      = `N:${bel};${dep};;;`;
        } else if (dep) {
                displayName = dep;
                nField      = `N:;${dep};;;`;
        } else {
                displayName = '+' + nomor;
                nField      = null;
        }

        const lines = ['BEGIN:VCARD', 'VERSION:3.0'];
        if (nField) lines.push(nField);
        lines.push(`FN:${displayName}`);
        lines.push(`TEL;type=CELL;type=VOICE;waid=${nomor}:+${nomor}`);
        lines.push('END:VCARD');
        return lines.join('\n');
}

// ══════════════════════════════════════════════════════════════════════════════
//  AMBIL DAFTAR MEMBER GRUP
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Ambil semua participant dari grup, filter bot sendiri & LID tak ter-resolve.
 * Return: { meta, members: [{ nomor, nama }] }
 */
async function getMemberNumbers(hisoka, gid) {
        const meta = await hisoka.groupMetadata(gid);
        const botNum = (hisoka.user?.id || '').split(':')[0].split('@')[0];

        const members = [];
        for (const p of (meta?.participants || [])) {
                const rawJid = p.id || p.jid || '';
                if (!rawJid) continue;
                const nomor = resolveJidToNumber(rawJid);
                if (!nomor) continue;          // LID tak ter-resolve
                if (nomor === botNum) continue; // skip bot sendiri
                members.push({
                        nomor,
                        nama: p.notify || p.name || null
                });
        }

        return { meta, members };
}

// ══════════════════════════════════════════════════════════════════════════════
//  KIRIM BATCH vCARD KE SATU JID
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Kirim array kontak ({nomor, nama}) sebagai satu contactsArrayMessage / contactMessage.
 * Baileys otomatis pilih contactMessage (1 item) atau contactsArrayMessage (>1 item).
 */
async function kirimBatchKontak(hisoka, tujuan, batch) {
        const contacts = batch.map(({ nomor, nama }) => ({
                // nama dari member GC → taruh sebagai namaDepan saja (tidak ada last name)
                vcard: buildVCard(nomor, nama, null)
        }));

        const displayName = contacts.length === 1
                ? (batch[0].nama || ('+' + batch[0].nomor))
                : `${contacts.length} Kontak`;

        await hisoka.sendMessage(tujuan, {
                contacts: { displayName, contacts }
        });
}

// ══════════════════════════════════════════════════════════════════════════════
//  HANDLER: .savekontak / .svgc
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Scrape semua nomor member GC → kirim sebagai vCard ke DM pengirim command.
 *
 * Cara pakai:
 *   .savekontak                       — di dalam grup (scrape grup saat ini)
 *   .savekontak 1203631xxx@g.us       — dari mana saja + JID grup target
 *   .svgc                             — alias
 */
async function handleSavekontak({ hisoka, m, query, tolak, logCommand }) {
        const pref = m.prefix || '.';

        // ── Guard: cegah double run ────────────────────────────────────────
        if (isSvkcRunning(hisoka)) return tolak(hisoka, m,
                `⚠️ *Scrape kontak sedang berjalan!*\n\n` +
                `Tunggu sampai selesai atau ketik \`${pref}savekontakstop\` untuk batalkan.`
        );

        // ── Tentukan target GC ─────────────────────────────────────────────
        let targetGid = null;

        if (query && query.trim().endsWith('@g.us')) {
                targetGid = query.trim();
        } else if (!query || !query.trim()) {
                // Tidak ada query — harus di grup
                if (m.isGroup) {
                        targetGid = m.from;
                } else {
                        return tolak(hisoka, m,
                                `❌ *Perintah ini butuh JID grup atau dipakai di dalam grup!*\n\n` +
                                `📌 *Cara pakai:*\n` +
                                `• Ketik \`${pref}savekontak\` *di dalam grup* langsung\n` +
                                `• Atau dari mana saja: \`${pref}savekontak <JID Grup>\`\n\n` +
                                `📝 *Contoh:*\n` +
                                `\`${pref}savekontak 120363192554714254@g.us\`\n\n` +
                                `🔍 *Belum tahu JID grup?*\n` +
                                `• \`${pref}cekjidgc\` — lihat JID grup saat ini\n` +
                                `• \`${pref}cekjidgcall\` — lihat semua JID grup bot`
                        );
                }
        } else {
                // Ada query tapi bukan JID valid
                return tolak(hisoka, m,
                        `❌ *JID grup tidak valid!*\n\n` +
                        `Format JID yang benar contohnya:\n` +
                        `\`120363192554714254@g.us\`\n\n` +
                        `🔍 *Cara cari JID:*\n` +
                        `• \`${pref}cekjidgc\` — ketik di dalam grup yang dituju\n` +
                        `• \`${pref}cekjidgcall\` — tampilkan semua JID grup bot`
                );
        }

        setSvkcRunning(hisoka, true);
        let progMsg = null;

        try {
                // ── Ambil data member ──────────────────────────────────────
                let meta, members;
                try {
                        ({ meta, members } = await getMemberNumbers(hisoka, targetGid));
                } catch (fetchErr) {
                        throw Object.assign(new Error('FETCH_FAILED'), { _detail: fetchErr?.message });
                }

                if (!members || members.length === 0) throw new Error('EMPTY_MEMBER');

                const namaGrup   = meta?.subject || targetGid;
                const senderJid  = m.sender;
                const total      = members.length;

                // ── Kirim status awal (live-edit) ──────────────────────────
                progMsg = await m.reply(
                        `📋 *Scrape Kontak GC*\n\n` +
                        `👥 *Grup :* ${namaGrup}\n` +
                        `👤 *Total :* ${total} member\n` +
                        `📤 *Tujuan :* DM kamu\n\n` +
                        `${makeBar(0, total)} 0/${total}\n` +
                        `⏳ _Sedang mengirim kontak..._`
                );

                // ── Loop kirim per batch ───────────────────────────────────
                const BATCH_SIZE = 5; // maks 5 vCard per pesan
                let terkirim = 0;
                let gagal    = 0;
                let dibatalkan = false;

                for (let i = 0; i < members.length; i += BATCH_SIZE) {
                        // Cek cancel sebelum tiap batch
                        if (isSvkcCancelled(hisoka)) { dibatalkan = true; break; }

                        const batch = members.slice(i, i + BATCH_SIZE);

                        try {
                                await kirimBatchKontak(hisoka, senderJid, batch);
                                terkirim += batch.length;
                        } catch (batchErr) {
                                gagal += batch.length;
                                // Log detail error batch, tapi lanjut
                                console.error(`[savekontak] Batch error (i=${i}):`, batchErr?.message);
                        }

                        // Update progress bar setiap batch
                        const done = terkirim + gagal;
                        if (progMsg?.key) {
                                try {
                                        await m.reply({
                                                edit: progMsg.key,
                                                text: `📋 *Scrape Kontak GC*\n\n` +
                                                        `👥 *Grup :* ${namaGrup}\n` +
                                                        `👤 *Total :* ${total} member\n` +
                                                        `📤 *Tujuan :* DM kamu\n\n` +
                                                        `${makeBar(done, total)} ${done}/${total}\n` +
                                                        `✔️ Terkirim: ${terkirim} | ❌ Gagal: ${gagal}\n` +
                                                        `⏳ _Sedang mengirim..._`
                                        });
                                } catch (_) { /* edit gagal, tidak masalah */ }
                        }

                        // Delay antar batch untuk hindari flood/block
                        if (i + BATCH_SIZE < members.length && !isSvkcCancelled(hisoka)) {
                                await new Promise(r => setTimeout(r, 1200));
                        }
                }

                // ── Pesan selesai / dibatalkan ─────────────────────────────
                const finalText = dibatalkan
                        ? `🛑 *Scrape Kontak GC dihentikan!*\n\n` +
                          `👥 *Grup :* ${namaGrup}\n` +
                          `✔️ *Terkirim :* ${terkirim} kontak\n` +
                          `❌ *Gagal :* ${gagal} kontak\n` +
                          `🔘 *Sisa :* ${total - terkirim - gagal} belum terkirim`
                        : `✅ *Scrape Kontak GC selesai!*\n\n` +
                          `👥 *Grup :* ${namaGrup}\n` +
                          `👤 *Total Member :* ${total}\n` +
                          `✔️ *Terkirim :* ${terkirim} kontak\n` +
                          `❌ *Gagal :* ${gagal} kontak\n\n` +
                          `_Kontak sudah dikirim ke DM kamu_ 📲\n` +
                          `_Tap tiap kontak → klik_ *Tambah ke Kontak*`;

                if (progMsg?.key) {
                        try { await m.reply({ edit: progMsg.key, text: finalText }); }
                        catch (_) { await m.reply(finalText); }
                } else {
                        await m.reply(finalText);
                }

        } catch (err) {
                // ── Error handler dengan pesan informatif ──────────────────
                let errMsg;
                switch (err.message) {
                        case 'EMPTY_MEMBER':
                                errMsg = `❌ *Grup tidak memiliki member atau gagal ambil data.*\n\n` +
                                         `Pastikan bot masih ada di dalam grup tersebut.`;
                                break;
                        case 'FETCH_FAILED':
                                errMsg = `❌ *Gagal mengambil data member grup!*\n\n` +
                                         `Kemungkinan penyebab:\n` +
                                         `• Bot sudah tidak ada di grup\n` +
                                         `• JID grup salah atau grup sudah dihapus\n` +
                                         `• Koneksi WhatsApp bermasalah\n\n` +
                                         (err._detail ? `Detail: \`${err._detail}\`` : '');
                                break;
                        default:
                                errMsg = `❌ *Terjadi error tak terduga!*\n\n` +
                                         `\`${err.message}\`\n\n` +
                                         `Coba ulangi beberapa saat lagi.`;
                }

                if (progMsg?.key) {
                        try { await m.reply({ edit: progMsg.key, text: errMsg }); }
                        catch (_) { await m.reply(errMsg); }
                } else {
                        await m.reply(errMsg);
                }
        } finally {
                setSvkcRunning(hisoka, false);
        }

        logCommand(m, hisoka, 'savekontak');
}

// ── HANDLER: .savekontakstop / .svcstop ───────────────────────────────────────

async function handleSavekontakstop({ hisoka, m, tolak, logCommand }) {
        if (!isSvkcRunning(hisoka)) {
                return m.reply('ℹ️ Tidak ada proses Scrape Kontak yang sedang berjalan saat ini.');
        }

        requestSvkcCancel(hisoka);
        await m.reply(
                '🛑 *Permintaan stop Scrape Kontak diterima!*\n\n' +
                '_Proses akan dihentikan setelah batch saat ini selesai..._'
        );
        logCommand(m, hisoka, 'savekontakstop');
}

// ══════════════════════════════════════════════════════════════════════════════
//  HANDLER: .sv (simpan 1 kontak spesifik)
// ══════════════════════════════════════════════════════════════════════════════

/**
 * Kirim vCard 1 kontak ke chat saat ini.
 *
 * Mode penggunaan:
 *   .sv 6281234567890            — nomor langsung
 *   .sv 081234567890             — otomatis konversi 08xx → 628xx
 *   .sv 6281234567890|Wily       — nomor + nama depan
 *   .sv 6281234567890|Wily|Deno  — nomor + nama depan + nama belakang
 *   [reply] .sv                  — ambil nomor dari pesan yang di-reply
 *   [reply] .sv Wily|Deno        — reply + nama custom (depan|belakang)
 *   [@mention] .sv               — ambil nomor dari tag mention
 *   [@mention] .sv Wily|Deno     — mention + nama custom
 *
 * Tap kontak yang muncul → klik "Tambah ke Kontak" untuk simpan ke HP.
 */
async function handleSv({ hisoka, m, query, tolak, logCommand }) {
        const pref = m.prefix || '.';

        let targetNomor     = null;
        let targetNamaDepan = null;
        let targetNamaBelakang = null;

        // ══════════════════════════════════════════════════════════════════
        //  LANGKAH 1: Parse query untuk pisah nomor vs nama (via | )
        // ══════════════════════════════════════════════════════════════════
        let queryNomor        = null; // bagian nomor dari query (jika ada)
        let queryNamaDepan    = null;
        let queryNamaBelakang = null;

        if (query && query.trim()) {
                // Strip token @mention (teks "@xxx") dari query agar tidak masuk ke nama
                // Contoh: ".sv @Wily Wily|Deno" → cleanQuery = "Wily|Deno"
                const cleanQuery = query.trim().replace(/@\S+/g, '').trim();

                const parts = cleanQuery.split('|').map(s => s.trim()).filter(Boolean);

                if (parts.length > 0) {
                        const firstClean = parts[0].replace(/[\s\-\+\(\)\.]/g, '');

                        if (/^\d+$/.test(firstClean)) {
                                // Format: .sv 628xxx  /  .sv 628xxx|NamaDepan  /  .sv 628xxx|Dep|Bel
                                queryNomor        = firstClean;
                                queryNamaDepan    = parts[1] || null;
                                queryNamaBelakang = parts[2] || null;
                        } else {
                                // Format: .sv Wily  /  .sv Wily|Deno  (dipakai bareng reply/mention)
                                queryNamaDepan    = parts[0] || null;
                                queryNamaBelakang = parts[1] || null;
                        }
                }
                // Kalau parts kosong (query hanya @mention) → semua tetap null,
                // nomor akan diambil dari mentionedJids di Mode B
        }

        // ══════════════════════════════════════════════════════════════════
        //  LANGKAH 2: Tentukan sumber nomor
        // ══════════════════════════════════════════════════════════════════

        // ── Kumpulkan mentionedJid ─────────────────────────────────────
        const mentionedJids = [
                ...(Array.isArray(m.mentions) ? m.mentions : []),
                ...(m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []),
                ...(m.message?.imageMessage?.contextInfo?.mentionedJid || []),
                ...(m.message?.videoMessage?.contextInfo?.mentionedJid || []),
                ...(m.content?.contextInfo?.mentionedJid || []),
        ].filter(Boolean);

        // ── Mode A: Query punya nomor → pakai nomor dari query ────────
        if (queryNomor) {
                let raw = queryNomor;

                // Konversi format lokal → internasional
                if (raw.startsWith('0'))                                        raw = '62' + raw.slice(1);
                else if (!raw.startsWith('62') && !raw.startsWith('1') && raw.length <= 12) raw = '62' + raw;

                // Validasi panjang
                if (raw.length < 7 || raw.length > 15) {
                        return tolak(hisoka, m,
                                `❌ *Panjang nomor tidak valid!* (${raw.length} digit)\n\n` +
                                `Nomor WA yang valid biasanya 10–13 digit.\n\n` +
                                `📌 *Contoh format:*\n` +
                                `• \`${pref}sv 6281234567890\`\n` +
                                `• \`${pref}sv 081234567890\`\n` +
                                `• \`${pref}sv 628xxx|NamaDepan|NamaBelakang\``
                        );
                }

                targetNomor        = raw;
                targetNamaDepan    = queryNamaDepan;
                targetNamaBelakang = queryNamaBelakang;
        }
        // ── Mode B: Ada mention → ambil nomor dari mention ────────────
        else if (mentionedJids.length > 0) {
                const botNum   = (hisoka.user?.id || '').split(':')[0].split('@')[0];
                const targetJid = mentionedJids.find(jid => {
                        const n = resolveJidToNumber(jid);
                        return n && n !== botNum;
                });

                if (!targetJid) return tolak(hisoka, m,
                        `❌ *Tidak ada nomor valid dari mention tersebut.*\n\n` +
                        `Coba mention orang lain atau ketik nomornya langsung:\n` +
                        `\`${pref}sv 6281234567890\``
                );

                targetNomor = resolveJidToNumber(targetJid);
                if (!targetNomor) return tolak(hisoka, m,
                        `❌ *Gagal resolve nomor dari mention.*\n\n` +
                        `Kemungkinan akun LID belum ter-sinkronisasi.\n` +
                        `Coba ketik nomornya langsung:\n` +
                        `\`${pref}sv 6281234567890\``
                );

                // Nama dari query (jika ada) override nama default
                targetNamaDepan    = queryNamaDepan;
                targetNamaBelakang = queryNamaBelakang;
        }
        // ── Mode C: Ada reply → ambil nomor dari pengirim quoted ──────
        else if (m.isQuoted && m.quoted) {
                const qJid = m.quoted.sender
                        || m.quoted.key?.participant
                        || m.quoted.key?.remoteJid
                        || '';

                targetNomor = resolveJidToNumber(qJid);
                if (!targetNomor) {
                        return tolak(hisoka, m,
                                `❌ *Tidak bisa resolve nomor dari pesan yang di-reply.*\n\n` +
                                `Kemungkinan penyebab:\n` +
                                `• Pesan dikirim dari akun LID yang belum ter-sinkronisasi\n` +
                                `• Pesan sistem bukan dari user\n\n` +
                                `Coba ketik nomornya langsung:\n` +
                                `\`${pref}sv 6281234567890\``
                        );
                }

                // Kalau user kasih nama custom via query → pakai itu
                // Kalau tidak → pakai nama WA pengirim (pushName)
                if (queryNamaDepan) {
                        targetNamaDepan    = queryNamaDepan;
                        targetNamaBelakang = queryNamaBelakang;
                } else {
                        // Split pushName jadi depan & belakang otomatis (pisah spasi pertama)
                        const pushName = m.quoted.pushName || null;
                        if (pushName) {
                                const spaceIdx = pushName.indexOf(' ');
                                if (spaceIdx > -1) {
                                        targetNamaDepan    = pushName.slice(0, spaceIdx).trim();
                                        targetNamaBelakang = pushName.slice(spaceIdx + 1).trim() || null;
                                } else {
                                        targetNamaDepan = pushName;
                                }
                        }
                }
        }
        // ── Mode D: Chat pribadi (DM) tanpa nomor/reply/mention ──────
        // Otomatis ambil nomor dari lawan chat (m.from)
        else if (!m.isGroup && m.from && m.from.endsWith('@s.whatsapp.net')) {
                targetNomor = resolveJidToNumber(m.from);
                if (!targetNomor) {
                        return tolak(hisoka, m,
                                `❌ *Gagal resolve nomor dari chat ini.*\n\n` +
                                `Coba ketik nomornya langsung:\n` +
                                `\`${pref}sv 6281234567890\``
                        );
                }

                // Nama dari query (opsional) — kalau tidak ada, tampil sebagai +nomor
                targetNamaDepan    = queryNamaDepan    || null;
                targetNamaBelakang = queryNamaBelakang || null;
        }
        // ── Mode E: Di grup tanpa reply/mention/nomor → pesan error spesifik ──
        else {
                // Kalau user sudah kasih nama tapi lupa reply/mention/nomor
                if (queryNamaDepan) {
                        return tolak(hisoka, m,
                                `❌ *Nama diberikan tapi tidak ada target nomor!*\n\n` +
                                `Kamu ketik nama *"${queryNamaDepan}${queryNamaBelakang ? '|' + queryNamaBelakang : ''}"* tapi bot tidak tahu nomor siapa yang mau disimpan.\n\n` +
                                `📌 *Cara pakai dengan nama:*\n` +
                                `• Reply pesan → \`${pref}sv ${queryNamaDepan}${queryNamaBelakang ? '|' + queryNamaBelakang : ''}\`\n` +
                                `• Tag orang → \`${pref}sv @nama ${queryNamaDepan}${queryNamaBelakang ? '|' + queryNamaBelakang : ''}\`\n` +
                                `• Atau langsung ketik nomor → \`${pref}sv 628xxx|${queryNamaDepan}${queryNamaBelakang ? '|' + queryNamaBelakang : ''}\``
                        );
                }

                // Tidak ada apa-apa → tampilkan bantuan ringkas
                return m.reply(
                        `📇 *Simpan Kontak — .sv*\n\n` +
                        `📌 *Cara pakai:*\n` +
                        `• Reply pesan → \`${pref}sv\` — simpan pengirim\n` +
                        `• Reply pesan → \`${pref}sv Wily\` — simpan dengan nama depan\n` +
                        `• Reply pesan → \`${pref}sv Wily|Den\` — simpan dengan nama depan + belakang\n` +
                        `• Tag orang → \`${pref}sv @nama Wily|Den\`\n` +
                        `• Nomor langsung → \`${pref}sv 628xxx\`\n` +
                        `• Nomor + nama → \`${pref}sv 628xxx|Wily|Den\`\n` +
                        `• Di DM → \`${pref}sv\` atau \`${pref}sv Wily|Den\`\n\n` +
                        `📌 *Scrape semua kontak GC:*\n` +
                        `• \`${pref}savekontak\` — kirim semua kontak grup ke DM kamu\n\n` +
                        `💡 Tap kartu kontak → *Tambah ke Kontak* untuk simpan ke HP 📲`
                );
        }

        // ══════════════════════════════════════════════════════════════════
        //  LANGKAH 3: Kirim vCard
        // ══════════════════════════════════════════════════════════════════
        try {
                const vcard = buildVCard(targetNomor, targetNamaDepan, targetNamaBelakang);

                // Nama tampilan untuk header pesan WhatsApp
                const displayName = targetNamaDepan
                        ? (targetNamaBelakang ? `${targetNamaDepan} ${targetNamaBelakang}` : targetNamaDepan)
                        : ('+' + targetNomor);

                await hisoka.sendMessage(m.from, {
                        contacts: {
                                displayName,
                                contacts: [{ vcard }]
                        }
                });

                // Konfirmasi dengan detail nama
                let namaInfo = `👤 *Nama :* ${displayName}`;
                if (targetNamaDepan && targetNamaBelakang) {
                        namaInfo = `👤 *Nama Depan :* ${targetNamaDepan}\n` +
                                   `👤 *Nama Belakang :* ${targetNamaBelakang}`;
                }

                await m.reply(
                        `✅ *Kontak berhasil dikirim!*\n\n` +
                        `${namaInfo}\n` +
                        `📞 *Nomor :* +${targetNomor}\n\n` +
                        `_Tap kartu kontak di atas → klik_ *Tambah ke Kontak* _untuk menyimpan ke HP_ 📲`
                );

        } catch (err) {
                // ── Error handler detail ───────────────────────────────
                let errMsg = `❌ *Gagal mengirim kontak!*\n\n`;

                if (err?.message?.includes('400') || err?.message?.includes('Bad Request')) {
                        errMsg += `Kemungkinan nomor \`+${targetNomor}\` tidak terdaftar di WhatsApp.\n\n`;
                } else if (err?.message?.includes('timeout') || err?.message?.includes('Timed Out')) {
                        errMsg += `Koneksi timeout — coba ulangi beberapa saat lagi.\n\n`;
                } else if (err?.message?.includes('rate') || err?.message?.includes('429')) {
                        errMsg += `Bot sedang kena rate limit — tunggu sebentar lalu coba lagi.\n\n`;
                } else {
                        errMsg += `Detail error: \`${err?.message || 'Unknown error'}\`\n\n`;
                }

                errMsg += `Kemungkinan penyebab lain:\n` +
                          `• Format nomor salah\n` +
                          `• Koneksi WhatsApp bermasalah\n` +
                          `• Nomor tidak aktif di WA`;

                await tolak(hisoka, m, errMsg);
        }

        logCommand(m, hisoka, 'sv');
}

// ══════════════════════════════════════════════════════════════════════════════
//  EXPORTS
// ══════════════════════════════════════════════════════════════════════════════

module.exports.handleSavekontak     = handleSavekontak;
module.exports.handleSavekontakstop = handleSavekontakstop;
module.exports.handleSv             = handleSv;
