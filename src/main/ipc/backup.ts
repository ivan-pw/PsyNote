/**
 * src/main/ipc/backup.ts
 *
 * IPC-домен `backup`.
 *  - backup:list-backups → BackupInfo[]
 *  - backup:create-now    → BackupInfo (ротация по backup_keep_count из settings)
 *  - backup:delete        → void
 *  - backup:restore       → закрывает БД, восстанавливает файлы, перезапускает
 *                           приложение (после рестарта — обычный unlock паролем,
 *                           действовавшим на момент бэкапа)
 *  - backup:export-json   → string (фактический путь сохранения)
 *
 * Экспорт открывает системный «Save As» диалог; пользователь сам выбирает
 * место сохранения. Это безопаснее, чем класть plaintext рядом с userData.
 */
import { app, dialog, ipcMain } from 'electron'
import { z } from 'zod'
import { closeDatabase, getDb } from '../db/connection'
import { getSetting } from '../db/repositories/settingsRepo'
import {
  createBackup,
  deleteBackup,
  listBackups,
  restoreBackup
} from '../services/backup'
import { exportToJson } from '../services/exportJson'

const deleteInput = z.object({
  path: z.string().min(1)
})

export function registerBackupIpc(): void {
  ipcMain.handle('backup:list-backups', () => listBackups())

  ipcMain.handle('backup:create-now', () => {
    const keep = (getSetting<number>(getDb(), 'backup_keep_count') ?? 10) | 0
    return createBackup(keep)
  })

  ipcMain.handle('backup:delete', (_e, raw) => {
    const { path } = deleteInput.parse(raw)
    deleteBackup(path)
  })

  ipcMain.handle('backup:restore', (_e, raw) => {
    const { path } = deleteInput.parse(raw)
    // Заменять файл БД под открытым соединением нельзя — сначала закрываем.
    closeDatabase()
    restoreBackup(path)
    // Чистый рестарт: после перезапуска пользователь вводит пароль,
    // действовавший на момент создания бэкапа.
    app.relaunch()
    app.quit()
  })

  ipcMain.handle('backup:export-json', async () => {
    const result = await dialog.showSaveDialog({
      title: 'Экспортировать данные в JSON',
      defaultPath: `psynote-export-${new Date().toISOString().slice(0, 10)}.json`,
      filters: [{ name: 'JSON', extensions: ['json'] }]
    })
    if (result.canceled || !result.filePath) return null
    exportToJson(getDb(), result.filePath)
    return result.filePath
  })
}
