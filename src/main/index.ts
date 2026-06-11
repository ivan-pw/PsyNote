/**
 * src/main/index.ts
 *
 * Точка входа Electron main-процесса.
 *
 *  - создаёт окно BrowserWindow с подключённым preload-скриптом;
 *  - регистрирует все IPC-обработчики (auth, app, ...);
 *  - грузит renderer'а (dev — ELECTRON_RENDERER_URL, prod — out/renderer/index.html);
 *  - закрывает БД при выходе.
 *
 * Безопасность: contextIsolation: true, nodeIntegration: false.
 * Renderer общается с Node только через `window.api`, выставленный в preload.
 */
import { app, BrowserWindow, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { registerAllIpc } from './ipc'
import { closeDatabase, getDb, isUnlocked } from './db/connection'
import { getSetting } from './db/repositories/settingsRepo'
import { createBackup } from './services/backup'

/**
 * Бэкап при выходе (настройка `backup_enabled`, по умолчанию true).
 * Выполняется один раз перед закрытием БД; ошибки не блокируют выход —
 * лучше выйти без бэкапа, чем зависнуть с открытой БД.
 */
function backupOnExit(): void {
  // После closeDatabase() isUnlocked() = false, поэтому повторный вызов
  // (window-all-closed → will-quit) сам по себе no-op. На macOS после
  // повторного открытия окна и unlock бэкап при следующем выходе снова сработает.
  if (!isUnlocked()) return
  try {
    const db = getDb()
    if (getSetting<boolean>(db, 'backup_enabled') !== true) return
    const keep = (getSetting<number>(db, 'backup_keep_count') ?? 10) | 0
    createBackup(keep)
  } catch (err) {
    console.warn('Бэкап при выходе не удался:', err)
  }
}

const __dirname = dirname(fileURLToPath(import.meta.url))

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 960,
    minHeight: 600,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: '#0b0f17',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      nodeIntegration: false,
      // Sandbox=true даёт OS-уровень изоляции renderer от ФС/Node API.
      // Наш preload использует только contextBridge + ipcRenderer — оба
      // доступны под sandbox. Никаких прямых импортов из 'node:*'
      // в preload-коде нет.
      sandbox: true
    }
  })

  win.once('ready-to-show', () => win.show())

  // Внешние ссылки открываем во внешнем браузере, а не внутри Electron.
  win.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url)
    return { action: 'deny' }
  })

  const devUrl = process.env['ELECTRON_RENDERER_URL']
  if (devUrl) {
    void win.loadURL(devUrl)
    win.webContents.openDevTools({ mode: 'detach' })
  } else {
    void win.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  registerAllIpc()
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  backupOnExit()
  closeDatabase()
  if (process.platform !== 'darwin') app.quit()
})

app.on('will-quit', () => {
  backupOnExit()
  closeDatabase()
})
