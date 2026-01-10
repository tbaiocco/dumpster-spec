#!/bin/bash

# Script to help set Google Cloud credentials from JSON key file
# Usage: ./scripts/set-google-credentials.sh <path-to-json-key-file>

set -e

if [ -z "$1" ]; then
  echo "Usage: ./scripts/set-google-credentials.sh <path-to-json-key-file>"
  echo ""
  echo "Example: ./scripts/set-google-credentials.sh ../config/clutter-476009-3631b1ce193d.json"
  exit 1
fi

JSON_FILE="$1"

if [ ! -f "$JSON_FILE" ]; then
  echo "Error: File not found: $JSON_FILE"
  exit 1
fi

echo "Reading credentials from: $JSON_FILE"
echo ""

# Extract values using jq
PROJECT_ID=$(jq -r '.project_id' "$JSON_FILE")
CLIENT_EMAIL=$(jq -r '.client_email' "$JSON_FILE")
PRIVATE_KEY=$(jq -r '.private_key' "$JSON_FILE")

# Validate extracted values
if [ -z "$PROJECT_ID" ] || [ "$PROJECT_ID" == "null" ]; then
  echo "Error: Could not extract project_id from JSON file"
  exit 1
fi

if [ -z "$CLIENT_EMAIL" ] || [ "$CLIENT_EMAIL" == "null" ]; then
  echo "Error: Could not extract client_email from JSON file"
  exit 1
fi

if [ -z "$PRIVATE_KEY" ] || [ "$PRIVATE_KEY" == "null" ]; then
  echo "Error: Could not extract private_key from JSON file"
  exit 1
fi

# Create or update .env file
ENV_FILE=".env"

echo "Setting environment variables in $ENV_FILE..."
echo ""

# Remove old Google Cloud variables if they exist
sed -i '/^GOOGLE_CLOUD_PROJECT_ID=/d' "$ENV_FILE" 2>/dev/null || true
sed -i '/^GOOGLE_CLOUD_CLIENT_EMAIL=/d' "$ENV_FILE" 2>/dev/null || true
sed -i '/^GOOGLE_CLOUD_PRIVATE_KEY=/d' "$ENV_FILE" 2>/dev/null || true
sed -i '/^GOOGLE_CLOUD_KEY_FILE=/d' "$ENV_FILE" 2>/dev/null || true
sed -i '/^GOOGLE_CLOUD_API_KEY=/d' "$ENV_FILE" 2>/dev/null || true

# Add new variables
echo "" >> "$ENV_FILE"
echo "# Google Cloud Service Account Credentials" >> "$ENV_FILE"
echo "GOOGLE_CLOUD_PROJECT_ID=$PROJECT_ID" >> "$ENV_FILE"
echo "GOOGLE_CLOUD_CLIENT_EMAIL=$CLIENT_EMAIL" >> "$ENV_FILE"
echo "GOOGLE_CLOUD_PRIVATE_KEY=\"$PRIVATE_KEY\"" >> "$ENV_FILE"
echo "" >> "$ENV_FILE"

echo "✓ Environment variables set successfully!"
echo ""
echo "Project ID: $PROJECT_ID"
echo "Client Email: $CLIENT_EMAIL"
echo "Private Key: [REDACTED - ${#PRIVATE_KEY} characters]"
echo ""
echo "Please restart your application for changes to take effect."
