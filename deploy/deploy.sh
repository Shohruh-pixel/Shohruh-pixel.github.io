#!/usr/bin/env bash
# Build and (re)start BankRate TJ on the server. Re-run this after every code change.
#
#   cd /opt/bankrate/KurstjX && bash deploy/deploy.sh
#
# Configuration comes from /opt/bankrate/app.env, which this script creates on first run with a
# freshly generated admin key. Edit that file to set your real domain, then re-run.

set -euo pipefail

APP_DIR=/opt/bankrate
DATA_DIR="$APP_DIR/data"
ENV_FILE="$APP_DIR/app.env"
IMAGE=bankrate-tj
CONTAINER=bankrate-tj

mkdir -p "$DATA_DIR"

if [ ! -f "$ENV_FILE" ]; then
  echo "==> First run: creating $ENV_FILE"
  # Generated rather than prompted, so a weak or reused key never becomes the default.
  ADMIN_KEY=$(head -c 24 /dev/urandom | base64 | tr -d '=+/' | cut -c1-32)

  # Default to the machine's own public address rather than a placeholder domain. These values go
  # into canonical links and the sitemap, and an unreachable placeholder there is worse than a
  # plain IP: it publishes URLs that point nowhere. Oracle's instance metadata service is the
  # authoritative answer and needs no outside call; a public echo service is the fallback for
  # other hosts, and a loopback default keeps the script working with no network at all.
  PUBLIC_IP=$(curl -fsS --max-time 3 -H 'Authorization: Bearer Oracle' \
    http://169.254.169.254/opc/v2/vnics/ 2>/dev/null | grep -o '"publicIp"[^,]*' | head -1 | cut -d'"' -f4)
  [ -n "$PUBLIC_IP" ] || PUBLIC_IP=$(curl -fsS --max-time 5 https://api.ipify.org 2>/dev/null || true)
  [ -n "$PUBLIC_IP" ] || PUBLIC_IP=127.0.0.1

  BASE_URL="http://$PUBLIC_IP"
  echo "    Base URL detected as $BASE_URL"

  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=file:/data/bankrate.db
ADMIN_KEY=$ADMIN_KEY
SCRAPE_INTERVAL_MINUTES=15

# Drives canonical URLs, the sitemap and CORS. Currently the machine's bare public address, which
# is correct for the pre-domain phase. The moment a domain points here, change BOTH lines to
# https://your-domain and re-run this script — otherwise the site keeps advertising the IP to
# search engines and every indexed link becomes wrong when the address changes.
PUBLIC_URL=$BASE_URL
CLIENT_URL=$BASE_URL
EOF
  chmod 600 "$ENV_FILE"
  echo "    Admin key written to $ENV_FILE (chmod 600). Keep it private."
fi

echo "==> Building image"
docker build -t "$IMAGE" .

echo "==> Restarting container"
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
docker run -d \
  --name "$CONTAINER" \
  --restart unless-stopped \
  --env-file "$ENV_FILE" \
  -v "$DATA_DIR:/data" \
  -p 127.0.0.1:8080:8080 \
  "$IMAGE"

echo "==> Waiting for health check"
for i in $(seq 1 30); do
  if curl -fsS http://127.0.0.1:8080/api/health >/dev/null 2>&1; then
    echo "    healthy after ${i}s"
    docker logs --tail 20 "$CONTAINER"
    exit 0
  fi
  sleep 1
done

echo "!! Did not become healthy in 30s. Recent logs:"
docker logs --tail 40 "$CONTAINER"
exit 1
