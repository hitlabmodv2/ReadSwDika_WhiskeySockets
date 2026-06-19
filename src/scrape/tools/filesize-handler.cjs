'use strict';

async function handleFilesize({ hisoka, m, tolak, logCommand, _require, path }) {
	if (!m.isOwner) return tolak(hisoka, m, '❌ Hanya owner yang bisa menggunakan perintah ini!');
	if (!m.prefix && m.query) return;
	try {
		const { cekSizeWithProgress, buatPesanLoading } = _require(path.resolve('./src/scrape/tools/ceksize.cjs'));
		const _csMsg = await hisoka.sendMessage(m.from, { text: buatPesanLoading(0, 'Memulai...') }, { quoted: m });

		let _csLastEdit = 0, _csPending = null, _csDone = false;
		const editLoading = async (pct, label) => {
			if (_csDone) return;
			const now  = Date.now();
			const teks = buatPesanLoading(pct, label);
			if (_csPending) { clearTimeout(_csPending); _csPending = null; }
			if (now - _csLastEdit >= 1000) {
				_csLastEdit = now;
				try { await hisoka.sendMessage(m.from, { text: teks, edit: _csMsg.key }); } catch (_) {}
			} else {
				const wait = 1000 - (now - _csLastEdit);
				_csPending = setTimeout(async () => {
					if (_csDone) return;
					_csLastEdit = Date.now();
					try { await hisoka.sendMessage(m.from, { text: teks, edit: _csMsg.key }); } catch (_) {}
				}, wait);
			}
		};

		const hasil = await cekSizeWithProgress(20, editLoading);
		_csDone = true;
		if (_csPending) { clearTimeout(_csPending); _csPending = null; }
		await new Promise(r => setTimeout(r, 600));
		await hisoka.sendMessage(m.from, { text: hasil.caption, edit: _csMsg.key });
		logCommand(m, hisoka, 'ceksize');
	} catch (err) {
		console.error('[ceksize] Error:', err.message);
		await m.reply('❌ Gagal cek size: ' + err.message);
	}
}

module.exports = { handleFilesize };
