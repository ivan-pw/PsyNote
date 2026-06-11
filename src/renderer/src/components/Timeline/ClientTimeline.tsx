/**
 * src/renderer/src/components/Timeline/ClientTimeline.tsx
 *
 * Лента событий клиента (plan §6.3, левая часть страницы детали).
 *
 * Фильтры по типу события — мультиселект-чипы (toggle). Активный набор
 * передаётся в timeline.byClient через TimelineQuery.kinds.
 *
 * Запрос делает useClientTimeline; он же реагирует на любую мутацию
 * клиента (createField, archive, ...) — кеш инвалидируется в useClients.
 *
 * onOpen — единая точка открытия диалога для редактирования события.
 * Управляющая страница (ClientDetail) сама диспатчит на соответствующий
 * диалог исходя из kind.
 */
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useClientTimeline } from '@/hooks/useClientTimeline'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { TimelineItem } from './TimelineItem'
import type { TimelineEvent, TimelineKind } from '@shared/types'

// i18n-ключи подписей фильтров по типу события.
const KIND_LABEL: Record<TimelineKind, string> = {
  meeting: 'timeline.kind.meeting',
  revision: 'timeline.kind.revision',
  anamnesis: 'timeline.kind.anamnesis',
  note_event: 'timeline.kind.note_event',
  protocol: 'timeline.kind.protocol',
  client_created: 'timeline.kind.client_created'
}
const ALL_KINDS: TimelineKind[] = [
  'meeting',
  'revision',
  'anamnesis',
  'note_event',
  'protocol',
  'client_created'
]

type Props = {
  clientId: number
  onOpen?: (event: TimelineEvent) => void
}

export function ClientTimeline({ clientId, onOpen }: Props) {
  const { t } = useTranslation()
  const [active, setActive] = useState<Set<TimelineKind>>(new Set(ALL_KINDS))
  const { data, isLoading, error } = useClientTimeline(clientId, {
    kinds: Array.from(active),
    limit: 500
  })

  function toggle(k: TimelineKind) {
    setActive((prev) => {
      const next = new Set(prev)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      // Не даём отключить вообще все — иначе пустая лента бессмысленна.
      if (next.size === 0) return prev
      return next
    })
  }

  return (
    <section className="flex h-full flex-col">
      <div className="flex flex-wrap items-center gap-1.5 border-b px-4 py-3">
        <span className="mr-1 text-xs uppercase tracking-wide text-muted-foreground">
          {t('timeline.events')}
        </span>
        {ALL_KINDS.map((k) => {
          const on = active.has(k)
          return (
            <button
              key={k}
              type="button"
              onClick={() => toggle(k)}
              className="outline-none"
            >
              <Badge
                variant={on ? 'default' : 'outline'}
                className={cn(
                  'cursor-pointer select-none transition',
                  !on && 'text-muted-foreground hover:text-foreground'
                )}
              >
                {t(KIND_LABEL[k])}
              </Badge>
            </button>
          )
        })}
      </div>

      <div className="flex-1 overflow-auto px-4 py-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">{t('app.loading')}</p>
        ) : error ? (
          <p className="text-sm text-destructive">
            {t('common.error')}: {error instanceof Error ? error.message : String(error)}
          </p>
        ) : !data || data.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t('timeline.empty')}</p>
        ) : (
          <ol className="relative">
            {/* Вертикальная направляющая линия позади иконок */}
            <div
              aria-hidden
              className="absolute bottom-0 left-[13px] top-0 w-px bg-border"
            />
            {data.map((ev) => (
              <TimelineItem
                key={`${ev.kind}-${ev.ref_id}-${ev.at}`}
                event={ev}
                onOpen={onOpen}
              />
            ))}
          </ol>
        )}
      </div>
    </section>
  )
}
