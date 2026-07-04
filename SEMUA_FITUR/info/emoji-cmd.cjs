/**
 * ───────────────────────────────
 *  Base Script : Bang Dika Ardnt
 *  Recode By   : Bang Wilykun
 *  WhatsApp    : 6289688206789
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
 *  emoji-cmd.cjs — Emoji command handler
 *  Button single_select realtime untuk semua perintah emoji:
 *  .emoji / .emojilist / .emojicustom / .emojidefault / .emojiclear
 * ───────────────────────────────
 */
'use strict';

// ── Auto-delete: simpan key pesan button terakhir per-jid ──────────────────
const _lastMsgMap = new Map();

async function _deleteLastMsg(hisoka, jid) {
    const prev = _lastMsgMap.get(jid);
    if (prev) {
        try { await hisoka.sendMessage(jid, { delete: prev }); } catch (_) {}
        _lastMsgMap.delete(jid);
    }
}

// ── Render daftar emoji (single vs gabung) ─────────────────────────────────
function _renderEmojiList(emojis) {
    if (!emojis || emojis.length === 0) return '_❌ Belum ada emoji tersimpan_';
    try {
        const segmenter = new Intl.Segmenter('en', { granularity: 'grapheme' });
        const single = [];
        const gabung = [];
        for (const e of emojis) {
            const clusters = [...segmenter.segment(String(e))].filter(s => s.segment.trim()).length;
            if (clusters > 1) gabung.push(e);
            else single.push(e);
        }
        const parts = [];
        if (single.length > 0) parts.push(`📌 *Single (${single.length}):* ${single.join(' ')}`);
        if (gabung.length > 0) parts.push(`🔗 *Gabung (${gabung.length}):* ${gabung.map((g, i) => `${i + 1}:[${g}]`).join(' ')}`);
        return parts.join('\n') || '_❌ Belum ada emoji tersimpan_';
    } catch {
        return `*Daftar:* ${emojis.join(' ')}`;
    }
}

// ── Body status realtime ────────────────────────────────────────────────────
function _buildStatusLine(data, isJb, jbNum) {
    const isCustom  = data.mode === 'custom';
    const modeIcon  = isCustom ? '🎨' : '🌐';
    const modeLabel = isCustom
        ? (isJb ? 'Custom — emoji kamu sendiri'  : 'Custom — emoji kustom')
        : (isJb ? 'Default — ikut bot utama'     : 'Default — pool 1900 emoji');
    let line = '';
    if (isJb) line += `👤 *+${jbNum}*\n`;
    line += `${modeIcon} *Mode:* ${modeLabel}\n`;
    line += `📊 *Total:* ${data.count} emoji aktif`;
    return line;
}

// ── Body panduan (.emoji / .emojicustom / .emojidefault / .emojiclear) ──────
function _buildPanduanBody(data, isJb, jbNum) {
    const status = _buildStatusLine(data, isJb, jbNum);
    const body = [
        status,
        '',
        '📋 *Panduan Emoji Reaksi*',
        '',
        '*➕ Tambah Emoji*',
        '• `.emojiadd 😊` — tambah 1 emoji',
        '• `.emojiadd 😊,😄,😁` — banyak _(pakai koma)_',
        '• `.emojiadd 😊😄😁` — _gabung jadi 1 reaksi_',
        '',
        '*➖ Hapus Emoji*',
        '• `.emojidel 😊` — hapus single',
        '• `.emojidel 😊,😄` — hapus banyak _(pakai koma)_',
        '• `.emojidel 1` — hapus gabung nomor 1',
        '• `.emojidel 1,2` — hapus gabung nomor 1 & 2',
        '',
        '> Gunakan _.emojilist_ untuk lihat nomor urut emoji gabung',
    ].join('\n');
    return body;
}

// ── Body daftar emoji (.emojilist) ─────────────────────────────────────────
function _buildListBody(data, isJb, jbNum) {
    const status   = _buildStatusLine(data, isJb, jbNum);
    const listText = _renderEmojiList(data.emojis);
    const body = [
        status,
        '',
        '📋 *Daftar Emoji Aktif*',
        '',
        listText,
        '',
        '> Nomor _[1], [2], ..._ dipakai untuk `.emojidel 1`',
    ].join('\n');
    return body;
}

