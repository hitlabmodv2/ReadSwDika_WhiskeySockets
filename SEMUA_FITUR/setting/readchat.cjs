'use strict';

/**
 *  readchat.cjs — Auto Read Chat handler
 *  Perintah .readchat on/off untuk baca otomatis pesan private (centang biru)
 *  Berlaku untuk bot utama (config.json) dan jadibot (data_jadibot/settings.json)
 */

async function handleReadchat({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, getJadibotNumber, getJadibotReadchat, setJadibotUserSetting }) {
        const _isJadibotUserCtx = hisoka?.isMainBot === false && (() => {
                const _sn = (m.sender || '').split('@')[0].split(':')[0];
                const _jn = String(hisoka?.jadibotUserNumber || '').split('@')[0].split(':')[0];
                return !!_jn && _sn === _jn;
        })();
        if (!m.isOwner && !_isJadibotUserCtx) return;

        try {
                const isJadibot  = hisoka?.isMainBot === false;
                const jadibotNum = isJadibot ? getJadibotNumber(hisoka) : null;

                const getReadchat  = () => isJadibot
                        ? getJadibotReadchat(jadibotNum)
                        : (loadConfig().readChat || { enabled: false });

                const saveReadchat = (val) => {
                        if (isJadibot) {
                                setJadibotUserSetting(jadibotNum, 'readchat', val);
                        } else {
                                const cfg = loadConfig();
                                cfg.readChat = val;
                                saveConfig(cfg);
                        }
                };

                const rc          = getReadchat();
                const argLower    = (query || '').trim().toLowerCase();
                const jadibotNote = isJadibot ? `\n_⚙️ Setting khusus jadibot +${jadibotNum}_` : '';

                if (!argLower) {
                        const text =
                                `╭═══『 *AUTO READ CHAT* 』═══╮\n` +
                                `│\n` +
                                `│ *Status:* ${rc.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n` +
                                `│ *Berlaku:* Private chat saja\n` +
                                `│\n` +
                                `│ *Penggunaan:*\n` +
                                `│ .readchat on  → Aktifkan auto read\n` +
                                `│ .readchat off → Nonaktifkan\n` +
                                `│\n` +
                                `│ *Info:* Pesan masuk di private\n` +
                                `│ otomatis ditandai sudah dibaca\n` +
                                `│ (centang biru) tanpa buka chat.\n` +
                                (isJadibot ? `│\n│ _⚙️ Setting jadibot +${jadibotNum}_\n` : '') +
                                `│\n╰═════════════════╯`;
                        await tolak(hisoka, m, text);
                        return;
                }

                if (argLower === 'on') {
                        if (rc.enabled) {
                                await tolak(hisoka, m, 'ℹ️ Auto Read Chat sudah aktif sebelumnya');
                        } else {
                                saveReadchat({ enabled: true });
                                await tolak(hisoka, m, '✅ Auto Read Chat diaktifkan\nPesan private akan otomatis ditandai dibaca (centang biru)' + jadibotNote);
                        }
                } else if (argLower === 'off') {
                        if (!rc.enabled) {
                                await tolak(hisoka, m, 'ℹ️ Auto Read Chat sudah nonaktif sebelumnya');
                        } else {
                                saveReadchat({ enabled: false });
                                await tolak(hisoka, m, '❌ Auto Read Chat dinonaktifkan' + jadibotNote);
                        }
                } else {
                        await tolak(hisoka, m, '❌ Perintah tidak valid.\nGunakan: .readchat on / .readchat off');
                }

                logCommand(m, hisoka, 'readchat');
        } catch (err) {
                console.error('\x1b[31m[ReadChat] Error:\x1b[39m', err.message);
                await tolak(hisoka, m, `Error: ${err.message}`);
        }
}

module.exports = { handleReadchat };
