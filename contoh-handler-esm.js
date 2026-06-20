/**
 * ───────────────────────────────
 *  CONTOH KONVERSI: CJS → ESM
 *  File asli : scrape/media/sticker-cmd.cjs
 *  Versi ESM : contoh-handler-esm.js
 * ───────────────────────────────
 *
 *  PERBEDAAN UTAMA CJS vs ESM:
 *  ┌─────────────────────────────────────────────┐
 *  │ CJS (lama)          │ ESM (baru)            │
 *  │─────────────────────│───────────────────────│
 *  │ 'use strict'        │ (otomatis strict)     │
 *  │ require('modul')    │ import x from 'modul' │
 *  │ module.exports = {} │ export default / name │
 *  │ const x = require() │ import { x } from ... │
 *  │ TIDAK bisa top-lvl  │ BISA top-level await  │
 *  │ await               │                       │
 *  └─────────────────────────────────────────────┘
 *
 *  CARA PAKAI DI message.js (jika sudah full ESM):
 *  import { handleSticker } from './scrape/media/sticker-cmd.js'
 *  ...
 *  case 'sticker':
 *  case 's':
 *      await handleSticker({ hisoka, m, query, ... })
 *      break
 * ───────────────────────────────
 */

// ✅ ESM: import statis di atas file (bukan require di dalam fungsi)
import path from 'path'
import fs from 'fs'                          // fs sync untuk writeFileSync/readFileSync
import { promisify } from 'util'
import { exec } from 'child_process'
import os from 'os'

// ✅ ESM: import library langsung, tidak perlu dynamic import
import { Sticker, StickerTypes } from 'wa-sticker-formatter'

// ✅ TOP-LEVEL AWAIT: hanya bisa di ESM! Di CJS ini akan error.
// Contoh: load config default saat file pertama kali diimport
// const defaultConfig = await fs.promises.readFile('./config.json', 'utf-8').then(JSON.parse)
// (dikomentari karena loadConfig sudah dihandle terpisah di project ini)

const execAsync = promisify(exec)

