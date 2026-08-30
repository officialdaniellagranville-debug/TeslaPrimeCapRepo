#!/bin/bash
# TeslaEquity Rebranding Script
# Replaces all Tesla Prime Capital references with TeslaEquity
# while preserving the existing codebase structure.

set -e

PROJECT_DIR="/home/z/my-project-teslaequity"

# Files to skip (don't rebrand)
SKIP_DIRS=(
  "node_modules"
  ".git"
  ".next"
  "download/patches"
  "download/phase2-docs"
)

echo "=== TeslaEquity Rebranding Started ==="
echo ""

# Build find prune args
PRUNE_ARGS=""
for d in "${SKIP_DIRS[@]}"; do
  PRUNE_ARGS="$PRUNE_ARGS -path './$d' -prune -o"
done

# Track replacements
TOTAL_REPLACEMENTS=0
FILES_CHANGED=0

# Function to do safe find-replace in a file
do_replace() {
  local file="$1"
  local search="$2"
  local replace="$3"
  local desc="$4"
  
  if [ ! -f "$file" ]; then
    return 0
  fi
  
  if grep -qF "$search" "$file"; then
    local count=$(grep -oF "$search" "$file" | wc -l)
    # Use perl for safe in-place replacement (handles special chars better than sed)
    perl -i -pe "s/\Q$search\E/$replace/g" "$file"
    echo "  ✏️  $file: $count occurrence(s) of \"$desc\""
    TOTAL_REPLACEMENTS=$((TOTAL_REPLACEMENTS + count))
    FILES_CHANGED=$((FILES_CHANGED + 1))
  fi
}

# Process all source files
process_file() {
  local file="$1"
  
  # Case-sensitive replacements
  do_replace "$file" "Tesla Prime Capital" "TeslaEquity" "Tesla Prime Capital → TeslaEquity"
  do_replace "$file" "TESLA PRIME CAPITAL" "TESLA EQUITY" "TESLA PRIME CAPITAL → TESLA EQUITY"
  do_replace "$file" "Tesla Prime" "Tesla Equity" "Tesla Prime → Tesla Equity"
  do_replace "$file" "tesla-prime-capital" "teslaequity" "tesla-prime-capital → teslaequity"
  do_replace "$file" "tesla-prime" "tesla-equity" "tesla-prime → tesla-equity"
  do_replace "$file" "teslaprimecap" "teslaequity" "teslaprimecap → teslaequity"
  do_replace "$file" "teslaprimecapital" "teslaequity" "teslaprimecapital → teslaequity"
  do_replace "$file" "TeslaPrimeCapital" "TeslaEquity" "TeslaPrimeCapital → TeslaEquity"
  do_replace "$file" "TeslaPrime" "TeslaEquity" "TeslaPrime → TeslaEquity"
  do_replace "$file" "tesla-prime-support" "tesla-equity-support" "tesla-prime-support → tesla-equity-support"
}

# Find all text files (skip binary)
echo "→ Scanning source files..."
find "$PROJECT_DIR" \
  -type d \( -name node_modules -o -name .git -o -name .next -o -name patches -o -name phase2-docs \) -prune -o \
  -type f \( \
    -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \
    -o -name "*.json" -o -name "*.md" -o -name "*.mdx" \
    -o -name "*.css" -o -name "*.html" \
    -o -name "*.sh" -o -name "*.yml" -o -name "*.yaml" \
    -o -name ".env*" -o -name "Dockerfile" \
    -o -name "*.txt" \
  \) -print | while read file; do
    process_file "$file"
  done

echo ""
echo "=== Rebranding Complete ==="
echo "Total files changed: $FILES_CHANGED"
echo "Total replacements: $TOTAL_REPLACEMENTS"
