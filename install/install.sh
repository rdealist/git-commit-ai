#!/bin/bash
#
# Universal Skill Installer for git-commit-ai
# Auto-detects AI agent and installs to appropriate directory
#
# Usage:
#   curl -fsSL https://raw.githubusercontent.com/rdealist/git-commit-ai/main/install/install.sh | bash
#
# Options:
#   --project          Install to current project (./.claude/skills, ./.kimi/skills, etc.)
#   --global           Install to user home
#   --agent <name>     Force specific agent (claude-code, codex, gemini-cli, kimi-cli, cursor, aider)
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_NAME="git-commit-ai"
REPO_URL="${REPO_URL:-https://github.com/rdealist/git-commit-ai}"

# Default mode
PROJECT_MODE=false
MODE_EXPLICIT=false
FORCE_AGENT=""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}[INFO]${NC} $1"; }
log_success() { echo -e "${GREEN}[✓]${NC} $1"; }
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

# Parse arguments
parse_args() {
    while [[ $# -gt 0 ]]; do
        case $1 in
            --project)
                PROJECT_MODE=true
                MODE_EXPLICIT=true
                shift
                ;;
            --global)
                PROJECT_MODE=false
                MODE_EXPLICIT=true
                shift
                ;;
            --agent)
                FORCE_AGENT="$2"
                shift 2
                ;;
            --help)
                show_help
                exit 0
                ;;
            *)
                shift
                ;;
        esac
    done
}

show_help() {
    cat << 'EOF'
Git Commit AI - Universal Installer

Usage: install.sh [OPTIONS]

Options:
  --project          Install to current project (./.claude/skills, etc.)
  --global           Install to user home directory
  --agent <name>     Force specific agent (claude-code, codex, gemini-cli, kimi-cli, cursor, aider)
  --help             Show this help message

Examples:
  # Interactive mode (recommended in terminal)
  ./install.sh

  # Install to current project
  ./install.sh --project

  # Install for specific agent
  ./install.sh --agent claude-code
  ./install.sh --agent codex
  ./install.sh --agent gemini-cli --project

EOF
}

# Detect agent installation directory
detect_agent_install_dir() {
    local agent=$1
    local project_mode=${2:-false}
    
    case $agent in
        claude-code|claude)
            if [[ "$project_mode" == "true" ]]; then
                echo ".claude/skills"
            else
                echo "$HOME/.claude/skills"
            fi
            ;;
        codex)
            if [[ "$project_mode" == "true" ]] && [[ -d ".codex" ]]; then
                echo ".codex/skills"
            elif [[ "$project_mode" == "true" ]]; then
                echo ".codex/skills"
            elif [[ -d "$HOME/.codex" ]]; then
                if [[ -d "$HOME/.codex/skills" ]]; then
                    echo "$HOME/.codex/skills"
                else
                    echo "$HOME/.codex"
                fi
            elif [[ -d "$HOME/.config/codex" ]]; then
                echo "$HOME/.config/codex/skills"
            else
                echo "$HOME/.config/codex/skills"
            fi
            ;;
        gemini|gemini-cli)
            if [[ "$project_mode" == "true" ]]; then
                echo ".gemini/skills"
            elif [[ -L "$HOME/.gemini/skills" ]]; then
                # Handle symlink (e.g., ~/.gemini/skills -> ~/.shared-skills)
                SYMLINK_TARGET=$(readlink "$HOME/.gemini/skills" 2>/dev/null || echo "")
                if [[ -n "$SYMLINK_TARGET" ]] && [[ ! -d "$SYMLINK_TARGET" ]]; then
                    mkdir -p "$SYMLINK_TARGET" 2>/dev/null || true
                fi
                echo "$HOME/.gemini/skills"
            else
                echo "$HOME/.gemini/skills"
            fi
            ;;
        kimi|kimi-cli)
            local candidates=()
            if [[ "$project_mode" == "true" ]]; then
                candidates=(
                    ".agents/skills"
                    ".kimi/skills"
                    ".claude/skills"
                    ".codex/skills"
                )
            else
                candidates=(
                    "$HOME/.config/agents/skills"
                    "$HOME/.agents/skills"
                    "$HOME/.kimi/skills"
                    "$HOME/.claude/skills"
                    "$HOME/.codex/skills"
                )
            fi

            local dir
            for dir in "${candidates[@]}"; do
                if [[ -d "$dir" ]]; then
                    echo "$dir"
                    return
                fi
            done

            echo "${candidates[0]}"
            ;;
        cursor)
            if [[ "$project_mode" == "true" ]] && [[ -d ".cursor" ]]; then
                echo ".cursor/skills"
            elif [[ "$project_mode" == "true" ]]; then
                echo ".cursor/skills"
            elif [[ -d "$HOME/.cursor" ]]; then
                echo "$HOME/.cursor/skills"
            else
                echo "$HOME/.cursor/skills"
            fi
            ;;
        aider)
            if [[ "$project_mode" == "true" ]] && [[ -d ".aider" ]]; then
                echo ".aider/skills"
            elif [[ "$project_mode" == "true" ]]; then
                echo ".aider/skills"
            elif [[ -d "$HOME/.aider" ]]; then
                echo "$HOME/.aider/skills"
            else
                echo "$HOME/.aider/skills"
            fi
            ;;
        *)
            if [[ "$project_mode" == "true" ]]; then
                echo ".ai-skills"
            else
                echo "$HOME/.local/share/git-commit-ai"
            fi
            ;;
    esac
}

