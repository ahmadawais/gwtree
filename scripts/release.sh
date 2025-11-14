#!/bin/bash

# GWTree Release Script
# Usage: ./scripts/release.sh [major|minor|patch]

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if version type is provided
if [ -z "$1" ]; then
  echo -e "${RED}Error: Version type required (major|minor|patch)${NC}"
  echo "Usage: ./scripts/release.sh [major|minor|patch]"
  exit 1
fi

VERSION_TYPE=$1

# Validate version type
if [[ ! "$VERSION_TYPE" =~ ^(major|minor|patch)$ ]]; then
  echo -e "${RED}Error: Invalid version type. Use major, minor, or patch${NC}"
  exit 1
fi

echo -e "${YELLOW}Starting release process...${NC}\n"

# 1. Check git status
echo -e "${GREEN}1. Checking git status...${NC}"
if [[ -n $(git status -s) ]]; then
  echo -e "${RED}Error: Working directory not clean. Commit or stash changes first.${NC}"
  exit 1
fi

# 2. Run tests
echo -e "${GREEN}2. Running tests...${NC}"
pnpm test run || {
  echo -e "${RED}Tests failed. Fix them before releasing.${NC}"
  exit 1
}

# 3. Build
echo -e "${GREEN}3. Building...${NC}"
pnpm build

# 4. Bump version
echo -e "${GREEN}4. Bumping version ($VERSION_TYPE)...${NC}"
NEW_VERSION=$(npm version $VERSION_TYPE --no-git-tag-version)
echo -e "New version: ${YELLOW}$NEW_VERSION${NC}"

# 5. Update version in src/index.ts
echo -e "${GREEN}5. Updating version in source files...${NC}"
sed -i '' "s/\.version('[^']*'/\.version('${NEW_VERSION#v}'/" src/index.ts

# 6. Rebuild with new version
echo -e "${GREEN}6. Rebuilding with new version...${NC}"
pnpm build

# 7. Update CHANGELOG
echo -e "${GREEN}7. Updating CHANGELOG.md...${NC}"
DATE=$(date +%Y-%m-%d)
echo "Please update CHANGELOG.md with release notes for $NEW_VERSION"
read -p "Press enter when done..."

# 8. Commit changes
echo -e "${GREEN}8. Committing changes...${NC}"
git add .
git commit -m "🚀 RELEASE: $NEW_VERSION"

# 9. Create git tag
echo -e "${GREEN}9. Creating git tag...${NC}"
git tag -a "$NEW_VERSION" -m "Release $NEW_VERSION"

# 10. Push to GitHub
echo -e "${GREEN}10. Pushing to GitHub...${NC}"
git push origin main
git push origin "$NEW_VERSION"

# 11. Publish to npm
echo -e "${GREEN}11. Publishing to npm...${NC}"
npm publish

# 12. Create GitHub release
echo -e "${GREEN}12. Creating GitHub release...${NC}"
gh release create "$NEW_VERSION" \
  --title "$NEW_VERSION" \
  --notes-file CHANGELOG.md \
  --latest

echo -e "\n${GREEN}✓ Release $NEW_VERSION completed successfully!${NC}"
echo -e "${YELLOW}Published to:${NC}"
echo -e "  - npm: https://www.npmjs.com/package/gwtree"
echo -e "  - GitHub: https://github.com/ahmadawais/gwtree/releases/tag/$NEW_VERSION"