// ── Kirim button single_select + fallback teks ─────────────────────────────
async function _sendButton(hisoka, m, Button, tolak, data, isJb, jbNum, bodyText) {
    const jid      = m.from || m.sender;
    const isCustom = data.mode === 'custom';

    const defMark  = !isCustom ? '✓ ' : '';
    const cusMark  = isCustom  ? '✓ ' : '';
    const defActv  = !isCustom ? '⚡ Sedang Aktif — ' : '';
    const cusActv  = isCustom  ? '⚡ Sedang Aktif — ' : '';

    const defLabel = isJb ? 'Default (ikut bot utama)'    : 'Default (1900 emoji)';
    const cusLabel = isJb ? 'Custom (emoji sendiri)'       : 'Custom (emoji kustom)';
    const defDesc  = isJb
        ? `${defActv}Reaksi SW pakai emoji dari bot utama`
        : `${defActv}Reaksi SW pakai pool 1900 emoji bawaan`;
    const cusDesc  = isJb
        ? `${cusActv}Reaksi SW pakai emoji file kamu sendiri`
        : `${cusActv}Reaksi SW pakai emoji kustom kamu`;

    await _deleteLastMsg(hisoka, jid);

    if (Button) {
        try {
            const msg = await new Button()
                .setBody(bodyText)
                .setFooter('🎨 ModeEmoji — pilih untuk ubah')
                .addSelection('Pilih Aksi')
                .makeSections('🔘 Mode Reaksi')
                .makeRow(`${defMark}${defLabel}`, `Reaksi ${defLabel}`, defDesc, 'emojidefault')
                .makeRow(`${cusMark}${cusLabel}`, `Reaksi ${cusLabel}`, cusDesc, 'emojicustom')
                .makeSections('⚡ Aksi Cepat')
                .makeRow('🔄 Reset Custom ke Seed', 'Reset Emoji Custom', 'Kembalikan emoji kustom ke default seed awal', 'emojiclear')
                .makeRow('📋 Lihat Daftar Emoji',   'List Emoji Aktif',   'Tampilkan semua emoji yang sedang aktif',        'emojilist')
                .run(jid, hisoka, m);
            if (msg?.key) _lastMsgMap.set(jid, msg.key);
            return;
        } catch (_) {}
    }

    // Fallback teks
    await tolak(hisoka, m, bodyText);
}

// ── Ambil data emoji sesuai konteks ────────────────────────────────────────
async function _getEmojiData(isJb, jbNum, listJadibotEmojis) {
    if (isJb) return listJadibotEmojis(jbNum);
    const { listEmojis } = await import('../helper/emoji.js');
    return listEmojis();
}

