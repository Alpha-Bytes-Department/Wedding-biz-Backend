#!/bin/bash

# Deploy script for Wedding Backend
# This script handles backend deployment with latest code updates

echo "🔧 Wedding Backend Deployment"
echo "==============================="

cd /root/Wedding-biz-Backend

# Stash any local changes (if any)
echo "💾 Stashing local changes..."
git stash

# Pull latest changes from repository
echo "📥 Pulling latest changes from repository..."
git pull origin main

if [ $? -ne 0 ]; then
    echo "❌ Git pull failed"
    exit 1
fi

# Check if package.json was modified in the latest pull
if git diff HEAD~1 --name-only | grep -q "package.json"; then
    echo "📦 package.json changed, installing dependencies..."
    npm install --legacy-peer-deps
    if [ $? -ne 0 ]; then
        echo "❌ npm install failed"
        exit 1
    fi
fi

echo "🔄 Restarting backend server..."
pm2 restart weddingBackend3

# Wait a moment for restart
sleep 2

# Check if the process is running
if pm2 list | grep -q "weddingBackend3.*online"; then
    echo "✅ Backend deployment successful!"
    echo "🌐 API available at: https://erieweddingofficiants.com/api/"
    echo "📊 Socket.IO available at: https://erieweddingofficiants.com/socket.io/"
    
    # Show process status
    echo ""
    echo "📈 Process Status:"
    pm2 list | grep weddingBackend3
else
    echo "❌ Backend deployment failed!"
    echo "🔍 Checking logs..."
    pm2 logs weddingBackend3 --lines 10
    exit 1
fi
