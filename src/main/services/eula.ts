/**
 * src/main/services/eula.ts
 *
 * Хранение факта принятия лицензионного соглашения.
 *
 * Почему НЕ в settings (зашифрованная БД): соглашение должно показываться
 * и подтверждаться ДО создания/разблокировки БД — на первом запуске у
 * пользователя ещё нет пароля. Поэтому plain-JSON рядом с БД:
 * `userData/eula.json` → { acceptedVersion, acceptedAt }.
 *
 * Это не секрет — только отметка о согласии, права 0o600 как у соли.
 */
import { app } from 'electron'
import { existsSync, readFileSync, renameSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

export type EulaStatus = {
  acceptedVersion: number | null
}

function eulaPath(): string {
  return join(app.getPath('userData'), 'eula.json')
}

export function getEulaStatus(): EulaStatus {
  try {
    if (!existsSync(eulaPath())) return { acceptedVersion: null }
    const raw = JSON.parse(readFileSync(eulaPath(), 'utf8')) as {
      acceptedVersion?: unknown
    }
    const v = raw.acceptedVersion
    return {
      acceptedVersion: typeof v === 'number' && Number.isInteger(v) && v > 0 ? v : null
    }
  } catch (err) {
    // Битый файл трактуем как «не принято» — пользователь увидит соглашение снова.
    console.warn('eula.json повреждён, требуется повторное согласие:', err)
    return { acceptedVersion: null }
  }
}

export function acceptEula(version: number): void {
  const payload = JSON.stringify(
    { acceptedVersion: version, acceptedAt: new Date().toISOString() },
    null,
    2
  )
  // Атомарная запись: tmp → rename, чтобы не получить полупустой файл.
  const tmp = `${eulaPath()}.tmp`
  writeFileSync(tmp, payload, { encoding: 'utf8', mode: 0o600 })
  renameSync(tmp, eulaPath())
}
