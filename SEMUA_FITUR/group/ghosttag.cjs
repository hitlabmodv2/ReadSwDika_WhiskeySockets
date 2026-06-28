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
 *  ghosttag.cjs — Ghost tag command handler
 *  Perintah .ghosttag untuk mention semua anggota grup tanpa notifikasi
 *  Album message dikirim dengan self-reply (reply ke pesan sendiri)
 * ───────────────────────────────
 */
'use strict';

async function handleGhosttag({ hisoka, m, query, tolak, logCommand, generateWAMessageFromContent, Button }) {
        if (!m.isOwner) return;

        const gtPrefix  = m.prefix || '.';
        const gtUserJid = hisoka.user?.id;

        const gtGroupKeys = hisoka.groups.keys().filter(id => id.endsWith('@g.us'));

        /**
         * Kirim satu albumMessage ke JID grup dengan self-reply.
         *
         * Cara kerja:
         * 1. Generate album pertama → ambil msgId-nya
         * 2. Generate ulang album KEDUA dengan messageId yg sama + quoted = album pertama
         *    → Baileys otomatis inject contextInfo (stanzaId, participant, quotedMessage)
         *    → karena quoted.key.fromMe = true, participant = userJid (bot sendiri) ✓
         *    → hasilnya: pesan tampil sebagai "membalas pesan sendiri" di WA ✓
         */
        async function gtSendOne(jid) {
                // ── Ambil daftar participant ────────────────────────────────────
                let participants = [];
                try {
                        const meta = hisoka.groups.read(jid);
                        participants = (meta?.participants || []).map(v => v.phoneNumber || v.id).filter(Boolean);
                } catch (_) {}

                if (!participants.length) {
                        try {
                                const fetched = await hisoka.groupMetadata(jid);
                                participants = (fetched.participants || []).map(v => v.id).filter(Boolean);
                        } catch (_) {}
                }

                if (!participants.length) return 0;

                // ── Step 1: generate pertama → ambil ID ────────────────────────
                const tempAlbum = generateWAMessageFromContent(
                        jid,
                        {
                                albumMessage: {
                                        expectedImageCount: 0,
                                        expectedVideoCount: 0,
                                        contextInfo: { mentionedJid: participants },
                                },
                        },
                        { userJid: gtUserJid }
                );

                const msgId = tempAlbum.key.id;

                // ── Step 2: generate ulang dengan ID sama + quoted = diri sendiri
                // Baileys akan otomatis:
                //   contextInfo.stanzaId     = msgId        (ID pesan sendiri)
                //   contextInfo.participant   = userJid      (bot sendiri, karena fromMe=true)
                //   contextInfo.quotedMessage = isi album    (stripped copy)
                const album = generateWAMessageFromContent(
                        jid,
                        {
                                albumMessage: {
                                        expectedImageCount: 0,
                                        expectedVideoCount: 0,
                                        contextInfo: { mentionedJid: participants },
                                },
                        },
                        {
                                userJid  : gtUserJid,
                                messageId: msgId,      // paksa ID sama → self-quote
                                quoted   : tempAlbum,  // quote album pertama (= diri sendiri)
                        }
                );

                // ── Step 3: relay ───────────────────────────────────────────────
                await hisoka.relayMessage(jid, album.message, { messageId: msgId });

                return participants.length;
        }

        // ── Tidak ada query → tampilkan menu pilihan grup ─────────────────────

        if (!query || (!query.trim().endsWith('@g.us') && query.trim() !== 'all')) {
                if (!gtGroupKeys.length) return tolak(hisoka, m, '❌ Bot tidak bergabung di grup manapun.');

                const gtBotNum = (hisoka.user?.id || '').split('@')[0].split(':')[0];

                const gtTotalMemberAll = gtGroupKeys.reduce((acc, jid) => {
                        const g = hisoka.groups.read(jid);
                        return acc + (g?.participants?.length || 0);
                }, 0);

                const gtSorted = gtGroupKeys
                        .map(jid => {
                                const g        = hisoka.groups.read(jid);
                                const parts    = g?.participants || [];
                                const totalMember = parts.length;
                                const totalAdmin  = parts.filter(p => p.admin).length;
                                const isBotAdmin  = parts.some(p => {
                                        const num = (p.jid || p.phoneNumber || p.id || '').split('@')[0].split(':')[0];
                                        return num === gtBotNum && p.admin;
                                });
                                return { jid, name: g?.subject || g?.name || jid, totalMember, totalAdmin, isBotAdmin };
                        })
                        .sort((a, b) =>
                                b.totalMember - a.totalMember ||
                                a.name.toLowerCase().localeCompare(b.name.toLowerCase(), 'id', { numeric: true })
                        );

                const btn = new Button()
                        .setBody(
                                `『 👻 』 *G H O S T  T A G*\n` +
                                `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n\n` +
                                `✦ *Semua Grup* — tag semua grup sekaligus\n` +
                                `✦ *Pilih Satu Grup* — pilih dari daftar\n\n` +
                                `▬▬▬▬▬▬▬▬▬▬▬▬▬▬▬\n` +
                                `🗂️ Grup   : *${gtGroupKeys.length}* grup\n` +
                                `👥 Member : *${gtTotalMemberAll}* total`
                        )
                        .setFooter(`⚡ Wily Bot • Ghost Tag System`)
                        .addReply('🌐 Tag Semua Grup', `${gtPrefix}ghosttag all`)
                        .addSelection('📂 Pilih Satu Grup')
                        .makeSections('✦ Daftar Grup');

                for (const { jid, name, totalMember, totalAdmin, isBotAdmin } of gtSorted) {
                        const adminBadge = isBotAdmin ? '👑 Admin' : '👤 Member';
                        btn.makeRow(
                                adminBadge,
                                name,
                                `👥 ${totalMember} anggota  •  🛡️ ${totalAdmin} admin`,
                                `${gtPrefix}ghosttag ${jid}`
                        );
                }

                await btn.selfReply().run(m.from, hisoka);
                logCommand(m, hisoka, 'ghosttag');
                return;
        }

        // ── Query "all" → tag semua grup ──────────────────────────────────────

        if (query.trim() === 'all') {
                if (!gtGroupKeys.length) return tolak(hisoka, m, '❌ Bot tidak bergabung di grup manapun.');

                await m.reply(`⏳ Mengirim ghost tag ke *${gtGroupKeys.length}* grup, mohon tunggu...`);

                let gtOk = 0, gtFail = 0, gtTotalMember = 0;
                for (const jid of gtGroupKeys) {
                        try {
                                const count = await gtSendOne(jid);
                                if (count > 0) { gtOk++; gtTotalMember += count; }
                                else gtFail++;
                        } catch (_) { gtFail++; }
                }

                await m.reply(
                        `✅ *Ghost Tag Selesai!*\n\n` +
                        `📊 *Hasil:*\n` +
                        `• ✅ Berhasil : ${gtOk} grup\n` +
                        `• ❌ Gagal    : ${gtFail} grup\n` +
                        `• 👥 Total    : ${gtTotalMember} member di-tag`
                );
                logCommand(m, hisoka, 'ghosttag');
                return;
        }

        // ── Query berisi JID → tag satu grup spesifik ────────────────────────

        const gtJid = query.trim();
        try {
                const count = await gtSendOne(gtJid);
                if (!count) return tolak(hisoka, m, '❌ Tidak ada member ditemukan atau gagal mengambil data grup.');
                await m.reply(`✅ Ghost tag berhasil dikirim ke *${count}* member!`);
        } catch (e) {
                await tolak(hisoka, m, '❌ Gagal mengirim ghost tag: ' + (e.message || e));
        }

        logCommand(m, hisoka, 'ghosttag');
}

module.exports = { handleGhosttag };
