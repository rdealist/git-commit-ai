#!/bin/bash
#
# Universal Skill Installer for git-commit-ai
# Auto-detects AI agent and installs to appropriate directory
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.sh | bash
#

set -e

SKILL_NAME="git-commit-ai"
REPO_URL="${REPO_URL:-https://github.com/rdealist/git-commit-ai}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN[✓]${NC} $1"; }
log_warn() { echo -e "${YELLOW}[WARN]${NC} $1"; }
log_error() { echo -e "${RED}[✗]${NC} $1"; }

print_banner() {
    echo -e "${BLUE}"
    cat << 'EOF'
   _____ _ _     ____                      _ _   _
  / ____(_) |   |  _ \ ___  _ __ ___ ___  (_) |_(_) ___  _ __
 | |  __ _| |_  | |_) / _ \| '__/ __/ _ \ | | __| |/ _ \| '_ \
 | | |_ | | __| |  __/ (_) | | | (_|  __/ | | |_| | (_) | | | |
 | |__| | | |_  |_|   \___/|_|  \___\___| |_|\__|_|\___/|_| |_|
  \_____|_|\__| |_____|___ _ __ _ __ ___   __| | (_) ___ _ __
               |_   _/ _ \ '__| '_ ` _ \ / _` | | |/ _ \ '_ \
                 | ||  __/ |  | | | | | | (_| | | |  __/ | | |
                 |_| \___|_|  |_| |_| |_|\__,_| |_|\___|_| |_|

EOF
    echo -e "${NC}"
}

# Detect installed AI agents
detect_agents() {
    local agents=()
    
    if [ -d "$HOME/.claude" ] || command -v claude &> /dev/null; then
        agents+=("claude")
    fi
    
    if [ -d "$HOME/.kimi" ] || command -v kimi &> /dev/null; then
        agents+=("kimi")
    fi
    
    if [ -d "$HOME/.cursor" ] || [ -d "$HOME/Library/Application Support/Cursor" ]; then
        agents+=("cursor")
    fi
    
    if [ -d "$HOME/.aider" ] || command -v aider &> /dev/null; then
        agents+=("aider")
    fi
    
    echo "${agents[@]}"
}

# Get install directory for agent
get_install_dir() {
    local agent=$1
    case $agent in
        claude|kimi)
            echo "$HOME/.config/agents/skills"
            ;;
        cursor)
            echo "$HOME/.cursor/skills"
            ;;
        aider)
            echo "$HOME/.aider/skills"
            ;;
        *)
            echo "$HOME/.local/share/git-commit-ai"
            ;;
    esac
}

# Install skill
install_skill() {
    local agent=$1
    local install_dir=$(get_install_dir "$agent")
    
    log_info "Installing for $agent..."
    log_info "Target: $install_dir/$SKILL_NAME"
    
    # Create directory
    mkdir -p "$install_dir"
    
    # Remove old installation
    if [ -d "$install_dir/$SKILL_NAME" ]; then
        rm -rf "$install_dir/$SKILL_NAME"
    fi
    
    # Download
    local temp_dir=$(mktemp -d)
    if command -v git &> /dev/null; then
        git clone --depth 1 "$REPO_URL" "$temp_dir/$SKILL_NAME" 2>/dev/null
    else
        curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" | tar -xz -C "$temp_dir" --strip-components=1
        mv "$temp_dir" "$temp_dir/$SKILL_NAME"
    fi
    
    # Move to target
    rm -rf "$temp_dir/$SKILL_NAME/.git"
    rm -rf "$temp_dir/$SKILL_NAME/install"
    mv "$temp_dir/$SKILL_NAME" "$install_dir/"
    rm -rf "$temp_dir"
    
    log_success "Installed for $agent"
}

# Print usage instructions
print_usage() {
    local agent=$1
    local install_dir=$(get_install_dir "$agent")
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}              Installation Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    case $agent in
        claude)
            echo "🚀 Usage in Claude Code:"
            echo "   /skill:git-commit-ai"
            ;;
        kimi)
            echo "🚀 Usage in Kimi CLI:"
            echo "   /skill:git-commit-ai"
            ;;
        cursor)
            echo "📖 Usage in Cursor:"
            echo "   node $install_dir/$SKILL_NAME/scripts/git-commit-ai.js"
            echo ""
            echo "   (Cursor doesn't support /skill: natively)"
            ;;
        aider)
            echo "📖 Usage in Aider:"
            echo "   node $install_dir/$SKILL_NAME/scripts/git-commit-ai.js"
            ;;
    esac
    
    echo ""
    echo "📚 Documentation:"
    echo "   $install_dir/$SKILL_NAME/SKILL.md"
    echo ""
}

# Main
main() {
    print_banner
    
    log_info "Detecting AI agents..."
    local agents=($(detect_agents))
    
    if [ ${#agents[@]} -eq 0 ]; then
        log_warn "No AI agents detected."
        log_info "Installing standalone mode..."
        install_skill "standalone"
        print_usage "standalone"
        return
    fi
    
    log_info "Detected agents: ${agents[*]}"
    echo ""
    
    for agent in "${agents[@]}"; do
        install_skill "$agent"
    done
    
    # Print usage for first agent
    print_usage "${agents[0]}"
}

main
