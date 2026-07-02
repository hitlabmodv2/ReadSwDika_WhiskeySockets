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
 *  memoryMonitor.js — Monitor RAM real-time
 *  Alert & log jika memory melebihi threshold yang dikonfigurasi
 * ───────────────────────────────
 */
import os from 'os';
import fs from 'fs';
import path from 'path';

function loadConfig() {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                if (fs.existsSync(configPath)) {
                        const data = fs.readFileSync(configPath, 'utf-8');
                        return JSON.parse(data);
                }
        } catch (err) {
                console.warn('\x1b[33mWarning: Failed to load config.json, using defaults.\x1b[39m');
        }
        return null;
}

function saveConfig(config) {
        try {
                const configPath = path.join(process.cwd(), 'config.json');
                fs.writeFileSync(configPath, JSON.stringify(config, null, 2), 'utf-8');
                return true;
        } catch (err) {
                console.warn('\x1b[33mWarning: Failed to save config.json.\x1b[39m');
                return false;
        }
}

function formatBytes(bytes) {
        if (bytes >= 1024 * 1024 * 1024) {
                return (bytes / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
        } else if (bytes >= 1024 * 1024) {
                return (bytes / (1024 * 1024)).toFixed(2) + ' MB';
        } else if (bytes >= 1024) {
                return (bytes / 1024).toFixed(2) + ' KB';
        }
        return bytes + ' Bytes';
}

function getCurrentMemoryUsage() {
        const memUsage = process.memoryUsage();
        return {
                rss: memUsage.rss,
                heapTotal: memUsage.heapTotal,
                heapUsed: memUsage.heapUsed,
                external: memUsage.external,
                arrayBuffers: memUsage.arrayBuffers || 0
        };
}

function getSystemMemoryInfo() {
        return {
                total: os.totalmem(),
                free: os.freemem(),
                used: os.totalmem() - os.freemem()
        };
}

function formatUptime(ms) {
        const totalSec = Math.floor(ms / 1000);
        const days = Math.floor(totalSec / 86400);
        const hours = Math.floor((totalSec % 86400) / 3600);
        const minutes = Math.floor((totalSec % 3600) / 60);
        const seconds = totalSec % 60;
        const parts = [];
        if (days > 0) parts.push(`${days}h`);
        if (hours > 0) parts.push(`${hours}j`);
        if (minutes > 0) parts.push(`${minutes}m`);
        parts.push(`${seconds}d`);
        return parts.join(' ');
}

export class MemoryMonitor {
        constructor(options = {}) {
                const config = loadConfig();
                const memConfig = config?.memoryMonitor || {};

                this.enabled = memConfig.enabled !== false;
                this.checkInterval = memConfig.checkIntervalMs || 30000;
                this.logUsage = memConfig.logUsage !== false;
                this.autoDetect = memConfig.autoDetectLimit !== false;
                this.autoDetectPercentage = memConfig.autoDetectPercentage || 80;

                if (this.autoDetect) {
                        const systemTotal = os.totalmem();
                        this.memoryLimit = Math.floor(systemTotal * (this.autoDetectPercentage / 100));
                } else {
                        this.memoryLimit = (memConfig.limitMB || 500) * 1024 * 1024;
                }

                this.onLimitReached = options.onLimitReached || (() => process.exit(1));
                this.intervalId = null;
                this.isShuttingDown = false;
                this.config = config;
                this.logIntervalMs = memConfig.logIntervalMs || 300000;
                this._checkCount = 0;
                this._lastUsage = null;
                this._startTime = Date.now();
        }

        start() {
                if (!this.enabled) {
                        console.log('\x1b[33m[Memory Monitor] Disabled in config.json\x1b[39m');
                        return;
                }

                const systemMem = getSystemMemoryInfo();
                const limitLabel = this.autoDetect ? `Auto ${this.autoDetectPercentage}%` : 'Manual';
                console.log(
                        `\x1b[32m→ Memory   :\x1b[39m ${formatBytes(this.memoryLimit)} limit (${limitLabel})`
                );

                this.checkMemory();

                this.intervalId = setInterval(() => {
                        this.checkMemory();
                }, this.checkInterval);
        }

        stop() {
                if (this.intervalId) {
                        clearInterval(this.intervalId);
                        this.intervalId = null;
                }
        }

        checkMemory() {
                if (this.isShuttingDown) return;

                const memUsage = getCurrentMemoryUsage();
                const systemMem = getSystemMemoryInfo();
                const currentUsage = memUsage.rss;
                const percentage = ((currentUsage / this.memoryLimit) * 100).toFixed(1);
                const sysPercentage = ((systemMem.used / systemMem.total) * 100).toFixed(1);

                this._checkCount++;
                const logEveryN = Math.max(1, Math.round(this.logIntervalMs / this.checkInterval));
                const shouldLog = this.logUsage && (this._checkCount === 1 || this._checkCount % logEveryN === 0);

                if (shouldLog) {
                        const pct = parseFloat(percentage);
                        let color = '\x1b[32m';
                        let icon = '✅';
                        let status = 'Normal';
                        if (pct >= 80) { color = '\x1b[31m'; icon = '🔴'; status = 'Kritis!'; }
                        else if (pct >= 60) { color = '\x1b[33m'; icon = '⚠️ '; status = 'Waspada'; }

                        const sysPct = parseFloat(sysPercentage);
                        const sysColor = sysPct >= 90 ? '\x1b[31m' : sysPct >= 70 ? '\x1b[33m' : '\x1b[32m';

                        const heapMB     = (memUsage.heapUsed   / (1024 * 1024)).toFixed(1);
                        const heapTotMB  = (memUsage.heapTotal  / (1024 * 1024)).toFixed(1);
                        const extMB      = (memUsage.external   / (1024 * 1024)).toFixed(1);
                        const limitGB    = (this.memoryLimit     / (1024 * 1024 * 1024)).toFixed(2);
                        const sysFreeGB  = (systemMem.free       / (1024 * 1024 * 1024)).toFixed(2);
                        const sysGB      = (systemMem.used       / (1024 * 1024 * 1024)).toFixed(2);
                        const sysTGB     = (systemMem.total      / (1024 * 1024 * 1024)).toFixed(2);

                        const loadAvg = os.loadavg().map((n) => n.toFixed(2)).join(', ');
                        const cpuCount = os.cpus()?.length || 0;
                        const uptime = formatUptime(Date.now() - this._startTime);

                        let trendIcon = '→';
                        if (this._lastUsage !== null) {
                                if (currentUsage > this._lastUsage) trendIcon = '↑';
                                else if (currentUsage < this._lastUsage) trendIcon = '↓';
                        }
                        this._lastUsage = currentUsage;

                        const R  = '\x1b[0m';
                        const B  = '\x1b[1m';
                        const CY = '\x1b[96m';   // cyan terang
                        const WH = '\x1b[97m';   // putih terang
                        const YL = '\x1b[93m';   // kuning terang
                        const DM = '\x1b[37m';   // abu muda (bukan gelap)

                        // Bar RAM bot & sys (10 blok)
                        const barFill = Math.round((pct / 100) * 10);
                        const bar     = `${color}${'█'.repeat(barFill)}${'░'.repeat(10 - barFill)}${R}`;
                        const sysFill = Math.round((sysPct / 100) * 10);
                        const sysBar  = `${sysColor}${'█'.repeat(sysFill)}${'░'.repeat(10 - sysFill)}${R}`;

                        // Padding nilai agar kolom rata
                        const pctStr    = `${percentage}%`.padStart(6);
                        const sysPctStr = `${sysPercentage}%`.padStart(6);
                        const botVal    = `${formatBytes(currentUsage)} / ${limitGB} GB`;
                        const sysVal    = `${sysGB} GB / ${sysTGB} GB  free ${sysFreeGB} GB`;

                        console.log(`${B}${color}[MemoryMonitor] ${icon} ${status}${R}  ${DM}cek ke-${this._checkCount} | uptime ${uptime}${R}`);
                        console.log(`  ${B}${CY}BOT ${R}  ${bar} ${B}${color}${pctStr}${R}  ${WH}${botVal} ${trendIcon}${R}`);
                        console.log(`  ${B}${CY}SYS ${R}  ${sysBar} ${B}${sysColor}${sysPctStr}${R}  ${WH}${sysVal}${R}`);
                        console.log(`  ${B}${YL}Heap${R}  ${WH}${heapMB} / ${heapTotMB} MB${R}`);
                        console.log(`  ${B}${YL}Ext ${R}  ${WH}${extMB} MB${R}`);
                        console.log(`  ${B}${YL}CPU ${R}  ${WH}${loadAvg}  ${DM}(${cpuCount} core)${R}`);
                        console.log(`  ${B}${YL}PID ${R}  ${WH}${process.pid}  ${DM}Node ${process.version}${R}`);
                }

                if (currentUsage >= this.memoryLimit) {
                        this.isShuttingDown = true;
                        this.stop();

                        const red = '\x1b[31m';
                        const yellow = '\x1b[33m';
                        const cyan = '\x1b[36m';
                        const reset = '\x1b[0m';

                        console.log('');
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log(`${red}   MEMORY LIMIT REACHED - AUTO RESTART${reset}`);
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log(`${yellow}Current Usage: ${formatBytes(currentUsage)}${reset}`);
                        console.log(`${yellow}Limit: ${formatBytes(this.memoryLimit)}${reset}`);
                        console.log(`${cyan}Restarting bot in 2 seconds...${reset}`);
                        console.log(`${red}════════════════════════════════════════${reset}`);
                        console.log('');

                        setTimeout(() => {
                                this.onLimitReached();
                        }, 2000);
                }
        }

        getStatus() {
                const memUsage = getCurrentMemoryUsage();
                const systemMem = getSystemMemoryInfo();

                return {
                        enabled: this.enabled,
                        autoDetect: this.autoDetect,
                        autoDetectPercentage: this.autoDetectPercentage,
                        limit: this.memoryLimit,
                        limitFormatted: formatBytes(this.memoryLimit),
                        current: memUsage.rss,
                        currentFormatted: formatBytes(memUsage.rss),
                        percentage: ((memUsage.rss / this.memoryLimit) * 100).toFixed(1),
                        checkInterval: this.checkInterval,
                        logUsage: this.logUsage,
                        heap: {
                                total: memUsage.heapTotal,
                                used: memUsage.heapUsed,
                                totalFormatted: formatBytes(memUsage.heapTotal),
                                usedFormatted: formatBytes(memUsage.heapUsed)
                        },
                        system: {
                                total: systemMem.total,
                                free: systemMem.free,
                                used: systemMem.used,
                                totalFormatted: formatBytes(systemMem.total),
                                freeFormatted: formatBytes(systemMem.free),
                                usedFormatted: formatBytes(systemMem.used)
                        }
                };
        }
}

export { loadConfig, saveConfig, formatBytes, getCurrentMemoryUsage, getSystemMemoryInfo, formatUptime };
