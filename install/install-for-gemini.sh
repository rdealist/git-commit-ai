#!/bin/bash
#
# Install git-commit-ai skill for Google Gemini CLI
#
# Usage:
#   bash install-for-gemini.sh              # Auto-detect location
#   bash install-for-gemini.sh --project    # Install to current project
#

set -e

SKILL_NAME="git-commit-ai"
REPO_URL="${REPO_URL:-https://github.com/rdealist/git-commit-ai}"
PROJECT_MODE=false

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --project)
            PROJECT_MODE=true
            shift
            ;;
        *)
            shift
            ;;
    esac
done

# Detect install directory
if [[ "$PROJECT_MODE" == "true" ]]; then
    if [[ -d ".gemini" ]]; then
        INSTALL_DIR=".gemini/skills"
    else
        echo "⚠️  No .gemini directory found in project."
        echo "   Creating .gemini/skills for project-level installation."
        INSTALL_DIR=".gemini/skills"
    fi
else
    # Global installation
    if [[ -d "$HOME/.gemini" ]]; then
        if [[ -d "$HOME/.gemini/skills" ]]; then
            INSTALL_DIR="$HOME/.gemini/skills"
        else
            INSTALL_DIR="$HOME/.gemini"
        fi
    elif [[ -d "$HOME/.config/gemini" ]]; then
        INSTALL_DIR="$HOME/.config/gemini/skills"
    else
        INSTALL_DIR="$HOME/.gemini/skills"
    fi
fi

echo "🔧 Installing git-commit-ai skill for Gemini CLI..."
echo "   Mode: $([ "$PROJECT_MODE" == "true" ] && echo "Project-level" || echo "Global")"
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
        echo "✅ Cloned successfully"
    else
        echo "❌ Failed to clone repository"
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
        echo "✅ Downloaded successfully"
    else
        echo "❌ Failed to download"
        rm -rf "$TEMP_DIR"
        exit 1
    fi
fi

# Clean up
rm -rf "$INSTALL_DIR/$SKILL_NAME/.git" 2>/dev/null || true
rm -rf "$INSTALL_DIR/$SKILL_NAME/install" 2>/dev/null || true

echo ""
echo "✅ Installation complete!"
echo ""

if [[ "$PROJECT_MODE" == "true" ]]; then
    echo "📁 Project-level installation"
    echo "   This skill is available only in this project."
else
    echo "🏠 Global installation"
    echo "   This skill is available across all projects."
fi

echo ""
echo "🚀 Usage in Gemini CLI:"
echo "   /skill:git-commit-ai"
echo ""
echo "📖 Or use directly:"
echo "   node $INSTALL_DIR/$SKILL_NAME/scripts/git-commit-ai.js"
echo ""
