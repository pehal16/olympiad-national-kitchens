#!/usr/bin/env bash
set -euo pipefail
release_archive="$1"
revision="$2"
[[ "$revision" =~ ^[a-f0-9]{40}$ ]]
test "$(id -u)" = 0
test "$(uname -m)" = x86_64
base=/srv/olympiad-constructor
if [ -d "$base" ] && [ ! -f "$base/.constructor-owned" ]; then
  echo 'Existing directory has no ownership marker; installation stopped.' >&2; exit 1
fi
available=$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)
disk=$(df -Pm / | awk 'NR==2{print $4}')
test "$available" -ge 1400
test "$disk" -ge 2500
install -d -m 755 "$base" "$base/releases"
touch "$base/.constructor-owned"
release="$base/releases/$revision"
if [ -e "$release" ]; then echo 'Release directory already exists; use a new revision.' >&2; exit 1; fi
install -d -m 755 "$release"
tar -xzf "$release_archive" -C "$release" --no-same-owner
node="$release/runtime/node"
test -x "$node"
browser=$(find "$release/browser" -name chrome-headless-shell -type f | head -n 1)
test -x "$browser"
# Install only absent OS libraries required by Chromium; never upgrade unrelated packages.
if ldd "$browser" | grep -q 'not found'; then
  apt-get update -qq
  apt-get install -y --no-upgrade --no-install-recommends libnss3 libnspr4 libatk1.0-0t64 libatk-bridge2.0-0t64 libatspi2.0-0t64 libdbus-1-3 libcups2t64 libdrm2 libxkbcommon0 libxcomposite1 libxdamage1 libxfixes3 libxrandr2 libgbm1 libasound2t64 libpango-1.0-0 libcairo2 libglib2.0-0t64 libx11-6 libxcb1 libxext6
fi
if ldd "$browser" | grep -q 'not found'; then echo 'Chromium libraries unavailable; installation stopped.' >&2; exit 1; fi
id olympiad-constructor >/dev/null 2>&1 || useradd --system --home-dir "$base" --shell /usr/sbin/nologin olympiad-constructor
canary_data="$base/acceptance/$revision"
install -d -o olympiad-constructor -g olympiad-constructor -m 700 "$canary_data"
cat > /etc/systemd/system/olympiad-constructor-canary.service <<UNIT
[Unit]
Description=Isolated constructor acceptance service
After=network.target
[Service]
User=olympiad-constructor
Group=olympiad-constructor
WorkingDirectory=$release
Environment=CONSTRUCTOR_STORAGE=$canary_data
Environment=CONSTRUCTOR_ASSET_ROOT=$release/dist/client
Environment=CONSTRUCTOR_CHROMIUM=$browser
Environment=CONSTRUCTOR_HOST=127.0.0.1
Environment=CONSTRUCTOR_PORT=3211
ExecStart=$node $release/dist/server.cjs
MemoryMax=900M
MemoryHigh=800M
CPUQuota=100%
TasksMax=128
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$canary_data
Restart=on-failure
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
cleanup_canary(){ systemctl stop olympiad-constructor-canary || true; }
trap cleanup_canary EXIT
systemctl start olympiad-constructor-canary
for attempt in $(seq 1 60); do curl -fsS http://127.0.0.1:3211/api/constructor/v1/health >/dev/null && break; sleep 1; done
curl -fsS http://127.0.0.1:3211/api/constructor/v1/health >/dev/null
"$node" "$release/ops/bootstrap-owner.cjs" http://127.0.0.1:3211 "$canary_data"
cd "$release"
export CONSTRUCTOR_CHROMIUM="$browser"
"$node" ops/run-acceptance.cjs load "$canary_data/owner-access.private.json" http://127.0.0.1:3211 "$canary_data/load-report.json"
"$node" ops/run-acceptance.cjs verify "$canary_data/owner-access.private.json" http://127.0.0.1:3211 "$canary_data/browser-report.json"
test "$(systemctl show olympiad-constructor-canary -p NRestarts --value)" = 0
test "$(awk '/MemAvailable/{print int($2/1024)}' /proc/meminfo)" -ge 512
systemctl stop olympiad-constructor-canary
# Only after acceptance, configure the independent persistent service.
data="$base/data"
install -d -o olympiad-constructor -g olympiad-constructor -m 700 "$data"
cat > /etc/systemd/system/olympiad-constructor.service <<UNIT
[Unit]
Description=Olympiad and assessment constructor
After=network.target
[Service]
User=olympiad-constructor
Group=olympiad-constructor
WorkingDirectory=$release
Environment=CONSTRUCTOR_STORAGE=$data
Environment=CONSTRUCTOR_ASSET_ROOT=$release/dist/client
Environment=CONSTRUCTOR_CHROMIUM=$browser
Environment=CONSTRUCTOR_HOST=127.0.0.1
Environment=CONSTRUCTOR_PORT=3210
Environment=CONSTRUCTOR_MODE=online
Environment=CONSTRUCTOR_PUBLIC_ORIGIN=https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai
ExecStart=$node $release/dist/server.cjs
MemoryMax=900M
MemoryHigh=800M
CPUQuota=100%
TasksMax=128
NoNewPrivileges=true
PrivateTmp=true
ProtectSystem=strict
ProtectHome=true
ReadWritePaths=$data
Restart=on-failure
RestartSec=5
[Install]
WantedBy=multi-user.target
UNIT
systemctl daemon-reload
systemctl enable olympiad-constructor
systemctl restart olympiad-constructor
for attempt in $(seq 1 60); do curl -fsS http://127.0.0.1:3210/api/constructor/v1/health >/dev/null && break; sleep 1; done
"$node" ops/bootstrap-owner.cjs http://127.0.0.1:3210 "$data" "$release/ops/owner-delivery-public.pem"
python3 "$release/ops/configure-ingress.py" "$base"
curl -fsS https://xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai/api/constructor/v1/health
free -m
systemctl show olympiad-constructor -p ActiveState -p MemoryCurrent -p MemoryPeak -p NRestarts
printf '%s\n' "$revision" > "$base/deployed-revision"
