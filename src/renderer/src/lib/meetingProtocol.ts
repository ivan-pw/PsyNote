/**
 * src/renderer/src/lib/meetingProtocol.ts
 *
 * Метаданные подполей протокола встречи: i18n-ключи подписи и подсказки,
 * порядок отображения (рендерить через t(label) / t(placeholder)).
 * Используется в MeetingProtocolDialog.
 */
import type { MeetingProtocol } from '@shared/types'

export type ProtocolFieldKey =
  | 'summary'
  | 'techniques'
  | 'client_state'
  | 'homework'
  | 'plan_next'
  | 'private_notes'

export const PROTOCOL_FIELDS: Array<{
  key: ProtocolFieldKey
  label: string
  placeholder: string
}> = [
  {
    key: 'summary',
    label: 'protocol.fields.summary',
    placeholder: 'protocol.placeholder.summary'
  },
  {
    key: 'techniques',
    label: 'protocol.fields.techniques',
    placeholder: 'protocol.placeholder.techniques'
  },
  {
    key: 'client_state',
    label: 'protocol.fields.client_state',
    placeholder: 'protocol.placeholder.client_state'
  },
  {
    key: 'homework',
    label: 'protocol.fields.homework',
    placeholder: 'protocol.placeholder.homework'
  },
  {
    key: 'plan_next',
    label: 'protocol.fields.plan_next',
    placeholder: 'protocol.placeholder.plan_next'
  },
  {
    key: 'private_notes',
    label: 'protocol.fields.private_notes',
    placeholder: 'protocol.placeholder.private_notes'
  }
]

export function protocolPreview(
  p: Pick<MeetingProtocol, 'summary' | 'plan_next' | 'client_state' | 'homework' | 'techniques' | 'private_notes'>
): string | null {
  return (
    p.summary?.trim() ||
    p.plan_next?.trim() ||
    p.client_state?.trim() ||
    p.homework?.trim() ||
    p.techniques?.trim() ||
    p.private_notes?.trim() ||
    null
  )
}
