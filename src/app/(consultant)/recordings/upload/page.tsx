"use client"

import { useCallback, useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { motion, AnimatePresence } from "framer-motion"
import { Upload, FileAudio, CheckCircle, AlertCircle, Loader2, X } from "lucide-react"
import { GlowCard } from "@/components/futuristic/GlowCard"
import { HudPanel } from "@/components/futuristic/HudPanel"

interface Customer {
  id: string
  name: string
  phone?: string
}

interface UploadProgress {
  status: "idle" | "uploading" | "processing" | "transcribing" | "analyzing" | "done" | "error"
  progress: number
  message?: string
  error?: string
}

export default function RecordingUploadPage() {
  const router = useRouter()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadProgress, setUploadProgress] = useState<UploadProgress>({
    status: "idle",
    progress: 0,
  })

  const fetchCustomers = async () => {
    try {
      const response = await fetch("/api/customers?pageSize=100")
      const result = await response.json()
      if (result.success) {
        setCustomers(result.data.customers)
      }
    } catch (error) {
      console.error("获取客户列表失败:", error)
    }
  }

  useEffect(() => {
    fetchCustomers()
  }, [])

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      const allowedTypes = ["audio/mpeg", "audio/mp3", "audio/wav", "audio/ogg"]
      if (!allowedTypes.includes(file.type)) {
        alert("仅支持 MP3/WAV/OGG 格式")
        return
      }

      // 验证文件大小 (200MB)
      if (file.size > 200 * 1024 * 1024) {
        alert("文件大小不能超过 200MB")
        return
      }

      setSelectedFile(file)
    }
  }, [])

  const handleUpload = async () => {
    if (!selectedFile || !selectedCustomer) {
      alert("请选择客户和录音文件")
      return
    }

    setUploadProgress({ status: "uploading", progress: 0 })

    try {
      const formData = new FormData()
      formData.append("file", selectedFile)
      formData.append("customerId", selectedCustomer)

      const response = await fetch("/api/recordings", {
        method: "POST",
        body: formData,
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error.message)
      }

      const recordingId = result.data.id
      setUploadProgress({ status: "processing", progress: 30 })

      // 订阅 SSE 获取实时进度
      const eventSource = new EventSource(`/api/recordings/${recordingId}/progress`)

      eventSource.onmessage = (event) => {
        const data = JSON.parse(event.data)

        switch (data.type) {
          case "progress":
            const progressMap: Record<string, number> = {
              transcribing: 50,
              analyzing: 75,
              done: 100,
              failed: 100,
            }
            setUploadProgress({
              status: data.status,
              progress: progressMap[data.status] || 30,
            })
            break

          case "completed":
            setUploadProgress({ status: "done", progress: 100 })
            eventSource.close()
            // 3 秒后跳转到客户详情页
            setTimeout(() => {
              router.push(`/customers/${selectedCustomer}`)
            }, 3000)
            break

          case "failed":
            setUploadProgress({
              status: "error",
              progress: 100,
              error: data.error || "处理失败",
            })
            eventSource.close()
            break

          case "heartbeat":
            // 心跳，保持连接
            break
        }
      }

      eventSource.onerror = () => {
        setUploadProgress({
          status: "error",
          progress: 100,
          error: "连接中断，请刷新页面",
        })
        eventSource.close()
      }
    } catch (error) {
      setUploadProgress({
        status: "error",
        progress: 100,
        error: error instanceof Error ? error.message : "上传失败",
      })
    }
  }

  const handleReset = () => {
    setSelectedFile(null)
    setSelectedCustomer("")
    setUploadProgress({ status: "idle", progress: 0 })
  }

  const statusMessages: Record<string, string> = {
    idle: "准备上传",
    uploading: "正在上传文件...",
    processing: "文件处理中...",
    transcribing: "语音转写中...",
    analyzing: "AI 分析中...",
    done: "处理完成",
    error: "处理失败",
  }

  return (
    <div className="min-h-screen bg-[var(--background)] p-6">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-[var(--foreground)]">
            上传录音
          </h1>
          <p className="text-[var(--foreground-secondary)] mt-1">
            上传面谈录音，AI 将自动提取客户标签
          </p>
        </div>

        {/* Progress Steps */}
        <div className="grid grid-cols-4 gap-4">
          <HudPanel
            label="上传"
            value={uploadProgress.status === "uploading" ? "中" : uploadProgress.progress >= 30 ? "✓" : "-"}
            icon={<Upload />}
          />
          <HudPanel
            label="转写"
            value={
              uploadProgress.status === "transcribing"
                ? "中"
                : uploadProgress.progress >= 50
                ? "✓"
                : "-"
            }
            icon={<FileAudio />}
          />
          <HudPanel
            label="分析"
            value={
              uploadProgress.status === "analyzing"
                ? "中"
                : uploadProgress.progress >= 75
                ? "✓"
                : "-"
            }
            icon={<Loader2 />}
          />
          <HudPanel
            label="完成"
            value={uploadProgress.status === "done" ? "✓" : "-"}
            icon={<CheckCircle />}
          />
        </div>

        {/* Upload Form */}
        <AnimatePresence mode="wait">
          {uploadProgress.status === "idle" && (
            <motion.div
              key="form"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Customer Selection */}
              <GlowCard className="p-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  选择客户
                </label>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  className="w-full p-3 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="">请选择客户</option>
                  {customers.map((customer) => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} {customer.phone ? `(${customer.phone})` : ""}
                    </option>
                  ))}
                </select>
              </GlowCard>

              {/* File Upload */}
              <GlowCard className="p-6">
                <label className="block text-sm font-medium text-[var(--foreground)] mb-2">
                  上传录音文件
                </label>
                <div className="border-2 border-dashed border-[var(--border)] rounded-xl p-8 text-center hover:border-[var(--primary)] transition-colors">
                  <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileSelect}
                    className="hidden"
                    id="file-upload"
                  />
                  <label htmlFor="file-upload" className="cursor-pointer">
                    <FileAudio className="w-12 h-12 text-[var(--foreground-secondary)] mx-auto mb-4" />
                    <p className="text-[var(--foreground)] font-medium">
                      点击选择文件或拖拽到此处
                    </p>
                    <p className="text-sm text-[var(--foreground-secondary)] mt-2">
                      支持 MP3/WAV/OGG 格式，最大 200MB
                    </p>
                  </label>
                </div>

                {selectedFile && (
                  <div className="mt-4 flex items-center justify-between p-3 bg-[var(--card)] rounded-lg">
                    <div className="flex items-center gap-3">
                      <FileAudio className="w-5 h-5 text-[var(--primary)]" />
                      <div>
                        <p className="text-sm font-medium text-[var(--foreground)]">
                          {selectedFile.name}
                        </p>
                        <p className="text-xs text-[var(--foreground-secondary)]">
                          {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSelectedFile(null)}
                      className="p-1 hover:bg-[var(--border)] rounded"
                    >
                      <X className="w-4 h-4 text-[var(--foreground-secondary)]" />
                    </button>
                  </div>
                )}
              </GlowCard>

              {/* Upload Button */}
              <button
                onClick={handleUpload}
                disabled={!selectedFile || !selectedCustomer}
                className="w-full py-3 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90 transition-opacity"
              >
                开始上传并分析
              </button>
            </motion.div>
          )}

          {/* Processing Status */}
          {(uploadProgress.status === "uploading" ||
            uploadProgress.status === "processing" ||
            uploadProgress.status === "transcribing" ||
            uploadProgress.status === "analyzing") && (
            <motion.div
              key="processing"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
            >
              <GlowCard variant="primary" className="p-8 text-center">
                <Loader2 className="w-16 h-16 text-[var(--primary)] mx-auto mb-4 animate-spin" />
                <p className="text-lg font-medium text-[var(--foreground)]">
                  {statusMessages[uploadProgress.status]}
                </p>
                <div className="mt-4 w-full bg-[var(--card)] rounded-full h-2">
                  <motion.div
                    className="bg-[var(--primary)] h-2 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${uploadProgress.progress}%` }}
                    transition={{ duration: 0.5 }}
                  />
                </div>
                <p className="text-sm text-[var(--foreground-secondary)] mt-2">
                  {uploadProgress.progress}%
                </p>
              </GlowCard>
            </motion.div>
          )}

          {/* Success */}
          {uploadProgress.status === "done" && (
            <motion.div
              key="success"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlowCard variant="success" className="p-8 text-center">
                <CheckCircle className="w-16 h-16 text-[var(--success)] mx-auto mb-4" />
                <p className="text-lg font-medium text-[var(--foreground)]">
                  分析完成
                </p>
                <p className="text-sm text-[var(--foreground-secondary)] mt-2">
                  即将跳转到客户详情页...
                </p>
              </GlowCard>
            </motion.div>
          )}

          {/* Error */}
          {uploadProgress.status === "error" && (
            <motion.div
              key="error"
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
            >
              <GlowCard variant="danger" className="p-8 text-center">
                <AlertCircle className="w-16 h-16 text-[var(--danger)] mx-auto mb-4" />
                <p className="text-lg font-medium text-[var(--foreground)]">
                  {uploadProgress.error || "处理失败"}
                </p>
                <button
                  onClick={handleReset}
                  className="mt-4 px-6 py-2 bg-[var(--card)] text-[var(--foreground)] rounded-lg hover:bg-[var(--border)] transition-colors"
                >
                  重新上传
                </button>
              </GlowCard>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}