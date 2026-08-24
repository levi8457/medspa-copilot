#!/bin/bash
# MedSpa Copilot 服务器部署脚本
# 在服务器上执行：bash /opt/medspa-copilot/deploy.sh

set -euo pipefail

PROJECT_DIR="/opt/medspa-copilot"
PORT="${PORT:-3010}"

echo "========================================"
echo "  MedSpa Copilot 部署脚本"
echo "========================================"

# 1. 进入项目目录
cd "$PROJECT_DIR"
echo "✅ 进入项目目录: $PROJECT_DIR"

# 2. 拉取最新代码
echo "📥 拉取最新代码..."
git fetch origin main
git reset --hard origin/main
echo "✅ 代码已更新到最新版本"

# 3. 安装依赖
echo "📦 安装依赖..."
pnpm install --frozen-lockfile 2>/dev/null || pnpm install
echo "✅ 依赖安装完成"

# 4. 生成 Prisma 客户端并应用已审核的数据库迁移。
# 生产环境不能使用 db push，否则数据库结构变更没有可追溯记录。
echo "🗄️ 应用数据库迁移..."
pnpm db:generate
pnpm db:deploy
echo "✅ 数据库迁移完成"

# 5. 构建项目
echo "🔨 构建项目..."
pnpm build
echo "✅ 构建完成"

# 6. 重启服务
echo "🔄 重启服务..."
# Next 的生产进程名通常是 next-server，而不是 next start。按监听端口停止，
# 避免旧实例占用端口后让新版本在后台启动失败。
if command -v fuser >/dev/null 2>&1 && fuser -n tcp "$PORT" >/dev/null 2>&1; then
    echo "停止占用端口 $PORT 的旧 Web 进程..."
    fuser -k -TERM "${PORT}/tcp" || true
fi
sleep 2

# 使用 start.sh 启动
if [ -f "$PROJECT_DIR/start.sh" ]; then
    chmod +x "$PROJECT_DIR/start.sh"
    nohup bash "$PROJECT_DIR/start.sh" > /dev/null 2>&1 &
    echo "✅ 服务已通过 start.sh 启动"
else
    nohup env PORT="$PORT" pnpm start >> /tmp/medspa-web.log 2>&1 &
    echo "✅ 服务已通过 pnpm start 启动 (端口 $PORT)"
fi

# 录音解析依赖独立 Worker；Web 服务正常不代表解析任务会被消费。
if [ -f "$PROJECT_DIR/start-worker.sh" ]; then
    chmod +x "$PROJECT_DIR/start-worker.sh"
    bash "$PROJECT_DIR/start-worker.sh"
    echo "✅ 录音解析 Worker 已重启"
else
    echo "⚠️ 未找到 start-worker.sh，录音解析 Worker 未启动"
fi

# 7. 验证服务
sleep 3
if curl -fsS "http://127.0.0.1:${PORT}/medspa/api/health" >/dev/null; then
    echo "✅ 服务运行正常 (健康检查已通过)"
else
    echo "❌ 服务未通过健康检查，请检查日志"
    echo "   查看进程: ps aux | grep next"
    echo "   查看 Web 日志: tail -n 100 /tmp/medspa-web.log"
    echo "   查看 Worker 日志: tail -n 100 /tmp/medspa-worker.log"
    echo "   手动启动: cd $PROJECT_DIR && PORT=$PORT pnpm start"
    exit 1
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "  请使用已配置的域名或反向代理地址访问 /medspa"
echo "========================================"
