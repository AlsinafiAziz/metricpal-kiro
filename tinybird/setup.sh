#!/bin/bash

# Tinybird setup script
# This script creates the datasources and pipes in Tinybird

set -e

# Check if Tinybird CLI is installed
if ! command -v tb &> /dev/null; then
    echo "Tinybird CLI not found. Please install it first:"
    echo "pip install tinybird-cli"
    exit 1
fi

# Check if token is set
if [ -z "$TINYBIRD_TOKEN" ]; then
    echo "TINYBIRD_TOKEN environment variable is required"
    exit 1
fi

echo "Setting up Tinybird datasources and pipes..."

# Authenticate with Tinybird
tb auth --token $TINYBIRD_TOKEN

# Push datasources
echo "Creating website_events datasource..."
tb push datasources/website_events.datasource

echo "Creating user_identities datasource..."
tb push datasources/user_identities.datasource

# Push pipes
echo "Creating page_views pipe..."
tb push pipes/page_views.pipe

echo "Creating event_summary pipe..."
tb push pipes/event_summary.pipe

echo "Creating user_journey pipe..."
tb push pipes/user_journey.pipe

echo "Tinybird setup completed successfully!"
echo ""
echo "Your endpoints are now available at:"
echo "- Page Views: https://api.tinybird.co/v0/pipes/page_views.json"
echo "- Event Summary: https://api.tinybird.co/v0/pipes/event_summary.json"
echo "- User Journey: https://api.tinybird.co/v0/pipes/user_journey.json"
echo ""
echo "Don't forget to update your .env.local with the TINYBIRD_TOKEN"