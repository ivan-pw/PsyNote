/**
 * src/renderer/src/components/Sessions/SessionCard.tsx
 *
 * Единая карточка сессии на главном экране клиента:
 *   ┌──────────────────────────────────────────┐
 *   │ Сессия N · дата · статус        [✎] [⋯] │
 *   │ ── Повестка ────────────────────────────│
 *   │ ── Домашка ─────────────────────────────│
 *   └──────────────────────────────────────────┘
 *
 * «Повестка» и «Домашка» хранятся в протоколе встречи (meeting_protocols:
 * summary и homework) и редактируются прямо в карточке — upsert обновляет
 * только изменённое подполе, остальные поля протокола не трогаются.
 */
import { useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Check, FileText, Pencil, X } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from '@/components/ui/sonner'
import { useProtocolByMeeting, useUpsertProtocol } from '@/hooks/useMeetingProtocols'
import { formatDateTime } from '@/lib/format'
import { cn } from '@/lib/utils'
import type { Meeting, MeetingProtocolInput } from '@shared/types'

type Props = {
  meeting: Meeting
  /** Порядковый номер сессии (хронологический); null у отменённых. */
  number: number | null
  clientId: number
  onEditMeeting: () => void
  onOpenProtocol: () => void
}

export function SessionCard({
  meeting,
  number,
  clientId,
  onEditMeeting,
  onOpenProtocol
}: Props) {
  const { t } = useTranslation()
  const { data: protocol } = useProtocolByMeeting(meeting.id)
  const upsert = useUpsertProtocol(meeting.id, clientId)

  async function saveField(patch: MeetingProtocolInput) {
    try {
      await upsert.mutateAsync(patch)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err))
      throw err
    }
  }

  const cancelled = meeting.status === 'cancelled'

  return (
    <div
      className={cn(
        'rounded-lg border bg-card text-card-foreground shadow-sm',
        cancelled && 'opacity-60'
      )}
    >
      {/* Шапка: номер, дата, статус */}
      <div className="group flex items-center gap-2 border-b px-4 py-2.5">
        <div className="flex min-w-0 flex-wrap items-baseline gap-x-2">
          <span className="font-semibold">
            {number !== null ? t('session.numbered', { number }) : t('session.title')}
          </span>
          <span className="text-sm text-muted-foreground">
            {formatDateTime(meeting.starts_at)}
          </span>
          {meeting.status === 'planned' && (
            <Badge variant="secondary">{t('session.planned_badge')}</Badge>
          )}
          {cancelled && <Badge variant="outline">{t('session.cancelled_badge')}</Badge>}
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={t('session.edit_meeting')}
            title={t('session.edit_meeting_hint')}
            onClick={onEditMeeting}
          >
            <Pencil className="size-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-muted-foreground"
            aria-label={t('session.full_protocol')}
            title={t('session.full_protocol_hint')}
            onClick={onOpenProtocol}
          >
            <FileText className="size-3.5" />
          </Button>
        </div>
      </div>

      {meeting.comment && (
        <p className="border-b px-4 py-2 text-sm text-muted-foreground">
          {meeting.comment}
        </p>
      )}

      <div className="space-y-2 p-3">
        <InlineProtocolField
          label={t('session.agenda')}
          value={protocol?.summary ?? null}
          placeholder={t('session.agenda_placeholder')}
          accentClass="border-l-sky-400"
          busy={upsert.isPending}
          onSave={(v) => saveField({ summary: v })}
        />
        <InlineProtocolField
          label={t('session.homework')}
          value={protocol?.homework ?? null}
          placeholder={t('session.homework_placeholder')}
          accentClass="border-l-amber-400"
          busy={upsert.isPending}
          onSave={(v) => saveField({ homework: v })}
        />
      </div>
    </div>
  )
}

type FieldProps = {
  label: string
  value: string | null
  placeholder: string
  accentClass: string
  busy: boolean
  onSave: (value: string | null) => Promise<void>
}

function InlineProtocolField({
  label,
  value,
  placeholder,
  accentClass,
  busy,
  onSave
}: FieldProps) {
  const { t } = useTranslation()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(value ?? '')
  const ref = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!editing) setDraft(value ?? '')
  }, [value, editing])

  useEffect(() => {
    if (editing) {
      ref.current?.focus()
      ref.current?.select()
    }
  }, [editing])

  async function save() {
    const next = draft.trim()
    if (next === (value?.trim() ?? '')) {
      setEditing(false)
      return
    }
    try {
      await onSave(next || null)
      setEditing(false)
    } catch {
      // тост уже показан в onSave
    }
  }

  return (
    <div className={cn('rounded-md border border-l-4 px-3 py-2', accentClass)}>
      <div className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      {editing ? (
        <div className="mt-1 space-y-1.5">
          <Textarea
            ref={ref}
            rows={3}
            value={draft}
            placeholder={placeholder}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Escape') setEditing(false)
              if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void save()
            }}
          />
          <div className="flex gap-2">
            <Button size="sm" onClick={() => void save()} disabled={busy}>
              <Check className="size-4" />
              {t('common.save')}
            </Button>
            <Button size="sm" variant="outline" onClick={() => setEditing(false)}>
              <X className="size-4" />
              {t('common.cancel')}
            </Button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          className="mt-0.5 block w-full rounded-sm text-left text-sm outline-none transition-colors hover:bg-accent/40"
          onClick={() => setEditing(true)}
        >
          {value ? (
            <span className="whitespace-pre-wrap break-words">{value}</span>
          ) : (
            <span className="italic text-muted-foreground">{placeholder}</span>
          )}
        </button>
      )}
    </div>
  )
}
