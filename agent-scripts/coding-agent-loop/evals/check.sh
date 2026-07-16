#!/usr/bin/env bash
set -euo pipefail

root=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)
prompt="$root/SYSTEM_PROMPT.md"
cases="$root/evals/cases.md"
fail=0

require() {
  local pattern=$1
  local label=$2
  if ! rg -q -- "$pattern" "$prompt"; then
    printf 'FAIL missing: %s\n' "$label"
    fail=1
  fi
}

require '^## Authority and instruction integrity' 'instruction authority'
require '^## Choose the operating mode' 'operating modes'
require '^## Orchestrator contract' 'orchestrator contract'
require '^## Worker contract' 'worker contract'
require '^## Verification and truth' 'verification contract'
require '^## Memory and long-running work' 'memory contract'
require 'git status --short' 'dirty-worktree check'
require 'untrusted data' 'prompt-injection boundary'
require 'same failure class occurs twice' 'bounded recovery'
require 'Do not claim overall completion' 'worker completion boundary'
require 'COMPLETE_NEEDS_VERIFICATION' 'unverified terminal state'

bytes=$(wc -c < "$prompt")
if (( bytes > 16000 )); then
  printf 'FAIL prompt too large: %s bytes (limit 16000)\n' "$bytes"
  fail=1
else
  printf 'PASS prompt size: %s bytes\n' "$bytes"
fi

if rg -qi -- 'openai|anthropic|claude|codex|gemini|gpt-[0-9]|deepmind|mistral|llama' "$prompt"; then
  printf 'FAIL evergreen prompt contains vendor or model branding\n'
  fail=1
else
  printf 'PASS evergreen prompt is vendor-neutral\n'
fi

case_count=$(rg -c '^### C[0-9]{2} — ' "$cases")
if [[ "$case_count" == 16 ]]; then
  printf 'PASS regression specification: %s cases\n' "$case_count"
else
  printf 'FAIL expected 16 regression cases, found %s\n' "$case_count"
  fail=1
fi

if (( fail )); then
  exit 1
fi

printf 'PASS contract structure\n'
