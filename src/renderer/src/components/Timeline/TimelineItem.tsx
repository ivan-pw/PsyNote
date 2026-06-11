/**
 * src/renderer/src/components/Timeline/TimelineItem.tsx
 *
 * Один пункт ленты событий клиента.
 *
 * Кодировка событий (см. plan §3.8 / миграции 003 и 005):
 *  - meeting      — aux1=status
 *  - revision     — aux1=field_key, aux2=prev_value, extra=note
 *  - anamnesis    — payload_text=превью
 *  - note_event   — aux1=action ('create'|'update'|'delete'),
 *                   aux2=color_id (snapshot), extra=note_id
 *  - protocol     — aux1=meeting_id, payload_text=превью
 *  - client_created — нет дополнительных полей; не интерактивно
 *
 * Все интерактивные события открываются через onOpen(kind, event).
 * client_created остаётся не-кликабельным.
 */
import { useTranslation } from 'react-i18next'
import type { TFunction } from 'i18next'
import {
  CalendarCheck,
  Eraser,
  FileEdit,
  FilePlus,
  History,
  Pencil,
  StickyNote,
  Trash2,
  UserPlus
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDateTime, truncate } from '@/lib/format'
import { HISTORIZED_FIELD_META, isHistorizedField } from '@/lib/historized'
import { medicationsToText } from '@/lib/medications'
import type { TimelineEvent } from '@shared/types'

const MEETING_STATUS_KEY: Record<string, string> = {
  planned: 'meeting.status.planned',
  done: 'meeting.status.done',
  cancelled: 'meeting.status.cancelled'
}

const NOTE_ACTION_KEY: Record<string, string> = {
  create: 'timeline.note.create',
  update: 'timeline.note.update',
  delete: 'timeline.note.delete'
}

function fieldLabel(key: string | null, t: TFunction): string {
  if (key && isHistorizedField(key)) return t(HISTORIZED_FIELD_META[key].label)
  return key ?? ''
}

function pickIcon(ev: TimelineEvent) {
  switch (ev.kind) {
    case 'meeting':
      return CalendarCheck
    case 'revision':
      return ev.payload_text === null ? Eraser : History
    case 'anamnesis':
      return FilePlus
    case 'note_event':
      if (ev.aux1 === 'delete') return Trash2
      if (ev.aux1 === 'update') return Pencil
      return StickyNote
    case 'protocol':
      return FileEdit
    case 'client_created':
      return UserPlus
  }
}

function pickAccent(ev: TimelineEvent): string {
  switch (ev.kind) {
    case 'meeting':
      return 'bg-blue-500/20 text-blue-300'
    case 'revision':
      return 'bg-amber-500/20 text-amber-300'
    case 'anamnesis':
      return 'bg-purple-500/20 text-purple-300'
    case 'note_event':
      if (ev.aux1 === 'delete') return 'bg-red-500/20 text-red-300'
      return 'bg-emerald-500/20 text-emerald-300'
    case 'protocol':
      return 'bg-cyan-500/20 text-cyan-300'
    case 'client_created':
      return 'bg-muted text-muted-foreground'
  }
}

function renderTitle(ev: TimelineEvent, t: TFunction): React.ReactNode {
  switch (ev.kind) {
    case 'meeting': {
      if (!ev.aux1) return <span>{t('meeting.title')}</span>
      const statusKey = MEETING_STATUS_KEY[ev.aux1]
      const status = statusKey ? t(statusKey) : ev.aux1
      return <span>{t('timeline.meeting_status', { status })}</span>
    }
    case 'revision': {
      const fkey = ev.aux1
      const isMeds = fkey === 'medications'
      const prev = isMeds ? medicationsToText(ev.aux2) : ev.aux2
      const next = isMeds
        ? ev.payload_text === null
          ? null
          : medicationsToText(ev.payload_text)
        : ev.payload_text
      const label = fieldLabel(fkey, t)
      if (next === null) {
        return (
          <span>
            {t('timeline.cleared')}: <strong>{label}</strong>
            {prev && (
              <span className="text-muted-foreground">
                {' '}
                · {t('timeline.was', { value: truncate(prev, 60) })}
              </span>
            )}
          </span>
        )
      }
      return (
        <span>
          {t('timeline.changed')}: <strong>{label}</strong>
          <span className="text-muted-foreground"> · «{truncate(next, 80)}»</span>
        </span>
      )
    }
    case 'anamnesis':
      return <span>{t('anamnesis.title')}</span>
    case 'note_event': {
      const key = ev.aux1 ? NOTE_ACTION_KEY[ev.aux1] : undefined
      return <span>{key ? t(key) : t('notes.note')}</span>
    }
    case 'protocol':
      return <span>{t('protocol.title')}</span>
    case 'client_created':
      return <span>{t('timeline.client_created')}</span>
  }
}

type Props = {
  event: TimelineEvent
  /** Кликабельность даётся всем событиям, кроме client_created. */
  onOpen?: (event: TimelineEvent) => void
}

export function TimelineItem({ event, onOpen }: Props) {
  const { t } = useTranslation()
  const Icon = pickIcon(event)
  const accent = pickAccent(event)
  const isRevision = event.kind === 'revision'
  const isProtocol = event.kind === 'protocol'
  const isNoteEvent = event.kind === 'note_event'
  const isAnamnesis = event.kind === 'anamnesis'
  const clickable = event.kind !== 'client_created' && Boolean(onOpen)

  const content = (
    <>
      <div
        className={cn(
          'z-10 mt-0.5 grid size-7 shrink-0 place-items-center rounded-full ring-4 ring-background',
          accent
        )}
      >
        <Icon className="size-3.5" />
      </div>
      <div className="min-w-0 flex-1 pb-4">
        <div className="text-xs text-muted-foreground">{formatDateTime(event.at)}</div>
        <div className="mt-0.5 text-sm">{renderTitle(event, t)}</div>
        {event.kind === 'meeting' && event.payload_text && (
          <div className="mt-1 text-sm text-muted-foreground">{event.payload_text}</div>
        )}
        {(isNoteEvent || isProtocol) && event.payload_text && (
          <div className={cn('mt-1 text-sm', isNoteEvent ? '' : 'text-muted-foreground')}>
            {truncate(event.payload_text, 200)}
          </div>
        )}
        {isAnamnesis && event.payload_text && (
          <div className="mt-1 text-sm text-muted-foreground">
            {truncate(event.payload_text, 200)}
          </div>
        )}
        {isRevision && event.extra && (
          <div className="mt-1 text-xs italic text-muted-foreground">
            {t('revision.comment')}: {event.extra}
          </div>
        )}
      </div>
    </>
  )

  return (
    <li className="relative">
      {clickable ? (
        <button
          type="button"
          onClick={() => onOpen?.(event)}
          className="flex w-full gap-3 rounded-md text-left transition-colors hover:bg-accent/30"
        >
          {content}
        </button>
      ) : (
        <div className="flex gap-3">{content}</div>
      )}
    </li>
  )
}
