'use strict';
/**
 * validate-cjs.cjs
 * Bulk validation: coba load semua file .cjs di proyek (exclude node_modules)
 * Jalankan: node scripts/validate-cjs.cjs
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const ROOT = path.resolve(__dirname, '..');

// Ambil semua file .cjs exclude node_modules
function getCjsFiles() {
  const output = execSync(
    'find . -name "*.cjs" -not -path "./node_modules/*"',
    { cwd: ROOT, encoding: 'utf8' }
  );
  return output.trim().split('\n').filter(Boolean).sort();
}

function tryRequire(filePath) {
  const abs = path.resolve(ROOT, filePath);
  try {
    // Hapus dari cache dulu supaya fresh load
    delete require.cache[abs];
    require(abs);
    return { ok: true, error: null };
  } catch (err) {
    return { ok: false, error: err };
  }
}

function formatError(err) {
  // Ambil baris pertama pesan error saja supaya ringkas
  const lines = (err.message || String(err)).split('\n');
  return lines[0].trim();
}

function main() {
  const files = getCjsFiles();
  const total = files.length;

  console.log('');
  console.log('╔══════════════════════════════════════════════════════╗');
  console.log('║          WILY-BOT  —  Bulk CJS Validator             ║');
  console.log('╚══════════════════════════════════════════════════════╝');
  console.log(`  Total file .cjs ditemukan : ${total}`);
  console.log(`  Root project              : ${ROOT}`);
  console.log('');

  const passed = [];
  const failed = [];

  for (const file of files) {
    const result = tryRequire(file);
    if (result.ok) {
      passed.push(file);
      console.log(`  ✅  ${file}`);
    } else {
      failed.push({ file, error: result.error });
      console.log(`  ❌  ${file}`);
      console.log(`       └─ ${formatError(result.error)}`);
    }
  }

  console.log('');
  console.log('══════════════════════════════════════════════════════');
  console.log(`  ✅ Lulus  : ${passed.length} / ${total}`);
  console.log(`  ❌ Error  : ${failed.length} / ${total}`);
  console.log('══════════════════════════════════════════════════════');

  if (failed.length === 0) {
    console.log('');
    console.log('  🎉 Semua file .cjs berhasil di-load! Tidak ada error.');
    console.log('');
  } else {
    console.log('');
    console.log('  ⚠️  File yang GAGAL di-load:');
    for (const { file, error } of failed) {
      console.log('');
      console.log(`  📄 ${file}`);
      console.log(`     Tipe  : ${error.code || error.name || 'Error'}`);
      console.log(`     Pesan : ${formatError(error)}`);
      // Tampilkan stack trace ringkas (hanya baris project, bukan node_modules)
      if (error.stack) {
        const stackLines = error.stack
          .split('\n')
          .filter(l => l.includes('    at ') && !l.includes('node_modules') && !l.includes('validate-cjs'))
          .slice(0, 3);
        if (stackLines.length > 0) {
          console.log('     Stack :');
          for (const line of stackLines) {
            console.log(`       ${line.trim()}`);
          }
        }
      }
    }
    console.log('');
  }

  // Exit code 1 kalau ada yang gagal (berguna untuk CI/pre-deploy)
  process.exit(failed.length > 0 ? 1 : 0);
}

main();
