"use client"

import { useState } from "react"
import { ArrowRightLeft } from "lucide-react"
import { TransferModal } from "@/components/TransferModal"

interface TransferButtonProps {
  customerId: string
  customerName: string
  currentConsultantId?: string
  onTransfer: () => void
}

export function TransferButton({ customerId, customerName, currentConsultantId, onTransfer }: TransferButtonProps) {
  const [showModal, setShowModal] = useState(false)

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className="flex items-center gap-2 px-4 py-2 bg-[var(--accent)]/20 text-[var(--accent)] rounded-lg hover:bg-[var(--accent)]/30 transition-colors"
      >
        <ArrowRightLeft className="w-4 h-4" />
        转移客户
      </button>
      <TransferModal
        customerId={customerId}
        customerName={customerName}
        currentConsultantId={currentConsultantId}
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        onTransfer={onTransfer}
      />
    </>
  )
}
