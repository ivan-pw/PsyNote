/**
 * src/renderer/src/components/Settings/BackupSettings.tsx
 *
 * Разделы «Бэкапы» и «Экспорт JSON» (план §6.5).
 *
 * Бэкап — копия `psynote.db` + `psynote.salt` в `userData/backups/`.
 * Открывать её можно только тем же паролем, которым шифровалась — это просто
 * snapshot файла. Ротация по `backup_keep_count` из настроек (по умолчанию 10).
 *
 * Экспорт JSON — расшифрованный дамп всей БД. Перед запуском показываем
 * предупреждение: файл будет лежать в открытом виде.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import { ArchiveRestore, Download, FilePlus, RefreshCw, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import {
  useBackups,
  useCreateBackup,
  useDeleteBackup
} from '@/hooks/useBackups'
import { useSettingMutation, useSettingQuery } from '@/hooks/useSetting'
import { backupApi } from '@/api/backup'
import { formatDateTime } from '@/lib/format'

function fmtSize(bytes: number, t: TFunction): string {
  if (bytes < 1024) return `${bytes} ${t('backup.unit_b')}`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} ${t('backup.unit_kb')}`
  return `${(bytes / 1024 / 1024).toFixed(2)} ${t('backup.unit_mb')}`
}

// Какое опасное действие подтверждаем для выбранного бэкапа.
type ConfirmState = { kind: 'delete' | 'restore'; path: string } | null

export function BackupSettings() {
  const { t } = useTranslation()
  const { data: backups, isLoading } = useBackups()
  const create = useCreateBackup()
  const remove = useDeleteBackup()
  const [exporting, setExporting] = useState(false)
  const [warnExportOpen, setWarnExportOpen] = useState(false)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const { data: autoBackup } = useSettingQuery<boolean>('backup_enabled', true)
  const setAutoBackup = useSettingMutation('backup_enabled')

  async function handleCreate() {
    try {
      const b = await create.mutateAsync()
      toast.success(t('backup.created', { size: fmtSize(b.size, t) }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    }
  }

  async function doConfirm() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      if (confirm.kind === 'delete') {
        await remove.mutateAsync(confirm.path)
        toast.success(t('backup.deleted'))
        setConfirm(null)
      } else {
        // restore: main закроет БД, подменит файлы и перезапустит приложение —
        // ответа можно не дождаться.
        await backupApi.restore(confirm.path)
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      setConfirm(null)
    } finally {
      setConfirmBusy(false)
    }
  }

  async function handleExport() {
    setWarnExportOpen(false)
    setExporting(true)
    try {
      const dst = await backupApi.exportJson()
      if (dst) toast.success(t('backup.export_saved', { path: dst }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setExporting(false)
    }
  }

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{t('backup.title')}</h3>
            <p className="text-xs text-muted-foreground">{t('backup.description')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={create.isPending}
          >
            <FilePlus className="size-4" />
            {t('backup.create')}
          </Button>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            className="size-4 accent-primary"
            checked={autoBackup ?? true}
            onChange={(e) => setAutoBackup.mutate(e.target.checked)}
          />
          {t('backup.auto_on_quit')}
        </label>

        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('app.loading')}</p>
        ) : !backups || backups.length === 0 ? (
          <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
            {t('backup.empty')}
          </p>
        ) : (
          <ul className="divide-y rounded-md border">
            {backups.map((b) => (
              <li
                key={b.path}
                className="group flex items-center gap-3 px-3 py-2 text-sm"
              >
                <RefreshCw className="size-4 text-muted-foreground" />
                <div className="min-w-0 flex-1">
                  <div className="font-mono text-xs">
                    {formatDateTime(b.createdAt)}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {fmtSize(b.size, t)} · {b.path}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  title={t('backup.restore_hint')}
                  onClick={() => setConfirm({ kind: 'restore', path: b.path })}
                >
                  <ArchiveRestore className="size-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive hover:text-destructive"
                  title={t('backup.delete_hint')}
                  onClick={() => setConfirm({ kind: 'delete', path: b.path })}
                >
                  <Trash2 className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="space-y-3 border-t pt-6">
        <div className="flex items-end justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold">{t('backup.export_title')}</h3>
            <p className="text-xs text-muted-foreground">{t('backup.export_description')}</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setWarnExportOpen(true)}
            disabled={exporting}
          >
            <Download className="size-4" />
            {t('backup.export')}
          </Button>
        </div>
      </div>

      <Dialog open={warnExportOpen} onOpenChange={setWarnExportOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('backup.export_dialog_title')}</DialogTitle>
            <DialogDescription>{t('backup.export_dialog_description')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setWarnExportOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button onClick={() => void handleExport()}>
              <Download className="size-4" />
              {t('backup.export_confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDestructiveDialog
        open={confirm !== null}
        itemLabel={
          confirm?.kind === 'restore'
            ? t('backup.restore_confirm')
            : t('backup.delete_confirm')
        }
        extraWarning={
          confirm?.kind === 'restore' ? t('backup.restore_extra') : undefined
        }
        busy={confirmBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={doConfirm}
      />
    </section>
  )
}
