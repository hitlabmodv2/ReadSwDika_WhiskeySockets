'use strict';

async function handleWilyai({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot, countHistory, clearAllHistory, clearAllUserMemory }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                const cfg  = loadConfig();
                if (!cfg.wilyAI) cfg.wilyAI = { enabled: true, autoReply: true, scope: 'all' };
                const w    = cfg.wilyAI;
                const args = (query || '').trim().toLowerCase().split(/\s+/);
                const sub  = args[0];
                const val  = args[1];

                const scopeLabel = (s) => s === 'pm' ? '📩 Private (PM)' : s === 'gc' ? '👥 Grup (GC)' : '🌐 Semua (PM + GC)';

                if (!sub) {
                        const totalSesi = countHistory();
                        const curScope  = w.scope || 'all';
                        let txt = `╭═══『 *⚙️ WILY AI SETTING* 』═══╮\n│\n│ 🤖 *.wily command* : ${w.enabled !== false ? '✅ Aktif' : '❌ Nonaktif'}\n│ 💬 *Auto reply*    : ${w.autoReply !== false ? '✅ Aktif' : '❌ Nonaktif'}\n│ 🎯 *Scope*         : ${scopeLabel(curScope)}\n│ 🗂️ *Sesi tersimpan*: ${totalSesi} sesi\n│\n│ 📋 *Cara pakai:*\n│ .wilyai on/off          → nyala/matikan .wily\n│ .wilyai replay on/off    → toggle auto reply\n│ .wilyai pm               → hanya private chat\n│ .wilyai gc               → hanya grup\n│ .wilyai all              → private + grup\n│ .wilyai reset            → hapus semua history\n│\n╰══════════════════════════════╯`;
                        await tolak(hisoka, m, txt);
                        return;
                }

                if (sub === 'on' || sub === 'off') {
                        const aktif = sub === 'on';
                        if (w.enabled === aktif || (w.enabled !== false && aktif)) {
                                await tolak(hisoka, m, `ℹ️ Fitur .wily sudah ${aktif ? 'aktif' : 'nonaktif'} sebelumnya.`);
                        } else {
                                cfg.wilyAI.enabled = aktif;
                                saveConfig(cfg);
                                await hisoka.sendMessage(m.from, { react: { text: aktif ? '✅' : '🚫', key: m.key } });
                                await tolak(hisoka, m, aktif
                                        ? '✅ Fitur *.wily* / *.ai* / *.tanya* berhasil *diaktifkan!*\nUser sudah bisa pakai AI lagi.'
                                        : '🚫 Fitur *.wily* / *.ai* / *.tanya* berhasil *dimatikan!*\nUser tidak bisa pakai AI sampai kamu aktifkan lagi.');
                        }
                        return;
                }

                if (sub === 'replay') {
                        if (val !== 'on' && val !== 'off') {
                                await tolak(hisoka, m, '⚠️ Format: .wilyai replay on  atau  .wilyai replay off');
                                return;
                        }
                        const aktif = val === 'on';
                        cfg.wilyAI.autoReply = aktif;
                        saveConfig(cfg);
                        await hisoka.sendMessage(m.from, { react: { text: aktif ? '✅' : '🚫', key: m.key } });
                        await tolak(hisoka, m, aktif
                                ? '✅ *Auto reply* diaktifkan!\nBot otomatis balas sesuai scope yang diset.'
                                : '🚫 *Auto reply* dimatikan!\nBot tidak akan auto balas, tapi .wily tetap bisa dipakai.');
                        return;
                }

                if (sub === 'pm' || sub === 'gc' || sub === 'all') {
                        cfg.wilyAI.scope = sub;
                        saveConfig(cfg);
                        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } });
                        await tolak(hisoka, m,
                                `✅ *Scope auto reply diset ke: ${scopeLabel(sub)}*\n\n` +
                                (sub === 'pm' ? '📩 Bot hanya akan auto reply di *private chat (DM)*.' :
                                 sub === 'gc' ? '👥 Bot hanya akan auto reply di *grup*.' :
                                                '🌐 Bot akan auto reply di *private chat + grup*.')
                        );
                        return;
                }

                if (sub === 'reset' || sub === 'clear' || sub === 'hapus') {
                        const totalSesi = countHistory();
                        await clearAllHistory();
                        const totalMemori = clearAllUserMemory();
                        await hisoka.sendMessage(m.from, { react: { text: '🗑️', key: m.key } });
                        await tolak(hisoka, m,
                                `🗑️ *Reset AI selesai!*\n\n• 💬 *${totalSesi} sesi* percakapan dihapus\n• 🧠 *${totalMemori} memori* user dihapus\n\nSemua user mulai dari awal — AI tidak ingat percakapan maupun preferensi siapapun.`
                        );
                        return;
                }

                await tolak(hisoka, m, '⚠️ Sub-perintah tidak dikenal.\n\nGunakan:\n.wilyai on/off\n.wilyai replay on/off\n.wilyai pm | gc | all\n.wilyai reset');
        } catch (e) {
                console.error(`[wilyai] ❌ ERROR | code: ${e.code || 'N/A'} | message: ${e.message}`);
        }
}

