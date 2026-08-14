#!/usr/bin/env bash
# One-time preparation of a fresh Oracle Cloud VM (Ubuntu 22.04 / 24.04) for BankRate TJ.
# Run it once, as the default "ubuntu" user, on the instance itself:
#
#   bash oracle-setup.sh
#
# It is safe to re-run: every step checks before acting.

set -euo pipefail

APP_DIR=/opt/bankrate
DATA_DIR="$APP_DIR/data"

echo "==> Updating package lists"
sudo apt-get update -y

echo "==> Installing Docker, nginx and certbot"
if ! command -v docker >/dev/null 2>&1; then
  sudo apt-get install -y ca-certificates curl gnupg
  sudo install -m 0755 -d /etc/apt/keyrings
  curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
  sudo chmod a+r /etc/apt/keyrings/docker.gpg
  echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(. /etc/os-release && echo "$VERSION_CODENAME") stable" \
    | sudo tee /etc/apt/sources.list.d/docker.list >/dev/null
  sudo apt-get update -y
  sudo apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin
  sudo usermod -aG docker "$USER"
  echo "    Docker installed. Log out and back in for group membership to take effect."
fi

sudo apt-get install -y nginx certbot python3-certbot-nginx

echo "==> Creating $APP_DIR"
sudo mkdir -p "$DATA_DIR"
sudo chown -R "$USER:$USER" "$APP_DIR"

# Oracle Cloud is the classic "I opened the port and it still does not work" case, because there
# are TWO firewalls in front of the instance and both must allow traffic:
#   1. the VCN Security List / Network Security Group, edited in the web console (see deploy/README.md)
#   2. the instance's own iptables rules, which Oracle's images pre-populate to drop everything
#      except SSH — that is what this section fixes.
echo "==> Opening HTTP/HTTPS on the instance firewall"
if command -v netfilter-persistent >/dev/null 2>&1 || dpkg -l | grep -q iptables-persistent; then
  sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT || true
  sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT || true
  sudo netfilter-persistent save || true
else
  sudo DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
  sudo iptables -I INPUT 5 -p tcp --dport 80 -j ACCEPT || true
  sudo iptables -I INPUT 6 -p tcp --dport 443 -j ACCEPT || true
  sudo netfilter-persistent save || true
fi

echo
echo "==> Done."
echo "Next:"
echo "  1. Open ports 80 and 443 in the VCN Security List in the Oracle web console."
echo "     Without that step the server is unreachable no matter what runs on it."
echo "  2. Point your domain's A record at this machine's public IP."
echo "  3. Copy the project here and run deploy/deploy.sh"
