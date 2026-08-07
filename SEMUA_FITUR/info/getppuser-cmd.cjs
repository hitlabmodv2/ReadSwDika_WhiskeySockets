/**
 * getppuser-cmd.cjs — Ambil foto profil pengguna WhatsApp
 *
 * Private : .getppuser mengambil foto profil pengirim pesan.
 * Grup    : reply pesan anggota lalu ketik .getppuser.
 */
'use strict';

const PROFILE_TIMEOUT_MS = 5000;

function isUsableJid(jid) {
        return typeof jid === 'string' && jid.includes('@') && !jid.endsWith('@g.us');
}

async function withTimeout(promise, timeoutMs, message) {
        let timer;
        try {
                return await Promise.race([
                        promise,
                        new Promise((_, reject) => {
                                timer = setTimeout(() => reject(new Error(message)), timeoutMs);
                        }),
                ]);
        } finally {
                if (timer) clearTimeout(timer);
        }
}

async function resolveQuotedUser({ hisoka, m }) {
        const quoted = m.quoted;
        if (!quoted) return null;

        // injectMessage biasanya sudah menyelesaikan LID menjadi PN pada sender.
        if (isUsableJid(quoted.sender)) return quoted.sender;

        const key = quoted.key || {};
        if (typeof hisoka.resolveLidToPN === 'function') {
                try {
                        const resolved = await withTimeout(
                                hisoka.resolveLidToPN(key),
                                PROFILE_TIMEOUT_MS,
                                'resolve_lid_timeout'
                        );
                        if (isUsableJid(resolved)) return resolved;
                } catch (_) {}
        }

        const participant = key.participantAlt || key.participant;
        return isUsableJid(participant) ? participant : null;
}

async function handleGetppuser({ hisoka, m, tolak, logCommand }) {
        let targetJid;

        if (m.isGroup) {
                if (!m.isQuoted) {
                        await tolak(
                                hisoka,
                                m,
                                '❌ Di grup, reply pesan orang yang ingin dilihat foto profilnya lalu ketik *.getppuser*.'
                        );
                        return;
                }
                targetJid = await resolveQuotedUser({ hisoka, m });
        } else {
                // Di chat pribadi, targetnya adalah orang yang mengirim command.
                targetJid = m.sender || m.from;
        }

        if (!isUsableJid(targetJid)) {
                await tolak(hisoka, m, '❌ Target pengguna tidak dapat dikenali.');
                return;
        }

        let profileUrl;
        try {
                profileUrl = await withTimeout(
                        hisoka.profilePictureUrl(targetJid, 'image'),
                        PROFILE_TIMEOUT_MS,
                        'profile_picture_timeout'
                );
        } catch (_) {
                profileUrl = null;
        }

        if (!profileUrl) {
                await tolak(
                        hisoka,
                        m,
                        '❌ Foto profil pengguna tidak tersedia atau disembunyikan oleh pengaturan privasi WhatsApp.'
                );
                return;
        }

        try {
                await hisoka.sendMessage(
                        m.from,
                        {
                                image: { url: profileUrl },
                                caption: '🖼️ Foto profil pengguna',
                        },
                        { quoted: m }
                );
                logCommand(m, hisoka, 'getppuser');
        } catch (error) {
                console.error('[GetPPUser] Gagal mengirim foto profil:', error?.message || error);
                await tolak(hisoka, m, '❌ Gagal mengirim foto profil. Silakan coba lagi.');
        }
}

module.exports = { handleGetppuser };