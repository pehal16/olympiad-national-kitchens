"""Add the teacher invitation to the inspected Timeweb olympiad vhost."""

import datetime
import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import time


TARGET = Path('/etc/nginx/sites-available/olympiad-desktop-relay')
EXPECTED = '145f674c03a0bba968e24119df57968e1f8a64707a9373ce3926a3c3f09c7e57'
DOMAIN = 'xn--80aaloaqinm.xn--b1amqadnhd.xn--p1ai'
ORIGIN = 'https://olympiad-gkts-demo.pages.dev'
SHOP_HEALTH = 'https://xn----7sbbhcc4cggjkbdbvhis.xn--p1ai/api/settings'
APP = 'app.js?v=teacher-demo-domain-20261126'
ANCHOR = b'    location @olympiad_demo {\n'
LOCATIONS = rb'''    location = /demo-teacher {
        return 308 /demo-teacher/;
    }

    # Static teacher invitation. Its participant API uses the existing demo header.
    location ^~ /demo-teacher/ {
        if ($request_method !~ ^(GET|HEAD)$) { return 405; }
        if ($uri ~* ^/demo-teacher/(api|admin|content-admin|organizer|learning|pm01|sw)([./-]|$)) { return 404; }

        proxy_pass https://olympiad_public_demo/;
        proxy_http_version 1.1;
        proxy_ssl_server_name on;
        proxy_ssl_name olympiad-gkts-demo.pages.dev;
        proxy_ssl_verify on;
        proxy_ssl_verify_depth 4;
        proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
        proxy_set_header Host olympiad-gkts-demo.pages.dev;
        proxy_set_header Connection "";
        proxy_set_header Cookie "";
        proxy_set_header Authorization "";
        proxy_set_header X-Attempt-Token "";
        proxy_set_header X-Demo-Session "";
        proxy_set_header X-Forwarded-For "";
        proxy_set_header X-Real-IP "";
        proxy_set_header X-Forwarded-Proto https;
        proxy_hide_header Alt-Svc;
        proxy_hide_header Set-Cookie;
        proxy_redirect https://olympiad-gkts-demo.pages.dev/ /demo-teacher/;
        proxy_redirect / /demo-teacher/;
        proxy_cache off;
        proxy_connect_timeout 5s;
        proxy_read_timeout 30s;
        proxy_next_upstream error timeout http_502 http_503 http_504;
        proxy_next_upstream_tries 2;
        add_header X-Olympiad-Route teacher-demo-static always;
    }

'''


def run(*args):
    result = subprocess.run(args, capture_output=True, text=True, encoding='utf-8')
    if result.returncode:
        raise RuntimeError(f'{args[0]} failed: {result.stderr[:1200]}')
    return result.stdout


def get(path, *options):
    return run(
        'curl', '--fail', '--silent', '--show-error', '--max-time', '15',
        '--resolve', f'{DOMAIN}:443:127.0.0.1', *options, f'https://{DOMAIN}{path}',
    )


def health():
    olympiad = json.loads(get('/api/health'))
    constructor = json.loads(get('/api/constructor/v1/health'))
    if olympiad.get('ok') is not True or constructor.get('ok') is not True:
        raise RuntimeError('Olympiad or constructor health check failed')
    run('curl', '--fail', '--silent', '--show-error', '--max-time', '15',
        '--output', '/dev/null', SHOP_HEALTH)
    return {'olympiadStorage': olympiad.get('storage'),
            'olympiadDemonstration': olympiad.get('demonstration') is True,
            'constructor': 'ok', 'shop': 'ok'}


def verify_invitation():
    shell = get('/demo-teacher/', '--include')
    headers, body = shell.split('\n\n', 1)
    if 'x-olympiad-route: teacher-demo-static' not in headers.lower() or f'src="{APP}"' not in body:
        raise RuntimeError('The teacher invitation does not serve the expected release')
    if 'teacherDemoBase' not in get('/demo-teacher/' + APP):
        raise RuntimeError('The teacher invitation script is unavailable')
    if 'id="certificate-sheet"' not in get('/demo-teacher/certificate.html', '--location', '--max-redirs', '2'):
        raise RuntimeError('The proxied certificate did not load')
    metadata = json.loads(get('/api/public/olympiad?demo=teacher', '--header', 'X-Demo-Session: ' + '0' * 32))
    mode = metadata.get('data', {})
    if mode.get('demonstration') is not True or mode.get('teacherDemo') is not True:
        raise RuntimeError('Marked invitations must use the untimed demonstration backend')


def replace_vhost(data):
    with tempfile.NamedTemporaryFile(dir=TARGET.parent, prefix='.teacher-demo-', delete=False) as handle:
        temporary = Path(handle.name)
        handle.write(data)
    try:
        shutil.copystat(TARGET, temporary)
        os.replace(temporary, TARGET)
    finally:
        temporary.unlink(missing_ok=True)


def main():
    if not TARGET.is_file() or TARGET.is_symlink():
        raise RuntimeError('Unexpected olympiad vhost location')
    original = TARGET.read_bytes()
    baseline = original.replace(LOCATIONS, b'', 1)
    if hashlib.sha256(baseline).hexdigest() != EXPECTED or baseline.count(ANCHOR) != 1:
        raise RuntimeError('The live olympiad vhost differs from the inspected revision')
    if baseline != original:
        verify_invitation()
        print(json.dumps({'invitation': 'already installed', 'health': health()}))
        return

    release = run('curl', '--fail', '--silent', '--show-error', '--max-time', '15', ORIGIN + '/')
    if f'src="{APP}"' not in release:
        raise RuntimeError('The invitation release is not yet deployed to Pages')
    before = health()
    timestamp = datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = Path('/var/backups') / f'olympiad-before-teacher-demo-{timestamp}.conf'
    if backup.exists() or TARGET.read_bytes() != original:
        raise RuntimeError('The vhost or backup path changed during preflight')
    shutil.copy2(TARGET, backup)
    candidate = original.replace(ANCHOR, LOCATIONS + ANCHOR, 1)
    replace_vhost(candidate)
    try:
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        for attempt in range(8):
            try:
                verify_invitation()
                break
            except (RuntimeError, ValueError):
                if attempt == 7:
                    raise
                time.sleep(1)
        after = health()
    except Exception:
        if TARGET.read_bytes() != candidate:
            raise RuntimeError(f'Vhost changed during activation. Backup: {backup}')
        replace_vhost(original)
        run('nginx', '-t')
        run('systemctl', 'reload', 'nginx')
        raise
    print(json.dumps({'invitation': 'installed', 'backup': str(backup),
                      'vhostSha256': hashlib.sha256(candidate).hexdigest(),
                      'before': before, 'after': after}))


if __name__ == '__main__':
    main()
