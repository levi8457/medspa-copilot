"use client"

import { useState, useEffect } from "react"
import { motion, AnimatePresence } from "framer-motion"
import { X, ArrowRightLeft, Loader2 } from "lucide-react"

interface Consultant {
  id: string
  name: string
  phone: string
}

interface TransferModalProps {
  customerId: string
  customerName: string
  currentConsultantId?: string
  isOpen: boolean
  onClose: () => void
  onTransfer: () => void
}

export function TransferModal({ customerId, customerName, currentConsultantId, isOpen, onClose, onTransfer }: TransferModalProps) {
  const [consultants, setConsultants] = useState<Consultant[]>([])
  const [selectedId, setSelectedId] = useState("")
  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)

  useEffect(() => {
    if (!isOpen) return
    setFetching(true)
    fetch("/api/admin/team")
      .then((r) => r.json())
      .then((res) => {
        if (res.success) {
          setConsultants(res.data.members.filter((m: Consultant & { id: string }) => m.id !== currentConsultantId))
        }
        setFetching(false)
      })
      .catch(() => setFetching(false))
  }, [isOpen, currentConsultantId])

  const handleTransfer = async () => {
    if (!selectedId) return
    setLoading(true)
    try {
      const res = await fetch("/api/customers/transfer", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId, targetConsultantId: selectedId }),
      })
      if (res.ok) {
        onTransfer()
        onClose()
      }
    } catch (e) {
      console.error("Transfer failed:", e)
    }
    setLoading(false)
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-[var(--background-secondary)] border border-[var(--border)] rounded-xl p-6 w-full max-w-md shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-[var(--primary)]" />
                <h2 className="text-lg font-medium text-[var(--foreground)]">转移客户</h2>
              </div>
              <button onClick={onClose} className="p-1 hover:bg-[var(--border)] rounded transition-colors">
                <X className="w-5 h-5 text-[var(--foreground-secondary)]" />
              </button>
            </div>

            <p className="text-sm text-[var(--foreground-secondary)] mb-4">
              将 <span className="font-medium text-[var(--foreground)]">{customerName}</span> 转移给其他咨询师
            </p>

            {fetching ? (
              <div className="py-8 text-center">
                <Loader2 className="w-6 h-6 animate-spin text-[var(--primary)] mx-auto" />
              </div>
            ) : (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {consultants.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setSelectedId(c.id)}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      selectedId === c.id
                        ? "border-[var(--primary)] bg-[var(--primary)]/10"
                        : "border-[var(--border)] hover:border-[var(--primary)]/50"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-full bg-[var(--primary)]/20 flex items-center justify-center text-[var(--primary)] text-sm font-medium">
                      {c.name[0]}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-[var(--foreground)]">{c.name}</p>
                      <p className="text-xs text-[var(--foreground-secondary)]">{c.phone}</p>
                    </div>
                  </button>
                ))}
                {consultants.length === 0 && (
                  <p className="text-sm text-[var(--foreground-secondary)] text-center py-4">暂无其他咨询师</p>
                )}
              </div>
            )}

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-[var(--foreground-secondary)] hover:bg-[var(--border)] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleTransfer}
                disabled={!selectedId || loading}
                className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-[var(--background)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                确认转移
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
