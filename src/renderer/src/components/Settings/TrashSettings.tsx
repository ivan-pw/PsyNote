/**
 * src/renderer/src/components/Settings/TrashSettings.tsx
 *
 * Раздел «Корзина»: архивные клиенты — восстановить / удалить навсегда /
 * очистить корзину одной кнопкой (план §6.5).
 *
 * IPC уже реализован в этапе 2 (clients.restore / purge / emptyTrash).
 * После hard-delete каскад убирает встречи, заметки, анамнезы, ревизии и
 * записи из search_index (через триггеры).
 */
import { useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { RotateCcw, Trash2 } from 'lucide-react'
import { toast } from '@/components/ui/sonner'
import { Button } from '@/components/ui/button'
import { ConfirmDestructiveDialog } from '@/components/ConfirmDestructiveDialog'
import { useClients } from '@/hooks/useClients'
import { clientsApi } from '@/api/clients'
import { useQueryClient } from '@tanstack/react-query'
import { clientsKeys } from '@/hooks/useClients'
import { formatDate } from '@/lib/format'

// Что подтверждаем: одного клиента или всю корзину.
type ConfirmState =
  | { kind: 'purge'; id: number; name: string }
  | { kind: 'empty' }
  | null

export function TrashSettings() {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const { data: clients, isLoading } = useClients({ includeArchived: true })
  const [busyId, setBusyId] = useState<number | null>(null)
  const [confirm, setConfirm] = useState<ConfirmState>(null)
  const [confirmBusy, setConfirmBusy] = useState(false)

  const archived = useMemo(
    () => (clients ?? []).filter((c) => c.archived_at),
    [clients]
  )

  function invalidate() {
    void qc.invalidateQueries({ queryKey: clientsKeys.all })
  }

  async function handleRestore(id: number, name: string) {
    setBusyId(id)
    try {
      await clientsApi.restore(id)
      invalidate()
      toast.success(t('trash.restored', { name }))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setBusyId(null)
    }
  }

  async function doConfirm() {
    if (!confirm) return
    setConfirmBusy(true)
    try {
      if (confirm.kind === 'purge') {
        setBusyId(confirm.id)
        await clientsApi.purge(confirm.id)
        toast.success(t('trash.purged', { name: confirm.name }))
      } else {
        await clientsApi.emptyTrash()
        toast.success(t('trash.emptied'))
      }
      invalidate()
      setConfirm(null)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
    } finally {
      setConfirmBusy(false)
      setBusyId(null)
    }
  }

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between gap-3">
        <p className="text-xs text-muted-foreground">{t('trash.description')}</p>
        {archived.length > 0 && (
          <Button variant="outline" size="sm" onClick={() => setConfirm({ kind: 'empty' })}>
            <Trash2 className="size-4" />
            {t('trash.empty_button')}
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">{t('app.loading')}</p>
      ) : archived.length === 0 ? (
        <p className="rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          {t('trash.empty')}
        </p>
      ) : (
        <ul className="divide-y rounded-md border">
          {archived.map((c) => (
            <li
              key={c.id}
              className="group flex items-center gap-3 px-3 py-2 text-sm"
            >
              <div className="min-w-0 flex-1">
                <div className="font-medium">{c.full_name}</div>
                <div className="text-xs text-muted-foreground">
                  {t('trash.archived')}{' '}
                  {c.archived_at ? formatDate(c.archived_at) : '—'}
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void handleRestore(c.id, c.full_name)}
                disabled={busyId === c.id}
              >
                <RotateCcw className="size-4" />
                {t('common.restore')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive"
                onClick={() => setConfirm({ kind: 'purge', id: c.id, name: c.full_name })}
                disabled={busyId === c.id}
              >
                <Trash2 className="size-4" />
                {t('common.delete')}
              </Button>
            </li>
          ))}
        </ul>
      )}

      <ConfirmDestructiveDialog
        open={confirm !== null}
        itemLabel={
          confirm?.kind === 'purge'
            ? t('trash.purge_confirm', { name: confirm.name })
            : t('trash.empty_confirm', { count: archived.length })
        }
        busy={confirmBusy}
        onCancel={() => setConfirm(null)}
        onConfirm={doConfirm}
      />
    </section>
  )
}
