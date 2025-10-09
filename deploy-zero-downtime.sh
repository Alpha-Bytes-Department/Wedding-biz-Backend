#!/bin/bash

# Zero-downtime deployment script
echo "🔄 Zero-downtime backend deployment..."

cd /root/Wedding-biz-Backend

# Reload instead of restart (keeps connections alive)
pm2 reload weddingBackend3

echo "✅ Zero-downtime deployment complete!"