module.exports = { handleWilyai };

// ── HANDLER: autosimi ─────────────────────────────────────────────────────────

async function handleSimi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig, isMainBot }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;
        try {
                const config   = loadConfig();
                const autoSimi = config.autoSimi || { enabled: false };
                const args     = query ? query.split(' ') : [];
                if (args.length === 0) {
                        let text = `╭═══『 *🤖 WILY AI AUTO* 』═══╮\n│\n│ *Status:* ${autoSimi.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ *AI Engine:* Gemini Vision (Gratis)\n│ *Mode:* Grup & Private Chat\n│ *Trigger:* Mention bot / Reply pesan bot\n│\n│ *Kemampuan AI:*\n│ ✅ Analisis gambar & sticker\n│ ✅ Baca teks di dalam gambar\n│ ✅ Tahu judul anime/film/series\n│ ✅ Kenali karakter anime/game\n│ ✅ Ingat nama pengguna\n│ ✅ Ngobrol santai & cerdas\n│\n│ *Perintah Manual AI:*\n│ .wily [pertanyaan]\n│ .wily (reply gambar/sticker)\n│\n│ *Pengaturan:*\n│ .autosimi on  - Aktifkan\n│ .autosimi off - Nonaktifkan\n│\n╰══════════════════════════╯`;
                        await tolak(hisoka, m, text);
                        return;
                }
                if (args[0].toLowerCase() === 'on') {
                        if (autoSimi.enabled) {
                                await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah aktif sebelumnya');
                        } else {
                                config.autoSimi = { ...autoSimi, enabled: true };
                                saveConfig(config);
                                await tolak(hisoka, m, '✅ Wily AI Auto diaktifkan!\n\n🤖 Bot akan otomatis membalas dengan AI Gemini ketika di-mention atau di-reply.\n\nFitur: analisis gambar, sticker, teks, dan lainnya!');
                        }
                } else if (args[0].toLowerCase() === 'off') {
                        if (!autoSimi.enabled) {
                                await tolak(hisoka, m, 'ℹ️ Wily AI Auto sudah nonaktif sebelumnya');
                        } else {
                                config.autoSimi = { ...autoSimi, enabled: false };
                                saveConfig(config);
                                await tolak(hisoka, m, '❌ Wily AI Auto dinonaktifkan');
                        }
                } else if (args[0].toLowerCase() === 'key' && args[1]) {
                        const newKey = args.slice(1).join(' ').trim();
                        if (newKey.length < 20) {
                                await tolak(hisoka, m, '❌ API Key tidak valid.');
                        } else {
                                config.autoSimi = { ...autoSimi, apiKey: newKey };
                                saveConfig(config);
                                await tolak(hisoka, m, `✅ API Key berhasil diset!\n\nGunakan .autosimi on untuk mengaktifkan.`);
                        }
                } else {
                        await tolak(hisoka, m, '❌ Perintah tidak valid. Gunakan .autosimi untuk melihat bantuan.');
                }
                logCommand(m, hisoka, 'autosimi');
        } catch (error) {
                console.error('\x1b[31m[AutoSimi] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Error: ${error.message}`);
        }
}

module.exports.handleSimi = handleSimi;
