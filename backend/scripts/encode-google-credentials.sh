#!/bin/bash

# Script to encode Google Cloud service account JSON to base64
# Usage: ./encode-google-credentials.sh

CREDENTIALS_FILE="./config/clutter-476009-3631b1ce193d.json"

if [ ! -f "$CREDENTIALS_FILE" ]; then
    echo "Error: Credentials file not found at $CREDENTIALS_FILE"
    exit 1
fi

echo "Encoding Google Cloud credentials to base64..."
echo ""
echo "Copy the following value and add it as GOOGLE_CLOUD_KEY_JSON_BASE64 in Railway:"
echo ""
echo "================================================"
base64 -w 0 "$CREDENTIALS_FILE"
echo ""
echo "================================================"
echo ""
echo "Done! Don't forget to also set GOOGLE_CLOUD_PROJECT_ID in Railway."
