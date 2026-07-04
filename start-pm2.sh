#!/usr/bin/env bash
# ─────────────────────────────────────────
#  PM2 Starter — Wily Bot
#  Urutan: delete lama → start → save → logs
# ─────────────────────────────────────────

# Hapus sesi PM2 lama kalau ada (agar tidak bentrok)
pm2 delete wily-bot 2>/dev/null || true

# Start bot via PM2 daemon
pm2 start ecosystem.config.cjs

# Simpan process list — auto-restore saat server reboot
pm2 save

# Stream log realtime ke konsol (replace timestamp ISO → [WILY-KUN])
exec pm2 logs wily-bot --raw 2>&1 | \
  sed -u 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}:/[WILY-KUN]:/'
