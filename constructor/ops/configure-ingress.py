from pathlib import Path
import hashlib, subprocess, shutil, sys, time

base=Path(sys.argv[1])
assert base==Path('/srv/olympiad-constructor') and (base/'.constructor-owned').is_file()
target=Path('/etc/nginx/sites-available/olympiad-desktop-relay')
original=target.read_text()
domain='xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'
assert domain in original and 'listen 443 ssl;' in original
include=Path('/etc/nginx/constructor-olympiad.locations')
marker='    include /etc/nginx/constructor-olympiad.locations;'
snippet='''# Owned by isolated olympiad constructor deployment.
location = /constructor { return 302 /constructor/; }
location ^~ /constructor/ {
    proxy_pass http://127.0.0.1:3210;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_read_timeout 120s;
}
location ^~ /api/constructor/ {
    client_max_body_size 512m;
    proxy_pass http://127.0.0.1:3210;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_request_buffering on;
    proxy_read_timeout 180s;
}
'''
if include.exists(): assert include.read_text().startswith('# Owned by isolated olympiad constructor deployment.')
if marker not in original:
    # The inspected vhost has exactly one HTTPS server for this domain.
    needle='    listen 443 ssl;'
    assert original.count(needle)==1
    updated=original.replace(needle,needle+'\n'+marker,1)
else: updated=original
backup=base/'ingress-backups';backup.mkdir(exist_ok=True)
stamp=str(int(time.time()))
shutil.copy2(target,backup/(stamp+'.conf'))
previous=include.read_text() if include.exists() else None
try:
    include.write_text(snippet)
    target.write_text(updated)
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
    subprocess.run(['curl','--fail','--silent','--max-time','20','--resolve',domain+':443:127.0.0.1','https://'+domain+'/api/constructor/v1/health'],check=True)
except Exception:
    target.write_text(original)
    if previous is None: include.unlink(missing_ok=True)
    else: include.write_text(previous)
    subprocess.run(['nginx','-t'],check=True)
    subprocess.run(['systemctl','reload','nginx'],check=True)
    raise
print('Constructor routes enabled; existing vhost content retained:',hashlib.sha256(original.encode()).hexdigest())
