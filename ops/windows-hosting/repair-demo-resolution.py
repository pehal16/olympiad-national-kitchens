"""Repair only the inspected olympiad ingress; keep its constructor locations.

nginx1.24 resolves a named upstream only at reload, including unreachable IPv6.
Probe current DNS IPv4 answers and retain only stable, certificate-checked peers.
"""
import concurrent.futures
import datetime
import hashlib
import json
import os
from pathlib import Path
import re
import shutil
import socket
import ipaddress
import subprocess
import time

TARGET=Path('/etc/nginx/sites-available/olympiad-desktop-relay')
EXPECTED='96c7e430a4a508c2162814ab057f5e2579b10f16ae90c78c95308cdf8236d5aa'
DOMAIN='xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'
ORIGIN='olympiad-gkts-demo.pages.dev'


def render(text, addresses):
    peers=[str(ipaddress.IPv4Address(x)) for x in addresses]
    if not peers: raise RuntimeError('No verified IPv4 peers')
    block='upstream olympiad_public_demo {\n'+''.join('    server '+x+':443 max_fails=0;\n' for x in peers)+'    keepalive 16;\n}'
    text,n=re.subn(r'upstream olympiad_public_demo\s*\{[^}]*\}', block, text, count=1)
    if n!=1: raise RuntimeError('Expected the inspected demo upstream')
    if text.count('olympiad-gkts.pages.dev')!=4:raise RuntimeError('Unexpected demo host/SNI layout')
    text=text.replace('olympiad-gkts.pages.dev',ORIGIN)
    trusted='proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;'
    if text.count(trusted)!=2: raise RuntimeError('Unexpected demo TLS scopes')
    text=text.replace(trusted,trusted+'\n        proxy_ssl_verify_depth 4;\n        proxy_next_upstream error timeout http_502 http_503 http_504;\n        proxy_next_upstream_tries 2;\n        proxy_hide_header Alt-Svc;\n        add_header X-Olympiad-Ingress demo-direct-v4 always;')
    return text


def run(*args):
    p=subprocess.run(args,capture_output=True,text=True)
    if p.returncode: raise RuntimeError(args[0]+': '+p.stderr[:1200])
    return p.stdout


def get(route):
    response=run('curl','--include','--fail','--silent','--show-error','--max-time','20','--resolve',DOMAIN+':443:127.0.0.1','https://'+DOMAIN+route)
    headers,body=response.split('\n\n',1)
    if 'x-olympiad-ingress: demo-direct-v4' not in headers.lower():raise RuntimeError('Waiting for the new nginx generation')
    return body


def healthy_peers():
    name=ORIGIN
    ips=sorted(set(x[4][0] for x in socket.getaddrinfo(name,443,socket.AF_INET)))
    def probe(ip):
        try:
            for _ in range(3):
                raw=run('curl','--http1.1','--fail','--silent','--show-error','--connect-timeout','4','--max-time','6','--resolve',name+':443:'+ip,'https://'+name+'/api/health')
                if not json.loads(raw).get('demonstration'): return None
            return ip
        except Exception:return None
    with concurrent.futures.ThreadPoolExecutor(max_workers=4) as pool:
        good=[ip for ip in pool.map(probe,ips) if ip]
    print(json.dumps({'dnsIPv4Answers':ips,'verifiedDemoIPv4':good}),flush=True)
    if not good:raise RuntimeError('No stable verified Cloudflare address; ingress unchanged')
    return good


def main():
    if not TARGET.is_file() or TARGET.is_symlink(): raise RuntimeError('Unexpected target')
    original=TARGET.read_bytes()
    if hashlib.sha256(original).hexdigest()!=EXPECTED: raise RuntimeError('Inspect the changed vhost before applying')
    candidate=render(original.decode(),healthy_peers()).encode()
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
