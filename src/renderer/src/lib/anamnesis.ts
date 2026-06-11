/**
 * src/renderer/src/lib/anamnesis.ts
 *
 * Метаданные структурного анамнеза для UI: i18n-ключи подписей и порядок
 * отображения подполей в форме (рендерить через t(label)).
 *
 * Превью для таймлайна (anamnesisPreview) — короткая строка из первого
 * непустого подполя в порядке complaints → notes → life_history.
 * В таймлайн VIEW client_timeline эту же логику делает COALESCE,
 * но в renderer бывает удобно посчитать локально (например, на свежесозданном
 * анамнезе до инвалидации запроса).
 */
import type { Anamnesis } from '@shared/types'

export type AnamnesisFieldKey =
  | 'complaints'
  | 'life_history'
  | 'family_history'
  | 'medical_history'
  | 'mental_history'
  | 'substances'
  | 'notes'

export const ANAMNESIS_FIELDS: Array<{ key: AnamnesisFieldKey; label: string }> = [
  { key: 'complaints', label: 'anamnesis.fields.complaints' },
  { key: 'life_history', label: 'anamnesis.fields.life_history' },
  { key: 'family_history', label: 'anamnesis.fields.family_history' },
  { key: 'medical_history', label: 'anamnesis.fields.medical_history' },
  { key: 'mental_history', label: 'anamnesis.fields.mental_history' },
  { key: 'substances', label: 'anamnesis.fields.substances' },
  { key: 'notes', label: 'anamnesis.fields.notes' }
]

export function anamnesisPreview(a: Pick<Anamnesis, 'complaints' | 'notes' | 'life_history'>): string | null {
  return a.complaints?.trim() || a.notes?.trim() || a.life_history?.trim() || null
}

export function todayIsoDate(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
