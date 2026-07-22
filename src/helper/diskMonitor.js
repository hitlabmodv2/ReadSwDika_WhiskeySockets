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
 *  diskMonitor.js — Monitor pemakaian disk real-time
 *  Karena container (Pterodactyl/Docker) biasanya punya kuota disk
 *  sendiri yang TIDAK sama dengan disk fisik host, kita tidak bisa
 *  pakai fs.statfs (itu baca disk host, bukan kuota container).
 *  Jadi limit diambil dari config.json (harus disamakan manual sama
 *  kuota yang keliatan di panel Pterodactyl, mis. "10 GiB").
 * ───────────────────────────────
 */
import fs from 'fs';
import path from 'path';
import { exec } from 'child_process';

function loadConfig() {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                if (fs.existsSync(configPath)) {
                        return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
                }
        } catch (err) {
                console.warn('\x1b[33mWarning: Failed to load config.json for diskMonitor.\x1b[39m');
        }
        return null;
}

function formatBytes(bytes) {
        if (bytes >= 1024 * 1024 * 1024) return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        if (bytes >= 1024 * 1024) return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        if (bytes >= 1024) return (bytes / 1024).toFixed(2) + ' KB';
        return bytes + ' Bytes';
}

function getDirSizeBytes(dirPath) {
        return new Promise((resolve) => {
                exec(`du -sb "${dirPath}" 2>/dev/null | cut -f1`, { timeout: 15000 }, (err, stdout) => {
                        if (err) return resolve(null);
                        const size = parseInt(String(stdout).trim(), 10);
                        resolve(Number.isFinite(size) ? size : null);
                });
        });
}

export class DiskMonitor {
        constructor(options = {}) {
                const config = loadConfig();
                const dr = config?.monitor?.DisRam || {};
                const diskConfig = config?.monitor?.disk || config?.diskMonitor || {};

                this.enabled         = (dr.diskEnabled         ?? diskConfig.enabled)         !== false;
                this.checkIntervalMs = dr.diskCheckIntervalMs  ?? diskConfig.checkIntervalMs  ?? 300000;
                this.logIntervalMs   = dr.diskLogIntervalMs    ?? diskConfig.logIntervalMs    ?? 300000;
                this.logUsage        = (dr.diskLogUsage        ?? diskConfig.logUsage)        !== false;
                this.limitMB         = (dr.diskLimitMB         ?? diskConfig.limitMB)         || 10240;
                this.limitBytes      = this.limitMB * 1024 * 1024;
                this.watchPath       = diskConfig.watchPath
                        ? path.resolve(diskConfig.watchPath)
                        : process.cwd();

                this.warnPercentage  = dr.diskWarnPercent ?? diskConfig.warnPercentage ?? 80;
                this.onLimitReached  = options.onLimitReached || (() => {});
                // suppressLog: true → cek jalan tapi tidak print blok sendiri
                // (dipakai saat diintegrasikan ke dalam log SysMonitor)
                this.suppressLog     = options.suppressLog === true;
                this.intervalId      = null;
                this._checkCount     = 0;
                this._logCount       = 0;
                this._warned         = false;
                this._lastStats      = null;  // cache stats terbaru untuk getLastStats()
        }

        // Kembalikan stats disk terbaru (null jika belum pernah cek)
        getLastStats() {
                return this._lastStats;
        }

        start() {
                if (!this.enabled) {
                        return;
                }

                console.log(`\x1b[32m→ Disk     :\x1b[39m ${formatBytes(this.limitBytes)} limit (Manual, ${this.watchPath})`);

                this.checkDisk();
                this.intervalId = setInterval(() => this.checkDisk(), this.checkIntervalMs);
        }

        stop() {
                if (this.intervalId) {
                        clearInterval(this.intervalId);
                        this.intervalId = null;
                }
        }

        async checkDisk() {
                const usedBytes = await getDirSizeBytes(this.watchPath);
                if (usedBytes === null) return;

                const percentage = ((usedBytes / this.limitBytes) * 100).toFixed(1);
                const pct = parseFloat(percentage);

                this._checkCount++;
                const logEveryN = Math.max(1, Math.round(this.logIntervalMs / this.checkIntervalMs));
                const shouldLog = this.logUsage && (this._checkCount === 1 || this._checkCount % logEveryN === 0);

                // Selalu simpan stats terbaru — dipakai oleh getLastStats()
                {
                        let color = '\x1b[32m', icon = '✅', status = 'Normal';
                        if (pct >= this.warnPercentage)        { color = '\x1b[31m'; icon = '🔴'; status = 'Kritis!'; }
                        else if (pct >= this.warnPercentage - 20) { color = '\x1b[33m'; icon = '⚠️ '; status = 'Waspada'; }
                        this._lastStats = { pct, usedBytes, limitBytes: this.limitBytes, percentage, icon, color, status };
                }

                if (shouldLog && !this.suppressLog) {
                        this._logCount++;
                        const { color, icon, status } = this._lastStats;
                        console.log(`\x1b[36m\x1b[1m[DiskMonitor]\x1b[0m ${icon} ${color}\x1b[1m${status}\x1b[0m cek ke-${this._logCount} \x1b[2m|\x1b[0m`);
                        console.log(`\x1b[32m\x1b[1mDISK   \x1b[0m \x1b[2m:\x1b[0m ${color}${percentage}%\x1b[0m ${formatBytes(usedBytes)} \x1b[2m/\x1b[0m ${formatBytes(this.limitBytes)}`);
                }

                if (pct >= this.warnPercentage && !this._warned) {
                        this._warned = true;
                        console.log('');
                        console.log('\x1b[31m════════════════════════════════════════\x1b[0m');
                        console.log('\x1b[31m   DISK USAGE TINGGI - CEK FILE/LOG/SESSION\x1b[0m');
                        console.log('\x1b[31m════════════════════════════════════════\x1b[0m');
                        console.log(`\x1b[33mUsage: ${formatBytes(usedBytes)} / ${formatBytes(this.limitBytes)} (${percentage}%)\x1b[0m`);
                        console.log('\x1b[36mBersihkan folder logs/, tmp/, atau session lama biar ga penuh.\x1b[0m');
                        console.log('\x1b[31m════════════════════════════════════════\x1b[0m');
                        console.log('');
                        this.onLimitReached({ usedBytes, limitBytes: this.limitBytes, percentage: pct });
                } else if (pct < this.warnPercentage - 10) {
                        this._warned = false;
                }
        }

        async getStatus() {
                const usedBytes = await getDirSizeBytes(this.watchPath);
                return {
                        enabled: this.enabled,
                        limitMB: this.limitMB,
                        limitFormatted: formatBytes(this.limitBytes),
                        usedBytes,
                        usedFormatted: usedBytes !== null ? formatBytes(usedBytes) : 'N/A',
                        percentage: usedBytes !== null ? ((usedBytes / this.limitBytes) * 100).toFixed(1) : 'N/A',
                };
        }
}

export { loadConfig, formatBytes, getDirSizeBytes };