# Detect all installed agents
detect_installed_agents() {
    local agents=()
    
    if [[ -d "$HOME/.claude" ]] || [[ -d "$HOME/.config/claude" ]] || command -v claude &> /dev/null; then
        agents+=("claude-code")
    fi
    
    if [[ -d "$HOME/.codex" ]] || [[ -d "$HOME/.config/codex" ]] || command -v codex &> /dev/null; then
        agents+=("codex")
    fi
    
    if [[ -d "$HOME/.gemini" ]] || [[ -d "$HOME/.config/gemini" ]] || command -v gemini &> /dev/null; then
        agents+=("gemini-cli")
    fi
    
    if [[ -d "$HOME/.kimi" ]] || [[ -d "$HOME/.config/kimi" ]] || command -v kimi &> /dev/null; then
        agents+=("kimi-cli")
    fi
    
    if [[ -d "$HOME/.cursor" ]] || [[ -d "$HOME/Library/Application Support/Cursor" ]]; then
        agents+=("cursor")
    fi
    
    if [[ -d "$HOME/.aider" ]] || command -v aider &> /dev/null; then
        agents+=("aider")
    fi
    
    echo "${agents[@]}"
}

# Check if current directory is a git repository
is_git_repo() {
    git rev-parse --git-dir &> /dev/null
}

# Get project root
get_project_root() {
    git rev-parse --show-toplevel 2>/dev/null || echo ""
}

# Select installation mode (project/global)
select_install_mode() {
    if [[ "$MODE_EXPLICIT" == "true" ]]; then
        log_info "Mode preset by flag: $( [[ "$PROJECT_MODE" == "true" ]] && echo "Project-level" || echo "Global" )"
        return
    fi

    local in_repo=false
    if is_git_repo; then
        in_repo=true
    fi

    if [[ -t 0 && -t 1 ]]; then
        echo ""
        log_info "Select installation mode:"

        if [[ "$in_repo" == "true" ]]; then
            echo "  1) Project-level (recommended)"
            echo "  2) Global"
            read -r -p "Choose [1/2] (default: 1): " choice

            case "$choice" in
                2|g|G|global|GLOBAL)
                    PROJECT_MODE=false
                    ;;
                *)
                    PROJECT_MODE=true
                    ;;
            esac
        else
            echo "  1) Global (recommended, current directory is not a git repository)"
            echo "  2) Project-level (requires git repository)"
            read -r -p "Choose [1/2] (default: 1): " choice

            case "$choice" in
                2|p|P|project|PROJECT)
                    log_error "Project-level installation requires being inside a git repository."
                    log_info "Run from a repository or use --global."
                    exit 1
                    ;;
                *)
                    PROJECT_MODE=false
                    ;;
            esac
        fi
    else
        if [[ "$in_repo" == "true" ]]; then
            PROJECT_MODE=true
            log_info "No mode flag provided; defaulting to project-level installation."
        else
            PROJECT_MODE=false
            log_info "No mode flag provided; defaulting to global installation."
        fi
    fi
}

