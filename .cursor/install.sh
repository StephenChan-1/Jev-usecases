#!/usr/bin/env bash
# Cloud Agent install: prepare the VM so the Jev use-cases app can run fully
# offline against a local Supabase stack. Idempotent; safe to re-run.
set -euo pipefail

REPO_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
SUPA_DIR="$HOME/supabase-local"
ARCH="$(dpkg --print-architecture)"

log() { echo "[install] $*"; }

# --- System packages: Docker + fuse-overlayfs (needed by the Supabase stack) ---
if ! command -v docker >/dev/null 2>&1; then
  log "installing Docker"
  curl -fsSL https://get.docker.com -o /tmp/get-docker.sh
  sudo sh /tmp/get-docker.sh
fi

if ! command -v fuse-overlayfs >/dev/null 2>&1; then
  log "installing fuse-overlayfs"
  sudo DEBIAN_FRONTEND=noninteractive apt-get update -y
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y \
    -o Dpkg::Options::=--force-confold fuse-overlayfs
fi

# --- Supabase CLI ---
if ! command -v supabase >/dev/null 2>&1; then
  log "installing Supabase CLI"
  curl -fsSL "https://github.com/supabase/cli/releases/latest/download/supabase_linux_${ARCH}.tar.gz" \
    -o /tmp/supabase.tar.gz
  tar -xzf /tmp/supabase.tar.gz -C /tmp
  sudo mv /tmp/supabase /usr/local/bin/supabase
fi

# --- Docker daemon config for a nested VM ---
# fuse-overlayfs storage driver + a reduced MTU for the encapsulated network.
log "configuring Docker daemon"
sudo mkdir -p /etc/docker
printf '%s\n' '{"storage-driver":"fuse-overlayfs","mtu":1400,"default-network-opts":{"bridge":{"com.docker.network.driver.mtu":"1400"}}}' \
  | sudo tee /etc/docker/daemon.json >/dev/null

# Docker 29 defaults to the nft backend, but this kernel enforces the legacy
# iptables tables. Point iptables at the legacy backend so Docker's rules apply.
sudo update-alternatives --set iptables /usr/sbin/iptables-legacy >/dev/null 2>&1 || true
sudo update-alternatives --set ip6tables /usr/sbin/ip6tables-legacy >/dev/null 2>&1 || true

# Let same-bridge container-to-container traffic bypass the FORWARD chain
# (otherwise the default DROP policy blocks Postgres <-> PostgREST).
printf 'net.bridge.bridge-nf-call-iptables=0\nnet.bridge.bridge-nf-call-ip6tables=0\n' \
  | sudo tee /etc/sysctl.d/99-jev-bridge.conf >/dev/null

# Allow the runtime user to talk to Docker without sudo.
sudo usermod -aG docker "$USER" || true

# --- Node dependencies ---
log "installing npm dependencies"
cd "$REPO_DIR"
if [ -f package-lock.json ]; then
  npm ci
else
  npm install
fi

# --- Scaffold a local Supabase project (kept outside the repo) ---
log "scaffolding local Supabase project at $SUPA_DIR"
mkdir -p "$SUPA_DIR"
if [ ! -f "$SUPA_DIR/supabase/config.toml" ]; then
  ( cd "$SUPA_DIR" && supabase init --workdir . >/dev/null 2>&1 || true )
  # Trim to the services the app actually uses (Postgres + PostgREST/Kong).
  cfg="$SUPA_DIR/supabase/config.toml"
  python3 - "$cfg" <<'PY'
import re, sys
path = sys.argv[1]
text = open(path).read()
disable = {"realtime","studio","local_smtp","storage","auth","edge_runtime","analytics"}
out, section = [], None
for line in text.splitlines():
    m = re.match(r'\s*\[([a-zA-Z0-9_.]+)\]\s*$', line)
    if m:
        section = m.group(1)
    elif section in disable and re.match(r'\s*enabled\s*=\s*true\s*$', line):
        line = line.replace("true", "false")
        section = None  # only flip the first 'enabled' in the section
    out.append(line)
open(path, "w").write("\n".join(out) + "\n")
PY
fi

# Mirror schema.sql into a migration (filename must not be literally "init",
# which the CLI skips).
mkdir -p "$SUPA_DIR/supabase/migrations"
cp "$REPO_DIR/schema.sql" "$SUPA_DIR/supabase/migrations/00000000000000_schema.sql"

# --- Warm the Docker image cache so future boots start quickly ---
log "starting Docker and pre-pulling Supabase images"
sudo service docker start || true
sleep 3
sudo chmod 666 /var/run/docker.sock || true
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true

( cd "$SUPA_DIR" && supabase start ) || true
# Stop without keeping a DB backup so every boot initializes cleanly and the
# app reseeds from data/cases.json.
( cd "$SUPA_DIR" && supabase stop --no-backup ) || true

log "install complete"
