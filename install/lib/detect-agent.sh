#!/bin/bash
#
# Agent Detection Library
# Detects AI agent installation locations and types
#

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
            elif [[ -d "$HOME/.cursor" ]]; then
                echo "$HOME/.cursor/skills"
            else
                echo "$HOME/.cursor/skills"
            fi
            ;;
        aider)
            if [[ "$project_mode" == "true" ]] && [[ -d ".aider" ]]; then
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
