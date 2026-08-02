import paramiko
import sys

key_path = r"E:\下载\115.28.185 (1).181_id_ed25519"
ssh = paramiko.SSHClient()
ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
ssh.connect("115.28.185.181", username="root", key_filename=key_path, timeout=30)

command = sys.argv[1] if len(sys.argv) > 1 else "echo hello"
print(f"$ {command}")
stdin, stdout, stderr = ssh.exec_command(command)
out = stdout.read().decode()
err = stderr.read().decode()
if out:
    print(out, end="")
if err:
    print("STDERR:", err, end="", file=sys.stderr)
rc = stdout.channel.recv_exit_status()
print(f"\n[exit code: {rc}]")
ssh.close()
