#!/bin/bash
echo "=== 1. Checking index.html for manifest link ==="
curl -s https://medichainbd.vercel.app/ | grep -i "manifest"

echo -e "\n=== 2. Fetching manifest file ==="
curl -s -I https://medichainbd.vercel.app/manifest.webmanifest
curl -s https://medichainbd.vercel.app/manifest.webmanifest

echo -e "\n\n=== 3. Checking Icons ==="
curl -s -I https://medichainbd.vercel.app/icon-192.png | head -n 1
curl -s -I https://medichainbd.vercel.app/icon-512.png | head -n 1
curl -s -I https://medichainbd.vercel.app/favicon.png | head -n 1
curl -s -I https://medichainbd.vercel.app/apple-touch-icon.png | head -n 1

echo -e "\n=== 4. Checking Service Worker ==="
curl -s -I https://medichainbd.vercel.app/sw.js | head -n 1
