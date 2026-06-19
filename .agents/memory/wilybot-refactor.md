---
name: WilyBot V22 message.js refactor
description: Pattern dan status refactor case blocks dari message.js ke file handler .cjs terpisah
---

## Pattern

- Handler files di `src/scrape/tools/`, `src/scrape/anime/`, `src/scrape/music/`
- Setiap handler adalah `module.exports = { handleXxx }` dengan params eksplisit
- Ganti case di message.js jadi 3-5 baris: require → await handler → break
- Gunakan Python line-based script untuk replace (cari case index, slice lines array)
- JANGAN beri nama file handler sama dengan scraper existing (misal: pixiv.cjs konflik)

## Key params yang tersedia di message.js scope
`hisoka, m, query, tolak, logCommand, logError, fs, path, loadConfig, saveConfig, _require, isMainBot`

## Status (Juni 2026)
- message.js: 18,671 → ~12,042 baris (35.5% reduksi)
- Handler files dibuat: 21 file handler

## Case yang SKIP (butuh internal deps)
tanya, jadibot, menu, listbot, aimusik, aimusik2, aturbrowser, quoted, infowibu,
sendstatus, tmdel, antitagsw, ghosttag, s, ctele, cekmusik, upbot,
carijudullagu, stopbot, ceksesi, pushkontakgc, alqanimeupdate, autocleaner,
sessioncleaner, ceksetting, cs, eval, bash, all, botadmin, del, infohp,
setgoodbye, toimg, aiedit, emojilist, emojidel, emojiadd, alljidgc, emojicustom,
emojiclear, emojidefault, infogc, tomp3, tovn, cekerror, batalbrowser, forgetme,
myprofile, autolist, pinpesan, stopbot, ceksesi, upbot, sendstatus

**Why:** Semua case di atas menggunakan variabel internal scope (jadibotMap, Button,
downloadMediaMessage, pendingXxx, clearErrors, dll) yang tidak bisa di-pass via params.

## Python replace script pattern
```python
cases = []
for i, line in enumerate(lines):
    m = re.match(r"^\s{24}case '([^']+)':", line)
    if m: cases.append((i, m.group(1)))
# cari start dengan alias via find_case_start_with_aliases()
# ganti lines[real_start:end+1] = replacement
# update offsets untuk targets setelah titik replace
```