// ── handleEmoji (.emoji) — Tampilkan panduan ──────────────────────────────
async function handleEmoji({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        const data     = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
        const bodyText = _buildPanduanBody(data, _isJb, _jbNum);
        await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emoji');
    } catch (err) {
        console.error('\x1b[31m[Emoji] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── handleEmojilist (.emojilist) — Tampilkan daftar emoji realtime ─────────
async function handleEmojilist({ hisoka, m, tolak, logCommand, getJadibotNumber, listJadibotEmojis, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        const data     = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
        const bodyText = _buildListBody(data, _isJb, _jbNum);
        await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojilist');
    } catch (err) {
        console.error('\x1b[31m[EmojiList] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── handleEmojidefault (.emojidefault) — Ganti ke mode Default ────────────
async function handleEmojidefault({ hisoka, m, tolak, logCommand, getJadibotNumber, resetToDefaultEmojis, listJadibotEmojis, Button }) {
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        const before   = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
        const wasAlready = before.mode !== 'custom';

        let data;
        if (_isJb) {
            resetToDefaultEmojis(_jbNum);
            data = listJadibotEmojis(_jbNum);
        } else {
            const { setDefaultMode, listEmojis } = await import('../helper/emoji.js');
            setDefaultMode();
            data = listEmojis();
        }
        const infoLine = wasAlready
            ? '_ℹ️ Mode Default memang sudah aktif sebelumnya, tidak ada perubahan_'
            : '✅ *Mode Default berhasil diaktifkan*';
        const bodyText = `${infoLine}\n\n${_buildPanduanBody(data, _isJb, _jbNum)}`;
        await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojidefault');
    } catch (err) {
        console.error('\x1b[31m[EmojiDefault] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── handleEmojicustom (.emojicustom) — Ganti ke mode Custom ──────────────
async function handleEmojicustom({ hisoka, m, tolak, logCommand, getJadibotNumber, setCustomEmojiMode, listJadibotEmojis, Button }) {
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        const before     = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
        const wasAlready = before.mode === 'custom';

        let data;
        if (_isJb) {
            setCustomEmojiMode(_jbNum);
            data = listJadibotEmojis(_jbNum);
        } else {
            const { setCustomMode, listEmojis } = await import('../helper/emoji.js');
            setCustomMode();
            data = listEmojis();
        }
        const infoLine = wasAlready
            ? '_ℹ️ Mode Custom memang sudah aktif sebelumnya, tidak ada perubahan_'
            : '✅ *Mode Custom berhasil diaktifkan*';
        const bodyText = `${infoLine}\n\n${_buildPanduanBody(data, _isJb, _jbNum)}`;
        await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojicustom');
    } catch (err) {
        console.error('\x1b[31m[EmojiCustom] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── handleEmojiclear (.emojiclear) — Reset emoji custom ke seed ───────────
async function handleEmojiclear({ hisoka, m, tolak, logCommand, getJadibotNumber, clearJadibotEmojis, listJadibotEmojis, Button }) {
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        let data;
        if (_isJb) {
            clearJadibotEmojis(_jbNum);
            data = listJadibotEmojis(_jbNum);
        } else {
            const { resetCustomEmojis, listEmojis } = await import('../helper/emoji.js');
            resetCustomEmojis();
            data = listEmojis();
        }
        const bodyText = _buildPanduanBody(data, _isJb, _jbNum);
        await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojiclear');
    } catch (err) {
        console.error('\x1b[31m[EmojiClear] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── Parser input emoji (koma/spasi/gabung) ────────────────────────────────
function _parseEmojiInput(input) {
    if (!input) return [];
    const _seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
    const byDelim = input.split(/[,.]/).map(s => s.trim()).filter(Boolean);
    const result = [];
    for (const seg of byDelim) {
        if (/\s/.test(seg)) {
            const bySpace = seg.split(/\s+/).filter(Boolean);
            const allSingle = bySpace.every(token =>
                [..._seg.segment(token)].filter(s => s.segment.trim()).length === 1
            );
            if (allSingle) result.push(...bySpace);
            else result.push(seg);
        } else {
            result.push(seg);
        }
    }
    return result;
}

// ── Body hasil aksi (add / del) ────────────────────────────────────────────
function _buildResultBody(data, isJb, jbNum, resultLines) {
    const status   = _buildStatusLine(data, isJb, jbNum);
    const listText = _renderEmojiList(data.emojis);
    return [
        status,
        '',
        ...resultLines,
        '',
        '📋 *Daftar Emoji Terkini*',
        '',
        listText,
        '',
        '> Gunakan _.emojilist_ untuk lihat nomor urut emoji gabung',
    ].join('\n');
}

// ── handleEmojiadd (.emojiadd) ────────────────────────────────────────────
async function handleEmojiadd({ hisoka, m, query, tolak, logCommand, getJadibotNumber, addJadibotEmojis, listJadibotEmojis, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        // Tanpa argumen → tampilkan panduan + button
        if (!query) {
            const data     = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
            const bodyText = _buildPanduanBody(data, _isJb, _jbNum);
            await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
            logCommand(m, hisoka, m.command || 'emojiadd');
            return;
        }

        const emojisToAdd = _parseEmojiInput(query);
        if (emojisToAdd.length === 0) {
            await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk ditambahkan');
            return;
        }

        let results, newList;
        if (_isJb) {
            results = addJadibotEmojis(_jbNum, emojisToAdd);
            newList = listJadibotEmojis(_jbNum);
        } else {
            const { addEmojis, listEmojis } = await import('../helper/emoji.js');
            results = addEmojis(emojisToAdd);
            newList = listEmojis();
        }

        const resultLines = [];
        if (results.added.length > 0)
            resultLines.push(`✅ *Ditambah (${results.added.length}):* ${results.added.join(' ')}`);
        if (results.alreadyExists.length > 0)
            resultLines.push(`⚠️ *Sudah ada (${results.alreadyExists.length}):* ${results.alreadyExists.join(' ')}`);
        if (_isJb && newList.mode === 'default')
            resultLines.push('', `> ⚠️ Mode kamu masih _Default_ — ketik *.emojicustom* untuk aktifkan emoji kustom`);

        const bodyText = _buildResultBody(newList, _isJb, _jbNum, resultLines);
        await _sendButton(hisoka, m, Button, tolak, newList, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojiadd');
    } catch (err) {
        console.error('\x1b[31m[EmojiAdd] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

// ── handleEmojidel (.emojidel) ────────────────────────────────────────────
async function handleEmojidel({ hisoka, m, query, tolak, logCommand, getJadibotNumber, deleteJadibotEmojis, listJadibotEmojis, Button }) {
    if (!m.isOwner && hisoka?.isMainBot !== false) return;
    const _isJb  = hisoka?.isMainBot === false;
    const _jbNum = _isJb ? getJadibotNumber(hisoka) : null;
    try {
        // Tanpa argumen → tampilkan daftar + button
        if (!query) {
            const data     = await _getEmojiData(_isJb, _jbNum, listJadibotEmojis);
            const bodyText = _buildListBody(data, _isJb, _jbNum);
            await _sendButton(hisoka, m, Button, tolak, data, _isJb, _jbNum, bodyText);
            logCommand(m, hisoka, m.command || 'emojidel');
            return;
        }

        const isNomorMode = /^[\d\s,.]+$/.test(query.trim());
        let emojisToDelete = [];

        if (isNomorMode) {
            // Hapus by nomor urut emoji gabung
            let currentEmojis;
            if (_isJb) {
                currentEmojis = listJadibotEmojis(_jbNum).emojis;
            } else {
                const { listEmojis } = await import('../helper/emoji.js');
                currentEmojis = listEmojis().emojis;
            }
            const _seg = new Intl.Segmenter('en', { granularity: 'grapheme' });
            const gabungList = currentEmojis.filter(e =>
                [..._seg.segment(String(e))].filter(s => s.segment.trim()).length > 1
            );
            if (gabungList.length === 0) {
                await tolak(hisoka, m, '❌ Tidak ada emoji gabungan\n\nGunakan *.emojidel 😊* untuk hapus emoji single');
                return;
            }
            const nomorRaw = query.split(/[\s,.]+/).map(s => s.trim()).filter(Boolean);
            const nomor    = [...new Set(nomorRaw.map(n => parseInt(n, 10)).filter(n => !isNaN(n) && n >= 1))];
            if (nomor.length === 0) {
                await tolak(hisoka, m, '❌ Nomor tidak valid\n\nContoh: *.emojidel 1* atau *.emojidel 1,2*');
                return;
            }
            const diluar = nomor.filter(n => n > gabungList.length);
            const valid  = nomor.filter(n => n <= gabungList.length);
            if (valid.length === 0) {
                await tolak(hisoka, m, `❌ Nomor di luar jangkauan\n\nEmoji gabungan ada *${gabungList.length}* (nomor 1–${gabungList.length})`);
                return;
            }
            if (diluar.length > 0)
                await tolak(hisoka, m, `⚠️ Nomor ${diluar.join(', ')} tidak ada (max ${gabungList.length}), sisanya tetap diproses`);
            emojisToDelete = valid.map(n => gabungList[n - 1]);
        } else {
            emojisToDelete = _parseEmojiInput(query);
            if (emojisToDelete.length === 0) {
                await tolak(hisoka, m, '❌ Tidak ada emoji yang valid untuk dihapus');
                return;
            }
        }

        let results, newList;
        if (_isJb) {
            results = deleteJadibotEmojis(_jbNum, emojisToDelete);
            newList = listJadibotEmojis(_jbNum);
        } else {
            const { deleteEmojis, listEmojis } = await import('../helper/emoji.js');
            results = deleteEmojis(emojisToDelete);
            newList = listEmojis();
        }

        const resultLines = [];
        if (results.deleted.length > 0)
            resultLines.push(`🗑️ *Dihapus (${results.deleted.length}):* ${results.deleted.join(' ')}`);
        if (results.notFound.length > 0)
            resultLines.push(`⚠️ *Tidak ditemukan (${results.notFound.length}):* ${results.notFound.join(' ')}`);

        const bodyText = _buildResultBody(newList, _isJb, _jbNum, resultLines);
        await _sendButton(hisoka, m, Button, tolak, newList, _isJb, _jbNum, bodyText);
        logCommand(m, hisoka, 'emojidel');
    } catch (err) {
        console.error('\x1b[31m[EmojiDel] Error:\x1b[39m', err.message);
        await tolak(hisoka, m, `❌ Error: ${err.message}`);
    }
}

module.exports = {
    handleEmoji,
    handleEmojilist,
    handleEmojidefault,
    handleEmojicustom,
    handleEmojiclear,
    handleEmojiadd,
    handleEmojidel,
};
