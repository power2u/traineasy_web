#!/bin/bash
# Trigger the notification cron job
# Usage: ./scripts/cron-job.sh [BASE_URL] [CRON_SECRET]

BASE_URL=${1:-"http://localhost:3000"}
SECRET=${2:-"$CRON_SECRET"}

if [ -z "$SECRET" ]; then
  echo "Error: CRON_SECRET is not set. Pass it as 2nd argument or set env var."
  exit 1
fi

echo "Triggering notifications at $BASE_URL/api/notifications/check-and-send..."
curl -X GET "$BASE_URL/api/notifications/check-and-send" \
  -H "Authorization: Bearer $SECRET" \
  -H "Content-Type: application/json"

echo -e "\nDone."
