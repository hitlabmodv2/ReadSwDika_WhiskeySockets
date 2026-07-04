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
 *  reactapi.cjs — Reaction SW command handler
 *  Perintah .reaksi/.reactapi untuk atur reaksi emoji otomatis ke status WA
 * ───────────────────────────────
 */
'use strict';

// ── HANDLER: cekreact & setreactapi ──────────────────────────────────────────

async function handleReactinfo({ hisoka, m, tolak, logCommand, loadConfig }) {
        try {
                const config      = loadConfig();
                const reactConfig = config.reactApi || {};
                const apiKey      = process.env.REACT_API_KEY || reactConfig.apiKey;
                if (!apiKey) { await tolak(hisoka, m, 'Mohon maaf, API key untuk fitur react belum dikonfigurasi.'); return; }

                const loadingMsg = await tolak(hisoka, m, '⏳ Mengambil informasi saldo...');
                const axios      = (await import('axios')).default;
                const baseUrl    = reactConfig.apiUrl || 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post';
                const balanceUrl = baseUrl.replace('/react-to-post', '/balance') || 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/balance';
                const headers    = { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

                try {
                        const response = await axios.get(balanceUrl, { headers, timeout: 15000 });
                        const data     = response.data;
                        const balance  = data.balance || data.coins || data.coin || data.saldo || 0;
                        const used     = data.used || data.totalUsed || data.coins_used || 0;
                        const plan     = data.plan || data.subscription || data.package || 'Standard';
                        const expiry   = data.expiry || data.expired || data.expiryDate || '-';
                        let hasil = `╭═══ *INFO SALDO REACT* ═══╮\n│\n│ 💰 *Saldo Coin:* ${balance} coin\n│ 📊 *Total Terpakai:* ${used} coin\n│ 📦 *Paket:* ${plan}\n`;
                        if (expiry !== '-') hasil += `│ 📅 *Berlaku Hingga:* ${expiry}\n`;
                        hasil += `│\n│ ✅ Status: Aktif\n│\n╰════════════════════════╯`;
                        await m.reply({ edit: loadingMsg.key, text: hasil.trim() });
                } catch (balanceError) {
                        const maskedKey = apiKey.slice(0, 10) + '...' + apiKey.slice(-5);
                        let hasil = `╭═══ *INFO REACT API* ═══╮\n│\n│ 🔑 *API Key:* ${maskedKey}\n│ ✅ *Status:* ${reactConfig.enabled ? 'Aktif' : 'Nonaktif'}\n│ 🌐 *Server:* Terhubung\n│\n│ ℹ️ *Info:*\n│ Endpoint cek saldo tidak tersedia\n│ atau sedang dalam pemeliharaan.\n│ Silakan coba fitur .react\n│\n╰════════════════════════╯`;
                        await m.reply({ edit: loadingMsg.key, text: hasil.trim() });
                }
                logCommand(m, hisoka, m.command || 'cekreact');
        } catch (error) {
                console.error('\x1b[31m[CekReact] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan saat mengecek saldo: ${error.message}`);
        }
}

async function handleReactapi({ hisoka, m, query, tolak, logCommand, loadConfig, saveConfig }) {
        try {
                if (!m.isOwner) { await tolak(hisoka, m, 'Mohon maaf, perintah ini hanya dapat digunakan oleh owner bot.'); return; }
                if (!query) {
                        const config      = loadConfig();
                        const reactConfig = config.reactApi || {};
                        const currentKey  = process.env.REACT_API_KEY || reactConfig.apiKey;
                        const maskedKey   = currentKey ? currentKey.slice(0, 10) + '...' + currentKey.slice(-5) : 'Belum diatur';
                        await tolak(hisoka, m, `╭═══ *SETTING REACT API* ═══╮\n│\n│ 📌 *Cara Penggunaan:*\n│ .setreactapi [api_key]\n│\n│ 📊 *Status Saat Ini:*\n│ ├ Status: ${reactConfig.enabled ? '✅ Aktif' : '❌ Nonaktif'}\n│ ├ API Key: ${maskedKey}\n│ └ Server: Default\n│\n╰════════════════════════════╯`);
                        return;
                }
                const newApiKey = query.trim();
                const config    = loadConfig();
                if (!config.reactApi) config.reactApi = { enabled: true, apiKey: '', apiUrl: 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post' };
                config.reactApi.apiKey = newApiKey;
                saveConfig(config);
                const maskedKey = newApiKey.slice(0, 10) + '...' + newApiKey.slice(-5);
                await tolak(hisoka, m, `╭═══ *API KEY UPDATED* ═══╮\n│\n│ ✅ *Berhasil Diperbarui!*\n│\n│ 🔑 Key: ${maskedKey}\n│ 📊 Status: Aktif\n│\n│ 💡 Fitur react siap digunakan\n│\n╰═════════════════════════╯`);
                logCommand(m, hisoka, m.command || 'setreactapi');
        } catch (error) {
                console.error('\x1b[31m[SetReactAPI] Error:\x1b[39m', error.message);
                await tolak(hisoka, m, `Mohon maaf, terjadi kesalahan saat mengatur API key: ${error.message}`);
        }
}

// ── HANDLER: react ────────────────────────────────────────────────────────────

async function handleReaksi({ hisoka, m, query, tolak, logCommand, loadConfig }) {
        try {
                const config     = loadConfig();
                const reactConfig = config.reactApi || {};

                if (!reactConfig.enabled) {
                        await tolak(hisoka, m, 'Mohon maaf, fitur react sedang tidak aktif saat ini. Silakan hubungi admin untuk mengaktifkannya.');
                        return;
                }

                const apiKey = process.env.REACT_API_KEY || reactConfig.apiKey;
                if (!apiKey) {
                        await tolak(hisoka, m, 'Mohon maaf, API key untuk fitur react belum dikonfigurasi. Silakan hubungi admin untuk mengaturnya.');
                        return;
                }

                if (!query) {
                        await tolak(hisoka, m, `╭═══ *REACT CHANNEL* ═══╮\n│\n│ 📌 *Kirim Reaksi ke Saluran/Channel*\n│\n│ *Format:*\n│ .react [link] [emoji]\n│\n│ *Contoh Penggunaan:*\n│ .react https://whatsapp.com/\n│ channel/0029xxx/264 ♥️ 🙏🏻\n│\n│ *Keterangan:*\n│ • Link: URL postingan channel\n│ • Emoji: Reaksi (bisa lebih dari 1)\n│\n│ *Command Lainnya:*\n│ • .cekreact - Cek saldo coin\n│ • .setreactapi - Atur API key\n│\n╰══════════════════════╯`);
                        return;
                }

                const [postLink, ...reactsArray] = query.split(' ');
                const reacts = reactsArray.join(', ');

                if (!postLink || !reacts) {
                        await tolak(hisoka, m, `⚠️ *Format Tidak Lengkap!*\n\nGunakan format:\n.react [link_post] [emoji1] [emoji2]\n\nContoh:\n.react https://whatsapp.com/channel/xxx/123 ♥️ 🙏🏻`);
                        return;
                }

                const loadingMsg = await tolak(hisoka, m, '⏳ Sedang memproses reaksi, mohon tunggu sebentar...');

                const axios   = (await import('axios')).default;
                const apiUrl  = reactConfig.apiUrl || 'https://foreign-marna-sithaunarathnapromax-9a005c2e.koyeb.app/api/channel/react-to-post';
                const headers = { 'Accept': 'application/json, text/plain, */*', 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` };

                const response = await axios.post(apiUrl, { post_link: postLink, reacts }, { headers, timeout: 30000 });
                const data     = response.data;

                const emojiList      = reacts.split(',').map(e => e.trim()).filter(e => e);
                const totalReactions = emojiList.length;

                let coinUsed      = data.coinsUsed || data.coinUsed || data.coins_used || null;
                if (!coinUsed && data.message) { const m2 = data.message.match(/(\d+)\s*COIN/i); if (m2) coinUsed = parseInt(m2[1]); }
                if (!coinUsed) coinUsed = totalReactions;

                let coinRemaining = data.coinsRemaining || data.coinRemaining || data.coins_remaining || data.balance || data.remainingCoins || null;
                if (!coinRemaining && data.message) { const m3 = data.message.match(/remaining[:\s]*(\d+)/i) || data.message.match(/sisa[:\s]*(\d+)/i); if (m3) coinRemaining = parseInt(m3[1]); }

                let hasil = `╭═══ *REACT BERHASIL* ═══╮\n│\n│ ✅ *Status:* Sukses!\n│\n│ 📊 *Detail Reaksi:*\n│ ├ Emoji: ${emojiList.join(' ')}\n│ ├ Jumlah: ${totalReactions} reaksi\n│ └ Post: ...${postLink.slice(-20)}\n│\n│ 💰 *Info Coin:*\n│ ├ Terpakai: ${coinUsed} coin\n│ └ Sisa: ${coinRemaining !== null ? coinRemaining + ' coin' : 'Gunakan .cekreact'}\n`;
                if (data.botResponse) hasil += `│\n│ 🤖 *Respon:* ${data.botResponse}\n`;
                hasil += `│\n╰══════════════════════╯`;

                await m.reply({ edit: loadingMsg.key, text: hasil.trim() });
                logCommand(m, hisoka, m.command || 'react');
        } catch (error) {
                console.error('\x1b[31m[React API] Error:\x1b[39m', error.message);
                let errorMessage = '';
                if (error.response) {
                        const status = error.response.status;
                        const rd     = error.response.data;
                        if (status === 401 || status === 403) errorMessage = `🔐 *Akses Ditolak*\n\nMohon maaf, sepertinya ada masalah dengan otorisasi API. Silakan hubungi admin untuk memeriksa API key.\n\n💡 *Tips:* Pastikan API key masih valid dan belum kadaluarsa.`;
                        else if (status === 429) errorMessage = `⏰ *Batas Penggunaan Tercapai*\n\nMohon maaf, layanan sedang sibuk atau batas penggunaan sudah tercapai. Silakan coba lagi dalam beberapa saat.\n\n💡 *Tips:* Tunggu beberapa menit sebelum mencoba kembali.`;
                        else if (status === 400) errorMessage = `📋 *Format Tidak Valid*\n\nMohon maaf, format permintaan tidak sesuai.\n\n📝 *Pesan Server:* ${rd?.message || 'Format tidak valid'}\n\n💡 *Tips:* Pastikan link dan emoji yang dimasukkan sudah benar.`;
                        else if (status === 404) errorMessage = `🔍 *Tidak Ditemukan*\n\nMohon maaf, layanan API tidak dapat ditemukan. Silakan hubungi admin untuk memeriksa konfigurasi.`;
                        else if (status >= 500) errorMessage = `🔧 *Server Sedang Bermasalah*\n\nMohon maaf, server sedang mengalami gangguan sementara. Silakan coba lagi dalam beberapa saat.\n\n💡 *Tips:* Jika masalah berlanjut, silakan hubungi admin.`;
                        else errorMessage = `⚠️ *Terjadi Kesalahan*\n\n📊 *Status:* ${status}\n📝 *Pesan:* ${rd?.message || 'Terjadi kesalahan tidak diketahui'}\n\n💡 *Tips:* Silakan coba lagi atau hubungi admin jika masalah berlanjut.`;
                } else if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
                        errorMessage = `⏱️ *Waktu Habis*\n\nMohon maaf, permintaan memakan waktu terlalu lama. Server mungkin sedang sibuk.\n\n💡 *Tips:* Silakan coba lagi dalam beberapa saat.`;
                } else if (error.request) {
                        errorMessage = `🌐 *Tidak Dapat Terhubung*\n\nMohon maaf, tidak dapat terhubung ke server. Kemungkinan ada masalah jaringan atau server sedang tidak aktif.\n\n💡 *Tips:* Periksa koneksi internet atau coba lagi nanti.`;
                } else {
                        errorMessage = `❌ *Terjadi Kesalahan*\n\nMohon maaf, terjadi kesalahan teknis: ${error.message}\n\n💡 *Tips:* Silakan coba lagi atau hubungi admin jika masalah berlanjut.`;
                }
                await tolak(hisoka, m, errorMessage);
        }
}

module.exports = { handleReactinfo, handleReactapi, handleReaksi };
