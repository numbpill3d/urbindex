#!/bin/bash

# Urbindex Deployment Verification & Deploy Script

echo "════════════════════════════════════════════════════════════"
echo "  🗺️  URBINDEX - Deployment & Verification"
echo "════════════════════════════════════════════════════════════"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

# Step 1: Verify files exist
echo -e "${BLUE}[1/5]${NC} Verifying files..."
if [ ! -f "index.html" ]; then
    echo -e "${RED}✗${NC} index.html not found!"
    exit 1
fi
if [ ! -f "firebase.json" ]; then
    echo -e "${RED}✗${NC} firebase.json not found!"
    exit 1
fi
echo -e "${GREEN}✓${NC} All files present"
echo ""

# Step 2: Check firebase.json configuration
echo -e "${BLUE}[2/5]${NC} Checking firebase.json..."
if grep -q '"destination": "/index.html"' firebase.json; then
    echo -e "${GREEN}✓${NC} firebase.json correctly configured to serve index.html"
else
    echo -e "${YELLOW}⚠${NC} firebase.json may not be configured correctly"
    echo "Expected: \"destination\": \"/index.html\""
fi
echo ""

# Step 3: Check git status
echo -e "${BLUE}[3/5]${NC} Checking git status..."
git status --short
echo ""

# Step 4: Deploy
echo -e "${BLUE}[4/5]${NC} Deploying to Firebase Hosting..."
echo ""
read -p "Deploy now? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

firebase deploy --only hosting

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓${NC} Deployment successful!"
    echo ""

    # Step 5: Post-deployment instructions
    echo -e "${BLUE}[5/5]${NC} Post-Deployment Steps:"
    echo ""
    echo -e "${CYAN}1. Clear browser cache:${NC}"
    echo "   Chrome: Ctrl+Shift+Del → Clear cache"
    echo "   Firefox: Ctrl+Shift+Del → Clear cache"
    echo "   Safari: Cmd+Option+E"
    echo ""
    echo -e "${CYAN}2. Hard refresh:${NC}"
    echo "   Windows: Ctrl+Shift+R or Ctrl+F5"
    echo "   Mac: Cmd+Shift+R"
    echo ""
    echo -e "${CYAN}3. Visit your site:${NC}"
    echo "   https://urbindex-d69e1.web.app/"
    echo ""
    echo -e "${CYAN}4. Verify changes:${NC}"
    echo "   • Check for theme switcher button"
    echo "   • Look for onboarding on first visit"
    echo "   • Test Quick Add (+) button"
    echo "   • Try switching themes"
    echo ""
    echo -e "${YELLOW}If still seeing old version:${NC}"
    echo "   1. Open in Incognito/Private window"
    echo "   2. Wait 2-3 minutes for CDN propagation"
    echo "   3. Check Firebase Hosting dashboard"
    echo "   4. Verify deployment timestamp"
    echo ""
    echo -e "${GREEN}Deployment complete! 🎉${NC}"
else
    echo ""
    echo -e "${RED}✗${NC} Deployment failed"
    exit 1
fi
