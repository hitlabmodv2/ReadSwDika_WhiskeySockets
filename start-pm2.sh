#!/usr/bin/env bash
# ─────────────────────────────────────
#  Start script untuk PM2
#  Startup Command: npm run start-pm2
#  atau: bash start-pm2.sh
# ─────────────────────────────────────

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
  echo -e "  ${C_DIM}PM2 Mode${C_RESET}"
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
  "$@" > /tmp/wilybot_pm2_install.log 2>&1 &
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

# ── Selalu pastikan dependencies lengkap ──
# (npm install sangat cepat kalau sudah ada, tapi pastikan tidak ada yang bolong)
echo -e "${C_CYAN}────────────────────────────${C_RESET}"
echo -e "  ${C_YELLOW}📦 Memastikan dependencies...${C_RESET}"
run_with_spinner "Memeriksa & install dependencies..." npm install --no-fund --no-audit
if [ $? -eq 0 ]; then
  echo -e "  ${C_GREEN}✅ Dependencies lengkap${C_RESET}"
else
  echo -e "  \033[1;31m❌ Install gagal, cek /tmp/wilybot_pm2_install.log${C_RESET}"
  exit 1
fi
echo -e "${C_CYAN}────────────────────────────${C_RESET}"

# ── Hapus sesi PM2 lama ──
pm2 delete wily-bot 2>/dev/null || true

# ── Start bot via PM2 ──
echo -e "  ${C_GREEN}▶ Menjalankan PM2...${C_RESET}"
pm2 start ecosystem.config.cjs

# ── Simpan process list (auto-restore saat reboot) ──
pm2 save
echo -e "  ${C_GREEN}✅ PM2 process list tersimpan${C_RESET}"
echo -e "${C_CYAN}────────────────────────────${C_RESET}"

# ── Stream log realtime ke konsol (replace timestamp ISO → [WILY-KUN]) ──
exec pm2 logs wily-bot --raw 2>&1 | \
  sed -u 's/^[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\}T[0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}:/[WILY-KUN]:/'
