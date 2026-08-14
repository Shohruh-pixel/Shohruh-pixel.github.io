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
  cat > "$ENV_FILE" <<EOF
NODE_ENV=production
PORT=8080
DATABASE_URL=file:/data/bankrate.db
ADMIN_KEY=$ADMIN_KEY
SCRAPE_INTERVAL_MINUTES=15

# Set these to your real domain before going live: they drive canonical URLs, the sitemap and
# CORS. Leaving the placeholder means search engines index links that point nowhere.
PUBLIC_URL=https://example.tj
CLIENT_URL=https://example.tj
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
