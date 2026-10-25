"""Apply only the verified olympiad vhost, validate, reload and rollback on error.

Run through existing authorized SSH on the shared ingress. No database, app
deployment, credential, DNS, firewall or unrelated vhost changes are performed.
"""
import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import urllib.request

TARGET = Path('/etc/nginx/sites-available/olympiad-desktop-relay')
EXPECTED = '5702a86d1870701007915b381fcca6b1bc6b56e3ef8f4fcdc8f2335ed5007311'
DOMAIN = 'xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'


def run(*args):
    return subprocess.run(args, check=True, capture_output=True, text=True).stdout


def health(url, *extra):
    raw = run('curl', '--fail', '--silent', '--show-error', '--max-time', '25', *extra, url)
    data = json.loads(raw)
    if not (data.get('ok') and data.get('demonstration')):
        raise RuntimeError('Expected an explicit anonymous demonstration: ' + url)


def apply(candidate):
    candidate_data = candidate.read_bytes()
    if not TARGET.is_file() or TARGET.is_symlink():
        raise RuntimeError('Unexpected olympiad vhost location')
    original = TARGET.read_bytes()
    if original == candidate_data:
        print('Olympiad demonstration ingress already installed')
        return
    if hashlib.sha256(original).hexdigest() != EXPECTED:
        raise RuntimeError('The live olympiad vhost changed; inspect it before applying')
    health('https://olympiad-gkts.pages.dev/api/health')
    health('https://olympiad-gkts-demo.pages.dev/api/health')
    shop = 'https://xn----7sbbhcc4cggjkbdbvhis.xn--p1ai/api/settings'
    run('curl', '--fail', '--silent', '--show-error', '--max-time', '25', '--output', '/dev/null', shop)
    backup = Path('/var/backups') / ('olympiad-ingress-before-demo-' + datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ') + '.conf')
    if backup.exists():
        raise RuntimeError('Backup path is occupied')
    shutil.copy2(TARGET, backup)
    temp = TARGET.with_name(TARGET.name + '.demo-new')
    if temp.exists():
        raise RuntimeError('Candidate path is occupied')
    try:
        temp.write_bytes(candidate_data)
        shutil.copystat(TARGET, temp)
        os.replace(temp, TARGET)
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        health('https://' + DOMAIN + '/api/health', '--resolve', DOMAIN + ':443:127.0.0.1')
        run('curl', '--fail', '--silent', '--show-error', '--max-time', '25', '--output', '/dev/null', shop)
    except Exception:
        shutil.copy2(backup, TARGET)
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        raise
    print(json.dumps({'olympiadDemoIngress': 'installed', 'backup': str(backup), 'vhostSha256': hashlib.sha256(candidate_data).hexdigest(), 'shopHealth': 'unchanged HTTP 200'}))


if __name__ == '__main__':
    apply(Path(sys.argv[1]))