# Install skill
install_skill() {
    local agent=$1
    local install_dir=$(detect_agent_install_dir "$agent" "$PROJECT_MODE")
    
    log_info "Installing for $agent..."
    log_info "Target: $install_dir/$SKILL_NAME"
    
    # Create directory
    mkdir -p "$install_dir"
    
    # Remove old installation
    if [ -d "$install_dir/$SKILL_NAME" ]; then
        log_info "Removing old installation..."
        rm -rf "$install_dir/$SKILL_NAME"
    fi
    
    # Download
    local temp_dir=$(mktemp -d)
    local source_dir=""
    
    if command -v git &> /dev/null; then
        log_info "Cloning repository..."
        if git clone --depth 1 "$REPO_URL" "$temp_dir/$SKILL_NAME" 2>/dev/null; then
            source_dir="$temp_dir/$SKILL_NAME"
        else
            log_error "Failed to clone repository"
            rm -rf "$temp_dir"
            return 1
        fi
    else
        log_info "Downloading archive..."
        local tarball="$temp_dir/git-commit-ai.tar.gz"
        if curl -fsSL "$REPO_URL/archive/refs/heads/main.tar.gz" -o "$tarball" 2>/dev/null; then
            tar -xzf "$tarball" -C "$temp_dir" --strip-components=1
            source_dir="$temp_dir"
        else
            log_error "Failed to download"
            rm -rf "$temp_dir"
            return 1
        fi
    fi
    
    # Install
    log_info "Installing files..."
    rm -rf "$source_dir/.git" 2>/dev/null || true
    rm -rf "$source_dir/install" 2>/dev/null || true
    
    cp -r "$source_dir" "$install_dir/$SKILL_NAME"
    rm -rf "$temp_dir"
    
    # Store scripts directory for hooks installation (absolute path)
    SKILL_SCRIPTS_DIR="$(cd "$install_dir/$SKILL_NAME/scripts" && pwd)"
    
    log_success "Installed for $agent"
}

# Install git hooks to a repository
install_hooks_to_repo() {
    local repo_dir="$1"
    local hooks_dir="$repo_dir/.git/hooks"
    
    if [[ ! -d "$repo_dir/.git" ]]; then
        return 1
    fi
    
    mkdir -p "$hooks_dir"
    
    local entry_script="$SKILL_SCRIPTS_DIR/git-commit-ai.js"
    if [[ ! -f "$entry_script" ]]; then
        log_warn "Skill script not found: $entry_script"
        return 1
    fi
    
    # Escape path for shell script
    local escaped_script="${entry_script//\\/\\\\}"
    escaped_script="${escaped_script//\"/\\\"}"
    
    # Create prepare-commit-msg hook
    cat > "$hooks_dir/prepare-commit-msg" << EOF
#!/bin/sh
# AI Commit Metadata Hook
# Generated by git-commit-ai skill

COMMIT_MSG_FILE=\$1
COMMIT_SOURCE=\$2
LEGACY_HOOK="\$0.legacy"

if [ -x "\$LEGACY_HOOK" ]; then
  "\$LEGACY_HOOK" "\$@"
fi

# Modify for regular commits and -m/-F commits (not merge, squash, etc.)
# COMMIT_SOURCE: empty=editor, message=-m/-F, merge=merge, squash=squash
case "\$COMMIT_SOURCE" in
  ""|message)
    NODE_BIN="\${NODE_BIN:-node}"
    "\$NODE_BIN" "$escaped_script" --hook-mode "\$COMMIT_MSG_FILE"
    ;;
  *)
    # Skip for merge, squash, template, etc.
    ;;
esac
EOF
    chmod +x "$hooks_dir/prepare-commit-msg"
    
    # Create commit-msg hook
    cat > "$hooks_dir/commit-msg" << EOF
#!/bin/sh
# AI Commit Gate Hook
# Generated by git-commit-ai skill

COMMIT_MSG_FILE=\$1
LEGACY_HOOK="\$0.legacy"

if [ -x "\$LEGACY_HOOK" ]; then
  "\$LEGACY_HOOK" "\$@"
fi

# Try to enrich first, then validate
NODE_BIN="\${NODE_BIN:-node}"
"\$NODE_BIN" "$escaped_script" --hook-mode "\$COMMIT_MSG_FILE"
"\$NODE_BIN" "$escaped_script" --validate-hook-mode "\$COMMIT_MSG_FILE"
EOF
    chmod +x "$hooks_dir/commit-msg"
    
    return 0
}

