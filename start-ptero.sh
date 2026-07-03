#!/usr/bin/env bash
# ─────────────────────────────────────
#  Start script untuk PTERODACTYL
#  Startup Command di panel: bash start-ptero.sh
# ─────────────────────────────────────

CONFIG_FILE="./config.json"

# ── Ambil config Telegram dari config.json ──
tg_enabled=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.enabled||false)}catch(e){console.log(false)}")
tg_token=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.token||'')}catch(e){console.log('')}")
tg_chat=$(node -e "try{const c=JSON.parse(require('fs').readFileSync('$CONFIG_FILE','utf8'));console.log(c.telegram?.chatId||'')}catch(e){console.log('')}")

# ── Fungsi kirim notif Telegram ──
send_tg() {
  local msg="$1"
  if [ "$tg_enabled" = "true" ] && [ -n "$tg_token" ] && [ -n "$tg_chat" ]; then
    curl -s -X POST "https://api.telegram.org/bot${tg_token}/sendMessage" \
      -d chat_id="$tg_chat" \
      -d parse_mode="Markdown" \
      --data-urlencode text="$msg" > /dev/null 2>&1
  fi
}

# ── Fungsi format durasi detik → jam/menit/detik ──
format_uptime() {
  local secs=$1
  local h=$((secs / 3600))
  local m=$(((secs % 3600) / 60))
  local s=$((secs % 60))
  echo "${h}j ${m}m ${s}d"
}

# ── Warna ANSI ──
C_RESET='\033[0m'
C_CYAN='\033[1;36m'
C_GREEN='\033[1;32m'
C_YELLOW='\033[1;33m'
C_MAGENTA='\033[1;35m'
C_DIM='\033[2m'

print_banner() {
  echo -e "${C_CYAN}════════════════════════════${C_RESET}"
  echo -e "  ${C_MAGENTA}✦ WILY BOT ✦${C_RESET}"
  echo -e "  ${C_DIM}Pterodactyl Mode${C_RESET}"
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  echo -e "  ${C_YELLOW}Dev${C_RESET}  : Bang Wily"
  echo -e "  ${C_YELLOW}WA${C_RESET}   : 6289688206739"
  echo -e "  ${C_YELLOW}Tele${C_RESET} : @Wilykun1994"
  echo -e "${C_CYAN}════════════════════════════${C_RESET}"
}

print_banner

