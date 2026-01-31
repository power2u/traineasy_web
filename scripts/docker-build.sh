#!/bin/bash

# Docker build script with retry logic for network issues
set -e

echo "🔧 Starting Docker-optimized build process..."

# Function to retry npm install with exponential backoff
retry_npm_install() {
    local max_attempts=5
    local delay=1
    local attempt=1

    while [ $attempt -le $max_attempts ]; do
        echo "📦 Attempt $attempt/$max_attempts: Installing dependencies..."
        
        if npm ci --prefer-offline --no-audit --no-fund --maxsockets 1; then
            echo "✅ Dependencies installed successfully"
            return 0
        else
            echo "❌ Attempt $attempt failed"
            if [ $attempt -eq $max_attempts ]; then
                echo "💥 All attempts failed. Exiting..."
                return 1
            fi
            
            echo "⏳ Waiting ${delay}s before retry..."
            sleep $delay
            delay=$((delay * 2))
            attempt=$((attempt + 1))
        fi
    done
}

# Clean npm cache
echo "🧹 Cleaning npm cache..."
npm cache clean --force

# Retry npm install
retry_npm_install

# Generate Prisma client
echo "🔄 Generating Prisma client..."
npx prisma generate

# Build the application
echo "🏗️ Building application..."
npm run build

echo "✅ Build completed successfully!"