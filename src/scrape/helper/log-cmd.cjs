'use strict';

function makeLogCmd({ maskNumber }) {
	function _logCmdBox(m, hisoka, cmdStr) {
		const _isJadibot = hisoka?.isMainBot === false;
		const _senderNum = (m.sender || '').split('@')[0].split(':')[0];
		const _modeStr = _isJadibot
			? 'Jadibot'
			: (m.isRealOwner ? 'Owner' : m.isBot ? 'Bot' : 'User');
		const _tujuan = m.isGroup ? 'Grup' : 'Private';
		const _namaGrup = m.isGroup ? (hisoka.getName(m.from) || '-') : '-';

		const _numToShow = _isJadibot
			? (hisoka.user?.id?.split('@')[0]?.split(':')[0] || _senderNum)
			: _senderNum;

		let _botName;
		if (_isJadibot) {
			const _jadibotJid = hisoka.user?.id || '';
			const _fromContacts = typeof hisoka.getName === 'function'
				? (hisoka.getName(_jadibotJid) || hisoka.getName(_numToShow + '@s.whatsapp.net') || '')
				: '';
			const _rawName = hisoka.user?.name || '';
			const _nameIsNum = /^\+?\d[\d\s\-]+$/.test(_rawName.trim());
			const _fromContactsIsNum = /^\+?\d[\d\s\-]+$/.test(_fromContacts.trim());
			if (_fromContacts && !_fromContactsIsNum) {
				_botName = _fromContacts;
			} else if (_rawName && !_nameIsNum) {
				_botName = _rawName;
			} else {
				_botName = _fromContacts || _rawName || _numToShow || '-';
			}
		} else {
			const _rawBotName = hisoka.user?.name || '';
			const _nameIsJustNumber = /^\+?\d[\d\s\-]+$/.test(_rawBotName.trim());
			_botName = (_rawBotName && !_nameIsJustNumber)
				? _rawBotName
				: (m.pushName || _rawBotName || '-');
		}
		const _maskedNum = maskNumber(_numToShow);

		const bW = 35, cy = '\x1b[36m', wh = '\x1b[37m', gr = '\x1b[32m';
		const ye = '\x1b[33m', or = '\x1b[38;2;255;165;0m', pu = '\x1b[35m', rs = '\x1b[0m';
		const cW = 18;
		const _pd = (s) => {
			s = String(s).slice(0, cW + 5);
			let w = 0;
			for (const c of s) w += c.codePointAt(0) > 0x2E7F ? 2 : 1;
			return s + ' '.repeat(Math.max(0, cW - w));
		};
		const _now = new Date();
		const _tgl = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', day: '2-digit', month: 'long', year: 'numeric' }).format(_now);
		const _jam = new Intl.DateTimeFormat('id-ID', { timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false }).format(_now);
		const title = 'InformasiBotCommand';
		const tp = Math.floor((bW - title.length) / 2);
		const modeColor = m.isRealOwner ? ye : m.isBot ? pu : wh;
		const tujuanColor = m.isGroup ? or : cy;

		console.log(
			`${cy}┌${'═'.repeat(bW)}┐${rs}\n` +
			`${cy}║${' '.repeat(tp)}${ye}${title}${rs}${cy}${' '.repeat(bW - tp - title.length)}║${rs}\n` +
			`${cy}├${'═'.repeat(bW)}┤${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Mode     : ${modeColor}${_pd(_modeStr)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Tujuan   : ${tujuanColor}${_pd(_tujuan)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ NamaGrup : ${wh}${_pd(_namaGrup)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Nama     : ${wh}${_pd(_botName)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Nomer    : ${wh}${_pd(_maskedNum)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Cmd      : ${cy}${_pd(cmdStr)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Tanggal  : ${gr}${_pd(_tgl)}${rs}\n` +
			`${cy}│${rs} ${wh}⭔ Waktu    : ${gr}${_pd(_jam + ' WIB')}${rs}\n` +
			`${cy}└${'─'.repeat(13)}···${rs}`
		);
	}

	function logCommand(m, hisoka, command) {
		_logCmdBox(m, hisoka, `${m.prefix || '.'}${command}`);
	}

	return { _logCmdBox, logCommand };
}

module.exports = { makeLogCmd };
