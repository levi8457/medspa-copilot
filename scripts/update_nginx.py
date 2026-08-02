import paramiko

key_path = r"E:\下载\115.28.185 (1).181_id_ed25519"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("115.28.185.181", username="root", key_filename=key_path, timeout=30)

sftp = ssh.open_sftp()
sftp.put(r"e:\1test\medspa-copilot\nginx-hospital-8888.conf", "/www/server/panel/vhost/nginx/hospital.conf")
sftp.close()

stdin, stdout, stderr = ssh.exec_command("nginx -t 2>&1")
print("nginx -t:")
print(stdout.read().decode())
print(stderr.read().decode())

stdin, stdout, stderr = ssh.exec_command("nginx -s reload 2>&1")
print("nginx reload:")
print(stdout.read().decode())
print(stderr.read().decode())

stdin, stdout, stderr = ssh.exec_command("curl -s -o /dev/null -w '8888_medspa_login: %{http_code}\\n' http://127.0.0.1:8888/medspa/login")
print(stdout.read().decode())

stdin, stdout, stderr = ssh.exec_command("curl -s http://127.0.0.1:8888/medspa/site | grep -o '<title>[^<]*</title>' | head -1")
print(stdout.read().decode())

ssh.close()
print("DONE")
