/**
 * src/main/db/connection.ts
 *
 * Управление единственным соединением с зашифрованной БД и парольной
 * политикой.
 *
 * Жизненный цикл:
 *  - setupDatabase(password): создаёт новую БД с Argon2id-ключом (v2).
 *  - unlockDatabase(password): открывает существующую БД. Автоматически
 *    выбирает KDF по версии файла соли (v1 PBKDF2 для legacy, v2 Argon2id).
 *    Выставляет флаги kdfNeedsUpgrade и weakPasswordDetected.
 *  - changePassword(old, new): перешифровывает БД и всегда мигрирует на v2.
 *  - closeDatabase(): закрывает соединение и сбрасывает флаги.
 *
 * Соль хранится в файле `psynote.salt` рядом с БД с однобайтным префиксом
 * версии для v2; для v1 (legacy) файл содержит ровно 16 байт без префикса —
 * см. parseSaltFile в services/crypto.
 */
import Database from 'better-sqlite3-multiple-ciphers'
import { app } from 'electron'
import { existsSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  KDF_CURRENT,
  deriveKey,
  ensureCurrentPasswordRequirements,
  generateSaltV2,
  keyToSqlcipherLiteral,
  meetsCurrentPasswordRequirements,
  packSaltV2,
  parseSaltFile
} from '../services/crypto'
import { runMigrations } from './migrator'

export type DbHandle = Database.Database

let dbRef: DbHandle | null = null
let kdfNeedsUpgrade = false
let weakPasswordDetected = false

function dbPath(): string {
  return join(app.getPath('userData'), 'psynote.db')
}

function saltPath(): string {
  return join(app.getPath('userData'), 'psynote.salt')
}

export function isInitialized(): boolean {
  // Минимальный признак инициализации — наличие обоих файлов.
  return existsSync(dbPath()) && existsSync(saltPath())
}

export function isUnlocked(): boolean {
  return dbRef !== null
}

export function getDb(): DbHandle {
  if (!dbRef) throw new Error('БД не открыта (требуется ввод пароля)')
  return dbRef
}

/**
 * Флаги, которые renderer проверяет после успешного unlock для решения,
 * нужно ли принудительно показать диалог смены пароля.
 *
 *  - kdfNeedsUpgrade: файл соли v1 (старый PBKDF2). После смены пароля
 *    автоматически переедет на v2.
 *  - weakPasswordDetected: открытый пароль короче текущего минимума
 *    (см. PASSWORD_MIN_LENGTH). Пользователю надо его сменить, чтобы
 *    привести БД в соответствие с обновлёнными требованиями.
 */
export function getSecurityFlags(): {
  kdfNeedsUpgrade: boolean
  weakPasswordDetected: boolean
} {
  return { kdfNeedsUpgrade, weakPasswordDetected }
}

function wipePartialState(): void {
  for (const p of [dbPath(), `${dbPath()}-wal`, `${dbPath()}-shm`, saltPath()]) {
    try {
      rmSync(p, { force: true })
    } catch {
      // ignore
    }
  }
}

/**
 * Первичная настройка. Новые БД всегда создаются с KDF v2 (Argon2id).
 * Старые пароли (короче PASSWORD_MIN_LENGTH) не допускаются.
 */
export function setupDatabase(password: string): void {
  ensureCurrentPasswordRequirements(password)
  if (isInitialized()) {
    throw new Error('БД уже инициализирована — нельзя настраивать пароль повторно')
  }
  // Битое состояние: одного из файлов нет. Чистим, чтобы старт был «с нуля».
  if (existsSync(dbPath()) || existsSync(saltPath())) {
    wipePartialState()
  }

  const salt = generateSaltV2()
  const key = deriveKey(2, password, salt)
  const db = new Database(dbPath())
  try {
    db.pragma(`cipher='sqlcipher'`)
    db.pragma(`key=${keyToSqlcipherLiteral(key)}`)
    db.pragma('journal_mode = WAL')
    runMigrations(db)
  } catch (err) {
    try {
      db.close()
    } catch {
      // ignore
    }
    wipePartialState()
    throw err
  } finally {
    // Сужаем окно жизни производного ключа в памяти. Это best-effort:
    // hex-копию внутри строки-литерала и буферы SQLCipher затереть нельзя.
    key.fill(0)
  }

  writeFileSync(saltPath(), packSaltV2(salt), { mode: 0o600 })
  dbRef = db
  // Свежая БД — никаких флагов про апгрейд.
  kdfNeedsUpgrade = false
  weakPasswordDetected = false
}

/**
 * Открыть существующую БД. Поддерживает оба формата соли:
 *   - v1 (legacy, 16 байт без префикса) → PBKDF2;
 *   - v2 (33 байта, префикс 0x02) → Argon2id.
 * Возвращает true при успехе, false если пароль неверный.
 */
