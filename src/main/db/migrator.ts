/**
 * src/main/db/migrator.ts
 *
 * Простой migrator на базе SQLite `PRAGMA user_version`.
 *
 * Идея:
 *  - В коде есть массив миграций в порядке возрастания версий.
 *  - При запуске читаем user_version (0 у новой БД).
 *  - Применяем все миграции с user_version <= migration.version.
 *  - Каждая миграция оборачивается в транзакцию и в конце
 *    `PRAGMA user_version = N`.
 *
 * SQL-файлы импортируются как сырой текст через Vite-плагин `?raw`
 * (electron-vite использует Rollup; на сборке файл попадает строкой в бандл).
 * Альтернатива — `fs.readFileSync` рядом с собранным main; здесь выбран
 * вариант с инлайн-импортом, чтобы не возиться с копированием ассетов.
 */
import type { DbHandle } from './connection'

import init001 from './migrations/001_init.sql?raw'
import search002 from './migrations/002_search.sql?raw'
import protocols003 from './migrations/003_meeting_protocols.sql?raw'
import homeworkColor004 from './migrations/004_homework_color.sql?raw'
import noteEvents005 from './migrations/005_note_events.sql?raw'
import medicationPresets006 from './migrations/006_medication_presets.sql?raw'
import medicationPresetsSeed007 from './migrations/007_medication_presets_seed.sql?raw'
import ageDoctor008 from './migrations/008_age_doctor.sql?raw'
import noteEventPurgeFix009 from './migrations/009_note_event_purge_fix.sql?raw'

type Migration = {
  version: number
  name: string
  sql: string
}

const MIGRATIONS: Migration[] = [
  { version: 1, name: '001_init', sql: init001 },
  { version: 2, name: '002_search', sql: search002 },
  { version: 3, name: '003_meeting_protocols', sql: protocols003 },
  { version: 4, name: '004_homework_color', sql: homeworkColor004 },
  { version: 5, name: '005_note_events', sql: noteEvents005 },
  { version: 6, name: '006_medication_presets', sql: medicationPresets006 },
  { version: 7, name: '007_medication_presets_seed', sql: medicationPresetsSeed007 },
  { version: 8, name: '008_age_doctor', sql: ageDoctor008 },
  { version: 9, name: '009_note_event_purge_fix', sql: noteEventPurgeFix009 }
]

export function runMigrations(db: DbHandle): void {
  const current = (db.pragma('user_version', { simple: true }) as number) ?? 0

  for (const m of MIGRATIONS) {
    if (m.version <= current) continue
    const apply = db.transaction(() => {
      db.exec(m.sql)
      db.pragma(`user_version = ${m.version}`)
    })
    try {
      apply()
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      throw new Error(`Миграция ${m.name} (v${m.version}) упала: ${msg}`)
    }
  }
}
