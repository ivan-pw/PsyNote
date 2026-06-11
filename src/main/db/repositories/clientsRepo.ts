/**
 * src/main/db/repositories/clientsRepo.ts
 *
 * CRUD по таблице clients + согласованное обновление историзируемых полей.
 *
 * Инварианты:
 *  - При создании клиента непустые историзируемые поля сразу попадают в
 *    client_field_revisions и в clients.current_*. Всё в одной транзакции.
 *  - При updateField() пишется новая ревизия и обновляется clients.current_*.
 *    Транзакционно: иначе можно получить рассинхронизацию (хороший пример
 *    «почему так, а не иначе» — без транзакции пользователь увидит «новое»
 *    значение в карточке, но в истории его не будет).
 *  - Архивирование — мягкое: проставляется archived_at. Полное удаление — purge.
 */
import type { DbHandle } from '../connection'
import { HISTORIZED_FIELDS, type HistorizedField } from '@shared/historized'
import type {
  Client,
  ClientCreateInput,
  ClientProfileUpdate,
  FieldRevision
} from '@shared/types'

function nowIso(): string {
  return new Date().toISOString()
}

function rowToClient(row: Record<string, unknown>): Client {
  return {
    id: row.id as number,
    full_name: row.full_name as string,
    birth_date: (row.birth_date as string | null) ?? null,
    birth_year: (row.birth_year as number | null) ?? null,
    notes_short: (row.notes_short as string | null) ?? null,
    current_phone: (row.current_phone as string | null) ?? null,
    current_email: (row.current_email as string | null) ?? null,
    current_messenger: (row.current_messenger as string | null) ?? null,
    current_video_link: (row.current_video_link as string | null) ?? null,
    current_diagnosis: (row.current_diagnosis as string | null) ?? null,
    current_medications: (row.current_medications as string | null) ?? null,
    current_doctor: (row.current_doctor as string | null) ?? null,
    created_at: row.created_at as string,
    updated_at: row.updated_at as string,
    archived_at: (row.archived_at as string | null) ?? null
  }
}

// Маппинг 'phone' → 'current_phone' и т.д. Колонки whitelisted через HISTORIZED_FIELDS.
function currentCol(field: HistorizedField): string {
  return `current_${field}`
}

export function listClients(
  db: DbHandle,
  opts?: { includeArchived?: boolean }
): Client[] {
  const sql = opts?.includeArchived
    ? 'SELECT * FROM clients ORDER BY archived_at IS NOT NULL, full_name COLLATE NOCASE'
    : 'SELECT * FROM clients WHERE archived_at IS NULL ORDER BY full_name COLLATE NOCASE'
  return db
    .prepare<[], Record<string, unknown>>(sql)
    .all()
    .map(rowToClient)
}

export function getClient(db: DbHandle, id: number): Client {
  const row = db
    .prepare<[number], Record<string, unknown>>('SELECT * FROM clients WHERE id = ?')
    .get(id)
  if (!row) throw new Error(`Клиент ${id} не найден`)
  return rowToClient(row)
}