// ───────────────────────────────
//  HANDLER UTAMA
// ───────────────────────────────
async function handleSticker({
    hisoka,
    m,
    query,
    tolak,
    logCommand,
    loadConfig,
    saveConfig,
    getMediaTypeFromMessage,
    downloadMediaBuffer,
    getQuotedMediaBuffer,
    unwrapMessagePayload,
}) {
    try {
        const config = loadConfig()
        const stickerConfig = config.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' }
        const args = query ? query.split(' ') : []

        // Ubah pack/author
        if (args[0] === 'author' || args[0] === 'pack') {
            const type = args[0]
            let value = args.slice(1).join(' ').trim()
            if (!value) {
                await tolak(hisoka, m, `❌ Masukkan nama ${type}!\n\nContoh: .s ${type} ${type === 'author' ? 'Wily' : 'Bot Pack'}`)
                return
            }
            if (value.length > 50) value = value.substring(0, 50)
            const freshConfig = loadConfig()
            if (!freshConfig.sticker) freshConfig.sticker = { pack: 'WhatsApp Bot', author: 'Wilykun' }
            freshConfig.sticker[type] = value
            saveConfig(freshConfig)
            await tolak(hisoka, m, `✅ Sticker ${type} berhasil diubah menjadi: *${value}*`)
            logCommand(m, hisoka, `sticker-set-${type}`)
            return
        }

        const stickerCurrentType = getMediaTypeFromMessage(m)
        const stickerQuotedType  = m.isQuoted ? getMediaTypeFromMessage(m.quoted) : ''
        const canUseCurrentMedia = m.isMedia && (stickerCurrentType === 'imageMessage' || stickerCurrentType === 'videoMessage')
        const canUseQuotedMedia  = m.isQuoted && (stickerQuotedType === 'imageMessage' || stickerQuotedType === 'videoMessage')

        // Tidak ada media → tampilkan info
        if (!canUseCurrentMedia && !canUseQuotedMedia) {
            if (query) return
            const freshConfig = loadConfig()
            const sc  = freshConfig.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' }
            const pfx = m.prefix || '.'
            let text  = `╭═══『 🎭 *STICKER MAKER* 』═══╮\n│\n`
            text += `│ 📦 *Pack   :* ${sc.pack}\n`
            text += `│ ✍️ *Author :* ${sc.author}\n`
            text += `│\n`
            text += `│ 📋 *Cara Pakai:*\n`
            text += `│ • Kirim/reply 🖼️ *gambar* + ${pfx}s\n`
            text += `│ • Kirim/reply 🎥 *video* + ${pfx}s\n`
            text += `│   _(video otomatis jadi animated sticker)_\n`
            text += `│\n`
            text += `│ ⚙️ *Pengaturan:*\n`
            text += `│ • ${pfx}s author <nama>\n`
            text += `│ • ${pfx}s pack <nama>\n`
            text += `│\n`
            text += `│ 🏷️ *Alias:* ${pfx}s · ${pfx}stiker · ${pfx}sticker\n`
            text += `╰══════════════════════╯`
            await tolak(hisoka, m, text)
            return
        }

        await hisoka.sendMessage(m.from, { react: { text: '⏳', key: m.key } })

        let mediaBuffer
        let mediaType
        let videoDuration = 0

        if (canUseCurrentMedia) {
            mediaBuffer   = await downloadMediaBuffer(hisoka, m)
            mediaType     = stickerCurrentType
            if (stickerCurrentType === 'videoMessage') {
                videoDuration = m.message?.videoMessage?.seconds ||
                    m.content?.seconds ||
                    unwrapMessagePayload(m)?.videoMessage?.seconds || 0
            }
        } else {
            mediaBuffer   = await getQuotedMediaBuffer(hisoka, m)
            mediaType     = stickerQuotedType
            if (stickerQuotedType === 'videoMessage') {
                videoDuration = m.quoted?.message?.videoMessage?.seconds ||
                    m.quoted?.content?.seconds ||
                    unwrapMessagePayload(m.quoted)?.videoMessage?.seconds || 0
            }
        }

        if (mediaType === 'videoMessage' && videoDuration > 10) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } })
            await tolak(hisoka, m, `❌ Video terlalu panjang! (${videoDuration} detik)\nMaksimal *10 detik* untuk sticker animasi.`)
            return
        }

        if (!mediaBuffer || mediaBuffer.length === 0) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } })
            await tolak(hisoka, m, '❌ Gagal download media, coba lagi')
            return
        }

        const freshConfig = loadConfig()
        const freshSC     = freshConfig.sticker || { pack: 'WhatsApp Bot', author: 'Wilykun' }
        let stickerBuffer

        if (mediaType === 'videoMessage') {
            // ✅ ESM: execAsync sudah di-import di atas, tidak perlu require di dalam fungsi
            const tmpDir = os.tmpdir()
            const tmpIn  = path.join(tmpDir, `stk_in_${Date.now()}.mp4`)
            const tmpOut = path.join(tmpDir, `stk_out_${Date.now()}.webp`)
            try {
                fs.writeFileSync(tmpIn, mediaBuffer)
                const MAX_STICKER_BYTES = 500 * 1024
                let quality = 80
                let fps     = 15
                let webpBuf

                while (true) {
                    await execAsync(
                        `ffmpeg -y -i "${tmpIn}" ` +
                        `-vf "fps=${fps},scale=512:512:force_original_aspect_ratio=decrease,pad=512:512:(ow-iw)/2:(oh-ih)/2:color=black@0,format=rgba" ` +
                        `-vcodec libwebp_anim -lossless 0 -quality ${quality} -loop 0 -an "${tmpOut}"`,
                        { timeout: 60000 }
                    )
                    webpBuf = fs.readFileSync(tmpOut)
                    if (webpBuf.length <= MAX_STICKER_BYTES) break
                    if (quality > 30) {
                        quality -= 15
                    } else if (fps > 8) {
                        fps     -= 3
                        quality  = 50
                    } else {
                        break
                    }
                }

                stickerBuffer = webpBuf
            } finally {
                try { fs.unlinkSync(tmpIn)  } catch {}
                try { fs.unlinkSync(tmpOut) } catch {}
            }
        } else {
            // ✅ ESM: Sticker sudah diimport statis di atas — tidak perlu dynamic import lagi
            const sticker = new Sticker(mediaBuffer, {
                pack:       freshSC.pack,
                author:     freshSC.author,
                type:       StickerTypes.FULL,
                categories: ['🎭'],
                id:         'com.wilykun.wabot',
                quality:    90,
            })
            stickerBuffer = await sticker.toBuffer()
        }

        if (!stickerBuffer || stickerBuffer.length === 0) {
            await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } })
            await tolak(hisoka, m, '❌ Gagal membuat sticker')
            return
        }

        await hisoka.sendMessage(m.from, { sticker: stickerBuffer }, { quoted: m })
        await hisoka.sendMessage(m.from, { react: { text: '✅', key: m.key } })
        logCommand(m, hisoka, 'sticker')

    } catch (error) {
        console.error('\x1b[31m[Sticker] Error:\x1b[39m', error.message)
        await hisoka.sendMessage(m.from, { react: { text: '❌', key: m.key } })
        await tolak(hisoka, m, `❌ Gagal buat sticker: ${error.message}`)
    }
}

// ───────────────────────────────
//  ESM EXPORT
//  CJS pakai : module.exports = { handleSticker }
//  ESM pakai : export { handleSticker }         ← named export
//           atau export default handleSticker   ← default export
// ───────────────────────────────

// ✅ Named export (bisa export banyak fungsi dari 1 file)
export { handleSticker }

// Jika mau default export juga bisa:
// export default handleSticker
