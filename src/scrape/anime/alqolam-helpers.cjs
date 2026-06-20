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
 *  alqolam-helpers.cjs — AlqOlam helper utilities
 *  Fungsi pembantu parsing & format data episode AlqAnime
 * ───────────────────────────────
 */
'use strict';

function formatAlqLinkMsg(animeTitle, ep, prefRes, resList) {
    let msg = `🔗 *LINK DOWNLOAD LANGSUNG*\n`;
    msg += `━━━━━━━━━━━━━━━━━━━\n`;
    msg += `🎌 *${animeTitle}*\n`;
    msg += `📺 Episode *${ep.episode}*\n\n`;
    msg += `📌 *Buka link berikut di browser:*\n`;

    const targetRes = prefRes ? [prefRes, ...resList.filter(r => r !== prefRes)] : resList;
    for (const res of targetRes) {
        const hosts = ep.links[res] || [];
        if (!hosts.length) continue;
        msg += `\n🎞 *${res.toUpperCase()}*\n`;
        hosts.forEach(h => { msg += `• ${h.host}: ${h.url}\n`; });
    }
    msg += `\n⚠️ _Link melalui ouo.io (ada iklan singkat, klik "I'm Human" lalu download)_`;
    return msg;
}

function pickBestAlqLink(links, preferredRes) {
    const hostPriority = ['pixeldrain', 'acefile', 'mediafire'];
    const resPriority = ['1080p', '720p', '480p', '360p'];
    function getBestHost(hosts) {
        if (!hosts?.length) return null;
        return hosts.find(h => hostPriority.some(hp => h.host.toLowerCase().includes(hp))) || hosts[0];
    }
    if (preferredRes && links[preferredRes]?.length) {
        const h = getBestHost(links[preferredRes]);
        return h ? { url: h.url, host: h.host, res: preferredRes } : null;
    }
    for (const r of resPriority) {
        if (links[r]?.length) {
            const h = getBestHost(links[r]);
            if (h) return { url: h.url, host: h.host, res: r };
        }
    }
    return null;
}

function getAllAlqLinksByPriority(links, preferredRes) {
    const hostPriority = ['pixeldrain', 'acefile', 'mediafire'];
    const resPriority = ['1080p', '720p', '480p', '360p'];
    function sortHosts(hosts) {
        if (!hosts?.length) return [];
        const ordered = [];
        for (const hp of hostPriority) {
            const match = hosts.find(h => h.host.toLowerCase().includes(hp));
            if (match) ordered.push(match);
        }
        for (const h of hosts) {
            if (!ordered.includes(h)) ordered.push(h);
        }
        return ordered;
    }
    const res = preferredRes && links[preferredRes]?.length ? preferredRes
        : resPriority.find(r => links[r]?.length);
    if (!res) return [];
    return sortHosts(links[res]).map(h => ({ url: h.url, host: h.host, res }));
}

module.exports = { formatAlqLinkMsg, pickBestAlqLink, getAllAlqLinksByPriority };
