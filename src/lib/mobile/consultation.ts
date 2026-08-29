import { Prisma } from "@prisma/client"
import { Session } from "@/lib/auth"

export const CONSULTATION_POLICY_VERSION = "consultation-recording-v1"

export function isConsultant(session: Session): boolean {
  return session.user.role === "consultant"
}

export function consultantCustomerWhere(session: Session, customerId: string): Prisma.CustomerWhereInput {
  return {
    id: customerId,
    orgId: session.user.orgId,
    consultantId: session.user.id,
  }
}

export function consultationWhere(session: Session, sessionId: string): Prisma.ConsultationSessionWhereInput {
  return {
    id: sessionId,
    orgId: session.user.orgId,
    consultantId: session.user.id,
  }
}

export function parseTags(rawTags: string | null): string[] {
  if (!rawTags) return []
  try {
    const parsed: unknown = JSON.parse(rawTags)
    return Array.isArray(parsed)
      ? parsed.filter((tag): tag is string => typeof tag === "string")
      : []
  } catch {
    return []
  }
}

export function rankScriptForTrigger(
  script: { title: string; content: string; category: string; tags: string | null; useCount: number },
  triggerText: string
): number {
  const haystack = `${script.title} ${script.content} ${script.category} ${parseTags(script.tags).join(" ")}`.toLocaleLowerCase()
  const chinesePhrases = (triggerText.match(/[\p{Script=Han}]+/gu) ?? []).flatMap((phrase) => {
    const terms: string[] = []
    for (let start = 0; start < phrase.length - 1; start += 1) {
      for (let length = 2; length <= Math.min(4, phrase.length - start); length += 1) {
        terms.push(phrase.slice(start, start + length))
      }
    }
    return terms
  })
  const latinTerms = triggerText.toLocaleLowerCase().match(/[a-z0-9]{3,}/g) ?? []
  const terms = [...new Set([...chinesePhrases, ...latinTerms])]
  const matches = terms.reduce((count, term) => count + (haystack.includes(term) ? 1 : 0), 0)

  return matches === 0 ? 0 : matches * 1000 + Math.min(script.useCount, 999)
}
