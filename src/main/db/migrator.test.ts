/**
 * src/main/db/migrator.test.ts
 *
 * Тесты схемы: все миграции применяются с нуля, идемпотентны, ключевые
 * таблицы/колонки/VIEW существуют.
 *
 * В тестах используется обычный better-sqlite3 (Node ABI): production-пакет
 * better-sqlite3-multiple-ciphers пересобран под Electron и в vitest не
 * загружается. API совместим; шифрование в тестах схемы не нужно.
 */
import { describe, expect, it } from 'vitest'
import Database from 'better-sqlite3'
import { runMigrations } from './migrator'
import type { DbHandle } from './connection'

function freshDb(): DbHandle {
  const db = new Database(':memory:') as unknown as DbHandle
  runMigrations(db)
  return db
}

function tableColumns(db: DbHandle, table: string): string[] {
  return (db.pragma(`table_info(${table})`) as Array<{ name: string }>).map(
    (c) => c.name
  )
}

describe('runMigrations', () => {
  it('доводит пустую БД до последней версии', () => {
    const db = freshDb()
    expect(db.pragma('user_version', { simple: true })).toBe(9)
  })

  it('идемпотентен: повторный запуск ничего не ломает', () => {
    const db = freshDb()
    expect(() => runMigrations(db)).not.toThrow()
    expect(db.pragma('user_version', { simple: true })).toBe(9)
  })

  it('создаёт все основные таблицы', () => {
    const db = freshDb()
    const tables = (
      db
        .prepare<[], { name: string }>(
          `SELECT name FROM sqlite_master WHERE type IN ('table','view')`
        )
        .all() as Array<{ name: string }>
    ).map((r) => r.name)
    for (const t of [
      'clients',
      'client_field_revisions',
      'anamneses',
      'meetings',
      'meeting_protocols',
      'notes',
      'note_colors',
      'note_events',
      'medication_presets',
      'settings',
      'client_timeline'
    ]) {
      expect(tables, `нет таблицы/VIEW ${t}`).toContain(t)
    }
  })

  it('clients содержит колонки миграции 008 (birth_year, current_doctor)', () => {
    const cols = tableColumns(freshDb(), 'clients')
    expect(cols).toContain('birth_year')
    expect(cols).toContain('current_doctor')
  })

  it('VIEW client_timeline выполняется', () => {
    const db = freshDb()
    expect(() =>
      db.prepare('SELECT * FROM client_timeline LIMIT 1').all()
    ).not.toThrow()
  })

  it('сиды на месте: палитра цветов и настройки', () => {
    const db = freshDb()
    const colors = db.prepare('SELECT COUNT(*) AS n FROM note_colors').get() as {
      n: number
    }
    expect(colors.n).toBeGreaterThanOrEqual(4)
    const locale = db
      .prepare(`SELECT value FROM settings WHERE key = 'locale'`)
      .get() as { value: string }
    expect(locale.value).toBe('"ru"')
  })
})
