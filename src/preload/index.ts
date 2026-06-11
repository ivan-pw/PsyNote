/**
 * src/preload/index.ts
 *
 * Preload-скрипт. Выполняется в изолированном контексте между main и renderer.
 *
 * Зачем: contextBridge — единственный безопасный способ дать renderer'у
 * (который не имеет nodeIntegration) типизированный набор функций для работы с main.
 *
 * Каналы IPC именуются как `<domain>:<action>` и соответствуют ipcMain.handle
 * в src/main/ipc/*.
 *
 * Тип Api лежит в @shared/api — общий для preload и renderer.
 */
import { contextBridge, ipcRenderer } from 'electron'
import type { Api } from '@shared/api'

const api: Api = {
  app: {
    getInfo: () => ipcRenderer.invoke('app:info'),
    quit: () => ipcRenderer.invoke('app:quit')
  },
  eula: {
    status: () => ipcRenderer.invoke('eula:status'),
    accept: (version) => ipcRenderer.invoke('eula:accept', { version })
  },
  auth: {
    getStatus: () => ipcRenderer.invoke('auth:get-status'),
    getSecurityFlags: () => ipcRenderer.invoke('auth:get-security-flags'),
    setupPassword: (password) => ipcRenderer.invoke('auth:setup', { password }),
    unlock: (password) => ipcRenderer.invoke('auth:unlock', { password }),
    lock: () => ipcRenderer.invoke('auth:lock'),
    changePassword: (oldPassword, newPassword) =>
      ipcRenderer.invoke('auth:change-password', { oldPassword, newPassword })
  },
  clients: {
    list: (opts) => ipcRenderer.invoke('clients:list', opts),
    get: (id) => ipcRenderer.invoke('clients:get', { id }),
    create: (input) => ipcRenderer.invoke('clients:create', input),
    updateProfile: (id, patch) => ipcRenderer.invoke('clients:update-profile', { id, patch }),
    updateField: (id, field, value, note) =>
      ipcRenderer.invoke('clients:update-field', { id, field, value, note }),
    archive: (id) => ipcRenderer.invoke('clients:archive', { id }),
    restore: (id) => ipcRenderer.invoke('clients:restore', { id }),
    purge: (id) => ipcRenderer.invoke('clients:purge', { id }),
    emptyTrash: () => ipcRenderer.invoke('clients:empty-trash')
  },
  revisions: {
    listByField: (clientId, field) =>
      ipcRenderer.invoke('revisions:list-by-field', { clientId, field }),
    delete: (id) => ipcRenderer.invoke('revisions:delete', { id })
  },
  anamneses: {
    listByClient: (clientId) =>
      ipcRenderer.invoke('anamneses:list-by-client', { clientId }),
    get: (id) => ipcRenderer.invoke('anamneses:get', { id }),
    create: (clientId, input) =>
      ipcRenderer.invoke('anamneses:create', { client_id: clientId, input }),
    update: (id, patch) => ipcRenderer.invoke('anamneses:update', { id, patch }),
    delete: (id) => ipcRenderer.invoke('anamneses:delete', { id })
  },
  meetings: {
    listByClient: (clientId) =>
      ipcRenderer.invoke('meetings:list-by-client', { clientId }),
    listInRange: (from, to) =>
      ipcRenderer.invoke('meetings:list-in-range', { from, to }),
    create: (input) => ipcRenderer.invoke('meetings:create', input),
    update: (id, patch) => ipcRenderer.invoke('meetings:update', { id, patch }),
    delete: (id) => ipcRenderer.invoke('meetings:delete', { id })
  },
  meetingProtocols: {
    getByMeeting: (meetingId) =>
      ipcRenderer.invoke('meeting-protocols:get-by-meeting', { meetingId }),
    get: (id) => ipcRenderer.invoke('meeting-protocols:get', { id }),
    create: (meetingId, input) =>
      ipcRenderer.invoke('meeting-protocols:create', { meetingId, input }),
    upsertByMeeting: (meetingId, input) =>
      ipcRenderer.invoke('meeting-protocols:upsert-by-meeting', { meetingId, input }),
    update: (id, patch) => ipcRenderer.invoke('meeting-protocols:update', { id, patch }),
    delete: (id) => ipcRenderer.invoke('meeting-protocols:delete', { id })
  },
  notes: {
    listByClient: (clientId) =>
      ipcRenderer.invoke('notes:list-by-client', { clientId }),
    create: (input) => ipcRenderer.invoke('notes:create', input),
    update: (id, patch) => ipcRenderer.invoke('notes:update', { id, patch }),
    delete: (id) => ipcRenderer.invoke('notes:delete', { id })
  },
  colors: {
    list: () => ipcRenderer.invoke('colors:list'),
    create: (input) => ipcRenderer.invoke('colors:create', input),
    update: (id, patch) => ipcRenderer.invoke('colors:update', { id, patch }),
    usageCount: (id) => ipcRenderer.invoke('colors:usage-count', { id }),
    replaceAndDelete: (fromId, toId) =>
      ipcRenderer.invoke('colors:replace-and-delete', { fromId, toId }),
    reorder: (ids) => ipcRenderer.invoke('colors:reorder', { ids })
  },
  medicationPresets: {
    list: () => ipcRenderer.invoke('medication-presets:list'),
    create: (input) => ipcRenderer.invoke('medication-presets:create', input),
    update: (id, patch) =>
      ipcRenderer.invoke('medication-presets:update', { id, patch }),
    delete: (id) => ipcRenderer.invoke('medication-presets:delete', { id }),
    reorder: (ids) => ipcRenderer.invoke('medication-presets:reorder', { ids })
  },
  timeline: {
    byClient: (clientId, query) => ipcRenderer.invoke('timeline:by-client', { clientId, query })
  },
  search: {
    query: (q, opts) =>
      ipcRenderer.invoke('search:query', {
        q,
        entities: opts?.entities,
        limit: opts?.limit
      })
  },
  settings: {
    get: (key) => ipcRenderer.invoke('settings:get', { key }),
    set: (key, value) => ipcRenderer.invoke('settings:set', { key, value })
  },
  backup: {
    list: () => ipcRenderer.invoke('backup:list-backups'),
    createNow: () => ipcRenderer.invoke('backup:create-now'),
    delete: (path) => ipcRenderer.invoke('backup:delete', { path }),
    restore: (path) => ipcRenderer.invoke('backup:restore', { path }),
    exportJson: () => ipcRenderer.invoke('backup:export-json')
  }
}

contextBridge.exposeInMainWorld('api', api)
