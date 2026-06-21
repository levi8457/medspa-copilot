"use client"

import { useState } from "react"
import { TagEditor } from "@/components/TagEditor"

interface Tag {
  id: string
  dimension: string
  value: string
  sourceText?: string
  audioRecordId?: string
  isManuallyModified?: boolean
}

interface CustomerTagsSectionProps {
  customerId: string
  initialTags: Tag[]
}

export function CustomerTagsSection({ customerId, initialTags }: CustomerTagsSectionProps) {
  const [tags, setTags] = useState<Tag[]>(initialTags)

  return (
    <TagEditor
      customerId={customerId}
      tags={tags}
      onTagsChange={setTags}
      onViewTranscript={(audioRecordId, highlight) => {
        const el = document.getElementById("recordings-section")
        if (el) el.scrollIntoView({ behavior: "smooth" })
      }}
    />
  )
}
