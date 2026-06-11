/**
 * src/renderer/src/components/ClientFields/RevisionEditDialog.tsx
 *
 * Просмотр и удаление одной ревизии поля клиента из таймлайна.
 *
 * Редактировать историческое значение (value) намеренно нельзя — это
 * запись «в момент Т поле было таким». Если нужно поправить текущее
 * значение, пользователь правит само поле в правой панели (это создаст
 * новую ревизию).
 *
 * Удаление — через ConfirmDestructiveDialog. Если ревизия была последней
 * по полю, current_* откатится на предыдущее (см. deleteFieldRevision).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Trash2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from '@/components/ui/sonner'
import { clientsKeys } from '@/hooks/useClients'
import { formatDateTime } from '@/lib/format'
import { HISTORIZED_FIELD_META, isHistorizedField } from '@/lib/historized'
import { medicationsToText } from '@/lib/medications'
import { ConfirmDestructiveDialog } from '../ConfirmDestructiveDialog'

type Props = {
  open: boolean
  clientId: number
  /** id ревизии в client_field_revisions (ref_id события). */
  revisionId: number
  /** Превью/детали из event'а: значение, prev, field_key, note. */
  fieldKey: string | null
  value: string | null
  prevValue: string | null
  changedAt: string
  note: string | null
  onClose: () => void
}

export function RevisionEditDialog({
  open,
  clientId,
  revisionId,
  fieldKey,
  value,
  prevValue,
  changedAt,
  note,
  onClose
}: Props) {
  const { t } = useTranslation()
  const qc = useQueryClient()
  const [confirm, setConfirm] = useState(false)

  const remove = useMutation({
    mutationFn: () => window.api.revisions.delete(revisionId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: clientsKeys.timeline(clientId) })
      void qc.invalidateQueries({ queryKey: clientsKeys.detail(clientId) })
      if (fieldKey && isHistorizedField(fieldKey)) {
        void qc.invalidateQueries({
          queryKey: clientsKeys.revisions(clientId, fieldKey)
        })
      }
      toast.success(t('revision.deleted'))
      setConfirm(false)
      onClose()
    },
    onError: (err) => toast.error(err instanceof Error ? err.message : String(err))
  })

  const fieldLabel =
    fieldKey && isHistorizedField(fieldKey)
      ? t(HISTORIZED_FIELD_META[fieldKey].label)
      : fieldKey ?? t('revision.field_fallback')

  // Для medications значение — JSON-массив; показываем читабельно.
  const isMeds = fieldKey === 'medications'
  const displayValue = isMeds ? (value === null ? null : medicationsToText(value)) : value
  const displayPrev = isMeds ? medicationsToText(prevValue) : prevValue

  return (
    <>
      <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t('revision.title', { field: fieldLabel })}</DialogTitle>
            <DialogDescription>
              {formatDateTime(changedAt)}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 text-sm">
            <div>
              <div className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('revision.new_value')}
              </div>
              <div className="mt-0.5 whitespace-pre-wrap break-words">
                {displayValue ?? (
                  <span className="italic text-muted-foreground">{t('fields.cleared')}</span>
                )}
              </div>
            </div>
            {displayPrev && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('revision.prev_value')}
                </div>
                <div className="mt-0.5 whitespace-pre-wrap break-words text-muted-foreground">
                  {displayPrev}
                </div>
              </div>
            )}
            {note && (
              <div>
                <div className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('revision.comment')}
                </div>
                <div className="mt-0.5 italic">{note}</div>
              </div>
            )}
            <p className="rounded border bg-muted/40 p-2 text-xs text-muted-foreground">
              {t('revision.hint')}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="ghost"
              className="mr-auto text-destructive hover:text-destructive"
              onClick={() => setConfirm(true)}
              disabled={remove.isPending}
            >
              <Trash2 className="size-4" />
              {t('common.delete')}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              {t('common.close')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDestructiveDialog
        open={confirm}
        itemLabel={t('revision.delete_confirm')}
        busy={remove.isPending}
        onCancel={() => setConfirm(false)}
        onConfirm={() => remove.mutate()}
      />
    </>
  )
}
