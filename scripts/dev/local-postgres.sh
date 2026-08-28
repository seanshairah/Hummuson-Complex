#!/usr/bin/env bash
# Boots a local PostgreSQL 16 cluster for development.
# Safe to re-run: skips init if the cluster exists, starts it if stopped,
# and creates the `humuson` database + `humuson` role if missing.
#
# Connection string (matches .env.example):
#   postgresql://humuson:humuson@localhost:5432/humuson
set -euo pipefail

PG_BIN="${PG_BIN:-/usr/lib/postgresql/16/bin}"
PG_DATA="${PG_DATA:-/var/lib/humuson-pgdata}"
PG_PORT="${PG_PORT:-5432}"
PG_LOG="${PG_LOG:-/tmp/humuson-postgres.log}"

if [ ! -x "$PG_BIN/initdb" ]; then
  echo "PostgreSQL binaries not found at $PG_BIN. Install PostgreSQL 16 or set PG_BIN." >&2
  exit 1
fi

run_as_postgres() {
  if [ "$(id -u)" = "0" ]; then
    # initdb/postgres refuse to run as root.
    id postgres >/dev/null 2>&1 || useradd -r -s /bin/bash postgres
    su -s /bin/bash postgres -c "$1"
  else
    bash -c "$1"
  fi
}

if [ ! -f "$PG_DATA/PG_VERSION" ]; then
  mkdir -p "$PG_DATA"
  if [ "$(id -u)" = "0" ]; then
    id postgres >/dev/null 2>&1 || useradd -r -s /bin/bash postgres
    chown postgres "$PG_DATA"
  fi
  run_as_postgres "$PG_BIN/initdb -D '$PG_DATA' --auth=trust --no-instructions -E UTF8"
fi

if ! run_as_postgres "$PG_BIN/pg_ctl -D '$PG_DATA' status" >/dev/null 2>&1; then
  touch "$PG_LOG" && { [ "$(id -u)" != "0" ] || chown postgres "$PG_LOG"; }
  run_as_postgres "$PG_BIN/pg_ctl -D '$PG_DATA' -l '$PG_LOG' -o '-p $PG_PORT -c listen_addresses=localhost' start"
fi

run_as_postgres "$PG_BIN/psql -h localhost -p $PG_PORT -d postgres -tAc \"SELECT 1 FROM pg_roles WHERE rolname='humuson'\"" | grep -q 1 ||
  run_as_postgres "$PG_BIN/psql -h localhost -p $PG_PORT -d postgres -c \"CREATE ROLE humuson LOGIN SUPERUSER PASSWORD 'humuson'\""

run_as_postgres "$PG_BIN/psql -h localhost -p $PG_PORT -d postgres -tAc \"SELECT 1 FROM pg_database WHERE datname='humuson'\"" | grep -q 1 ||
  run_as_postgres "$PG_BIN/psql -h localhost -p $PG_PORT -d postgres -c \"CREATE DATABASE humuson OWNER humuson\""

echo "PostgreSQL ready on localhost:$PG_PORT — postgresql://humuson:humuson@localhost:$PG_PORT/humuson"
