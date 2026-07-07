#!/usr/bin/env bash
# Web Server saja untuk deployment Replit Autoscale
# Bot WhatsApp dijalankan terpisah via start-ptero.sh

if [ ! -d "node_modules" ]; then
  echo "📦 Install dependencies..."
  npm install
fi

echo "🌐 Starting WilyBot Web Server on port 5000..."
exec node web.js
