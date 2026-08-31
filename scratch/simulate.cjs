const path = require('path');
const { handleDoujinNotif } = require(path.resolve('./SEMUA_FITUR/anime/doujindesu-monitor.cjs'));

const dummyHisoka = {
    sendMessage: async (jid, content, options) => {
        if (content.react) {
            console.log(`[SIMULASI] Reacting with: ${content.react.text}`);
        }
        if (content.text) {
            console.log(`[SIMULASI] Mengirim teks: ${content.text}`);
        }
        if (content.document) {
            console.log(`[SIMULASI] Mengirim file PDF!`);
            console.log(`- File Path: ${content.document.url}`);
            console.log(`- File Name: ${content.fileName}`);
            console.log(`- Caption:\\n${content.caption}`);
        }
    }
};

const dummyM = {
    from: '123456789@g.us',
    isGroup: true,
    isOwner: true,
    isAdmin: true,
    prefix: '.',
    key: { id: 'dummy_msg' }
};

console.log("=== MEMULAI SIMULASI .doujinnotif test ===");
handleDoujinNotif({ hisoka: dummyHisoka, m: dummyM, txt: 'test' }).then(() => {
    console.log("=== SIMULASI SELESAI ===");
}).catch(e => {
    console.error("Error pada simulasi:", e);
});
