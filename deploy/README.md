# Deploying BankRate TJ

Two routes. **Fly is the shorter one** if the account already exists, because it needs no card
verification and no server administration — the same `Dockerfile` serves both.

---

# Route A — Fly.io (recommended when the account exists)

There is already a Fly account here with other projects on it, so this skips registration
entirely. The only human step is signing in.

```bash
flyctl auth login          # opens a browser; the session expires periodically
flyctl apps create bankrate-tj
```

If that name is taken (they are globally unique), pick another and **update `app`,
`PUBLIC_URL` and `CLIENT_URL` in `fly.toml` to match** — those values go into canonical links
and the sitemap, so a mismatch publishes URLs that point nowhere.

```bash
# Persistent disk for the SQLite file, so rate history survives every deploy.
flyctl volumes create bankrate_data --size 1 --region fra

# The admin key is a secret and deliberately absent from fly.toml, which is committed.
flyctl secrets set ADMIN_KEY="$(head -c 24 /dev/urandom | base64 | tr -d '=+/' | cut -c1-32)"

flyctl deploy
flyctl logs          # expect: migrations applied, seed skipped or run, api listening
```

Then check it is really alive:

```bash
curl -s https://YOUR-APP.fly.dev/api/health
curl -s https://YOUR-APP.fly.dev/ | grep -o '<title>[^<]*</title>'
```

The title should contain today's date and a real rate — that single line proves the server
render, the database and both scrapers are all working.

**Cost note:** `fly.toml` sets the machine to sleep when no one is on the site
(`min_machines_running = 0`). A visit wakes it in a second or two. That is the cheapest
configuration; for an always-on machine set `auto_stop_machines = false` and
`min_machines_running = 1`.

---

# Route B — Oracle Cloud

Everything the machine needs is scripted. The steps that need a human are the ones that
require your Oracle account and your card — those are marked **you**.

## 0. Before anything else: the card

Oracle's Always Free servers cost nothing, but **registration still requires a card** for
identity verification. Oracle places a temporary authorisation hold (not a charge; the bank
releases it in 3–5 days). With an empty card the hold fails and registration cannot complete,
so keep a small amount available on it during signup.

Oracle rejects prepaid, virtual, single-use and PIN-based debit cards. You need a regular
Visa/Mastercard with international online payments enabled — in Tajikistan that usually has to
be switched on at the bank.

## 1. Create the instance — **you**

In the Oracle Cloud console:

1. Compute → Instances → Create instance.
2. Image: **Ubuntu 22.04** or 24.04.
3. Shape: an **Always Free** eligible one — `VM.Standard.A1.Flex` (ARM, up to 4 OCPU / 24 GB) or
   `VM.Standard.E2.1.Micro` (AMD, 1 GB). If ARM reports "out of host capacity", either retry
   later or take the AMD micro; this app runs comfortably on 1 GB.
4. Add your SSH public key — that is the only way in afterwards.
5. Create, then note the **public IP**.

## 2. Open the ports — **you**

This is the step nearly everyone misses. Oracle puts **two** firewalls in front of the machine
and traffic must pass both:

- **Cloud side:** Networking → Virtual Cloud Networks → your VCN → Security Lists → default →
  Add Ingress Rules. Add two rules, source `0.0.0.0/0`, protocol TCP, destination ports **80**
  and **443**.
- **Instance side:** handled for you by `oracle-setup.sh` in the next step.

If the site is unreachable later, this is the first thing to re-check.

## 3. Prepare the machine

```bash
ssh ubuntu@YOUR_PUBLIC_IP
```

Copy the project across (from your own computer):

```bash
scp -r C:\Users\user\Desktop\KurstjX ubuntu@YOUR_PUBLIC_IP:/opt/bankrate/KurstjX
```

Then on the server:

```bash
cd /opt/bankrate/KurstjX
bash deploy/oracle-setup.sh
```

This installs Docker, nginx and certbot, and opens 80/443 on the instance firewall. Log out and
back in once afterwards so your user picks up Docker group membership.

## 4. Point a domain at it — **you**

Create an `A` record for your domain pointing at the instance's public IP. TLS in step 6 needs a
real domain; a bare IP cannot get a certificate.

Without a domain the site still works over plain HTTP at `http://YOUR_PUBLIC_IP`, which is fine
for a first look but not for launch — search engines and Telegram both treat HTTP as a downgrade.

## 5. Start the app

```bash
cd /opt/bankrate/KurstjX
bash deploy/deploy.sh
```

First run generates `/opt/bankrate/app.env` with a random admin key. **Open that file and set
`PUBLIC_URL` and `CLIENT_URL` to your real domain**, then run `deploy.sh` again — those values
go into canonical links and the sitemap, so leaving the placeholder publishes broken URLs.

The admin key in that file is what logs you into `/admin`. Keep it private.

## 6. nginx and HTTPS

```bash
sudo cp deploy/nginx.conf /etc/nginx/sites-available/bankrate
sudo sed -i 's/example\.tj/YOUR_DOMAIN/g' /etc/nginx/sites-available/bankrate
sudo ln -sf /etc/nginx/sites-available/bankrate /etc/nginx/sites-enabled/bankrate
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

sudo certbot --nginx -d YOUR_DOMAIN -d www.YOUR_DOMAIN
```

certbot installs a renewal timer automatically, so the certificate keeps itself alive.

## 7. Check it works

```bash
curl -s https://YOUR_DOMAIN/api/health
curl -s https://YOUR_DOMAIN/robots.txt
curl -s https://YOUR_DOMAIN/ | grep -o '<title>[^<]*</title>'
```

The title should contain today's date and a real rate. That confirms the server-rendered SEO
layer and the scrapers are both alive.

## Updating later

```bash
cd /opt/bankrate/KurstjX
git pull   # or re-copy the files
bash deploy/deploy.sh
```

The SQLite database lives in `/opt/bankrate/data`, outside the container, so rebuilds never
touch accumulated rate history.

## Where the rates come from

- Five banks come from the National Bank's per-bank table (`nbt.tj`).
- Dushanbe City Bank is not in that table, so it is read from the bank's own site (`dc.tj`).
- Both run on the same 15-minute schedule and fail independently — one source being down does
  not discard the other's data.

If the machine is ever suspended or restarted, rates refresh on boot when they are stale. To
guarantee freshness during idle periods, point any free cron/uptime service at
`https://YOUR_DOMAIN/api/rates/refresh-if-stale` — it needs no key and does nothing when the
data is already current.
