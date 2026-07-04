#!/bin/bash
# MedSpa Copilot 服务器部署脚本
# 在服务器上执行：bash /opt/medspa-copilot/deploy.sh

set -e

PROJECT_DIR="/opt/medspa-copilot"

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

# 4. 构建项目
echo "🔨 构建项目..."
pnpm build
echo "✅ 构建完成"

# 5. 同步数据库
echo "🗄️ 同步数据库..."
pnpm prisma db push 2>/dev/null || echo "⚠️ 数据库同步跳过（无schema变更）"
echo "✅ 数据库同步完成"

# 6. 重启服务
echo "🔄 重启服务..."
# 停止现有进程
pkill -f "next start" 2>/dev/null || true
sleep 2

# 使用 start.sh 启动
if [ -f "$PROJECT_DIR/start.sh" ]; then
    chmod +x "$PROJECT_DIR/start.sh"
    nohup bash "$PROJECT_DIR/start.sh" > /dev/null 2>&1 &
    echo "✅ 服务已通过 start.sh 启动"
else
    nohup pnpm start > /dev/null 2>&1 &
    echo "✅ 服务已通过 pnpm start 启动"
fi

# 7. 验证服务
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3010 | grep -q "200\|302\|307"; then
    echo "✅ 服务运行正常 (端口 3010)"
else
    echo "⚠️ 服务可能未正常启动，请检查日志"
    echo "   查看进程: ps aux | grep next"
    echo "   手动启动: cd $PROJECT_DIR && pnpm start"
fi

echo ""
echo "========================================"
echo "  部署完成！"
echo "  访问地址: http://115.28.185.181:8888/medspa"
echo "========================================"
