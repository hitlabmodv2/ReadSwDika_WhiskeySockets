'use strict';

async function handleListbot({ hisoka, m, tolak, logCommand, isMainBot, jadibotMap, getJadibotExpiry, getJadibotExpirySummary, cleanupExpiredJadibots, pendingJadibotChoices, getJadibotChoiceKey, jadibotConnectedAt, getUserName }) {
	if (!m.prefix && m.query) return;
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
		const expA = metaA ? Number(metaA.expiresAt) : Infinity;
		const expB = metaB ? Number(metaB.expiresAt) : Infinity;
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
		const remainingMs = meta ? Number(meta.expiresAt) - now : Infinity;
		const isAlmostExpired = remainingMs !== Infinity && remainingMs < 30 * 60 * 1000;
		const statusTag = isAlmostExpired ? ' (Hampir Habis)' : '';
		const namaUser = getUserName(`${num}@s.whatsapp.net`, '-');

		let expireText = 'Permanent';
		if (meta && Number(meta.expiresAt) > 0) {
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
			onlineLine = `\n   Online : ${durasiStr} (sejak ${sejakTgl} ${sejakWaktu} WIB)`;
		}

		return (
			`${i + 1}. *+${num}*${statusTag}\n` +
			`   Nama   : ${namaUser}\n` +
			`   Sisa   : ${info.remaining}\n` +
			`   Expire : ${expireText}` +
			onlineLine
		);
	}).join('\n\n');

	const ljBodyText =
		`*LIST BOT AKTIF*\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`Total  : *${sortedList.length} bot aktif*\n` +
		`Waktu  : ${ljHari}, ${ljTanggal} | ${ljWaktu} WIB\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n\n` +
		`${detailLines}\n\n` +
		`━━━━━━━━━━━━━━━━━━━━━\n` +
		`*Cara pakai — reply pesan ini:*\n\n` +
		`Stop bot:\n` +
		`   Ketik urutan → contoh: *1*\n\n` +
		`Perpanjang durasi:\n` +
		`   Ketik *urutan,durasi* → contoh:\n` +
		`   • *1,3j*  → perpanjang bot 1 selama 3 jam\n` +
		`   • *2,1h*  → perpanjang bot 2 selama 1 hari\n` +
		`   • *1,p*   → ubah bot 1 ke permanent\n\n` +
		`Singkatan: m=menit, j=jam, h=hari, p=permanent\n` +
		`Pilihan berlaku *2 menit*`;

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
