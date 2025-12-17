#!/bin/bash

# Update Telegram Webhook URL
# Usage: ./update-telegram-webhook.sh <BOT_TOKEN> <WEBHOOK_URL>

if [ -z "$1" ]; then
    echo "Error: Bot token is required"
    echo "Usage: ./update-telegram-webhook.sh <BOT_TOKEN> <WEBHOOK_URL>"
    exit 1
fi

BOT_TOKEN="$1"
WEBHOOK_URL="${2:-https://api.theclutter.app/api/webhooks/telegram}"

echo "Checking current webhook info..."
curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq '.'

echo -e "\n\nSetting webhook to: ${WEBHOOK_URL}"
RESPONSE=$(curl -s -X POST "https://api.telegram.org/bot${BOT_TOKEN}/setWebhook" \
  -H "Content-Type: application/json" \
  -d "{\"url\": \"${WEBHOOK_URL}\"}")

echo "$RESPONSE" | jq '.'

if echo "$RESPONSE" | jq -e '.ok == true' > /dev/null; then
    echo -e "\n✅ Webhook updated successfully!"
    echo -e "\nVerifying webhook info..."
    curl -s "https://api.telegram.org/bot${BOT_TOKEN}/getWebhookInfo" | jq '.'
else
    echo -e "\n❌ Failed to update webhook"
    exit 1
fi
