'use strict';

async function handleInfowibu({ hisoka, m, query, tolak, logCommand, loadConfig, sendConfirmWithButtons, fs, path, _require }) {
        if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa gunakan perintah ini.');
        if (!m.isGroup) return tolak(hisoka, m, '❌ Perintah ini hanya untuk grup.');

        const { simulate: simulasiIW } = _require(path.resolve('./src/scrape/anime/infowibu.cjs'));
        const cfgPathIW = path.join(process.cwd(), 'config.json');
        const sub = (query || '').trim().toLowerCase();
        const pfx = m.prefix || '.';

        const cfgIW = loadConfig();
        if (!cfgIW.infowibu)         cfgIW.infowibu         = { enabled: true, groups: {} };
        if (!cfgIW.infowibu.groups)  cfgIW.infowibu.groups  = {};

        if (!sub || sub === 'help') {
                const aktif = cfgIW.infowibu.groups[m.from]?.enabled === true;
                await tolak(hisoka, m,
                        `╭─「 📺 *INFO WIBU* 」\n` +
                        `│\n` +
                        `│ Status di grup ini: ${aktif ? '✅ *Aktif*' : '❌ *Nonaktif*'}\n` +
                        `│\n` +
                        `│ *Perintah:*\n` +
                        `│ • ${pfx}infowibu on — aktifkan\n` +
                        `│ • ${pfx}infowibu off — nonaktifkan\n` +
                        `│ • ${pfx}infowibu test — kirim test sekarang\n` +
                        `│ • ${pfx}infowibu status — lihat semua grup\n` +
                        `│\n` +
                        `│ 💡 Bot otomatis kirim notif episode\n` +
                        `│    baru ke grup yang aktif (realtime).\n` +
                        `╰──────────────────────`
                );
                return;
        }

        if (sub === 'on') {
                const sebelumnyaIW = cfgIW.infowibu.groups[m.from]?.enabled === true;
                cfgIW.infowibu.groups[m.from] = { enabled: true, diubahPada: Date.now() };
                fs.writeFileSync(cfgPathIW, JSON.stringify(cfgIW, null, 2));
                await sendConfirmWithButtons(hisoka, m,
                        `╭─「 📺 *INFO WIBU* 」\n` +
                        `│\n` +
                        `│ Status sebelumnya : ${sebelumnyaIW ? '✅ *ON*' : '❌ *OFF*'}\n` +
                        `│ Status sekarang   : ✅ *ON*\n` +
                        `│\n` +
                        (sebelumnyaIW
                                ? `│ ℹ️ Fitur ini sebelumnya sudah aktif,\n│    tidak ada perubahan.\n`
                                : `│ ✅ Fitur berhasil diaktifkan!\n│    Bot akan kirim notif episode\n│    baru secara realtime ke grup ini.\n`) +
                        `│\n` +
                        `│ Ketik *${pfx}infowibu off* untuk menonaktifkan.\n` +
                        `╰──────────────────────`,
                        [{ text: '➕ Aktifkan Semua Grup', id: '__addallgrp__infowibu' }]
                );
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'infowibu-on');
                return;
        }

        if (sub === 'off') {
                const sebelumnyaIW = cfgIW.infowibu.groups[m.from]?.enabled === true;
                cfgIW.infowibu.groups[m.from] = { enabled: false, diubahPada: Date.now() };
                fs.writeFileSync(cfgPathIW, JSON.stringify(cfgIW, null, 2));
                await tolak(hisoka, m,
                        `╭─「 📺 *INFO WIBU* 」\n` +
                        `│\n` +
                        `│ Status sebelumnya : ${sebelumnyaIW ? '✅ *ON*' : '❌ *OFF*'}\n` +
                        `│ Status sekarang   : ❌ *OFF*\n` +
                        `│\n` +
                        (sebelumnyaIW
                                ? `│ ❌ Fitur berhasil dinonaktifkan.\n│    Bot tidak akan kirim notif lagi\n│    di grup ini.\n`
                                : `│ ℹ️ Fitur ini sebelumnya sudah nonaktif,\n│    tidak ada perubahan.\n`) +
                        `│\n` +
                        `│ Ketik *${pfx}infowibu on* untuk mengaktifkan kembali.\n` +
                        `╰──────────────────────`
                );
                await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                logCommand(m, hisoka, 'infowibu-off');
                return;
        }

        if (sub === 'status') {
                const semuaGrup = Object.entries(cfgIW.infowibu.groups || {});
                if (!semuaGrup.length) {
                        await tolak(hisoka, m, '📋 Belum ada grup yang dikonfigurasi.');
                        return;
                }
                let txt = `╭─「 📋 *STATUS INFOWIBU* 」\n│\n`;
                for (const [jid, data] of semuaGrup) {
                        const label = jid.replace('@g.us', '');
                        const icon  = data.enabled ? '✅' : '❌';
                        txt += `│ ${icon} ${label}\n`;
                }
                txt += `╰──────────────────────`;
                await tolak(hisoka, m, txt);
                return;
        }

        if (sub === 'test') {
                await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } });
                try {
                        const hasil = await simulasiIW();
                        if (hasil.urlGambar) {
                                await hisoka.sendMessage(m.from, {
                                        image: { url: hasil.urlGambar },
                                        caption: hasil.caption,
                                }, { quoted: m });
                        } else {
                                await tolak(hisoka, m, hasil.caption);
                        }
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        logCommand(m, hisoka, 'infowibu-test');
                } catch (err) {
                        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } });
                        await tolak(hisoka, m, `❌ Gagal fetch info wibu: ${err?.message || err}`);
                }
                return;
        }

        await tolak(hisoka, m, `❌ Sub-perintah tidak dikenal. Ketik *${pfx}infowibu* untuk bantuan.`);
}

module.exports = { handleInfowibu };
