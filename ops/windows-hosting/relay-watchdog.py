#!/usr/bin/env python3
"""Recover only the dedicated loopback relay after repeated static-page failures.

Run on the existing Linux gateway as a bounded systemd oneshot. No database,
credentials, public API, DNS or other SSH account is accessed or modified.
"""
import http.client
import json
import os
from pathlib import Path
import re
import signal
import subprocess
import time

STATE = Path('/run/olympiad-relay-watchdog/state.json')
PORT = 13100
FAILURES = 3
MIN_AGE = 60


def listener():
    result = subprocess.run(
        ['/usr/bin/ss', '-H', '-ltnp', 'sport = :13100'],
        check=True, capture_output=True, text=True, timeout=5)
    rows = [line.split() for line in result.stdout.splitlines() if line.strip()]
    if len(rows) != 1 or len(rows[0]) < 6 or rows[0][3] != '127.0.0.1:13100':
        return None
    pids = set(re.findall(r'pid=(\d+)', result.stdout))
    return int(next(iter(pids))) if len(pids) == 1 else None


def identity(pid):
    import pwd
    proc = Path('/proc') / str(pid)
    if proc.stat().st_uid != pwd.getpwnam('olympiad-relay').pw_uid:
        return None
    if proc.joinpath('comm').read_text().strip() != 'sshd':
        return None
    if str(proc.joinpath('exe').resolve(strict=True)) != '/usr/sbin/sshd':
        return None
    # starttime is field22; comm can contain spaces and parentheses.
    start = int(proc.joinpath('stat').read_text().rsplit(')', 1)[1].split()[19])
    age = time.monotonic() - start / os.sysconf('SC_CLK_TCK')
    return {'pid': pid, 'start': start, 'age': age}


def healthy():
    connection = http.client.HTTPConnection('127.0.0.1', PORT, timeout=4)
    try:
        connection.request('GET', '/', headers={'User-Agent': 'OlympiadRelayWatchdog/1'})
        response = connection.getresponse()
        return response.status == 200 and b'id="hero-title"' in response.read(65536)
    finally:
        connection.close()


def load_state():
    try:
        value = json.loads(STATE.read_text())
        return value if isinstance(value, dict) else {}
    except (OSError, ValueError):
        return {}


def save_state(value):
    STATE.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary = STATE.with_suffix('.new')
    temporary.write_text(json.dumps(value))
    temporary.replace(STATE)


def cycle():
    pid = listener()
    owner = identity(pid) if pid else None
    if not owner:
        save_state({'state': 'no_verified_relay', 'failures': 0})
        return 'no_verified_relay'
    key = f'{pid}:{owner["start"]}'
    state = load_state()
    try:
        ok = healthy()
    except (OSError, http.client.HTTPException):
        ok = False
    if ok:
        save_state({'state': 'healthy', 'key': key, 'failures': 0})
        return 'healthy'
    old_count = state.get('failures', 0) if state.get('key') == key else 0
    count = min(FAILURES, old_count + 1) if isinstance(old_count, int) else 1
    save_state({'state': 'probe_failed', 'key': key, 'failures': count})
    if count < FAILURES or owner['age'] < MIN_AGE:
        return 'probe_failed'
    try:
        if healthy():
            save_state({'state': 'healthy', 'key': key, 'failures': 0})
            return 'healthy'
    except (OSError, http.client.HTTPException):
        pass
    # Recheck the bound port and process starttime after the last network wait.
    # Never kill a recycled PID, another listener/account, or a healthy relay.
    same_pid = listener()
    current = identity(same_pid) if same_pid == pid else None
    if not current or current['start'] != owner['start']:
        return 'owner_changed'
    os.kill(pid, signal.SIGTERM)
    save_state({'state': 'relay_released', 'key': key, 'failures': 0,
                'releasedAt': time.time()})
    return 'relay_released'


if __name__ == '__main__':
    print(cycle(), flush=True)
