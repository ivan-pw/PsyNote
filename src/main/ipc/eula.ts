/**
 * src/main/ipc/eula.ts
 *
 * IPC-домен `eula` — статус и принятие лицензионного соглашения.
 * Работает без открытой БД (см. services/eula.ts): гейт показывается
 * до setup/unlock.
 */
import { ipcMain } from 'electron'
import { acceptEula, getEulaStatus } from '../services/eula'
import { eulaAcceptInput } from '@shared/schemas'

export function registerEulaIpc(): void {
  ipcMain.handle('eula:status', () => getEulaStatus())

  ipcMain.handle('eula:accept', (_e, raw) => {
    const { version } = eulaAcceptInput.parse(raw)
    acceptEula(version)
  })
}
