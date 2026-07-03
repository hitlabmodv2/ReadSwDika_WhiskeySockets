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

                        const barLen = 10;
                        const botFilled = Math.round((pct / 100) * barLen);
                        const botBar = '█'.repeat(botFilled) + '░'.repeat(barLen - botFilled);

                        const sysPct = parseFloat(sysPercentage);
                        const sysColor = sysPct >= 90 ? '\x1b[31m' : sysPct >= 70 ? '\x1b[33m' : '\x1b[32m';
                        const sysFilled = Math.round((sysPct / 100) * barLen);
                        const sysBar = '█'.repeat(sysFilled) + '░'.repeat(barLen - sysFilled);

                        const heapUsedMB  = (memUsage.heapUsed  / (1024 * 1024)).toFixed(1);
                        const heapTotalMB = (memUsage.heapTotal / (1024 * 1024)).toFixed(1);
                        const extMB       = (memUsage.external  / (1024 * 1024)).toFixed(1);
                        const limitFmt    = formatBytes(this.memoryLimit);
                        const sysFreeFmt  = formatBytes(systemMem.free);

                        const loadAvg  = os.loadavg();
                        const cpuCores = os.cpus().length;
                        const cpuColor = (v) => v >= 2 ? '\x1b[31m' : v >= 1 ? '\x1b[33m' : '\x1b[32m';

                        const uptimeSec = Math.floor(process.uptime());
                        const uptimeDays  = Math.floor(uptimeSec / 86400);
                        const uptimeHrs   = Math.floor((uptimeSec % 86400) / 3600);
                        const uptimeMins  = Math.floor((uptimeSec % 3600) / 60);
                        const uptimeStr   = uptimeDays > 0
                                ? `${uptimeDays}d ${uptimeHrs}h ${uptimeMins}m`
                                : uptimeHrs > 0
                                        ? `${uptimeHrs}h ${uptimeMins}m`
                                        : `${uptimeMins}m`;

                        const cyan  = '\x1b[36m';
                        const reset = '\x1b[0m';
                        const bold  = '\x1b[1m';
                        const gray  = '\x1b[90m';
                        const white = '\x1b[97m';

                        const lbl = (s) => `${gray}${s}${reset}`;
                        const val = (s, c = white) => `${c}${bold}${s}${reset}`;

                        console.log(`${cyan}[MemoryMonitor]${reset} ${icon} ${color}${bold}${status}${reset} ${lbl('cek ke-')}${val(this._checkCount)} ${lbl('|')}`);
                        console.log(`${lbl('uptime')} ${lbl(':')} ${val(uptimeStr)}`);
                        console.log(`${lbl('BOT')} ${color}${botBar}${reset}  ${lbl(':')}${val(percentage + '%', color)} ${val(formatBytes(currentUsage))} ${lbl('/')} ${val(limitFmt)}`);
                        console.log(`${lbl('SYS')} ${sysColor}${sysBar}${reset} ${val(sysPercentage + '%', sysColor)} ${val(formatBytes(systemMem.used))} ${lbl('/')} ${val(formatBytes(systemMem.total))} ${lbl('free')} ${val(sysFreeFmt)}`);
                        console.log(`${lbl('Heap')} ${lbl(':')} ${val(heapUsedMB + '/' + heapTotalMB + ' MB', cyan)}`);
                        console.log(`${lbl('Ext ')} ${lbl(':')} ${val(extMB + ' MB', cyan)}`);
                        console.log(`${lbl('CPU ')} ${lbl(':')} ${val(loadAvg[0].toFixed(2), cpuColor(loadAvg[0]))}${gray}, ${reset}${val(loadAvg[1].toFixed(2), cpuColor(loadAvg[1]))}${gray}, ${reset}${val(loadAvg[2].toFixed(2), cpuColor(loadAvg[2]))} ${gray}(${reset}${val(cpuCores + ' core')}${gray})${reset}`);
                        console.log(`${lbl('PID ')} ${lbl(':')} ${val(process.pid)}`);
                        console.log(`${lbl('Node')} ${lbl(':')} ${val(process.version)}`);
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

export { loadConfig, saveConfig, formatBytes, getCurrentMemoryUsage, getSystemMemoryInfo };
