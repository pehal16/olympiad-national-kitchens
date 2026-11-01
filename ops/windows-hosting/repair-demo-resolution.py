"""Repair only the inspected olympiad ingress; keep its constructor locations.

nginx1.24 resolves a named upstream only at reload, including unreachable IPv6.
Use its existing DNS stub at request time, with IPv4 and safe upstream retries.
"""
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import subprocess
import time

TARGET=Path('/etc/nginx/sites-available/olympiad-desktop-relay')
EXPECTED='96c7e430a4a508c2162814ab057f5e2579b10f16ae90c78c95308cdf8236d5aa'
DOMAIN='xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'


def render(text):
    text,n=re.subn(r'upstream olympiad_public_demo\s*\{[^}]*\}', '', text, count=1)
    if n!=1: raise RuntimeError('Expected the inspected demo upstream')
    old='proxy_pass https://olympiad_public_demo;'
    if text.count(old)!=1: raise RuntimeError('Unexpected fallback layout')
    text=text.replace(old, 'set $olympiad_demo_origin olympiad-gkts.pages.dev;\n        proxy_pass https://$olympiad_demo_origin;')
    text=text.replace('https://olympiad_public_demo;', 'https://olympiad-gkts.pages.dev;')
    protocol='ssl_protocols TLSv1.2 TLSv1.3;'
    if text.count(protocol)!=1: raise RuntimeError('Unexpected TLS layout')
    text=text.replace(protocol,protocol+'\n    resolver 127.0.0.53 ipv6=off valid=60s;\n    resolver_timeout 3s;')
    trusted='proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;'
    if text.count(trusted)!=2: raise RuntimeError('Unexpected demo TLS scopes')
    text=text.replace(trusted,trusted+'\n        proxy_next_upstream error timeout http_502 http_503 http_504;\n        proxy_next_upstream_tries 2;\n        proxy_hide_header Alt-Svc;')
    return text


def run(*args):
    p=subprocess.run(args,capture_output=True,text=True)
    if p.returncode: raise RuntimeError(args[0]+': '+p.stderr[:1200])
    return p.stdout


def get(route):
    return run('curl','--fail','--silent','--show-error','--max-time','20','--resolve',DOMAIN+':443:127.0.0.1','https://'+DOMAIN+route)


def main():
    if not TARGET.is_file() or TARGET.is_symlink(): raise RuntimeError('Unexpected target')
    original=TARGET.read_bytes()
    if hashlib.sha256(original).hexdigest()!=EXPECTED: raise RuntimeError('Inspect the changed vhost before applying')
    if 'nameserver 127.0.0.53' not in Path('/etc/resolv.conf').read_text(): raise RuntimeError('DNS stub changed')
    candidate=render(original.decode()).encode()
    backup=Path('/var/backups')/('olympiad-before-dns-repair-'+datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'.conf')
    if backup.exists(): raise RuntimeError('Backup already exists')
    shutil.copy2(TARGET,backup)
    temp=TARGET.with_name(TARGET.name+'.dns-new')
    if temp.exists(): raise RuntimeError('Candidate path occupied')
    try:
        temp.write_bytes(candidate);shutil.copystat(TARGET,temp);os.replace(temp,TARGET)
        run('nginx','-t');run('systemctl','reload','nginx')
        for attempt in range(8):
            try:
                if not json.loads(get('/api/health')).get('demonstration'):raise RuntimeError('Expected the existing demonstration')
                break
            except Exception:
                if attempt==7: raise
                time.sleep(1)
        routes=['/api/health','/api/public/olympiad','/api/public/demo/statistics','/t3-detective.js?v=1.7.0-layout5-oct12','/demo-analytics.js?v=demo-counter3','/app.js?v=demo-counter3']
        with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
            responses=list(pool.map(get,routes*5))
        assert json.loads(responses[2])['ok']
        assert json.loads(get('/api/constructor/v1/health'))['ok']
        run('curl','--fail','--silent','--show-error','--max-time','20','--output','/dev/null','https://xn----7sbbhcc4cggjkbdbvhis.xn--p1ai/api/settings')
    except Exception:
        shutil.copy2(backup,TARGET);run('nginx','-t');run('systemctl','reload','nginx');raise
    print(json.dumps({'demoDnsRepair':'installed','backup':str(backup),'vhostSha256':hashlib.sha256(candidate).hexdigest(),'parallelReadRequests':len(responses),'allHttp200':True,'constructorHealth':'ok','shopHealth':'ok'}))


if __name__=='__main__':main()
