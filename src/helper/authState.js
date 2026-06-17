import { Mutex } from 'async-mutex'
import { mkdir, readFile, readdir, stat, unlink, writeFile } from 'fs/promises'
import { join, dirname } from 'path'
import { proto } from '@whiskeysockets/baileys'
import { initAuthCreds } from '@whiskeysockets/baileys/lib/Utils/auth-utils.js'
import { BufferJSON } from '@whiskeysockets/baileys/lib/Utils/generics.js'

// Semua tipe key → satu file JSON per tipe (in-memory + disk)
const CONSOLIDATED_TYPES = new Set([
        'lid-mapping',
        'device-list',
        'identity-key',
        'pre-key',
        'sender-key',
        'session',
        'tctoken',
        'app-state-sync-key',
        'app-state-sync-version',
])

// sender-key-memory: in-memory saja, tidak pernah ditulis ke disk
const MEMORY_ONLY_TYPES = new Set(['sender-key-memory'])

export async function useConsolidatedAuthState(folder) {
        const folderInfo = await stat(folder).catch(() => null)
        if (!folderInfo) {
                await mkdir(folder, { recursive: true })
        } else if (!folderInfo.isDirectory()) {
                throw new Error(`[AuthState] Bukan directory: ${folder}`)
        }

        const fixFileName = (file) => file?.replace(/\//g, '__')?.replace(/:/g, '-')

        // Mutex per consolidated file
        const consolidatedLocks = new Map()
        const getConsolidatedLock = (type) => {
                let m = consolidatedLocks.get(type)
                if (!m) { m = new Mutex(); consolidatedLocks.set(type, m) }
                return m
        }

        // Mutex per individual file (non-consolidated)
        const fileLocks = new Map()
        const getFileLock = (p) => {
                let m = fileLocks.get(p)
                if (!m) { m = new Mutex(); fileLocks.set(p, m) }
                return m
        }

        // In-memory store untuk tipe konsolidasi
        const consolidatedStore = new Map()
        // In-memory only store (sender-key-memory)
        const memoryOnlyStore = new Map()
        const writeTimers = new Map()

        // Debounced write ke disk (300ms) + log realtime saat entry bertambah
        const scheduleWrite = (type) => {
                if (writeTimers.has(type)) clearTimeout(writeTimers.get(type))
                writeTimers.set(type, setTimeout(async () => {
                        writeTimers.delete(type)
                        const store = consolidatedStore.get(type)
                        if (!store) return
                        const filePath = join(folder, `__consolidated-${type}.json`)
                        const obj = {}
                        for (const [k, v] of store) obj[k] = v
                        const lock = getConsolidatedLock(type)
                        await lock.acquire().then(async (release) => {
                                try {
                                        await writeFile(filePath, JSON.stringify(obj, BufferJSON.replacer))
                                } catch (err) {
                                        console.error(`[AuthState] Gagal tulis consolidated ${type}:`, err.message)
                                } finally { release() }
                        })
                }, 300))
        }

        // Write langsung (non-debounced) — untuk migrasi & creds
        const writeConsolidatedNow = async (type) => {
                const store = consolidatedStore.get(type)
                if (!store) return
                const filePath = join(folder, `__consolidated-${type}.json`)
                const obj = {}
                for (const [k, v] of store) obj[k] = v
                await writeFile(filePath, JSON.stringify(obj, BufferJSON.replacer))
        }

        // Load tiap tipe konsolidasi + migrasi file individual
        for (const type of CONSOLIDATED_TYPES) {
                const store = new Map()
                consolidatedStore.set(type, store)
                const consolidatedPath = join(folder, `__consolidated-${type}.json`)

                // Load consolidated yang sudah ada
                try {
                        const raw = await readFile(consolidatedPath, 'utf-8')
                        const data = JSON.parse(raw, BufferJSON.reviver)
                        for (const [k, v] of Object.entries(data)) store.set(k, v)
                        // log suppressed
                } catch (_) {}

                // Migrasi file individual yang masih tersisa → hapus setelah merge
                try {
                        const prefix = `${type}-`
                        const allFiles = await readdir(folder)
                        const toMigrate = allFiles.filter(f =>
                                f.startsWith(prefix) && f.endsWith('.json') && !f.startsWith('__consolidated')
                        )

                        if (toMigrate.length > 0) {
                                let migrated = 0
                                for (const file of toMigrate) {
                                        const filePath = join(folder, file)
                                        try {
                                                const raw = await readFile(filePath, 'utf-8')
                                                const value = JSON.parse(raw, BufferJSON.reviver)
                                                const id = file.slice(prefix.length, -5)
                                                if (!store.has(id)) store.set(id, value)
                                                await unlink(filePath)
                                                migrated++
                                        } catch (_) {}
                                }
                                if (migrated > 0) {
                                        await writeConsolidatedNow(type)
                                }
                        }
                } catch (err) {
                        console.error(`[AuthState] Migrasi ${type} gagal:`, err.message)
                }
        }

        // Init memory-only stores
        for (const type of MEMORY_ONLY_TYPES) {
                memoryOnlyStore.set(type, new Map())
        }

        // Hapus file sender-key-memory yang mungkin tertinggal di disk dari useMultiFileAuthState lama
        try {
                const allFiles = await readdir(folder)
                const staleMemFiles = allFiles.filter(f => f.startsWith('sender-key-memory-') && f.endsWith('.json'))
                for (const f of staleMemFiles) {
                        await unlink(join(folder, f)).catch(() => {})
                }
        } catch (_) {}

        // Helpers untuk file non-consolidated (hanya creds.json, dll)
        const writeData = async (data, file) => {
                const filePath = join(folder, fixFileName(file))
                const mutex = getFileLock(filePath)
                return mutex.acquire().then(async (release) => {
                        try {
                                await writeFile(filePath, JSON.stringify(data, BufferJSON.replacer))
                        } finally { release() }
                })
        }

        const readData = async (file) => {
                try {
                        const filePath = join(folder, fixFileName(file))
                        const mutex = getFileLock(filePath)
                        return await mutex.acquire().then(async (release) => {
                                try {
                                        const data = await readFile(filePath, { encoding: 'utf-8' })
                                        return JSON.parse(data, BufferJSON.reviver)
                                } finally { release() }
                        })
                } catch { return null }
        }

        const removeData = async (file) => {
                try {
                        const filePath = join(folder, fixFileName(file))
                        const mutex = getFileLock(filePath)
                        return mutex.acquire().then(async (release) => {
                                try { await unlink(filePath) } catch {} finally { release() }
                        })
                } catch {}
        }

        const creds = (await readData('creds.json')) || initAuthCreds()

        return {
                state: {
                        creds,
                        keys: {
                                get: async (type, ids) => {
                                        const data = {}
                                        if (MEMORY_ONLY_TYPES.has(type)) {
                                                const store = memoryOnlyStore.get(type)
                                                for (const id of ids) data[id] = store?.get(id) ?? null
                                        } else if (CONSOLIDATED_TYPES.has(type)) {
                                                const store = consolidatedStore.get(type)
                                                for (const id of ids) {
                                                        let value = store?.get(id) ?? null
                                                        if (type === 'app-state-sync-key' && value) {
                                                                try { value = proto.Message.AppStateSyncKeyData.fromObject(value) } catch (_) {}
                                                        }
                                                        data[id] = value
                                                }
                                        } else {
                                                await Promise.all(ids.map(async (id) => {
                                                        let value = await readData(`${type}-${id}.json`)
                                                        if (type === 'app-state-sync-key' && value) {
                                                                try { value = proto.Message.AppStateSyncKeyData.fromObject(value) } catch (_) {}
                                                        }
                                                        data[id] = value
                                                }))
                                        }
                                        return data
                                },
                                set: async (data) => {
                                        const tasks = []
                                        for (const category in data) {
                                                if (MEMORY_ONLY_TYPES.has(category)) {
                                                        const store = memoryOnlyStore.get(category)
                                                        for (const id in data[category]) {
                                                                const value = data[category][id]
                                                                if (value != null) store.set(id, value)
                                                                else store.delete(id)
                                                        }
                                                } else if (CONSOLIDATED_TYPES.has(category)) {
                                                        const store = consolidatedStore.get(category)
                                                        let changed = false
                                                        for (const id in data[category]) {
                                                                const value = data[category][id]
                                                                if (value != null) store.set(id, value)
                                                                else store.delete(id)
                                                                changed = true
                                                        }
                                                        if (changed) scheduleWrite(category)
                                                } else {
                                                        for (const id in data[category]) {
                                                                const value = data[category][id]
                                                                const file = `${category}-${id}.json`
                                                                tasks.push(value != null ? writeData(value, file) : removeData(file))
                                                        }
                                                }
                                        }
                                        if (tasks.length) await Promise.all(tasks)
                                }
                        }
                },
                saveCreds: async () => writeData(creds, 'creds.json')
        }
}

// ─────────────────────────────────────────────────────────────────
//  InMemorySection — JSONDB-compatible adapter
//  Data disimpan di object in-memory, flush ke file induk via scheduleFlush.
// ─────────────────────────────────────────────────────────────────
class InMemorySection {
        constructor(data, schedule) {
                this._d = data
                this._s = schedule
                this.hasLoaded = true
        }
        loadIfNeeded() {}
        flushSync()       { this._s() }
        exists(key)       { return Object.prototype.hasOwnProperty.call(this._d, key) }
        read(key)         { return this.exists(key) ? this._d[key] : null }
        write(key, v)     { this._d[key] = v; this._s(); return v }
        delete(key)       { delete this._d[key]; this._s() }
        keys()            { return Object.keys(this._d) }
        values()          { return Object.values(this._d) }
        entries()         { return Object.entries(this._d) }
        find(fn)          { return this.values().find(fn) }
}

// ─────────────────────────────────────────────────────────────────
//  Global write-mutex registry — satu mutex per absolute file path.
//  Mencegah race condition antara dua instance useSingleFileAuthState
//  untuk file yang sama (mis. saat __internalRestart): keduanya berbagi
//  mutex yang sama sehingga tidak bisa tulis .tmp bersamaan.
// ─────────────────────────────────────────────────────────────────
const _globalWriteMutexes = new Map()
function _getWriteMutex(absPath) {
        let m = _globalWriteMutexes.get(absPath)
        if (!m) { m = new Mutex(); _globalWriteMutexes.set(absPath, m) }
        return m
}

// ─────────────────────────────────────────────────────────────────
//  useSingleFileAuthState — SATU file JSON untuk segalanya:
//  creds + keys + contacts + groups + settings
//
//  Format: { creds, keys, contacts, groups, settings }
//  filePath: path ke .json  (contoh: sessions/hisoka.json)
//  Return : { state, saveCreds, contacts, groups, settings }
//
//  Migrasi otomatis dari folder lama + hapus folder setelah selesai.
// ─────────────────────────────────────────────────────────────────
export async function useSingleFileAuthState(filePath) {
        await mkdir(dirname(filePath), { recursive: true })

        // Gunakan global mutex agar semua instance untuk path ini berbagi mutex
        const absPath   = filePath.startsWith('/') ? filePath : join(process.cwd(), filePath)
        const writeMutex = _getWriteMutex(absPath)
        let writeTimer = null

        let creds = null
        const keyStore = new Map()
        const memStore = new Map()
        const _contacts = {}
        const _groups   = {}
        const _settings = {}

        for (const type of CONSOLIDATED_TYPES) keyStore.set(type, new Map())
        memStore.set('sender-key-memory', new Map())

        // ── tulis semua ke satu file (atomic: tmp → rename) ──
        async function flushNow() {
                const keysObj = {}
                for (const [type, store] of keyStore) {
                        if (store.size === 0) continue
                        const obj = {}
                        for (const [id, val] of store) obj[id] = val
                        keysObj[type] = obj
                }
                const payload = JSON.stringify({
                        creds,
                        keys:     keysObj,
                        contacts: _contacts,
                        groups:   _groups,
                        settings: _settings,
                }, BufferJSON.replacer)
                const tmpPath = filePath + '.tmp'
                const release = await writeMutex.acquire()
                try {
                        await writeFile(tmpPath, payload)
                        const { rename } = await import('fs/promises')
                        await rename(tmpPath, filePath)
                } catch (err) {
                        console.error(`[SingleFile] Gagal tulis ${filePath}:`, err.message)
                        try { const { unlink } = await import('fs/promises'); await unlink(tmpPath) } catch (_) {}
                } finally {
                        release()
                }
        }

        function scheduleFlush() {
                if (writeTimer) clearTimeout(writeTimer)
                writeTimer = setTimeout(() => { writeTimer = null; flushNow().catch(() => {}) }, 300)
        }

        // ── hapus folder lama ──
        async function deleteFolder(folder) {
                try {
                        const { rm } = await import('fs/promises')
                        await rm(folder, { recursive: true, force: true })
                } catch (_) {}
        }

        // ── load dari file tunggal ──
        async function loadFile() {
                try {
                        const raw = await readFile(filePath, 'utf-8')
                        const data = JSON.parse(raw, BufferJSON.reviver)
                        creds = data.creds || null
                        if (data.keys) {
                                for (const [type, entries] of Object.entries(data.keys)) {
                                        if (!keyStore.has(type)) keyStore.set(type, new Map())
                                        for (const [id, val] of Object.entries(entries)) keyStore.get(type).set(id, val)
                                }
                        }
                        if (data.contacts) Object.assign(_contacts, data.contacts)
                        if (data.groups)   Object.assign(_groups, data.groups)
                        if (data.settings) Object.assign(_settings, data.settings)
                } catch (_) { creds = null }
        }

        // ── migrasi dari folder lama → baca semua lalu hapus folder ──
        async function migrateFolder(folder) {
                try {
                        const raw = await readFile(join(folder, 'creds.json'), 'utf-8')
                        creds = JSON.parse(raw, BufferJSON.reviver)
                } catch (_) {}

                for (const type of CONSOLIDATED_TYPES) {
                        try {
                                const raw = await readFile(join(folder, `__consolidated-${type}.json`), 'utf-8')
                                const entries = JSON.parse(raw, BufferJSON.reviver)
                                const store = keyStore.get(type)
                                for (const [k, v] of Object.entries(entries)) store.set(k, v)
                        } catch (_) {}
                        try {
                                const allFiles = await readdir(folder)
                                for (const file of allFiles) {
                                        if (!file.startsWith(`${type}-`) || !file.endsWith('.json')) continue
                                        const id = file.slice(type.length + 1, -5)
                                        const store = keyStore.get(type)
                                        if (store.has(id)) continue
                                        try {
                                                store.set(id, JSON.parse(await readFile(join(folder, file), 'utf-8'), BufferJSON.reviver))
                                        } catch (_) {}
                                }
                        } catch (_) {}
                }

                for (const [name, target] of [['contacts', _contacts], ['groups', _groups], ['settings', _settings]]) {
                        try {
                                const raw = await readFile(join(folder, `${name}.json`), 'utf-8')
                                Object.assign(target, JSON.parse(raw))
                        } catch (_) {}
                }

                await deleteFolder(folder)
        }

        // ── inisialisasi ──
        let fileExists = false
        try { await readFile(filePath); fileExists = true } catch (_) {}

        const legacyFolder = filePath.replace(/\.json$/, '')

        if (fileExists) {
                await loadFile()
                // hapus folder lama jika masih tersisa
                try {
                        const s = await stat(legacyFolder)
                        if (s.isDirectory()) {
                                await deleteFolder(legacyFolder)
                                console.log(`[SingleFile] 🗑️  Folder lama ${legacyFolder} dihapus`)
                        }
                } catch (_) {}
        } else {
                let folderOk = false
                try { const s = await stat(legacyFolder); folderOk = s.isDirectory() } catch (_) {}
                if (folderOk) {
                        await migrateFolder(legacyFolder)
                        await flushNow()
                        console.log(`[SingleFile] ✅ Migrasi ${legacyFolder} → ${filePath} (folder dihapus)`)
                }
        }

        if (!creds) creds = initAuthCreds()

        const contacts = new InMemorySection(_contacts, scheduleFlush)
        const groups   = new InMemorySection(_groups,   scheduleFlush)
        const settings = new InMemorySection(_settings, scheduleFlush)

        return {
                state: {
                        creds,
                        keys: {
                                get: async (type, ids) => {
                                        const data = {}
                                        if (MEMORY_ONLY_TYPES.has(type)) {
                                                const s = memStore.get(type)
                                                for (const id of ids) data[id] = s?.get(id) ?? null
                                        } else {
                                                const s = keyStore.get(type)
                                                for (const id of ids) {
                                                        let value = s?.get(id) ?? null
                                                        if (type === 'app-state-sync-key' && value) {
                                                                try { value = proto.Message.AppStateSyncKeyData.fromObject(value) } catch (_) {}
                                                        }
                                                        data[id] = value
                                                }
                                        }
                                        return data
                                },
                                set: async (data) => {
                                        let changed = false
                                        for (const category in data) {
                                                if (MEMORY_ONLY_TYPES.has(category)) {
                                                        const s = memStore.get(category)
                                                        for (const id in data[category]) {
                                                                const v = data[category][id]
                                                                if (v != null) s.set(id, v); else s.delete(id)
                                                        }
                                                } else {
                                                        if (!keyStore.has(category)) keyStore.set(category, new Map())
                                                        const s = keyStore.get(category)
                                                        for (const id in data[category]) {
                                                                const v = data[category][id]
                                                                if (v != null) s.set(id, v); else s.delete(id)
                                                                changed = true
                                                        }
                                                }
                                        }
                                        if (changed) scheduleFlush()
                                }
                        }
                },
                saveCreds: (update) => {
                        if (update && typeof update === 'object') Object.assign(creds, update)
                        scheduleFlush()
                },
                stopFlush: () => {
                        if (writeTimer) { clearTimeout(writeTimer); writeTimer = null }
                },
                flushImmediate: () => flushNow(),
                contacts,
                groups,
                settings,

                // ── getSizeReport: baca ukuran live memory (non-destructive) ──
                getSizeReport: () => {
                        const bytesOf  = (obj) => { try { return Buffer.byteLength(JSON.stringify(obj, BufferJSON.replacer)) } catch { return 0 } }
                        const mapToObj = (store) => { const o = {}; for (const [k, v] of store) o[k] = v; return o }
                        const fmtKB    = (b) => (b / 1024).toFixed(1) + ' KB'
                        const fmtMB    = (b) => (b / 1024 / 1024).toFixed(2) + ' MB'

                        const SAFE_DELETE = new Set(['contacts', 'groups', 'lid-mapping', 'sender-key', 'app-state-sync-version', 'tctoken'])
                        const SAFE_TRIM   = new Set(['pre-key'])

                        const rows = []

                        // creds
                        if (creds) rows.push({ key: 'creds', count: Object.keys(creds).length + ' field', bytes: bytesOf(creds), safe: 'KEEP' })

                        // key store entries
                        for (const [type, store] of keyStore) {
                                if (store.size === 0) continue
                                const bytes = bytesOf(mapToObj(store))
                                let safe = 'KEEP'
                                if (SAFE_DELETE.has(type)) safe = 'HAPUS'
                                if (SAFE_TRIM.has(type))   safe = 'TRIM'
                                rows.push({ key: type, count: store.size + ' entri', bytes, safe })
                        }

                        // contacts & groups (top-level, bukan di keyStore)
                        const cntC = Object.keys(_contacts).length
                        if (cntC > 0) rows.push({ key: 'contacts', count: cntC + ' kontak', bytes: bytesOf(_contacts), safe: 'HAPUS' })
                        const cntG = Object.keys(_groups).length
                        if (cntG > 0) rows.push({ key: 'groups',   count: cntG + ' grup',   bytes: bytesOf(_groups),   safe: 'HAPUS' })

                        // settings
                        if (_settings && Object.keys(_settings).length > 0)
                                rows.push({ key: 'settings', count: '1 obj', bytes: bytesOf(_settings), safe: 'KEEP' })

                        // Deduplicate (jaga-jaga jika ada overlap)
                        const seen = new Set()
                        const deduped = rows.filter(r => { if (seen.has(r.key)) return false; seen.add(r.key); return true })

                        // Sort: HAPUS dulu (terbesar), lalu TRIM, lalu KEEP
                        deduped.sort((a, b) => {
                                const order = { 'HAPUS': 0, 'TRIM': 1, 'KEEP': 2 }
                                if (order[a.safe] !== order[b.safe]) return order[a.safe] - order[b.safe]
                                return b.bytes - a.bytes
                        })

                        // Ukuran total dari live memory
                        const keysObj = {}
                        for (const [type, store] of keyStore) {
                                if (store.size === 0) continue
                                const obj = {}; for (const [id, val] of store) obj[id] = val
                                keysObj[type] = obj
                        }
                        const liveRaw  = JSON.stringify({ creds, keys: keysObj, contacts: _contacts, groups: _groups, settings: _settings }, BufferJSON.replacer)
                        const liveSize = Buffer.byteLength(liveRaw)

                        return { rows: deduped, liveSize, fmtFileSize: fmtMB(liveSize), fmtKB, fmtMB }
                },

                // ── clearCacheInPlace: bersihkan cache di memory + flush ke disk ──
                // Ini yang benar — tidak pakai file I/O langsung karena bot punya state di memory.
                // onStep({ steps, totalSaved, beforeSize }) dipanggil setiap langkah selesai.
                clearCacheInPlace: async (onStep) => {
                        const serializeNow = () => {
                                const keysObj = {}
                                for (const [type, store] of keyStore) {
                                        if (store.size === 0) continue
                                        const obj = {}
                                        for (const [id, val] of store) obj[id] = val
                                        keysObj[type] = obj
                                }
                                return JSON.stringify({ creds, keys: keysObj, contacts: _contacts, groups: _groups, settings: _settings }, BufferJSON.replacer)
                        }

                        const beforeRaw  = serializeNow()
                        const beforeSize = Buffer.byteLength(beforeRaw)

                        const steps = []
                        let totalSaved = 0

                        const doStep = async (name, label, savedBytes) => {
                                steps.push({ name, label, savedBytes: Math.max(0, savedBytes) })
                                totalSaved += Math.max(0, savedBytes)
                                if (onStep) { try { await onStep({ steps, totalSaved, beforeSize }) } catch (_) {} }
                        }

                        const bytesOf = (obj) => { try { return Buffer.byteLength(JSON.stringify(obj, BufferJSON.replacer)) } catch { return 0 } }
                        const mapToObj = (store) => { const o = {}; for (const [k, v] of store) o[k] = v; return o }

                        // 1. contacts
                        const cntC = Object.keys(_contacts).length
                        const bytC = bytesOf(_contacts)
                        for (const k in _contacts) delete _contacts[k]
                        await doStep('contacts', `${cntC} kontak`, bytC)

                        // 2. groups
                        const cntG = Object.keys(_groups).length
                        const bytG = bytesOf(_groups)
                        for (const k in _groups) delete _groups[k]
                        await doStep('groups', `${cntG} grup`, bytG)

                        // 3-6. key types yang aman dihapus
                        for (const type of ['lid-mapping', 'sender-key', 'app-state-sync-version', 'tctoken']) {
                                const store = keyStore.get(type)
                                if (!store || store.size === 0) continue
                                const cnt  = store.size
                                const byt  = bytesOf(mapToObj(store))
                                store.clear()
                                await doStep(type, `${cnt} entri`, byt)
                        }

                        // 7. pre-key — trim, sisakan 100 id terbesar
                        const preStore = keyStore.get('pre-key')
                        if (preStore && preStore.size > 0) {
                                const ids     = [...preStore.keys()].map(Number).sort((a, b) => a - b)
                                const KEEP    = 100
                                const keepSet = new Set(ids.slice(Math.max(0, ids.length - KEEP)).map(String))
                                const removed = ids.length - keepSet.size
                                const bytBefore = bytesOf(mapToObj(preStore))
                                for (const id of [...preStore.keys()]) { if (!keepSet.has(id)) preStore.delete(id) }
                                const saved = bytBefore - bytesOf(mapToObj(preStore))
                                await doStep('pre-key (trim)', `hapus ${removed} lama, sisakan ${keepSet.size}`, saved)
                        }

                        // Flush ke disk sekarang
                        await flushNow()

                        const afterRaw  = serializeNow()
                        const afterSize = Buffer.byteLength(afterRaw)
                        const fmtMB     = (b) => (b / 1024 / 1024).toFixed(2) + ' MB'

                        return { steps, beforeSize, afterSize, savedBytes: beforeSize - afterSize, fmtBefore: fmtMB(beforeSize), fmtAfter: fmtMB(afterSize), fmtSaved: fmtMB(beforeSize - afterSize) }
                },
        }
}
