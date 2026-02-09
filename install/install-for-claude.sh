#!/bin/bash
#
# Install git-commit-ai skill for Claude Code
#
# Usage: bash install-for-claude.sh
#        REPO_URL=https://github.com/rdealist/git-commit-ai bash install-for-claude.sh
#

set -e

SKILL_NAME="git-commit-ai"
INSTALL_DIR="${HOME}/.config/agents/skills"
REPO_URL="${REPO_URL:-https://github.com/rdealist/git-commit-ai}"

echo "🔧 Installing git-commit-ai skill for Claude Code..."
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
    if git clone --depth 1 "$REPO_URL" "$INSTALL_DIR/$SKILL_NAME" 2>/dev/null; then
        echo "✓ Cloned successfully"
    else
        echo "✗ Failed to clone repository"
        exit 1
    fi
else
    # Fallback to curl
    TEMP_DIR=$(mktemp -d)
    echo "Downloading via curl..."
    if curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" -o "$TEMP_DIR/skill.tar.gz" 2>/dev/null; then
        mkdir -p "$INSTALL_DIR/$SKILL_NAME"
        tar -xzf "$TEMP_DIR/skill.tar.gz" -C "$INSTALL_DIR/$SKILL_NAME" --strip-components=1
        rm -rf "$TEMP_DIR"
    else
        echo "✗ Failed to download"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# Clean up unnecessary files for skill usage
rm -rf "$INSTALL_DIR/$SKILL_NAME/.git" 2>/dev/null || true
rm -rf "$INSTALL_DIR/$SKILL_NAME/install" 2>/dev/null || true

echo ""
echo "✅ Installation complete!"
echo ""
echo "🚀 Usage in Claude Code:"
echo "   /skill:git-commit-ai"
echo ""
echo "📖 Or use directly:"
echo "   node $INSTALL_DIR/$SKILL_NAME/scripts/git-commit-ai.js"
echo ""