export function createClient(db: DbHandle, input: ClientCreateInput): Client {
  const now = nowIso()
  const insertClient = db.prepare<
    [string, string | null, number | null, string | null, string, string]
  >(
    `INSERT INTO clients (full_name, birth_date, birth_year, notes_short, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  )
  const insertRevision = db.prepare<[number, HistorizedField, string, string]>(
    `INSERT INTO client_field_revisions (client_id, field_key, value, changed_at)
     VALUES (?, ?, ?, ?)`
  )

  const tx = db.transaction((data: ClientCreateInput) => {
    const result = insertClient.run(
      data.full_name,
      data.birth_date ?? null,
      data.birth_year ?? null,
      data.notes_short ?? null,
      now,
      now
    )
    const id = Number(result.lastInsertRowid)

    for (const field of HISTORIZED_FIELDS) {
      const value = data[field]
      if (value !== undefined && value !== null && value !== '') {
        insertRevision.run(id, field, value, now)
        // Имя колонки нельзя параметризовать через `?`, но field — из whitelist'а
        // HISTORIZED_FIELDS, поэтому интерполяция безопасна.
        db.prepare<[string, number]>(
          `UPDATE clients SET ${currentCol(field)} = ? WHERE id = ?`
        ).run(value, id)
      }
    }
    return id
  })

  const newId = tx(input)
  return getClient(db, newId)
}

export function updateClientProfile(
  db: DbHandle,
  id: number,
  patch: ClientProfileUpdate
): Client {
  const sets: string[] = []
  const params: unknown[] = []
  if (patch.full_name !== undefined) {
    sets.push('full_name = ?')
    params.push(patch.full_name)
  }
  if (patch.birth_date !== undefined) {
    sets.push('birth_date = ?')
    params.push(patch.birth_date)
  }
  if (patch.birth_year !== undefined) {
    sets.push('birth_year = ?')
    params.push(patch.birth_year)
  }
  if (patch.notes_short !== undefined) {
    sets.push('notes_short = ?')
    params.push(patch.notes_short)
  }
  if (sets.length === 0) return getClient(db, id)

  sets.push('updated_at = ?')
  params.push(nowIso())
  params.push(id)

  db.prepare(`UPDATE clients SET ${sets.join(', ')} WHERE id = ?`).run(...params)
  return getClient(db, id)
}

export function updateClientField(
  db: DbHandle,
  id: number,
  field: HistorizedField,
  value: string | null,
  note?: string
): FieldRevision {
  const now = nowIso()
  const insertRevision = db.prepare(
    `INSERT INTO client_field_revisions (client_id, field_key, value, changed_at, note)
     VALUES (?, ?, ?, ?, ?)`
  )
  const updateCurrent = db.prepare(
    `UPDATE clients SET ${currentCol(field)} = ?, updated_at = ? WHERE id = ?`
  )
  const fetchRevision = db.prepare<[number], Record<string, unknown>>(
    'SELECT * FROM client_field_revisions WHERE id = ?'
  )

  const tx = db.transaction(() => {
    const result = insertRevision.run(id, field, value, now, note ?? null)
    updateCurrent.run(value, now, id)
    return Number(result.lastInsertRowid)
  })

  const revId = tx()
  const row = fetchRevision.get(revId)
  if (!row) throw new Error('Не удалось прочитать новую ревизию')
  return {
    id: row.id as number,
    client_id: row.client_id as number,
    field_key: row.field_key as HistorizedField,
    value: (row.value as string | null) ?? null,
    changed_at: row.changed_at as string,
    note: (row.note as string | null) ?? null
  }
}

export function archiveClient(db: DbHandle, id: number): void {
  db.prepare('UPDATE clients SET archived_at = ?, updated_at = ? WHERE id = ?').run(
    nowIso(),
    nowIso(),
    id
  )
}

export function restoreClient(db: DbHandle, id: number): void {
  db.prepare('UPDATE clients SET archived_at = NULL, updated_at = ? WHERE id = ?').run(
    nowIso(),
    id
  )
}

export function purgeClient(db: DbHandle, id: number): void {
  // ON DELETE CASCADE сам почистит revisions, meetings, anamneses, notes.
  db.prepare('DELETE FROM clients WHERE id = ?').run(id)
}

/**
 * Удалить отдельную ревизию поля. Если эта ревизия — самая свежая по полю,
 * `current_*` пересчитывается на значение предыдущей ревизии (или NULL,
 * если ревизий по этому полю больше нет). Всё в одной транзакции.
 */
export function deleteFieldRevision(db: DbHandle, revisionId: number): void {
  const row = db
    .prepare<[number], { client_id: number; field_key: string; changed_at: string }>(
      'SELECT client_id, field_key, changed_at FROM client_field_revisions WHERE id = ?'
    )
    .get(revisionId)
  if (!row) throw new Error(`Ревизия ${revisionId} не найдена`)
  const fieldKey = row.field_key as HistorizedField
  if (!(HISTORIZED_FIELDS as readonly string[]).includes(fieldKey)) {
    throw new Error(`Неизвестное поле ревизии: ${fieldKey}`)
  }

  const tx = db.transaction(() => {
    db.prepare<[number]>('DELETE FROM client_field_revisions WHERE id = ?').run(
      revisionId
    )
    // Берём свежайшую оставшуюся ревизию по тому же полю и обновляем кэш.
    const latest = db
      .prepare<[number, string], { value: string | null }>(
        `SELECT value FROM client_field_revisions
         WHERE client_id = ? AND field_key = ?
         ORDER BY changed_at DESC, id DESC
         LIMIT 1`
      )
      .get(row.client_id, fieldKey)
    const newCurrent = latest?.value ?? null
    db.prepare<[string | null, string, number]>(
      `UPDATE clients SET ${currentCol(fieldKey)} = ?, updated_at = ? WHERE id = ?`
    ).run(newCurrent, nowIso(), row.client_id)
  })
  tx()
}

export function emptyTrash(db: DbHandle): void {
  db.prepare('DELETE FROM clients WHERE archived_at IS NOT NULL').run()
}
