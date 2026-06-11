/**
 * src/shared/types.ts
 *
 * Типы, общие для main и renderer.
 * Расширяется по мере появления сущностей.
 */
import type { HistorizedField } from './historized'

export type AppInfo = {
  version: string
  platform: NodeJS.Platform
}

// ─── Клиенты ─────────────────────────────────────────────────────────────────
export type Client = {
  id: number
  full_name: string
  birth_date: string | null
  /** Год рождения — для случая, когда известен только возраст. */
  birth_year: number | null
  notes_short: string | null
  current_phone: string | null
  current_email: string | null
  current_messenger: string | null
  current_video_link: string | null
  current_diagnosis: string | null
  current_medications: string | null
  current_doctor: string | null
  created_at: string
  updated_at: string
  archived_at: string | null
}

export type ClientCreateInput = {
  full_name: string
  birth_date?: string | null
  birth_year?: number | null
  notes_short?: string | null
  // Историзируемые поля — если заданы, создаются начальные ревизии.
  phone?: string | null
  email?: string | null
  messenger?: string | null
  video_link?: string | null
  diagnosis?: string | null
  medications?: string | null
  doctor?: string | null
}

export type ClientProfileUpdate = {
  full_name?: string
  birth_date?: string | null
  birth_year?: number | null
  notes_short?: string | null
}

// ─── Ревизии полей ──────────────────────────────────────────────────────────
export type FieldRevision = {
  id: number
  client_id: number
  field_key: HistorizedField
  value: string | null
  changed_at: string
  note: string | null
}

// ─── Пресеты медикаментов ───────────────────────────────────────────────────
// Справочник для автодополнения поля «Медикаменты» на странице клиента.
// Сами значения в client_field_revisions хранятся как JSON-массив строк.
export type MedicationPreset = {
  id: number
  name: string
  sort_order: number
}
export type MedicationPresetInput = {
  name: string
  sort_order?: number
}

// ─── Заметки ────────────────────────────────────────────────────────────────
export type NoteColor = {
  id: number
  hex: string
  label: string
  sort_order: number
}

export type NoteColorInput = {
  hex: string
  label: string
  sort_order?: number
}

export type Note = {
  id: number
  client_id: number
  color_id: number | null
  body: string
  created_at: string
  updated_at: string
}

export type NoteInput = {
  client_id: number
  color_id: number | null
  body: string
}

// ─── Встречи ────────────────────────────────────────────────────────────────
export const MEETING_STATUSES = ['planned', 'done', 'cancelled'] as const
export type MeetingStatus = (typeof MEETING_STATUSES)[number]

export type Meeting = {
  id: number
  client_id: number
  starts_at: string // ISO datetime
  ends_at: string
  status: MeetingStatus
  comment: string | null
  created_at: string
  updated_at: string
}

export type MeetingInput = {
  client_id: number
  starts_at: string
  ends_at: string
  status: MeetingStatus
  comment?: string | null
}

// ─── Протокол встречи ───────────────────────────────────────────────────────
// 1:1 с meeting. Все подполя nullable. После удаления встречи каскад убирает.
export type MeetingProtocol = {
  id: number
  meeting_id: number
  client_id: number
  summary: string | null
  techniques: string | null
  client_state: string | null
  homework: string | null
  plan_next: string | null
  private_notes: string | null
  created_at: string
  updated_at: string
}

export type MeetingProtocolInput = {
  summary?: string | null
  techniques?: string | null
  client_state?: string | null
  homework?: string | null
  plan_next?: string | null
  private_notes?: string | null
}

// ─── Анамнез ────────────────────────────────────────────────────────────────
// Подполя зафиксированы в plan.md §0 (#19). Все nullable, кроме taken_on.
export type Anamnesis = {
  id: number
  client_id: number
  taken_on: string // ISO yyyy-mm-dd
  complaints: string | null
  life_history: string | null
  family_history: string | null
  medical_history: string | null
  mental_history: string | null
  substances: string | null
  notes: string | null
  created_at: string
  updated_at: string
}

export type AnamnesisInput = {
  taken_on: string
  complaints?: string | null
  life_history?: string | null
  family_history?: string | null
  medical_history?: string | null
  mental_history?: string | null
  substances?: string | null
  notes?: string | null
}

// ─── Таймлайн ───────────────────────────────────────────────────────────────
export type TimelineKind =
  | 'meeting'
  | 'revision'
  | 'anamnesis'
  | 'note_event'
  | 'protocol'
  | 'client_created'

export type TimelineEvent = {
  kind: TimelineKind
  ref_id: number
  client_id: number
  at: string
  payload_text: string | null
  // Для revision: aux1 = field_key, aux2 = prev_value, extra = note (комментарий к изменению).
  // Для meeting: aux1 = status.
  // Для note:    aux1 = color_id (как строка).
  aux1: string | null
  aux2: string | null
  extra: string | null
}

export type TimelineQuery = {
  from?: string
  to?: string
  kinds?: TimelineKind[]
  limit?: number
}

// ─── Поиск (FTS5) ────────────────────────────────────────────────────────────
export type SearchEntity = 'client' | 'note' | 'anamnesis' | 'revision' | 'protocol'

export type SearchHit = {
  entity_type: SearchEntity
  entity_id: number
  client_id: number
  /** Превью найденного текста (rank по FTS5 → выбираем сниппет/первое поле). */
  snippet: string
  /** Имя клиента из JOIN — чтобы не делать второй запрос на стороне renderer. */
  client_name: string | null
}

export type Theme = 'system' | 'light' | 'dark'
export type Locale = 'ru' | 'en'