export function unlockDatabase(password: string): boolean {
  if (dbRef) return true
  if (!isInitialized()) throw new Error('БД ещё не инициализирована')

  let parsed
  try {
    parsed = parseSaltFile(readFileSync(saltPath()))
  } catch (e) {
    throw e instanceof Error ? e : new Error(String(e))
  }
  const { version, salt } = parsed
  const key = deriveKey(version, password, salt)

  const db = new Database(dbPath())
  try {
    db.pragma(`cipher='sqlcipher'`)
    db.pragma(`key=${keyToSqlcipherLiteral(key)}`)
    db.pragma('journal_mode = WAL')
    db.prepare('SELECT 1').get()
    runMigrations(db)
  } catch (err) {
    try {
      db.close()
    } catch {
      // ignore
    }
    const msg = err instanceof Error ? err.message : String(err)
    if (/not a database|file is encrypted|wrong/i.test(msg)) {
      return false
    }
    throw err
  } finally {
    // Best-effort зануление производного ключа (см. комментарий в setupDatabase).
    key.fill(0)
  }

  dbRef = db
  kdfNeedsUpgrade = version !== KDF_CURRENT
  weakPasswordDetected = !meetsCurrentPasswordRequirements(password)
  return true
}

export function closeDatabase(): void {
  if (!dbRef) return
  try {
    dbRef.close()
  } finally {
    dbRef = null
    kdfNeedsUpgrade = false
    weakPasswordDetected = false
  }
}

/**
 * Сменить пароль. Должна быть открытая БД (пользователь уже расшифровал её
 * текущим паролем). Алгоритм:
 *   1. Проверить старый пароль через probe-соединение (readonly), используя
 *      ТЕКУЩУЮ версию соли (v1 или v2 — то, что лежит на диске).
 *   2. Сгенерировать новую соль v2 (32 байта, Argon2id).
 *   3. PRAGMA rekey с новым ключом.
 *   4. Атомарно (через rename из *.tmp) переписать файл соли в формате v2.
 *   5. Если step 4 упал — best-effort откат rekey к старому ключу.
 *
 * После успешной смены пароля: kdfNeedsUpgrade=false, weakPasswordDetected=false.
 * Это и есть механизм миграции v1 → v2: первая же смена пароля переводит
 * БД на Argon2id.
 */
export function changePassword(oldPassword: string, newPassword: string): void {
  if (!dbRef) throw new Error('БД не открыта — сначала нужно ввести текущий пароль')
  if (!oldPassword) throw new Error('Введите текущий пароль')
  ensureCurrentPasswordRequirements(newPassword)

  const { version: oldVersion, salt: oldSaltRaw } = parseSaltFile(
    readFileSync(saltPath())
  )
  const oldKey = deriveKey(oldVersion, oldPassword, oldSaltRaw)
  let newKey: Buffer | null = null

  try {
    // Проверка старого пароля через отдельное readonly-соединение.
    const probe = new Database(dbPath(), { readonly: true })
    try {
      probe.pragma(`cipher='sqlcipher'`)
      probe.pragma(`key=${keyToSqlcipherLiteral(oldKey)}`)
      probe.prepare('SELECT 1').get()
    } catch {
      try {
        probe.close()
      } catch {
        // ignore
      }
      throw new Error('Текущий пароль неверный')
    }
    probe.close()

    const newSalt = generateSaltV2()
    newKey = deriveKey(2, newPassword, newSalt)

    // SQLCipher не поддерживает PRAGMA rekey в WAL-режиме
    // (известное ограничение: «Rekeying is not supported in WAL journal mode»).
    // Workaround: временно переключаемся на DELETE-журнал, делаем rekey,
    // потом возвращаем WAL. На время операции БД остаётся консистентной —
    // другие соединения к этому файлу из приложения не открываются.
    const prevJournalMode =
      (dbRef.pragma('journal_mode', { simple: true }) as string) ?? 'wal'

    const rekeyWithoutWal = (literalKey: string): void => {
      dbRef!.pragma('journal_mode = DELETE')
      try {
        dbRef!.pragma(`rekey=${literalKey}`)
      } finally {
        // Возвращаем исходный журнальный режим в любом случае.
        dbRef!.pragma(`journal_mode = ${prevJournalMode}`)
      }
    }

    // 1. rekey БД новым ключом.
    rekeyWithoutWal(keyToSqlcipherLiteral(newKey))

    // 2. Пишем новую соль атомарно: tmp → rename.
    const tmpSalt = saltPath() + '.tmp'
    writeFileSync(tmpSalt, packSaltV2(newSalt), { mode: 0o600 })
    try {
      renameSync(tmpSalt, saltPath())
    } catch (err) {
      // Откат: возвращаем старый ключ (тоже через DELETE-журнал).
      try {
        rekeyWithoutWal(keyToSqlcipherLiteral(oldKey))
      } catch {
        throw new Error(
          'Не удалось обновить файл соли и откатить пароль. Восстановите из резервной копии.'
        )
      }
      throw err
    }

    kdfNeedsUpgrade = false
    weakPasswordDetected = false
  } finally {
    // Best-effort зануление производных ключей: сужаем окно их жизни в памяти.
    // Hex-копии в строках-литералах и внутренних буферах SQLCipher затереть
    // из JS нельзя — это снижение экспозиции, а не гарантия.
    oldKey.fill(0)
    newKey?.fill(0)
  }
}
