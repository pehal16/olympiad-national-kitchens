"""Ephemeral loopback clone for diagnosing public demo proxy failures only."""
import concurrent.futures
import importlib.util
import json
import os
from pathlib import Path
import pwd
import subprocess
import tempfile
import time

spec=importlib.util.spec_from_file_location('repair',Path(__file__).with_name('repair-demo-resolution.py'))
repair=importlib.util.module_from_spec(spec);spec.loader.exec_module(repair)
candidate=repair.render(repair.TARGET.read_text(),repair.healthy_peers())
candidate=candidate.replace('listen 80;','listen 127.0.0.1:14080;').replace('listen 443 ssl;','listen 127.0.0.1:14443 ssl;')
candidate=candidate.replace('error_log /var/log/nginx/olympiad-relay-error.log crit;','error_log stderr info;')
prefix=Path(tempfile.mkdtemp(prefix='olympiad-loopback-probe-'));os.chmod(prefix,0o755)
account=pwd.getpwnam('www-data')
for name in ['proxy_temp','client_body_temp']:
    p=prefix/name;p.mkdir();os.chown(p,account.pw_uid,account.pw_gid)
config=prefix/'nginx.conf'
config.write_text('user www-data;\nworker_processes 1;\nerror_log stderr info;\npid '+str(prefix/'nginx.pid')+';\nevents {worker_connections 256;}\nhttp {access_log off;\n'+candidate+'\n}')
subprocess.run(['nginx','-t','-p',str(prefix)+'/', '-c',str(config)],check=True)
process=subprocess.Popen(['nginx','-p',str(prefix)+'/', '-c',str(config),'-g','daemon off;'],stdout=subprocess.PIPE,stderr=subprocess.PIPE,text=True)
try:
    time.sleep(1)
    def get(n):
        route=['/api/health','/api/public/olympiad','/api/public/demo/statistics','/t3-detective.js?v=1.7.0-layout5-oct12','/demo-analytics.js?v=demo-counter3','/app.js?v=demo-counter3'][n%6]
        args=['curl','--silent','--show-error','--max-time','20','--resolve',repair.DOMAIN+':14443:127.0.0.1','--output','/dev/null','--write-out','%{http_code} %{time_total}']
        if n%2:args+=['-H','X-Demo-Session: '+'e'*32]
        p=subprocess.run(args+['https://'+repair.DOMAIN+':14443'+route],capture_output=True,text=True)
        return {'route':route,'marked':bool(n%2),'status':p.stdout,'error':p.stderr[:200]}
    with concurrent.futures.ThreadPoolExecutor(max_workers=6) as pool:
        print(json.dumps(list(pool.map(get,range(18)))),flush=True)
finally:
    process.terminate()
    try:out,err=process.communicate(timeout=10)
    except subprocess.TimeoutExpired:process.kill();out,err=process.communicate()
    print('LOOPBACK_ONLY_DIAGNOSTICS\n'+err[-18000:])
