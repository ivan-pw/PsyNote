/**
 * src/renderer/src/api/backup.ts
 */
export const backupApi = {
  list: () => window.api.backup.list(),
  createNow: () => window.api.backup.createNow(),
  delete: (path: string) => window.api.backup.delete(path),
  restore: (path: string) => window.api.backup.restore(path),
  exportJson: () => window.api.backup.exportJson()
}
