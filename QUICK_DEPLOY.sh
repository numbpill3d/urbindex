#!/bin/bash

# URBINDEX - Quick Deployment Script
# Run this to deploy your site to Firebase Hosting

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║                                                            ║"
echo "║   🗺️  URBINDEX - Firebase Deployment                      ║"
echo "║                                                            ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Step 1: Check Firebase CLI
echo -e "${BLUE}[1/4]${NC} Checking Firebase CLI..."
if command -v firebase &> /dev/null; then
    echo -e "${GREEN}✓${NC} Firebase CLI is installed"
else
    echo -e "${RED}✗${NC} Firebase CLI not found"
    echo -e "${YELLOW}→${NC} Installing Firebase CLI..."
    npm install -g firebase-tools
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓${NC} Firebase CLI installed successfully"
    else
        echo -e "${RED}✗${NC} Failed to install Firebase CLI"
        exit 1
    fi
fi

echo ""

# Step 2: Check Authentication
echo -e "${BLUE}[2/4]${NC} Checking Firebase authentication..."
firebase projects:list > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✓${NC} Authenticated with Firebase"
else
    echo -e "${RED}✗${NC} Not authenticated with Firebase"
    echo ""
    echo -e "${YELLOW}Please run the following command in a separate terminal:${NC}"
    echo -e "${CYAN}firebase login${NC}"
    echo ""
    echo "After logging in, run this script again."
    exit 1
fi

echo ""

# Step 3: Confirm Deployment
echo -e "${BLUE}[3/4]${NC} Ready to deploy..."
echo ""
echo -e "${PURPLE}Project:${NC} urbindex-d69e1"
echo -e "${PURPLE}Hosting:${NC} https://urbindex-d69e1.web.app/"
echo ""
read -p "Deploy now? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Deployment cancelled${NC}"
    exit 0
fi

echo ""

# Step 4: Deploy
echo -e "${BLUE}[4/4]${NC} Deploying to Firebase Hosting..."
echo ""

firebase deploy --only hosting --project urbindex-d69e1

if [ $? -eq 0 ]; then
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║   ${GREEN}✓${NC} DEPLOYMENT SUCCESSFUL!                              ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${CYAN}Your site is now live at:${NC}"
    echo -e "${GREEN}🌐 https://urbindex-d69e1.web.app/${NC}"
    echo ""
    echo -e "${YELLOW}What's New:${NC}"
    echo "  • Fixed critical JavaScript bug (map now loads!)"
    echo "  • Stunning loading screen with animated logo"
    echo "  • Enhanced visuals with glows and animations"
    echo "  • Working login/register button"
    echo "  • Profile page with achievements"
    echo "  • Password reset functionality"
    echo ""
    echo -e "${PURPLE}Next Steps:${NC}"
    echo "  1. Visit your site and test everything"
    echo "  2. Check Firebase Console for analytics"
    echo "  3. Review FIREBASE_UI_OPTIMIZATION_GUIDE.md"
    echo ""
else
    echo ""
    echo "╔════════════════════════════════════════════════════════════╗"
    echo "║                                                            ║"
    echo "║   ${RED}✗${NC} DEPLOYMENT FAILED                                   ║"
    echo "║                                                            ║"
    echo "╚════════════════════════════════════════════════════════════╝"
    echo ""
    echo -e "${YELLOW}Troubleshooting:${NC}"
    echo "  1. Run: firebase login --reauth"
    echo "  2. Check your internet connection"
    echo "  3. Verify project access permissions"
    echo ""
    exit 1
fi
