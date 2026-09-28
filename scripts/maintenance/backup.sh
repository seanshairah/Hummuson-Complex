#!/usr/bin/env bash
#
# Takes a complete, restorable copy of the database to a local file.
#
# Neon's point-in-time recovery is the first line of defence, but it is a
# feature of the platform holding the data — it does not help if the account
# is lost, if the project is deleted, or if the retention window has already
# passed when the problem is noticed. This is the independent copy.
#
#   ./scripts/maintenance/backup.sh                   # uses DATABASE_URL
#   ./scripts/maintenance/backup.sh /path/to/dir      # writes elsewhere
#
# Needs direct Postgres access (port 5432). Neon's pooled connection string
# will not do: pg_dump needs a session, not a pooled transaction. Use the
# unpooled string from the Neon console — the one without "-pooler".
#
# The file it writes contains password hashes and TOTP secrets. It is exactly
# as sensitive as the database. Store it accordingly.
set -euo pipefail

if [[ -z "${DATABASE_URL:-}" ]]; then
  if [[ -f .env ]]; then
    DATABASE_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'"'')"
  fi
fi
if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is not set." >&2
  exit 1
fi

DIR="${1:-backups}"
mkdir -p "$DIR"
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
FILE="$DIR/humuson-$STAMP.dump"

echo "Dumping to $FILE …"
pg_dump --format=custom --no-owner --no-privileges --file="$FILE" "$DATABASE_URL"

SIZE="$(du -h "$FILE" | cut -f1)"
echo "Wrote $FILE ($SIZE)"
echo
echo "Restore it into an empty database with:"
echo "  pg_restore --clean --if-exists --no-owner --no-privileges -d \"\$TARGET_URL\" $FILE"
echo
echo "A backup nobody has restored is a hypothesis. docs/RUNBOOK.md has the drill."
