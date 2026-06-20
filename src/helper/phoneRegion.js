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
 *  phoneRegion.js — Deteksi negara dari nomor telepon
 *  Lookup prefix internasional (+62 = ID, +1 = US, dll)
 * ───────────────────────────────
 */
/**
 * ═══════════════════════════════════════════════════════════════
 *  Phone Region Detector
 *  Deteksi asal negara dari nomor telepon berdasarkan prefix
 *  internasional (+62 → Indonesia, +1 → AS, dll) — dipakai
 *  untuk personalisasi respons dan info nomor di pesan.
 * ═══════════════════════════════════════════════════════════════
 */
'use strict';

const countryPhoneCodes = {
    '1': { country: 'Amerika Serikat/Kanada', flag: '🇺🇸', code: '+1' },
    '7': { country: 'Rusia', flag: '🇷🇺', code: '+7' },
    '20': { country: 'Mesir', flag: '🇪🇬', code: '+20' },
    '27': { country: 'Afrika Selatan', flag: '🇿🇦', code: '+27' },
    '30': { country: 'Yunani', flag: '🇬🇷', code: '+30' },
    '31': { country: 'Belanda', flag: '🇳🇱', code: '+31' },
    '32': { country: 'Belgia', flag: '🇧🇪', code: '+32' },
    '33': { country: 'Perancis', flag: '🇫🇷', code: '+33' },
    '34': { country: 'Spanyol', flag: '🇪🇸', code: '+34' },
    '36': { country: 'Hungaria', flag: '🇭🇺', code: '+36' },
    '39': { country: 'Italia', flag: '🇮🇹', code: '+39' },
    '40': { country: 'Rumania', flag: '🇷🇴', code: '+40' },
    '41': { country: 'Swiss', flag: '🇨🇭', code: '+41' },
    '43': { country: 'Austria', flag: '🇦🇹', code: '+43' },
    '44': { country: 'Inggris', flag: '🇬🇧', code: '+44' },
    '45': { country: 'Denmark', flag: '🇩🇰', code: '+45' },
    '46': { country: 'Swedia', flag: '🇸🇪', code: '+46' },
    '47': { country: 'Norwegia', flag: '🇳🇴', code: '+47' },
    '48': { country: 'Polandia', flag: '🇵🇱', code: '+48' },
    '49': { country: 'Jerman', flag: '🇩🇪', code: '+49' },
    '51': { country: 'Peru', flag: '🇵🇪', code: '+51' },
    '52': { country: 'Meksiko', flag: '🇲🇽', code: '+52' },
    '53': { country: 'Kuba', flag: '🇨🇺', code: '+53' },
    '54': { country: 'Argentina', flag: '🇦🇷', code: '+54' },
    '55': { country: 'Brasil', flag: '🇧🇷', code: '+55' },
    '56': { country: 'Chili', flag: '🇨🇱', code: '+56' },
    '57': { country: 'Kolombia', flag: '🇨🇴', code: '+57' },
    '58': { country: 'Venezuela', flag: '🇻🇪', code: '+58' },
    '60': { country: 'Malaysia', flag: '🇲🇾', code: '+60' },
    '61': { country: 'Australia', flag: '🇦🇺', code: '+61' },
    '62': { country: 'Indonesia', flag: '🇮🇩', code: '+62' },
    '63': { country: 'Filipina', flag: '🇵🇭', code: '+63' },
    '64': { country: 'Selandia Baru', flag: '🇳🇿', code: '+64' },
    '65': { country: 'Singapura', flag: '🇸🇬', code: '+65' },
    '66': { country: 'Thailand', flag: '🇹🇭', code: '+66' },
    '81': { country: 'Jepang', flag: '🇯🇵', code: '+81' },
    '82': { country: 'Korea Selatan', flag: '🇰🇷', code: '+82' },
    '84': { country: 'Vietnam', flag: '🇻🇳', code: '+84' },
    '86': { country: 'Tiongkok', flag: '🇨🇳', code: '+86' },
    '90': { country: 'Turki', flag: '🇹🇷', code: '+90' },
    '91': { country: 'India', flag: '🇮🇳', code: '+91' },
    '92': { country: 'Pakistan', flag: '🇵🇰', code: '+92' },
    '93': { country: 'Afghanistan', flag: '🇦🇫', code: '+93' },
    '94': { country: 'Sri Lanka', flag: '🇱🇰', code: '+94' },
    '95': { country: 'Myanmar', flag: '🇲🇲', code: '+95' },
    '98': { country: 'Iran', flag: '🇮🇷', code: '+98' },
    '212': { country: 'Maroko', flag: '🇲🇦', code: '+212' },
    '213': { country: 'Aljazair', flag: '🇩🇿', code: '+213' },
    '216': { country: 'Tunisia', flag: '🇹🇳', code: '+216' },
    '218': { country: 'Libya', flag: '🇱🇾', code: '+218' },
    '220': { country: 'Gambia', flag: '🇬🇲', code: '+220' },
    '221': { country: 'Senegal', flag: '🇸🇳', code: '+221' },
    '222': { country: 'Mauritania', flag: '🇲🇷', code: '+222' },
    '223': { country: 'Mali', flag: '🇲🇱', code: '+223' },
    '224': { country: 'Guinea', flag: '🇬🇳', code: '+224' },
    '225': { country: 'Pantai Gading', flag: '🇨🇮', code: '+225' },
    '226': { country: 'Burkina Faso', flag: '🇧🇫', code: '+226' },
    '227': { country: 'Niger', flag: '🇳🇪', code: '+227' },
    '228': { country: 'Togo', flag: '🇹🇬', code: '+228' },
    '229': { country: 'Benin', flag: '🇧🇯', code: '+229' },
    '230': { country: 'Mauritius', flag: '🇲🇺', code: '+230' },
    '231': { country: 'Liberia', flag: '🇱🇷', code: '+231' },
    '232': { country: 'Sierra Leone', flag: '🇸🇱', code: '+232' },
    '233': { country: 'Ghana', flag: '🇬🇭', code: '+233' },
    '234': { country: 'Nigeria', flag: '🇳🇬', code: '+234' },
    '235': { country: 'Chad', flag: '🇹🇩', code: '+235' },
    '236': { country: 'Afrika Tengah', flag: '🇨🇫', code: '+236' },
    '237': { country: 'Kamerun', flag: '🇨🇲', code: '+237' },
    '238': { country: 'Tanjung Verde', flag: '🇨🇻', code: '+238' },
    '239': { country: 'Sao Tome', flag: '🇸🇹', code: '+239' },
    '240': { country: 'Guinea Khatulistiwa', flag: '🇬🇶', code: '+240' },
    '241': { country: 'Gabon', flag: '🇬🇦', code: '+241' },
    '242': { country: 'Kongo', flag: '🇨🇬', code: '+242' },
    '243': { country: 'Kongo (DRC)', flag: '🇨🇩', code: '+243' },
    '244': { country: 'Angola', flag: '🇦🇴', code: '+244' },
    '245': { country: 'Guinea-Bissau', flag: '🇬🇼', code: '+245' },
    '246': { country: 'Diego Garcia', flag: '🇮🇴', code: '+246' },
    '247': { country: 'Ascension', flag: '🇦🇨', code: '+247' },
    '248': { country: 'Seychelles', flag: '🇸🇨', code: '+248' },
    '249': { country: 'Sudan', flag: '🇸🇩', code: '+249' },
    '250': { country: 'Rwanda', flag: '🇷🇼', code: '+250' },
    '251': { country: 'Ethiopia', flag: '🇪🇹', code: '+251' },
    '252': { country: 'Somalia', flag: '🇸🇴', code: '+252' },
    '253': { country: 'Djibouti', flag: '🇩🇯', code: '+253' },
    '254': { country: 'Kenya', flag: '🇰🇪', code: '+254' },
    '255': { country: 'Tanzania', flag: '🇹🇿', code: '+255' },
    '256': { country: 'Uganda', flag: '🇺🇬', code: '+256' },
    '257': { country: 'Burundi', flag: '🇧🇮', code: '+257' },
    '258': { country: 'Mozambik', flag: '🇲🇿', code: '+258' },
    '260': { country: 'Zambia', flag: '🇿🇲', code: '+260' },
    '261': { country: 'Madagaskar', flag: '🇲🇬', code: '+261' },
    '262': { country: 'Reunion', flag: '🇷🇪', code: '+262' },
    '263': { country: 'Zimbabwe', flag: '🇿🇼', code: '+263' },
    '264': { country: 'Namibia', flag: '🇳🇦', code: '+264' },
    '265': { country: 'Malawi', flag: '🇲🇼', code: '+265' },
    '266': { country: 'Lesotho', flag: '🇱🇸', code: '+266' },
    '267': { country: 'Botswana', flag: '🇧🇼', code: '+267' },
    '268': { country: 'Eswatini', flag: '🇸🇿', code: '+268' },
    '269': { country: 'Komoro', flag: '🇰🇲', code: '+269' },
    '290': { country: 'Saint Helena', flag: '🇸🇭', code: '+290' },
    '291': { country: 'Eritrea', flag: '🇪🇷', code: '+291' },
    '297': { country: 'Aruba', flag: '🇦🇼', code: '+297' },
    '298': { country: 'Kepulauan Faroe', flag: '🇫🇴', code: '+298' },
    '299': { country: 'Greenland', flag: '🇬🇱', code: '+299' },
    '350': { country: 'Gibraltar', flag: '🇬🇮', code: '+350' },
    '351': { country: 'Portugal', flag: '🇵🇹', code: '+351' },
    '352': { country: 'Luksemburg', flag: '🇱🇺', code: '+352' },
    '353': { country: 'Irlandia', flag: '🇮🇪', code: '+353' },
    '354': { country: 'Islandia', flag: '🇮🇸', code: '+354' },
    '355': { country: 'Albania', flag: '🇦🇱', code: '+355' },
    '356': { country: 'Malta', flag: '🇲🇹', code: '+356' },
    '357': { country: 'Siprus', flag: '🇨🇾', code: '+357' },
    '358': { country: 'Finlandia', flag: '🇫🇮', code: '+358' },
    '359': { country: 'Bulgaria', flag: '🇧🇬', code: '+359' },
    '370': { country: 'Lithuania', flag: '🇱🇹', code: '+370' },
    '371': { country: 'Latvia', flag: '🇱🇻', code: '+371' },
    '372': { country: 'Estonia', flag: '🇪🇪', code: '+372' },
    '373': { country: 'Moldova', flag: '🇲🇩', code: '+373' },
    '374': { country: 'Armenia', flag: '🇦🇲', code: '+374' },
    '375': { country: 'Belarus', flag: '🇧🇾', code: '+375' },
    '376': { country: 'Andorra', flag: '🇦🇩', code: '+376' },
    '377': { country: 'Monako', flag: '🇲🇨', code: '+377' },
    '378': { country: 'San Marino', flag: '🇸🇲', code: '+378' },
    '380': { country: 'Ukraina', flag: '🇺🇦', code: '+380' },
    '381': { country: 'Serbia', flag: '🇷🇸', code: '+381' },
    '382': { country: 'Montenegro', flag: '🇲🇪', code: '+382' },
    '383': { country: 'Kosovo', flag: '🇽🇰', code: '+383' },
    '385': { country: 'Kroasia', flag: '🇭🇷', code: '+385' },
    '386': { country: 'Slovenia', flag: '🇸🇮', code: '+386' },
    '387': { country: 'Bosnia Herzegovina', flag: '🇧🇦', code: '+387' },
    '389': { country: 'Makedonia Utara', flag: '🇲🇰', code: '+389' },
    '420': { country: 'Ceko', flag: '🇨🇿', code: '+420' },
    '421': { country: 'Slovakia', flag: '🇸🇰', code: '+421' },
    '423': { country: 'Liechtenstein', flag: '🇱🇮', code: '+423' },
    '500': { country: 'Kepulauan Falkland', flag: '🇫🇰', code: '+500' },
    '501': { country: 'Belize', flag: '🇧🇿', code: '+501' },
    '502': { country: 'Guatemala', flag: '🇬🇹', code: '+502' },
    '503': { country: 'El Salvador', flag: '🇸🇻', code: '+503' },
    '504': { country: 'Honduras', flag: '🇭🇳', code: '+504' },
    '505': { country: 'Nikaragua', flag: '🇳🇮', code: '+505' },
    '506': { country: 'Kosta Rika', flag: '🇨🇷', code: '+506' },
    '507': { country: 'Panama', flag: '🇵🇦', code: '+507' },
    '508': { country: 'Saint Pierre', flag: '🇵🇲', code: '+508' },
    '509': { country: 'Haiti', flag: '🇭🇹', code: '+509' },
    '590': { country: 'Guadeloupe', flag: '🇬🇵', code: '+590' },
    '591': { country: 'Bolivia', flag: '🇧🇴', code: '+591' },
    '592': { country: 'Guyana', flag: '🇬🇾', code: '+592' },
    '593': { country: 'Ekuador', flag: '🇪🇨', code: '+593' },
    '594': { country: 'Guyana Perancis', flag: '🇬🇫', code: '+594' },
    '595': { country: 'Paraguay', flag: '🇵🇾', code: '+595' },
    '596': { country: 'Martinique', flag: '🇲🇶', code: '+596' },
    '597': { country: 'Suriname', flag: '🇸🇷', code: '+597' },
    '598': { country: 'Uruguay', flag: '🇺🇾', code: '+598' },
    '599': { country: 'Curacao', flag: '🇨🇼', code: '+599' },
    '670': { country: 'Timor Leste', flag: '🇹🇱', code: '+670' },
    '672': { country: 'Pulau Norfolk', flag: '🇳🇫', code: '+672' },
    '673': { country: 'Brunei', flag: '🇧🇳', code: '+673' },
    '674': { country: 'Nauru', flag: '🇳🇷', code: '+674' },
    '675': { country: 'Papua Nugini', flag: '🇵🇬', code: '+675' },
    '676': { country: 'Tonga', flag: '🇹🇴', code: '+676' },
    '677': { country: 'Kepulauan Solomon', flag: '🇸🇧', code: '+677' },
    '678': { country: 'Vanuatu', flag: '🇻🇺', code: '+678' },
    '679': { country: 'Fiji', flag: '🇫🇯', code: '+679' },
    '680': { country: 'Palau', flag: '🇵🇼', code: '+680' },
    '681': { country: 'Wallis Futuna', flag: '🇼🇫', code: '+681' },
    '682': { country: 'Kepulauan Cook', flag: '🇨🇰', code: '+682' },
    '683': { country: 'Niue', flag: '🇳🇺', code: '+683' },
    '685': { country: 'Samoa', flag: '🇼🇸', code: '+685' },
    '686': { country: 'Kiribati', flag: '🇰🇮', code: '+686' },
    '687': { country: 'Kaledonia Baru', flag: '🇳🇨', code: '+687' },
    '688': { country: 'Tuvalu', flag: '🇹🇻', code: '+688' },
    '689': { country: 'Polinesia Perancis', flag: '🇵🇫', code: '+689' },
    '690': { country: 'Tokelau', flag: '🇹🇰', code: '+690' },
    '691': { country: 'Mikronesia', flag: '🇫🇲', code: '+691' },
    '692': { country: 'Kepulauan Marshall', flag: '🇲🇭', code: '+692' },
    '850': { country: 'Korea Utara', flag: '🇰🇵', code: '+850' },
    '852': { country: 'Hong Kong', flag: '🇭🇰', code: '+852' },
    '853': { country: 'Makau', flag: '🇲🇴', code: '+853' },
    '855': { country: 'Kamboja', flag: '🇰🇭', code: '+855' },
    '856': { country: 'Laos', flag: '🇱🇦', code: '+856' },
    '880': { country: 'Bangladesh', flag: '🇧🇩', code: '+880' },
    '886': { country: 'Taiwan', flag: '🇹🇼', code: '+886' },
    '960': { country: 'Maladewa', flag: '🇲🇻', code: '+960' },
    '961': { country: 'Lebanon', flag: '🇱🇧', code: '+961' },
    '962': { country: 'Yordania', flag: '🇯🇴', code: '+962' },
    '963': { country: 'Suriah', flag: '🇸🇾', code: '+963' },
    '964': { country: 'Irak', flag: '🇮🇶', code: '+964' },
    '965': { country: 'Kuwait', flag: '🇰🇼', code: '+965' },
    '966': { country: 'Arab Saudi', flag: '🇸🇦', code: '+966' },
    '967': { country: 'Yaman', flag: '🇾🇪', code: '+967' },
    '968': { country: 'Oman', flag: '🇴🇲', code: '+968' },
    '970': { country: 'Palestina', flag: '🇵🇸', code: '+970' },
    '971': { country: 'Uni Emirat Arab', flag: '🇦🇪', code: '+971' },
    '972': { country: 'Israel', flag: '🇮🇱', code: '+972' },
    '973': { country: 'Bahrain', flag: '🇧🇭', code: '+973' },
    '974': { country: 'Qatar', flag: '🇶🇦', code: '+974' },
    '975': { country: 'Bhutan', flag: '🇧🇹', code: '+975' },
    '976': { country: 'Mongolia', flag: '🇲🇳', code: '+976' },
    '977': { country: 'Nepal', flag: '🇳🇵', code: '+977' },
    '992': { country: 'Tajikistan', flag: '🇹🇯', code: '+992' },
    '993': { country: 'Turkmenistan', flag: '🇹🇲', code: '+993' },
    '994': { country: 'Azerbaijan', flag: '🇦🇿', code: '+994' },
    '995': { country: 'Georgia', flag: '🇬🇪', code: '+995' },
    '996': { country: 'Kyrgyzstan', flag: '🇰🇬', code: '+996' },
    '998': { country: 'Uzbekistan', flag: '🇺🇿', code: '+998' },
};

export function getPhoneRegion(phoneNumber) {
    if (!phoneNumber) {
        return { country: 'Tidak Diketahui', flag: '🌍', code: '?' };
    }

    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');

    for (let len = 3; len >= 1; len--) {
        const prefix = cleanNumber.substring(0, len);
        if (countryPhoneCodes[prefix]) {
            return countryPhoneCodes[prefix];
        }
    }

    return { country: 'Tidak Diketahui', flag: '🌍', code: '?' };
}

export function formatPhoneWithRegion(phoneNumber) {
    const region = getPhoneRegion(phoneNumber);
    const cleanNumber = phoneNumber.replace(/[^0-9]/g, '');
    
    return {
        number: cleanNumber,
        formatted: `+${cleanNumber}`,
        region: region.country,
        flag: region.flag,
        countryCode: region.code
    };
}

export default { getPhoneRegion, formatPhoneWithRegion, countryPhoneCodes };
