#!/bin/bash
#
# Install git-commit-ai skill for Kimi CLI
#
# Usage: bash install-for-kimi.sh
#        REPO_URL=https://github.com/rdealist/git-commit-ai bash install-for-kimi.sh
#

set -e

SKILL_NAME="git-commit-ai"
INSTALL_DIR="${HOME}/.config/agents/skills"
REPO_URL="${REPO_URL:-https://github.com/rdealist/git-commit-ai}"

echo "🔧 Installing git-commit-ai skill for Kimi CLI..."
echo "   Target: $INSTALL_DIR/$SKILL_NAME"
echo "   Source: $REPO_URL"
echo ""

# Create directory
mkdir -p "$INSTALL_DIR"

# Remove old installation if exists
if [ -d "$INSTALL_DIR/$SKILL_NAME" ]; then
    echo "📝 Removing old installation..."
    rm -rf "$INSTALL_DIR/$SKILL_NAME"
fi

# Clone repository
echo "📥 Downloading skill..."
if command -v git &> /dev/null; then
    git clone --depth 1 "$REPO_URL" "$INSTALL_DIR/$SKILL_NAME" 2>/dev/null
else
    TEMP_DIR=$(mktemp -d)
    curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar -xz -C "$TEMP_DIR" --strip-components=1
    mv "$TEMP_DIR" "$INSTALL_DIR/$SKILL_NAME"
fi

# Clean up
rm -rf "$INSTALL_DIR/$SKILL_NAME/.git"
rm -rf "$INSTALL_DIR/$SKILL_NAME/install"

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 Usage in Kimi CLI:"
echo "   /skill:git-commit-ai"
echo ""
echo "📖 Or use directly:"
echo "   node $INSTALL_DIR/$SKILL_NAME/scripts/git-commit-ai.js"
echo ""
