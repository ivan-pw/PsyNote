/**
 * src/main/ipc/index.ts
 *
 * Регистрация всех IPC-обработчиков. Вызывается из main/index.ts один раз
 * в whenReady. По мере добавления новых доменов сюда добавляются вызовы
 * register*Ipc().
 */
import { registerAnamnesesIpc } from './anamneses'
import { registerAppIpc } from './app'
import { registerAuthIpc } from './auth'
import { registerBackupIpc } from './backup'
import { registerClientsIpc } from './clients'
import { registerColorsIpc } from './colors'
import { registerEulaIpc } from './eula'
import { registerMedicationPresetsIpc } from './medicationPresets'
import { registerMeetingProtocolsIpc } from './meetingProtocols'
import { registerMeetingsIpc } from './meetings'
import { registerNotesIpc } from './notes'
import { registerRevisionsIpc } from './revisions'
import { registerSearchIpc } from './search'
import { registerSettingsIpc } from './settings'
import { registerTimelineIpc } from './timeline'

export function registerAllIpc(): void {
  registerAppIpc()
  registerEulaIpc()
  registerAuthIpc()
  registerClientsIpc()
  registerRevisionsIpc()
  registerAnamnesesIpc()
  registerMeetingsIpc()
  registerMeetingProtocolsIpc()
  registerNotesIpc()
  registerColorsIpc()
  registerMedicationPresetsIpc()
  registerTimelineIpc()
  registerSearchIpc()
  registerSettingsIpc()
  registerBackupIpc()
}
