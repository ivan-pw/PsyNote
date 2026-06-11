/**
 * src/main/db/repositories/clientsRepo.test.ts
 *
 * Транзакционные инварианты clientsRepo:
 *  - createClient: историзируемые поля → начальные ревизии + кэш current_*;
 *  - updateClientField: новая ревизия + обновлённый кэш;
 *  - deleteFieldRevision последней ревизии → откат current_* на предыдущую;
 *  - archive/restore/purge: мягкое удаление и каскад.
 *
 * better-sqlite3 (Node ABI) вместо *-multiple-ciphers — см. migrator.test.ts.
 */
import { beforeEach, describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from '../migrator'
import type { DbHandle } from '../connection'
import {
  archiveClient,
  createClient,
  deleteFieldRevision,
  getClient,
  listClients,
  purgeClient,
  restoreClient,
  updateClientField,
  updateClientProfile
} from './clientsRepo'

let db: DbHandle

beforeEach(() => {
  db = new Database(':memory:') as unknown as DbHandle
  db.pragma('foreign_keys = ON')
  runMigrations(db)
})

describe('createClient', () => {
  it('создаёт клиента с начальными ревизиями и кэшем current_*', () => {
    const c = createClient(db, {
      full_name: 'Тест Тестович',
      birth_date: '1990-05-01',
      phone: '+7 999 000-00-00',
      diagnosis: 'F41.1',
      doctor: 'Доктор Айболит'
    })
    expect(c.current_phone).toBe('+7 999 000-00-00')
    expect(c.current_diagnosis).toBe('F41.1')
    expect(c.current_doctor).toBe('Доктор Айболит')
    expect(c.current_email).toBeNull()

    const revs = db
      .prepare('SELECT field_key FROM client_field_revisions WHERE client_id = ?')
      .all(c.id) as Array<{ field_key: string }>
    expect(revs.map((r) => r.field_key).sort()).toEqual([
      'diagnosis',
      'doctor',
      'phone'
    ])
  })

  it('сохраняет birth_year, когда указан только возраст', () => {
    const c = createClient(db, { full_name: 'Без даты', birth_year: 1992 })
    expect(c.birth_year).toBe(1992)
    expect(c.birth_date).toBeNull()
  })
})

describe('updateClientProfile', () => {
  it('обновляет birth_year и full_name', () => {
    const c = createClient(db, { full_name: 'Было' })
    const updated = updateClientProfile(db, c.id, {
      full_name: 'Стало',
      birth_year: 1985
    })
    expect(updated.full_name).toBe('Стало')
    expect(updated.birth_year).toBe(1985)
  })
})

describe('updateClientField / deleteFieldRevision', () => {
  it('пишет ревизию и обновляет кэш; удаление последней ревизии откатывает кэш', () => {
    const c = createClient(db, { full_name: 'X', phone: 'старый' })
    const rev = updateClientField(db, c.id, 'phone', 'новый')
    expect(getClient(db, c.id).current_phone).toBe('новый')

    deleteFieldRevision(db, rev.id)
    expect(getClient(db, c.id).current_phone).toBe('старый')
  })

  it('удаление единственной ревизии очищает current_*', () => {
    const c = createClient(db, { full_name: 'X', email: 'a@b.c' })
    const rev = db
      .prepare(
        `SELECT id FROM client_field_revisions WHERE client_id = ? AND field_key = 'email'`
      )
      .get(c.id) as { id: number }
    deleteFieldRevision(db, rev.id)
    expect(getClient(db, c.id).current_email).toBeNull()
  })

  it('value=null означает «поле очищено»', () => {
    const c = createClient(db, { full_name: 'X', phone: '123' })
    updateClientField(db, c.id, 'phone', null)
    expect(getClient(db, c.id).current_phone).toBeNull()
  })
})

describe('archive / restore / purge', () => {
  it('архив скрывает из listClients, restore возвращает', () => {
    const c = createClient(db, { full_name: 'Архивный' })
    archiveClient(db, c.id)
    expect(listClients(db).map((x) => x.id)).not.toContain(c.id)
    expect(
      listClients(db, { includeArchived: true }).map((x) => x.id)
    ).toContain(c.id)

    restoreClient(db, c.id)
    expect(listClients(db).map((x) => x.id)).toContain(c.id)
  })

  it('purge каскадно удаляет ревизии и заметки', () => {
    const c = createClient(db, { full_name: 'Удаляемый', phone: '1' })
    db.prepare(
      `INSERT INTO notes (client_id, body, created_at, updated_at)
       VALUES (?, 'note', '2026-01-01', '2026-01-01')`
    ).run(c.id)

    purgeClient(db, c.id)

    const revs = db
      .prepare('SELECT COUNT(*) AS n FROM client_field_revisions WHERE client_id = ?')
      .get(c.id) as { n: number }
    const notes = db
      .prepare('SELECT COUNT(*) AS n FROM notes WHERE client_id = ?')
      .get(c.id) as { n: number }
    expect(revs.n).toBe(0)
    expect(notes.n).toBe(0)
    expect(() => getClient(db, c.id)).toThrow()
  })

  it('обычное удаление заметки по-прежнему логируется в note_events (регрессия 009)', () => {
    const c = createClient(db, { full_name: 'С заметкой' })
    const note = db
      .prepare(
        `INSERT INTO notes (client_id, body, created_at, updated_at)
         VALUES (?, 'note', '2026-01-01', '2026-01-01')`
      )
      .run(c.id)
    db.prepare('DELETE FROM notes WHERE id = ?').run(note.lastInsertRowid)

    const ev = db
      .prepare(
        `SELECT COUNT(*) AS n FROM note_events WHERE client_id = ? AND action = 'delete'`
      )
      .get(c.id) as { n: number }
    expect(ev.n).toBe(1)
  })
})
