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
 *  readsw.cjs — Read SW command handler
 *  Perintah .readsw untuk aktifkan/nonaktifkan auto-baca status WhatsApp
 * ───────────────────────────────
 */
'use strict';

async function handleReadsw({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadsw, setJadibotUserSetting, Button }) {
    const _sn = (m.sender || '').split('@')[0].split(':')[0];
    const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
    const _isJadibotUser = hisoka?.isMainBot === false && !!_jn && _sn === _jn;
    if (!m.isOwner && !_isJadibotUser) return;

    try {
        const pref       = m.prefix || '.';
        const isJadibot  = hisoka?.isMainBot === false;
        const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

        const getReadswConfig = () => isJadibot
            ? getJadibotReadsw(jadibotNum)
            : (loadConfig().autoReadStory || { enabled: true, autoReaction: true, randomDelay: true, delayMinMs: 1000, delayMaxMs: 20000, fixedDelayMs: 3000 });

        const saveReadswConfig = (newVal) => {
            if (isJadibot) setJadibotUserSetting(jadibotNum, 'readsw', newVal);
            else { const cfg = loadConfig(); cfg.autoReadStory = newVal; saveConfig(cfg); }
        };

        const storyConfig = getReadswConfig();
        const args        = query ? query.toLowerCase().split(' ') : [];
        const jadibotNote = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

        // ── Helper: kirim Button dengan fallback teks biasa ───────────────────
        const sendBtn = async (bodyText, footerText, buttons = [], fallbackText = null) => {
            if (Button) {
                let sent = false;
                try {
                    let btn = new Button()
                        .setBody(bodyText)
                        .setFooter(footerText);
                    for (const [label, cmd] of buttons) {
                        btn = btn.addReply(label, cmd);
                    }
                    await btn.run(m.from, hisoka, m);
                    sent = true;
                } catch (_) {}
                if (!sent) await tolak(hisoka, m, fallbackText || bodyText);
            } else {
                await tolak(hisoka, m, fallbackText || bodyText);
            }
        };

        // ── Tanpa argumen → tampil status + 3 tombol aksi ────────────────────
        if (args.length === 0) {
            let statusIcon, statusText, modeText;
            if (!storyConfig.enabled) {
                statusIcon = '❌'; statusText = 'Nonaktif'; modeText = '-';
            } else if (storyConfig.autoReaction !== false) {
                statusIcon = '✅'; statusText = 'Aktif'; modeText = 'Read + Reaksi 💬';
            } else {
                statusIcon = '✅'; statusText = 'Aktif'; modeText = 'Read Only 📖';
            }

            const delayMin   = (storyConfig.delayMinMs   || 1000)  / 1000;
            const delayMax   = (storyConfig.delayMaxMs   || 20000) / 1000;
            const fixedDelay = (storyConfig.fixedDelayMs || 3000)  / 1000;
            const isRandom   = storyConfig.randomDelay !== false;
            const delayInfo  = storyConfig.enabled
                ? (isRandom ? `${delayMin}-${delayMax}s (acak)` : `${fixedDelay}s (tetap)`)
                : '-';

            const bodyText =
                `╭═══『 📖 *AUTO READ STORY* 』═══╮\n` +
                `│\n` +
                `│ ${statusIcon} *Status  :* ${statusText}\n` +
                `│ 🎭 *Mode    :* ${modeText}\n` +
                `│ ⏱️ *Delay   :* ${delayInfo}\n` +
                `│ 💬 *Reaksi  :* ${storyConfig.autoReaction !== false ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                `│\n` +
                `╰═════════════════════════╯` +
                (isJadibot ? jadibotNote : '');

            const fallback =
                bodyText + `\n\n` +
                `*Penggunaan:*\n` +
                `${pref}readsw true — Read + Reaksi\n` +
                `${pref}readsw false — Read Only\n` +
                `${pref}readsw off — Nonaktifkan\n` +
                `${pref}readsw delay <min> <max> — Atur delay`;

            await sendBtn(
                bodyText,
                `⚡ Wily Bot • Auto Read Story`,
                [
                    ['✅ Read + Reaksi', `${pref}readsw true`],
                    ['📖 Read Only',     `${pref}readsw false`],
                    ['❌ Nonaktifkan',   `${pref}readsw off`],
                ],
                fallback
            );

            logCommand(m, hisoka, 'readsw');
            return;
        }

        // ── Helper: body teks konfirmasi setelah aksi ─────────────────────────
        const buildStatusBody = (cfg, actionLine) => {
            const delayMin   = (cfg.delayMinMs   || 1000)  / 1000;
            const delayMax   = (cfg.delayMaxMs   || 20000) / 1000;
            const fixedDelay = (cfg.fixedDelayMs || 3000)  / 1000;
            const isRandom   = cfg.randomDelay !== false;
            const modeText   = cfg.autoReaction !== false ? 'Read + Reaksi 💬' : 'Read Only 📖';
            const delayInfo  = cfg.enabled
                ? (isRandom ? `${delayMin}-${delayMax}s (acak)` : `${fixedDelay}s (tetap)`)
                : '-';
            return (
                `╭═══『 📖 *AUTO READ STORY* 』═══╮\n` +
                `│\n` +
                `│ ${actionLine}\n` +
                `│\n` +
                `│ 🎭 *Mode  :* ${modeText}\n` +
                `│ ⏱️ *Delay :* ${delayInfo}\n` +
                `│\n` +
                `╰═════════════════════════╯` +
                (isJadibot ? jadibotNote : '')
            );
        };

        // ── true / on → Read + Reaksi ─────────────────────────────────────────
        if (args[0] === 'true' || args[0] === 'on') {
            if (storyConfig.enabled && storyConfig.autoReaction !== false) {
                await sendBtn(
                    `ℹ️ *Auto Read Story + Reaksi sudah aktif.*\n\nTidak ada perubahan.` + jadibotNote,
                    `⚡ Wily Bot • Auto Read Story`,
                    [['📋 Lihat Status', `${pref}readsw`]]
                );
            } else {
                const newCfg = { ...storyConfig, enabled: true, autoReaction: true };
                saveReadswConfig(newCfg);
                await sendBtn(
                    buildStatusBody(newCfg, '✅ *Diaktifkan! Read + Reaksi*'),
                    `⚡ Wily Bot • Auto Read Story`,
                    [
                        ['📖 Ganti Read Only', `${pref}readsw false`],
                        ['❌ Nonaktifkan',      `${pref}readsw off`],
                    ]
                );
            }

        // ── false → Read Only ─────────────────────────────────────────────────
        } else if (args[0] === 'false') {
            if (storyConfig.enabled && storyConfig.autoReaction === false) {
                await sendBtn(
                    `ℹ️ *Auto Read Story (tanpa reaksi) sudah aktif.*\n\nTidak ada perubahan.` + jadibotNote,
                    `⚡ Wily Bot • Auto Read Story`,
                    [['📋 Lihat Status', `${pref}readsw`]]
                );
            } else {
                const newCfg = { ...storyConfig, enabled: true, autoReaction: false };
                saveReadswConfig(newCfg);
                await sendBtn(
                    buildStatusBody(newCfg, '✅ *Diaktifkan! Read Only (tanpa reaksi)*'),
                    `⚡ Wily Bot • Auto Read Story`,
                    [
                        ['✅ Aktifkan Reaksi', `${pref}readsw true`],
                        ['❌ Nonaktifkan',      `${pref}readsw off`],
                    ]
                );
            }

        // ── off → Nonaktifkan ─────────────────────────────────────────────────
        } else if (args[0] === 'off') {
            if (!storyConfig.enabled) {
                await sendBtn(
                    `ℹ️ *Auto Read Story sudah nonaktif.*\n\nTidak ada perubahan.` + jadibotNote,
                    `⚡ Wily Bot • Auto Read Story`,
                    [['📋 Lihat Status', `${pref}readsw`]]
                );
            } else {
                const newCfg = { ...storyConfig, enabled: false };
                saveReadswConfig(newCfg);
                await sendBtn(
                    `╭═══『 📖 *AUTO READ STORY* 』═══╮\n│\n│ ❌ *Dinonaktifkan!*\n│\n│ Auto Read Story tidak\n│ akan berjalan lagi.\n│\n╰═════════════════════════╯` + jadibotNote,
                    `⚡ Wily Bot • Auto Read Story`,
                    [
                        ['✅ Read + Reaksi', `${pref}readsw true`],
                        ['📖 Read Only',     `${pref}readsw false`],
                    ]
                );
            }

        // ── delay <min> <max> → Random delay ──────────────────────────────────
        } else if (args[0] === 'delay' && args[1] && args[2]) {
            const minDelay = parseInt(args[1]);
            const maxDelay = parseInt(args[2]);
            if (isNaN(minDelay) || isNaN(maxDelay)) {
                await tolak(hisoka, m, `❌ Delay harus berupa angka.\nContoh: ${pref}readsw delay 1 20`);
                return;
            }
            if (minDelay < 1 || maxDelay > 60) {
                await tolak(hisoka, m, `❌ Delay min harus ≥ 1 detik dan max ≤ 60 detik`);
                return;
            }
            if (minDelay >= maxDelay) {
                await tolak(hisoka, m, `❌ Delay min harus lebih kecil dari delay max`);
                return;
            }
            const newCfg = { ...storyConfig, delayMinMs: minDelay * 1000, delayMaxMs: maxDelay * 1000, randomDelay: true };
            saveReadswConfig(newCfg);
            await sendBtn(
                buildStatusBody(newCfg, `✅ *Delay diubah! ${minDelay}-${maxDelay}s (acak)*`),
                `⚡ Wily Bot • Auto Read Story`,
                [['📋 Lihat Status', `${pref}readsw`]]
            );

        // ── delay <fixed> → Fixed delay ───────────────────────────────────────
        } else if (args[0] === 'delay' && args[1] && !args[2]) {
            const fixedDelay = parseInt(args[1]);
            if (isNaN(fixedDelay) || fixedDelay < 1 || fixedDelay > 60) {
                await tolak(hisoka, m, `❌ Delay harus antara 1-60 detik`);
                return;
            }
            const newCfg = { ...storyConfig, fixedDelayMs: fixedDelay * 1000, randomDelay: false };
            saveReadswConfig(newCfg);
            await sendBtn(
                buildStatusBody(newCfg, `✅ *Fixed delay diubah! ${fixedDelay}s (tetap)*`),
                `⚡ Wily Bot • Auto Read Story`,
                [['📋 Lihat Status', `${pref}readsw`]]
            );

        // ── Perintah tidak dikenal ────────────────────────────────────────────
        } else {
            await sendBtn(
                `❌ *Perintah tidak valid.*\n\nGunakan ${pref}readsw untuk melihat bantuan.`,
                `⚡ Wily Bot • Auto Read Story`,
                [['📋 Lihat Bantuan', `${pref}readsw`]]
            );
        }

        logCommand(m, hisoka, 'readsw');

    } catch (error) {
        console.error('\x1b[31m[ReadSW] Error:\x1b[39m', error.message);
        await tolak(hisoka, m, `Error: ${error.message}`);
    }
}

module.exports = { handleReadsw };
