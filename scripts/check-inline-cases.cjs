#!/usr/bin/env node
'use strict';

/**
 * check-inline-cases.js
 * Scan src/handler/message.js — temukan case block yang masih punya inline logic.
 * Idealnya setiap case cuma: require → await handler → break
 *
 * Jalankan: node scripts/check-inline-cases.js
 */

const fs = require('fs');
const path = require('path');

const TARGET = path.resolve('./src/handler/message.js');
const INLINE_THRESHOLD = 6; // baris substantif max sebelum dianggap "inline"

if (!fs.existsSync(TARGET)) {
        console.error(`❌ File tidak ditemukan: ${TARGET}`);
        process.exit(1);
}

const raw = fs.readFileSync(TARGET, 'utf8');
const lines = raw.split('\n');
const total = lines.length;

// ─── helpers ──────────────────────────────────────────────────────────────────

function isSubstantiveLine(str) {
        const t = str.trim();
        if (!t) return false;
        if (t === 'break;') return false;
        if (t === '{' || t === '}') return false;
        if (t === '} catch (_) {}') return false;
        if (/^case '[^']+':/.test(t)) return false;
        if (t.startsWith('//')) return false;
        return true;
}

// Cek apakah baris adalah baris "sederhana" yang diizinkan:
// require + handler call + break — pola delegasi
function isAllowedPattern(innerLines) {
        const substantive = innerLines.filter(isSubstantiveLine);
        // Pola ideal: try { require; handler; } catch(...) { ... } / atau langsung require; handler
        const hasRequire = substantive.some(l => l.includes('_require(') || l.includes('require('));
        const hasHandler = substantive.some(l => /await\s+handle[A-Z]/.test(l) || /await\s+\w+Handler/.test(l));
        const hasTryCatch = substantive.some(l => l.startsWith('try {') || l === 'try {');
        const catchLines = substantive.filter(l => !l.startsWith('try') && !l.includes('_require') && !l.includes('await handle') && !l.startsWith('} catch') && !l.startsWith('const {') && !l.startsWith('delete ') && !l.includes('logCommand') && !l.includes('console.error') && !l.includes('tolak(') && !l.includes('sendMessage'));

        // Kalau ada require + handler = delegasi (boleh punya try/catch tipis)
        if (hasRequire && hasHandler) {
                // Izinkan try/catch tipis sekitar delegasi (max 8 baris non-trivial di luar handler call)
                if (substantive.length <= 14) return true;
        }
        return false;
}

// ─── scan ─────────────────────────────────────────────────────────────────────

const issues = [];

let i = 0;
while (i < total) {
        const line = lines[i];
        const trimmed = line.trim();

        // Cari awal case label
        if (!/^\s+case '[^']+':\s*$/.test(line) && !/^\s+case '[^']+': \{/.test(line)) {
                i++;
                continue;
        }

        // Kumpulkan semua case labels yang jatuh-through
        const caseLabels = [];
        let j = i;
        while (j < total) {
                const jt = lines[j].trim();
                if (/^case '[^']+':/.test(jt)) {
                        caseLabels.push(jt.replace(/:\s*\{?\s*$/, ':').replace(/^case /, '').replace(/:$/, ''));
                        if (lines[j].trimEnd().endsWith('{')) { j++; break; }
                        j++;
                } else {
                        break;
                }
        }

        // Baris j-1 atau j sekarang harusnya baris yang berisi '{'
        // Cari baris opening '{'
        let blockOpen = j - 1;
        if (!lines[blockOpen].trimEnd().endsWith('{')) {
                i = j;
                continue;
        }

        // Telusuri isi blok sampai depth kembali ke 0
        let depth = 0;
        const innerLines = [];
        let k = blockOpen;
        while (k < total) {
                const kl = lines[k];
                const opens = (kl.match(/\{/g) || []).length;
                const closes = (kl.match(/\}/g) || []).length;
                if (k === blockOpen) {
                        depth += opens - closes;
                        k++;
                        continue;
                }
                depth += opens - closes;
                if (depth <= 0) break;
                innerLines.push(kl);
                k++;
        }

        const substantive = innerLines.filter(isSubstantiveLine);

        if (substantive.length > INLINE_THRESHOLD && !isAllowedPattern(innerLines)) {
                issues.push({
                        lineNo: i + 1,
                        labels: caseLabels,
                        count: substantive.length,
                        preview: innerLines.slice(0, 5).map(l => l.trimEnd()),
                });
        }

        i = k;
}

// ─── output ───────────────────────────────────────────────────────────────────

const BOLD  = '\x1b[1m';
const RED   = '\x1b[31m';
const GRN   = '\x1b[32m';
const YLW   = '\x1b[33m';
const RST   = '\x1b[0m';
const DIM   = '\x1b[2m';

console.log(`\n${BOLD}=== check-inline-cases.js ===${RST}`);
console.log(`${DIM}Target: ${TARGET}${RST}`);
console.log(`${DIM}Threshold: >${INLINE_THRESHOLD} baris substantif = inline logic${RST}\n`);

if (issues.length === 0) {
        console.log(`${GRN}${BOLD}✅ BERSIH — tidak ada case dengan inline logic yang tersisa.${RST}`);
        console.log(`${GRN}Semua case sudah pakai pola simple delegate ke src/scrape/.${RST}\n`);
        process.exit(0);
}

console.log(`${RED}${BOLD}⚠️  Ditemukan ${issues.length} case yang masih punya inline logic:${RST}\n`);

for (const issue of issues) {
        const label = issue.labels.join(` / `);
        console.log(`${YLW}${BOLD}• L${issue.lineNo} — case '${label}'${RST}  ${DIM}(${issue.count} baris substantif)${RST}`);
        console.log(`${DIM}  Rekomendasi: pindahkan ke src/scrape/<folder-sesuai-fitur>/<nama>.cjs${RST}`);
        for (const pl of issue.preview) {
                console.log(`  ${DIM}${pl}${RST}`);
        }
        console.log();
}

console.log(`${RED}Total: ${issues.length} case perlu dimigrasikan ke src/scrape/.${RST}\n`);
process.exit(1);
