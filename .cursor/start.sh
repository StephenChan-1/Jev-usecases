#!/usr/bin/env bash
# Cloud Agent start: bring up Docker + the local Supabase stack on every boot,
# then publish the connection env for the dev server. Idempotent.
set -euo pipefail

SUPA_DIR="$HOME/supabase-local"
ENV_FILE="$HOME/.jev-cases.env"

log() { echo "[start] $*"; }

# --- Docker daemon ---
log "starting Docker daemon"
sudo service docker start || true
for _ in $(seq 1 30); do
  if sudo docker info >/dev/null 2>&1; then break; fi
  sleep 1
done
sudo chmod 666 /var/run/docker.sock || true

# Same-bridge traffic must bypass the FORWARD chain (see install.sh).
sudo sysctl -w net.bridge.bridge-nf-call-iptables=0 net.bridge.bridge-nf-call-ip6tables=0 >/dev/null 2>&1 || true

# --- Local Supabase stack ---
log "starting local Supabase stack"
( cd "$SUPA_DIR" && supabase start )

# Wait for PostgREST (via Kong) to answer.
for _ in $(seq 1 60); do
  code="$(curl -s -o /dev/null -w '%{http_code}' "http://127.0.0.1:54321/rest/v1/" || true)"
  if [ "$code" != "000" ]; then break; fi
  sleep 1
done

# --- Derive the local service_role key from the stack's JWKS ---
log "deriving Supabase keys"
SERVICE_ROLE_KEY="$(node -e '
const {execSync}=require("child_process");
const c=require("crypto");
const raw=execSync("docker inspect supabase_rest_supabase-local -f \x27{{range .Config.Env}}{{println .}}{{end}}\x27").toString();
const line=raw.split("\n").find(l=>l.startsWith("PGRST_JWT_SECRET="));
const jwks=JSON.parse(line.slice("PGRST_JWT_SECRET=".length));
const secret=Buffer.from(jwks.keys.find(k=>k.kty==="oct").k,"base64url").toString("utf8");
const b64=(o)=>Buffer.from(JSON.stringify(o)).toString("base64url");
const h=b64({alg:"HS256",typ:"JWT"});
const p=b64({role:"service_role",iss:"supabase-demo",iat:1641769200,exp:1999999999});
const s=c.createHmac("sha256",secret).update(h+"."+p).digest("base64url");
process.stdout.write(h+"."+p+"."+s);
')"

cat > "$ENV_FILE" <<EOF
export SUPABASE_URL="http://127.0.0.1:54321"
export SUPABASE_SERVICE_ROLE_KEY="$SERVICE_ROLE_KEY"
EOF

log "Supabase ready at http://127.0.0.1:54321 (env written to $ENV_FILE)"
