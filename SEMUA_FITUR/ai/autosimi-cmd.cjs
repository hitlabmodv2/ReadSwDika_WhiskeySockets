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
 *  autosimi-cmd.cjs — Command handler Autosimi
 *  Perintah .simi untuk percakapan AI berbasis Simi API
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Auto Simi (AI Chat) Command Handler
 *  Perintah .simi untuk auto-reply percakapan menggunakan
 *  Simi API & Gemini AI sebagai fallback, mendukung toggle
 *  on/off per private chat maupun grup.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

async function handleAutoSimi({
        hisoka, m, messagesType,
        loadConfig,
        gemini,
        getUserName,
        getAIPersonaName,
        getAIPersonaGreeting,
        getMediaTypeFromMessage,
        getCachedQuotedMedia,
        getQuotedMediaBuffer,
        getMediaInfo,
        detectImageSearchQuery,
        extractImageCount,
        buildWilyFallbackUserPrompt,
        buildWilyMediaUserPrompt,
        buildWilyAICommandPrompt,
        buildWilyVisionContextPrompt,
        buildSmartImageWaitText,
        buildSmartAlbumCaptions,
        sendImageAlbum,
        buildSmartImageHistoryReply,
        searchAndGetImage,
        searchAndGetImages,
        rememberAIMedia,
        processAIMediaAndSend,
        addToHistory,
        getHistory,
        getSessionKey,
        buildHistoryMeta,
        wrapCurrentUserMessage,
        detectAndUpdateMemory,
        startTyping,
        hashSticker,
        lookupSticker,
        saveSticker,
        incrementStickerSeen,
        buildStickerContextHint,
        buildStickerAnalysisExtractionPrompt,
        resolveLidFromContacts,
        isAICooldown,
        setAICooldown,
        tolak,
        wilyLog,
        wilyError,
}) {
        if (m.text?.startsWith('.')) return false;

        try {
                const config = loadConfig();
                const autoSimi = config.autoSimi || {};

                if (autoSimi.enabled) {
                        const botId = hisoka.user?.id || '';
                        const botNumber = botId.split(':')[0] || botId.split('@')[0];
                        const botJid = botNumber + '@s.whatsapp.net';
                        const botLid = hisoka.user?.lid || '';

                        const mentionedJids = m.mentions ||
                                m.message?.extendedTextMessage?.contextInfo?.mentionedJid ||
                                m.message?.imageMessage?.contextInfo?.mentionedJid ||
                                m.message?.videoMessage?.contextInfo?.mentionedJid ||
                                m.message?.stickerMessage?.contextInfo?.mentionedJid ||
                                m.content?.contextInfo?.mentionedJid ||
                                [];

                        const isBotMentioned = mentionedJids.some(jid => {
                                if (!jid) return false;
                                const jidNumber = jid.split(':')[0]?.split('@')[0] || jid.split('@')[0];
                                return jid === botJid ||
                                        jid === botId ||
                                        jid === botLid ||
                                        jid?.includes(botNumber) ||
                                        jidNumber === botNumber;
                        }) || m.text?.includes('@' + botNumber);

                        const quotedCtxParticipantAutoSimi = (m.content?.contextInfo?.participant || '').split('@')[0].split(':')[0];
                        const _quotedStanzaIdAS = m.content?.contextInfo?.stanzaId || '';
                        const _cachedQuotedAS = _quotedStanzaIdAS ? hisoka.cacheMsg?.get(_quotedStanzaIdAS) : null;
                        const botLidNum = (botLid || '').split('@')[0].split(':')[0];
                        const isReplyToBot = m.isQuoted && (
                                m.quoted?.key?.fromMe === true ||
                                (botNumber && quotedCtxParticipantAutoSimi === botNumber) ||
                                (botLidNum && quotedCtxParticipantAutoSimi === botLidNum) ||
                                (_cachedQuotedAS?.key?.fromMe === true)
                        );

                        if ((isBotMentioned || isReplyToBot) && !m.key?.fromMe) {
                                if (isAICooldown(m.sender)) return false;

                                // Typing dinyalakan dari sini (bukan cuma pas panggil Gemini) supaya akurat —
                                // termasuk selama download media & cari gambar otomatis (bisa lama & bikin "diam").
                                const stopTyping_p1 = startTyping(hisoka, m);
                                try {

                                let userMessage = m.text?.trim() || '';
                                if (userMessage) {
                                        userMessage = userMessage.replace(/@\d+/g, '').replace(/@bot/gi, '').trim();
                                }

                                let imageBuffer = null;
                                let imageMime = 'image/jpeg';
                                let hasMedia = false;
                                let mediaLabel = '';

                                const currentType = getMediaTypeFromMessage(m);
                                const quotedType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

                                if (currentType === 'imageMessage' || currentType === 'stickerMessage') {
                                        try {
                                                imageBuffer = await m.downloadMedia();
                                                imageMime = currentType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                hasMedia = true;
                                                mediaLabel = currentType === 'stickerMessage' ? 'sticker' : 'gambar';
                                        } catch (_) {
                                                hasMedia = true;
                                                mediaLabel = currentType === 'stickerMessage' ? 'sticker' : 'gambar';
                                        }
                                } else if (currentType === 'videoMessage') {
                                        hasMedia = true;
                                        mediaLabel = 'video';
                                }

                                if (!imageBuffer && m.isQuoted) {
                                        const qt = quotedType;
                                        if (qt === 'imageMessage' || qt === 'stickerMessage' || qt === 'albumMessage') {
                                                try {
                                                        const cached = getCachedQuotedMedia(hisoka, m);
                                                        imageBuffer = await getQuotedMediaBuffer(hisoka, m);
                                                        if (imageBuffer?.length > 0) {
                                                                const info = getMediaInfo(qt, m.quoted, cached);
                                                                imageMime = info.mime;
                                                                hasMedia = true;
                                                                mediaLabel = info.label;
                                                        } else {
                                                                hasMedia = true;
                                                                mediaLabel = qt === 'stickerMessage' ? 'sticker' : 'gambar';
                                                        }
                                                } catch (_) {
                                                        hasMedia = true;
                                                        mediaLabel = qt === 'stickerMessage' ? 'sticker' : 'gambar';
                                                }
                                        } else if (qt === 'videoMessage') {
                                                hasMedia = true;
                                                mediaLabel = 'video';
                                        }
                                }

                                const hasSticker = mediaLabel === 'sticker';
                                const isImageReply = isReplyToBot && hasMedia && mediaLabel !== 'video';
                                const isStickerReply = isReplyToBot && hasSticker;

                                // Sticker tanpa teks & bukan reply ke pesan bot → jangan kirim image ke vision API
                                // Biarkan AI balas natural tanpa analisis visual
                                if (hasSticker && !userMessage && !isStickerReply) {
                                        imageBuffer = null;
                                }

                                if (!userMessage && !hasMedia) {
                                        userMessage = buildWilyFallbackUserPrompt(currentType);
                                }

                                if (!userMessage && hasMedia) {
                                        userMessage = buildWilyMediaUserPrompt({
                                                mediaLabel,
                                                hasSticker,
                                                isStickerReply,
                                                mode: 'short',
                                        });
                                }

                                if (userMessage && !hasMedia) {
                                        const autoImgQuery = detectImageSearchQuery(userMessage);
                                        if (autoImgQuery) {
                                                try {
                                                        await tolak(hisoka, m, await buildSmartImageWaitText({
                                                                userName: 'kamu',
                                                                userQuestion: userMessage,
                                                                query: autoImgQuery,
                                                                count: 1,
                                                        }));
                                                        const imgResult = await searchAndGetImage(autoImgQuery);
                                                        const sentImage = await hisoka.sendMessage(m.from, {
                                                                image: imgResult.buffer,
                                                                caption: `🖼️ *${imgResult.title || autoImgQuery}*\n🔗 ${imgResult.url}`
                                                        }, { quoted: m });
                                                        rememberAIMedia(hisoka, sentImage, [{
                                                                buffer: imgResult.buffer,
                                                                mime: 'image/jpeg',
                                                                label: 'gambar',
                                                                caption: imgResult.title || autoImgQuery,
                                                        }]);
                                                        console.log(`\x1b[36m[AutoGemini]\x1b[39m Image search: "${autoImgQuery}" by ${m.pushName}`);
                                                } catch (se) {
                                                        console.error(`\x1b[31m[AutoGemini]\x1b[39m Image search error: ${se.message}`);
                                                        await tolak(hisoka, m, `❌ Maaf, gagal nyariin gambar "${autoImgQuery}". Coba lagi nanti ya!`);
                                                }
                                                return true;
                                        }
                                }

                                const now = new Date();
                                const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
                                const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                const userName = 'kamu';
                                const quotedBotText = isReplyToBot ? (m.quoted?.text || m.quoted?.caption || '') : '';
                                const userMemory = detectAndUpdateMemory(m.sender, userMessage);
                                const systemPrompt = buildWilyAICommandPrompt({
                                        userName, currentTime, currentDate, timeOfDay,
                                        personaName: getAIPersonaName(),
                                        hasHistory: false,
                                        quotedBotText,
                                        isPrivate: !m.isGroup,
                                        isOwner: m.isOwner,
                                        hasImage: hasMedia,
                                        isImageReply,
                                        hasSticker,
                                        isStickerReply,
                                        userMessage,
                                        userMemory,
                                        sessionKey: getSessionKey(m),
                                });

                                let _stickerHash1 = null;
                                let _stickerKnown1 = null;
                                if (hasSticker && imageBuffer?.length > 0) {
                                        _stickerHash1 = hashSticker(imageBuffer);
                                        _stickerKnown1 = lookupSticker(_stickerHash1);
                                        if (_stickerKnown1) {
                                                const hint = buildStickerContextHint(_stickerKnown1);
                                                if (hint) userMessage = hint + '\n\n' + (userMessage || '');
                                                incrementStickerSeen(_stickerHash1);
                                        }
                                }

                                let response;

                                if (imageBuffer && imageBuffer.length > 0) {
                                        let finalBuffer = imageBuffer;
                                        let finalMime = imageMime;
                                        if (imageMime === 'image/webp') {
                                                try {
                                                        const sharp = (await import('sharp')).default;
                                                        finalBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
                                                        finalMime = 'image/jpeg';
                                                } catch (_) {}
                                        }
                                        const autoVContents = [
                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                { role: 'user', parts: [
                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                        { text: userMessage || 'Analisis gambar/sticker ini.' },
                                                ]},
                                        ];
                                        const autoVModels = ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
                                        for (const model of autoVModels) {
                                                try { response = await gemini.chat({ model, contents: autoVContents }); break; } catch (_) {}
                                        }
                                } else {
                                        const autoContents = [
                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                { role: 'user', parts: [{ text: userMessage }] },
                                        ];
                                        response = await gemini.chat({ contents: autoContents });
                                }

                                if (response && response.trim()) {
                                        setAICooldown(m.sender);
                                        await processAIMediaAndSend(hisoka, m, response.trim(), { sessionKey: getSessionKey(m) });
                                        console.log(`\x1b[36m[AutoGemini]\x1b[39m Reply to ${userName} (${m.pushName}) in "${m.isGroup ? hisoka.getName(m.from) : 'DM'}" | Trigger: ${isBotMentioned ? 'mention' : 'reply'} | Media: ${hasMedia ? mediaLabel : 'none'}`);

                                        if (hasSticker && imageBuffer?.length > 0 && _stickerHash1 && !_stickerKnown1) {
                                                (async () => {
                                                        try {
                                                                let fbuf = imageBuffer;
                                                                if (imageMime === 'image/webp') {
                                                                        try { const sh = (await import('sharp')).default; fbuf = await sh(imageBuffer).jpeg({ quality: 85 }).toBuffer(); } catch (_) {}
                                                                }
                                                                const rawJson = await gemini.askWithImage(buildStickerAnalysisExtractionPrompt(), fbuf, 'image/jpeg');
                                                                const parsed = JSON.parse(rawJson.trim().replace(/```json|```/g, '').trim());
                                                                saveSticker(_stickerHash1, parsed);
                                                                console.log(`\x1b[32m[StickerMemory]\x1b[39m Saved: ${_stickerHash1.substring(0, 8)}… → ${parsed.emotion} / ${parsed.category}`);
                                                        } catch (_) {}
                                                })();
                                        }
                                }

                                } finally {
                                        // Jaminan: typing SELALU dimatikan di sini apapun jalur keluarnya
                                        // (sukses, early return saat cari gambar, atau error).
                                        stopTyping_p1();
                                }
                        }
                }

                // ── WILY AUTO REPLY (tanpa autoSimi) ──
                if (!autoSimi.enabled) {
                        const wilyAICfg = config.wilyAI || {};
                        const isWilyOn = wilyAICfg.enabled !== false;
                        const isAutoReplyOn = wilyAICfg.autoReply !== false;
                        const wilyScope = wilyAICfg.scope || 'all';
                        const scopeAllowPM = wilyScope === 'pm' || wilyScope === 'all';
                        const scopeAllowGC = wilyScope === 'gc' || wilyScope === 'all';
                        const wilyBotNum = (hisoka.user?.id || '').split(':')[0]?.split('@')[0] || '';
                        const wilyBotJid = wilyBotNum + '@s.whatsapp.net';
                        const wilyBotLidRaw = hisoka.user?.lid || '';
                        const wilyBotLidNum = wilyBotLidRaw.split('@')[0].split(':')[0];

                        const wilyMentionedJids = Array.from(new Set([
                                ...(Array.isArray(m.mentions) ? m.mentions : []),
                                ...(m.message?.extendedTextMessage?.contextInfo?.mentionedJid || []),
                                ...(m.message?.imageMessage?.contextInfo?.mentionedJid || []),
                                ...(m.message?.videoMessage?.contextInfo?.mentionedJid || []),
                                ...(m.message?.documentMessage?.contextInfo?.mentionedJid || []),
                                ...(m.message?.audioMessage?.contextInfo?.mentionedJid || []),
                                ...(m.message?.stickerMessage?.contextInfo?.mentionedJid || []),
                                ...(m.content?.contextInfo?.mentionedJid || []),
                        ])).filter(Boolean);
                        const isWilyMentioned = wilyMentionedJids.some(jid => {
                                if (!jid) return false;
                                const n = jid.split(':')[0]?.split('@')[0] || jid.split('@')[0];
                                return jid === wilyBotJid ||
                                        jid === wilyBotLidRaw ||
                                        n === wilyBotNum ||
                                        jid?.includes(wilyBotNum) ||
                                        (wilyBotLidNum && n === wilyBotLidNum);
                        }) || !!(m.text?.includes('@' + wilyBotNum));
                        if (m.isGroup && !m.key?.fromMe && (wilyMentionedJids.length > 0)) {
                                wilyLog(`\x1b[33m[MentionDebug]\x1b[39m base=${isWilyMentioned} | jids=${JSON.stringify(wilyMentionedJids)} | botNum=${wilyBotNum} | botLidRaw=${wilyBotLidRaw} | botLidNum=${wilyBotLidNum}`);
                        }

                        const wilyQuotedParticipant = (m.content?.contextInfo?.participant || '').split('@')[0].split(':')[0];
                        const _wilyQuotedStanzaId = m.content?.contextInfo?.stanzaId || '';
                        const _wilyCachedQuoted = _wilyQuotedStanzaId ? hisoka.cacheMsg?.get(_wilyQuotedStanzaId) : null;
                        const isReplyToBotMsg = m.isQuoted && (
                                m.quoted?.key?.fromMe === true ||
                                (wilyBotNum && wilyQuotedParticipant === wilyBotNum) ||
                                (wilyBotLidNum && wilyQuotedParticipant === wilyBotLidNum) ||
                                (_wilyCachedQuoted?.key?.fromMe === true)
                        );

                        const _wilyLidResolved = !isWilyMentioned && wilyMentionedJids
                                .filter(jid => jid?.endsWith('@lid'))
                                .some(lidJid => {
                                        try {
                                                const resolved = resolveLidFromContacts(lidJid);
                                                return resolved?.number && (
                                                        resolved.number === wilyBotNum ||
                                                        resolved.jid?.includes(wilyBotNum)
                                                );
                                        } catch (_) { return false; }
                                });

                        const _wilyOrigText = m.text?.trim() || '';
                        const _wilyTextOnlyMention = _wilyOrigText !== '' &&
                                _wilyOrigText.replace(/@\d+/g, '').trim() === '';
                        const _wilyTextHasBotNum = _wilyTextOnlyMention &&
                                _wilyOrigText.includes(wilyBotNum);

                        const _wilyTagAll = m.isGroup && !!(
                                m.text?.match(/@(everyone|semua|all|group|grup)\b/i) ||
                                wilyMentionedJids.some(jid =>
                                        jid === '0@s.whatsapp.net' ||
                                        jid?.startsWith('0@') ||
                                        jid === 'everyone@broadcast'
                                )
                        );

                        const isWilyMentionedFinal = isWilyMentioned || _wilyLidResolved || _wilyTextHasBotNum || _wilyTagAll;

                        const isPrivateDM = !m.isGroup && m.from !== 'status@broadcast';
                        const triggerGroup = scopeAllowGC && m.isGroup && (isWilyMentionedFinal || isReplyToBotMsg);
                        const triggerPM    = scopeAllowPM && isPrivateDM;
                        const isLoadedCommand = m.command && !m.isBot && hisoka.loadedCommands?.some(c => c.toLowerCase() === m.command);

                        if (!isLoadedCommand && isWilyOn && isAutoReplyOn && hisoka.isMainBot !== false && (triggerGroup || triggerPM) && !m.key?.fromMe && m.from !== 'status@broadcast') {
                                if (isAICooldown(m.sender)) return false;

                                const _stopTypingWily = startTyping(hisoka, m);

                                const userName = 'kamu';
                                const now = new Date();
                                const hours = parseInt(now.toLocaleString('en-US', { hour: 'numeric', hour12: false, timeZone: 'Asia/Jakarta' }));
                                const timeOfDay = hours < 5 ? 'dini hari' : hours < 11 ? 'pagi' : hours < 15 ? 'siang' : hours < 18 ? 'sore' : 'malam';
                                const currentTime = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' });
                                const currentDate = now.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'Asia/Jakarta' });

                                let userMessage = m.text?.trim() || '';
                                const _wilyMsgBeforeStrip = userMessage;
                                if (userMessage) {
                                        userMessage = userMessage.replace(/@\d+/g, '').replace(/@bot/gi, '').trim();
                                }
                                const _wilyWasMentionOnly = _wilyMsgBeforeStrip !== '' &&
                                        userMessage === '' &&
                                        _wilyMsgBeforeStrip.replace(/@\d+/g, '').trim() === '';

                                let imageBuffer = null;
                                let imageMime = 'image/jpeg';
                                let hasMedia = false;
                                let mediaLabel = '';
                                const curType = getMediaTypeFromMessage(m);
                                const qtType = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : '';

                                if (curType === 'imageMessage' || curType === 'stickerMessage') {
                                        try {
                                                imageBuffer = await m.downloadMedia();
                                                imageMime = curType === 'stickerMessage' ? 'image/webp' : 'image/jpeg';
                                                hasMedia = true;
                                                mediaLabel = curType === 'stickerMessage' ? 'sticker' : 'gambar';
                                        } catch (_) {
                                                hasMedia = true;
                                                mediaLabel = curType === 'stickerMessage' ? 'sticker' : 'gambar';
                                        }
                                } else if (curType === 'videoMessage') {
                                        hasMedia = true;
                                        mediaLabel = 'video';
                                } else if (m.isQuoted && (qtType === 'imageMessage' || qtType === 'stickerMessage' || qtType === 'albumMessage')) {
                                        try {
                                                const cached = getCachedQuotedMedia(hisoka, m);
                                                imageBuffer = await getQuotedMediaBuffer(hisoka, m);
                                                if (imageBuffer?.length > 0) {
                                                        const info = getMediaInfo(qtType, m.quoted, cached);
                                                        imageMime = info.mime;
                                                        hasMedia = true;
                                                        mediaLabel = info.label;
                                                } else {
                                                        hasMedia = true;
                                                        mediaLabel = qtType === 'stickerMessage' ? 'sticker' : 'gambar';
                                                }
                                        } catch (_) {
                                                hasMedia = true;
                                                mediaLabel = qtType === 'stickerMessage' ? 'sticker' : 'gambar';
                                        }
                                } else if (m.isQuoted && qtType === 'videoMessage') {
                                        hasMedia = true;
                                        mediaLabel = 'video';
                                }

                                const isImageReply = isReplyToBotMsg && hasMedia && mediaLabel !== 'video';
                                const hasSticker = mediaLabel === 'sticker';
                                const isStickerReply = isReplyToBotMsg && hasSticker;

                                // Sticker tanpa teks & bukan reply ke pesan bot → jangan kirim image ke vision API
                                // Biarkan AI balas natural tanpa analisis visual
                                if (hasSticker && !userMessage && !isStickerReply) {
                                        imageBuffer = null;
                                }

                                if (!userMessage && !hasMedia) {
                                        const _wilyFallbackType = _wilyTagAll ? 'tagall'
                                                : _wilyWasMentionOnly ? 'mention-only'
                                                : curType;
                                        userMessage = buildWilyFallbackUserPrompt(_wilyFallbackType);
                                }

                                if (!userMessage && hasMedia) {
                                        userMessage = buildWilyMediaUserPrompt({
                                                mediaLabel,
                                                hasSticker,
                                                isStickerReply,
                                                isImageReply,
                                                mode: 'identify',
                                        });
                                }

                                if (isImageReply && userMessage) {
                                        const shortMsg = userMessage.trim().toLowerCase();
                                        const intentMap = {
                                                'ini apa': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                'apa ini': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                'apaan ini': 'Identifikasi dan jelaskan apa yang ada di gambar ini secara detail.',
                                                'translate': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                'terjemahin': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                'terjemahkan': 'Terjemahkan semua teks yang ada di gambar ini ke bahasa Indonesia.',
                                                'baca ini': 'Baca dan ekstrak semua teks yang ada di gambar ini.',
                                                'bacain': 'Baca dan ekstrak semua teks yang ada di gambar ini.',
                                                'sama ga': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya. Samakah? Jelaskan perbedaan/persamaannya.',
                                                'sama gak': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya. Samakah? Jelaskan perbedaan/persamaannya.',
                                                'beda ga': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya dan jelaskan perbedaannya.',
                                                'beda gak': 'Bandingkan gambar ini dengan topik percakapan kita sebelumnya dan jelaskan perbedaannya.',
                                                'bagus ga': 'Evaluasi dan beri pendapat tentang gambar ini.',
                                                'bagus gak': 'Evaluasi dan beri pendapat tentang gambar ini.',
                                                'mirip ga': 'Bandingkan gambar ini dengan konteks percakapan sebelumnya. Miripkah?',
                                                'mirip gak': 'Bandingkan gambar ini dengan konteks percakapan sebelumnya. Miripkah?',
                                                'ini bener': 'Periksa kebenaran atau keakuratan apa yang ada di gambar ini.',
                                                'bener ga': 'Periksa kebenaran atau keakuratan apa yang ada di gambar ini.',
                                                'jelaskan': 'Jelaskan secara detail apa yang ada di gambar ini.',
                                                'explain': 'Explain everything in this image in detail.',
                                                'analisis': 'Analisis gambar ini secara menyeluruh dan mendalam.',
                                                'analisa': 'Analisis gambar ini secara menyeluruh dan mendalam.',
                                        };
                                        for (const [key, intent] of Object.entries(intentMap)) {
                                                if (shortMsg.includes(key)) {
                                                        userMessage = intent;
                                                        break;
                                                }
                                        }
                                }

                                if (!userMessage) userMessage = 'Halo!';

                                const autoImgQuery = !hasMedia ? detectImageSearchQuery(userMessage) : null;
                                if (autoImgQuery) {
                                        try {
                                                const imgCount = Math.min(extractImageCount(userMessage), 5);
                                                await tolak(hisoka, m, await buildSmartImageWaitText({
                                                        userName,
                                                        userQuestion: userMessage,
                                                        query: autoImgQuery,
                                                        count: imgCount,
                                                }));
                                                let historyReply = '';
                                                if (imgCount > 1) {
                                                        const imgResults = await searchAndGetImages(autoImgQuery, imgCount);
                                                        const captions = await buildSmartAlbumCaptions({
                                                                userQuestion: userMessage,
                                                                query: autoImgQuery,
                                                                images: imgResults,
                                                        });
                                                        await sendImageAlbum(hisoka, m, imgResults, captions);
                                                        historyReply = await buildSmartImageHistoryReply({
                                                                userQuestion: userMessage,
                                                                query: autoImgQuery,
                                                                images: imgResults,
                                                                captions,
                                                        });
                                                } else {
                                                        const imgResult = await searchAndGetImage(autoImgQuery);
                                                        const captions = await buildSmartAlbumCaptions({
                                                                userQuestion: userMessage,
                                                                query: autoImgQuery,
                                                                images: [imgResult],
                                                        });
                                                        const sentImage = await hisoka.sendMessage(m.from, {
                                                                image: imgResult.buffer,
                                                                caption: captions[0] || `🖼️ *${imgResult.title || autoImgQuery}*`
                                                        }, { quoted: m });
                                                        rememberAIMedia(hisoka, sentImage, [{
                                                                buffer: imgResult.buffer,
                                                                mime: 'image/jpeg',
                                                                label: 'gambar',
                                                                caption: captions[0] || imgResult.title || autoImgQuery,
                                                        }]);
                                                        historyReply = await buildSmartImageHistoryReply({
                                                                userQuestion: userMessage,
                                                                query: autoImgQuery,
                                                                images: [imgResult],
                                                                captions,
                                                        });
                                                }
                                                if (isAutoReplyOn && historyReply) {
                                                        addToHistory(getSessionKey(m), userMessage, historyReply, buildHistoryMeta(m, { mediaLabel: 'gambar' }));
                                                }
                                        } catch (se) {
                                                await tolak(hisoka, m, `❌ Maaf gagal cariin gambar "${autoImgQuery}". Coba lagi ya!`);
                                        }
                                        _stopTypingWily();
                                        return true;
                                }

                                const sessKey = getSessionKey(m);
                                const histMsgs = getHistory(sessKey);
                                const quotedBotText = (m.isQuoted && m.quoted?.key?.fromMe)
                                        ? (m.quoted?.text || m.quoted?.caption || m.quoted?.body || '')
                                        : '';
                                const userMemory = detectAndUpdateMemory(m.sender, userMessage);
                                const systemPrompt = buildWilyAICommandPrompt({
                                        userName, currentTime, currentDate, timeOfDay,
                                        personaName: getAIPersonaName(),
                                        hasHistory: histMsgs.length > 0,
                                        quotedBotText,
                                        isPrivate: !m.isGroup,
                                        isOwner: m.isOwner,
                                        hasImage: hasMedia,
                                        isImageReply,
                                        hasSticker,
                                        isStickerReply,
                                        userMessage,
                                        history: histMsgs,
                                        userMemory,
                                        sessionKey: sessKey,
                                });
                                const currentMsgMeta = buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : null });
                                let contents;
                                if (histMsgs.length > 0) {
                                        contents = [
                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                ...histMsgs,
                                                { role: 'user', parts: [{ text: wrapCurrentUserMessage(userMessage, currentMsgMeta) }] },
                                        ];
                                } else {
                                        contents = [
                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                { role: 'user', parts: [{ text: userMessage }] },
                                        ];
                                }

                                const visionContextText = buildWilyVisionContextPrompt({
                                        isImageReply,
                                        isStickerReply,
                                        quotedBotText,
                                        hasSticker,
                                        mediaLabel,
                                        userMessage,
                                });

                                let _stickerHash2 = null;
                                let _stickerKnown2 = null;
                                if (hasSticker && imageBuffer?.length > 0) {
                                        _stickerHash2 = hashSticker(imageBuffer);
                                        _stickerKnown2 = lookupSticker(_stickerHash2);
                                        if (_stickerKnown2) {
                                                const hint2 = buildStickerContextHint(_stickerKnown2);
                                                if (hint2) userMessage = hint2 + '\n\n' + (userMessage || '');
                                                incrementStickerSeen(_stickerHash2);
                                        }
                                }

                                let response;
                                try {
                                        if (imageBuffer && imageBuffer.length > 0) {
                                                let finalBuffer = imageBuffer;
                                                let finalMime = imageMime;
                                                if (imageMime === 'image/webp') {
                                                        try {
                                                                const sharp = (await import('sharp')).default;
                                                                finalBuffer = await sharp(imageBuffer).jpeg({ quality: 90 }).toBuffer();
                                                                finalMime = 'image/jpeg';
                                                        } catch (_) {}
                                                }
                                                const vModels = ['gemini-3.1-pro-preview', 'gemini-2.5-pro', 'gemini-2.5-flash'];
                                                if (histMsgs.length > 0) {
                                                        const vContents = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                ...histMsgs,
                                                                { role: 'user', parts: [
                                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                                        { text: wrapCurrentUserMessage(visionContextText, currentMsgMeta) },
                                                                ]},
                                                        ];
                                                        for (const model of vModels) {
                                                                try { response = await gemini.chat({ model, contents: vContents }); break; } catch (_) {}
                                                        }
                                                } else {
                                                        const vContentsNoHist = [
                                                                { role: 'user', parts: [{ text: systemPrompt }] },
                                                                { role: 'model', parts: [{ text: getAIPersonaGreeting() }] },
                                                                { role: 'user', parts: [
                                                                        { inlineData: { mimeType: finalMime, data: finalBuffer.toString('base64') } },
                                                                        { text: visionContextText },
                                                                ]},
                                                        ];
                                                        for (const model of vModels) {
                                                                try { response = await gemini.chat({ model, contents: vContentsNoHist }); break; } catch (_) {}
                                                        }
                                                }
                                        } else {
                                                response = await gemini.chat({ contents });
                                        }

                                        if (response && response.trim()) {
                                                setAICooldown(m.sender);
                                                let autoFinalResponse = response.trim();
                                                if (hasMedia) {
                                                        autoFinalResponse = autoFinalResponse.replace(/\[GAMBAR:[^\]]{1,200}\]/gi, '').replace(/\n{3,}/g, '\n\n').trim();
                                                }
                                                const mediaResult = await processAIMediaAndSend(hisoka, m, autoFinalResponse, { sessionKey: sessKey });
                                                const cleanResp = mediaResult.sentText;
                                                addToHistory(sessKey, userMessage, cleanResp || response.trim(), buildHistoryMeta(m, { mediaLabel: hasMedia ? mediaLabel : null }));
                                                const triggerType = isWilyMentioned ? 'Mention' : isReplyToBotMsg ? 'Reply' : 'DM';
                                                wilyLog(`\x1b[36m[WilyAutoReply]\x1b[39m ${userName} | ${m.isGroup ? 'Grup' : 'Private'} | Trigger: ${triggerType} | Media: ${hasMedia ? mediaLabel : 'tidak ada'}`);

                                                if (hasSticker && imageBuffer?.length > 0 && _stickerHash2 && !_stickerKnown2) {
                                                        (async () => {
                                                                try {
                                                                        let fbuf2 = imageBuffer;
                                                                        if (imageMime === 'image/webp') {
                                                                                try { const sh = (await import('sharp')).default; fbuf2 = await sh(imageBuffer).jpeg({ quality: 85 }).toBuffer(); } catch (_) {}
                                                                        }
                                                                        const rawJson2 = await gemini.askWithImage(buildStickerAnalysisExtractionPrompt(), fbuf2, 'image/jpeg');
                                                                        const parsed2 = JSON.parse(rawJson2.trim().replace(/```json|```/g, '').trim());
                                                                        saveSticker(_stickerHash2, parsed2);
                                                                        console.log(`\x1b[32m[StickerMemory]\x1b[39m Saved: ${_stickerHash2.substring(0, 8)}… → ${parsed2.emotion} / ${parsed2.category}`);
                                                                } catch (_) {}
                                                        })();
                                                }
                                        }
                                } catch (arErr) {
                                        wilyError('\x1b[31m[WilyAutoReply] Error:\x1b[39m', arErr.message);
                                } finally {
                                        _stopTypingWily();
                                }
                        }
                }

        } catch (autoSimiError) {
                console.error('\x1b[31m[AutoGemini] Error:\x1b[39m', autoSimiError.message);
        }

        return false;
}

module.exports = { handleAutoSimi };