# ── Spinner animasi realtime ──
run_with_spinner() {
  local label="$1"; shift
  "$@" > /tmp/wilybot_install.log 2>&1 &
  local pid=$!
  local frames='⠋⠙⠹⠸⠼⠴⠦⠧⠇⠏'
  local i=0
  tput civis 2>/dev/null
  while kill -0 "$pid" 2>/dev/null; do
    i=$(( (i + 1) % ${#frames} ))
    printf "\r  ${C_CYAN}%s${C_RESET} ${C_DIM}%s${C_RESET}   " "${frames:$i:1}" "$label"
    sleep 0.1
  done
  wait "$pid"
  local exit_code=$?
  tput cnorm 2>/dev/null
  printf "\r\033[K"
  return $exit_code
}

# Install node_modules jika belum ada
if [ ! -d "node_modules" ]; then
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  echo -e "  ${C_YELLOW}📦 node_modules belum ada${C_RESET}"
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
  run_with_spinner "Menginstall dependencies..." npm install
  if [ $? -eq 0 ]; then
    echo -e "  ${C_GREEN}✅ Instalasi selesai${C_RESET}"
  else
    echo -e "  \033[1;31m❌ Instalasi gagal, cek /tmp/wilybot_install.log${C_RESET}"
  fi
  echo -e "${C_CYAN}────────────────────────────${C_RESET}"
fi

BOT_START_TIME=$(date +%s)

send_tg "✅ *Wily Bot - Pterodactyl*
Bot berhasil dijalankan.
🕐 $(date '+%Y-%m-%d %H:%M:%S')"

# ── Daily report (background, setiap 24 jam) ──
daily_report() {
  while true; do
    sleep 86400
    NOW=$(date '+%Y-%m-%d %H:%M:%S')
    ELAPSED=$(( $(date +%s) - BOT_START_TIME ))
    UPTIME_STR=$(format_uptime $ELAPSED)

    # Ambil memori dari /proc/meminfo
    MEM_USED_KB=$(grep MemAvailable /proc/meminfo | awk '{print $2}')
    MEM_TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    MEM_USED_MB=$(( (MEM_TOTAL_KB - MEM_USED_KB) / 1024 ))
    MEM_TOTAL_MB=$(( MEM_TOTAL_KB / 1024 ))

    send_tg "📊 *Wily Bot - Laporan Harian (Pterodactyl)*

🟢 Status: \`Online\`
⏱ Uptime sejak start: \`${UPTIME_STR}\`
🔄 Total Crash & Restart: \`${RESTART_COUNT}x\`
💾 Memori Server: \`${MEM_USED_MB} MB / ${MEM_TOTAL_MB} MB\`
🕐 Waktu: $NOW"
  done
}

# Jalankan daily report di background
daily_report &
DAILY_PID=$!

# ── Auto-restart loop ──
# RESTART_COUNT di-reset ke 0 setiap kali bot sempat jalan STABIL minimal
# STABLE_UPTIME_SEC detik sebelum crash lagi. Jadi batas MAX_RESTARTS cuma
# berlaku untuk crash BERUNTUN CEPAT (indikasi bug fatal) — kalau crash-nya
# jarang-jarang dan bot sempat pulih normal di antaranya, bot TIDAK akan
# pernah kehabisan jatah restart dan mati permanen.
RESTART_COUNT=0
MAX_RESTARTS=10
RESTART_DELAY=5
STABLE_UPTIME_SEC=180

echo -e "${C_CYAN}────────────────────────────${C_RESET}"
echo -e "  ${C_GREEN}✅ Auto-Restart Aktif${C_RESET}"
echo -e "  ${C_DIM}Max restart beruntun: ${MAX_RESTARTS}x (reset jika stabil ${STABLE_UPTIME_SEC}s)${C_RESET}"
echo -e "${C_CYAN}────────────────────────────${C_RESET}"
while true; do
  RUN_START=$(date +%s)
  node index.js
  EXIT_CODE=$?
  RUN_ELAPSED=$(( $(date +%s) - RUN_START ))
  NOW=$(date '+%Y-%m-%d %H:%M:%S')

  if [ "$RUN_ELAPSED" -ge "$STABLE_UPTIME_SEC" ] && [ "$RESTART_COUNT" -gt 0 ]; then
    echo -e "${C_GREEN}✅ Bot sempat jalan stabil ${RUN_ELAPSED}s → hitungan restart di-reset${C_RESET}"
    RESTART_COUNT=0
  fi

  RESTART_COUNT=$((RESTART_COUNT + 1))

  echo -e "${C_YELLOW}⚠️  [$NOW]${C_RESET} Bot berhenti ${C_DIM}(exit: $EXIT_CODE, uptime: ${RUN_ELAPSED}s)${C_RESET}, restart ke-${C_MAGENTA}$RESTART_COUNT${C_RESET} dalam ${RESTART_DELAY}s..."

  if [ "$RESTART_COUNT" -ge "$MAX_RESTARTS" ]; then
    echo -e "\033[1;31m❌ Terlalu banyak restart beruntun cepat ($MAX_RESTARTS kali tanpa sempat stabil), bot dihentikan.${C_RESET}"
    send_tg "❌ *Wily Bot - Pterodactyl*
Bot dihentikan setelah $MAX_RESTARTS kali crash beruntun cepat (tidak sempat stabil ${STABLE_UPTIME_SEC}s).
Exit Code terakhir: \`$EXIT_CODE\`
🕐 $NOW"
    kill $DAILY_PID 2>/dev/null
    exit 1
  fi

  send_tg "⚠️ *Wily Bot - Pterodactyl*
Bot crash (exit code: \`$EXIT_CODE\`, uptime: ${RUN_ELAPSED}s), restart ke-$RESTART_COUNT dalam ${RESTART_DELAY}s...
🕐 $NOW"

  sleep $RESTART_DELAY
  echo "▶ Menjalankan ulang bot..."
done
