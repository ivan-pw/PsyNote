/**
 * src/shared/schemas.ts
 *
 * zod-схемы для валидации payload'ов IPC. Используем их в main как
 * последний рубеж: даже если renderer был скомпрометирован, в БД попадут
 * только структурно корректные данные.
 *
 * Каждой схеме соответствует TypeScript-тип через z.infer<…>.
 */
import { z } from 'zod'
import { HISTORIZED_FIELDS } from './historized'
import { MEETING_STATUSES } from './types'

// ─── Auth ────────────────────────────────────────────────────────────────────
// Минимум совпадает с PASSWORD_MIN_LENGTH в src/main/services/crypto.ts.
// Если меняем здесь — не забыть обновить и там, и UI-метр силы.
export const passwordSchema = z
  .string()
  .min(12, 'Пароль должен быть не короче 12 символов')
  .max(256, 'Слишком длинный пароль')

export const setupPasswordInput = z.object({ password: passwordSchema })
export type SetupPasswordInput = z.infer<typeof setupPasswordInput>

export const unlockInput = z.object({ password: z.string().min(1).max(256) })
export type UnlockInput = z.infer<typeof unlockInput>

export const changePasswordInput = z.object({
  oldPassword: z.string().min(1).max(256),
  newPassword: passwordSchema
})
export type ChangePasswordInput = z.infer<typeof changePasswordInput>

// ─── Общие хелперы ──────────────────────────────────────────────────────────
const id = z.number().int().positive()
const trimmedOptText = z.string().trim().max(2000).nullish().transform((v) => v?.trim() || null)
const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')
  .nullish()
  .transform((v) => v || null)
const fieldKey = z.enum(HISTORIZED_FIELDS)
// Год рождения: для ввода «только возраст». Диапазон с запасом.
const birthYear = z
  .number()
  .int()
  .min(1900, 'Год рождения слишком давний')
  .max(2100, 'Год рождения некорректен')
  .nullish()
  .transform((v) => v ?? null)

// ─── Clients ─────────────────────────────────────────────────────────────────
export const clientsListInput = z
  .object({ includeArchived: z.boolean().optional() })
  .optional()

export const clientGetInput = z.object({ id })

export const clientCreateInput = z.object({
  full_name: z.string().trim().min(1, 'Имя обязательно').max(200),
  birth_date: isoDate,
  birth_year: birthYear,
  notes_short: trimmedOptText,
  phone: trimmedOptText,
  email: trimmedOptText,
  messenger: trimmedOptText,
  video_link: trimmedOptText,
  diagnosis: trimmedOptText,
  medications: trimmedOptText,
  doctor: trimmedOptText
})

export const clientUpdateProfileInput = z.object({
  id,
  patch: z.object({
    full_name: z.string().trim().min(1).max(200).optional(),
    birth_date: isoDate,
    birth_year: birthYear,
    notes_short: trimmedOptText
  })
})

export const clientUpdateFieldInput = z.object({
  id,
  field: fieldKey,
  value: z.string().trim().max(2000).nullable(),
  note: z.string().trim().max(500).optional()
})

export const clientIdInput = z.object({ id })

// ─── Revisions ──────────────────────────────────────────────────────────────
export const revisionsListByFieldInput = z.object({
  clientId: id,
  field: fieldKey
})

// ─── Notes ──────────────────────────────────────────────────────────────────
const noteBody = z.string().trim().min(1, 'Заметка не может быть пустой').max(5000)

export const noteListByClientInput = z.object({ clientId: id })
export const noteCreateInput = z.object({
  client_id: id,
  color_id: id.nullable(),
  body: noteBody
})
export const noteUpdateInput = z.object({
  id,
  patch: z
    .object({
      color_id: id.nullable().optional(),
      body: noteBody.optional()
    })
    .partial()
})
export const noteIdInput = z.object({ id })

// ─── Note colors (палитра) ──────────────────────────────────────────────────
const hex = z
  .string()
  .trim()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Цвет должен быть в формате #RRGGBB')
const colorLabel = z.string().trim().min(1, 'Подпись обязательна').max(40)

export const colorCreateInput = z.object({
  hex,
  label: colorLabel,
  sort_order: z.number().int().optional()
})
export const colorUpdateInput = z.object({
  id,
  patch: z.object({
    hex: hex.optional(),
    label: colorLabel.optional(),
    sort_order: z.number().int().optional()
  })
})
export const colorReorderInput = z.object({
  ids: z.array(id).min(1).max(50)
})
export const colorReplaceInput = z.object({
  fromId: id,
  toId: id.nullable() // null = снять цвет с заметок и удалить
})

