/**
 * src/shared/historized.ts
 *
 * Полный список историзируемых полей клиента. Источник правды:
 * имена и порядок совпадают с колонками `current_*` в таблице clients
 * и с допустимыми значениями `field_key` в таблице client_field_revisions.
 *
 * Любое изменение этих полей создаёт новую ревизию в client_field_revisions
 * и обновляет соответствующее `current_*` в clients (атомарно, в одной транзакции).
 */
export const HISTORIZED_FIELDS = [
  'phone',
  'email',
  'messenger',
  'video_link',
  'diagnosis',
  'medications',
  'doctor'
] as const

export type HistorizedField = (typeof HISTORIZED_FIELDS)[number]

export function isHistorizedField(x: unknown): x is HistorizedField {
  return typeof x === 'string' && (HISTORIZED_FIELDS as readonly string[]).includes(x)
}