# Find all git repositories under a directory
find_git_repos() {
    local base_dir="$1"
    local repos=()
    
    # Check if base is a git repo
    if [[ -d "$base_dir/.git" ]]; then
        repos+=("$base_dir")
    fi
    
    # Find all .git directories (excluding .git/modules for submodules)
    while IFS= read -r gitdir; do
        local repo_root
        repo_root=$(dirname "$gitdir")
        # Skip submodule internal directories
        if [[ ! "$repo_root" == *"/.git/modules"* ]]; then
            repos+=("$repo_root")
        fi
    done < <(find "$base_dir" -name ".git" -type d 2>/dev/null | grep -v "/.git/modules/" || true)
    
    # Remove duplicates and sort
    printf '%s\n' "${repos[@]}" | sort -u
}

# Auto-install hooks for project and sub-repos
auto_install_hooks() {
    if [[ "$PROJECT_MODE" != "true" ]]; then
        return 0
    fi
    
    local project_root
    project_root=$(get_project_root)
    if [[ -z "$project_root" ]]; then
        return 0
    fi
    
    log_info "Auto-installing git hooks..."
    
    local repos
    repos=$(find_git_repos "$project_root")
    local count=0
    
    while IFS= read -r repo; do
        [[ -z "$repo" ]] && continue
        
        if install_hooks_to_repo "$repo"; then
            log_success "Installed hooks: ${repo#$project_root/}"
            ((count++))
        fi
    done <<< "$repos"
    
    if [[ $count -gt 0 ]]; then
        echo ""
        log_success "Git hooks installed to $count repository(s)"
        # Set AI policy to auto
        git config commitai.aiInfoPolicy auto 2>/dev/null || true
    fi
    
    echo ""
}

# Print usage instructions
print_usage() {
    local agent=$1
    local install_dir=$(detect_agent_install_dir "$agent" "$PROJECT_MODE")
    
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}              Installation Complete!${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
    echo ""
    
    if [[ "$PROJECT_MODE" == "true" ]]; then
        echo "📁 Project-level installation"
        echo "   Location: $install_dir/$SKILL_NAME"
        echo ""
        echo "🚀 This skill is available only in this project."
    else
        echo "🏠 Global installation"
        echo "   Location: $install_dir/$SKILL_NAME"
        echo ""
        echo "🚀 This skill is available across all projects."
    fi
    
    echo ""
    
    case $agent in
        claude-code)
            echo "Usage in Claude Code:"
            echo "   /skill:git-commit-ai"
            ;;
        codex)
            echo "Usage in Codex:"
            echo "   /skill:git-commit-ai"
            ;;
        gemini-cli)
            echo "Usage in Gemini CLI:"
            echo "   /skill:git-commit-ai"
            ;;
        kimi-cli)
            echo "Usage in Kimi CLI:"
            echo "   /skill:git-commit-ai"
            ;;
        cursor)
            echo "Usage in Cursor:"
            echo "   node $install_dir/$SKILL_NAME/scripts/git-commit-ai.js"
            echo ""
            echo "   (Cursor doesn't support /skill: natively)"
            ;;
        aider)
            echo "Usage in Aider:"
            echo "   node $install_dir/$SKILL_NAME/scripts/git-commit-ai.js"
            ;;
        *)
            echo "Usage:"
            echo "   node $install_dir/$SKILL_NAME/scripts/git-commit-ai.js"
            ;;
    esac
    
    echo ""
    echo "📚 Documentation:"
    echo "   $install_dir/$SKILL_NAME/SKILL.md"
    echo ""
    
    if [[ "$PROJECT_MODE" == "true" ]]; then
        echo "💡 To make this skill available globally, run:"
        echo "   $(basename "$0") --global"
    fi
    
    echo ""
}

# Main
main() {
    parse_args "$@"
    print_banner
    select_install_mode

    log_info "Mode: $( [[ "$PROJECT_MODE" == "true" ]] && echo "Project-level" || echo "Global" )"
    
    # Check project mode requirements
    if [[ "$PROJECT_MODE" == "true" ]]; then
        if ! is_git_repo; then
            log_error "Project mode requires being in a git repository."
            log_info "Either run in a git repo or use --global"
            exit 1
        fi
        
        log_info "Project mode enabled"
        log_info "Project root: $(get_project_root)"
    fi
    
    # Detect or use forced agent
    local agents=()
    if [[ -n "$FORCE_AGENT" ]]; then
        agents+=("$FORCE_AGENT")
        log_info "Using forced agent: $FORCE_AGENT"
    else
        log_info "Detecting AI agents..."
        agents=($(detect_installed_agents))
    fi
    
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
    
    # Auto-install git hooks for project mode
    auto_install_hooks
    
    # Print usage for first agent
    print_usage "${agents[0]}"
}

main "$@"