// ─── Meetings ───────────────────────────────────────────────────────────────
const meetingStatus = z.enum(MEETING_STATUSES)
const isoDateTime = z.string().min(10).max(40)

const meetingBody = {
  client_id: id,
  starts_at: isoDateTime,
  ends_at: isoDateTime,
  status: meetingStatus,
  comment: trimmedOptText
} as const

export const meetingListByClientInput = z.object({ clientId: id })
export const meetingListInRangeInput = z.object({
  from: isoDateTime,
  to: isoDateTime
})
export const meetingCreateInput = z.object(meetingBody)
export const meetingUpdateInput = z.object({
  id,
  patch: z
    .object({
      starts_at: isoDateTime.optional(),
      ends_at: isoDateTime.optional(),
      status: meetingStatus.optional(),
      comment: trimmedOptText
    })
    .partial()
})
export const meetingIdInput = z.object({ id })

// ─── Anamneses ──────────────────────────────────────────────────────────────
const anamnesisBody = {
  complaints: trimmedOptText,
  life_history: trimmedOptText,
  family_history: trimmedOptText,
  medical_history: trimmedOptText,
  mental_history: trimmedOptText,
  substances: trimmedOptText,
  notes: trimmedOptText
} as const

const isoDateRequired = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата должна быть в формате YYYY-MM-DD')

export const anamnesisCreateInput = z.object({
  client_id: id,
  input: z.object({
    taken_on: isoDateRequired,
    ...anamnesisBody
  })
})

export const anamnesisUpdateInput = z.object({
  id,
  patch: z.object({
    taken_on: isoDateRequired.optional(),
    ...anamnesisBody
  })
})

export const anamnesisListByClientInput = z.object({ clientId: id })
export const anamnesisIdInput = z.object({ id })

// ─── Meeting protocols ──────────────────────────────────────────────────────
const protocolBody = {
  summary: trimmedOptText,
  techniques: trimmedOptText,
  client_state: trimmedOptText,
  homework: trimmedOptText,
  plan_next: trimmedOptText,
  private_notes: trimmedOptText
} as const

export const protocolGetByMeetingInput = z.object({ meetingId: id })
export const protocolIdInput = z.object({ id })
export const protocolCreateInput = z.object({
  meetingId: id,
  input: z.object(protocolBody)
})
export const protocolUpsertByMeetingInput = z.object({
  meetingId: id,
  input: z.object(protocolBody)
})
export const protocolUpdateInput = z.object({
  id,
  patch: z.object(protocolBody)
})

// ─── Revisions: удаление ────────────────────────────────────────────────────
export const revisionIdInput = z.object({ id })

// ─── Medication presets ─────────────────────────────────────────────────────
const medicationName = z.string().trim().min(1, 'Название обязательно').max(120)

export const medicationPresetCreateInput = z.object({
  name: medicationName,
  sort_order: z.number().int().optional()
})
export const medicationPresetUpdateInput = z.object({
  id,
  patch: z.object({
    name: medicationName.optional(),
    sort_order: z.number().int().optional()
  })
})
export const medicationPresetIdInput = z.object({ id })
export const medicationPresetReorderInput = z.object({
  ids: z.array(id).min(1).max(500)
})

// ─── Timeline ───────────────────────────────────────────────────────────────
export const timelineKind = z.enum([
  'meeting',
  'revision',
  'anamnesis',
  'note_event',
  'protocol',
  'client_created'
])
export const timelineByClientInput = z.object({
  clientId: id,
  query: z
    .object({
      from: z.string().optional(),
      to: z.string().optional(),
      kinds: z.array(timelineKind).optional(),
      limit: z.number().int().positive().max(2000).optional()
    })
    .optional()
})

// ─── Search ─────────────────────────────────────────────────────────────────
export const searchEntityKind = z.enum([
  'client',
  'note',
  'anamnesis',
  'revision',
  'protocol'
])
export const searchQueryInput = z.object({
  q: z.string().trim().min(1).max(200),
  entities: z.array(searchEntityKind).optional(),
  limit: z.number().int().positive().max(100).optional()
})

// ─── EULA ───────────────────────────────────────────────────────────────────
export const eulaAcceptInput = z.object({
  version: z.number().int().positive().max(10_000)
})

// ─── Settings (полноценный k/v IPC) ─────────────────────────────────────────
export const settingsGetInput = z.object({ key: z.string().min(1).max(100) })
export const settingsSetInput = z.object({
  key: z.string().min(1).max(100),
  // value — произвольный JSON; явно валидировать тип значения — на стороне
  // конкретного потребителя (theme/locale/…).
  value: z.unknown()
})
