@echo off
set ANTHROPIC_BASE_URL=https://api.deepseek.com/anthropic
set ANTHROPIC_AUTH_TOKEN=sk-e7e5f889411f410b90d56dda7d123bf5
set ANTHROPIC_MODEL=deepseek-v4-pro[1m]
set ANTHROPIC_DEFAULT_OPUS_MODEL=deepseek-v4-pro[1m]
set ANTHROPIC_DEFAULT_SONNET_MODEL=deepseek-v4-pro[1m]
set ANTHROPIC_DEFAULT_HAIKU_MODEL=deepseek-v4-flash
set CLAUDE_CODE_SUBAGENT_MODEL=deepseek-v4-flash
set CLAUDE_CODE_EFFORT_LEVEL=max
cd /d "C:\Users\cheuk\OneDrive\Desktop\AI-Development\Projects\pokertrainer"
claude -p "$(cat claude-ts-fix.md)" --max-turns 30 --allowedTools Read,Write,Bash --dangerously-skip-permissions
