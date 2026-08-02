import paramiko
import os
import tarfile
import io

key_path = r"E:\下载\115.28.185 (1).181_id_ed25519"
host = "115.28.185.181"
username = "root"
remote_dir = "/opt/medspa-copilot"

ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect(host, username=username, key_filename=key_path, timeout=30)

local_dir = r"e:\1test\medspa-copilot"

exclude_dirs = {".git", "node_modules", ".next", "prisma/dev.db", ".turbo"}
exclude_files = {".env.local", ".env"}

print("Creating tar archive...")
tar_buffer = io.BytesIO()
with tarfile.open(fileobj=tar_buffer, mode="w:gz") as tar:
    for root, dirs, files in os.walk(local_dir):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        rel_root = os.path.relpath(root, local_dir)
        if rel_root == ".":
            rel_root = ""
        for file in files:
            if file in exclude_files:
                continue
            full_path = os.path.join(root, file)
            rel_path = os.path.join(rel_root, file).replace("\\", "/")
            tar.add(full_path, arcname=rel_path)

tar_buffer.seek(0)
tar_size = tar_buffer.getbuffer().nbytes
print(f"Archive created: {tar_size / 1024:.1f} KB")

print("Uploading via SFTP...")
sftp = ssh.open_sftp()
remote_tar = "/tmp/medspa-update.tar.gz"
sftp.putfo(tar_buffer, remote_tar)
sftp.close()
print("Upload complete.")

print("Extracting on server...")
stdin, stdout, stderr = ssh.exec_command(f"cd {remote_dir} && tar -xzf {remote_tar} --no-same-owner 2>&1")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)
print(f"Extract exit code: {stdout.channel.recv_exit_status()}")

print("Building on server...")
stdin, stdout, stderr = ssh.exec_command(f"cd {remote_dir} && pnpm build 2>&1 | tail -20")
print(stdout.read().decode())
err = stderr.read().decode()
if err:
    print("ERR:", err)
build_exit = stdout.channel.recv_exit_status()
print(f"Build exit code: {build_exit}")

if build_exit == 0:
    print("Restarting service...")
    stdin, stdout, stderr = ssh.exec_command(
        "ps aux | grep 'next start' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null; "
        "ps aux | grep 'pnpm start' | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null; "
        "sleep 2; "
        f"cd {remote_dir} && nohup pnpm start > /opt/medspa-copilot/server.log 2>&1 & "
        "echo 'STARTED'; sleep 3; "
        "curl -s -o /dev/null -w 'LOGIN_STATUS: %{http_code}\\n' http://127.0.0.1:3010/medspa/login"
    )
    print(stdout.read().decode())
    err = stderr.read().decode()
    if err:
        print("ERR:", err)

print("Cleaning up...")
ssh.exec_command(f"rm -f {remote_tar}")

ssh.close()
print("DONE")
