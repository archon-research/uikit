#!/usr/bin/env sh
# Generate shell wrapper for CLI with --preserve-symlinks support

set -e

WRAPPER_FILE="dist/cli.sh"

cat > "$WRAPPER_FILE" << 'EOF'
#!/usr/bin/env sh
# Use --preserve-symlinks to fix ES module resolution with npm link
# Follow symlink to find the actual script location
if [ -L "$0" ]; then
  SCRIPT="$(readlink -f "$0" 2>/dev/null || readlink "$0")"
else
  SCRIPT="$0"
fi
SCRIPT_DIR="$(cd "$(dirname "$SCRIPT")" && pwd)"
exec node --preserve-symlinks "$SCRIPT_DIR/cli.js" "$@"
EOF

chmod +x "$WRAPPER_FILE"

echo "Created wrapper at $WRAPPER_FILE"
