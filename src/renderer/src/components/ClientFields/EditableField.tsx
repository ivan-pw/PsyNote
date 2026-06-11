/**
 * src/renderer/src/components/ClientFields/EditableField.tsx
 *
 * Поле в правой панели карточки клиента.
 *
 * Состояния:
 *  - display: показывает значение; если оно похоже на ссылку — кликабельно
 *    (shell.openExternal через webContents-handler, см. main/index.ts);
 *  - edit: открывается на клик «✎», содержит input/textarea, кнопки
 *    Сохранить/Отмена. Сохранение → useUpdateClientField → новая ревизия +
 *    обновление clients.current_*.
 *
 * Рядом с каждым полем — иконка истории (RevisionHistoryPopover).
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, ExternalLink, Pencil, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useUpdateClientField } from '@/hooks/useClients'
import {
  HISTORIZED_FIELD_META,
  parseExternalUrl,
  type HistorizedField
} from '@/lib/historized'
import { RevisionHistoryPopover } from './RevisionHistoryPopover'
import { cn } from '@/lib/utils'

type Props = {
  clientId: number
  field: HistorizedField
  value: string | null
  /** Открыть поле сразу в режиме редактирования (для «+ Добавить поле»). */
  defaultEditing?: boolean
  /** Вызывается, когда редактирование пустого поля закончилось без значения —
   *  родитель может снова спрятать поле. */
  onDismissEmpty?: () => void
}

export function EditableField({
  clientId,
  field,
  value,
  defaultEditing = false,
  onDismissEmpty
}: Props) {
  const { t } = useTranslation()
  const meta = HISTORIZED_FIELD_META[field]
  const Icon = meta.icon
  const update = useUpdateClientField(clientId)
  const [editing, setEditing] = useState(defaultEditing)
  const [draft, setDraft] = useState(value ?? '')
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!editing) setDraft(value ?? '')
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      inputRef.current?.focus()
      inputRef.current?.select?.()
    }
  }, [editing])

  async function save() {
    setError(null)
    const next = draft.trim()
    const current = value?.trim() ?? ''
    if (next === current) {
      setEditing(false)
      if (next === '') onDismissEmpty?.()
      return
    }
    try {
      await update.mutateAsync({ field, value: next === '' ? null : next })
      setEditing(false)
      if (next === '') onDismissEmpty?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err))
    }
  }

  function cancel() {
    setDraft(value ?? '')
    setEditing(false)
    setError(null)
    if (!value) onDismissEmpty?.()
  }

  const url = value ? parseExternalUrl(field, value) : null

  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 transition-colors hover:bg-accent/30">
      <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 flex-1">
        <div className="text-xs text-muted-foreground">{t(meta.label)}</div>
        {editing ? (
          <div className="mt-1 space-y-1">
            {meta.multiline ? (
              <Textarea
                ref={(el) => (inputRef.current = el)}
                value={draft}
                placeholder={t(meta.placeholder)}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancel()
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save()
                }}
                rows={3}
              />
            ) : (
              <Input
                ref={(el) => (inputRef.current = el)}
                value={draft}
                placeholder={t(meta.placeholder)}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Escape') cancel()
                  if (e.key === 'Enter') void save()
                }}
              />
            )}
            <div className="flex items-center gap-2">
              <Button size="sm" onClick={() => void save()} disabled={update.isPending}>
                <Check className="size-4" />
                {t('common.save')}
              </Button>
              <Button size="sm" variant="outline" onClick={cancel}>
                <X className="size-4" />
                {t('common.cancel')}
              </Button>
              {error && <span className="text-xs text-destructive">{error}</span>}
            </div>
          </div>
        ) : (
          <div className={cn('mt-0.5 flex min-h-6 items-center gap-2 text-sm')}>
            {value ? (
              url ? (
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="break-all text-primary hover:underline"
                >
                  {value}
                  <ExternalLink className="ml-1 inline size-3" />
                </a>
              ) : (
                <span className="break-words whitespace-pre-wrap">{value}</span>
              )
            ) : (
              <span className="italic text-muted-foreground">—</span>
            )}
          </div>
        )}
      </div>

      {!editing && (
        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label={t('common.edit')}
                className="size-7 text-muted-foreground"
                onClick={() => setEditing(true)}
              >
                <Pencil className="size-3.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>{t('common.edit')}</TooltipContent>
          </Tooltip>
          <RevisionHistoryPopover clientId={clientId} field={field} />
        </div>
      )}
    </div>
  )
}
