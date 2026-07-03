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
 *  listbot-cmd.cjs — List bot command handler
 *  Perintah .listbot untuk tampilkan semua sesi JadiBot yang sedang aktif
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  List JadiBot Command Handler (.listbot)
 *  Tampilkan semua sesi JadiBot yang sedang aktif beserta
 *  status koneksi, nomor, dan waktu mulai masing-masing —
 *  hanya bisa diakses oleh owner bot.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleListbot({ hisoka, m, tolak, logCommand, isMainBot, jadibotMap, getJadibotExpiry, getJadibotExpirySummary, cleanupExpiredJadibots, pendingJadibotChoices, getJadibotChoiceKey, jadibotConnectedAt, getUserName }) {
        if (!isMainBot(hisoka)) return;
        if (!m.isOwner) return;

        const ljPfx = m.prefix || '.';
        await cleanupExpiredJadibots(async () => {});
        const list = [...jadibotMap.keys()];
        const jadibotChoiceKey = getJadibotChoiceKey(m);
        const oldPending = pendingJadibotChoices.get(jadibotChoiceKey);
        if (oldPending?.timeout) clearTimeout(oldPending.timeout);
        pendingJadibotChoices.delete(jadibotChoiceKey);

        if (!list.length) {
                await hisoka.sendMessage(m.from, {
                        text:
                                `*LIST JADIBOT*\n\n` +
                                `Belum ada jadibot yang aktif.\n\n` +
                                `Tambah jadibot:\n` +
                                `${ljPfx}jadibot <nomor>`
                }, { quoted: m });
                return;
        }

        const sortedList = [...list].sort((a, b) => {
                const metaA = getJadibotExpiry(a);
                const metaB = getJadibotExpiry(b);
                // Permanent → Infinity (taruh paling bawah), timed → sort by expiresAt ascending
                const expA = metaA?.permanent === true ? Infinity : (metaA ? Number(metaA.expiresAt) : Infinity);
                const expB = metaB?.permanent === true ? Infinity : (metaB ? Number(metaB.expiresAt) : Infinity);
                return expA - expB;
        });

        const now = Date.now();

        const ljNow = new Date();
        const ljHari = ljNow.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
        const ljTanggal = ljNow.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
        const ljWaktu = ljNow.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' });

        const detailLines = sortedList.map((num, i) => {
                const info = getJadibotExpirySummary(num);
                const meta = getJadibotExpiry(num);
                const isPermanent = meta?.permanent === true;
                const remainingMs = isPermanent ? Infinity : (meta ? Number(meta.expiresAt) - now : Infinity);
                const isAlmostExpired = !isPermanent && remainingMs !== Infinity && remainingMs < 30 * 60 * 1000;
                const namaUser = getUserName(`${num}@s.whatsapp.net`, '-');

                // Badge status di samping nomor urut
                const statusBadge = isAlmostExpired ? '⚠️' : isPermanent ? '♾️' : '🟢';

                let expireText = 'Permanent';
                if (!isPermanent && meta && Number(meta.expiresAt) > 0) {
                        const expDate = new Date(Number(meta.expiresAt));
                        const expHari = expDate.toLocaleDateString('id-ID', { weekday: 'long', timeZone: 'Asia/Jakarta' });
                        const expTanggal = expDate.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });
                        const expWaktu = expDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');
                        expireText = `${expHari}, ${expTanggal} | ${expWaktu} WIB`;
                }

                const connectedTs = jadibotConnectedAt.get(num) || Number(meta?.connectedAt) || 0;
                let onlineLine = '';
                if (connectedTs > 0) {
                        const onlineMs = now - connectedTs;
                        const onlineSec = Math.max(0, Math.floor(onlineMs / 1000));
                        const onlineH = Math.floor(onlineSec / 3600);
                        const onlineM = Math.floor((onlineSec % 3600) / 60);
                        const onlineS = onlineSec % 60;
                        const durasiStr = onlineH > 0
                                ? `${onlineH}j ${onlineM}m`
                                : onlineM > 0
                                        ? `${onlineM}m ${onlineS}d`
                                        : `${onlineS}d`;
                        const sejakDate = new Date(connectedTs);
                        const sejakWaktu = sejakDate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' }).replace(/\./g, ':');
                        const sejakTgl = sejakDate.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', timeZone: 'Asia/Jakarta' });
                        onlineLine = `\n   🌐 _Online_ : ${durasiStr} _(sejak ${sejakTgl} ${sejakWaktu} WIB)_`;
                }

                const almostTag = isAlmostExpired ? '\n   > ⚠️ _Hampir habis — segera perpanjang!_' : '';

                return (
                        `*⌗ ${i + 1}* ${statusBadge} *+${num}*\n` +
                        `   👤 _Nama_   : ${namaUser}\n` +
                        `   ⏳ *Sisa*   : *${info.remaining}*\n` +
                        `   📅 _Expire_ : _${expireText}_` +
                        onlineLine +
                        almostTag
                );
        }).join('\n\n');

        const ljBodyText =
                `*LIST BOT AKTIF*\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `📊 Total  : *${sortedList.length} bot aktif*\n` +
                `🕐 Waktu  : _${ljHari}, ${ljTanggal} | ${ljWaktu} WIB_\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n\n` +
                `${detailLines}\n\n` +
                `━━━━━━━━━━━━━━━━━━━━━\n` +
                `*Cara pakai — reply pesan ini:*\n\n` +
                `1. *Stop bot* — ketik urutan, bisa beberapa:\n` +
                `   • \`1\`      → stop 1 bot\n` +
                `   • \`1,2,3\`  → stop beberapa (pisah koma)\n` +
                `   • \`1.2.3\`  → stop beberapa (pisah titik)\n` +
                `2. *Ubah/Perpanjang durasi* — \`urutan,durasi\` atau \`urutan.durasi\`:\n` +
                `   • \`1,3j\` atau \`1.3j\`  → perpanjang 3 jam\n` +
                `   • \`2,1h\` atau \`2.1h\`  → perpanjang 1 hari\n` +
                `   • \`1,p\`  atau \`1.p\`   → ubah ke permanent\n` +
                `3. *Batal* — ketik \`batal\`\n\n` +
                `> _Singkatan: m=menit · j=jam · h=hari · p=permanent_\n` +
                `> ⏱️ _Pilihan berlaku *2 menit*_`;

        const sentList = await hisoka.sendMessage(m.from, { text: ljBodyText }, { quoted: m });
        const botMsgId = sentList?.key?.id || '';

        const timeout = setTimeout(() => {
                pendingJadibotChoices.delete(jadibotChoiceKey);
        }, 2 * 60 * 1000);
        pendingJadibotChoices.set(jadibotChoiceKey, {
                numbers: sortedList,
                botMsgId,
                createdAt: Date.now(),
                expiresAt: Date.now() + (2 * 60 * 1000),
                timeout
        });
        logCommand(m, hisoka, 'listbot');
}

module.exports = { handleListbot };
