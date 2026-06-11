/**
 * src/renderer/src/components/ClientFields/RevisionHistoryPopover.tsx
 *
 * Поповер с историей значений одного поля клиента.
 * Запрос отправляется только когда поповер открыт (useRevisionsByField.enabled).
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { History } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger
} from '@/components/ui/popover'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import { useRevisionsByField } from '@/hooks/useRevisions'
import { formatDateTime } from '@/lib/format'
import {
  HISTORIZED_FIELD_META,
  type HistorizedField
} from '@/lib/historized'
import { medicationsToText } from '@/lib/medications'

type Props = {
  clientId: number
  field: HistorizedField
}

export function RevisionHistoryPopover({ clientId, field }: Props) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const { data, isLoading } = useRevisionsByField(clientId, field, open)
  const meta = HISTORIZED_FIELD_META[field]

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <Tooltip>
        <TooltipTrigger asChild>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label={t('client.history_section')}
              className="size-7 text-muted-foreground"
            >
              <History className="size-3.5" />
            </Button>
          </PopoverTrigger>
        </TooltipTrigger>
        <TooltipContent>{t('common.history')}</TooltipContent>
      </Tooltip>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="border-b px-4 py-2 text-sm font-medium">
          {t('fields.history_title', { field: t(meta.label) })}
        </div>
        <ScrollArea className="max-h-72">
          {isLoading ? (
            <p className="p-4 text-sm text-muted-foreground">{t('app.loading')}</p>
          ) : !data || data.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">
              {t('fields.history_empty')}
            </p>
          ) : (
            <ul className="divide-y">
              {data.map((rev) => (
                <li key={rev.id} className="px-4 py-2 text-sm">
                  <div className="text-xs text-muted-foreground">
                    {formatDateTime(rev.changed_at)}
                  </div>
                  <div className="mt-0.5 break-words">
                    {rev.value ? (
                      <span>
                        {field === 'medications'
                          ? medicationsToText(rev.value)
                          : rev.value}
                      </span>
                    ) : (
                      <span className="italic text-muted-foreground">{t('fields.cleared')}</span>
                    )}
                  </div>
                  {rev.note && (
                    <div className="mt-0.5 text-xs italic text-muted-foreground">
                      {rev.note}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ScrollArea>
      </PopoverContent>
    </Popover>
  )
}
